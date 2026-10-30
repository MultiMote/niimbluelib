import { Utils, Validators } from "../utils";
import { RequestCommandId, ResponseCommandId, SequentialDataReader } from ".";
import CRC32 from "crc-32";

/**
 * NIIMBOT packet object
 *
 * @category Packets
 */
export class NiimbotPacket {
  public static readonly HEAD = new Uint8Array([0x55, 0x55]);
  public static readonly TAIL = new Uint8Array([0xaa, 0xaa]);

  protected _command: RequestCommandId | ResponseCommandId;
  protected _data: Uint8Array;

  private _validResponseIds: ResponseCommandId[];

  /** There can be no response after this request. */
  private _oneWay: boolean;

  constructor(
    command: RequestCommandId | ResponseCommandId,
    data: Uint8Array | number[],
    validResponseIds: ResponseCommandId[] = [],
  ) {
    this._command = command;
    this._data = data instanceof Uint8Array ? data : new Uint8Array(data);
    this._validResponseIds = validResponseIds;
    this._oneWay = false;
  }

  /** Data length (header, command, dataLen, checksum, tail are excluded). */
  public get dataLength(): number {
    return this._data.length;
  }
  public get length(): number {
    return (
      NiimbotPacket.HEAD.length + // head
      1 + // cmd
      1 + // dataLength
      this.dataLength +
      1 + // checksum
      NiimbotPacket.TAIL.length
    );
  }

  public set oneWay(value: boolean) {
    this._oneWay = value;
  }

  public get oneWay(): boolean {
    return this._oneWay;
  }

  public get validResponseIds(): ResponseCommandId[] {
    return this._validResponseIds;
  }

  public set validResponseIds(ids: ResponseCommandId[]) {
    this._validResponseIds = ids;
  }

  public get command(): RequestCommandId | ResponseCommandId {
    return this._command;
  }

  public get data(): Uint8Array {
    return this._data;
  }

  public get checksum(): number {
    let checksum = 0;
    checksum ^= this._command;
    checksum ^= this._data.length;
    this._data.forEach((i: number) => (checksum ^= i));
    return checksum;
  }

  /** [0x55, 0x55, CMD, DATA_LEN, DA =//= TA, CHECKSUM, 0xAA, 0xAA] */
  public toBytes(): Uint8Array {
    const buf = new ArrayBuffer(
      NiimbotPacket.HEAD.length + // head
        1 + // cmd
        1 + // dataLength
        this._data.length +
        1 + // checksum
        NiimbotPacket.TAIL.length,
    );

    const arr = new Uint8Array(buf);

    let pos = 0;

    arr.set(NiimbotPacket.HEAD, pos);
    pos += NiimbotPacket.HEAD.length;

    arr[pos] = this._command;
    pos += 1;

    arr[pos] = this._data.length;
    pos += 1;

    arr.set(this._data, pos);
    pos += this._data.length;

    arr[pos] = this.checksum;
    pos += 1;

    arr.set(NiimbotPacket.TAIL, pos);

    if (this._command === RequestCommandId.Connect) {
      // const newArr = new Uint8Array(arr.length + 1);
      // newArr[0] = 3;
      // newArr.set(arr, 1);
      return new Uint8Array([3, ...arr]);
    }

    return arr;
  }

  public static fromBytes(buf: Uint8Array): NiimbotPacket {
    const reader = new SequentialDataReader(buf);

    const minPacketSize =
      NiimbotPacket.HEAD.length +
      1 + // cmd
      1 + // dataLen
      1 + // checksum
      NiimbotPacket.TAIL.length;

    if (buf.length < minPacketSize) {
      throw new Error(`Packet is too small (${buf.length} < ${minPacketSize})`);
    }

    Validators.u8ArraysEqual(reader.readBytes(NiimbotPacket.HEAD.length), NiimbotPacket.HEAD, "Invalid packet head");

    const cmd = reader.readU8();
    const dataLen = reader.readU8();

    if (buf.length !== minPacketSize + dataLen) {
      throw new Error(`Invalid packet size (${buf.length} < ${minPacketSize + dataLen})`);
    }

    const data = reader.readBytes(dataLen);
    const checksum = reader.readU8();

    Validators.u8ArraysEqual(reader.readBytes(NiimbotPacket.TAIL.length), NiimbotPacket.TAIL, "Invalid packet tail");

    reader.end();

    const packet = new NiimbotPacket(cmd, data);

    if (packet.checksum !== checksum) {
      throw new Error(`Invalid packet checksum (${packet.checksum} !== ${checksum})`);
    }

    return packet;
  }

