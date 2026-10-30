import { test, describe } from "node:test";
import { deepStrictEqual, strictEqual, throws } from "node:assert";
import {
  NiimbotPacket32,
  PacketGenerator,
  PageColorType,
  RequestCommandId,
  ResponseCommandId,
} from "../packets";
import { EncodedImage, lzo1xCompress, lzo1xDecompress } from "../utils";

const bytes = (data: Uint8Array | number[]): number[] => Array.from(data);

function makePseudoRandom(length: number, seed: number): Uint8Array {
  const data = new Uint8Array(length);
  let state = seed >>> 0;

  for (let i = 0; i < length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    data[i] = state >>> 24;
  }

  return data;
}

describe("LZO1X", () => {
  test("round-trips empty and short inputs", () => {
    for (const data of [new Uint8Array(0), new Uint8Array([1]), new Uint8Array([1, 2, 3, 4, 5])]) {
      const compressed = lzo1xCompress(data);
      deepStrictEqual(bytes(lzo1xDecompress(compressed, data.length)), bytes(data));
    }
  });

  test("round-trips zero, repeated and pseudo-random data", () => {
    const cases = [
      new Uint8Array(100),
      new Uint8Array(100).fill(0x55),
      makePseudoRandom(100, 1),
      makePseudoRandom(1000, 2),
      makePseudoRandom(10000, 3),
      makePseudoRandom(100000, 4),
    ];

    for (const data of cases) {
      const compressed = lzo1xCompress(data);
      deepStrictEqual(bytes(lzo1xDecompress(compressed, data.length)), bytes(data));
    }
  });

  test("round-trips long runs that need extended match lengths", () => {
    const data = new Uint8Array(50000);

    for (let i = 0; i < data.length; i++) {
      data[i] = i % 13;
    }

    const compressed = lzo1xCompress(data);
    deepStrictEqual(bytes(lzo1xDecompress(compressed, data.length)), bytes(data));
  });

  test("decompresses a stream produced by native liblzo2", () => {
    const input = new Uint8Array(96);

    for (let i = 0; i < input.length; i++) {
      input[i] = i < 32 ? 0 : i < 64 ? i & 0x0f : 0x55;
    }

    const compressed = Uint8Array.from(
      Buffer.from(
        "0200000000003a10000d0102030405060708090a0b0c0d0e0f002d3d00552a0000000155555555555555555555555555555555555555110000",
        "hex",
      ),
    );

    deepStrictEqual(bytes(lzo1xDecompress(compressed, input.length)), bytes(input));
  });

  test("rejects malformed streams", () => {
    throws(() => lzo1xDecompress(new Uint8Array([0x11])), /too short/);
    throws(() => lzo1xDecompress(new Uint8Array([0x11, 0x00])), /too short/);
    throws(() => lzo1xDecompress(new Uint8Array([0x00, 0x01, 0x00])), /unexpected end|invalid/);
    throws(() => lzo1xDecompress(Uint8Array.from([0x11, 0x00, 0x00, 0x00])), /trailing/);
    throws(() => lzo1xDecompress(Uint8Array.from([0x11, 0x00, 0x00]), 1), /does not match/);
  });

  test("rejects an invalid lookbehind reference", () => {
    // Literal run of 1 byte, then an M1 match that points before the output start.
    throws(() => lzo1xDecompress(Uint8Array.from([0x12, 0x00, 0x00, 0x01])), /lookbehind/);
  });
});

describe("NiimbotPacket32", () => {
  test("frames and checksums a 32-bit length packet", () => {
    const packet = new NiimbotPacket32(RequestCommandId.PrintBitmapRowCompressed, [0x00, 0x03, 0xde, 0xad]);
    const raw = packet.toBytes();

    strictEqual(packet.length, 14);
    deepStrictEqual(bytes(raw), [
      0x55, 0x55, 0xa7,
      0x00, 0x00, 0x00, 0x04,
      0x00, 0x03, 0xde, 0xad,
      // 0xa7 ^ 0x00 ^ 0x00 ^ 0x00 ^ 0x04 ^ 0x00 ^ 0x03 ^ 0xde ^ 0xad
      0xd3,
      0xaa, 0xaa,
    ]);

    const parsed = NiimbotPacket32.fromBytes(raw);
    strictEqual(parsed.command, RequestCommandId.PrintBitmapRowCompressed);
    deepStrictEqual(bytes(parsed.data), [0x00, 0x03, 0xde, 0xad]);
  });

  test("round-trips data larger than 16 bits", () => {
    const data = new Uint8Array(70000);

    for (let i = 0; i < data.length; i++) {
      data[i] = i & 0xff;
    }

    const packet = new NiimbotPacket32(RequestCommandId.PrintBitmapRowCompressed, data);
    const raw = packet.toBytes();

    strictEqual(raw.length, data.length + 10);
    deepStrictEqual(bytes(raw.subarray(3, 7)), [0x00, 0x01, 0x11, 0x70]);

    const parsed = NiimbotPacket32.fromBytes(raw);
    deepStrictEqual(bytes(parsed.data), bytes(data));
  });

  test("rejects a bad checksum", () => {
    const raw = new NiimbotPacket32(RequestCommandId.PrintBitmapRowCompressed, [1, 2, 3]).toBytes();
    raw[raw.length - 3] ^= 0xff;

    throws(() => NiimbotPacket32.fromBytes(raw), /checksum/);
  });
});

