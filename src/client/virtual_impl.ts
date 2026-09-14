import { ConnectEvent, DisconnectEvent, RawPacketSentEvent } from "../events";
import { ConnectionInfo, NiimbotAbstractClient, NiimbotClientType } from ".";
import { ConnectResult } from "../packets";
import { Utils } from "../utils";

interface VirtualDumpEntry {
  request: Uint8Array;
  response?: Uint8Array;
  isPrefix: boolean;
}

/**
 * Virtual device, uses hex dump to simulate packet exchange.
 *
 * @category Client
 **/
export class NiimbotVirtualClient extends NiimbotAbstractClient {
  private connected = false;
  private readonly notSupportedPacket = Utils.hexToBuf("55 55 00 01 01 00 aa aa");
  private virtualDump: VirtualDumpEntry[] = [];

  constructor() {
    super();
    this.setHeartbeatAutoStart(false);
  }

  /**
   * Dump example (case and spaces are ignored):
   *
   * ```
   * >> 03 5555 c1 01 01 c1 aaaa
   * << 5555 c2 01 02 c1 aaaa
   * >> 5555 40 01 08 49 aaaa (packet comment)
   * << 5555 48 02 0900 43 aaaa
   * >> 5555 40 01 0c 4d aaaa
   * << 5555 4c 02 051e 55 aaaa
   * >> 5555 40 01 09 48 aaaa
   * << 5555 49 02 051e 50 aaaa
   * >> 5555 84 03 00c827 68 aaaa
   * << NA
   * >> 5555 85 *
   * << NA
   * ```
   *
   */
  public loadHexDump(hex: string) {
    this.virtualDump = [];

    let request: { packet: Uint8Array; isPrefix: boolean } | undefined;

    const lineRegexp = /^\s*(>>|<<)\s*(.+?)\s*$/;
    const parenthesesRegexp = /\(.*?\)/g;

    for (const line of hex.split(/\r?\n/)) {
      const match = lineRegexp.exec(line);

      if (!match) {
        continue;
      }

      const [, direction, value] = match;
      // Strip parenthesized comments and whitespaces
      const cleanValue = value.replace(parenthesesRegexp, "").replace(/\s+/g, "");

      if (direction === ">>") {
        if (request) {
          throw new Error("Missing response for request");
        }
        const isPrefix = cleanValue.endsWith("*");
        const hexStr = isPrefix ? cleanValue.slice(0, -1) : cleanValue;

        request = {
          packet: Utils.hexToBuf(hexStr),
          isPrefix,
        };
      } else {
        if (!request) {
          throw new Error("Unexpected response without request");
        }

        const response = cleanValue.toUpperCase() === "NA" ? undefined : Utils.hexToBuf(cleanValue);

        this.virtualDump.push({
          request: request.packet,
          response,
          isPrefix: request.isPrefix,
        });

        request = undefined;
      }
    }

    if (request) {
      throw new Error("Missing response for request");
    }
  }

  private virtualSend(data: Uint8Array) {
    const requestHex = Utils.bufToHex(data, "").toLowerCase();

    const entry = this.virtualDump.find(({ request, isPrefix }) => {
      const entryHex = Utils.bufToHex(request, "").toLowerCase();
      return isPrefix ? requestHex.startsWith(entryHex) : requestHex === entryHex;
    });

    if (!entry) {
      setTimeout(() => this.processRawPacket(this.notSupportedPacket), 1);
      return;
    }

    if (entry.response) {
      setTimeout(() => this.processRawPacket(entry.response!), 1);
    }
  }

  public async connect(): Promise<ConnectionInfo> {
    this.connected = true;

    await this.negotiateAndGetPrinterInfo(() => (this.connected = false));

    const result: ConnectionInfo = {
      deviceName: "Virtual",
      result: this.printerInfo.connectResult ?? ConnectResult.FirmwareErrors,
    };

    this.emit("connect", new ConnectEvent(result));
    return result;
  }

  public async disconnect() {
    this.stopHeartbeat();

    if (this.connected) {
      this.connected = false;
      this.emit("disconnect", new DisconnectEvent());
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async sendRaw(data: Uint8Array, force?: boolean) {
    const send = async () => {
      if (!this.isConnected()) {
        throw new Error("Port is not readable/writable");
      }
      await Utils.sleep(this.packetIntervalMs);
      this.virtualSend(data);
      this.emit("rawpacketsent", new RawPacketSentEvent(data));
    };

    if (force) {
      await send();
    } else {
      await this.mutex.runExclusive(send);
    }
  }

  public override getType(): NiimbotClientType {
    return "virtual";
  }
}
