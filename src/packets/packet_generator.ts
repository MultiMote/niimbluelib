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
  NiimbotPacket16,
  NiimbotPacket32,
  PrinterConfig2Type,
  PrinterConfig2Action,
  PageColorType,
  BitmapColorMode,
} from ".";
import { EncodedImage, ImageEncoder, Utils, Validators, lzo1xCompress } from "../utils";

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

  /**
   * Same as {@link mapped}, but uses a 16-bit data length.
   * Required for grayscale row packets.
   */
  public static mapped16(sendCmd: TX, data: Uint8Array | number[] = [1]): NiimbotPacket16 {
    const respIds: RX[] | null = commandsMap[sendCmd];

    if (respIds === null) {
      const p = new NiimbotPacket16(sendCmd, data);
      p.oneWay = true;
      return p;
    }

    return new NiimbotPacket16(sendCmd, data, respIds);
  }

  /**
   * Same as {@link mapped}, but uses a 32-bit data length.
   * Required for compressed image packets.
   */
  public static mapped32(sendCmd: TX, data: Uint8Array | number[] = [1]): NiimbotPacket32 {
    const respIds: RX[] | null = commandsMap[sendCmd];

    if (respIds === null) {
      const p = new NiimbotPacket32(sendCmd, data);
      p.oneWay = true;
      return p;
    }

    return new NiimbotPacket32(sendCmd, data, respIds);
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

  /** First seen on H1S */
  public static setPageSize9b(
    rows: number,
    cols: number,
    copiesCount: number,
    cutHeight: number = 0,
    cutType: number = 0,
  ): NiimbotPacket {
    return this.mapped(TX.SetPageSize, [
      ...Utils.u16ToBytes(rows),
      ...Utils.u16ToBytes(cols),
      ...Utils.u16ToBytes(copiesCount),
      ...Utils.u16ToBytes(cutHeight),
      cutType,
    ]);
  }


  /** First seen on D110M v4
   *
   * @param serial Something called "local template data id", 32 bytes
   */
  public static setPageSize13b(
    rows: number,
    cols: number,
    copiesCount: number,
    cutHeight: number = 0,
    cutType: number = 0,
    sendAll: number = 0,
    partHeight: number = 0,
    serial: number[] = [],
  ): NiimbotPacket {
    if (serial && serial.length !== 0) {
      Validators.arrayLengthEquals(serial, 32);
    }

    return this.mapped(TX.SetPageSize, [
      ...Utils.u16ToBytes(rows),
      ...Utils.u16ToBytes(cols),
      ...Utils.u16ToBytes(copiesCount),
      ...Utils.u16ToBytes(cutHeight),
      cutType,
      0x00,
      sendAll,
      ...Utils.u16ToBytes(partHeight),
      ...serial
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
  public static printStart7b(totalPages: number, pageColor: PageColorType = PageColorType.SingleColor): NiimbotPacket {
    return this.mapped(TX.PrintStart, [...Utils.u16ToBytes(totalPages), 0x00, 0x00, 0x00, 0x00, pageColor]);
  }

  /** First seen on D110M v4 */
  public static printStart9b(totalPages: number, pageColor: PageColorType = PageColorType.SingleColor, speed: number = 0, someFlag: boolean = false): NiimbotPacket {
    return this.mapped(TX.PrintStart, [...Utils.u16ToBytes(totalPages), 0x00, 0x00, 0x00, 0x00, pageColor, speed, someFlag ? 0x01 : 0x00]);
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

  public static printBitmapRowWithColor(
    pos: number,
    repeats: number,
    data: Uint8Array,
    colorMode: BitmapColorMode = BitmapColorMode.Black
  ): NiimbotPacket {
    return this.mapped(TX.PrintBitmapRowDoubleColor, [colorMode, TX.PrintBitmapRow, ...Utils.u16ToBytes(pos), repeats, ...data]);
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

  public static printBitmapRowDoubleColor(blackData: Uint8Array, redData: Uint8Array, pos: number, repeats: number, cols: number): NiimbotPacket {
    const maskBytes: number[] = [];
    const colorBytes: number[] = [];
    const bytesPerOctet = cols / 8;

    for (let i = 0; i < bytesPerOctet; i++) {
      const bByte = blackData ? blackData[i] : 0;
      const rByte = redData ? redData[i] : 0;

      // mask: bit is on if pixel is non-white (black OR red)
      const mask = bByte | rByte;
      maskBytes.push(mask);

      // color: 0 for black, 1 for red (only appended if block contains pixels)
      if (mask !== 0) {
        let colorByte = 0;
        for (let bit = 7; bit >= 0; bit--) {
          const isRed = (rByte & (1 << bit)) !== 0;
          colorByte = (colorByte << 1) | (isRed ? 1 : 0);
        }
        colorBytes.push(colorByte);
      }
    }

    return this.mapped(TX.PrintBitmapRowDoubleColor, [BitmapColorMode.Mixed, ...Utils.u16ToBytes(pos), repeats, ...maskBytes, ...colorBytes ]);
  }

  public static printClear(): NiimbotPacket {
    return this.mapped(TX.PrintClear);
  }

  public static getVolumeLevel(data: Uint8Array): NiimbotPacket {
    return this.mapped(TX.GetVolumeLevel, data);
  }

  public static checkLine(line: number): NiimbotPacket {
    return this.mapped(TX.PrinterCheckLine, [...Utils.u16ToBytes(line), 0x01]);
  }

  /**
   * Ask the printer to confirm it has received all grayscale rows up to {@link line}.
   * The response is {@link ResponseCommandId.In_PrinterCheckLine} (`0xD3`).
   *
   * Unlike {@link checkLine}, the row number must point to a row that was already sent.
   */
  public static checkLineGray(line: number): NiimbotPacket {
    return this.mapped(TX.PrinterCheckLine, [...Utils.u16ToBytes(line), 0x01]);
  }

  /**
   * One or more empty grayscale rows.
   *
   * Body: `84 ROW_HI ROW_LO COUNT 00` inside a 16-bit-length `0x8D` wrapper.
   */
  public static printGrayEmptyRows(pos: number, repeats: number): NiimbotPacket16 {
    if (repeats < 1 || repeats > 255) {
      throw new Error(`Gray empty row repeats must be in 1..255 range (got ${repeats})`);
    }

    return this.mapped16(TX.PrintBitmapRowGray, [
      TX.PrintEmptyRow,
      ...Utils.u16ToBytes(pos),
      repeats,
      0x00,
    ]);
  }

  /**
   * A grayscale row.
   *
   * Body: `86 ROW_HI ROW_LO REPEATS RUNS_COUNT RUNS... DATA...` inside a 16-bit-length `0x8D` wrapper,
   * where `RUNS_COUNT` is the number of run descriptor bytes (not the number of runs).
   * {@link data} stores two 4-bit grayscale levels per byte (high nibble first), `0` = white, `15` = black.
   */
  public static printGrayRow(pos: number, repeats: number, data: Uint8Array): NiimbotPacket16 {
    if (repeats < 1 || repeats > 255) {
      throw new Error(`Gray row repeats must be in 1..255 range (got ${repeats})`);
    }

    const compressed = this.compressGrayRow(data);

    return this.mapped16(TX.PrintBitmapRowGray, [
      // Same command ID as PrinterCheckLine, but nested inside the grayscale wrapper it means "gray row".
      TX.PrinterCheckLine,
      ...Utils.u16ToBytes(pos),
      repeats,
      compressed.runs.length,
      ...compressed.runs,
      ...compressed.data,
    ]);
  }

  /**
   * A chunk of LZO-compressed image rows.
   *
   * The printer answers every packet with {@link ResponseCommandId.In_GetCompress}.
   *
   * @param index Zero-based compressed chunk index.
   * @param data LZO1X-compressed row data.
   */
  public static printBitmapRowCompressed(index: number, data: Uint8Array): NiimbotPacket32 {
    if (index < 0 || index > 0xffff) {
      throw new Error(`Compressed image packet index must be in 0..65535 range (got ${index})`);
    }

    return this.mapped32(TX.PrintBitmapRowCompressed, [...Utils.u16ToBytes(index), ...data]);
  }

  /**
   * Pack a grayscale row and encode runs of equal pixels.
   *
   * Run descriptor: `(pixelCount + 2) | ((dataPosition >> 8) & 1)`, then `dataPosition & 0xFF`.
   * The printer repeats the last dot at the referenced data byte. Runs shorter than 8 pixels
   * are not encoded because the descriptor would cost more than the data it replaces.
   */
  private static compressGrayRow(data: Uint8Array): { runs: number[]; data: number[] } {
    const levels = new Uint8Array(data.length * 2);

    for (let i = 0; i < data.length; i++) {
      levels[i * 2] = (data[i] >> 4) & 0x0f;
      levels[i * 2 + 1] = data[i] & 0x0f;
    }

    const runs: number[] = [];
    const packed: number[] = [];

    let x = 0;

    while (x < levels.length) {
      const a = levels[x];
      const b = levels[x + 1];
      packed.push((a << 4) | b);
      x += 2;

      if (a !== b || runs.length > 250) {
        continue;
      }

      let count = 0;

      while (x + count < levels.length && count < 252 && levels[x + count] === b) {
        count++;
      }

      // Runs cover whole data bytes.
      count &= ~1;

      if (count < 6) {
        continue;
      }

      const at = packed.length - 1;
      runs.push((count + 2) | ((at >> 8) & 1));
      runs.push(at & 0xff);

      x += count;
    }

    return { runs, data: packed };
  }

  public static writeImageData(image: EncodedImage, options?: ImagePacketsGenerateOptions): NiimbotPacket[] {
    if (image.pageColor === PageColorType.SingleColor) {
      return this.writeImageDataSingleColor(image, options);
    } else if (image.pageColor === PageColorType.DoubleColor) {
      return this.writeImageDataDoubleColor(image);
    } else if (image.pageColor === PageColorType.MultiorderColor) {
      return this.writeImageDataGray(image);
    }

    throw new Error(`Page color ${image.pageColor} not implemented`);
  }

  public static writeImageDataSingleColor(image: EncodedImage, options?: ImagePacketsGenerateOptions): NiimbotPacket[] {
    const out: NiimbotPacket[] = [];

    for (const d of image.rowsData) {
      if (d.dataType === "pixels") {
        if (d.blackPixelsCount <= 6 && !options?.noIndexPacket) {
          out.push(
            this.printBitmapRowIndexed(
              d.rowNumber,
              d.repeat,
              d.rowDataBlack!,
              options?.printheadPixels ?? 0,
              options?.countsMode ?? "auto"
            )
          );
        } else {
          out.push(
            this.printBitmapRow(
              d.rowNumber,
              d.repeat,
              d.rowDataBlack!,
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

  /**
   * Generate grayscale image packets.
   *
   * Empty rows are sent as `0x84` packets and image rows as `0x86` packets, both wrapped in
   * a 16-bit-length `0x8D` packet. Every 100 rows encoded by {@link ImageEncoder} contains a
   * `check` entry, which becomes a `0x86` synchronization request.
   */
  public static writeImageDataGray(image: EncodedImage): NiimbotPacket[] {
    const out: NiimbotPacket[] = [];

    if (image.pageColor !== PageColorType.MultiorderColor) {
      throw new Error("EncodedImage.pageColor must be PageColorType.MultiorderColor");
    }

    if (image.cols % 2 !== 0) {
      throw new Error(`Grayscale image width must be even (got ${image.cols})`);
    }

    for (const d of image.rowsData) {
      if (d.dataType === "pixels") {
        let row = d.rowNumber;
        let repeats = d.repeat;

        while (repeats > 0) {
          const count = Math.min(255, repeats);
          out.push(this.printGrayRow(row, count, d.rowDataGray!));
          row += count;
          repeats -= count;
        }

        continue;
      }

      if (d.dataType === "void") {
        let row = d.rowNumber;
        let repeats = d.repeat;

        while (repeats > 0) {
          const count = Math.min(255, repeats);
          out.push(this.printGrayEmptyRows(row, count));
          row += count;
          repeats -= count;
        }

        continue;
      }

      if (d.dataType === "check") {
        out.push(this.checkLineGray(d.rowNumber));
      }
    }

    return out;
  }

  /**
   * Generate LZO-compressed grayscale image packets.
   *
   * Every row is included, including white rows (which are sent as zero-filled
   * row data instead of `0x84` empty-row packets). Rows are accumulated until
   * adding the next row would exceed {@link maxChunkBytes}, then the whole chunk
   * is compressed with LZO1X and sent as a `0xA7` packet.
   *
   * This matches the official SDK's `sendCompressData` path for printers that
   * advertise `imageCompressSupport` bit 1.
   *
   * @param image Encoded grayscale image.
   * @param maxChunkBytes Maximum uncompressed bytes per compressed packet.
   *   Usually `PrinterCapabilities.maxImageCompressBytes`.
   */
  public static writeImageDataGrayCompressed(image: EncodedImage, maxChunkBytes: number): NiimbotPacket32[] {
    if (image.pageColor !== PageColorType.MultiorderColor) {
      throw new Error("EncodedImage.pageColor must be PageColorType.MultiorderColor");
    }

    if (image.cols % 2 !== 0) {
      throw new Error(`Grayscale image width must be even (got ${image.cols})`);
    }

    if (!Number.isInteger(maxChunkBytes) || maxChunkBytes <= 0) {
      throw new Error(`maxChunkBytes must be a positive integer (got ${maxChunkBytes})`);
    }

    const rowBytes = image.cols / 2;
    const emptyRow = new Uint8Array(rowBytes);
    const chunks: Uint8Array[] = [];
    let currentRows: Uint8Array[] = [];
    let currentLength = 0;
    let totalRows = 0;

    const flush = () => {
      if (currentRows.length === 0) return;

      const raw = new Uint8Array(currentLength);
      let offset = 0;

      for (const row of currentRows) {
        raw.set(row, offset);
        offset += row.length;
      }

      chunks.push(lzo1xCompress(raw));
      currentRows = [];
      currentLength = 0;
    };

    const pushRow = (row: Uint8Array) => {
      if (currentLength > 0 && currentLength + row.length > maxChunkBytes) {
        flush();
      }

      currentRows.push(row);
      currentLength += row.length;
    };

    for (const d of image.rowsData) {
      if (d.dataType === "pixels") {
        if (!d.rowDataGray) {
          throw new Error(`Gray row ${d.rowNumber} has no row data`);
        }

        if (d.rowDataGray.length !== rowBytes) {
          throw new Error(
            `Gray row ${d.rowNumber} has ${d.rowDataGray.length} bytes, expected ${rowBytes}`,
          );
        }

        for (let i = 0; i < d.repeat; i++) {
          pushRow(d.rowDataGray);
          totalRows++;
        }
      } else if (d.dataType === "void") {
        for (let i = 0; i < d.repeat; i++) {
          pushRow(emptyRow);
          totalRows++;
        }
      }
    }

    flush();

    if (totalRows !== image.rows) {
      throw new Error(`Encoded image has ${totalRows} rows of data, expected ${image.rows}`);
    }

    return chunks.map((chunk, index) => this.printBitmapRowCompressed(index, chunk));
  }

  public static writeImageDataDoubleColor(image: EncodedImage): NiimbotPacket[] {
    const out: NiimbotPacket[] = [];

    if (image.pageColor !== PageColorType.DoubleColor) {
      throw new Error("EncodedImage.pageColor must be PageColorType.DoubleColor");
    }

    for (const d of image.rowsData) {
      if (d.dataType === "pixels") {
        const hasBlack = d.blackPixelsCount > 0;
        const hasRed = d.redPixelsCount > 0;

        if (hasBlack && hasRed) {
          out.push(this.printBitmapRowDoubleColor(d.rowDataBlack!, d.rowDataRed!, d.rowNumber, d.repeat, image.cols));
        } else if (hasBlack || hasRed) {
          const color = hasBlack ? BitmapColorMode.Black : BitmapColorMode.Red;
          const rowData = hasBlack ? d.rowDataBlack! : d.rowDataRed!;
          out.push(this.printBitmapRowWithColor(d.rowNumber, d.repeat, rowData, color));
        }
        continue;
      }

      if (d.dataType === "void") {
        const p = this.printEmptySpace(d.rowNumber, d.repeat);
        out.push(this.mapped(TX.PrintBitmapRowDoubleColor, [BitmapColorMode.Empty, p.command, ...p.data]));
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

  public static setTubeTypeAndWidth(tubeType: number, mmWidth: number): NiimbotPacket {
    const widthFixed = Math.floor(mmWidth * 100);
    return this.mapped(TX.TubeTypeAndWidth, [0x01, 0x01, tubeType, ...Utils.u16ToBytes(widthFixed)]);
  }

  public static setHalfCut(value: boolean): NiimbotPacket {
    return this.mapped(TX.HalfCut, [0x01, value ? 0x01 : 0x00]);
  }

  public static setPrinterTime(date: Date = new Date()): NiimbotPacket {
    return this.mapped(TX.PrinterConfig2, [
      PrinterConfig2Type.Time,
      PrinterConfig2Action.SetValue,
      ...Utils.u16ToBytes(date.getFullYear()),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
    ]);
  }

  public static getPaperInfo(): NiimbotPacket {
    return this.mapped(TX.GetPaperInfo);
  }

  public static getPrinterCapabilities(): NiimbotPacket {
    return this.mapped(TX.GetPrinterCapabilities);
  }
}
