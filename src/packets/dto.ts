import { AutoShutdownTime, ConnectResult, LabelType, ResolutionClass, SoundSettingsItemType, SoundSettingsType } from "./enumerations";

/**
 * @category Packets
 */
export class PrintError extends Error {
  public readonly reasonId: number;

  constructor(message: string, reasonId: number) {
    super(message);
    this.reasonId = reasonId;
  }
}

/**
 * Interface representing printer information.
 *
 * @category Client
 */
export interface PrinterInfo {
  connectResult?: ConnectResult;
  protocolVersion?: number;
  modelId?: number;
  serial?: string;
  mac?: string;
  batteryPercents?: number;
  autoShutdownTime?: AutoShutdownTime;
  labelType?: LabelType;
  printheadWidth?: number;
  supportColor?: boolean;
  softwareVersion?: string;
  hardwareVersion?: string;
  resolutionClass?: ResolutionClass;
}

/**
 * Interface representing printer information.
 *
 * @category Client
 */
export interface ConnectNegotiateResult {
  connectResult: ConnectResult;
  protocolVersion: number;
  supportColor: boolean;
}

/**
 * @category Packets
 */
export interface PrintStatus {
  /** 0 – n */
  page: number;
  /** 0 – 100 */
  pagePrintProgress: number;
  /** 0 – 100 */
  pageFeedProgress: number;

  error: number;
}

/**
 * @category Packets
 */
export interface RfidInfo {
  tagPresent: boolean;
  uuid: string;
  barCode: string;
  serialNumber: string;
  allPaper: number;
  usedPaper: number;
  consumablesType: LabelType;
  capacity?: number;
}

/**
 * Available fields depend on model.
 *
 * @category Packets
 **/
export interface HeartbeatData {
  paperInserted?: boolean;
  paperRfidSuccess?: boolean;
  lidClosed?: boolean;
  batteryPercents?: number;

  temp?: number;
  ribbonInserted?: boolean;
  ribbonRfidSuccess?: boolean;

  wifiRssi?: number;
  lightingErrorCode?: number;
  voltageState?: number;
}

/**
 * @category Packets
 */
export interface HeartbeatPrinterInfoData {
  softwareVersion: string;
  hardwareVersion: string;
  printheadWidth: number;
  resolutionClass: ResolutionClass;
  printheadAlignment: number;
  supportsRFID: boolean;
  supportsWriteRFID: boolean;
}

/**
 * @category Packets
 */
export interface SoundSettings {
  category: SoundSettingsType;
  item: SoundSettingsItemType;
  value: boolean;
}

/**
 * @category Packets
 */
export interface PrinterStatusData {
  supportColor: boolean;
  protocolVersion: number;
}
