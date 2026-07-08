import noble, { Peripheral, Characteristic, Service } from "@stoprocent/noble";

import { ConnectEvent, DisconnectEvent, RawPacketSentEvent } from "../events";
import { ConnectionInfo, NiimbotAbstractClient } from ".";
import { ConnectResult } from "../packets";
import { Utils } from "../utils";

/**
 * @category Client
 */
export interface ScanItem {
  address: string;
  name: string;
}

/**
 * Uses node BLE communication (noble lib)
 * @category Client
 */
export class NiimbotNodeBleClient extends NiimbotAbstractClient {
  private addr: string = "";
  private device: Peripheral | undefined;
  private channel: Characteristic | undefined;

  constructor() {
    super();
  }

  /** Set device mac address or name for connect */
  public setAddress(address: string) {
    this.addr = address;
  }

  public static async scan(timeoutMs: number = 5000): Promise<ScanItem[]> {
    const items: ScanItem[] = [];

    await noble.waitForPoweredOnAsync(5000);

    await noble.startScanningAsync([], false);

    setTimeout(() => noble.stopScanningAsync(), timeoutMs ?? 5000);

    for await (const peripheral of noble.discoverAsync()) {
      items.push({
          address: peripheral.address,
          name: peripheral.advertisement.localName || "unknown",
      });
    }

    return items;
  }

  private async getDevice(address: string, timeoutMs: number = 5000): Promise<Peripheral> {
    await noble.waitForPoweredOnAsync(5000);

    return new Promise((resolve, reject) => {
      let timer: NodeJS.Timeout | undefined;

      noble.on("discover", async (peripheral: Peripheral) => {
        if (
          peripheral.address === address.toLowerCase() ||
          peripheral.advertisement.localName === address
        ) {
          clearTimeout(timer);
          resolve(peripheral);
        }
      });

      noble.startScanning([], false, (error?: Error) => {
        if (error) reject(error);
      });

      timer = setTimeout(() => {
        noble.stopScanning();
        reject(new Error("Device not found"));
      }, timeoutMs ?? 5000);
    });
  }

  private async connectToDevice(address: string, timeoutMs: number = 5000): Promise<void> {
    const periph = await this.getDevice(address, timeoutMs);
    await periph.connectAsync();

    const services: Service[] = await periph.discoverServicesAsync();

    let channelCharacteristic: Characteristic | undefined;

    for (const service of services) {
      if (service.uuid.length < 5) {
        continue;
      }

      const characteristics = await service.discoverCharacteristicsAsync();
      const suitableCharacteristic = characteristics.find(
        (ch) => ch.properties.includes("notify") && ch.properties.includes("writeWithoutResponse")
      );

      if (suitableCharacteristic) {
        channelCharacteristic = suitableCharacteristic;
        break;
      }
    }

    if (channelCharacteristic === undefined) {
      await periph.disconnectAsync();
      throw new Error("Unable to find suitable channel characteristic");
    }

    periph.on("disconnect", () => {
      this.stopHeartbeat();
      this.emit("disconnect", new DisconnectEvent());
      this.device = undefined;
      this.channel = undefined;
    });

    channelCharacteristic.on("data", (data: Buffer, isNotification: boolean) => {
      if (isNotification) this.processRawPacket(new Uint8Array(data));
    });

    await channelCharacteristic.subscribeAsync();

    this.channel = channelCharacteristic;
    this.device = periph;
  }

  public async connect(): Promise<ConnectionInfo> {
    await this.disconnect();

    if (!this.addr) {
      throw new Error("Device address or name not set");
    }

    await this.connectToDevice(this.addr);

    try {
      await this.initialNegotiate();
      await this.fetchPrinterInfo();
    } catch (e) {
      console.error("Unable to fetch printer info.");
      console.error(e);
    }

    const result: ConnectionInfo = {
      deviceName: this.device!.advertisement.localName ?? this.addr,
      result: this.info.connectResult ?? ConnectResult.FirmwareErrors,
    };

    this.emit("connect", new ConnectEvent(result));

    return result;
  }

  public isConnected(): boolean {
    return this.device !== undefined && this.channel !== undefined;
  }

  public async disconnect() {
    this.stopHeartbeat();

    if (this.device !== undefined) {
      await this.device.disconnectAsync();
    }

    this.device = undefined;
    this.channel = undefined;
  }

  public async sendRaw(data: Uint8Array, force?: boolean) {
    const send = async () => {
      if (!this.isConnected()) {
        this.disconnect();
        throw new Error("Not connected");
      }

      await Utils.sleep(this.packetIntervalMs);

      await this.channel!.writeAsync(Buffer.from(data), true);

      this.emit("rawpacketsent", new RawPacketSentEvent(data));
    };

    if (force) {
      await send();
    } else {
      await this.mutex.runExclusive(send);
    }
  }
}
