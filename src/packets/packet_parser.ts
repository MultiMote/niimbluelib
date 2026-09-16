import {
  ConnectResult,
  firmwareExchangePackets,
  HeartbeatData,
  HeartbeatPrinterInfoData,
  LabelType,
  NiimbotCrc32Packet,
  NiimbotPacket,
  PaperInfo,
  PrinterCapabilities,
  PrinterCapabilitiesField as CapId,
  PrinterStatusData,
  PrintStatus,
  ResolutionClass,
  RfidInfo,
  SequentialDataReader,
} from ".";
import { Utils, Validators } from "../utils";

/**
 * Packet parsers.
 *
 * @category Packets
 **/
export class PacketParser {
  /**
   * Parse raw data containing one or more packets.
   *
   * For example, `55554a01044faaaa5555f60101f6aaaa` will be converted to the two NiimbotPackets.
   *
   * @param buf bytes
   * @returns list of packet objects
   */
  public static parsePacketBundle(buf: Uint8Array): NiimbotPacket[] {
    type PacketClass = typeof NiimbotPacket | typeof NiimbotCrc32Packet;
    type ChunkType = { cls: typeof NiimbotPacket | typeof NiimbotCrc32Packet; raw: Uint8Array };
    const chunks: ChunkType[] = [];
    const bufLength: number = buf.byteLength;

    while (buf.byteLength > 0) {
      if (!Utils.hasSubarrayAtPos(buf, NiimbotPacket.HEAD, 0)) {
        break;
      }

      if (buf.byteLength < 3) {
        break;
      }

      const cmd: number = buf[2];
      let cls: PacketClass = NiimbotPacket;

      let sizePos: number = 3;
      let crcSize: number = 1;
      //  0  1  2  3  4  5  6  7
      // -----------------------
      // 55 55 4a 01 04 4f aa aa
      //           |     |
      //          size  crc

      if (firmwareExchangePackets.rx.includes(cmd) || firmwareExchangePackets.tx.includes(cmd)) {
        cls = NiimbotCrc32Packet;
        sizePos = 5;
        crcSize = 4;
        //  0  1  2  3  4  5  6  7  8  9 10 11 12
        // --------------------------------------
        // 55 55 9a 00 80 01 01 d2 bd d2 fb aa aa
        //                 |    |---------|
        //                size      crc
      }

      if (buf.byteLength <= sizePos) {
        break;
      }

      const size: number = buf[sizePos];

      if (buf.byteLength <= sizePos + size + crcSize + NiimbotPacket.TAIL.byteLength) {
        break;
      }

      const tailPos: number = sizePos + size + crcSize + 1;

      if (!Utils.hasSubarrayAtPos(buf, NiimbotPacket.TAIL, tailPos)) {
        console.warn("Invalid tail");
        break;
      }

      const tailEnd: number = tailPos + NiimbotPacket.TAIL.byteLength;

      chunks.push({ cls, raw: buf.slice(0, tailEnd) });

      // Cut from start
      buf = buf.slice(tailEnd);
    }

    const chunksDataLen: number = chunks.reduce((acc: number, c: ChunkType) => acc + c.raw.length, 0);

    if (bufLength !== chunksDataLen) {
      throw new Error(`Splitted chunks data length not equals buffer length (${bufLength} !== ${chunksDataLen})`);
    }

    return chunks.map((c) => c.cls.fromBytes(c.raw));
  }

  public static parsePrintStatusResponse(packet: NiimbotPacket): PrintStatus {
    Validators.arrayLengthAtLeast(packet.data, 4); // can be 8, 10, but ignore it for now

    const r = new SequentialDataReader(packet.data);
    const page = r.readI16();
    const pagePrintProgress = r.readI8();
    const pageFeedProgress = r.readI8();
    let error: number = 0;

    if (packet.dataLength === 10) {
      r.skip(2);
      error = r.readI8();
    }

    return { page, pagePrintProgress, pageFeedProgress, error };
  }

  public static parseConnectResponse(packet: NiimbotPacket): ConnectResult {
    Validators.arrayLengthAtLeast(packet.data, 1);
    return packet.data[0] as ConnectResult;
  }

