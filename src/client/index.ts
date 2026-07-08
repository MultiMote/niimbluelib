import { NiimbotAbstractClient, ConnectionInfo, NIIMBOT_CLIENT_DEFAULTS } from "./abstract_client";
import { NiimbotBluetoothClient } from "./bluetooth_impl";
import { NiimbotCapacitorBleClient, NiimbotCapacitorBleClientConnectOptions } from "./capacitor_ble_impl";
import { NiimbotSerialClient } from "./serial_impl";
import { NiimbotNodeBleClient } from "./node_ble_impl";
import { NiimbotNodeSerialClient } from "./node_serial_impl";

/** Client type for {@link instantiateClient} */
export type NiimbotClientType = "bluetooth" | "serial" | "capacitor-ble" | "node-ble" | "node-serial";

/** Create new client instance */
export const instantiateClient = (t: NiimbotClientType): NiimbotAbstractClient => {
  if (t === "bluetooth") {
    return new NiimbotBluetoothClient();
  } else if (t === "capacitor-ble") {
    return new NiimbotCapacitorBleClient();
  } else if (t === "serial") {
    return new NiimbotSerialClient();
  } else if (t === "node-ble") {
    return new NiimbotNodeBleClient();
  } else if (t === "node-serial") {
    return new NiimbotNodeSerialClient();
  }
  throw new Error("Invalid client type");
};

export {
  NiimbotAbstractClient,
  ConnectionInfo,
  NiimbotBluetoothClient,
  NiimbotCapacitorBleClient,
  NiimbotCapacitorBleClientConnectOptions,
  NiimbotSerialClient,
  NiimbotNodeBleClient,
  NiimbotNodeSerialClient,
  NIIMBOT_CLIENT_DEFAULTS,
};
