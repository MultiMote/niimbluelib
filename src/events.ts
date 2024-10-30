import { ConnectionInfo, PrinterInfo } from ".";
import { HeartbeatData } from "./packets/abstraction";
import { NiimbotPacket } from "./packets/packet";

export class NiimbotEvent {
  readonly type: string;

  constructor(type: string) {
    this.type = type;
  }
}

export class ConnectEvent extends NiimbotEvent {
  info: ConnectionInfo;
  constructor(info: ConnectionInfo) {
    super("connect");
    this.info = info;
  }
}

export class DisconnectEvent extends NiimbotEvent {
  constructor() {
    super("disconnect");
  }
}

export class PacketReceivedEvent extends NiimbotEvent {
  packet: NiimbotPacket;
  constructor(packet: NiimbotPacket) {
    super("packetreceived");
    this.packet = packet;
  }
}

export class PacketSentEvent extends NiimbotEvent {
  packet: NiimbotPacket;
  constructor(packet: NiimbotPacket) {
    super("packetsent");
    this.packet = packet;
  }
}

export class RawPacketSentEvent extends NiimbotEvent {
  data: Uint8Array;
  constructor(data: Uint8Array) {
    super("rawpacketsent");
    this.data = data;
  }
}

export class RawPacketReceivedEvent extends NiimbotEvent {
  data: Uint8Array;
  constructor(data: Uint8Array) {
    super("rawpacketreceived");
    this.data = data;
  }
}

export class HeartbeatEvent extends NiimbotEvent {
  data: HeartbeatData;
  constructor(data: HeartbeatData) {
    super("heartbeat");
    this.data = data;
  }
}

export class HeartbeatFailedEvent extends NiimbotEvent {
  failedAttempts: number;
  constructor(failedAttempts: number) {
    super("heartbeatfailed");
    this.failedAttempts = failedAttempts;
  }
}

export class PrinterInfoFetchedEvent extends NiimbotEvent {
  info: PrinterInfo;
  constructor(info: PrinterInfo) {
    super("printerinfofetched");
    this.info = info;
  }
}

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
}
