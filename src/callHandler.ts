import {Call, CallActions} from "webitel-sdk";
import {StorageScreenCapture} from "./storageScreen";

const screenCaptureSession = new Map<string, StorageScreenCapture>

export function handlerCall(constraints: DisplayMediaStreamOptions, iceServers: RTCIceServer[], captureUrl: string) {
   return async function handleCall(action: CallActions, call: Call) : Promise<void> {

        switch (action) {
            case CallActions.Ringing:
                await startCapture(
                    call.parentId || call.id,
                    captureUrl,
                    constraints,
                    iceServers,
                )
                break
            case CallActions.Destroy:
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
    }
}

async function startCapture(callId: string, uri: string, constraints: DisplayMediaStreamOptions, iceServers: RTCIceServer[]) {
    console.debug(`start capture call ${callId} to ${uri}`)
    const capture = new StorageScreenCapture(callId, iceServers, uri)
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia(constraints)
        await capture.cast(stream)
        screenCaptureSession.set(callId, capture)
    } catch (e) {
        console.error(e)
    }
}
