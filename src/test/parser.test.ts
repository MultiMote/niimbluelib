/* eslint-disable @typescript-eslint/no-floating-promises */
import { test, describe, before } from "node:test";
import { deepStrictEqual, strictEqual, throws } from "node:assert";
import {
  NiimbotCrc32Packet,
  NiimbotPacket,
  NiimbotPacket16,
  PacketParser,
  RequestCommandId,
  ResponseCommandId,
} from "../packets";
import { Utils } from "../utils";

const bytes = (data: Uint8Array | number[]): number[] => Array.from(data);

describe("Test parse In_RequestFirmwareChunk (NiimbotCrc32Packet)", () => {
  let pkt: NiimbotCrc32Packet;

  before(() => {
    pkt = NiimbotCrc32Packet.fromHex("55 55 9a 00 01 01 01 32 4a a3 4c aa aa");
  });

  test("command", () => strictEqual(pkt.command, ResponseCommandId.In_RequestFirmwareChunk));
  test("dataLength", () => strictEqual(pkt.dataLength, 1));
  test("chunkNumber", () => strictEqual(pkt.chunkNumber, 1));
});

describe("Test parse In_FirmwareResult (NiimbotCrc32Packet)", () => {
  let pkt: NiimbotCrc32Packet;

  before(() => {
    pkt = NiimbotCrc32Packet.fromHex("55 55 9e 00 00 01 00 b1 0f 5f 2d aa aa");
  });

  test("command", () => strictEqual(pkt.command, ResponseCommandId.In_FirmwareResult));
  test("dataLength", () => strictEqual(pkt.dataLength, 1));
  test("chunkNumber", () => strictEqual(pkt.chunkNumber, 0));
  test("data", () => strictEqual(pkt.data[0], 0));
});

describe("Test PrintBitmapRowGray (NiimbotPacket16)", () => {
  test("parses a 16-bit length packet", () => {
    const pkt = NiimbotPacket16.fromHex("55 55 8d 00 05 84 00 04 02 00 0a aa aa");

    strictEqual(pkt.command, RequestCommandId.PrintBitmapRowGray);
    strictEqual(pkt.dataLength, 5);
    deepStrictEqual(bytes(pkt.data), [0x84, 0x00, 0x04, 0x02, 0x00]);
    strictEqual(pkt.length, 13);
    deepStrictEqual(bytes(pkt.toBytes()), [0x55, 0x55, 0x8d, 0x00, 0x05, 0x84, 0x00, 0x04, 0x02, 0x00, 0x0a, 0xaa, 0xaa]);
  });

  test("uses both length bytes in the checksum and framing", () => {
    const data = new Uint8Array(300);
    const pkt = new NiimbotPacket16(RequestCommandId.PrintBitmapRowGray, data);
    const raw = pkt.toBytes();

    strictEqual(raw.length, 308);
    strictEqual(raw[3], 0x01);
    strictEqual(raw[4], 0x2c);
    // 0x8d ^ 0x01 ^ 0x2c ^ (300 zero bytes)
    strictEqual(raw[305], 0xa0);

    const parsed = NiimbotPacket16.fromBytes(raw);
    strictEqual(parsed.command, RequestCommandId.PrintBitmapRowGray);
    strictEqual(parsed.dataLength, 300);
    deepStrictEqual(bytes(parsed.data), bytes(data));
  });

  test("rejects data larger than 16 bits", () => {
    const pkt = new NiimbotPacket16(RequestCommandId.PrintBitmapRowGray, new Uint8Array(0x10000));
    throws(() => pkt.toBytes(), /too large for 16-bit length/);
  });
});

describe("Test parse bundle", () => {
  let pkts: NiimbotPacket[];

  before(() => {
    const data = Utils.hexToBuf(`
      5555 59 01 01 59 aaaa
      55 55 9e 00 00 01 00 b1 0f 5f 2d aa aa
      55 55 9a 00 01 01 01 32 4a a3 4c aa aa
      5555 8d 00 1386017c0108fe001c01fe0424050000fff00000 5b aaaa
      5555 a3 01 01 a3 aaaa
    `);
    pkts = PacketParser.parsePacketBundle(data);
  });

  test("count", () => strictEqual(pkts.length, 5));
  test("classes", () =>
    strictEqual(
      pkts.map((o) => o.constructor.name).join(" "),
      "NiimbotPacket NiimbotCrc32Packet NiimbotCrc32Packet NiimbotPacket16 NiimbotPacket",
    ));
});
