import {ipcMain, screen, desktopCapturer} from 'electron'
import axios from 'axios'

export function initScreenShot () : void {
    ipcMain.handle('take-screenshot', async (event, url: string) => {
        return screenshot(url)
    });
}

export async function screenshot(sendUrl?: string): Promise<string> {
    try {
        const primaryDisplay = screen.getPrimaryDisplay();
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: primaryDisplay.size.width, height: primaryDisplay.size.height } // Захопити повну роздільну здатність
        });

        const primaryScreenSource = sources.find((source: { display_id: string; }) => source.display_id === String(primaryDisplay.id));

        if (!primaryScreenSource) {
            throw new Error('primary screen source not found');
        }

        const screenshotImage = primaryScreenSource.thumbnail;


        const base64Data = screenshotImage.toDataURL();

        await axios.post(`${sendUrl}&name=${
                // await axios.post(`http://10.10.10.25:10023/api/v2/file/screenshot/upload?access_token=IHOR&channel=screenshot&name=${
                new Date().toISOString()
            }.png`,
            screenshotImage.toPNG(), {
                headers: {
                    'Content-Type': 'image/png'
                }
            })
        return base64Data;

    } catch (error) {
        console.error('Помилка при зйомці скріншота:', error);
        throw error;
    }
}