describe("Compressed grayscale packets", () => {
  test("generates a 0xA7 packet with a chunk index and LZO payload", () => {
    const compressed = lzo1xCompress(new Uint8Array([1, 2, 3, 4]));
    const packet = PacketGenerator.printBitmapRowCompressed(3, compressed);

    strictEqual(packet.command, RequestCommandId.PrintBitmapRowCompressed);
    deepStrictEqual(packet.validResponseIds, [ResponseCommandId.In_GetCompress]);
    deepStrictEqual(bytes(packet.data.subarray(0, 2)), [0x00, 0x03]);
    deepStrictEqual(bytes(packet.data.subarray(2)), bytes(compressed));
  });

  test("chunks full-width grayscale rows like the official SDK", () => {
    const rowBytes = 576 / 2;
    const rowData = new Uint8Array(rowBytes);

    for (let i = 0; i < rowBytes; i++) {
      rowData[i] = (i * 7) & 0xff;
    }

    const image: EncodedImage = {
      pageColor: PageColorType.MultiorderColor,
      cols: 576,
      rows: 944,
      rowsData: [
        {
          dataType: "pixels",
          rowNumber: 0,
          repeat: 944,
          blackPixelsCount: 0,
          redPixelsCount: 0,
          rowDataGray: rowData,
        },
      ],
    };

    const packets = PacketGenerator.writeImageDataGrayCompressed(image, 25600);

    strictEqual(packets.length, 11);

    for (let i = 0; i < packets.length; i++) {
      const expectedRows = i === 10 ? 64 : 88;
      const expectedLength = expectedRows * rowBytes;
      const packet = packets[i];

      strictEqual(packet.command, RequestCommandId.PrintBitmapRowCompressed);
      deepStrictEqual(bytes(packet.data.subarray(0, 2)), [0x00, i]);

      const decompressed = lzo1xDecompress(packet.data.subarray(2), expectedLength);
      const expected = new Uint8Array(expectedLength);

      for (let row = 0; row < expectedRows; row++) {
        expected.set(rowData, row * rowBytes);
      }

      deepStrictEqual(bytes(decompressed), bytes(expected));
    }
  });

  test("sends white rows as zero-filled compressed data", () => {
    const image: EncodedImage = {
      pageColor: PageColorType.MultiorderColor,
      cols: 8,
      rows: 2,
      rowsData: [
        {
          dataType: "void",
          rowNumber: 0,
          repeat: 2,
          blackPixelsCount: 0,
          redPixelsCount: 0,
        },
      ],
    };

    const packets = PacketGenerator.writeImageDataGrayCompressed(image, 8);

    strictEqual(packets.length, 1);
    deepStrictEqual(bytes(lzo1xDecompress(packets[0].data.subarray(2), 8)), new Array(8).fill(0));
  });

  test("splits chunks at row boundaries", () => {
    const image: EncodedImage = {
      pageColor: PageColorType.MultiorderColor,
      cols: 8,
      rows: 5,
      rowsData: [
        {
          dataType: "pixels",
          rowNumber: 0,
          repeat: 5,
          blackPixelsCount: 0,
          redPixelsCount: 0,
          rowDataGray: new Uint8Array([0x11, 0x22, 0x33, 0x44]),
        },
      ],
    };

    const packets = PacketGenerator.writeImageDataGrayCompressed(image, 8);

    strictEqual(packets.length, 3);
    strictEqual(lzo1xDecompress(packets[0].data.subarray(2), 8).length, 8);
    strictEqual(lzo1xDecompress(packets[1].data.subarray(2), 8).length, 8);
    strictEqual(lzo1xDecompress(packets[2].data.subarray(2), 4).length, 4);
  });

  test("rejects missing rows and invalid chunk sizes", () => {
    const image: EncodedImage = {
      pageColor: PageColorType.MultiorderColor,
      cols: 8,
      rows: 2,
      rowsData: [
        {
          dataType: "pixels",
          rowNumber: 0,
          repeat: 1,
          blackPixelsCount: 0,
          redPixelsCount: 0,
          rowDataGray: new Uint8Array(4),
        },
      ],
    };

    throws(() => PacketGenerator.writeImageDataGrayCompressed(image, 8), /expected 2/);
    throws(() => PacketGenerator.writeImageDataGrayCompressed(image, 0), /positive integer/);
    throws(() => PacketGenerator.writeImageDataGrayCompressed(image, 1.5), /positive integer/);
  });
});
