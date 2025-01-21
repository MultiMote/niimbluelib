import { firmwareExchangePackets, NiimbotCrc32Packet, NiimbotPacket } from ".";
import { Utils } from "../utils";

/**
 * Packet parsers.
 *
 * @category Packets
 **/
export class PacketParser {
  /**
   * Parse raw data containing one or more packets.
   *
   * For example, `55554a01044faaaa5555f60101f6aaaa` will be converted to the two NiimbotPackets.
   *
   * @param buf bytes
   * @returns list of packet objects
   */
  public static parsePacketBundle(buf: Uint8Array): NiimbotPacket[] {
    type PacketClass = typeof NiimbotPacket | typeof NiimbotCrc32Packet;
    type ChunkType = { cls: typeof NiimbotPacket | typeof NiimbotCrc32Packet; raw: Uint8Array };
    const chunks: ChunkType[] = [];
    const bufLength: number = buf.byteLength;

    while (buf.byteLength > 0) {
      if (!Utils.hasSubarrayAtPos(buf, NiimbotPacket.HEAD, 0)) {
        break;
      }

      if (buf.byteLength < 3) {
        break;
      }

      const cmd: number = buf[2];
      let cls: PacketClass = NiimbotPacket;

      let sizePos: number = 3;
      let crcSize: number = 1;
      //  0  1  2  3  4  5  6  7
      // -----------------------
      // 55 55 4a 01 04 4f aa aa
      //           |     |
      //          size  crc

      if (firmwareExchangePackets.rx.includes(cmd) || firmwareExchangePackets.tx.includes(cmd)) {
        cls = NiimbotCrc32Packet;
        sizePos = 5;
        crcSize = 4;
        //  0  1  2  3  4  5  6  7  8  9 10 11 12
        // --------------------------------------
        // 55 55 9a 00 80 01 01 d2 bd d2 fb aa aa
        //                 |    |---------|
        //                size      crc
      }

      if (buf.byteLength <= sizePos) {
        break;
      }

      const size: number = buf[sizePos];

      if (buf.byteLength <= sizePos + size + crcSize + NiimbotPacket.TAIL.byteLength) {
        break;
      }

      const tailPos: number = sizePos + size + crcSize + 1;

      if (!Utils.hasSubarrayAtPos(buf, NiimbotPacket.TAIL, tailPos)) {
        console.warn("Invalid tail");
        break;
      }

      let tailEnd: number = tailPos + NiimbotPacket.TAIL.byteLength;

      chunks.push({ cls, raw: buf.slice(0, tailEnd) });

      // Cut form start
      buf = buf.slice(tailEnd);
    }

    const chunksDataLen: number = chunks.reduce((acc: number, c: ChunkType) => acc + c.raw.length, 0);

    if (bufLength !== chunksDataLen) {
      throw new Error(`Splitted chunks data length not equals buffer length (${bufLength} !== ${chunksDataLen})`);
    }

    return chunks.map((c) => c.cls.fromBytes(c.raw));
  }
}
