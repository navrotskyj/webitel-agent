import {Call, CallActions} from "webitel-sdk";
import {StorageScreenCapture} from "./storageScreen";
import {listSources} from "./screencapture";
import {ipcRenderer} from "electron";
import {Config} from "./config";

const screenCaptureSession = new Map<string, StorageScreenCapture>

export function handlerCall(token: string, constraints: DisplayMediaStreamOptions, iceServers: RTCIceServer[], captureUrl: string) {
   return async function handleCall(action: CallActions, call: Call) : Promise<void> {

        switch (action) {
            case CallActions.Ringing:
                console.error('ring', call)
                await startCapture(
                    token,
                    call.parentId || call.id,
                    captureUrl,
                    constraints,
                    iceServers,
                )
                break
            case CallActions.Destroy:
                console.error('destroy', call)
                await stopCapture(call.parentId || call.id)
                break
        }
    }
}

async function stopCapture(callId: string) {
    const capture = screenCaptureSession.get(callId)
    if (capture) {
        capture.close()
        screenCaptureSession.delete(callId)
    } else {
        throw 'aaaa'
    }
}

let sources: any;

ipcRenderer.on('on-sources-win', (e: any, s: any) => {
    sources = s
})

async function startCapture(token: string, callId: string, uri: string, constraints: DisplayMediaStreamOptions, iceServers: RTCIceServer[]) {
    console.debug(`start capture call ${callId} to ${uri}`)
    const capture = new StorageScreenCapture(callId, iceServers, uri, token)
    screenCaptureSession.set(callId, capture)
    try {
        const arr   = new Array<MediaStream>()
        if (sources) {
            for (const s of sources) {
                arr.push(await navigator.mediaDevices.getDisplayMedia({
                    audio: false,
                    video: {
                        //@ts-ignore
                        mandatory: {
                            chromeMediaSource: 'desktop', // Вказує, що це джерело робочого столу
                            chromeMediaSourceId: s,     // Вказує ID конкретного вікна
                            minFrameRate: 30
                        }
                    }
                }))
            }
        } else {
            arr.push(await navigator.mediaDevices.getDisplayMedia(constraints))
        }
        await capture.cast(arr)
        console.error(capture)
    } catch (e) {
        console.error(e)
        capture.close()
        screenCaptureSession.delete(callId)
    }
}
