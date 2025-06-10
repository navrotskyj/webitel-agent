import { notarize } from '@electron/notarize';
import { existsSync } from 'fs'
import { join } from 'path'

export async function afterSign(params) {
    // if (params.electronPlatformName !== 'darwin') {
    //     return
    // }
    console.dir(params)

    const appId = 'webitel.call_center.agent'

    const appPath = join(
        params.appOutDir,
        `${params.packager.appInfo.productFilename}.app`
    )

    if (!existsSync(appPath)) {
        console.log(`Cannot find application at: ${appPath}`)
        console.log(params)
        throw new Error(`Cannot find application at: ${appPath}`)
    }

    console.log(`  \u001b[33m•\u001b[0m notarizing      ${appId}`)

    try {
        await notarize({
            appBundleId: appId,
            appPath: appPath,
            appleId: 'i.navrotskii@webitel.me',
            appleIdPassword: 'mtmo-dptt-osny-phzk',
            teamId: "K5Z3VDH6Z7"
        })
    } catch (error) {
        console.error(error)
    }

    console.log(`  \u001b[32m•\u001b[0m notarizing      DONE`)
}
