/* eslint-disable @typescript-eslint/no-floating-promises */
import { test, describe, before } from "node:test";
import { strictEqual } from "node:assert";
import { NiimbotCrc32Packet, ResponseCommandId } from "../packets";

describe("Test parse In_RequestFirmwareChunk (CRC32)", () => {
  let pkt: NiimbotCrc32Packet;

  before(() => {
    pkt = NiimbotCrc32Packet.fromHex("55 55 9a 00 01 01 01 32 4a a3 4c aa aa");
  });

  test("command", () => strictEqual(pkt.command, ResponseCommandId.In_RequestFirmwareChunk));
  test("dataLength", () => strictEqual(pkt.dataLength, 1));
  test("chunkNumber", () => strictEqual(pkt.chunkNumber, 1));
});

describe("Test parse In_FirmwareResult (CRC32)", () => {
  let pkt: NiimbotCrc32Packet;

  before(() => {
    pkt = NiimbotCrc32Packet.fromHex("55 55 9e 00 00 01 00 b1 0f 5f 2d aa aa");
  });

  test("command", () => strictEqual(pkt.command, ResponseCommandId.In_FirmwareResult));
  test("dataLength", () => strictEqual(pkt.dataLength, 1));
  test("chunkNumber", () => strictEqual(pkt.chunkNumber, 0));
  test("data", () => strictEqual(pkt.data[0], 0));
});
