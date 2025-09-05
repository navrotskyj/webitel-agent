import {join} from "path";
import {app, BrowserWindow, nativeImage, ipcMain} from "electron";
import {loadConfig} from "./config";
import {allowScreeCapture} from "./screencapture";
import {initScreenShot} from "./screenshot";
import {createTray} from "./tray";
import {subscribePowerMonitor} from "./powerMonitor";
import * as console from "node:console";


export async function createWindow(dev: boolean, argv: string[]) : Promise<void> {
    // Create the browser window.
    let configPath = parseArguments(argv)
    if (!configPath) {
        configPath = join(app.getPath('userData'), '/config.json')
    }

    let callStore = [] as any[];
    let taskStore = [] as any[];

    function appendCall(e: any) {
        callStore.push(e)

        if (callStore.length === 1) {
            console.error('start record')
        }
    }

    function getCall(id: string) {
        return callStore.filter(i => i.id === id)[0]
    }

    function delCall(id: string) {
        const callEv = getCall(id)
        if (callEv && hasTask(callEv)) {
            // постобробка
            return
        }

        callStore = callStore.filter(i => i.id != id)
        if (!callStore.length) {
            console.error('stop record')
        }
    }

    function delCallByAttempt(attemptId: number) {
        callStore = callStore.filter(i => {
            return  (i.queue && +i.queue.attempt_id === attemptId)
        })
        if (!callStore.length) {
            console.error('stop record')
        }
    }

    function appendTask(e: any) {
        taskStore.push(e)
    }

    function delTask(id:any) {
        taskStore = taskStore.filter(i => i.attempt_id != id)
        delCallByAttempt(id)
    }

    function hasTask(callEv: any) {
        if (!(callEv.data && callEv.data.queue)) {
            return false
        }
        const attId =  +callEv.data.queue.attempt_id
        for (let t of taskStore) {
            if (t.attempt_id === attId) {
                return true
            }
        }
        return false
    }

    ipcMain.on('socket_ev', (s: any, val: string) => {
        const e = JSON.parse(val)
        if (e.event) {
            switch (e.event) {
                case "call": {
                    const call = e.data[e.event];
                    switch (call.event) {
                        case "ringing":
                            appendCall(call)
                            break;
                        case "hangup":
                            delCall(call.id)
                            break;
                    }
                    break;
                }

                case "channel": {
                    const ch = e.data;
                    switch (ch.status) {
                        case "distribute": {
                            appendTask(ch)
                            break
                        }

                        case "missed":
                        case "wrap_time":
                        case "waiting":
                        case "transfer": {
                            delTask(ch.attempt_id)
                            break
                        }

                    }


                    break;
                }
            }
            console.error(e)
        }

    })

    console.log(app.getPath('userData'))
    console.error(configPath)

    const config =  await loadConfig(configPath)

    const appIcon = nativeImage.createFromPath(
        join(process.cwd(), "assert", "app-dock.png")
    );

    if (app.dock) {
        app.dock.setIcon(appIcon)
    }

    const mainWindow = new BrowserWindow({
        title: "Wegitel agent",
        icon: appIcon,
        height: dev ? 400 : 1,
        width: dev ? 800 : 1,
        show: dev,
        webPreferences: {
            preload: join(__dirname, "preload.js"),
            webSecurity: false,
            contextIsolation: false, // protect against prototype pollution
            nodeIntegration: true,

        },
    });
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
    allowScreeCapture()
    initScreenShot()
    await createTray(mainWindow, config)
    subscribePowerMonitor(mainWindow)

    // and load the index.html of the app.
    mainWindow.loadFile(join(__dirname, "../index.html"));



    // mainWindow.setSkipTaskbar(true);
}

function parseArguments(argv: string[]): string | null {
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i+1]) {
            return null
        }
        if (argv[i] === '--config' || argv[i] === '-c') {
            return argv[i + 1]
        }
    }
}
