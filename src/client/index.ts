export { NiimbotAbstractClient, type ConnectionInfo, NIIMBOT_CLIENT_DEFAULTS, createPrinterInfo } from "./abstract_client";
export { NiimbotBluetoothClient, type NiimbotBluetoothClientConnectOptions } from "./bluetooth_impl";
export { NiimbotSerialClient, type NiimbotSerialClientConnectOptions } from "./serial_impl";
export { NiimbotVirtualClient } from "./virtual_impl";
