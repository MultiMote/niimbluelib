import { EventEmitter } from "eventemitter3";
import { Mutex } from "async-mutex";
import {
  NiimbotProtocol,
  ConnectResult,
  NiimbotPacket,
  PacketParser,
  PrinterErrorCode,
  ResponseCommandId,
} from "../packets";
import { PrinterModelMeta, getPrinterMetaById } from "../printer_models";
import {
  ClientEventMap,
  PacketSentEvent,
  PrinterInfoFetchedEvent,
  HeartbeatEvent,
  HeartbeatFailedEvent,
  PacketReceivedEvent,
  RawPacketReceivedEvent,
} from "../events";
import { findPrintTask, PrintTaskName } from "../print_tasks";
import { Utils, Validators } from "../utils";
import { PrinterInfo, PrintError } from "../packets/dto";
import { NiimbotClientType } from ".";

/**
 * Represents the connection result information.
 *
 * @category Client
 */
export type ConnectionInfo = {
  deviceName?: string;
  result: ConnectResult;
};

export const NIIMBOT_CLIENT_DEFAULTS = {
  packetIntervalMs: 10,
  heartbeatIntervalMs: 2_000,
};

/**
 * Abstract class representing a client with common functionality for interacting with a printer.
 * Hardware interface must be defined after extending this class.
 *
 * @category Client
 */
export abstract class NiimbotAbstractClient extends EventEmitter<ClientEventMap> {
  public readonly protocol: NiimbotProtocol;
  protected info: PrinterInfo = {};
  private heartbeatTimer?: NodeJS.Timeout;
  private heartbeatFails: number = 0;
  private heartbeatIntervalMs: number = NIIMBOT_CLIENT_DEFAULTS.heartbeatIntervalMs;
  protected mutex: Mutex = new Mutex();
  protected debug: boolean = false;
  private packetBuf: Uint8Array = new Uint8Array();

  /** @see https://github.com/MultiMote/niimblue/issues/5 */
  protected packetIntervalMs: number = NIIMBOT_CLIENT_DEFAULTS.packetIntervalMs;

  constructor() {
    super();
    this.protocol = new NiimbotProtocol(this);
    this.on("connect", () => this.startHeartbeat());
    this.on("disconnect", () => {
      this.stopHeartbeat();
      this.packetBuf = new Uint8Array();
    });
  }

  /**
   * Connect to printer port.
   **/
  public abstract connect(): Promise<ConnectionInfo>;

  /**
   * Disconnect from printer port.
   **/
  public abstract disconnect(): Promise<void>;

  /**
   * Check if the client is connected.
   */
  public abstract isConnected(): boolean;

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
      await this.sendPacket(packet, true);

      if (packet.oneWay) {
        return new NiimbotPacket(ResponseCommandId.In_Invalid, []); // or undefined is better?
      }

