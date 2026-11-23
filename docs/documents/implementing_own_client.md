---
title: Implementing your own client
---

NiimBlueLib ships clients for Web Bluetooth (`NiimbotBluetoothClient`) and Web Serial (`NiimbotSerialClient`).
Node.js clients (`NiimbotNodeBleClient`, `NiimbotNodeSerialClient`) are available in
the Node,js version of the library.
If your platform provides another transport (Capacitor BLE plugin, React Native, ...) you can
implement your own client by extending `NiimbotAbstractClient`.

## What you have to implement

Extend `NiimbotAbstractClient` and implement four members:

| Member | Description |
| --- | --- |
| `connect()` | Open the transport channel, then call `negotiateAndGetPrinterInfo()` and emit `connect`. |
| `disconnect()` | Close the channel (stop the heartbeat first) and emit `disconnect`. |
| `isConnected()` | Return `true` when the channel is usable. |
| `sendRaw(data, force?)` | Write bytes to the printer. |

Plus two trivial ones:

- `getType()` — a unique transport name, e.g. `"my-transport"`.
- `static isAvailable()` — return `true` when the transport can be used in the current environment.

## Events to emit

- `connect` (`ConnectEvent`) — after a successful handshake.
- `disconnect` (`DisconnectEvent`) — when the channel is closed, also on unexpected transport loss.

## Example: client based on @capacitor-community/bluetooth-le

A client for native mobile apps using
[@capacitor-community/bluetooth-le](https://github.com/capacitor-community/bluetooth-le)
(this client was previously shipped with the library itself):

```ts
import { BleCharacteristic, BleClient, BleDevice, BleService } from "@capacitor-community/bluetooth-le";
import { Capacitor } from "@capacitor/core";
import {
  ConnectEvent,
  ConnectResult,
  DisconnectEvent,
  ConnectionInfo,
  NiimbotAbstractClient,
  RawPacketSentEvent,
  Utils,
} from "@mmote/niimbluelib";

export class NiimbotCapacitorBleClient extends NiimbotAbstractClient {
  private deviceId?: string;
  private serviceUUID?: string;
  private characteristicUUID?: string;

  public async connect(options?: { deviceId?: string }): Promise<ConnectionInfo> {
    await this.disconnect();

    await BleClient.initialize({ androidNeverForLocation: true });

    const bluetoothEnabled = await BleClient.isEnabled();

    if (!bluetoothEnabled) {
      throw new Error("Bluetooth is not enabled");
    }

    let device: BleDevice;

    if (options?.deviceId !== undefined) {
      device = {
        deviceId: options.deviceId,
        name: options.deviceId,
      };
    } else {
      device = await BleClient.requestDevice();
    }

    await BleClient.connect(device.deviceId, () => this.onBleDisconnect());

    await BleClient.discoverServices(device.deviceId);

    const { service, characteristic } = await this.findSuitableCharacteristic(device.deviceId).catch((error) => {
      this.onBleDisconnect();
      throw error;
    });

    this.deviceId = device.deviceId;
    this.serviceUUID = service;
    this.characteristicUUID = characteristic;

    if (this.debug) {
      console.log("Suitable channel found:", { service, characteristic });
    }

    await BleClient.startNotifications(this.deviceId, this.serviceUUID, this.characteristicUUID, (value: DataView) => {
      this.processRawPacket(value);
    });

    await this.negotiateAndGetPrinterInfo(() => this.disconnect());

    const result: ConnectionInfo = {
      deviceName: device.name,
      result: this.printerInfo.connectResult ?? ConnectResult.FirmwareErrors,
    };

    this.emit("connect", new ConnectEvent(result));

    return result;
  }

  private async findSuitableCharacteristic(devId: string): Promise<{ service: string; characteristic: string }> {
    const services: BleService[] = await BleClient.getServices(devId);

    for (const service of services) {
      if (service.uuid.length < 5) {
        continue;
      }

      const characteristics: BleCharacteristic[] = service.characteristics;

      for (const ch of characteristics) {
        if (ch.properties.notify && ch.properties.writeWithoutResponse) {
          return {
            characteristic: ch.uuid,
            service: service.uuid,
          };
        }
      }
    }
    throw new Error("Unable to find suitable channel characteristic");
  }

  private onBleDisconnect() {
    this.deviceId = undefined;
    this.serviceUUID = undefined;
    this.characteristicUUID = undefined;
    this.emit("disconnect", new DisconnectEvent());
  }

  public isConnected(): boolean {
    return this.deviceId !== undefined;
  }

  public async disconnect() {
    this.stopHeartbeat();

    if (this.deviceId !== undefined) {
      await BleClient.stopNotifications(this.deviceId, this.serviceUUID!, this.characteristicUUID!);
      await BleClient.disconnect(this.deviceId);
    }

    this.deviceId = undefined;
  }

  public async sendRaw(data: Uint8Array, force?: boolean) {
    const send = async () => {
      if (!this.isConnected()) {
        throw new Error("Channel is closed");
      }
      await Utils.sleep(this.packetIntervalMs);

      const dw = new DataView(data.buffer, data.byteOffset, data.byteLength);
      await BleClient.writeWithoutResponse(this.deviceId!, this.serviceUUID!, this.characteristicUUID!, dw);

      this.emit("rawpacketsent", new RawPacketSentEvent(data));
    };

    if (force) {
      await send();
    } else {
      await this.mutex.runExclusive(send);
    }
  }

  public override getType(): string {
    return "capacitor-ble";
  }

  public static override isAvailable(): boolean {
    return Capacitor.getPlatform() !== "web";
  }
}
```

Usage:

```ts
const client = new NiimbotCapacitorBleClient();
await client.connect();
// ...
await client.disconnect();
```
