import { SerialPort } from "serialport";
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
 * Open SerialPort asynchronously instead of callback
 * @category Client
 */
const serialOpenAsync = (path: string): Promise<SerialPort> => {
  return new Promise((resolve, reject) => {
    const p: SerialPort = new SerialPort({ path, baudRate: 115200, endOnClose: true, autoOpen: false });
    p.open((err) => {
      if (err) {
        reject(err);
      } else {
        resolve(p);
      }
    });
  });
};

/**
 * Uses node serial communication (serialport lib)
 * @category Client
 */
export class NiimbotNodeSerialClient extends NiimbotAbstractClient {
  private device?: SerialPort;
  private portName?: string;
  private isOpen: boolean = false;

  constructor() {
    super();
  }

  /** Set port for connect */
  public setPort(portName: string) {
    this.portName = portName;
  }

  public async connect(): Promise<ConnectionInfo> {
    await this.disconnect();

    if (!this.portName) {
      throw new Error("Port not set");
    }

    const _port: SerialPort = await serialOpenAsync(this.portName);

    this.isOpen = true;

    _port.on("close", () => {
      this.isOpen = false;
      this.emit("disconnect", new DisconnectEvent());
    });

    _port.on("readable", () => {
      this.dataReady();
    });

    this.device = _port;

    try {
      await this.initialNegotiate();
      await this.fetchPrinterInfo();
    } catch (e) {
      console.error("Unable to fetch printer info (is it turned on?).");
      console.error(e);
    }

    const result: ConnectionInfo = {
      deviceName: `Serial (${this.portName})`,
      result: this.info.connectResult ?? ConnectResult.FirmwareErrors,
    };

    this.emit("connect", new ConnectEvent(result));
    return result;
  }

  private dataReady() {
    while (true) {
      try {
        const result: Buffer | null = this.device!.read();

        if (result !== null) {
          if (this.debug) {
            console.info(`<< serial chunk ${Utils.bufToHex(result)}`);
          }
          this.processRawPacket(result);
        } else {
          break;
        }
      } catch (_e) {
        break;
      }
    }
  }

  public async disconnect() {
    this.stopHeartbeat();

    if (this.device) {
      return new Promise<void>((resolve, reject) => {
        this.device!.close((e) => {
          if (e) {
            reject(e);
          } else {
            resolve();
          }
        });
      });
    }
  }

  public isConnected(): boolean {
    return this.isOpen;
  }

  public async sendRaw(data: Uint8Array, force?: boolean) {
    const send = async () => {
      if (!this.isConnected()) {
        throw new Error("Not connected");
      }
      await Utils.sleep(this.packetIntervalMs);
      this.device!.write(Buffer.from(data));
      this.emit("rawpacketsent", new RawPacketSentEvent(data));
    };

    if (force) {
      await send();
    } else {
      await this.mutex.runExclusive(send);
    }
  }

  public static async scan(): Promise<ScanItem[]> {
    const ports = await SerialPort.list();

    return ports.map((p) => {
      let name: string = "unknown";
      let pRaw = p as any;

      if (pRaw["friendlyName"] !== undefined) {
        name = pRaw["friendlyName"] as string;
      } else if (p.pnpId !== undefined) {
        name = p.pnpId;
      }

      return {
        name,
        address: p.path,
      };
    });
  }
}
