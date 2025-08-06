// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.


import {Agent, AgentStatus, Client} from "webitel-sdk";
import {ipcRenderer} from "electron"
import {handlerCall} from "./callHandler";
import {Config} from "./config";
import {AgentStatusEvent} from "webitel-sdk/types/socket/agent";

const constraints = {
    video: {
        width: { ideal: 1920 },    // Бажана ширина 1920px (Full HD)
        height: { ideal: 1080 },   // Бажана висота 1080px
        frameRate: { ideal: 30 },  // Бажана частота кадрів 30fps
        cursor: "always",          // Завжди показувати курсор
        displaySurface: "monitor", // Можна додати для попереднього вибору всього екрану, але це лише підказка
        selfBrowserSurface: "exclude", // Виключити поточну вкладку, щоб уникнути "ефекту дзеркала"
        surfaceSwitching: "exclude" // Дозволити перемикання між вкладками/вікнами
    },
    audio: false
};

// contextBridge.exposeInMainWorld('electronAPI', {
//     onAgentStatus: (status: string) => ipcRenderer.invoke('onAgentStatus', status),
// });

let client : Client | null = null

async function destroyClient() {
    const cli = client
    client = null
    await cli.destroy()
}

async function create(config: Config, token: string) {
    if (client) {
        await destroyClient()
    }
    console.dir(config)
    if (!token)
        return;

    // const token = 'IHOR'
    const storageCapture =    `https://dev.webitel.com/api/webrtc/video`
    const storageScreenshot = `https://dev.webitel.com/api/storage/file/screenshot/upload?access_token=${token}&channel=screenshot`


    const screenResolver = () => {
        return navigator.mediaDevices.getDisplayMedia(constraints)
    }

    client = new Client({
        // endpoint: 'ws://10.10.10.25:10022',// config.ws,
        endpoint: 'wss://dev.webitel.com/ws',// config.ws,
        token,
        registerWebDevice: false,
        debug: true,
        screenResolver: screenResolver,
        applicationName: 'desc_track'

    })

    //@ts-ignore
    window.cli = client;

    let agent : Agent | null = null;

    const setAgentStatus = async (e: any, status: string) => {
        if (!agent) {
            console.error("not found agent")
        }
        if (agent.status === status) {
            return
        }
        switch (status) {
            case AgentStatus.Online:
                await agent.online([], false)
                break
            case AgentStatus.Offline:
                await agent.offline()
                break
            case AgentStatus.Pause:
                await agent.pause()
                break
            default:
                console.error(`bad status: ${status}`)
        }

    }

    client.on('disconnected', e => {
        console.error('disconnected, reconnect')
        ipcRenderer.emit('disconnected')
        ipcRenderer.off('aet-agent-status', setAgentStatus)
        if (client) {
            client.destroy()
            setTimeout(create, 1000)
        }
    })
    ipcRenderer.on('aet-agent-status', setAgentStatus)

    client.on('connected', () => {
        console.debug('connected')
    })

    try {
        await client.connect();
        await client.auth()
        await client.subscribeCall(handlerCall(token, constraints, config.iceServers, storageCapture))
        console.debug(`opened session ${client.instanceId}`)

        agent = await client.agentSession()
        await client.subscribeAgentsStatus((ev: AgentStatusEvent) => {
            ipcRenderer.send('agent-status-changed', ev.status, agent.lastStatusChange)
            // console.error(ev.status)
        }, {agent_id: agent.agentId})
        const session = client.sessionInfo()

        ipcRenderer.send('connected', JSON.stringify(session))
        ipcRenderer.send('agent-status-changed', agent.status, agent.lastStatusChange)

    } catch (e) {
        console.error(e)
    }
}

ipcRenderer.on('on-config', (e: any, conf: Config, token: string) => {
    setTimeout(()=> {
        create(conf, token)
    }, 1000)
})
