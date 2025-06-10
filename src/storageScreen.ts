
export class StorageScreenCapture {
    id: string
    sdpResolver: string
    stream: MediaStream | null
    pc: RTCPeerConnection
    constructor(id: string, iceServers: RTCIceServer[], sdpResolver: string) {
        this.id = id
        this.sdpResolver = sdpResolver
        this.stream = null
        const pc = new RTCPeerConnection({
            iceServers,
        })
        this.pc = pc
        pc.oniceconnectionstatechange = e => {
            log(pc.iceConnectionState)
            switch (pc.iceConnectionState) {
                case "disconnected":
                case "failed":
                    this.close();
                    break
            }
        }
        pc.onicecandidate = async event => {
            if (pc.iceGatheringState !== 'complete') {
                return
            }
            const request = {
                type: pc.localDescription.type,
                sdp: pc.localDescription.sdp,
                uuid: this.id,
                name: `${new Date().toISOString()}`
            }

            let remoteSdp: any

            try {
                const sdp = JSON.stringify(request)
                const response = await fetch(this.sdpResolver, {
                    method: "POST",
                    body: sdp,
                });

                remoteSdp = await response.json()
            } catch (e) {
                console.error(e.message!)
                this.close()
                return
            }

            console.info('local sdp\n', pc.localDescription.sdp)
            console.info('remote sdp\n', remoteSdp.sdp)

            await pc.setRemoteDescription(remoteSdp)
        }
        pc.addTransceiver('video', { direction: 'sendrecv' });
    }

    close(): void {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop())
            this.stream = null
        }
        if (this.pc) {
            this.pc.close()
            this.pc = null
        }
    }

    async cast(stream: MediaStream) : Promise<void> {
        const pc = this.pc
        this.stream = stream
        stream.getTracks().forEach(track => pc.addTrack(track, stream))
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
    }
}
