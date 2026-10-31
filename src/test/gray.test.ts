/* eslint-disable @typescript-eslint/no-floating-promises */
import { test, describe } from "node:test";
import { deepStrictEqual, strictEqual, throws } from "node:assert";
import {
  NiimbotPacket16,
  PacketGenerator,
  PageColorType,
  RequestCommandId,
} from "../packets";
import { EncodedImage, ImageEncoder, ImageSource } from "../utils";

class SolidImageSource implements ImageSource {
  constructor(
    private readonly color: number,
    public readonly width: number,
    public readonly height: number,
  ) {}

  getPixelColor(): number {
    return this.color;
  }
}

const bytes = (data: Uint8Array | number[]): number[] => Array.from(data);

describe("NiimbotPacket16", () => {
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

describe("Grayscale packet generator", () => {
  test("empty rows", () => {
    const pkt = PacketGenerator.printGrayEmptyRows(4, 2);

    strictEqual(pkt.command, RequestCommandId.PrintBitmapRowGray);
    strictEqual(pkt.oneWay, true);
    deepStrictEqual(bytes(pkt.data), [0x84, 0x00, 0x04, 0x02, 0x00]);
    deepStrictEqual(bytes(pkt.toBytes()), [0x55, 0x55, 0x8d, 0x00, 0x05, 0x84, 0x00, 0x04, 0x02, 0x00, 0x0a, 0xaa, 0xaa]);
  });

  test("row without runs", () => {
    const pkt = PacketGenerator.printGrayRow(0x0102, 1, new Uint8Array([0x12, 0x34, 0x56, 0x78]));

    strictEqual(pkt.command, RequestCommandId.PrintBitmapRowGray);
    strictEqual(pkt.oneWay, true);
    // 0x86, row (u16), repeat, runs byte count, runs..., data...
    deepStrictEqual(bytes(pkt.data), [0x86, 0x01, 0x02, 0x01, 0x00, 0x12, 0x34, 0x56, 0x78]);
  });

  test("row with a run of equal dots", () => {
    const pkt = PacketGenerator.printGrayRow(0, 1, new Uint8Array(16).fill(0x55));

    // 32 dots of level 5: one data byte plus a run descriptor (30 + 2, offset 0).
    deepStrictEqual(bytes(pkt.data), [0x86, 0x00, 0x00, 0x01, 0x02, 0x20, 0x00, 0x55]);
  });

  test("rejects invalid repeat counts", () => {
    throws(() => PacketGenerator.printGrayRow(0, 0, new Uint8Array([0])), /1\.\.255/);
    throws(() => PacketGenerator.printGrayRow(0, 256, new Uint8Array([0])), /1\.\.255/);
    throws(() => PacketGenerator.printGrayEmptyRows(0, 0), /1\.\.255/);
    throws(() => PacketGenerator.printGrayEmptyRows(0, 256), /1\.\.255/);
  });
});

describe("Grayscale image encoding", () => {
  test("converts colors to inverted luminance levels", () => {
    strictEqual(ImageEncoder.colorToGrayLevel(0xffffff), 0);
    strictEqual(ImageEncoder.colorToGrayLevel(0x000000), 15);
    strictEqual(ImageEncoder.colorToGrayLevel(0x808080), 7);
    strictEqual(ImageEncoder.colorToGrayLevel(0xff0000), 11);
    strictEqual(ImageEncoder.colorToGrayLevel(0x00ff00), 6);
    strictEqual(ImageEncoder.colorToGrayLevel(0x0000ff), 13);
  });

  test("packs two dots per byte, high nibble first", () => {
    const image = ImageEncoder.encode(
      new SolidImageSource(0x000000, 16, 1),
      PageColorType.Grayscale,
      "top",
    );

    strictEqual(image.pageColor, PageColorType.Grayscale);
    strictEqual(image.cols, 16);
    strictEqual(image.rows, 1);
    strictEqual(image.rowsData.length, 1);

    const row = image.rowsData[0];
    strictEqual(row.dataType, "pixels");
    strictEqual(row.grayPixelsCount, 16);
    deepStrictEqual(bytes(row.rowDataGray!), new Array(8).fill(0xff));
  });

  test("detects white rows as void", () => {
    const image = ImageEncoder.encode(
      new SolidImageSource(0xffffff, 16, 2),
      PageColorType.Grayscale,
      "top",
    );

    strictEqual(image.rowsData.length, 1);
    strictEqual(image.rowsData[0].dataType, "void");
    strictEqual(image.rowsData[0].repeat, 2);
    strictEqual(image.rowsData[0].rowDataGray, undefined);
  });

  test("dispatches Grayscale to the gray generator", () => {
    const image = ImageEncoder.encode(
      new SolidImageSource(0x000000, 8, 1),
      PageColorType.Grayscale,
      "top",
    );
    const packets = PacketGenerator.writeImageData(image);

    strictEqual(packets.length, 1);
    strictEqual(packets[0].command, RequestCommandId.PrintBitmapRowGray);
  });

  test("splits repeated rows into 255-row chunks", () => {
    const image: EncodedImage = {
      pageColor: PageColorType.Grayscale,
      cols: 2,
      rows: 300,
      rowsData: [
        {
          dataType: "pixels",
          rowNumber: 0,
          repeat: 300,
          blackPixelsCount: 0,
          redPixelsCount: 0,
          rowDataGray: new Uint8Array([0x00]),
        },
      ],
    };

    const packets = PacketGenerator.writeImageDataGray(image);

    strictEqual(packets.length, 2);
    deepStrictEqual(bytes(packets[0].data), [0x86, 0x00, 0x00, 0xff, 0x00, 0x00]);
    deepStrictEqual(bytes(packets[1].data), [0x86, 0x00, 0xff, 0x2d, 0x00, 0x00]);
  });

  test("splits repeated empty rows into 255-row chunks", () => {
    const image: EncodedImage = {
      pageColor: PageColorType.Grayscale,
      cols: 2,
      rows: 300,
      rowsData: [
        {
          dataType: "void",
          rowNumber: 0,
          repeat: 300,
          blackPixelsCount: 0,
          redPixelsCount: 0,
        },
      ],
    };

    const packets = PacketGenerator.writeImageDataGray(image);

    strictEqual(packets.length, 2);
    deepStrictEqual(bytes(packets[0].data), [0x84, 0x00, 0x00, 0xff, 0x00]);
    deepStrictEqual(bytes(packets[1].data), [0x84, 0x00, 0xff, 0x2d, 0x00]);
  });

  test("rejects an odd row width", () => {
    const image: EncodedImage = {
      pageColor: PageColorType.Grayscale,
      cols: 3,
      rows: 1,
      rowsData: [],
    };

    throws(() => PacketGenerator.writeImageDataGray(image), /width must be even/);
  });
});
