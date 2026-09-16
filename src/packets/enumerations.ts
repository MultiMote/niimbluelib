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

/**
 * Sent with {@link RequestCommandId.PrinterConfig2}
 * @category Packets
 **/
export enum PrinterConfig2Type {
  Time = 8,
}

/**
 * Sent with {@link RequestCommandId.PrinterConfig2}
 * @category Packets
 **/
export enum PrinterConfig2Action {
  SetValue = 1,
  GetValue = 2,
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
  PrinterInfo = 3,
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

/**
 * Sent with {@link RequestCommandId.PrintStart}
 * @category Packets
 **/
export enum PageColorType {
  SingleColor = 0,
  DoubleColor = 1,
  SingleColorAlt = 2,
  MultiorderColor = 3,
}

/**
 * Sent with {@link RequestCommandId.PrintBitmapRowDoubleColor}
 * @category Packets
 **/
export enum BitmapColorMode {
  Empty = 0,
  Red = 1,
  Black = 2,
  Mixed = 3,
}

/**
 * Sent with {@link RequestCommandId.PrintBitmapRowDoubleColor}
 * @category Packets
 **/
export enum ResolutionClass {
  DPI203 = 2,
  DPI300 = 3,
}

export enum PrinterCapabilitiesField {
  Language = 0x01, // uint8, 1
  PrintMode = 0x02, // uint8, 1
  UhfRfid = 0x03, // uint8, 1
  PrintheadDpi = 0x04, // uint16, 2
  RfidSupport = 0x05, // uint8, 1
  BatteryRange = 0x06, // uint8[], 2
  DensityRange = 0x07, // uint8[], 2
  SpeedRange = 0x08, // uint8[], 2
  SupportedLabelTypes = 0x09, // uint8[], 4
  PrintheadWidth = 0x0a, // uint16, 2
  MaxPrintHeight = 0x0b, // uint16, 2
  LabelHeightAndGap = 0x0c, // uint8, 1
  PrintheadPosition = 0x0d, // uint8, 1
  VolumeSupport = 0x0e, // uint8, 1
  HostStyle = 0x0f, // uint8, 1
  PrintProtocol = 0x10, // uint8, 1
  AutoShutdownRange = 0x11, // uint8[], 2
  CutterSupport = 0x12, // uint8, 1
  CutterDepthRange = 0x13, // uint8[], 2
  PrintControl = 0x14, // uint8, 1
  PauseTimeSupport = 0x15, // uint8, 1
  PaperDetection = 0x16, // uint8, 1
  RealTimeClock = 0x17, // uint8, 1
  KeyFunctions = 0x18, // uint8[], variable
  Unknown19 = 0x19, // uint8, 1
  PrintColor = 0x1a, // uint8, 1
  SpeedQualityMode = 0x1b, // uint8, 1
  TubeCalibration = 0x1c, // uint8, 1
  PartialRetransmitSupport = 0x1d, // uint8, 1
  MaxCompressLines = 0x1e, // uint16, 2
  TubeSupport = 0x1f, // uint8, 1
  SixteenGrayMaxBuffer = 0x20, // uint16, 2
  LocalTemplateSupport = 0x21, // uint8, 1
  ImageCompressSupport = 0x22, // uint8, 1
  MaxImageCompressBytes = 0x23, // uint32, 4
  LocalTemplateMaxTimeCount = 0x24, // uint8, 1
}
