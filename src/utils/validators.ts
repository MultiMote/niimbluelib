import { Utils } from "./utils";

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
  public static arrayLengthEquals(arr: ArrayLike<unknown>, len: number, message?: string): void {
    if (arr.length !== len) {
      throw new Error(message ?? `Array length must be ${len}`);
    }
  }
  /**
   * Checks if the length of a Uint8Array is at least a specified length.
   * Throws an error if the length is less than the specified length.
   */
  public static arrayLengthAtLeast(arr: ArrayLike<unknown>, len: number, message?: string): void {
    if (arr.length < len) {
      throw new Error(message ?? `Array length must be at least ${len}`);
    }
  }
}
