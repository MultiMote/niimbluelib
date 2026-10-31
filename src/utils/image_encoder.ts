import { Utils } from ".";
import { PageColorType } from "../packets";

/** @category Image encoder */
export type ImageRow = {
  dataType: "void" | "pixels" | "check";
  rowNumber: number;
  repeat: number;
  blackPixelsCount: number;
  redPixelsCount: number;
  /** Number of non-white pixels (grayscale mode only). */
  grayPixelsCount?: number;
  rowDataBlack?: Uint8Array;
  rowDataRed?: Uint8Array;
  /**
   * Two 4-bit grayscale levels per byte (high nibble first).
   * `0` is white, `15` is black.
   */
  rowDataGray?: Uint8Array;
};

/** @category Image encoder */
export type EncodedImage = {
  pageColor: PageColorType;
  cols: number;
  rows: number;
  rowsData: ImageRow[];
};

/** @category Image encoder */
export interface ImageSource {
  readonly width: number;
  readonly height: number;
  /** printDirection = "left" rotates image to 90 degrees clockwise */
  getPixelColor(x: number, y: number, printDirection: PrintDirection): number;
}

/** @category Image encoder */
export class CanvasImageSource implements ImageSource {
  private constructor(
    private readonly iData: ImageData,
    public readonly width: number,
    public readonly height: number,
  ) {}

  public static fromCanvas(canvas: HTMLCanvasElement): CanvasImageSource {
    const ctx = canvas.getContext("2d")!;
    const iData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return new CanvasImageSource(iData, canvas.width, canvas.height);
  }

  public getPixelColor(x: number, y: number, printDirection: PrintDirection = "left"): number {
    let idx = y * this.iData.width + x;

    if (printDirection === "left") {
      idx = (this.iData.height - 1 - x) * this.iData.width + y;
    }

    idx *= 4;
    return this.iData.data[idx + 2] | (this.iData.data[idx + 1] << 8) | (this.iData.data[idx] << 16);
  }
}

/** @category Image encoder */
export type PrintDirection = "left" | "top";

/**
 * Currently ImageEncode color modes:
 *
 * `PageColorType.Grayscale`:
 *
 * - White (0xffffff) - background
 * - Black (0x000000) - dot
 *
 * `PageColorType.DoubleColor`:
 *
 * - White (0xffffff) - background
 * - Black (0x000000) - dot
 * - Red (0xff0000) - second color dot
 *
 * `PageColorType.Grayscale`:
 *
 * - 16-level grayscale mode. Pixel colors are converted to luminance and packed as two 4-bit dots per byte (`0` = white, `15` = black).
 *
 * @category Helpers
 * @category Image encoder
 */
export class ImageEncoder {
  /** printDirection = "left" rotates image for 90 degrees clockwise */
  public static encodeCanvas(
    canvas: HTMLCanvasElement,
    pageColor: PageColorType,
    printDirection: PrintDirection,
  ): EncodedImage {
    const imageSource = CanvasImageSource.fromCanvas(canvas);
    return ImageEncoder.encode(imageSource, pageColor, printDirection);
  }

  /**
   * Convert a `0xRRGGBB` color to a 4-bit grayscale level.
   * `0` is white and `15` is black.
   */
  public static colorToGrayLevel(color: number): number {
    const red = (color >> 16) & 0xff;
    const green = (color >> 8) & 0xff;
    const blue = color & 0xff;

    // ITU-R BT.601 luminance, inverted because 0 is white in the printer protocol.
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    return Math.max(0, Math.min(15, Math.round((1 - luminance / 255) * 15)));
  }