  public static parsePrinterStatusDataResponse(packet: NiimbotPacket): PrinterStatusData {
    const result: PrinterStatusData = {
      protocolVersion: 0,
      supportColor: false,
    };

    if (packet.dataLength >= 13) {
      result.supportColor = packet.data[10] > 0;

      const n = packet.data[11] * 100 + packet.data[12];

      if (n >= 204 && n < 300) {
        result.protocolVersion = 3;
      } else if (n >= 300 && n < 302) {
        result.protocolVersion = 4;
      } else if (n >= 302) {
        result.protocolVersion = 5;
      }
    }

    return result;
  }

  public static parsePrinterInfoModelIdResponse(packet: NiimbotPacket): number {
    Validators.arrayLengthAtLeast(packet.data, 1);

    if (packet.data.length === 1) {
      return packet.data[0] << 8;
    }

    Validators.arrayLengthEquals(packet.data, 2);
    return Utils.bytesToI16(packet.data);
  }

  public static parseRfidInfoResponse(packet: NiimbotPacket): RfidInfo {
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

    if (r.canRead(2)) {
      info.capacity = r.readI16();
    }

    if (r.canRead(8)) {
      info.uuid2 = Utils.bufToHex(r.readBytes(8), "");
    }

    r.end();

    return info;
  }

  public static parseHeartbeatPrinterInfoResponse(packet: NiimbotPacket): HeartbeatPrinterInfoData {
    Validators.arrayLengthEquals(packet.data, 10);

    const r = new SequentialDataReader(packet.data);

    const [hwH, hwL] = r.readBytes(2);
    const [fwH, fwL] = r.readBytes(2);

    const info: HeartbeatPrinterInfoData = {
      softwareVersion: (fwL / 100 + fwH).toFixed(2),
      hardwareVersion: (hwL / 100 + hwH).toFixed(2),
      printheadWidth: r.readI16(),
      resolutionClass: r.readI8() as ResolutionClass,
      printheadAlignment: r.readI8(),
      supportsRFID: r.readBool(),
      supportsWriteRFID: r.readBool(),
    };

    r.end();

    return info;
  }

  public static parseHeartbeatAdvanced1Response(packet: NiimbotPacket, modelId?: number): HeartbeatData {
    const len = packet.dataLength;
    const r = new SequentialDataReader(packet.data);
    const info: HeartbeatData = {};

    // originally expected packet length is bound to model id, but we make it more robust and simple
    if (len === 10) {
      // d110
      r.skip(8);
      info.lidClosed = r.readI8() === 0;
      info.batteryPercents = r.readI8();
    } else if (len === 13) {
      // b1
      r.skip(9);
      info.lidClosed = r.readI8() === 0;
      info.batteryPercents = r.readI8();
      info.paperInserted = r.readI8() === 0;
      info.paperRfidSuccess = r.readI8() !== 0;
    } else if (len === 19) {
      r.skip(15);
      info.lidClosed = r.readI8() === 0;
      info.batteryPercents = r.readI8();
      info.paperInserted = r.readI8() === 0;
      info.paperRfidSuccess = r.readI8() !== 0;
    } else if (len === 20) {
      r.skip(18);
      info.paperInserted = r.readI8() === 0;
      info.paperRfidSuccess = r.readI8() !== 0;
    } else {
      throw new Error("Invalid heartbeat length");
    }
    r.end();

    const invertedLidModels = [512, 514, 513, 2304, 1792, 3584, 5120, 2560, 3840, 4352, 272, 273, 274];

    if (modelId !== undefined && invertedLidModels.includes(modelId)) {
      info.lidClosed = !info.lidClosed;
    }

    if (info.batteryPercents !== undefined && info.batteryPercents <= 4) {
      info.batteryPercents *= 25;
    }

    return info;
  }

