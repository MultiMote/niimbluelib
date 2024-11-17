import {
  ConnectEvent,
  DisconnectEvent,
  PacketReceivedEvent,
  RawPacketReceivedEvent,
  RawPacketSentEvent,
} from "../events";
import { ConnectionInfo, NiimbotAbstractClient } from ".";
import { NiimbotPacket } from "../packets/packet";
import { ConnectResult } from "../packets";
import { Utils } from "../utils";
import { BleCharacteristic, BleClient, BleDevice, BleService } from "@capacitor-community/bluetooth-le";

/**
  * @category Client
  */
export interface NiimbotCapacitorBleClientConnectOptions {
  /**
   * Skip device picker dialog and connect to given device ID.
   *
   * On **Android** this is the BLE MAC address.
   *
   * On **iOS** and **web** it is an identifier.
   */
  deviceId?: string;
}

/**
 * Uses [@capacitor-community/bluetooth-le](https://github.com/capacitor-community/bluetooth-le)
 *
 * @category Client
 */
export class NiimbotCapacitorBleClient extends NiimbotAbstractClient {
  private deviceId?: string;
  private serviceUUID?: string;
  private characteristicUUID?: string;
  private packetBuf = new Uint8Array();

  public async connect(options?: NiimbotCapacitorBleClientConnectOptions): Promise<ConnectionInfo> {
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

    const { service, characteristic } = await this.findSuitableCharacteristic(device.deviceId).finally(() =>
      this.onBleDisconnect()
    );

    this.deviceId = device.deviceId;
    this.serviceUUID = service;
    this.characteristicUUID = characteristic;

    if (this.debug) {
      console.log("Suitable channel found:", { service, characteristic });
    }

    await BleClient.startNotifications(this.deviceId, this.serviceUUID, this.characteristicUUID, (value: DataView) => {
      this.onBlePacketReceived(value);
    });

    try {
      await this.initialNegotiate();
      await this.fetchPrinterInfo();
    } catch (e) {
      console.error("Unable to fetch printer info.");
      console.error(e);
    }

    const result: ConnectionInfo = {
      deviceName: device.name,
      result: this.info.connectResult ?? ConnectResult.FirmwareErrors,
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

  private onBlePacketReceived(dv: DataView) {
    if (dv.byteLength === 0) {
      return;
    }

    this.packetBuf = Utils.u8ArrayAppend(this.packetBuf, new Uint8Array(dv.buffer));

    try {
      const packets: NiimbotPacket[] = NiimbotPacket.fromBytesMultiPacket(this.packetBuf);

      if (packets.length > 0) {
        this.emit("rawpacketreceived", new RawPacketReceivedEvent(this.packetBuf));

        packets.forEach((p) => {
          this.emit("packetreceived", new PacketReceivedEvent(p));
        });

        this.packetBuf = new Uint8Array();
      }
    } catch (_e) {
      if (this.debug) {
        console.info(`Incomplete packet, ignoring:${Utils.bufToHex(this.packetBuf)}`);
      }
    }
  }

  private onBleDisconnect() {
    this.deviceId = undefined;
    this.serviceUUID = undefined;
    this.characteristicUUID = undefined;
    this.info = {};
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
    this.info = {};
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
}
