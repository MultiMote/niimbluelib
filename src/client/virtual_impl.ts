import { ConnectEvent, DisconnectEvent, RawPacketSentEvent } from "../events";
import { ConnectionInfo, NiimbotAbstractClient, NiimbotClientType } from ".";
import { ConnectResult } from "../packets";
import { Utils } from "../utils";

/**
 * Virtual device, uses hex dump to simulate packet exchange.
 *
 * @category Client
 **/
export class NiimbotVirtualClient extends NiimbotAbstractClient {
  private connected = false;
  private notSupportedPacket = Utils.hexToBuf("55 55 00 01 01 00 aa aa");

  private virtualDump: Array<{
    request: Uint8Array;
    response: Uint8Array;
  }> = [];

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
   * ```
   *
   */
  public loadHexDump(hex: string) {
    this.virtualDump = [];

    let request: Uint8Array | undefined;

    const lineRegexp = /^\s*(>>|<<)\s*(.+?)\s*$/;
    const parRegexp = /\(.*?\)/g;

    for (const line of hex.split(/\r?\n/)) {
      const match = lineRegexp.exec(line);

      if (!match) {
        continue;
      }

      const [, direction, value] = match;
      // Strip parenthesized comments and whitespaces
      const cleanHex = value.replace(parRegexp, "").replace(/\s+/g, "");
      const packet = Utils.hexToBuf(cleanHex);

      if (direction === ">>") {
        if (request) {
          throw new Error("Missing response for request");
        }
        request = packet;
      } else {
        if (!request) {
          throw new Error("Unexpected response without request");
        }
        this.virtualDump.push({ request, response: packet });
        request = undefined;
      }
    }

    if (request) {
      throw new Error("Missing response for request");
    }
  }

  private virtualSend(data: Uint8Array) {
    const requestHex = Utils.bufToHex(data, "").toLowerCase();

    let entry = this.virtualDump.find(({ request }) => Utils.bufToHex(request, "").toLowerCase() === requestHex);
    let response = this.notSupportedPacket;

    if (entry) {
      response = entry.response;
    }

    setTimeout(() => {
      // respond
      this.processRawPacket(response);
    }, 1);
  }

  public async connect(): Promise<ConnectionInfo> {
    this.connected = true;

    try {
      await this.initialNegotiate();
      await this.fetchPrinterInfo();
    } catch (e) {
      console.error("Unable to fetch printer info (is it turned on?).");
      console.error(e);
    }

    const result: ConnectionInfo = {
      deviceName: "Virtual",
      result: this.info.connectResult ?? ConnectResult.FirmwareErrors,
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
