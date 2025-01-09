import {
  AutoShutdownTime,
  BatteryChargeLevel,
  ConnectResult,
  HeartbeatType,
  LabelType,
  PrinterInfoType,
  ResponseCommandId,
  SoundSettingsItemType,
  SoundSettingsType,
} from ".";
import { NiimbotAbstractClient } from "../client";
import { FirmwareProgressEvent, PacketReceivedEvent, PrintProgressEvent } from "../events";
import { PrintTaskName, printTasks } from "../print_tasks";
import { AbstractPrintTask, PrintOptions } from "../print_tasks/AbstractPrintTask";
import { Validators, Utils } from "../utils";
import { SequentialDataReader } from "./data_reader";
import { NiimbotCrc32Packet, NiimbotPacket } from "./packet";
import { PacketGenerator } from "./packet_generator";
import CRC32 from "crc-32";

/**
 * @category Packets
 */
export class PrintError extends Error {
  public readonly reasonId: number;

  constructor(message: string, reasonId: number) {
    super(message);
    this.reasonId = reasonId;
  }
}

/**
 * @category Packets
 */
export interface PrintStatus {
  /** 0 – n */
  page: number;
  /** 0 – 100 */
  pagePrintProgress: number;
  /** 0 – 100 */
  pageFeedProgress: number;
}
/**
 * @category Packets
 */
export interface RfidInfo {
  tagPresent: boolean;
  uuid: string;
  barCode: string;
  serialNumber: string;
  allPaper: number;
  usedPaper: number;
  consumablesType: LabelType;
}

/**
 * @category Packets
 **/
export interface HeartbeatData {
  paperState: number;
  rfidReadState: number;
  lidClosed: boolean;
  powerLevel: BatteryChargeLevel;
}

/**
 * @category Packets
 */
export interface SoundSettings {
  category: SoundSettingsType;
  item: SoundSettingsItemType;
  value: boolean;
}

/**
 * @category Packets
 */
export interface PrinterStatusData {
  supportColor: number;
  protocolVersion: number;
}

/**
 * Packet sender and parser.
 *
 * @category Packets
 */
export class Abstraction {
  private readonly DEFAULT_PACKET_TIMEOUT: number = 1_000;
  private client: NiimbotAbstractClient;
  private packetTimeout: number = this.DEFAULT_PACKET_TIMEOUT;
  private statusPollTimer: NodeJS.Timeout | undefined;
  private statusTimeoutTimer: NodeJS.Timeout | undefined;

  constructor(client: NiimbotAbstractClient) {
    this.client = client;
  }

  public getClient(): NiimbotAbstractClient {
    return this.client;
  }

  public getPacketTimeout(): number {
    return this.packetTimeout;
  }

  public setPacketTimeout(value: number) {
    this.packetTimeout = value;
  }

  public setDefaultPacketTimeout() {
    this.packetTimeout = this.DEFAULT_PACKET_TIMEOUT;
  }

  /** Send packet and wait for response */
  public async send(packet: NiimbotPacket, forceTimeout?: number): Promise<NiimbotPacket> {
    return this.client.sendPacketWaitResponse(packet, forceTimeout ?? this.packetTimeout);
  }

  public async sendAll(packets: NiimbotPacket[], forceTimeout?: number): Promise<void> {
    for (const p of packets) {
      await this.send(p, forceTimeout);
    }
  }

  public async getPrintStatus(): Promise<PrintStatus> {
    const packet = await this.send(PacketGenerator.printStatus());

    Validators.u8ArrayLengthAtLeast(packet.data, 4); // can be 8, 10, but ignore it for now

    const r = new SequentialDataReader(packet.data);
    const page = r.readI16();
    const pagePrintProgress = r.readI8();
    const pageFeedProgress = r.readI8();

    if (packet.dataLength === 10) {
      r.skip(2);
      const error = r.readI8();

      if (error !== 0) {
        throw new PrintError(`Print error (${ResponseCommandId[packet.command]} packet flag)`, error);
      }
    }

    return { page, pagePrintProgress, pageFeedProgress };
  }

  public async connectResult(): Promise<ConnectResult> {
    const packet = await this.send(PacketGenerator.connect());
    Validators.u8ArrayLengthAtLeast(packet.data, 1);
    return packet.data[0] as ConnectResult;
  }

