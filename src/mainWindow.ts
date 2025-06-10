import {join} from "path";
import {app, BrowserWindow, nativeImage} from "electron";
import {loadConfig} from "./config";
import {allowScreeCapture} from "./screencapture";
import {initScreenShot} from "./screenshot";
import {createTray} from "./tray";
import {subscribePowerMonitor} from "./powerMonitor";


export async function createWindow(dev: boolean, argv: string[]) : Promise<void> {
    // Create the browser window.
    let configPath = parseArguments(argv)
    if (!configPath) {
        configPath = join(app.getPath('userData'), '/config.json')
    }
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
    allowScreeCapture()
    initScreenShot()
    await createTray(mainWindow, config)
    subscribePowerMonitor(mainWindow)

    // and load the index.html of the app.
    mainWindow.loadFile(join(__dirname, "../index.html"));

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

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