      return this.waitForPacket(packet.validResponseIds, true, timeoutMs);
    });
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
      let timeout: NodeJS.Timeout | undefined = undefined;

      const listener = (evt: PacketReceivedEvent) => {
        const pktIn = evt.packet;
        const cmdIn = pktIn.command as ResponseCommandId;

        if (
          ids.length === 0 ||
          ids.includes(cmdIn) ||
          (catchErrorPackets && [ResponseCommandId.In_PrintError, ResponseCommandId.In_NotSupported].includes(cmdIn))
        ) {
          clearTimeout(timeout);
          this.off("packetreceived", listener);

          if (cmdIn === ResponseCommandId.In_PrintError) {
            Validators.arrayLengthEquals(pktIn.data, 1);
            const errorName = PrinterErrorCode[pktIn.data[0]] ?? "unknown";
            reject(new PrintError(`Print error ${pktIn.data[0]}: ${errorName}`, pktIn.data[0]));
          } else if (cmdIn === ResponseCommandId.In_NotSupported) {
            reject(new PrintError("Feature not supported", 0));
          } else {
            resolve(pktIn);
          }
        }
      };

      timeout = setTimeout(() => {
        this.off("packetreceived", listener);
        reject(new Error(`Timeout waiting response (waited for ${Utils.bufToHex(ids, ", ")})`));
      }, timeoutMs ?? 1000);

      this.on("packetreceived", listener);
    });
  }

  /**
   * Convert raw bytes to packet objects and fire events. Defragmentation included.
   * @param data Bytes to process.
   */
  protected processRawPacket(data: DataView | Uint8Array) {
    if (data.byteLength === 0) {
      return;
    }

    if (data instanceof DataView) {
      data = new Uint8Array(data.buffer);
    }

    this.packetBuf = Utils.u8ArrayAppend(this.packetBuf, data);

    if (this.packetBuf.length > 1 && !Utils.hasSubarrayAtPos(this.packetBuf, NiimbotPacket.HEAD, 0)) {
      console.warn("Dropping invalid buffer", Utils.bufToHex(this.packetBuf));
      this.packetBuf = new Uint8Array();
    }

    try {
      const packets: NiimbotPacket[] = PacketParser.parsePacketBundle(this.packetBuf);

      if (packets.length > 0) {
        this.emit("rawpacketreceived", new RawPacketReceivedEvent(this.packetBuf));

        packets.forEach((p) => {
          this.emit("packetreceived", new PacketReceivedEvent(p));
        });

        this.packetBuf = new Uint8Array();
      }
    } catch (_e) {
      if (this.debug) {
        console.info(`Incomplete packet, ignoring:${Utils.bufToHex(this.packetBuf)}`, _e);
      }
    }
  }

  /**
   * Send raw bytes to the printer port.
   *
   * @param data Bytes to send.
   * @param force Ignore mutex lock. It used internally and you should avoid using it.
   */
  public abstract sendRaw(data: Uint8Array, force?: boolean): Promise<void>;

  public async sendPacket(packet: NiimbotPacket, force?: boolean) {
    await this.sendRaw(packet.toBytes(), force);
    this.emit("packetsent", new PacketSentEvent(packet));
  }

  /**
   * Send "connect" packet and fetch the protocol version.
   **/
  protected async initialNegotiate(): Promise<void> {
    this.info.connectResult = await this.protocol.connectResult();
    this.info.protocolVersion = 0;
    this.info.supportColor = false;

    if (this.info.connectResult === ConnectResult.ConnectedNew) {
      this.info.protocolVersion = 1;
    } else if (this.info.connectResult === ConnectResult.ConnectedV3) {
      const statusData = await this.protocol.getPrinterStatusData();
      this.info.protocolVersion = statusData.protocolVersion;
      this.info.supportColor = statusData.supportColor;
    }
  }

  /**
   * Fetch printer information and store it
   */
  public async fetchPrinterInfo(): Promise<PrinterInfo> {
    const safeGet = <T>(promise: Promise<T>, msg: string) =>
      promise.catch((e) => {
        console.warn(`Unable to get ${msg} (${e})`);
        return undefined;
      });

    this.info.modelId = await this.protocol.getPrinterModel();
    this.info.serial = await safeGet(this.protocol.getPrinterSerialNumber(), "serial number");
    this.info.mac = await safeGet(this.protocol.getPrinterBluetoothMacAddress(), "bluetooth");
    this.info.charge = await safeGet(this.protocol.getBatteryChargeLevel(), "charge level");
    this.info.autoShutdownTime = await safeGet(this.protocol.getAutoShutDownTime(), "auto shutdown time");
    this.info.labelType = await safeGet(this.protocol.getLabelType(), "label type");
    this.info.hardwareVersion = await safeGet(this.protocol.getHardwareVersion(), "hardware version");
    this.info.softwareVersion = await safeGet(this.protocol.getSoftwareVersion(), "software version");

    try {
      const i = await this.protocol.heartbeatPrinterInfo();
      this.info.printheadWidth = i.printheadWidth;
    } catch (e) {
      console.warn("Unable to get printhead width");
    }

    this.emit("printerinfofetched", new PrinterInfoFetchedEvent(this.info));
    return this.info;
  }

  /**
   * Get the stored information about the printer.
   */
  public getPrinterInfo(): PrinterInfo {
    return this.info;
  }

  /**
   * Set interval for {@link startHeartbeat}.
   *
   * @param intervalMs Heartbeat interval, default is 1000ms
   */
  public setHeartbeatInterval(intervalMs: number): void {
    this.heartbeatIntervalMs = intervalMs;
  }

  /**
   * Starts the heartbeat timer, "heartbeat" is emitted after packet received.
   *
   * If you need to change interval, call {@link setHeartbeatInterval} before.
   */
  public startHeartbeat(): void {
    this.heartbeatFails = 0;

    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      this.protocol
        .heartbeat()
        .then((data) => {
          this.heartbeatFails = 0;
          this.emit("heartbeat", new HeartbeatEvent(data));
        })
        .catch((e) => {
          console.error(e);
          this.heartbeatFails++;
          this.emit("heartbeatfailed", new HeartbeatFailedEvent(this.heartbeatFails));
        });
    }, this.heartbeatIntervalMs);
  }

  /**
   * Stops the heartbeat by clearing the interval timer.
   */
  public stopHeartbeat(): void {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
  }

  /**
   * Checks if the heartbeat timer has been started.
   */
  public isHeartbeatStarted(): boolean {
    return this.heartbeatTimer === undefined;
  }

  /**
   * Get printer capabilities based on the printer model. Model library is hardcoded.
   **/
  public getModelMetadata(): PrinterModelMeta | undefined {
    if (this.info.modelId === undefined) {
      return undefined;
    }
    return getPrinterMetaById(this.info.modelId);
  }

  /**
   * Determine print task version if any.
   **/
  public getPrintTaskType(): PrintTaskName | undefined {
    const meta = this.getModelMetadata();

    if (meta === undefined) {
      return undefined;
    }

    return findPrintTask(meta.model, this.getPrinterInfo().protocolVersion);
  }

  /**
   * Set the interval between packets in milliseconds.
   */
  public setPacketInterval(milliseconds: number) {
    this.packetIntervalMs = milliseconds;
  }

  /**
   * Enable some debug information logging.
   */
  public setDebug(value: boolean) {
    this.debug = value;
  }

  public abstract getType(): NiimbotClientType;
}
