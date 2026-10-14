import { Utils } from "../utils";

/**
 * Utility class to sequentially fetch data from byte array. EOF checks included. Bute order in big endian.
 *
 * @category Packets
 **/
export class SequentialDataReader {
  private readonly view: DataView;
  private offset: number;

  constructor(bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer);
    this.offset = 0;
  }

  /** Check available bytes */
  public canRead(count: number) {
    return this.offset + count <= this.view.byteLength;
  }

  /** Check available bytes and throw exception if EOF met */
  private willRead(count: number) {
    if (!this.canRead(count)) {
      throw new Error("Tried to read too much data");
    }
  }

  /** Skip bytes */
  skip(len: number): void {
    this.willRead(len);
    this.offset += len;
  }

  /** Read fixed length bytes */
  readBytes(len: number): Uint8Array {
    this.willRead(len);
    const part = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len).slice();
    this.offset += len;
    return part;
  }

  /** Read variable length bytes */
  readVBytes(): Uint8Array {
    return this.readBytes(this.readI8());
  }

  /** Read variable length string */
  readVString(): string {
    return Utils.u8ArrayToString(this.readVBytes());
  }

  /** Read 8 bit signed int */
  readI8(): number {
    this.willRead(1);
    return this.view.getInt8(this.offset++);
  }

  /** Read 8 bit unsigned int */
  readU8(): number {
    this.willRead(1);
    return this.view.getUint8(this.offset++);
  }

  /** Read 16 bit signed int */
  readI16(): number {
    this.willRead(2);
    const result = this.view.getInt16(this.offset, false);
    this.offset += 2;
    return result;
  }

  /** Read 16 bit unsigned int */
  readU16(): number {
    this.willRead(2);
    const result = this.view.getUint16(this.offset, false);
    this.offset += 2;
    return result;
  }

  /** Read 32 bit signed int */
  readI32(): number {
    this.willRead(4);
    const result = this.view.getInt32(this.offset, false);
    this.offset += 4;
    return result;
  }

  /** Read 32 bit unsigned int */
  readU32(): number {
    this.willRead(4);
    const result = this.view.getUint32(this.offset, false);
    this.offset += 4;
    return result;
  }

  readBool(): boolean {
    return this.readU8() !== 0;
  }

  /** Check EOF condition */
  end() {
    if (this.offset !== this.view.byteLength) {
      throw new Error("Extra data left");
    }
  }
}
