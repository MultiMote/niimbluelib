import { PageColorType, Utils } from ".";

/** @category Image encoder */
export type ImageRow = {
  dataType: "void" | "pixels" | "check";
  rowNumber: number;
  repeat: number;
  blackPixelsCount: number;
  redPixelsCount: number;
  rowDataBlack?: Uint8Array;
  rowDataRed?: Uint8Array;
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
 * Currently ImageEncode supports three colors:
 * - White (0xffffff) - background color
 * - Black (0x000000) - first color
 * - Red (0xff0000) - second color
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

  public static encode(
    source: ImageSource,
    pageColor: PageColorType,
    printDirection: PrintDirection,
  ): EncodedImage {
    const rowsData: ImageRow[] = [];

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
      const blackRowData = new Uint8Array(cols / 8);
      const redRowData = new Uint8Array(cols / 8);

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
        blackRowData[colOct] = blackPixelsOctet;
        redRowData[colOct] = redPixelsOctet;
      }

      const newPart: ImageRow = {
        dataType: isVoid ? "void" : "pixels",
        rowNumber: row,
        repeat: 1,
        rowDataBlack: isVoid ? undefined : blackRowData,
        rowDataRed: isVoid ? undefined : redRowData,
        blackPixelsCount,
        redPixelsCount,
      };

      // Check previous row and increment repeats instead of adding new row if data is same
      if (rowsData.length === 0) {
        rowsData.push(newPart);
      } else {
        const lastPacket: ImageRow = rowsData[rowsData.length - 1];
        let same: boolean = newPart.dataType === lastPacket.dataType;

        if (same && newPart.dataType === "pixels") {
          same =
            Utils.u8ArraysEqual(newPart.rowDataBlack!, lastPacket.rowDataBlack!) &&
            Utils.u8ArraysEqual(newPart.rowDataRed!, lastPacket.rowDataRed!);
        }

        if (same) {
          lastPacket.repeat++;
        } else {
          rowsData.push(newPart);
        }

        const sendRowCheck = row % 200 === 199;

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
