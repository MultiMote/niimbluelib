import { EventEmitter } from 'eventemitter3'
import { Mutex } from 'async-mutex'
import {
  Abstraction,
  ConnectResult,
  NiimbotPacket,
  PacketGenerator,
  PacketParser,
  PrinterErrorCode,
  RequestCommandId,
  ResponseCommandId,
} from '../packets'
import { getPrinterMetaById, PrinterModelMeta } from '../printer_models'
import {
  ClientEventMap,
  HeartbeatEvent,
  HeartbeatFailedEvent,
  PacketReceivedEvent,
  PacketSentEvent,
  PrinterInfoFetchedEvent,
  RawPacketReceivedEvent,
} from '../events'
import { findPrintTask, PrintTaskName } from '../print_tasks'
import { Utils, Validators } from '../utils'
import { PrinterInfo, PrintError } from '../packets/dto'

/**
 * Represents the connection result information.
 *
 * @category Client
 */
export type ConnectionInfo = {
  deviceName?: string
  result: ConnectResult
}

/**
 * Abstract class representing a client with common functionality for interacting with a printer.
 * Hardware interface must be defined after extending this class.
 *
 * @category Client
 */
export abstract class NiimbotAbstractClient extends EventEmitter<ClientEventMap> {
  public readonly abstraction: Abstraction
  protected info: PrinterInfo = {}
  private heartbeatTimer?: NodeJS.Timeout
  private heartbeatFails: number = 0
  private heartbeatIntervalMs: number = 2_000
  protected mutex: Mutex = new Mutex()
  protected debug: boolean = false
  private packetBuf = new Uint8Array()

  /** @see https://github.com/MultiMote/niimblue/issues/5 */
  protected packetIntervalMs: number = 10

  constructor() {
    super()
    this.abstraction = new Abstraction(this)
    this.on('connect', () => this.startHeartbeat())
    this.on('disconnect', () => {
      this.stopHeartbeat()
      this.packetBuf = new Uint8Array()
    })
  }

  /**
   * Connect to printer port.
   **/
  public abstract connect(): Promise<ConnectionInfo>

  /**
   * Disconnect from printer port.
   **/
  public abstract disconnect(): Promise<void>

  /**
   * Check if the client is connected.
   */
  public abstract isConnected(): boolean

  /**
   * Send packet and wait for response for {@link timeoutMs} milliseconds.
   *
   * If {@link NiimbotPacket.validResponseIds() validResponseIds} is defined, it will wait for packet with this command id.
   *
   * @throws {@link PrintError} when {@link ResponseCommandId.In_PrintError} or {@link ResponseCommandId.In_NotSupported} received.
   *
   * @returns {NiimbotPacket} Packet object.
   */
  public async sendPacketWaitResponse(packet: NiimbotPacket, timeoutMs: number = 1000): Promise<NiimbotPacket> {
    return this.mutex.runExclusive(async () => {
      await this.sendPacket(packet, true)

      if (packet.oneWay) {
        return new NiimbotPacket(ResponseCommandId.In_Invalid, []) // or undefined is better?
      }

      return this.waitForPacket(packet.validResponseIds, true, timeoutMs)
    })
  }

  /**
   * Send wait for response for {@link timeoutMs} milliseconds.
   *
   * If {@link ids} is set, it will wait for packet with this command ids.
   *
   * @throws {@link PrintError} when {@link ResponseCommandId.In_PrintError} or {@link ResponseCommandId.In_NotSupported} received and {@link catchErrorPackets} is true.
   *
   * @returns {NiimbotPacket} Packet object.
   */
  public async waitForPacket(
    ids: ResponseCommandId[] = [],
    catchErrorPackets: boolean = true,
    timeoutMs: number = 1000,
  ): Promise<NiimbotPacket> {
    return new Promise((resolve, reject) => {
      let timeout: NodeJS.Timeout | undefined = undefined

      const listener = (evt: PacketReceivedEvent) => {
        const pktIn = evt.packet
        const cmdIn = pktIn.command as ResponseCommandId

        if (
          ids.length === 0 ||
          ids.includes(cmdIn) ||
          (catchErrorPackets && [ResponseCommandId.In_PrintError, ResponseCommandId.In_NotSupported].includes(cmdIn))
        ) {
          clearTimeout(timeout)
          this.off('packetreceived', listener)

          if (cmdIn === ResponseCommandId.In_PrintError) {
            Validators.u8ArrayLengthEquals(pktIn.data, 1)
            const errorName = PrinterErrorCode[pktIn.data[0]] ?? 'unknown'
            reject(new PrintError(`Print error ${pktIn.data[0]}: ${errorName}`, pktIn.data[0]))
          } else if (cmdIn === ResponseCommandId.In_NotSupported) {
            reject(new PrintError('Feature not supported', 0))
          } else {
            resolve(pktIn)
          }
        }
      }

      timeout = setTimeout(() => {
        this.off('packetreceived', listener)
        reject(new Error(`Timeout waiting response (waited for ${Utils.bufToHex(ids, ', ')})`))
      }, timeoutMs ?? 1000)

      this.on('packetreceived', listener)
    })
  }

