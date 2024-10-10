import { TypedEventTarget } from "typescript-event-target";
import {
  Abstraction,
  AutoShutdownTime,
  BatteryChargeLevel,
  ConnectResult,
  LabelType,
  NiimbotPacket,
} from "../packets";
import { PrinterModelMeta, getPrinterMetaById } from "../printer_models";
import { ClientEventMap, PacketSentEvent, PrinterInfoFetchedEvent, HeartbeatEvent, HeartbeatFailedEvent } from "./events";
import { getPrintTaskVersion, PrintTaskVersion } from "../print_task_versions";

export type ConnectionInfo = {
  deviceName?: string;
  result: ConnectResult;
};

export interface PrinterInfo {
  connectResult?: ConnectResult;
  protocolVersion?: number;
  modelId?: number;
  serial?: string;
  mac?: string;
  charge?: BatteryChargeLevel;
  autoShutdownTime?: AutoShutdownTime;
  labelType?: LabelType;
  softwareVersion?: string;
  hardwareVersion?: string;
}

export abstract class NiimbotAbstractClient extends TypedEventTarget<ClientEventMap> {
  public readonly abstraction: Abstraction;
  protected info: PrinterInfo = {};
  private heartbeatTimer?: NodeJS.Timeout;
  private heartbeatFails: number = 0;
  private heartbeatIntervalMs: number = 2_000;

  /** https://github.com/MultiMote/niimblue/issues/5 */
  protected packetIntervalMs: number = 10;

  constructor() {
    super();
    this.abstraction = new Abstraction(this);
    this.addEventListener("connect", () => this.startHeartbeat())
    this.addEventListener("disconnect", () => this.stopHeartbeat())
  }

  /** Connect to printer port */
  public abstract connect(): Promise<ConnectionInfo>;

  /** Disconnect from printer port */
  public abstract disconnect(): Promise<void>;

  public abstract isConnected(): boolean;

  /**
   * Send packet and wait for response.
   * If packet.responsePacketCommandId is defined, it will wait for packet with this command id.
   */
  public abstract sendPacketWaitResponse(packet: NiimbotPacket, timeoutMs?: number): Promise<NiimbotPacket>;

  /**
   * Send raw bytes to the printer port.
   *
   * @param data Bytes to send.
   * @param force Ignore mutex lock. You should avoid using it.
   */
  public abstract sendRaw(data: Uint8Array, force?: boolean): Promise<void>;

  public async sendPacket(packet: NiimbotPacket, force?: boolean) {
    await this.sendRaw(packet.toBytes(), force);
    this.dispatchTypedEvent("packetsent", new PacketSentEvent(packet));
  }

  /** Send "connect" packet and fetch the protocol version */
  protected async initialNegotiate(): Promise<void> {
    const cfg = this.info;
    cfg.connectResult = await this.abstraction.connectResult();
    cfg.protocolVersion = 0;

    if (cfg.connectResult === ConnectResult.ConnectedNew) {
      cfg.protocolVersion = 1;
    } else if (cfg.connectResult === ConnectResult.ConnectedV3) {
      const statusData = await this.abstraction.getPrinterStatusData();
      cfg.protocolVersion = statusData.protocolVersion;
    }
  }

  public async fetchPrinterInfo(): Promise<PrinterInfo> {
    this.info.modelId = await this.abstraction.getPrinterModel();

    this.info.serial = await this.abstraction.getPrinterSerialNumber().catch(console.error) ?? undefined;
    this.info.mac = await this.abstraction.getPrinterBluetoothMacAddress().catch(console.error) ?? undefined;
    this.info.charge = await this.abstraction.getBatteryChargeLevel().catch(console.error) ?? undefined;
    this.info.autoShutdownTime = await this.abstraction.getAutoShutDownTime().catch(console.error) ?? undefined;
    this.info.labelType = await this.abstraction.getLabelType().catch(console.error) ?? undefined;
    this.info.hardwareVersion = await this.abstraction.getHardwareVersion().catch(console.error) ?? undefined;
    this.info.softwareVersion = await this.abstraction.getSoftwareVersion().catch(console.error) ?? undefined;

    this.dispatchTypedEvent("printerinfofetched", new PrinterInfoFetchedEvent(this.info));
    return this.info;
  }

  public getPrinterInfo(): PrinterInfo {
    return this.info;
  }

  /**
   * Set interval for {@link startHeartbeat}.
   *
   * @param interval Heartbeat interval, default is 1000ms
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
      this.abstraction
        .heartbeat()
        .then((data) => {
          this.heartbeatFails = 0;
          this.dispatchTypedEvent("heartbeat", new HeartbeatEvent(data));
        })
        .catch((e) => {
          console.error(e);
          this.heartbeatFails++;
          this.dispatchTypedEvent("heartbeatfailed", new HeartbeatFailedEvent(this.heartbeatFails));
        });
    }, this.heartbeatIntervalMs);
  }

  public stopHeartbeat(): void {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
  }

  public isHeartbeatStarted(): boolean {
    return this.heartbeatTimer === undefined;
  }

  /** Get printer capabilities based on the printer model. Model library is hardcoded. */
  public getModelMetadata(): PrinterModelMeta | undefined {
    if (this.info.modelId === undefined) {
      return undefined;
    }
    return getPrinterMetaById(this.info.modelId);
  }

  /** Determine print task version if any */
  public getPrintTaskVersion(): PrintTaskVersion | undefined {
    const meta = this.getModelMetadata();

    if (meta === undefined) {
      return undefined;
    }

    return getPrintTaskVersion(meta.model);
  }

  public setPacketInterval(milliseconds: number) {
    this.packetIntervalMs = milliseconds;
  }
}

export * from "./events";
export * from "./bluetooth_impl";
export * from "./serial_impl";