  public static fromHex(hex: string): NiimbotPacket {
    return NiimbotPacket.fromBytes(Utils.hexToBuf(hex));
  }
}

/**
 * NIIMBOT packet object with a 16-bit data length.
 *
 * Used by grayscale row packets (`0x8D`) whose payload can exceed 255 bytes.
 * Checksum is XOR over command, both length bytes, and data.
 *
 * @category Packets
 */
export class NiimbotPacket16 extends NiimbotPacket {
  public override get length(): number {
    return (
      NiimbotPacket.HEAD.length + // head
      1 + // cmd
      2 + // dataLength
      this.dataLength +
      1 + // checksum
      NiimbotPacket.TAIL.length
    );
  }

  public override get checksum(): number {
    let checksum = 0;
    checksum ^= this._command;
    checksum ^= (this._data.length >> 8) & 0xff;
    checksum ^= this._data.length & 0xff;
    this._data.forEach((i: number) => (checksum ^= i));
    return checksum;
  }

  /** [0x55, 0x55, CMD, DATA_LEN_HI, DATA_LEN_LO, DA =//= TA, CHECKSUM, 0xAA, 0xAA] */
  public override toBytes(): Uint8Array {
    if (this._data.length > 0xffff) {
      throw new Error(`Packet data is too large for 16-bit length (${this._data.length} > 65535)`);
    }

    const buf = new ArrayBuffer(this.length);
    const arr = new Uint8Array(buf);

    let pos = 0;

    arr.set(NiimbotPacket.HEAD, pos);
    pos += NiimbotPacket.HEAD.length;

    arr[pos] = this._command;
    pos += 1;

    arr[pos] = (this._data.length >> 8) & 0xff;
    pos += 1;
    arr[pos] = this._data.length & 0xff;
    pos += 1;

    arr.set(this._data, pos);
    pos += this._data.length;

    arr[pos] = this.checksum;
    pos += 1;

    arr.set(NiimbotPacket.TAIL, pos);

    return arr;
  }

  public static override fromBytes(buf: Uint8Array): NiimbotPacket16 {
    const reader = new SequentialDataReader(buf);

    const minPacketSize =
      NiimbotPacket.HEAD.length +
      1 + // cmd
      2 + // dataLen
      1 + // checksum
      NiimbotPacket.TAIL.length;

    if (buf.length < minPacketSize) {
      throw new Error(`Packet is too small (${buf.length} < ${minPacketSize})`);
    }

    Validators.u8ArraysEqual(reader.readBytes(NiimbotPacket.HEAD.length), NiimbotPacket.HEAD, "Invalid packet head");

    const cmd = reader.readU8();
    const dataLen = reader.readU16();

    if (buf.length !== minPacketSize + dataLen) {
      throw new Error(`Invalid packet size (${buf.length} !== ${minPacketSize + dataLen})`);
    }

    const data = reader.readBytes(dataLen);
    const checksum = reader.readU8();

    Validators.u8ArraysEqual(reader.readBytes(NiimbotPacket.TAIL.length), NiimbotPacket.TAIL, "Invalid packet tail");

    reader.end();

    const packet = new NiimbotPacket16(cmd, data);

    if (packet.checksum !== checksum) {
      throw new Error(`Invalid packet checksum (${packet.checksum} !== ${checksum})`);
    }

    return packet;
  }

