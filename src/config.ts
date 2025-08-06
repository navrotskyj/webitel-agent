import {readFileSync, writeFileSync} from "fs"
import {join} from "path";
import {app} from "electron";

const tokenPath = join(app.getPath('userData'), '/token')

export interface Config {
    ws: string
    storage?: string
    iceServers?: []
    constraints?: DisplayMediaStreamOptions | null
    token?: string
}

export async function  loadConfig(path: string) : Promise<Config> {
    let config = {
        ws: "wss://suite.webitel.com/ws",
        iceServers: [],
        constraints: null
    } as Config

    try {
        const file = await readFileSync(path, {encoding: 'utf-8'})
        config = JSON.parse(file)
    } catch (e) {
        await writeFileSync(path, JSON.stringify(config), {encoding: 'utf-8'})
    }

    return config
}

export function validConfig(conf: Config): void {
    if (!conf.ws) {
        throw new Error("not set ws")
    }
    if (!conf.token) {
        throw new Error("not set token")
    }
}

export async function validConfigFile(path: string): Promise<Config> {
    const file = await readFileSync(path, {encoding: 'utf-8'})
    const config = JSON.parse(file)
    validConfig(config)
    return config
}

export async function getToken() : Promise<string | null> {
    try {
        const file = await readFileSync(tokenPath, {encoding: 'utf-8'})
        return file.toString()
    } catch (e) {
        console.debug('error getToken: ', e.message)
    }
}

export async function storeToken(token: string) : Promise<void> {
    await writeFileSync(tokenPath, token, {encoding: 'utf-8'})
}
