import { test } from "node:test";
import { match } from "node:assert";
import { NiimbotPacket, PacketParser } from "..";

// todo: add printer model to version parsing

// >> 03 5555 c1 01 01 c1 aaaa Connect 1b (status=OK)
// << 5555 c2 01 02 c1 aaaa In_Connect 1b
// >> 5555 40 01 08 49 aaaa PrinterInfo 1b (type=PrinterModelId)
// << 5555 48 02 0900 43 aaaa In_PrinterInfoPrinterCode 2b (modelId=2304)
// >> 5555 40 01 0c 4d aaaa PrinterInfo 1b (type=HardWareVersion)
// << 5555 4c 02 051e 55 aaaa In_PrinterInfoHardWareVersion 2b
// >> 5555 40 01 09 48 aaaa PrinterInfo 1b (type=SoftWareVersion)
// << 5555 49 02 051e 50 aaaa In_PrinterInfoSoftWareVersion 2b


test("Parse D110 hardware version", () => {
  const pkt = NiimbotPacket.fromHex("5555 4c 02 051e 55 aaaa");
  match(PacketParser.parsePrinterVersionResponse(pkt), /13\.10/);
});

test("Parse D110 software version", () => {
  const pkt = NiimbotPacket.fromHex("5555 49 02 051e 50 aaaa");
  match(PacketParser.parsePrinterVersionResponse(pkt), /13\.10/);
});

// >> 035555c10101c1aaaa
// >> 035555c10101c1aaaa
// << 5555c20102c1aaaa
// >> 035555c10101c1aaaa
// << 5555c20102c1aaaa
// << 5555c20102c1aaaa
// << 5555c20102c1aaaa
// >> 555540010849aaaa555540010849aaaa
// << 55554802090043aaaa
// << 55554802090043aaaa
// >> 5555dc0101dcaaaa
// << 5555dd0a1024006500653251010485aaaa
// >> 555540010c4daaaa
// << 55554c02051e55aaaa
// >> 555540010948aaaa
// << 55554902051e50aaaa

test("Parse B21S hardware version", () => {
  const pkt = NiimbotPacket.fromHex("55554c02280a6caaaa");
  match(PacketParser.parsePrinterVersionResponse(pkt), /40\.10/);
});

test("Parse B21S software version", () => {
  const pkt = NiimbotPacket.fromHex("55554902281c7faaaa");
  match(PacketParser.parsePrinterVersionResponse(pkt), /40\.28/);
});


// >> 03 5555 c1 01 01 c1 aaaa Connect 1b (status=OK)
// << 5555 c2 01 03 c0 aaaa In_Connect 1b
// >> 5555 40 01 08 49 aaaa PrinterInfo 1b (type=PrinterModelId)
// << 5555 48 02 0106 4d aaaa In_PrinterInfoPrinterCode 2b (modelId=262)
// >> 5555 40 01 0c 4d aaaa PrinterInfo 1b (type=HardWareVersion)
// << 5555 4c 02 2501 6a aaaa In_PrinterInfoHardWareVersion 2b
// >> 5555 40 01 09 48 aaaa PrinterInfo 1b (type=SoftWareVersion)
// << 5555 49 02 2507 69 aaaa In_PrinterInfoSoftWareVersion 2b


test("Parse B3S hardware version", () => {
  const pkt = NiimbotPacket.fromHex("5555 4c 02 2501 6a aaaa");
  match(PacketParser.parsePrinterVersionResponse(pkt), /37\.01/);
});

test("Parse B3S software version", () => {
  const pkt = NiimbotPacket.fromHex("5555 49 02 2507 69 aaaa");
  match(PacketParser.parsePrinterVersionResponse(pkt), /37\.07/);
});
