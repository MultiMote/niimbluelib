import {
  AutoShutdownTime,
  BatteryChargeLevel,
  ConnectResult,
  HeartbeatType,
  LabelType,
  PacketParser,
  PrinterInfoType,
  ResponseCommandId,
  SoundSettingsItemType,
} from ".";
import { NiimbotAbstractClient } from "../client";
import { FirmwareProgressEvent, PacketReceivedEvent, PrintProgressEvent } from "../events";
import { PrintTaskName, printTasks } from "../print_tasks";
import { AbstractPrintTask, PrintOptions } from "../print_tasks/AbstractPrintTask";
import { Validators, Utils } from "../utils";
import { HeartbeatData, HeartbeatPrinterInfoData, PrintError, PrinterStatusData, PrintStatus, RfidInfo } from "./dto";
import { NiimbotCrc32Packet, NiimbotPacket } from "./packet";
import { PacketGenerator } from "./packet_generator";
import CRC32 from "crc-32";

/**
 * Packet sender and parser.
 *
 * @category Packets
 */
export class NiimbotProtocol {
  private readonly DEFAULT_PACKET_TIMEOUT: number = 1_000;
  private readonly client: NiimbotAbstractClient;
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

  public newPrintTask(name: PrintTaskName, options?: Partial<PrintOptions>): AbstractPrintTask {
    return new printTasks[name](this, options);
  }

  /** Send packet and wait for response */
  public async send(packet: NiimbotPacket, forceTimeout?: number): Promise<NiimbotPacket> {
    return this.client.sendPacketWaitResponse(packet, forceTimeout ?? this.packetTimeout);
  }

