/* eslint-disable @typescript-eslint/no-floating-promises */
import { test, describe, before } from "node:test";
import { strictEqual } from "node:assert";
import {
  NiimbotCrc32Packet,
  NiimbotPacket,
  NiimbotPacket16,
  PacketParser,
  RequestCommandId,
  ResponseCommandId,
} from "../packets";
import { Utils } from "../utils";

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

describe("Test parse PrintBitmapRowGray (NiimbotPacket16)", () => {
  let pkt: NiimbotPacket16;

  before(() => {
    pkt = NiimbotPacket16.fromHex("5555 8d 0013 86017c0108fe001c01fe0424050000fff00000 5b aaaa");
  });

  test("command", () => strictEqual(pkt.command, RequestCommandId.PrintBitmapRowGray));
  test("dataLength", () => strictEqual(pkt.dataLength, 19));
  test("data", () => strictEqual(pkt.data[0], 0x86));
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
