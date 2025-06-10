import {desktopCapturer, session} from "electron";

export function allowScreeCapture() : void {
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
            // Grant access to the first screen found.
            callback({ video: sources[0], audio: 'loopbackWithMute' })
        })
        // If true, use the system picker if available.
        // Note: this is currently experimental. If the system picker
        // is available, it will be used and the media request handler
        // will not be invoked.
    }, { useSystemPicker: false })
}
