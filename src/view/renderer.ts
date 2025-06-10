// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process unless
// nodeIntegration is set to true in webPreferences.
// Use preload.js to selectively enable features
// needed in the renderer process.

const {ipcRenderer} = require('electron');


const log = (msg: string) => {
    document.getElementById('logs').innerHTML += msg + '<br>'
}

const screenshotImageElement = document.getElementById('screenshotDisplay') as HTMLImageElement;

let stream : MediaStream;
let currentScreenshotBase64 = null;

async function testStart() {
    console.error("OK")
    try {
        const constraints = {
            video: {
                width: { ideal: 1920 },    // Бажана ширина 1920px (Full HD)
                height: { ideal: 1080 },   // Бажана висота 1080px
                frameRate: { ideal: 30 },  // Бажана частота кадрів 30fps
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: "1",
                minWidth: 1280,
                maxWidth: 1920,
                minHeight: 720,
                maxHeight: 1080
            },
            audio: false // Залежить від ваших потреб
        };
        stream = await navigator.mediaDevices.getDisplayMedia(constraints as DisplayMediaStreamOptions)
        const video =document.getElementById('testVideo') as HTMLVideoElement;
        video.srcObject = stream
        video.play()
    } catch (e) {
        console.error(e)
    }
}

function testStop() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop())
    }
}

async function testStartAgent() {
    console.error("OK")
    try {
        const constraints = {
            video: {
                width: { ideal: 1920 },    // Бажана ширина 1920px (Full HD)
                height: { ideal: 1080 },   // Бажана висота 1080px
                frameRate: { ideal: 30 },  // Бажана частота кадрів 30fps
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: "1",
                minWidth: 1280,
                maxWidth: 1920,
                minHeight: 720,
                maxHeight: 1080
            },
            audio: false // Залежить від ваших потреб
        };
        //@ts-ignore
        await window.cli.requestScreenShare(8535, constraints, (s: MediaStream)=> {
            const video =document.getElementById('testVideo') as HTMLVideoElement;
            video.srcObject = s
            video.play()
            stream = s
        })
    } catch (e) {
        console.error(e)
    }
}

function testStopAgent() {
    //@ts-ignore
    window.cli.receiveScreenStore.forEach(i => i.close())
}

async function testScreenSchot() {
    try {
        // Викликаємо функцію з preload.js для зйомки скріншота
        const sendUrl = 'https://dev.webitel.com/api/storage/file/screenshot/upload?access_token=IHOR&channel=screenshot'
        const base64Image = await ipcRenderer.invoke('take-screenshot', sendUrl);
        currentScreenshotBase64 = base64Image;

        if (screenshotImageElement && base64Image) {
            screenshotImageElement.src = base64Image; // Відображаємо скріншот
            screenshotImageElement.style.display = 'block';
        }
        console.log('Скріншот зроблено!');
    } catch (error) {
        console.error('Помилка при зйомці скріншота з рендерера:', error);
        alert('Не вдалося зробити скріншот: ' + error.message);
    }
}



ipcRenderer.on("connected", (e: string) => {
    log("connected")
    ipcRenderer.send('connected', e)
})

ipcRenderer.on("disconnected", (e: string) => {
    log("disconnected")
    ipcRenderer.send('disconnected', e)
})


function appendStreamPreview(id: string, s: MediaStream) {
    const div = document.getElementById('video-container')
    const v = document.createElement('video')
    v.srcObject = s
    v.height = 240
    v.width = 320
    v.id = id
    v.play()
    div.appendChild(v)
}

function removeStreamPreview(id: string) {
    const v = document.getElementById(id) as HTMLVideoElement
    if (!v) {
        return
    }
    v.pause()
    v.srcObject = null
    v.remove()
}