  public static encode(
    source: ImageSource,
    pageColor: PageColorType,
    printDirection: PrintDirection,
  ): EncodedImage {
    const rowsData: ImageRow[] = [];
    const isGrayscale = pageColor === PageColorType.Grayscale;

    let originalCols: number = source.width;
    let rows: number = source.height;

    if (printDirection === "left") {
      originalCols = source.height;
      rows = source.width;
    }

    // Pad to multiple of 8
    const cols = Math.ceil(originalCols / 8) * 8;

    for (let row = 0; row < rows; row++) {
      let isVoid: boolean = true;
      let blackPixelsCount: number = 0;
      let redPixelsCount: number = 0;
      let grayPixelsCount: number = 0;
      const blackRowData = isGrayscale ? undefined : new Uint8Array(cols / 8);
      const redRowData = isGrayscale ? undefined : new Uint8Array(cols / 8);
      const grayRowData = isGrayscale ? new Uint8Array(cols / 2) : undefined;

      if (isGrayscale) {
        for (let colPair = 0; colPair < cols / 2; colPair++) {
          const col1 = colPair * 2;
          const col2 = col1 + 1;

          const level1 =
            col1 < originalCols ? ImageEncoder.colorToGrayLevel(source.getPixelColor(col1, row, printDirection)) : 0;
          const level2 =
            col2 < originalCols ? ImageEncoder.colorToGrayLevel(source.getPixelColor(col2, row, printDirection)) : 0;

          if (level1 !== 0) {
            isVoid = false;
            grayPixelsCount++;
          }
          if (level2 !== 0) {
            isVoid = false;
            grayPixelsCount++;
          }

          grayRowData![colPair] = (level1 << 4) | level2;
        }
      } else {
        for (let colOct = 0; colOct < cols / 8; colOct++) {
          let blackPixelsOctet: number = 0;
          let redPixelsOctet: number = 0;

          for (let colBit = 0; colBit < 8; colBit++) {
            const col = colOct * 8 + colBit;
            const color = source.getPixelColor(col, row, printDirection);

            if (col >= originalCols) {
              continue;
            }

            if (color === 0xff0000 && pageColor === PageColorType.DoubleColor) {
              redPixelsOctet |= 1 << (7 - colBit);
              isVoid = false;
              redPixelsCount++;
            } else if (color !== 0xffffff) {
              blackPixelsOctet |= 1 << (7 - colBit);
              isVoid = false;
              blackPixelsCount++;
            }
          }
          blackRowData![colOct] = blackPixelsOctet;
          redRowData![colOct] = redPixelsOctet;
        }
      }

      const newPart: ImageRow = {
        dataType: isVoid ? "void" : "pixels",
        rowNumber: row,
        repeat: 1,
        rowDataBlack: isVoid ? undefined : blackRowData,
        rowDataRed: isVoid ? undefined : redRowData,
        rowDataGray: isVoid ? undefined : grayRowData,
        blackPixelsCount,
        redPixelsCount,
        grayPixelsCount,
      };

      // Check previous row and increment repeats instead of adding new row if data is same
      if (rowsData.length === 0) {
        rowsData.push(newPart);
      } else {
        const lastPacket: ImageRow = rowsData[rowsData.length - 1];
        let same: boolean = newPart.dataType === lastPacket.dataType;

        if (same && newPart.dataType === "pixels") {
          if (isGrayscale) {
            same = Utils.u8ArraysEqual(newPart.rowDataGray!, lastPacket.rowDataGray!);
          } else {
            same =
              Utils.u8ArraysEqual(newPart.rowDataBlack!, lastPacket.rowDataBlack!) &&
              Utils.u8ArraysEqual(newPart.rowDataRed!, lastPacket.rowDataRed!);
          }
        }

        if (same) {
          lastPacket.repeat++;
        } else {
          rowsData.push(newPart);
        }

        const checkInterval = isGrayscale ? 100 : 200;
        const sendRowCheck = row % checkInterval === checkInterval - 1;

        if (sendRowCheck) {
          rowsData.push({
            dataType: "check",
            rowNumber: row,
            repeat: 0,
            blackPixelsCount: 0,
            redPixelsCount: 0,
          });
        }
      }
    }

    return { cols, rows, rowsData, pageColor };
  }

  /**
   * @param data Pixels encoded by {@link encodeCanvas} (byte is 8 pixels)
   * @returns Array of indexes where every index stored in two bytes (big endian)
   */
  public static indexPixels(data: Uint8Array): Uint8Array {
    const result: number[] = [];

    for (let bytePos = 0; bytePos < data.byteLength; bytePos++) {
      const b: number = data[bytePos];
      for (let bitPos = 0; bitPos < 8; bitPos++) {
        // iterate from most significant bit of byte
        if (b & (1 << (7 - bitPos))) {
          result.push(...Utils.u16ToBytes(bytePos * 8 + bitPos));
        }
      }
    }

    return new Uint8Array(result);
  }
}
