export class Bitmask {
  private readonly data: Uint8Array;

  constructor(value: number | Uint8Array) {
    if (value instanceof Uint8Array) {
      this.data = value;
    } else {
      this.data = new Uint8Array([value & 0xff]);
    }
  }

  static fromByte(value: number): Bitmask {
    return new Bitmask(value);
  }

  static fromBytes(data: Uint8Array): Bitmask {
    return new Bitmask(data);
  }

  bytes(): Uint8Array {
    return this.data;
  }

  at(bitIndex: number): number {
    if (bitIndex < 0 || bitIndex >= this.data.length * 8) return 0;

    const byteIdx = this.data.length - 1 - Math.floor(bitIndex / 8);
    const bitInByteIdx = bitIndex % 8;

    return (this.data[byteIdx] >> bitInByteIdx) & 1;
  }

  /** [ 0, 0, 0, 23 ] => 11101000000000000000000000000000 */
  toString(): string {
    return Array.from(this.data)
      .reverse()
      .map((byte) => byte.toString(2).padStart(8, "0").split("").reverse().join(""))
      .join("");
  }
  
  toJSON(): string {
    return this.toString();
  }
}
