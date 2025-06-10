import {app, BrowserWindow} from "electron";
import {createWindow} from './mainWindow'
import * as process from "node:process";

// app.commandLine.appendSwitch('ignore-certificate-errors', 'true')
// app.commandLine.appendSwitch('allow-insecure-localhost', 'true')

const dev = true

if (!dev && app.dock) {
  app.dock.hide()
}

app.setAsDefaultProtocolClient("wbt_agent")

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, argv) => {

    // if (process.platform === 'win32' || process.platform === 'linux') {
    //   win.makeCall(argv.slice(1)[0])
    // }
  })


  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(async () => {
    await createWindow(dev, process.argv);

    app.on("activate", function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      // if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  // handle wbt_agent
  app.on('open-url', (event, url) => {
    event.preventDefault();
  });
}