  public static parseHeartbeatAdvanced2Response(packet: NiimbotPacket): Partial<HeartbeatData> {
    const r = new SequentialDataReader(packet.data);
    const info: HeartbeatData = {};

    Validators.arrayLengthAtLeast(packet.data, 9);
    r.skip(2);
    info.batteryPercents = r.readI8();
    info.temp = r.readI8();
    info.lidClosed = r.readI8() === 0;
    info.paperInserted = r.readI8() === 0;
    info.paperRfidSuccess = r.readI8() !== 0;
    info.ribbonRfidSuccess = r.readI8() !== 0;
    info.ribbonInserted = r.readI8() === 0;

    if (r.canRead(2)) {
      info.wifiRssi = r.readI16();
    }

    if (r.canRead(2)) {
      r.skip(1);
      info.lightingErrorCode = r.readI8();
    }

    if (r.canRead(1)) {
      info.voltageState = r.readI8();
    }

    r.end();

    if (info.batteryPercents <= 4) {
      info.batteryPercents *= 25;
    }

    return info;
  }

  public static parsePrinterVersionResponse(packet: NiimbotPacket): string {
    Validators.arrayLengthEquals(packet.data, 2);

    // todo: find how to determine format

    const v1 = packet.data[1] / 100 + packet.data[0];
    const v2 = (packet.data[0] * 256 + packet.data[1]) / 100.0;

    return `0x${Utils.bufToHex(packet.data, "")} (${v1.toFixed(2)} or ${v2.toFixed(2)})`;
  }

  public static parsePrinterSerialNumberResponse(packet: NiimbotPacket): string {
    Validators.arrayLengthAtLeast(packet.data, 1);

    if (packet.data.length < 4) {
      return "-1";
    }

    if (packet.data.length >= 8) {
      return Utils.u8ArrayToString(packet.data);
    }

    return Utils.bufToHex(packet.data.slice(0, 4), "").toUpperCase();
  }

  public static parsePrinterBluetoothMacAddressResponse(packet: NiimbotPacket): string {
    Validators.arrayLengthAtLeast(packet.data, 1);
    return Utils.bufToHex(packet.data.reverse(), ":");
  }

  public static parseIsSoundEnabledResponse(packet: NiimbotPacket): boolean {
    Validators.arrayLengthEquals(packet.data, 3);
    return !!packet.data[2];
  }

  public static parseBatteryChargeLevelResponse(packet: NiimbotPacket): number {
    Validators.arrayLengthEquals(packet.data, 1);
    const value = packet.data[0];
    return value <= 4 ? value * 25 : value;
  }

  public static parseAutoShutdownTimeResponse(packet: NiimbotPacket): number {
    Validators.arrayLengthEquals(packet.data, 1);
    return packet.data[0];
  }

  public static parseLabelTypeResponse(packet: NiimbotPacket): LabelType {
    Validators.arrayLengthEquals(packet.data, 1);
    return packet.data[0] as LabelType;
  }

  public static parseBooleanResponse(packet: NiimbotPacket): boolean {
    Validators.arrayLengthEquals(packet.data, 1);
    return packet.data[0] === 1;
  }

  public static parseFirmwareCheckResultResponse(packet: NiimbotPacket): boolean {
    Validators.arrayLengthEquals(packet.data, 1);
    return packet.data[0] === 1;
  }

  public static parseFirmwareResultResponse(packet: NiimbotPacket): boolean {
    Validators.arrayLengthEquals(packet.data, 1);
    return packet.data[0] === 1;
  }

  public static parsePaperInfoResponse(packet: NiimbotPacket): PaperInfo {
    Validators.arrayLengthAtLeast(packet.data, 4);

    const info: PaperInfo = {
      valid: false,
    };

    // dataLength can be 4 bytes, but it return some unknown sizes

    if (packet.dataLength === 18) {
      info.valid = true;

      const r = new SequentialDataReader(packet.data);
      info.gapHeightPixel = r.readI16();
      info.totalHeightPixel = r.readI16();
      info.paperType = r.readI8() as LabelType;
      info.gapHeight = r.readI16() / 10;
      info.totalHeight = r.readI16() / 10;
      info.paperWidthPixel = r.readI16();
      info.paperWidth = r.readI16() / 10;
      info.direction = r.readI8();
      info.tailLengthPixel = r.readI16();
      info.tailLength = r.readI16() / 10;
      r.end();

      info.paperHeight = info.totalHeight - info.gapHeight;
      info.paperHeightPixel = info.totalHeightPixel - info.gapHeightPixel;
    }

    return info;
  }

