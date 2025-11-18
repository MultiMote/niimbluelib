import {
  AutoShutdownTime,
  HeartbeatType,
  NiimbotPacket,
  PrinterInfoType,
  RequestCommandId as TX,
  ResponseCommandId as RX,
  SoundSettingsItemType,
  SoundSettingsType,
  commandsMap,
  NiimbotCrc32Packet,
} from ".";
import { EncodedImage, ImageEncoder } from "../image_encoder";
import { Utils } from "../utils";

export interface ImagePacketsGenerateOptions {
  /** Mode for "black pixel count" section of bitmap packet. */
  countsMode?: "auto" | "split" | "total";
  /** Disable PrintBitmapRowIndexed packet. */
  noIndexPacket?: boolean;
  /** Send PrinterCheckLine every 200 line. */
  enableCheckLine?: boolean;
  /** Printer head resolution. Used for "black pixel count" section calculation. */
  printheadPixels?: number;
}

/**
 * A helper class that generates various types of packets.
 * @category Packets
 */
export class PacketGenerator {
  /**
   * Maps a request command ID to its corresponding response IDs and creates a packet object.
   * Sends `0x01` as payload by default.
   */
  public static mapped(sendCmd: TX, data: Uint8Array | number[] = [1]): NiimbotPacket {
    const respIds: RX[] | null = commandsMap[sendCmd];

    if (respIds === null) {
      const p = new NiimbotPacket(sendCmd, data);
      p.oneWay = true;
      return p;
    }

    return new NiimbotPacket(sendCmd, data, respIds);
  }

  public static connect(): NiimbotPacket {
    return this.mapped(TX.Connect);
  }

  public static getPrinterStatusData(): NiimbotPacket {
    return this.mapped(TX.PrinterStatusData);
  }

  public static rfidInfo(): NiimbotPacket {
    return this.mapped(TX.RfidInfo);
  }
  
  public static rfidInfo2(): NiimbotPacket {
    return this.mapped(TX.RfidInfo2);
  }

  public static antiFake(queryType: number): NiimbotPacket {
    return this.mapped(TX.AntiFake, [queryType]);
  }

  public static setAutoShutDownTime(time: AutoShutdownTime): NiimbotPacket {
    return this.mapped(TX.SetAutoShutdownTime, [time]);
  }

  public static getPrinterInfo(type: PrinterInfoType): NiimbotPacket {
    return this.mapped(TX.PrinterInfo, [type]);
  }

  public static setSoundSettings(soundType: SoundSettingsItemType, on: boolean): NiimbotPacket {
    return this.mapped(TX.SoundSettings, [SoundSettingsType.SetSound, soundType, on ? 1 : 0]);
  }

  public static getSoundSettings(soundType: SoundSettingsItemType): NiimbotPacket {
    return this.mapped(TX.SoundSettings, [SoundSettingsType.GetSoundState, soundType, 1]);
  }

  public static heartbeat(type: HeartbeatType): NiimbotPacket {
    return this.mapped(TX.Heartbeat, [type]);
  }

  public static setDensity(value: number): NiimbotPacket {
    return this.mapped(TX.SetDensity, [value]);
  }

  public static setLabelType(value: number): NiimbotPacket {
    return this.mapped(TX.SetLabelType, [value]);
  }

  public static setPageSize2b(rows: number): NiimbotPacket {
    return this.mapped(TX.SetPageSize, [...Utils.u16ToBytes(rows)]);
  }

  /**
   * B1 behavior: strange, first print is blank or printer prints many copies (use {@link setPageSize6b} instead)
   *
   * D110 behavior: ordinary.
   *
   * @param rows Height in pixels
   * @param cols Width in pixels
   */
  public static setPageSize4b(rows: number, cols: number): NiimbotPacket {
    return this.mapped(TX.SetPageSize, [...Utils.u16ToBytes(rows), ...Utils.u16ToBytes(cols)]);
  }

