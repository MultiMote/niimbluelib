/**
 * Commands IDs from client to printer
 *
 * @category Packets
 **/
export enum RequestCommandId {
  Invalid = -1,
  /** Entire packet should be prefixed with 0x03 */
  Connect = 0xc1,
  CancelPrint = 0xda,
  CalibrateHeight = 0x59,
  Heartbeat = 0xdc,
  LabelPositioningCalibration = 0x8e,
  PageEnd = 0xe3,
  PrinterLog = 0x05,
  PageStart = 0x03,
  PrintBitmapRow = 0x85,
  /** Sent if black pixels < 6 */
  PrintBitmapRowIndexed = 0x83,
  PrintClear = 0x20,
  PrintEmptyRow = 0x84,
  PrintEnd = 0xf3,
  PrinterInfo = 0x40,
  PrinterConfig = 0xaf,
  PrinterStatusData = 0xa5,
  PrinterReset = 0x28,
  PrintQuantity = 0x15,
  PrintStart = 0x01,
  PrintStatus = 0xa3,
  RfidInfo = 0x1a,
  RfidInfo2 = 0x1c,
  RfidSuccessTimes = 0x54,
  SetAutoShutdownTime = 0x27,
  SetDensity = 0x21,
  SetLabelType = 0x23,
  /** 2, 4 or 6 bytes */
  SetPageSize = 0x13,
  SoundSettings = 0x58,
  /** some info request (niimbot app), 01 long 02 short */
  AntiFake = 0x0b,
  /** same as GetVolumeLevel??? */
  WriteRFID = 0x70,
  PrintTestPage = 0x5a,
  StartFirmwareUpgrade = 0xf5,
  FirmwareCrc = 0x91,
  FirmwareCommit = 0x92,
  FirmwareChunk = 0x9b,
  FirmwareNoMoreChunks = 0x9c,
  PrinterCheckLine = 0x86
}

/**
 * Commands IDs from printer to client
 *
 * @category Packets
 **/
export enum ResponseCommandId {
  Invalid = -1,
  In_NotSupported = 0x00,
  In_Connect = 0xc2,
  In_CalibrateHeight = 0x69,
  In_CancelPrint = 0xd0,
  In_AntiFake = 0x0c,
  In_HeartbeatAdvanced1 = 0xdd,
  In_HeartbeatBasic = 0xde,
  In_HeartbeatUnknown = 0xdf,
  In_HeartbeatAdvanced2 = 0xd9,
  In_LabelPositioningCalibration = 0x8f,
  In_PageStart = 0x04,
  In_PrintClear = 0x30,
  /** Sent by some printers after {@link RequestCommandId.PageEnd} along with {@link ResponseCommandId.In_PageEnd} */
  In_PrinterCheckLine = 0xd3,
  In_PrintEnd = 0xf4,
  In_PrinterConfig = 0xbf,
  In_PrinterLog = 0x06,
  In_PrinterInfoAutoShutDownTime = 0x47,
  In_PrinterInfoBluetoothAddress = 0x4d,
  In_PrinterInfoSpeed = 0x42,
  In_PrinterInfoDensity = 0x41,
  In_PrinterInfoLanguage = 0x46,
  In_PrinterInfoChargeLevel = 0x4a,
  In_PrinterInfoHardWareVersion = 0x4c,
  In_PrinterInfoLabelType = 0x43,
  In_PrinterInfoPrinterCode = 0x48,
  In_PrinterInfoSerialNumber = 0x4b,
  In_PrinterInfoSoftWareVersion = 0x49,
  In_PrinterInfoArea = 0x4f,
  In_PrinterStatusData = 0xb5,
  In_PrinterReset = 0x38,
  In_PrintStatus = 0xb3,
  /** For example, received after {@link RequestCommandId.SetPageSize} when page print is not started. */
  In_PrintError = 0xdb,
  In_PrintQuantity = 0x16,
  In_PrintStart = 0x02,
  In_RfidInfo = 0x1b,
  In_RfidInfo2 = 0x1d,
  In_RfidSuccessTimes = 0x64,
  In_SetAutoShutdownTime = 0x37,
  In_SetDensity = 0x31,
  In_SetLabelType = 0x33,
  In_SetPageSize = 0x14,
  In_SoundSettings = 0x68,
  In_PageEnd = 0xe4,
  In_PrinterPageIndex = 0xe0,
  In_PrintTestPage = 0x6a,
  In_WriteRFID = 0x71,
  In_StartFirmwareUpgrade = 0xf6,
  In_RequestFirmwareCrc = 0x90,
  In_RequestFirmwareChunk = 0x9a,
  In_FirmwareCheckResult = 0x9d,
  In_FirmwareResult = 0x9e,
  /** Sent before {@link ResponseCommandId.In_PrinterCheckLine } */
  In_ResetTimeout = 0xc6,
}