  static parsePrinterCapabilities(pkt: NiimbotPacket): PrinterCapabilities {
    const data: PrinterCapabilities = {};
    const reader = new SequentialDataReader(pkt.data);

    while (reader.canRead(2)) {
      const type = reader.readI8();
      const length = reader.readI8();

      if (!reader.canRead(length)) {
        break;
      }

      const val = reader.readBytes(length);

      switch (type) {
        case CapId.Language:
          data.language = val[0];
          break;
        case CapId.PrintMode:
          data.printMode = val[0];
          break;
        case CapId.UhfRfid:
          data.uhfRfid = val[0];
          break;
        case CapId.PrintheadDpi:
          data.printheadDpi = Utils.bytesToI16(val);
          break;
        case CapId.RfidSupport:
          data.rfidSupport = val[0];
          break;
        case CapId.BatteryRange:
          data.batteryRange = { max: val[0], min: val[1] };
          break;
        case CapId.DensityRange:
          data.densityRange = { max: val[0], min: val[1] };
          break;
        case CapId.SpeedRange:
          data.speedRange = { max: val[0], min: val[1] };
          break;
        case CapId.SupportedLabelTypes:
          data.supportedLabelTypes = Utils.bytesToI32(val);
          break;
        case CapId.PrintheadWidth:
          data.printheadWidth = Utils.bytesToI16(val);
          break;
        case CapId.MaxPrintHeight:
          data.maxPrintHeight = Utils.bytesToI16(val);
          break;
        case CapId.LabelHeightAndGap:
          data.labelHeightAndGap = val[0];
          break;
        case CapId.PrintheadPosition:
          data.printheadPosition = val[0];
          break;
        case CapId.VolumeSupport:
          data.volumeSupport = val[0];
          break;
        case CapId.HostStyle:
          data.hostStyle = val[0];
          break;
        case CapId.PrintProtocol:
          data.printProtocol = val[0];
          break;
        case CapId.AutoShutdownRange:
          data.autoShutdownRange = { max: val[0], min: val[1] };
          break;
        case CapId.CutterSupport:
          data.cutterSupport = val[0];
          break;
        case CapId.CutterDepthRange:
          data.cutterDepthRange = { max: val[0], min: val[1] };
          break;
        case CapId.PrintControl:
          data.printControl = val[0];
          break;
        case CapId.PauseTimeSupport:
          data.pauseTimeSupport = val[0];
          break;
        case CapId.PaperDetection:
          data.paperDetection = val[0];
          break;
        case CapId.RealTimeClock:
          data.realTimeClock = val[0];
          break;
        case CapId.KeyFunctions: {
          data.keyFunctions = new Map<number, number>();
          for (let i = 0; i < val.length; i += 5) {
            const keyId = val[i];
            const keyVal = Utils.bytesToI32(val.subarray(i + 1, i + 5));
            data.keyFunctions.set(keyId, keyVal);
          }
          break;
        }
        case CapId.Unknown19:
          data.unknown19 = val[0];
          break;
        case CapId.PrintColor:
          data.printColor = val[0];
          break;
        case CapId.SpeedQualityMode:
          data.speedQualityMode = val[0];
          break;
        case CapId.TubeCalibration:
          data.tubeCalibration = val[0];
          break;
        case CapId.PartialRetransmitSupport:
          data.partialRetransmitSupport = val[0];
          break;
        case CapId.MaxCompressLines:
          data.maxCompressLines = Utils.bytesToI16(val);
          break;
        case CapId.TubeSupport:
          data.tubeSupport = val[0];
          break;
        case CapId.SixteenGrayMaxBuffer:
          data.sixteenGrayMaxBuffer = Utils.bytesToI16(val);
          break;
        case CapId.LocalTemplateSupport:
          data.localTemplateSupport = val[0];
          break;
        case CapId.ImageCompressSupport:
          data.imageCompressSupport = val[0];
          break;
        case CapId.MaxImageCompressBytes:
          data.maxImageCompressBytes = Utils.bytesToI32(val);
          break;
        case CapId.LocalTemplateMaxTimeCount:
          data.localTemplateMaxTimeCount = val[0];
          break;
      }
    }

    return data;
  }
}