  /**
   * @param rows Height in pixels
   * @param cols Width in pixels
   * @param copiesCount Page instances
   */
  public static setPageSize6b(rows: number, cols: number, copiesCount: number): NiimbotPacket {
    return this.mapped(TX.SetPageSize, [
      ...Utils.u16ToBytes(rows),
      ...Utils.u16ToBytes(cols),
      ...Utils.u16ToBytes(copiesCount),
    ]);
  }

  /** First seen on D110M v4 */
  public static setPageSize13b(
    rows: number,
    cols: number,
    copiesCount: number,
    cutHeight: number = 0,
    cutType: number = 0,
    sendAll: number = 0,
    partHeight: number = 0,
  ): NiimbotPacket {
    return this.mapped(TX.SetPageSize, [
      ...Utils.u16ToBytes(rows),
      ...Utils.u16ToBytes(cols),
      ...Utils.u16ToBytes(copiesCount),
      ...Utils.u16ToBytes(cutHeight),
      cutType,
      0x00,
      sendAll,
      ...Utils.u16ToBytes(partHeight),
    ]);
  }

  public static setPrintQuantity(quantity: number): NiimbotPacket {
    return this.mapped(TX.PrintQuantity, [...Utils.u16ToBytes(quantity)]);
  }

  public static printStatus(): NiimbotPacket {
    return this.mapped(TX.PrintStatus);
  }

  /** Reset printer settings (sound and maybe some other settings). */
  public static printerReset(): NiimbotPacket {
    return this.mapped(TX.PrinterReset);
  }

  /**
   * B1 behavior: after {@link pageEnd} paper stops at printhead position, on {@link printEnd} paper moved further.
   *
   * D110 behavior: ordinary.
   * */
  public static printStart1b(): NiimbotPacket {
    return this.mapped(TX.PrintStart);
  }

  public static printStart2b(totalPages: number): NiimbotPacket {
    return this.mapped(TX.PrintStart, [...Utils.u16ToBytes(totalPages)]);
  }

  /**
   * B1 behavior: when {@link totalPages} > 1 after {@link pageEnd} paper stops at printhead position and waits for next page.
   * When last page ({@link totalPages}) printed paper moved further.
   *
   * D110 behavior: ordinary.
   *
   * @param totalPages Declare how many pages will be printed
   */
  public static printStart7b(totalPages: number, pageColor: number = 0): NiimbotPacket {
    return this.mapped(TX.PrintStart, [...Utils.u16ToBytes(totalPages), 0x00, 0x00, 0x00, 0x00, pageColor]);
  }

  /** First seen on D110M v4 */
  public static printStart9b(totalPages: number, pageColor: number = 0, quality: number = 0, someFlag: boolean = false): NiimbotPacket {
    return this.mapped(TX.PrintStart, [...Utils.u16ToBytes(totalPages), 0x00, 0x00, 0x00, 0x00, pageColor, quality, someFlag ? 0x01 : 0x00]);
  }

  public static printEnd(): NiimbotPacket {
    return this.mapped(TX.PrintEnd);
  }

  public static pageStart(): NiimbotPacket {
    return this.mapped(TX.PageStart);
  }

  public static pageEnd(): NiimbotPacket {
    return this.mapped(TX.PageEnd);
  }

  public static printEmptySpace(pos: number, repeats: number): NiimbotPacket {
    return this.mapped(TX.PrintEmptyRow, [...Utils.u16ToBytes(pos), repeats]);
  }

  public static printBitmapRow(
    pos: number,
    repeats: number,
    data: Uint8Array,
    printheadPixels: number,
    countsMode: "auto" | "split" | "total" = "auto"
  ): NiimbotPacket {
    const counts = Utils.countPixelsForBitmapPacket(data, printheadPixels, countsMode);
    return this.mapped(TX.PrintBitmapRow, [...Utils.u16ToBytes(pos), ...counts.parts, repeats, ...data]);
  }