  /**
   * Convert raw bytes to packet objects and fire events. Defragmentation included.
   * @param data Bytes to process.
   */
  protected processRawPacket(data: DataView | Uint8Array) {
    if (data.byteLength === 0) {
      return
    }

    if (data instanceof DataView) {
      data = new Uint8Array(data.buffer)
    }

    this.packetBuf = Utils.u8ArrayAppend(this.packetBuf, data)

    if (this.packetBuf.length > 1 && !Utils.hasSubarrayAtPos(this.packetBuf, NiimbotPacket.HEAD, 0)) {
      console.warn('Dropping invalid buffer', Utils.bufToHex(this.packetBuf))
      this.packetBuf = new Uint8Array()
    }

    try {
      const packets: NiimbotPacket[] = PacketParser.parsePacketBundle(this.packetBuf)

      if (packets.length > 0) {
        this.emit('rawpacketreceived', new RawPacketReceivedEvent(this.packetBuf))

        packets.forEach(p => {
          this.emit('packetreceived', new PacketReceivedEvent(p))
        })

        this.packetBuf = new Uint8Array()
      }
    } catch (_e) {
      if (this.debug) {
        console.info(`Incomplete packet, ignoring:${Utils.bufToHex(this.packetBuf)}`, _e)
      }
    }
  }

  /**
   * Send raw bytes to the printer port.
   *
   * @param data Bytes to send.
   * @param force Ignore mutex lock. It used internally and you should avoid using it.
   */
  public abstract sendRaw(data: Uint8Array, force?: boolean): Promise<void>

  public async sendPacket(packet: NiimbotPacket, force?: boolean) {
    await this.sendRaw(packet.toBytes(), force)
    this.emit('packetsent', new PacketSentEvent(packet))
  }

  /**
   * Send "connect" packet and fetch the protocol version.
   **/
  protected async initialNegotiate(): Promise<ConnectResult> {
    const cfg = this.info
    cfg.connectResult = await this.abstraction.connectResult()
    cfg.protocolVersion = 0

    if (cfg.connectResult === ConnectResult.ConnectedNew) {
      cfg.protocolVersion = 1
    } else if (cfg.connectResult === ConnectResult.ConnectedV3) {
      const statusData = await this.abstraction.getPrinterStatusData()
      cfg.protocolVersion = statusData.protocolVersion
    }

    await this.abstraction.send(PacketGenerator.mapped(RequestCommandId.PrinterConfig))

    return cfg.connectResult
  }

  /**
   * Fetches printer information and stores it.
   */
  public async fetchPrinterInfo(): Promise<PrinterInfo> {
    this.info.modelId = await this.abstraction.getPrinterModel()

    this.info.serial = (await this.abstraction.getPrinterSerialNumber().catch(console.error)) ?? undefined
    this.info.mac = (await this.abstraction.getPrinterBluetoothMacAddress().catch(console.error)) ?? undefined
    this.info.charge = (await this.abstraction.getBatteryChargeLevel().catch(console.error)) ?? undefined
    this.info.autoShutdownTime = (await this.abstraction.getAutoShutDownTime().catch(console.error)) ?? undefined
    this.info.labelType = (await this.abstraction.getLabelType().catch(console.error)) ?? undefined
    this.info.hardwareVersion = (await this.abstraction.getHardwareVersion().catch(console.error)) ?? undefined
    this.info.softwareVersion = (await this.abstraction.getSoftwareVersion().catch(console.error)) ?? undefined

    this.emit('printerinfofetched', new PrinterInfoFetchedEvent(this.info))
    return this.info
  }

  /**
   * Get the stored information about the printer.
   */
  public getPrinterInfo(): PrinterInfo {
    return this.info
  }

  /**
   * Set interval for {@link startHeartbeat}.
   *
   * @param intervalMs Heartbeat interval, default is 1000ms
   */
  public setHeartbeatInterval(intervalMs: number): void {
    this.heartbeatIntervalMs = intervalMs
  }

  /**
   * Starts the heartbeat timer, "heartbeat" is emitted after packet received.
   *
   * If you need to change interval, call {@link setHeartbeatInterval} before.
   */
  public startHeartbeat(): void {
    this.heartbeatFails = 0

    this.stopHeartbeat()

    this.heartbeatTimer = setInterval(() => {
      this.abstraction
        .heartbeat()
        .then(data => {
          this.heartbeatFails = 0
          this.emit('heartbeat', new HeartbeatEvent(data))
        })
        .catch(e => {
          console.error(e)
          this.heartbeatFails++
          this.emit('heartbeatfailed', new HeartbeatFailedEvent(this.heartbeatFails))
        })
    }, this.heartbeatIntervalMs)
  }

  /**
   * Stops the heartbeat by clearing the interval timer.
   */
  public stopHeartbeat(): void {
    clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = undefined
  }

  /**
   * Checks if the heartbeat timer has been started.
   */
  public isHeartbeatStarted(): boolean {
    return this.heartbeatTimer === undefined
  }

  /**
   * Get printer capabilities based on the printer model. Model library is hardcoded.
   **/
  public getModelMetadata(): PrinterModelMeta | undefined {
    if (this.info.modelId === undefined) {
      return undefined
    }
    return getPrinterMetaById(this.info.modelId)
  }

  /**
   * Determine print task version if any.
   **/
  public getPrintTaskType(): PrintTaskName | undefined {
    const meta = this.getModelMetadata()

    if (meta === undefined) {
      return undefined
    }

    return findPrintTask(meta.model, this.getPrinterInfo().protocolVersion)
  }

  /**
   * Set the interval between packets in milliseconds.
   */
  public setPacketInterval(milliseconds: number) {
    this.packetIntervalMs = milliseconds
  }

  /**
   * Enable some debug information logging.
   */
  public setDebug(value: boolean) {
    this.debug = value
  }
}
