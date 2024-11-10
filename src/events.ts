import { ConnectionInfo, PrinterInfo, NiimbotAbstractClient, AbstractPrintTask, HeartbeatData, NiimbotPacket } from ".";

/** Base client event */
export class NiimbotEvent {
  readonly type: string;

  constructor(type: string) {
    this.type = type;
  }
}

/** Fired when client connected to printer and fetched it's information. */
export class ConnectEvent extends NiimbotEvent {
  info: ConnectionInfo;
  constructor(info: ConnectionInfo) {
    super("connect");
    this.info = info;
  }
}

/** Fired when client disconnected from printer. */
export class DisconnectEvent extends NiimbotEvent {
  constructor() {
    super("disconnect");
  }
}

/** Fired when packet received, converted to object and validated (head, tail, checksum). */
export class PacketReceivedEvent extends NiimbotEvent {
  packet: NiimbotPacket;
  constructor(packet: NiimbotPacket) {
    super("packetreceived");
    this.packet = packet;
  }
}

/** Fired when packet object sent. */
export class PacketSentEvent extends NiimbotEvent {
  packet: NiimbotPacket;
  constructor(packet: NiimbotPacket) {
    super("packetsent");
    this.packet = packet;
  }
}

/** Fired when raw packet sent to printer. */
export class RawPacketSentEvent extends NiimbotEvent {
  data: Uint8Array;
  constructor(data: Uint8Array) {
    super("rawpacketsent");
    this.data = data;
  }
}

/** Fired when raw packet received from printer. */
export class RawPacketReceivedEvent extends NiimbotEvent {
  data: Uint8Array;
  constructor(data: Uint8Array) {
    super("rawpacketreceived");
    this.data = data;
  }
}

/** Fired when heartbeat packet received and parsed. */
export class HeartbeatEvent extends NiimbotEvent {
  data: HeartbeatData;
  constructor(data: HeartbeatData) {
    super("heartbeat");
    this.data = data;
  }
}

/** Fired when no response received after heartbeat packet sent. */
export class HeartbeatFailedEvent extends NiimbotEvent {
  failedAttempts: number;
  constructor(failedAttempts: number) {
    super("heartbeatfailed");
    this.failedAttempts = failedAttempts;
  }
}

/** Fired when info fetched from printer (after {@link NiimbotAbstractClient.fetchPrinterInfo} finished). */
export class PrinterInfoFetchedEvent extends NiimbotEvent {
  info: PrinterInfo;
  constructor(info: PrinterInfo) {
    super("printerinfofetched");
    this.info = info;
  }
}

/** Fired progress received (during {@link AbstractPrintTask.waitForFinished}). */
export class PrintProgressEvent extends NiimbotEvent {
  /** 0 – n */
  page: number;

  pagesTotal: number;
  /** 0 – 100 */
  pagePrintProgress: number;
  /** 0 – 100 */
  pageFeedProgress: number;

  constructor(page: number, pagesTotal: number, pagePrintProgress: number, pageFeedProgress: number) {
    super("printprogress");
    this.page = page;
    this.pagesTotal = pagesTotal;
    this.pagePrintProgress = pagePrintProgress;
    this.pageFeedProgress = pageFeedProgress;
  }
}

export type ClientEventMap = {
  connect: (event: ConnectEvent) => void;
  disconnect: (event: DisconnectEvent) => void;
  rawpacketsent: (event: RawPacketSentEvent) => void;
  rawpacketreceived: (event: RawPacketReceivedEvent) => void;
  packetreceived: (event: PacketReceivedEvent) => void;
  packetsent: (event: PacketSentEvent) => void;
  heartbeat: (event: HeartbeatEvent) => void;
  heartbeatfailed: (event: HeartbeatFailedEvent) => void;
  printerinfofetched: (event: PrinterInfoFetchedEvent) => void;
  printprogress: (event: PrintProgressEvent) => void;
};
