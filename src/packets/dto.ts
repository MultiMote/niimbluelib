import { Bitmask } from "../utils";
import {
  AutoShutdownTime,
  ConnectResult,
  LabelType,
  ResolutionClass,
  SoundSettingsItemType,
  SoundSettingsType,
} from "./enumerations";

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
  uuid2?: string;
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

/**
 * @category Client
 */
export type CombinedRfidInfo = {
  labelRfidInfo?: RfidInfo;
  paperInfo?: PaperInfo;
  ribbonRfidInfo?: RfidInfo;
};

/**
 * @category Packets
 */
export interface PaperInfo {
  valid: boolean;
  gapHeightPixel?: number;
  totalHeightPixel?: number;
  paperType?: LabelType;
  gapHeight?: number;
  totalHeight?: number;
  paperWidthPixel?: number;
  paperWidth?: number;
  paperHeightPixel?: number;
  paperHeight?: number;
  direction?: number;
  tailLengthPixel?: number;
  tailLength?: number;
}

export interface PrinterCapabilities {
  language?: Bitmask;
  printMode?: Bitmask;
  uhfRfid?: Bitmask;
  /** 200 (not 203) or 300 */
  printheadDpi?: number;
  rfidSupport?: Bitmask;

  batteryRange?: {
    max: number;
    min: number;
  };

  densityRange?: {
    max: number;
    min: number;
  };

  speedRange?: {
    max: number;
    min: number;
  };

  supportedLabelTypes?: Bitmask;
  printheadWidth?: number;
  maxPrintHeight?: number;
  labelHeightAndGap?: number;
  printheadPosition?: number;

  volumeSupport?: Bitmask;
  hostStyle?: Bitmask;
  printProtocol?: Bitmask;

  autoShutdownRange?: {
    max: number;
    min: number;
  };

  cutterSupport?: Bitmask;

  cutterDepthRange?: {
    max: number;
    min: number;
  };

  printControl?: Bitmask;
  pauseTimeSupport?: Bitmask;
  paperDetection?: number;
  realTimeClock?: Bitmask;

  keyFunctions?: Array<{key: number, function: Bitmask}>;

  unknown19?: number;

  printColor?: Bitmask;
  speedQualityMode?: Bitmask;
  tubeCalibration?: Bitmask;
  partialRetransmitSupport?: Bitmask;

  maxCompressLines?: number;
  tubeSupport?: Bitmask;
  sixteenGrayMaxBuffer?: number;
  localTemplateSupport?: Bitmask;
  imageCompressSupport?: Bitmask;
  maxImageCompressBytes?: number;
  localTemplateMaxTimeCount?: number;
}
