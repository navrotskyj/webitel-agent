import {BrowserWindow, powerMonitor} from 'electron'

export function subscribePowerMonitor(win: BrowserWindow) :void {
    console.log('subscribePowerMonitor')
    powerMonitor.on('unlock-screen', () => {
        console.log('the system is going to ready', new Date());
    });

    powerMonitor.on('lock-screen', () => {
        console.log('the system is going to lock-screen', new Date());
    });

    powerMonitor.on('resume', () => {
        console.log('the system is going to ready', new Date());
    });

    powerMonitor.on('suspend', () => {
        console.log('the system is going to sleep', new Date());
    });

}