  public static override fromHex(hex: string): NiimbotPacket16 {
    return NiimbotPacket16.fromBytes(Utils.hexToBuf(hex));
  }
}

/**
 * NIIMBOT packet object with a 32-bit data length.
 *
 * Used by compressed image packets (`0xA7`) whose payload can be larger than 65535 bytes.
 * Checksum is XOR over command, all four length bytes, and data.
 *
 * @category Packets
 */
export class NiimbotPacket32 extends NiimbotPacket {
  public override get length(): number {
    return (
      NiimbotPacket.HEAD.length + // head
      1 + // cmd
      4 + // dataLength
      this.dataLength +
      1 + // checksum
      NiimbotPacket.TAIL.length
    );
  }

  public override get checksum(): number {
    let checksum = 0;
    checksum ^= this._command;
    checksum ^= (this._data.length >>> 24) & 0xff;
    checksum ^= (this._data.length >>> 16) & 0xff;
    checksum ^= (this._data.length >>> 8) & 0xff;
    checksum ^= this._data.length & 0xff;
    this._data.forEach((i: number) => (checksum ^= i));
    return checksum;
  }

  /** [0x55, 0x55, CMD, DATA_LEN_3, DATA_LEN_2, DATA_LEN_1, DATA_LEN_0, DA =//= TA, CHECKSUM, 0xAA, 0xAA] */
  public override toBytes(): Uint8Array {
    if (this._data.length > 0xffffffff) {
      throw new Error(`Packet data is too large for 32-bit length (${this._data.length} > 4294967295)`);
    }

    const buf = new ArrayBuffer(this.length);
    const arr = new Uint8Array(buf);

    let pos = 0;

    arr.set(NiimbotPacket.HEAD, pos);
    pos += NiimbotPacket.HEAD.length;

    arr[pos] = this._command;
    pos += 1;

    arr[pos] = (this._data.length >>> 24) & 0xff;
    pos += 1;
    arr[pos] = (this._data.length >>> 16) & 0xff;
    pos += 1;
    arr[pos] = (this._data.length >>> 8) & 0xff;
    pos += 1;
    arr[pos] = this._data.length & 0xff;
    pos += 1;

    arr.set(this._data, pos);
    pos += this._data.length;

    arr[pos] = this.checksum;
    pos += 1;

    arr.set(NiimbotPacket.TAIL, pos);

    return arr;
  }

  public static override fromBytes(buf: Uint8Array): NiimbotPacket32 {
    const reader = new SequentialDataReader(buf);

    const minPacketSize =
      NiimbotPacket.HEAD.length +
      1 + // cmd
      4 + // dataLen
      1 + // checksum
      NiimbotPacket.TAIL.length;

    if (buf.length < minPacketSize) {
      throw new Error(`Packet is too small (${buf.length} < ${minPacketSize})`);
    }

    Validators.u8ArraysEqual(reader.readBytes(NiimbotPacket.HEAD.length), NiimbotPacket.HEAD, "Invalid packet head");

    const cmd = reader.readU8();
    const dataLen = reader.readU32();

    if (buf.length !== minPacketSize + dataLen) {
      throw new Error(`Invalid packet size (${buf.length} !== ${minPacketSize + dataLen})`);
    }

    const data = reader.readBytes(dataLen);
    const checksum = reader.readU8();

    Validators.u8ArraysEqual(reader.readBytes(NiimbotPacket.TAIL.length), NiimbotPacket.TAIL, "Invalid packet tail");

    reader.end();

    const packet = new NiimbotPacket32(cmd, data);

    if (packet.checksum !== checksum) {
      throw new Error(`Invalid packet checksum (${packet.checksum} !== ${checksum})`);
    }

    return packet;
  }

  public static override fromHex(hex: string): NiimbotPacket32 {
    return NiimbotPacket32.fromBytes(Utils.hexToBuf(hex));
  }
}

