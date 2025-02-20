import { Utils, NiimbotPacket, RequestCommandId, ResponseCommandId, PacketParser } from "../dist/index.js";
import fs from "fs";

// usage: npm run parse-text-dump <path> [data | min | min-out | print-task]
//
// input file example:
//
// >> 555540010849AAAA
// << 55554801024BAAAA
// >> 555540010948AAAA
// << 55554902016822AAAA

const path = process.argv[2];
const display = process.argv.length > 3 ? process.argv[3] : "";
const data = fs.readFileSync(path, "utf8");

const lines = data.split(/\r?\n/);
let printStarted = false;

for (const line of lines) {
  const splitted = line.split(" ");

  if (splitted.length !== 2) {
    continue;
  }

  let [direction, hexData] = splitted;

  let comment = "";

  try {
    const data = Utils.hexToBuf(hexData.startsWith("03") ? hexData.substring(2) : hexData);
    const packets = PacketParser.parsePacketBundle(data);

    if (packets.length === 0) {
      comment = "Parse error (no packets found)";
    } else if (packets.length > 1) {
      comment = `Multi-packet (x${packets.length}); `;
    }

    for (const packet of packets) {
      if (direction === ">>") {
        comment += RequestCommandId[packet.command] ?? "???";
        if (packet.command === RequestCommandId.PrintStart) {
          printStarted = true;
          const versions = { 1: "v1", 2: "v3", 7: "v4", 8: "v5" };
          comment += "_" + versions[packet.dataLength];
        } else if (packet.command === RequestCommandId.SetPageSize) {
          const versions = { 2: "v1", 4: "v2", 6: "v3", 8: "v5" };
          comment += "_" + versions[packet.dataLength];
        } else if (packet.command === RequestCommandId.PrintEnd) {
          printStarted = false;
        }
      } else {
        comment += ResponseCommandId[packet.command] ?? "???";
      }
      if (display === "data") {
        comment += `(${packet.dataLength}: ${Utils.bufToHex(packet.data)}); `;
      } else {
        comment += `(${packet.dataLength}); `;
      }
    }
  } catch (e) {
    comment = "Invalid packet";
  }

  if (display === "min") {
    console.log(`${direction} ${comment}`);
  } else if (display === "min-out") {
    if (direction === ">>") {
      console.log(`${direction} ${comment}`);
    }
  } else if (display === "print-task") {
    if (direction === ">>" && printStarted) {
      console.log(`${direction} ${comment}`);
    }
  } else {
    console.log(`${direction} ${hexData}\t// ${comment}`);
  }
}
