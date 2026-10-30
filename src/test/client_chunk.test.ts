import { test, describe } from "node:test";
import { deepStrictEqual, strictEqual, throws } from "node:assert";
import { NiimbotBluetoothClient } from "../client";
import { RawPacketSentEvent } from "../events";

class FakeCharacteristic {
  public writes: Uint8Array[] = [];

  public async writeValueWithoutResponse(value: BufferSource): Promise<void> {
    const view = value instanceof DataView ? value : new Uint8Array(value as ArrayBuffer);
    this.writes.push(new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)));
  }
}

const connectFakeChannel = (client: NiimbotBluetoothClient): FakeCharacteristic => {
  const channel = new FakeCharacteristic();
  (client as unknown as { channel: FakeCharacteristic }).channel = channel;
  return channel;
};

describe("BLE write chunking", () => {
  test("splits large packets into chunks", async () => {
    const client = new NiimbotBluetoothClient();
    client.setPacketInterval(0);
    client.setBleWriteChunkSize(4);
    client.setBleWriteChunkInterval(0);

    const channel = connectFakeChannel(client);
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    let sentEvents = 0;
    let sentData: Uint8Array | undefined;
    client.on("rawpacketsent", (event: RawPacketSentEvent) => {
      sentEvents++;
      sentData = event.data;
    });

    await client.sendRaw(data);

    deepStrictEqual(
      channel.writes.map((chunk) => [...chunk]),
      [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9],
      ]
    );
    strictEqual(sentEvents, 1);
    deepStrictEqual(sentData, data);
  });

  test("sends a packet that fits as a single write", async () => {
    const client = new NiimbotBluetoothClient();
    client.setPacketInterval(0);
    client.setBleWriteChunkSize(4);
    client.setBleWriteChunkInterval(0);

    const channel = connectFakeChannel(client);
    const data = new Uint8Array([1, 2, 3, 4]);

    await client.sendRaw(data);

    deepStrictEqual(
      channel.writes.map((chunk) => [...chunk]),
      [[1, 2, 3, 4]]
    );
  });

  test("does not include bytes outside of a subarray", async () => {
    const client = new NiimbotBluetoothClient();
    client.setPacketInterval(0);
    client.setBleWriteChunkInterval(0);

    const channel = connectFakeChannel(client);
    const buffer = new Uint8Array([0, 1, 2, 3, 4, 5]);

    await client.sendRaw(buffer.subarray(2, 5));

    deepStrictEqual(
      channel.writes.map((chunk) => [...chunk]),
      [[2, 3, 4]]
    );
  });

  test("rejects invalid chunk sizes", () => {
    const client = new NiimbotBluetoothClient();

    throws(() => client.setBleWriteChunkSize(0), /positive integer/);
    throws(() => client.setBleWriteChunkSize(-1), /positive integer/);
    throws(() => client.setBleWriteChunkSize(1.5), /positive integer/);
  });
});
