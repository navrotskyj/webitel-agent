import {BrowserWindow, ipcMain} from 'electron'
import {join} from 'path'

let win : BrowserWindow | null = null

export function createLoginWindow(url: string) : BrowserWindow   {
    if (win) {
        return win
    }

    const onToken = (e: any, token: string) => {
        if (token) {
            win.close()
        }
    }

    ipcMain.on('login-token', onToken)

    console.debug(`load login: ${url}`)
    win = new BrowserWindow({
        title: "Wegitel agent",
        // height: 400,
        // width:800,
        webPreferences: {
            preload: join(__dirname, "/loginPreload.js"),
            webSecurity: true,
            contextIsolation: true, // protect against prototype pollution
            nodeIntegration: false,
        },
    });

    win.loadURL(url)
    win.on('close', () => {
        ipcMain.off('login-token', onToken)
        win = null
        console.debug('close login')
    })

    // win.webContents.openDevTools();
    return win
}