/**
 * NIIMBOT packet object with CRC32 checksum. Used in firmware process.
 *
 * @category Packets
 */
export class NiimbotCrc32Packet extends NiimbotPacket {
  private _chunkNumber: number;

  constructor(
    command: RequestCommandId | ResponseCommandId,
    chunkNumber: RequestCommandId | ResponseCommandId,
    data: Uint8Array | number[],
    validResponseIds: ResponseCommandId[] = [],
  ) {
    super(command, data, validResponseIds);
    this._chunkNumber = chunkNumber;
  }

  public get chunkNumber(): number {
    return this._chunkNumber;
  }

  /** Calculate CRC checksum from command and data */
  public override get checksum(): number {
    const data = [this._command, ...Utils.u16ToBytes(this._chunkNumber), this._data.length, ...this._data];
    return CRC32.buf(data) >>> 0; // convert to unsigned
  }

  public static override fromBytes(buf: Uint8Array): NiimbotCrc32Packet {
    const reader = new SequentialDataReader(buf);

    const minPacketSize =
      NiimbotPacket.HEAD.length +
      1 + // cmd
      2 + // chunkNumber
      1 + // dataLen
      4 + // checksum
      NiimbotPacket.TAIL.length;

    if (buf.length < minPacketSize) {
      throw new Error(`Packet is too small (${buf.length} < ${minPacketSize})`);
    }

    Validators.u8ArraysEqual(reader.readBytes(NiimbotPacket.HEAD.length), NiimbotPacket.HEAD, "Invalid packet head");

    const cmd = reader.readU8();
    const chunkNumber = reader.readU16();
    const dataLen = reader.readU8();

    if (buf.length !== minPacketSize + dataLen) {
      throw new Error(`Invalid packet size (${buf.length} < ${minPacketSize + dataLen})`);
    }

    const data = reader.readBytes(dataLen);
    const checksum = reader.readU32();

    Validators.u8ArraysEqual(reader.readBytes(NiimbotPacket.TAIL.length), NiimbotPacket.TAIL, "Invalid packet tail");

    reader.end();

    const packet = new NiimbotCrc32Packet(cmd, chunkNumber, data);

    if (packet.checksum !== checksum) {
      throw new Error(`Invalid packet checksum (${packet.checksum} !== ${checksum})`);
    }

    return packet;
  }

  /** [0x55, 0x55, CMD, CHUNK_NUMBER, DATA_SIZE, DA =//= TA, CRC32_CHECKSUM, 0xAA, 0xAA] */
  public override toBytes(): Uint8Array {
    const buf = new ArrayBuffer(
      NiimbotPacket.HEAD.length + // head
        1 + // cmd
        2 + // chunkNumber
        1 + // dataLength
        this._data.length +
        4 + // checksum
        NiimbotPacket.TAIL.length,
    );

    const arr = new Uint8Array(buf);

    let pos = 0;

    arr.set(NiimbotPacket.HEAD, pos);
    pos += NiimbotPacket.HEAD.length;

    arr[pos] = this._command;
    pos += 1;

    const [h, l] = Utils.u16ToBytes(this._chunkNumber);
    arr[pos] = h;
    pos += 1;
    arr[pos] = l;
    pos += 1;

    arr[pos] = this._data.length;
    pos += 1;

    arr.set(this._data, pos);
    pos += this._data.length;

    const crc = this.checksum;
    arr[pos] = (crc >> 24) & 0xff;
    pos += 1;
    arr[pos] = (crc >> 16) & 0xff;
    pos += 1;
    arr[pos] = (crc >> 8) & 0xff;
    pos += 1;
    arr[pos] = crc & 0xff;
    pos += 1;

    arr.set(NiimbotPacket.TAIL, pos);

    return arr;
  }

  public static override fromHex(hex: string): NiimbotCrc32Packet {
    return NiimbotCrc32Packet.fromBytes(Utils.hexToBuf(hex));
  }
}
