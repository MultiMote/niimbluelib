import { Capacitor } from "@capacitor/core";

export interface AvailableTransports {
  webSerial: boolean;
  webBluetooth: boolean;
  capacitorBle: boolean;
}

export interface PixelCountResult {
  total: number;
  parts: [number, number, number];
}

/**
 * Utility class for various common operations.
 * @category Helpers
 */
export class Utils {
  /**
   * Converts a given number to its hexadecimal representation.
   */
  public static numberToHex(n: number): string {
    const hex = n.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  }

  /**
   * Converts a DataView, Uint8Array, or number array to a hexadecimal string with byte separator.
   */
  public static bufToHex(buf: DataView | Uint8Array | number[], separator: string = " "): string {
    const arr: number[] = buf instanceof DataView ? this.dataViewToNumberArray(buf) : Array.from(buf);
    return arr.map((n) => Utils.numberToHex(n)).join(separator);
  }

  /**
   * Converts a hexadecimal string to a Uint8Array buffer.
   */
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

  /**
   * Converts a DataView object to an array of numbers.
   */
  public static dataViewToNumberArray(dw: DataView): number[] {
    const a: number[] = [];
    for (let i = 0; i < dw.byteLength; i++) {
      a.push(dw.getUint8(i));
    }
    return a;
  }

  /**
   * Converts a DataView object to a Uint8Array
   */
  public static dataViewToU8Array(dw: DataView): Uint8Array {
    return Uint8Array.from(this.dataViewToNumberArray(dw));
  }

  /**
   * Converts a Uint8Array to a string using TextDecoder.
   */
  public static u8ArrayToString(arr: Uint8Array): string {
    return new TextDecoder().decode(arr);
  }

  /**
   * Count non-zero bits in the byte array.
   *
   * For `split` mode:
   *
   * If data length is more than `printhead size / 8`, counts are [0, LL, HH] of total `1` bit count
   *
   * Otherwise data splitted to the three chunks (last chunk sizes can be lesser, base chunk size is `printhead size / 8 / 3`)
   * and `1` bit count calculated from each chunk.
   *
   * For `total` mode:
   *
   * Return total number of pixel in little-endian format: `[0, LL, HH]`
   *
   **/
  public static countPixelsForBitmapPacket(
    buf: Uint8Array,
    printheadPixels: number,
    mode: "auto" | "split" | "total" = "auto"
  ): PixelCountResult {
    let total: number = 0;
    let parts: [number, number, number] = [0, 0, 0];
    let chunkSize: number = Math.floor(printheadPixels / 8 / 3); // Every byte can store 8 pixels
    let split: boolean = buf.byteLength <= chunkSize * 3; // Is data fits to the three chunks

    if (mode === "total") {
      split = false;
    } else if (mode === "split") {
      if (buf.byteLength > chunkSize * 3) {
        console.warn(
          `Can't use split mode: buffer size (${buf.byteLength}) is large than chunk size * 3 (${chunkSize * 3}), ` +
            "maybe printheadPixels is set incorrectly"
        );
      } else {
        split = true;
      }
    }

    buf.forEach((value: number, byteN: number) => {
      const chunkIdx: number = Math.floor(byteN / chunkSize);

      for (let bitN = 0; bitN < 8; bitN++) {
        // is black
        if ((value & (1 << bitN)) !== 0) {
          total++;

          if (!split) {
            continue;
          }

          if (chunkIdx > 2) {
            console.warn(`Overflow (chunk index ${chunkIdx})`);
            continue;
          }

          parts[chunkIdx]++;

          if (parts[chunkIdx] > 255) {
            console.warn("Pixel count overflow");
          }
        }
      }
    });

    if (split) {
      return { total, parts };
    }

    const [c, b] = this.u16ToBytes(total);
    return { total, parts: [0, b, c] };
  }

  /**
   * Converts a 16-bit unsigned integer to an array of two bytes (big endian).
   */
  public static u16ToBytes(n: number): [number, number] {
    const h = (n >> 8) & 0xff;
    const l = n % 256 & 0xff;
    return [h, l];
  }

  /**
   * Converts a 32-bit unsigned integer to an array of two bytes (big endian).
   */
  public static u32ToBytes(n: number): [number, number, number, number] {
    return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  }

  /**
   * Converts a Uint8Array of length 2 to a 16-bit signed integer (big endian).
   */
  public static bytesToI16(arr: Uint8Array): number {
    Validators.u8ArrayLengthEquals(arr, 2);
    return new DataView(arr.buffer).getInt16(0, false);
  }

  /**
   * Converts a Uint8Array of length 2 to a 16-bit signed integer (big endian).
   */
  public static bytesToI32(arr: Uint8Array): number {
    Validators.u8ArrayLengthEquals(arr, 4);
    return new DataView(arr.buffer).getInt32(0, false);
  }

  /**
   * Compares two Uint8Arrays to check if they are equal.
   */
  public static u8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((el, i) => el === b[i]);
  }

  public static u8ArrayAppend(src: Uint8Array, data: Uint8Array): Uint8Array {
    const newBuf = new Uint8Array(src.length + data.length);
    newBuf.set(src, 0);
    newBuf.set(data, src.length);
    return newBuf;
  }

  /**
   * Asynchronously pauses the execution for the specified amount of time.
   */
  public static sleep(ms: number): Promise<undefined> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Checks if the browser supports Bluetooth functionality.
   * @deprecated use {@link getAvailableTransports}
   */
  public static isBluetoothSupported(): boolean {
    return typeof navigator.bluetooth?.requestDevice !== "undefined";
  }

  /**
   * Checks if the browser supports the Web Serial API for serial communication.
   * @deprecated use {@link getAvailableTransports}
   */
  public static isSerialSupported(): boolean {
    return typeof navigator.serial?.requestPort !== "undefined";
  }

  /**
   * Checks environment functionality
   */
  public static getAvailableTransports(): AvailableTransports {
    return {
      capacitorBle: Capacitor.getPlatform() !== "web",
      webBluetooth: typeof navigator.bluetooth?.requestDevice !== "undefined",
      webSerial: typeof navigator.serial?.requestPort !== "undefined",
    };
  }

  /** Find check array has subarray at index */
  public static hasSubarrayAtPos<T>(arr: ArrayLike<T>, sub: ArrayLike<T>, pos: number): boolean {
    if (pos > arr.length - sub.length) {
      return false;
    }

    for (let i = 0; i < sub.length; i++) {
      if (arr[pos + i] !== sub[i]) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Utility class for validating objects.
 * @category Helpers
 */
export class Validators {
  /**
   * Compares two Uint8Arrays for equality and throws an error if they are not equal.
   */
  public static u8ArraysEqual(arr: Uint8Array, b: Uint8Array, message?: string): void {
    if (!Utils.u8ArraysEqual(arr, b)) {
      throw new Error(message ?? "Arrays must be equal");
    }
  }
  /**
   * Checks if the length of a Uint8Array equals a specified length and throws an error if the lengths do not match.
   */
  public static u8ArrayLengthEquals(arr: Uint8Array, len: number, message?: string): void {
    if (arr.length !== len) {
      throw new Error(message ?? `Array length must be ${len}`);
    }
  }
  /**
   * Checks if the length of a Uint8Array is at least a specified length.
   * Throws an error if the length is less than the specified length.
   */
  public static u8ArrayLengthAtLeast(arr: Uint8Array, len: number, message?: string): void {
    if (arr.length < len) {
      throw new Error(message ?? `Array length must be at least ${len}`);
    }
  }
}
