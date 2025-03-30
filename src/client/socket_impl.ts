import {
  ConnectEvent,
  type ConnectionInfo,
  ConnectResult,
  DisconnectEvent,
  NiimbotAbstractClient,
  RawPacketSentEvent,
  Utils,
} from '@mmote/niimbluelib'

export interface DeviceInfo {
  id: string
  name: string
}

export class NiimbotSocketClient extends NiimbotAbstractClient {
  private webSocket?: WebSocket = undefined
  private writer?: (data: Uint8Array) => Promise<void> = undefined
  private _isConnected: boolean = false
  private deviceName?: string

  // Convert Uint8Array to HEX string
  private uint8ArrayToHex(uint8Array: Uint8Array) {
    return Array.from(uint8Array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join(' ')
  }

  // Convert HEX string to Uint8Array
  private hexToUint8Array(hex: string) {
    const bytes: number[] = []

    hex.split(' ').forEach(hexVal => {
      bytes.push(parseInt(hexVal, 16))
    })

    return new Uint8Array(bytes)
  }

  public async connect(selectDevice?: (deviceList: DeviceInfo[]) => Promise<string>): Promise<ConnectionInfo> {
    await this.disconnect()
    if (!selectDevice) return { result: ConnectResult.Disconnect }

    const _webSocket: WebSocket = await new Promise((resolve, reject) => {
      const server = new WebSocket('ws://localhost:8080')

      server.onopen = () => resolve(server)
      server.onerror = err => reject(err)
    })

    _webSocket.onclose = () => {
      this.webSocket = undefined
      this.emit('disconnect', new DisconnectEvent())
    }

    _webSocket.onmessage = async ({ data }: MessageEvent<string>) => {
      if (data.startsWith('port_list: ')) {
        const portList = JSON.parse(data.substring(11)) as {
          path: string
          friendlyName: string
        }[]

        try {
          const selectedPort = await selectDevice(
            portList.map(port => ({
              id: port.path,
              name: port.friendlyName,
            })),
          )
          _webSocket.send(`connect: ${selectedPort}`)
        } catch {
          return this.disconnect().then(() => ({
            result: ConnectResult.Disconnect,
          }))
        }
      } else if (data.startsWith('connected to:')) {
        this._isConnected = true
        this.deviceName = data.substring(13)
      } else if (data.startsWith('error: ')) {
        return this.disconnect().then(() => {
          throw new Error(data.substring(7))
        })
      } else {
        this.processRawPacket(this.hexToUint8Array(data))
      }
    }

    this.webSocket = _webSocket

    this.writer = (message: Uint8Array) =>
      new Promise(resolve => {
        this.webSocket!.send(this.uint8ArrayToHex(message))
        resolve()
      })

    try {
      await new Promise<void>(resolve => {
        const waitConnected = () => {
          if (!this._isConnected) setTimeout(waitConnected, 1)
          else resolve()
        }
        waitConnected()
      })
      const connectResult = await this.initialNegotiate()
      await this.fetchPrinterInfo()

      const result: ConnectionInfo = {
        deviceName: this.deviceName,
        result: connectResult,
      }
      this.emit('connect', new ConnectEvent(result))

      return result
    } catch (e) {
      console.error('Unable to fetch printer info (is it turned on?).')
      console.error(e)

      _webSocket.close()

      throw e
    }
  }

  public async disconnect() {
    this.stopHeartbeat()

    if (this.webSocket !== undefined) {
      await this.webSocket.close()
      this.emit('disconnect', new DisconnectEvent())
    }

    this.webSocket = undefined
    this.writer = undefined
    this._isConnected = false
    this.deviceName = undefined
  }

  public isConnected(): boolean {
    return this.webSocket !== undefined && this.writer !== undefined && this._isConnected
  }

  public async sendRaw(data: Uint8Array, force?: boolean) {
    const send = async () => {
      if (!this.isConnected()) {
        throw new Error('Port is not readable/writable')
      }
      await Utils.sleep(this.packetIntervalMs)
      new Uint8Array([0x03, 0x55, 0x55, 0xc1, 0x01, 0x01, 0xc1, 0xaa, 0xaa])
      await this.writer!(data)
      this.emit('rawpacketsent', new RawPacketSentEvent(data))
    }

    if (force) {
      await send()
    } else {
      await this.mutex.runExclusive(send)
    }
  }
}
