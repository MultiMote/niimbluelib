import {
  AutoShutdownTime,
  HeartbeatType,
  LabelType,
  NiimbotPacket,
  PrinterInfoType,
  RequestCommandId,
  ResponseCommandId,
  SoundSettingsItemType,
  SoundSettingsType,
} from ".";
import { EncodedImage, ImageEncoder, ImageRow } from "../image_encoder";
import { PrintTaskVersion } from "../print_task_versions";
import { Utils } from "../utils";

export type PrintOptions = {
  labelType?: LabelType;
  density?: number;
  quantity?: number;
};

export class PacketGenerator {
  public static generic(
    requestId: RequestCommandId,
    data: Uint8Array | number[],
    responseIds: ResponseCommandId[] = []
  ): NiimbotPacket {
    return new NiimbotPacket(requestId, data, responseIds);
  }

  public static connect(): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.Connect, [1], [ResponseCommandId.In_Connect]);
  }

  public static getPrinterStatusData(): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.PrinterStatusData, [1], [ResponseCommandId.In_PrinterStatusData]);
  }

  public static rfidInfo(): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.RfidInfo, [1], [ResponseCommandId.In_RfidInfo]);
  }

  public static setAutoShutDownTime(time: AutoShutdownTime): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.SetAutoShutdownTime, [time], [ResponseCommandId.In_SetAutoShutdownTime]);
  }

  public static getPrinterInfo(type: PrinterInfoType): NiimbotPacket {
    return new NiimbotPacket(
      RequestCommandId.PrinterInfo,
      [type],
      [
        ResponseCommandId.In_PrinterInfoArea,
        ResponseCommandId.In_PrinterInfoAutoShutDownTime,
        ResponseCommandId.In_PrinterInfoBluetoothAddress,
        ResponseCommandId.In_PrinterInfoChargeLevel,
        ResponseCommandId.In_PrinterInfoDensity,
        ResponseCommandId.In_PrinterInfoHardWareVersion,
        ResponseCommandId.In_PrinterInfoLabelType,
        ResponseCommandId.In_PrinterInfoLanguage,
        ResponseCommandId.In_PrinterInfoPrinterCode,
        ResponseCommandId.In_PrinterInfoSerialNumber,
        ResponseCommandId.In_PrinterInfoSoftWareVersion,
        ResponseCommandId.In_PrinterInfoSpeed,
      ]
    );
  }

  public static setSoundSettings(soundType: SoundSettingsItemType, on: boolean): NiimbotPacket {
    return new NiimbotPacket(
      RequestCommandId.SoundSettings,
      [SoundSettingsType.SetSound, soundType, on ? 1 : 0],
      [ResponseCommandId.In_SoundSettings]
    );
  }

  public static getSoundSettings(soundType: SoundSettingsItemType): NiimbotPacket {
    return new NiimbotPacket(
      RequestCommandId.SoundSettings,
      [SoundSettingsType.GetSoundState, soundType, 1],
      [ResponseCommandId.In_SoundSettings]
    );
  }

  public static heartbeat(type: HeartbeatType): NiimbotPacket {
    return new NiimbotPacket(
      RequestCommandId.Heartbeat,
      [type],
      [
        ResponseCommandId.In_HeartbeatBasic,
        ResponseCommandId.In_HeartbeatUnknown,
        ResponseCommandId.In_HeartbeatAdvanced1,
        ResponseCommandId.In_HeartbeatAdvanced2,
      ]
    );
  }

  public static setDensity(value: number): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.SetDensity, [value], [ResponseCommandId.In_SetDensity]);
  }

  public static setLabelType(value: number): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.SetLabelType, [value], [ResponseCommandId.In_SetLabelType]);
  }

  public static setPageSizeV1(rows: number): NiimbotPacket {
    return new NiimbotPacket(
      RequestCommandId.SetPageSize,
      [...Utils.u16ToBytes(rows)],
      [ResponseCommandId.In_SetPageSize]
    );
  }

  /**
   * B1 behavior: strange, first print is blank or printer prints many copies (use {@link setPageSizeV2} instead)
   *
   * D110 behavior: ordinary.
   *
   * @param rows Height in pixels
   * @param cols Width in pixels
   */
  public static setPageSizeV2(rows: number, cols: number): NiimbotPacket {
    return new NiimbotPacket(
      RequestCommandId.SetPageSize,
      [...Utils.u16ToBytes(rows), ...Utils.u16ToBytes(cols)],
      [ResponseCommandId.In_SetPageSize]
    );
  }

  /**
   * @param rows Height in pixels
   * @param cols Width in pixels
   * @param copiesCount Page instances
   */
  public static setPageSizeV3(rows: number, cols: number, copiesCount: number): NiimbotPacket {
    return new NiimbotPacket(
      RequestCommandId.SetPageSize,
      [...Utils.u16ToBytes(rows), ...Utils.u16ToBytes(cols), ...Utils.u16ToBytes(copiesCount)],
      [ResponseCommandId.In_SetPageSize]
    );
  }

  /** Meaning of two last args is unknown */
  public static setPageSizeV4(
    rows: number,
    cols: number,
    copiesCount: number,
    someSize: number,
    isDivide: boolean
  ): NiimbotPacket {
    return new NiimbotPacket(
      RequestCommandId.SetPageSize,
      [
        ...Utils.u16ToBytes(rows),
        ...Utils.u16ToBytes(cols),
        ...Utils.u16ToBytes(copiesCount),
        ...Utils.u16ToBytes(someSize),
        isDivide ? 1 : 0,
      ],
      [ResponseCommandId.In_SetPageSize]
    );
  }

  public static setPrintQuantity(quantity: number): NiimbotPacket {
    const [h, l] = Utils.u16ToBytes(quantity);
    return new NiimbotPacket(RequestCommandId.PrintQuantity, [h, l]);
  }

  public static printStatus(): NiimbotPacket {
    return new NiimbotPacket(
      RequestCommandId.PrintStatus,
      [1],
      [ResponseCommandId.In_PrintStatus, ResponseCommandId.In_PrintError]
    );
  }
  public static printerReset(): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.PrinterReset, [1], [ResponseCommandId.In_PrinterReset]);
  }

  /**
   * B1 behavior: after {@link pageEnd} paper stops at printhead position, on {@link printEnd} paper moved further.
   *
   * D110 behavior: ordinary.
   * */
  public static printStart(): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.PrintStart, [1], [ResponseCommandId.In_PrintStart]);
  }

  public static printStartV3(totalPages: number): NiimbotPacket {
    return new NiimbotPacket(
      RequestCommandId.PrintStart,
      [...Utils.u16ToBytes(totalPages)],
      [ResponseCommandId.In_PrintStart]
    );
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
    return new NiimbotPacket(
      RequestCommandId.PrintStart,
      [...Utils.u16ToBytes(totalPages), 0x00, 0x00, 0x00, 0x00, pageColor],
      [ResponseCommandId.In_PrintStart]
    );
  }

  public static printStartV5(totalPages: number, pageColor: number = 0, quality: number = 0): NiimbotPacket {
    return new NiimbotPacket(
      RequestCommandId.PrintStart,
      [...Utils.u16ToBytes(totalPages), 0x00, 0x00, 0x00, 0x00, pageColor, quality],
      [ResponseCommandId.In_PrintStart]
    );
  }

  public static printEnd(): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.PrintEnd, [1], [ResponseCommandId.In_PrintEnd]);
  }
  public static pageStart(): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.PageStart, [1], [ResponseCommandId.In_PageStart]);
  }
  public static pageEnd(): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.PageEnd, [1], [ResponseCommandId.In_PageEnd]);
  }

  public static printEmptySpace(pos: number, repeats: number): NiimbotPacket {
    const packet = new NiimbotPacket(RequestCommandId.PrintEmptyRow, [...Utils.u16ToBytes(pos), repeats]);
    packet.oneWay = true;
    return packet;
  }

  public static printBitmapRow(pos: number, repeats: number, data: Uint8Array): NiimbotPacket {
    const blackPixelCount: number = Utils.countSetBits(data);

    const packet = new NiimbotPacket(RequestCommandId.PrintBitmapRow, [
      ...Utils.u16ToBytes(pos),
      // Black pixel count. Not sure what role it plays in printing.
      // There is two formats of this part
      // 1. <count> <count> <count> (sum must equals number of pixels, every number calculated by algorithm based on printhead resolution)
      // 2. <0> <countH> <countL> (big endian)
      0,
      ...Utils.u16ToBytes(blackPixelCount),
      repeats,
      ...data,
    ]);
    packet.oneWay = true;
    return packet;
  }

  /** Printer powers off if black pixel count > 6 */
  public static printBitmapRowIndexed(pos: number, repeats: number, data: Uint8Array): NiimbotPacket {
    const blackPixelCount: number = Utils.countSetBits(data);
    const indexes: Uint8Array = ImageEncoder.indexPixels(data);

    if (blackPixelCount > 6) {
      throw new Error(`Black pixel count > 6 (${blackPixelCount})`);
    }

    const packet = new NiimbotPacket(RequestCommandId.PrintBitmapRowIndexed, [
      ...Utils.u16ToBytes(pos),
      0,
      ...Utils.u16ToBytes(blackPixelCount),
      repeats,
      ...indexes,
    ]);

    packet.oneWay = true;
    return packet;
  }

  public static printClear(): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.PrintClear, [1]);
  }

  public static writeRfid(data: Uint8Array): NiimbotPacket {
    return new NiimbotPacket(RequestCommandId.WriteRFID, data);
  }

  public static writeImageData(image: EncodedImage): NiimbotPacket[] {
    return image.rowsData.map((p: ImageRow) => {
      if (p.dataType === "pixels") {
        if (p.blackPixelsCount > 6) {
          return PacketGenerator.printBitmapRow(p.rowNumber, p.repeat, p.rowData!);
        } else {
          return PacketGenerator.printBitmapRowIndexed(p.rowNumber, p.repeat, p.rowData!);
        }
      } else {
        return PacketGenerator.printEmptySpace(p.rowNumber, p.repeat);
      }
    });
  }

  public static generatePrintPageSequence(
    taskVersion: PrintTaskVersion,
    image: EncodedImage,
    options?: PrintOptions
  ): NiimbotPacket[] {
    const packets: NiimbotPacket[] = [];

    switch (taskVersion) {
      case PrintTaskVersion.V1:
        packets.push(PacketGenerator.printClear());
        packets.push(PacketGenerator.pageStart());
        packets.push(PacketGenerator.setPageSizeV1(image.rows));
        break;
      case PrintTaskVersion.V2:
        packets.push(PacketGenerator.printClear());
        packets.push(PacketGenerator.pageStart());
        packets.push(PacketGenerator.setPageSizeV2(image.rows, image.cols));
        break;
      case PrintTaskVersion.V3:
        packets.push(PacketGenerator.pageStart());
        packets.push(PacketGenerator.setPageSizeV2(image.rows, image.cols));
        packets.push(PacketGenerator.setPrintQuantity(options?.quantity ?? 1));
        break;
      case PrintTaskVersion.V4:
        packets.push(PacketGenerator.pageStart());
        packets.push(PacketGenerator.setPageSizeV3(image.rows, image.cols, options?.quantity ?? 1));
        break;
      case PrintTaskVersion.V5:
        packets.push(PacketGenerator.pageStart());
        packets.push(PacketGenerator.setPageSizeV4(image.rows, image.cols, options?.quantity ?? 1, 0, false));
        break;
      default:
        taskVersion satisfies never;
    }

    packets.push(...PacketGenerator.writeImageData(image));
    packets.push(PacketGenerator.pageEnd());
    return packets;
  }

  public static generatePrintInitSequence(taskVersion: PrintTaskVersion, options?: PrintOptions): NiimbotPacket[] {
    const packets: NiimbotPacket[] = [];

    packets.push(PacketGenerator.setDensity(options?.density ?? 2));
    packets.push(PacketGenerator.setLabelType(options?.labelType ?? LabelType.WithGaps));

    switch (taskVersion) {
      case PrintTaskVersion.V1:
      case PrintTaskVersion.V2:
      case PrintTaskVersion.V3:
        packets.push(PacketGenerator.printStart());
        break;
      case PrintTaskVersion.V4:
        packets.push(PacketGenerator.printStartV4(options?.quantity ?? 1));
        break;
      case PrintTaskVersion.V5:
        packets.push(PacketGenerator.printStartV5(options?.quantity ?? 1, 0, 0));
        break;
      default:
        taskVersion satisfies never;
    }
    
    return packets;
  }

  /**
   * Generate print sequence for one page (with one or multiple copies).
   *
   * You should send PrintEnd manually after this sequence after print is finished
   */
  public static generatePrintSequence(
    taskVersion: PrintTaskVersion,
    image: EncodedImage,
    options?: PrintOptions
  ): NiimbotPacket[] {
    return [
      ...this.generatePrintInitSequence(taskVersion, options),
      ...this.generatePrintPageSequence(taskVersion, image, options),
    ];
  }
}
