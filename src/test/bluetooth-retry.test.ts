/* eslint-disable @typescript-eslint/no-floating-promises */
import { test, describe, beforeEach } from "node:test";
import { strictEqual, rejects } from "node:assert";
import { NiimbotBluetoothClient } from "..";

const networkError = () => new DOMException("GATT Server is disconnected. Cannot retrieve services.", "NetworkError");

/** Fake GATT: service discovery fails with `errors` (in order), then succeeds. */
const createFakeGatt = (errors: Error[]) => {
  const characteristic = { uuid: "char", properties: { notify: true, writeWithoutResponse: true } };
  const service = { uuid: "e7810a71-73ae-499d-8c15-faa9aef0c3f2", getCharacteristics: async () => [characteristic] };

  const gatt = {
    connectCalls: 0,
    disconnectCalls: 0,
    connect: async () => {
      gatt.connectCalls++;
      return {
        getPrimaryServices: async () => {
          const error = errors.shift();
          if (error !== undefined) throw error;
          return [service];
        },
      };
    },
    disconnect: () => {
      gatt.disconnectCalls++;
    },
  };

  return { gatt, characteristic };
};

describe("Bluetooth GATT connect retry", () => {
  let client: NiimbotBluetoothClient;

  beforeEach(() => {
    client = new NiimbotBluetoothClient();
  });

  const connectGatt = (gatt: unknown, attempts = 3) => (client as any).connectGatt(gatt, attempts, 1);

  test("connects on the first try without retrying", async () => {
    const { gatt, characteristic } = createFakeGatt([]);
    const result = await connectGatt(gatt);
    strictEqual(result.channel, characteristic);
    strictEqual(gatt.connectCalls, 1);
    strictEqual(gatt.disconnectCalls, 0);
  });

  test("recovers after two dropped connections", async () => {
    const { gatt, characteristic } = createFakeGatt([networkError(), networkError()]);
    const result = await connectGatt(gatt);
    strictEqual(result.channel, characteristic);
    strictEqual(gatt.connectCalls, 3);
  });

  test("gives up after the given number of attempts", async () => {
    const { gatt } = createFakeGatt([networkError(), networkError(), networkError(), networkError()]);
    await rejects(() => connectGatt(gatt), { name: "NetworkError" });
    strictEqual(gatt.connectCalls, 3);
  });

  test("does not retry errors other than NetworkError", async () => {
    const { gatt } = createFakeGatt([new Error("boom")]);
    await rejects(() => connectGatt(gatt), { message: "boom" });
    strictEqual(gatt.connectCalls, 1);
  });

  test("retries when gatt.connect() itself fails", async () => {
    const { gatt, characteristic } = createFakeGatt([]);
    const connect = gatt.connect;
    let first = true;
    gatt.connect = async () => {
      if (first) {
        first = false;
        throw networkError();
      }
      return connect();
    };
    const result = await connectGatt(gatt);
    strictEqual(result.channel, characteristic);
  });
});
