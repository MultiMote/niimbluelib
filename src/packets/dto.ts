import { AutoShutdownTime, BatteryChargeLevel, ConnectResult, LabelType, SoundSettingsItemType, SoundSettingsType } from "./payloads";
import { LabelPreset } from "../label_presets";

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
  charge?: BatteryChargeLevel;
  autoShutdownTime?: AutoShutdownTime;
  labelType?: LabelType;
  softwareVersion?: string;
  hardwareVersion?: string;
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
  /** Resolved label dimensions, if barCode/serialNumber matches a known preset */
  labelPreset?: LabelPreset;
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
  chargeLevel?: BatteryChargeLevel;

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
export interface SoundSettings {
  category: SoundSettingsType;
  item: SoundSettingsItemType;
  value: boolean;
}

/**
 * @category Packets
 */
export interface PrinterStatusData {
  supportColor: number;
  protocolVersion: number;
}