  /** Printer powers off if black pixel count > 6 */
  // 5555 83 0e 007e 000400 01 0027 0028 0029 002a fa aaaa
  public static printBitmapRowIndexed(
    pos: number,
    repeats: number,
    data: Uint8Array,
    printheadPixels: number,
    countsMode: "auto" | "split" | "total" = "auto"
  ): NiimbotPacket {
    const counts = Utils.countPixelsForBitmapPacket(data, printheadPixels ?? 0, countsMode);
    const indexes: Uint8Array = ImageEncoder.indexPixels(data);

    if (counts.total > 6) {
      throw new Error(`Black pixel count > 6 (${counts.total})`);
    }

    return this.mapped(TX.PrintBitmapRowIndexed, [...Utils.u16ToBytes(pos), ...counts.parts, repeats, ...indexes]);
  }

  public static printClear(): NiimbotPacket {
    return this.mapped(TX.PrintClear);
  }

  public static writeRfid(data: Uint8Array): NiimbotPacket {
    return this.mapped(TX.WriteRFID, data);
  }

  public static checkLine(line: number): NiimbotPacket {
    return this.mapped(TX.PrinterCheckLine, [...Utils.u16ToBytes(line), 0x01]);
  }

  public static writeImageData(image: EncodedImage, options?: ImagePacketsGenerateOptions): NiimbotPacket[] {
    const out: NiimbotPacket[] = [];

    for (const d of image.rowsData) {
      if (d.dataType === "pixels") {
        if (d.blackPixelsCount <= 6 && !options?.noIndexPacket) {
          out.push(
            this.printBitmapRowIndexed(
              d.rowNumber,
              d.repeat,
              d.rowData!,
              options?.printheadPixels ?? 0,
              options?.countsMode ?? "auto"
            )
          );
        } else {
          out.push(
            this.printBitmapRow(
              d.rowNumber,
              d.repeat,
              d.rowData!,
              options?.printheadPixels ?? 0,
              options?.countsMode ?? "auto"
            )
          );
        }
        continue;
      }

      if (d.dataType === "check" && options?.enableCheckLine) {
        out.push(this.checkLine(d.rowNumber));
        continue;
      }

      if (d.dataType === "void") {
        out.push(this.printEmptySpace(d.rowNumber, d.repeat));
      }
    }

    return out;
  }

  public static printTestPage(): NiimbotPacket {
    return this.mapped(TX.PrintTestPage);
  }

  public static labelPositioningCalibration(value: number): NiimbotPacket {
    return this.mapped(TX.LabelPositioningCalibration, [value]);
  }

  public static startFirmwareUpgrade(version: string): NiimbotPacket {
    if (!/^\d+\.\d+$/.test(version)) {
      throw new Error("Invalid version format (x.x expected)");
    }

    const [a, b] = version.split(".").map((p) => parseInt(p));

    return this.mapped(TX.StartFirmwareUpgrade, [a, b]);
  }

  public static sendFirmwareChecksum(crc: number): NiimbotPacket {
    const p = new NiimbotCrc32Packet(TX.FirmwareCrc, 0, [...Utils.u32ToBytes(crc)]);
    p.oneWay = true;
    return p;
  }

  public static sendFirmwareChunk(idx: number, data: Uint8Array): NiimbotPacket {
    const p = new NiimbotCrc32Packet(TX.FirmwareChunk, idx, data);
    p.oneWay = true;
    return p;
  }

  public static firmwareNoMoreChunks(): NiimbotPacket {
    const p = new NiimbotCrc32Packet(TX.FirmwareNoMoreChunks, 0, [1]);
    p.oneWay = true;
    return p;
  }

  public static firmwareCommit(): NiimbotPacket {
    const p = new NiimbotCrc32Packet(TX.FirmwareCommit, 0, [1]);
    p.oneWay = true;
    return p;
  }
}
