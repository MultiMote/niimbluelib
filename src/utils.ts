export class Utils {
  public static numberToHex(n: number): string {
    const hex = n.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  }

  public static bufToHex(buf: DataView | Uint8Array | number[], separator: string = " "): string {
    const arr: number[] = buf instanceof DataView ? this.dataViewToNumberArray(buf) : Array.from(buf);
    return arr.map((n) => Utils.numberToHex(n)).join(separator);
  }

  public static hexToBuf(str: string): Uint8Array {
    const match = str.match(/[\da-f]{2}/gi);

    if (!match) {
      return new Uint8Array();
    }

    return new Uint8Array(
      match.map((h) => {
        return parseInt(h, 16);
      })
    );
  }

  public static dataViewToNumberArray(dw: DataView): number[] {
    const a: number[] = [];
    for (let i = 0; i < dw.byteLength; i++) {
      a.push(dw.getUint8(i));
    }
    return a;
  }

  public static dataViewToU8Array(dw: DataView): Uint8Array {
    return Uint8Array.from(this.dataViewToNumberArray(dw));
  }

  public static u8ArrayToString(arr: Uint8Array): string {
    return new TextDecoder().decode(arr);
  }

  /**
   * Count non-zero bits in the byte array
   *
   * Not efficient, but readable.
   *
   * The algorithm is obtained by reverse engineering and I don't understand what's going on here.
   * 
   * Sometimes these values match original packets, sometimes not.
   **/
  public static countPixelsForBitmapPacket(
    arr: Uint8Array,
    printheadSize: number
  ): { total: number; a: number; b: number; c: number } {
    let total: number = 0;
    let a: number = 0;
    let b: number = 0;
    let c: number = 0;
    let xPos: number = 0;

    const printheadSizeDiv3: number = printheadSize / 3;

    arr.forEach((value: number) => {
      //for (let bitN = 0; bitN < 8; bitN++) {
      for (let bitN: number = 7; bitN >= 0; bitN--) {
        const isBlack: boolean = (value & (1 << bitN)) !== 0;
        if (isBlack) {
          if (xPos < printheadSizeDiv3) {
            a++;
          } else if (xPos < printheadSizeDiv3 * 2) {
            b++;
          } else {
            c++;
          }
          total++;
        }
        xPos++;
      }
    });
    return { total, a, b, c };
  }

  /** Big endian  */
  public static u16ToBytes(n: number): [number, number] {
    const h = (n >> 8) & 0xff;
    const l = n % 256 & 0xff;
    return [h, l];
  }

  /** Big endian  */
  public static bytesToI16(arr: Uint8Array): number {
    Validators.u8ArrayLengthEquals(arr, 2);
    return arr[0] * 256 + arr[1];
  }

  public static u8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((el, i) => el === b[i]);
  }

  public static sleep(ms: number): Promise<undefined> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public static isBluetoothSupported(): boolean {
    return typeof navigator.bluetooth?.requestDevice !== "undefined";
  }

  public static isSerialSupported(): boolean {
    return typeof navigator.serial?.requestPort !== "undefined";
  }
}

export class Validators {
  public static u8ArraysEqual(a: Uint8Array, b: Uint8Array, message?: string): void {
    if (!Utils.u8ArraysEqual(a, b)) {
      throw new Error(message ?? "Arrays must be equal");
    }
  }
  public static u8ArrayLengthEquals(a: Uint8Array, len: number, message?: string): void {
    if (a.length !== len) {
      throw new Error(message ?? `Array length must be ${len}`);
    }
  }
  public static u8ArrayLengthAtLeast(a: Uint8Array, len: number, message?: string): void {
    if (a.length < len) {
      throw new Error(message ?? `Array length must be at least ${len}`);
    }
  }
}
