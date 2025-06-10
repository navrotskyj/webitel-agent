import axios from "axios";

export async function logOut(url: string, token: string) : Promise<void> {
    const api = `${url}/api/logout`
    try {
        const res = await axios.post(api, {}, {
            headers: {
                "Content-Type": "application/json",
                "x-webitel-access": token,
            }
        })

        console.debug(`api ${api} success, staus: ${res.status}`)
    } catch (e) {
        console.error(`[${api}] error: `, e.message)
        throw e
    }
}

