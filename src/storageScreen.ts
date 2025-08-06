
export class StorageScreenCapture {
    id: string
    sdpResolver: string
    stream: MediaStream | null
    pc: RTCPeerConnection
    token: string
    offerOptions: RTCOfferOptions
    restartId: string
    constructor(id: string, iceServers: RTCIceServer[], sdpResolver: string, token: string) {
        this.id = id
        this.sdpResolver = sdpResolver
        this.token = token
        this.stream = null
        const pc = new RTCPeerConnection({
            iceServers,
        })
        this.restartId = ""
        this.pc = pc
        this.offerOptions = {
            iceRestart: false,
        }
        pc.oniceconnectionstatechange = e => {
            log(pc.iceConnectionState)
            console.info(pc.iceConnectionState)
            switch (pc.iceConnectionState) {
                case "disconnected":

                    break
                case "failed":
                case "closed":

                    this.close();
                    break
            }
        }

        pc.onnegotiationneeded = async () => {
            console.error("onnegotiationneeded\n", pc.localDescription.sdp)
        };

        pc.onicecandidate = async event => {
            if (pc.iceGatheringState !== 'complete') {
                return
            }

            //@ts-ignore
            window.sc = this;

            const request = {
                type: pc.localDescription.type,
                sdp_offer: pc.localDescription.sdp,
                uuid: this.id,
                name: `${new Date().toISOString()}`,
            }

            let url = this.sdpResolver
            let method = 'POST'

            if (this.offerOptions.iceRestart) {
                console.error("iseRestart")
                url += `/${this.restartId}`
                method = 'PUT'
            }

            // return;

            let remoteSdp: any

            try {
                const sdp = JSON.stringify(request)
                const response = await fetch(url, {
                    method: method,
                    headers: {
                      "X-Webitel-Access": this.token,
                    },
                    body: sdp,
                });

                if (response.status !== 200) {
                    throw new Error(await response.json())
                }

                remoteSdp = await response.json()
            } catch (e) {
                console.error(e.message!)
                this.close()
                return
            }
            if (!this.restartId) {
                this.restartId = remoteSdp.id
            }

            console.info('restart id: ', remoteSdp.id)
            console.info('local sdp\n', pc.localDescription.sdp)
            console.info('remote sdp\n', remoteSdp.sdp_answer)

            await pc.setRemoteDescription({
                type: "answer",
                sdp: remoteSdp.sdp_answer,
            })
        }
        pc.addTransceiver('video', { direction: 'sendrecv' });
    }

    async hangup() {
        let url = this.sdpResolver
        url += `/${this.restartId}`

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                "X-Webitel-Access": this.token,
            },
        });
        this.close()
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
        stream.getTracks().forEach(track => {
            console.error(track.getConstraints())
            pc.addTrack(track, stream)
        })
        const offer = await pc.createOffer(this.offerOptions)
        await pc.setLocalDescription(offer)
    }

    async restart() : Promise<void> {
        const pc = this.pc
        this.offerOptions.iceRestart = true
        const offer = await pc.createOffer(this.offerOptions)
        await pc.setLocalDescription(offer)

    }
}