import TX = RequestCommandId;
import RX = ResponseCommandId;

/**
 * Map request id to response id. null meant no response expected (one way).
 *
 * @category Packets
 **/
export const commandsMap: Record<RequestCommandId, ResponseCommandId[] | null> = {
  [TX.Invalid]: null,
  [TX.PrintBitmapRow]: null,
  [TX.PrintBitmapRowIndexed]: null,
  [TX.PrintEmptyRow]: null,
  [TX.Connect]: [RX.In_Connect],
  [TX.CancelPrint]: [RX.In_CancelPrint],
  [TX.CalibrateHeight]: [RX.In_CalibrateHeight],
  [TX.Heartbeat]: [RX.In_HeartbeatBasic, RX.In_HeartbeatUnknown, RX.In_HeartbeatAdvanced1, RX.In_HeartbeatAdvanced2],
  [TX.LabelPositioningCalibration]: [RX.In_LabelPositioningCalibration],
  [TX.PageEnd]: [RX.In_PageEnd],
  [TX.PrinterLog]: [RX.In_PrinterLog],
  [TX.PageStart]: [RX.In_PageStart],
  [TX.PrintClear]: [RX.In_PrintClear],
  [TX.PrintEnd]: [RX.In_PrintEnd],
  [TX.PrinterInfo]: [
    RX.In_PrinterInfoArea,
    RX.In_PrinterInfoAutoShutDownTime,
    RX.In_PrinterInfoBluetoothAddress,
    RX.In_PrinterInfoChargeLevel,
    RX.In_PrinterInfoDensity,
    RX.In_PrinterInfoHardWareVersion,
    RX.In_PrinterInfoLabelType,
    RX.In_PrinterInfoLanguage,
    RX.In_PrinterInfoPrinterCode,
    RX.In_PrinterInfoSerialNumber,
    RX.In_PrinterInfoSoftWareVersion,
    RX.In_PrinterInfoSpeed,
  ],
  [TX.PrinterConfig]: [RX.In_PrinterConfig],
  [TX.PrinterStatusData]: [RX.In_PrinterStatusData],
  [TX.PrinterReset]: [RX.In_PrinterReset],
  [TX.PrintQuantity]: [RX.In_PrintQuantity],
  [TX.PrintStart]: [RX.In_PrintStart],
  [TX.PrintStatus]: [RX.In_PrintStatus],
  [TX.RfidInfo]: [RX.In_RfidInfo],
  [TX.RfidInfo2]: [RX.In_RfidInfo2],
  [TX.RfidSuccessTimes]: [RX.In_RfidSuccessTimes],
  [TX.SetAutoShutdownTime]: [RX.In_SetAutoShutdownTime],
  [TX.SetDensity]: [RX.In_SetDensity],
  [TX.SetLabelType]: [RX.In_SetLabelType],
  [TX.SetPageSize]: [RX.In_SetPageSize],
  [TX.SoundSettings]: [RX.In_SoundSettings],
  [TX.AntiFake]: [RX.In_AntiFake],
  [TX.WriteRFID]: [RX.In_WriteRFID],
  [TX.PrintTestPage]: [RX.In_PrintTestPage],
  [TX.StartFirmwareUpgrade]: [RX.In_StartFirmwareUpgrade],
  [TX.FirmwareCrc]: null,
  [TX.FirmwareChunk]: null,
  [TX.FirmwareNoMoreChunks]: null,
  [TX.FirmwareCommit]: null,
  [TX.PrinterCheckLine]: [RX.In_PrinterCheckLine]
};

export const firmwareExchangePackets: { tx: RequestCommandId[]; rx: ResponseCommandId[] } = {
  tx: [TX.FirmwareChunk, TX.FirmwareCrc, TX.FirmwareNoMoreChunks, TX.FirmwareCommit],
  rx: [RX.In_RequestFirmwareCrc, RX.In_RequestFirmwareChunk, RX.In_FirmwareCheckResult, RX.In_FirmwareResult],
};