  /** Send packet, wait for response, repeat if failed */
  public async sendRepeatUntilSuccess(
    packet: NiimbotPacket,
    attempts: number,
    forceTimeout?: number,
  ): Promise<NiimbotPacket> {
    let lastError: Error = new Error("Unknown error");

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await this.client.sendPacketWaitResponse(packet, forceTimeout ?? this.packetTimeout);
      } catch (e) {
        console.warn(`Attempt ${attempt + 1} failed:`, e);
        lastError = e as Error;
      }
    }

    throw lastError;
  }

  public async sendAll(packets: NiimbotPacket[], forceTimeout?: number): Promise<void> {
    for (const p of packets) {
      await this.send(p, forceTimeout);
    }
  }

  public cancelStatusPoll() {
    if (this.statusPollTimer) {
      clearInterval(this.statusPollTimer);
      this.statusPollTimer = undefined;
    }
  }

  public async waitUntilPrintFinishedByPageIndex(pagesToPrint: number, timeoutMs: number = 5_000): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const listener = (evt: PacketReceivedEvent) => {
        if (evt.packet.command === ResponseCommandId.In_PrinterPageIndex) {
          Validators.arrayLengthEquals(evt.packet.data, 2);
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
        this.getPrintStatus(2)
          .then((status: PrintStatus) => {
            this.client.emit(
              "printprogress",
              new PrintProgressEvent(status.page, pagesToPrint, status.pagePrintProgress, status.pageFeedProgress),
            );

            if (status.page === pagesToPrint) {
              this.cancelStatusPoll();
              resolve();
            }
          })
          .catch((e: unknown) => {
            this.cancelStatusPoll();
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
              this.cancelStatusPoll();
              resolve();
            }
          })
          .catch((e: unknown) => {
            this.cancelStatusPoll();
            reject(e as Error);
          });
      }, pollIntervalMs ?? 500);
    });
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
      const p = await this.client.waitForPacket(
        [ResponseCommandId.In_RequestFirmwareChunk, ResponseCommandId.In_FirmwareResult],
        true,
        5_000,
      );

      if (p.command === ResponseCommandId.In_FirmwareResult) {
        //fixme
        throw new Error("Unexpected firmware result");
      }

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

    if (!PacketParser.parseFirmwareCheckResultResponse(uploadResult)) {
      throw new Error("Firmware check error (maybe CRC does not match)");
    }

    await this.send(PacketGenerator.firmwareCommit());

    const firmwareResult = await this.client.waitForPacket([ResponseCommandId.In_FirmwareResult], true, 5_000);

    if (!PacketParser.parseFirmwareResultResponse(firmwareResult)) {
      throw new Error("Firmware error");
    }
  }

  public async getPrintStatus(tries: number = 1): Promise<PrintStatus> {
    const packet = await this.sendRepeatUntilSuccess(PacketGenerator.printStatus(), tries ?? 1);
    const status = PacketParser.parsePrintStatusResponse(packet);

    if (status.error !== 0) {
      throw new PrintError(`Print error ${status.error} (${ResponseCommandId[packet.command]} packet flag)`, status.error);
    }

    return status;
  }

  public async connectResult(): Promise<ConnectResult> {
    const packet = await this.send(PacketGenerator.connect());
    return PacketParser.parseConnectResponse(packet);
  }

  public async getPrinterStatusData(): Promise<PrinterStatusData> {
    const packet = await this.send(PacketGenerator.getPrinterStatusData());
    return PacketParser.parsePrinterStatusDataResponse(packet);
  }

  public async getPrinterModel(): Promise<number> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.PrinterModelId));
    return PacketParser.parsePrinterInfoModelIdResponse(packet);
  }

  /** Read paper nfc tag info */
  public async rfidInfo(): Promise<RfidInfo> {
    const packet = await this.send(PacketGenerator.rfidInfo());
    return PacketParser.parseRfidInfoResponse(packet);
  }

  /** Read ribbon nfc tag info */
  public async rfidInfo2(): Promise<RfidInfo> {
    const packet = await this.send(PacketGenerator.rfidInfo2());
    return PacketParser.parseRfidInfoResponse(packet);
  }

  public async heartbeatPrinterInfo(): Promise<HeartbeatPrinterInfoData> {
    const packet = await this.send(PacketGenerator.heartbeat(HeartbeatType.PrinterInfo));
    return PacketParser.parseHeartbeatPrinterInfoResponse(packet);
  }

  public async heartbeat(): Promise<HeartbeatData> {
    const printerInfo = this.client.getPrinterInfo();
    let heartbeatType = HeartbeatType.Advanced1;
    if (printerInfo.protocolVersion !== undefined && printerInfo.protocolVersion >= 3) {
      heartbeatType = HeartbeatType.Advanced2;
    }

    const packet = await this.send(PacketGenerator.heartbeat(heartbeatType), 500);

    if (packet.command === ResponseCommandId.In_HeartbeatAdvanced1) {
      const printerInfo = this.client.getPrinterInfo();
      return PacketParser.parseHeartbeatAdvanced1Response(packet, printerInfo.modelId);
    }

    if (packet.command === ResponseCommandId.In_HeartbeatAdvanced2) {
      return PacketParser.parseHeartbeatAdvanced2Response(packet);
    }

    throw new Error("Unsupported heartbeat response");
  }

  public async getBatteryChargeLevel(): Promise<BatteryChargeLevel> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.BatteryChargeLevel));
    return PacketParser.parseBatteryChargeLevelResponse(packet) as BatteryChargeLevel;
  }

  public async getAutoShutDownTime(): Promise<AutoShutdownTime> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.AutoShutdownTime));
    return PacketParser.parseAutoShutdownTimeResponse(packet) as AutoShutdownTime;
  }

  public async getSoftwareVersion(): Promise<string> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.SoftWareVersion));
    return PacketParser.parsePrinterVersionResponse(packet);
  }

  public async getHardwareVersion(): Promise<string> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.HardWareVersion));
    return PacketParser.parsePrinterVersionResponse(packet);
  }

  public async setAutoShutDownTime(time: AutoShutdownTime): Promise<void> {
    await this.send(PacketGenerator.setAutoShutDownTime(time));
  }

  public async getLabelType(): Promise<LabelType> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.LabelType));
    return PacketParser.parseLabelTypeResponse(packet);
  }

  public async getPrinterSerialNumber(): Promise<string> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.SerialNumber));
    return PacketParser.parsePrinterSerialNumberResponse(packet);
  }

  public async getPrinterBluetoothMacAddress(): Promise<string> {
    const packet = await this.send(PacketGenerator.getPrinterInfo(PrinterInfoType.BluetoothAddress));
    return PacketParser.parsePrinterBluetoothMacAddressResponse(packet);
  }

  public async isSoundEnabled(soundType: SoundSettingsItemType): Promise<boolean> {
    const packet = await this.send(PacketGenerator.getSoundSettings(soundType));
    return PacketParser.parseIsSoundEnabledResponse(packet);
  }

  public async setSoundEnabled(soundType: SoundSettingsItemType, value: boolean): Promise<void> {
    await this.send(PacketGenerator.setSoundSettings(soundType, value));
  }

  /** Clear settings */
  public async printerReset(): Promise<void> {
    await this.send(PacketGenerator.printerReset());
  }

  /** False returned when pageStart refused */
  public async pageStart(): Promise<boolean> {
    const response = await this.send(PacketGenerator.pageStart());
    return PacketParser.parseBooleanResponse(response);
  }

  /** False returned when pageEnd refused */
  public async pageEnd(): Promise<boolean> {
    const response = await this.send(PacketGenerator.pageEnd());
    return PacketParser.parseBooleanResponse(response);
  }

  /** False returned when printEnd refused */
  public async printEnd(): Promise<boolean> {
    this.cancelStatusPoll();
    const response = await this.send(PacketGenerator.printEnd());
    return PacketParser.parseBooleanResponse(response);
  }

  /**
   * When 1 or 2 sent to B1, it starts to throw out some, paper (~15cm)
   * @param value success
   */
  public async labelPositioningCalibration(value: number): Promise<boolean> {
    const response = await this.send(PacketGenerator.labelPositioningCalibration(value));
    return PacketParser.parseBooleanResponse(response);
  }

  public async setPrinterTime(value: Date = new Date()): Promise<void> {
    await this.send(PacketGenerator.setPrinterTime(value));
  }
}
