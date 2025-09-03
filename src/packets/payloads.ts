/**
 * Sent with {@link RequestCommandId.PrinterInfo}
 * @category Packets
 **/
export enum PrinterInfoType {
  Density = 1,
  Speed = 2,
  LabelType = 3,
  Language = 6,
  AutoShutdownTime = 7,
  /** See {@link modelsLibrary} */
  PrinterModelId = 8,
  SoftWareVersion = 9,
  BatteryChargeLevel = 10,
  SerialNumber = 11,
  HardWareVersion = 12,
  BluetoothAddress = 13,
  PrintMode = 14,
  Area = 15,
}

/** @category Packets */
export enum SoundSettingsType {
  SetSound = 0x01,
  GetSoundState = 0x02,
}

/** @category Packets */
export enum SoundSettingsItemType {
  BluetoothConnectionSound = 0x01,
  PowerSound = 0x02,
}

/**
 * Sent with {@link RequestCommandId.SetLabelType}.
 *
 * @category Packets
 **/
export enum LabelType {
  Invalid = 0,
  /** Default for most of label printers */
  WithGaps = 1,
  Black = 2,
  Continuous = 3,
  Perforated = 4,
  Transparent = 5,
  PvcTag = 6,
  BlackMarkGap = 10,
  HeatShrinkTube = 11,
}

/** @category Packets */
export enum HeartbeatType {
  Advanced1 = 1,
  Basic = 2,
  Unknown = 3,
  Advanced2 = 4,
}

/** @category Packets */
export enum AutoShutdownTime {
  /** Usually 15 minutes. */
  ShutdownTime1 = 1,
  /** Usually 30 minutes. */
  ShutdownTime2 = 2,
  /** May be 45 or 60 minutes (depending on model). */
  ShutdownTime3 = 3,
  /** May be 60 minutes or never (depending on model). */
  ShutdownTime4 = 4,
}

/**
 * Battery charge level
 * @category Packets
 **/
export enum BatteryChargeLevel {
  Charge0 = 0,
  Charge25 = 1,
  Charge50 = 2,
  Charge75 = 3,
  Charge100 = 4,
}

/**
 * {@link ResponseCommandId.In_Connect} status codes.
 * @category Packets
 **/
export enum ConnectResult {
  Disconnect = 0,
  Connected = 1,
  ConnectedNew = 2,
  ConnectedV3 = 3,
  FirmwareErrors = 90,
}

/**
 * {@link ResponseCommandId.In_PrintError} status codes.
 * @category Packets
 **/
export enum PrinterErrorCode {
  CoverOpen = 0x01,
  /** No paper */
  LackPaper = 0x02,
  LowBattery = 0x03,
  BatteryException = 0x04,
  UserCancel = 0x05,
  DataError = 0x06,
  Overheat = 0x07,
  PaperOutException = 0x08,
  PrinterBusy = 0x09,
  NoPrinterHead = 0x0a,
  TemperatureLow = 0x0b,
  PrinterHeadLoose = 0x0c,
  NoRibbon = 0x0d,
  WrongRibbon = 0x0e,
  UsedRibbon = 0x0f,
  WrongPaper = 0x10,
  SetPaperFail = 0x11,
  SetPrintModeFail = 0x12,
  SetPrintDensityFail = 0x13,
  WriteRfidFail = 0x14,
  SetMarginFail = 0x15,
  CommunicationException = 0x16,
  Disconnect = 0x17,
  CanvasParameterError = 0x18,
  RotationParameterException = 0x19,
  JsonParameterException = 0x1a,
  B3sAbnormalPaperOutput = 0x1b,
  ECheckPaper = 0x1c,
  RfidTagNotWritten = 0x1d,
  SetPrintDensityNoSupport = 0x1e,
  SetPrintModeNoSupport = 0x1f,
  SetPrintLabelMaterialError = 0x20,
  SetPrintLabelMaterialNoSupport = 0x21,
  NotSupportWrittenRfid = 0x22,
  IllegalPage = 0x32,
  IllegalRibbonPage = 0x33,
  ReceiveDataTimeout = 0x34,
  NonDedicatedRibbon = 0x35,
}
