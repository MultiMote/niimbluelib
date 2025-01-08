import { ConnectEvent, DisconnectEvent, RawPacketSentEvent } from "../events";
import { ConnectionInfo, NiimbotAbstractClient } from ".";
import { ConnectResult } from "../packets";
import { Utils } from "../utils";

/**
 * Uses [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
 *
 * @category Client
 **/
export class NiimbotSerialClient extends NiimbotAbstractClient {
  private port?: SerialPort = undefined;
  private writer?: WritableStreamDefaultWriter<Uint8Array> = undefined;
  private reader?: ReadableStreamDefaultReader<Uint8Array> = undefined;

  public async connect(): Promise<ConnectionInfo> {
    await this.disconnect();

    const _port: SerialPort = await navigator.serial.requestPort();

    _port.addEventListener("disconnect", () => {
      this.port = undefined;
      this.emit("disconnect", new DisconnectEvent());
    });

    await _port.open({ baudRate: 115200 });

    if (_port.readable === null) {
      throw new Error("Port is not readable");
    }

    if (_port.writable === null) {
      throw new Error("Port is not writable");
    }

    this.port = _port;
    const info = _port.getInfo();
    this.writer = _port.writable.getWriter();
    this.reader = _port.readable.getReader();

    setTimeout(() => {
      void (async () => {
        await this.waitSerialData();
      })();
    }, 1); // todo: maybe some other way exists

    try {
      await this.initialNegotiate();
      await this.fetchPrinterInfo();
    } catch (e) {
      console.error("Unable to fetch printer info (is it turned on?).");
      console.error(e);
    }

    const result: ConnectionInfo = {
      deviceName: `Serial (VID:${info.usbVendorId?.toString(16)} PID:${info.usbProductId?.toString(16)})`,
      result: this.info.connectResult ?? ConnectResult.FirmwareErrors,
    };

    this.emit("connect", new ConnectEvent(result));
    return result;
  }

  private async waitSerialData() {
    while (true) {
      try {
        const result = await this.reader!.read();
        if (result.value) {
          if (this.debug) {
            console.info(`<< serial chunk ${Utils.bufToHex(result.value)}`);
          }
          this.processRawPacket(result.value);
        }

        if (result.done) {
          console.log("done");
          break;
        }
      } catch (_e) {
        break;
      }
    }
  }

  public async disconnect() {
    this.stopHeartbeat();

    if (this.writer !== undefined) {
      this.writer.releaseLock();
    }

    if (this.reader !== undefined) {
      this.reader.releaseLock();
    }

    if (this.port !== undefined) {
      await this.port.close();
      this.emit("disconnect", new DisconnectEvent());
    }

    this.port = undefined;
    this.writer = undefined;
  }

  public isConnected(): boolean {
    return this.port !== undefined && this.writer !== undefined && this.reader !== undefined;
  }

  public async sendRaw(data: Uint8Array, force?: boolean) {
    const send = async () => {
      if (!this.isConnected()) {
        throw new Error("Port is not readable/writable");
      }
      await Utils.sleep(this.packetIntervalMs);
      await this.writer!.write(data);
      this.emit("rawpacketsent", new RawPacketSentEvent(data));
    };

    if (force) {
      await send();
    } else {
      await this.mutex.runExclusive(send);
    }
  }
}
