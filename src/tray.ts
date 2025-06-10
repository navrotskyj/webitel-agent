import {Menu, Tray, ipcMain, app, MenuItem, BrowserWindow, dialog, FileFilter} from "electron";
import {join} from "path"
import {validConfigFile, Config, getToken, storeToken} from "./config";
import {createLoginWindow} from "./loginWindow";
import {logOut} from "./api";

const greenIcon = join(__dirname, './assert/green16.png')
const redIcon = join(__dirname, './assert/red16.png')
const grayIcon = join(__dirname, './assert/gray16.png')
const warnIcon = join(__dirname, './assert/warn16.png')

export async function createTray(win: BrowserWindow, config: Config): Promise<Tray> {
    let connected = false
    let currentStatus: string
    let lastStatusChange = 0
    let name = ''
    let openedConfigDialog = false
    let applicationHost = getUrl(config)
    let token = await getToken()

    console.debug(`start session`)

    const setStatus =  (item: MenuItem, c: any, d: any) => {
        if (item.id === currentStatus && !item.checked) {
            item.checked = true
            return;
        }

        if (win && !win.isDestroyed()) {
            win.webContents.send('aet-agent-status', item.id);
            console.debug(`try set status: ${item.id}`);
        }
    }

    const onLoadConfig = async  ()=> {
        win.focus()
        if (openedConfigDialog) {
            return
        }
        openedConfigDialog = true
        const result = await dialog.showOpenDialog(win, {
            title: "Select config file",
            properties: ['openFile'],
            filters: [{
                extensions: ["json"],
                name: "json config"
            } as FileFilter]
        });
        openedConfigDialog = false
        if (!result.canceled) {
            try {
                const configResult = await validConfigFile(result.filePaths[0])
                config = configResult
                console.dir(config)
                applicationHost = getUrl(config)
            } catch (e) {
                await dialog.showMessageBox(null, {
                    type: 'error',
                    title: 'Error load config..',
                    message: e.message,
                    // detail: e.detail,
                    buttons: ['OK']
                });
            }
        }
    }

    const onLogin = () => {
        createLoginWindow(applicationHost)
    }

    const onLogout = async () => {
        await storeToken('')
        if (token) {
            await logOut(getUrl(config), token)
        }
        token = ''
        contextMenu = buildMenu()
        tray.setImage(redIcon)
    }

    ipcMain.on('login-token', async (e: any, t: string) => {
        if (token === t) {
            return
        }
        token = t
        console.debug('new token ', t)
        await storeToken(await token)
        contextMenu = buildMenu()
        win.webContents.send('on-config', config, token);
    })

    win.once('ready-to-show', () => {
        win.webContents.send('on-config', config, token);
    })

    const buildMenu = () => {
        const cm = Menu.buildFromTemplate([
            { id: 'status', label: 'Status', enabled: false,  visible: true, submenu: [
                    { id: 'online', label: 'Online', checked: null, type: 'checkbox', click: setStatus  },
                    { id: 'offline', label: 'Offline', checked: null, type: 'checkbox', click: setStatus  },
                    { id: 'pause', label: 'Pause', checked: null, type: 'checkbox', click: setStatus  },
                    { id: 'onbreak', visible: false, checked: null, label: 'Pause', type: 'checkbox' },
                ]  },
            { type: 'separator' },
            { label: 'Login', type: 'normal', visible: !token, click: onLogin  },
            { label: 'Logout', type: 'normal', visible: !!token, click: onLogout  },
            { type: 'separator' },
            { label: 'Load config...', type: 'normal', click: onLoadConfig  },
            { type: 'separator' },
            { label: 'Close', type: 'normal', click: onClose  },
        ])

        tray.setToolTip('disconnected...')
        tray.setContextMenu(cm)
        return cm
    }

    const tray = new Tray(redIcon)
    let contextMenu = buildMenu()

    const changeStatus = (s: string, t: number) => {
        const statusItem = contextMenu.getMenuItemById('status')
        currentStatus = s
        lastStatusChange = t
        if (!statusItem) {
            console.error("MenuItem з ID 'status' не знайдено!")
            return;
        }

        statusItem.enabled = connected;
        if (statusItem.submenu && statusItem.enabled) {
            statusItem.submenu.items.forEach(subItem => {
                if (subItem.type === 'checkbox') {
                    subItem.checked = (s === subItem.id)
                }
                if (subItem.checked) {
                    let ico;
                    switch (subItem.id) {
                        case 'online':
                            ico = greenIcon
                            break
                        case 'pause':
                        case 'onbreak':
                            ico = warnIcon
                            break
                        default:
                            ico = grayIcon
                    }
                    tray.setImage(ico)
                }
            });
        }
        tray.setContextMenu(contextMenu)
    };

    ipcMain.on('connected', (s: any, val: string) => {
        const session = JSON.parse(val)
        tray.setImage(greenIcon)
        name = `${session.name}`
        console.error(`session connected, expire: ${session.expire}`)
        tray.setToolTip(name)
        connected = true
    })
    ipcMain.on('disconnected', () => {
        console.error("session disconnected")
        tray.setImage(redIcon)
        connected = false
    })
    ipcMain.on('agent-status-changed', (e: any, status: string, t: number) => {
        console.debug("agent change status: " + status, new Date(t))
        if (!connected) {
            return
        }
        changeStatus(status, t)
    })

    ipcMain.on('login-window', (e: any) => {
        onLogin()
    })

    let timer: any | null = null

    const changeTolTip = () => {
        const toolTip = `${name} / ${secondsToDhm(Math.floor((Date.now() - lastStatusChange) / 1000))}`
        console.debug(`timer = ${timer} change tool tip to: ${toolTip}`)
        tray.setToolTip(toolTip)
    }

    tray.on('mouse-enter', e => {
        if (timer !== null || !token) {
            return
        }
        changeTolTip()
        timer = setInterval(changeTolTip, 1000)
    })

    tray.on('mouse-leave', e => {
        if (!timer) {
            console.error("mouse-leave not timer")
            return
        }
        clearInterval(timer)
        timer = null
    })

    return tray
}

const onClose = () => {
    app.quit()
}

function secondsToDhm(totalSeconds: number) {
    if (typeof totalSeconds !== 'number' || totalSeconds < 0 || !Number.isInteger(totalSeconds)) {
        console.warn("Invalid input: totalSeconds must be a non-negative integer.");
        return "00:00:00"; // Повертаємо дефолтне значення
    }

    const secondsInDay = 24 * 3600;
    const secondsInHour = 3600;
    const secondsInMinute = 60;

    const days = Math.floor(totalSeconds / secondsInDay);
    let remainingSeconds = totalSeconds % secondsInDay;

    const hours = Math.floor(remainingSeconds / secondsInHour);
    remainingSeconds %= secondsInHour;

    const minutes = Math.floor(remainingSeconds / secondsInMinute);
    const seconds = remainingSeconds % secondsInMinute;

    // Допоміжна функція для додавання ведучого нуля
    const addLeadingZero = (num: any) => String(num).padStart(2, '0');

    let result = '';

    if (days > 0) {
        result += `${days}d `; // Додаємо 'd' для днів, щоб було зрозуміло
    }

    result += `${addLeadingZero(hours)}:${addLeadingZero(minutes)}:${addLeadingZero(seconds)}`;

    return result;
}

function getUrl(c : Config) {
    const s = c.ws.replace(/^ws/, 'http').split('/')
    return s[0] + '//' + s[1] + s[2]
}