  public async getPrinterStatusData(): Promise<PrinterStatusData> {
    let protocolVersion = 0;
    const packet = await this.send(PacketGenerator.getPrinterStatusData());
    let supportColor = 0;

    if (packet.dataLength > 12) {
      supportColor = packet.data[10];

      const n = packet.data[11] * 100 + packet.data[12];
      if (n >= 204 && n < 300) {
        protocolVersion = 3;
      }
      if (n >= 301) {
        protocolVersion = 4;
      }
    }

    return {
      supportColor,
      protocolVersion,
    };
  }

  public async getPrinterModel(): Promise<number> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.PrinterModelId));
    Validators.u8ArrayLengthAtLeast(packet.data, 1);

    if (packet.data.length === 1) {
      return packet.data[0] << 8;
    }

    Validators.u8ArrayLengthEquals(packet.data, 2);
    return Utils.bytesToI16(packet.data);
  }

  /** Read paper nfc tag info */
  public async rfidInfo(): Promise<RfidInfo> {
    const packet = await this.send(PacketGenerator.rfidInfo());

    const info: RfidInfo = {
      tagPresent: false,
      uuid: "",
      barCode: "",
      serialNumber: "",
      allPaper: -1,
      usedPaper: -1,
      consumablesType: LabelType.Invalid,
    };

    if (packet.dataLength === 1) {
      return info;
    }

    const r = new SequentialDataReader(packet.data);
    info.tagPresent = true;
    info.uuid = Utils.bufToHex(r.readBytes(8), "");
    info.barCode = r.readVString();
    info.serialNumber = r.readVString();
    info.allPaper = r.readI16();
    info.usedPaper = r.readI16();
    info.consumablesType = r.readI8() as LabelType;
    r.end();

    return info;
  }

  public async heartbeat(): Promise<HeartbeatData> {
    const packet = await this.send(PacketGenerator.heartbeat(HeartbeatType.Advanced1), 500);

    const info: HeartbeatData = {
      paperState: -1,
      rfidReadState: -1,
      lidClosed: false,
      powerLevel: BatteryChargeLevel.Charge0,
    };

    // originally expected packet length is bound to model id, but we make it more robust and simple
    const len = packet.dataLength;
    const r = new SequentialDataReader(packet.data);

    if (len === 10) {
      // d110
      r.skip(8);
      info.lidClosed = r.readBool();
      info.powerLevel = r.readI8();
    } else if (len === 20) {
      r.skip(18);
      info.paperState = r.readI8();
      info.rfidReadState = r.readI8();
    } else if (len === 19) {
      r.skip(15);
      info.lidClosed = r.readBool();
      info.powerLevel = r.readI8();
      info.paperState = r.readI8();
      info.rfidReadState = r.readI8();
    } else if (len === 13) {
      // b1
      r.skip(9);
      info.lidClosed = r.readBool();
      info.powerLevel = r.readI8();
      info.paperState = r.readI8();
      info.rfidReadState = r.readI8();
    } else {
      throw new Error("Invalid heartbeat length");
    }
    r.end();

    const model: number | undefined = this.client.getPrinterInfo().modelId;

    if (model !== undefined && ![512, 514, 513, 2304, 1792, 3584, 5120, 2560, 3840, 4352, 272].includes(model)) {
      info.lidClosed = !info.lidClosed;
    }

    return info;
  }

  public async getBatteryChargeLevel(): Promise<BatteryChargeLevel> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.BatteryChargeLevel));
    Validators.u8ArrayLengthEquals(packet.data, 1);
    return packet.data[0] as BatteryChargeLevel;
  }

  public async getAutoShutDownTime(): Promise<AutoShutdownTime> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.AutoShutdownTime));
    Validators.u8ArrayLengthEquals(packet.data, 1);
    return packet.data[0] as AutoShutdownTime;
  }

  /** May be wrong, version format varies between models */
  public async getSoftwareVersion(): Promise<string> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.SoftWareVersion));
    Validators.u8ArrayLengthEquals(packet.data, 2);

    // todo: find how to determine format
    /*
    let version = 0;
    const model = this.client.getModelMetadata()?.model;

    if (model !== undefined && PrinterModel[model]?.startsWith("B")) {
      version = packet.data[1] / 100 + packet.data[0];
    } else {
      version = (packet.data[0] * 256 + packet.data[1]) / 100.0;
    }

    return version.toFixed(2);\
    */
    return `0x${Utils.bufToHex(packet.data, "")}`;
  }

  /** May be wrong, version format varies between models */
  public async getHardwareVersion(): Promise<string> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.HardWareVersion));
    Validators.u8ArrayLengthEquals(packet.data, 2);

    // todo: find how to determine format
    /*
    let version = 0;
    const model = this.client.getModelMetadata()?.model;

    if (model !== undefined && PrinterModel[model]?.startsWith("B")) {
      version = packet.data[1] / 100 + packet.data[0];
    } else {
      version = (packet.data[0] * 256 + packet.data[1]) / 100.0;
    }

    return version.toFixed(2);
    */
    return `0x${Utils.bufToHex(packet.data, "")}`;
  }

  public async setAutoShutDownTime(time: AutoShutdownTime): Promise<void> {
    await this.send(PacketGenerator.setAutoShutDownTime(time));
  }

  public async getLabelType(): Promise<LabelType> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.LabelType));
    Validators.u8ArrayLengthEquals(packet.data, 1);
    return packet.data[0] as LabelType;
  }

  public async getPrinterSerialNumber(): Promise<string> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.SerialNumber));
    Validators.u8ArrayLengthAtLeast(packet.data, 1);

    if (packet.data.length < 4) {
      return "-1";
    }

    if (packet.data.length >= 8) {
      return Utils.u8ArrayToString(packet.data);
    }

    return Utils.bufToHex(packet.data.slice(0, 4), "").toUpperCase();
  }

  public async getPrinterBluetoothMacAddress(): Promise<string> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.BluetoothAddress));
    Validators.u8ArrayLengthAtLeast(packet.data, 1);
    return Utils.bufToHex(packet.data.reverse(), ":");
  }

  public async isSoundEnabled(soundType: SoundSettingsItemType): Promise<boolean> {
    const packet = await this.send(PacketGenerator.getSoundSettings(soundType));
    Validators.u8ArrayLengthEquals(packet.data, 3);
    const value = !!packet.data[2];
    return value;
  }

  public async setSoundEnabled(soundType: SoundSettingsItemType, value: boolean): Promise<void> {
    await this.send(PacketGenerator.setSoundSettings(soundType, value));
  }

  /** Clear settings */
  public async printerReset(): Promise<void> {
    await this.send(PacketGenerator.printerReset());
  }

  public async waitUntilPrintFinishedByPageIndex(pagesToPrint: number, timeoutMs: number = 5_000): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const listener = (evt: PacketReceivedEvent) => {
        if (evt.packet.command === ResponseCommandId.In_PrinterPageIndex) {
          Validators.u8ArrayLengthEquals(evt.packet.data, 2);
          const page = Utils.bytesToI16(evt.packet.data);

          this.client.emit("printprogress", new PrintProgressEvent(page, pagesToPrint, 100, 100));

          clearTimeout(this.statusTimeoutTimer);
          this.statusTimeoutTimer = setTimeout(() => {
            this.client.off("packetreceived", listener);
            reject(new Error("Timeout waiting print status"));
          }, timeoutMs ?? 5_000);

          if (page === pagesToPrint) {
            clearTimeout(this.statusTimeoutTimer);
            this.client.off("packetreceived", listener);
            resolve();
          }
        }
      };

      clearTimeout(this.statusTimeoutTimer);
      this.statusTimeoutTimer = setTimeout(() => {
        this.client.off("packetreceived", listener);
        reject(new Error("Timeout waiting print status"));
      }, timeoutMs);

      this.client.emit("printprogress", new PrintProgressEvent(1, pagesToPrint, 0, 0));
      this.client.on("packetreceived", listener);
    });
  }

  /**
   * Poll printer every {@link pollIntervalMs} and resolve when printer pages equals {@link pagesToPrint}, pagePrintProgress=100, pageFeedProgress=100.
   *
   * printprogress event is firing during this process.
   *
   * @param pagesToPrint Total pages to print.
   * @param pollIntervalMs Poll interval in milliseconds.
   */
  public async waitUntilPrintFinishedByStatusPoll(pagesToPrint: number, pollIntervalMs: number = 300): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.client.emit("printprogress", new PrintProgressEvent(1, pagesToPrint, 0, 0));

      this.statusPollTimer = setInterval(() => {
        this.getPrintStatus()
          .then((status: PrintStatus) => {
            this.client.emit(
              "printprogress",
              new PrintProgressEvent(status.page, pagesToPrint, status.pagePrintProgress, status.pageFeedProgress)
            );

            if (status.page === pagesToPrint && status.pagePrintProgress === 100 && status.pageFeedProgress === 100) {
              clearInterval(this.statusPollTimer);
              resolve();
            }
          })
          .catch((e: unknown) => {
            clearInterval(this.statusPollTimer);
            reject(e as Error);
          });
      }, pollIntervalMs ?? 300);
    });
  }

  /**
   * Poll printer every {@link pollIntervalMs} and resolve when printer pages equals {@link pagesToPrint}.
   *
   * printprogress event is firing during this process.
   *
   * PrintEnd call is not needed after this functions is done running.
   *
   * @param pagesToPrint Total pages to print.
   * @param pollIntervalMs Poll interval in milliseconds.
   */
  public async waitUntilPrintFinishedByPrintEndPoll(pagesToPrint: number, pollIntervalMs: number = 500): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.client.emit("printprogress", new PrintProgressEvent(1, pagesToPrint, 0, 0));

      this.statusPollTimer = setInterval(() => {
        this.printEnd()
          .then((printEndDone: boolean) => {
            if (!printEndDone) {
              this.client.emit("printprogress", new PrintProgressEvent(1, pagesToPrint, 0, 0));
            } else {
              this.client.emit("printprogress", new PrintProgressEvent(pagesToPrint, pagesToPrint, 100, 100));
              clearInterval(this.statusPollTimer);
              resolve();
            }
          })
          .catch((e: unknown) => {
            clearInterval(this.statusPollTimer);
            reject(e as Error);
          });
      }, pollIntervalMs ?? 500);
    });
  }

  /** False returned when printEnd refused */
  public async printEnd(): Promise<boolean> {
    const response = await this.send(PacketGenerator.printEnd());
    Validators.u8ArrayLengthEquals(response.data, 1);
    return response.data[0] === 1;
  }

  /**
   * When 1 or 2 sent to B1, it starts to throw out some, paper (~15cm)
   * @param value success
   */
  public async labelPositioningCalibration(value: number): Promise<boolean> {
    const response = await this.send(PacketGenerator.labelPositioningCalibration(value));
    Validators.u8ArrayLengthEquals(response.data, 1);
    return response.data[0] === 1;
  }

  public async firmwareUpgrade(data: Uint8Array, version: string): Promise<void> {
    const crc = CRC32.buf(data);
    await this.send(PacketGenerator.startFirmwareUpgrade(version));

    await this.client.waitForPacket([ResponseCommandId.In_RequestFirmwareCrc], true, 5_000);

    await this.send(PacketGenerator.sendFirmwareChecksum(crc));

    const chunkSize = 200;
    const totalChunks = Math.floor(data.byteLength / chunkSize);
    console.log("Chunks to send:", totalChunks);

    // Send chunks
    while (true) {
      const p = await this.client.waitForPacket([ResponseCommandId.In_RequestFirmwareChunk], true, 5_000);

      if (!(p instanceof NiimbotCrc32Packet)) {
        throw new Error("Not a firmware packet");
      }

      if (p.chunkNumber * chunkSize >= data.length) {
        console.log("No more chunks");
        break;
      }

      const part = data.slice(p.chunkNumber * chunkSize, p.chunkNumber * chunkSize + chunkSize);

      await this.send(PacketGenerator.sendFirmwareChunk(p.chunkNumber, part));

      this.client.emit("firmwareprogress", new FirmwareProgressEvent(p.chunkNumber, totalChunks));
    }

    await this.send(PacketGenerator.firmwareNoMoreChunks());

    const uploadResult = await this.client.waitForPacket([ResponseCommandId.In_FirmwareCheckResult], true, 5_000);
    Validators.u8ArrayLengthEquals(uploadResult.data, 1);

    if (uploadResult.data[0] !== 1) {
      throw new Error("Firmware check error (maybe CRC does not match)");
    }

    await this.send(PacketGenerator.firmwareCommit());

    const firmwareResult = await this.client.waitForPacket([ResponseCommandId.In_FirmwareResult], true, 5_000);

    Validators.u8ArrayLengthEquals(firmwareResult.data, 1);

    if (firmwareResult.data[0] !== 1) {
      throw new Error("Firmware error");
    }
  }

  public newPrintTask(name: PrintTaskName, options?: Partial<PrintOptions>): AbstractPrintTask {
    return new printTasks[name](this, options);
  }
}
