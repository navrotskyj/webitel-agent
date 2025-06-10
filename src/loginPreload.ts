import {ipcRenderer} from "electron";

function waitToken(): boolean {
    const token = localStorage.getItem('access-token')
    if (!token) {
        return false
    }
    localStorage.setItem('access-token', '')
    ipcRenderer.send('login-token', token)
    return true
}

// @ts-ignore
window.navigation.addEventListener("navigate", (event) => {
    console.log('location changed!');
    waitToken()
})
