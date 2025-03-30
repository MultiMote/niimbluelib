import { ConnectionInfo, PrinterInfo, NiimbotPacket, HeartbeatData } from '.'

/**
 * Base client event
 * @category Events
 */
export class NiimbotEvent {
  readonly type: string

  constructor(type: string) {
    this.type = type
  }
}

/**
 * Fired when client connected to printer and fetched it's information.
 * @category Events
 */
export class ConnectEvent extends NiimbotEvent {
  readonly info: ConnectionInfo

  constructor(info: ConnectionInfo) {
    super('connect')
    this.info = info
  }
}

/**
 * Fired when client disconnected from printer.
 * @category Events
 */
export class DisconnectEvent extends NiimbotEvent {
  constructor() {
    super('disconnect')
  }
}

/**
 * Fired when packet received, converted to object and validated (head, tail, checksum).
 * @category Events
 */
export class PacketReceivedEvent extends NiimbotEvent {
  readonly packet: NiimbotPacket

  constructor(packet: NiimbotPacket) {
    super('packetreceived')
    this.packet = packet
  }
}

/**
 * Fired when packet object sent.
 * @category Events
 */
export class PacketSentEvent extends NiimbotEvent {
  readonly packet: NiimbotPacket

  constructor(packet: NiimbotPacket) {
    super('packetsent')
    this.packet = packet
  }
}

/**
 * Fired when raw packet sent to printer.
 * @category Events
 */
export class RawPacketSentEvent extends NiimbotEvent {
  readonly data: Uint8Array

  constructor(data: Uint8Array) {
    super('rawpacketsent')
    this.data = data
  }
}

/**
 * Fired when raw packet received from printer.
 * @category Events
 */
export class RawPacketReceivedEvent extends NiimbotEvent {
  readonly data: Uint8Array

  constructor(data: Uint8Array) {
    super('rawpacketreceived')
    this.data = data
  }
}

/**
 * Fired when heartbeat packet received and parsed.
 * @category Events
 */
export class HeartbeatEvent extends NiimbotEvent {
  readonly data: HeartbeatData

  constructor(data: HeartbeatData) {
    super('heartbeat')
    this.data = data
  }
}

/**
 * Fired when no response received after heartbeat packet sent.
 * @category Events
 */
export class HeartbeatFailedEvent extends NiimbotEvent {
  readonly failedAttempts: number

  constructor(failedAttempts: number) {
    super('heartbeatfailed')
    this.failedAttempts = failedAttempts
  }
}

/**
 * Fired when info fetched from printer (after {@link NiimbotAbstractClient.fetchPrinterInfo} finished).
 * @category Events
 */
export class PrinterInfoFetchedEvent extends NiimbotEvent {
  readonly info: PrinterInfo

  constructor(info: PrinterInfo) {
    super('printerinfofetched')
    this.info = info
  }
}

/**
 * Fired on print progress received during {@link AbstractPrintTask.waitForFinished}.
 * @category Events
 */
export class PrintProgressEvent extends NiimbotEvent {
  /** 0 – n */
  readonly page: number

  readonly pagesTotal: number
  /** 0 – 100 */
  readonly pagePrintProgress: number
  /** 0 – 100 */
  readonly pageFeedProgress: number

  constructor(page: number, pagesTotal: number, pagePrintProgress: number, pageFeedProgress: number) {
    super('printprogress')
    this.page = page
    this.pagesTotal = pagesTotal
    this.pagePrintProgress = pagePrintProgress
    this.pageFeedProgress = pageFeedProgress
  }
}

/**
 * Fired on firmware upload progress during {@link Abstraction.firmwareUpgrade}.
 * @category Events
 */
export class FirmwareProgressEvent extends NiimbotEvent {
  readonly currentChunk: number
  readonly totalChunks: number

  constructor(currentChunk: number, totalChunks: number) {
    super('firmwareprogress')
    this.currentChunk = currentChunk
    this.totalChunks = totalChunks
  }
}

/**
 * Event list for {@link NiimbotAbstractClient}.
 * @category Events
 */
export type ClientEventMap = {
  connect: (event: ConnectEvent) => void
  disconnect: (event: DisconnectEvent) => void
  rawpacketsent: (event: RawPacketSentEvent) => void
  rawpacketreceived: (event: RawPacketReceivedEvent) => void
  packetreceived: (event: PacketReceivedEvent) => void
  packetsent: (event: PacketSentEvent) => void
  heartbeat: (event: HeartbeatEvent) => void
  heartbeatfailed: (event: HeartbeatFailedEvent) => void
  printerinfofetched: (event: PrinterInfoFetchedEvent) => void
  printprogress: (event: PrintProgressEvent) => void
  firmwareprogress: (event: FirmwareProgressEvent) => void
}
