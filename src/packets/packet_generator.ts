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
} from ".";
import { EncodedImage, ImageEncoder, ImageRow } from "../image_encoder";
import { Utils } from "../utils";

/**
 * A helper class that generates various types of packets.
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

  public static setPageSizeV1(rows: number): NiimbotPacket {
    return this.mapped(TX.SetPageSize, [...Utils.u16ToBytes(rows)]);
  }

  /**
   * B1 behavior: strange, first print is blank or printer prints many copies (use {@link setPageSizeV3} instead)
   *
   * D110 behavior: ordinary.
   *
   * @param rows Height in pixels
   * @param cols Width in pixels
   */
  public static setPageSizeV2(rows: number, cols: number): NiimbotPacket {
    return this.mapped(TX.SetPageSize, [...Utils.u16ToBytes(rows), ...Utils.u16ToBytes(cols)]);
  }

  /**
   * @param rows Height in pixels
   * @param cols Width in pixels
   * @param copiesCount Page instances
   */
  public static setPageSizeV3(rows: number, cols: number, copiesCount: number): NiimbotPacket {
    return this.mapped(TX.SetPageSize, [
      ...Utils.u16ToBytes(rows),
      ...Utils.u16ToBytes(cols),
      ...Utils.u16ToBytes(copiesCount),
    ]);
  }

  /** Meaning of two last args is unknown */
  public static setPageSizeV4(
    rows: number,
    cols: number,
    copiesCount: number,
    someSize: number,
    isDivide: boolean
  ): NiimbotPacket {
    return this.mapped(TX.SetPageSize, [
      ...Utils.u16ToBytes(rows),
      ...Utils.u16ToBytes(cols),
      ...Utils.u16ToBytes(copiesCount),
      ...Utils.u16ToBytes(someSize),
      isDivide ? 1 : 0,
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
  public static printStart(): NiimbotPacket {
    return this.mapped(TX.PrintStart);
  }

  public static printStartV3(totalPages: number): NiimbotPacket {
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
  public static printStartV4(totalPages: number, pageColor: number = 0): NiimbotPacket {
    return this.mapped(TX.PrintStart, [...Utils.u16ToBytes(totalPages), 0x00, 0x00, 0x00, 0x00, pageColor]);
  }

  public static printStartV5(totalPages: number, pageColor: number = 0, quality: number = 0): NiimbotPacket {
    return this.mapped(TX.PrintStart, [...Utils.u16ToBytes(totalPages), 0x00, 0x00, 0x00, 0x00, pageColor, quality]);
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

  public static printBitmapRow(pos: number, repeats: number, data: Uint8Array, printheadPixels?: number): NiimbotPacket {
    const { total, a, b, c } = Utils.countPixelsForBitmapPacket(data, printheadPixels ?? 0);
    // Black pixel count. Not sure what role it plays in printing.
    // There is two formats of this part
    // 1. <count> <count> <count> (sum must equals number of pixels, every number calculated by algorithm based on printhead resolution)
    // 2. <0> <countH> <countL> (big endian)
    let header: number[] = [0, ...Utils.u16ToBytes(total)];

    if (printheadPixels !== undefined) {
      header = [a, b, c];
    }

    return this.mapped(TX.PrintBitmapRow, [...Utils.u16ToBytes(pos), ...header, repeats, ...data]);
  }

  /** Printer powers off if black pixel count > 6 */
  // 5555 83 0e 007e 000400 01 0027 0028 0029 002a fa aaaa
  public static printBitmapRowIndexed(
    pos: number,
    repeats: number,
    data: Uint8Array,
    printheadPixels?: number
  ): NiimbotPacket {
    const { total, a, b, c } = Utils.countPixelsForBitmapPacket(data, printheadPixels ?? 0);
    const indexes: Uint8Array = ImageEncoder.indexPixels(data);

    if (total > 6) {
      throw new Error(`Black pixel count > 6 (${total})`);
    }

    let header: number[] = [0, ...Utils.u16ToBytes(total)];

    if (printheadPixels !== undefined) {
      header = [a, b, c];
    }

    return this.mapped(TX.PrintBitmapRowIndexed, [...Utils.u16ToBytes(pos), ...header, repeats, ...indexes]);
  }

  public static printClear(): NiimbotPacket {
    return this.mapped(TX.PrintClear);
  }

  public static writeRfid(data: Uint8Array): NiimbotPacket {
    return this.mapped(TX.WriteRFID, data);
  }

  public static writeImageData(image: EncodedImage, printheadPixels?: number): NiimbotPacket[] {
    return image.rowsData.map((p: ImageRow) => {
      if (p.dataType === "pixels") {
        if (p.blackPixelsCount > 6) {
          return this.printBitmapRow(p.rowNumber, p.repeat, p.rowData!, printheadPixels);
        } else {
          return this.printBitmapRowIndexed(p.rowNumber, p.repeat, p.rowData!, printheadPixels);
        }
      } else {
        return this.printEmptySpace(p.rowNumber, p.repeat);
      }
    });
  }

  public static printTestPage(): NiimbotPacket {
    return this.mapped(TX.PrintTestPage);
  }

  public static labelPositioningCalibration(value: number): NiimbotPacket {
    return this.mapped(TX.LabelPositioningCalibration, [value]);
  }
}
