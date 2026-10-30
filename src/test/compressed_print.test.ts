import { test, describe } from "node:test";
import { strictEqual } from "node:assert";
import { NiimbotPacket, PageColorType, RequestCommandId } from "../packets";
import { EncodedImage } from "../utils";
import { D110MV4PrintTask } from "../print_tasks";

function makeImage(): EncodedImage {
  return {
    pageColor: PageColorType.MultiorderColor,
    cols: 576,
    rows: 4,
    rowsData: [
      {
        dataType: "pixels",
        rowNumber: 0,
        repeat: 4,
        blackPixelsCount: 0,
        redPixelsCount: 0,
        rowDataGray: new Uint8Array(288).fill(0x0f),
      },
    ],
  };
}

function makeTask(capabilities?: { imageCompressSupport?: number[]; maxImageCompressBytes?: number }) {
  const sent: NiimbotPacket[] = [];

  const client = {
    getPrinterInfo: () => ({ capabilities }),
    getModelMetadata: () => ({ printheadPixels: 576 }),
    emit: () => undefined,
  };

  const protocol = {
    getClient: () => client,
    send: async (packet: NiimbotPacket) => {
      sent.push(packet);
      return packet;
    },
    sendAll: async (packets: NiimbotPacket[]) => {
      sent.push(...packets);
    },
  };

  const task = new D110MV4PrintTask(protocol as never, {
    pageColor: PageColorType.MultiorderColor,
    totalPages: 1,
  });

  return { task, sent };
}

describe("D110MV4 compressed grayscale printing", () => {
  test("uses 0xA7 packets when the printer advertises image compression", async () => {
    const { task, sent } = makeTask({ imageCompressSupport: [1], maxImageCompressBytes: 25600 });

    await task.printPage(makeImage());

    const compressed = sent.filter((packet) => packet.command === RequestCommandId.PrintBitmapRowCompressed);
    const uncompressedGray = sent.filter((packet) => packet.command === RequestCommandId.PrintBitmapRowGray);

    strictEqual(compressed.length, 1);
    strictEqual(uncompressedGray.length, 0);
    strictEqual(sent[sent.length - 1].command, RequestCommandId.PageEnd);
  });

  test("falls back to uncompressed grayscale when compression is not advertised", async () => {
    const { task, sent } = makeTask({ imageCompressSupport: [0], maxImageCompressBytes: 25600 });

    await task.printPage(makeImage());

    const compressed = sent.filter((packet) => packet.command === RequestCommandId.PrintBitmapRowCompressed);
    const uncompressedGray = sent.filter((packet) => packet.command === RequestCommandId.PrintBitmapRowGray);

    strictEqual(compressed.length, 0);
    strictEqual(uncompressedGray.length, 1);
  });

  test("falls back when the maximum compressed size is missing", async () => {
    const { task, sent } = makeTask({ imageCompressSupport: [1] });

    await task.printPage(makeImage());

    const compressed = sent.filter((packet) => packet.command === RequestCommandId.PrintBitmapRowCompressed);
    strictEqual(compressed.length, 0);
  });
});
