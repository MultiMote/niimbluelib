import { NiimbotAbstractClient, ConnectionInfo, NIIMBOT_CLIENT_DEFAULTS } from "./abstract_client";
import { NiimbotBluetoothClient } from "./bluetooth_impl";
import { NiimbotCapacitorBleClient, NiimbotCapacitorBleClientConnectOptions } from "./capacitor_ble_impl";
import { NiimbotSerialClient } from "./serial_impl";
import { NiimbotNodeBleClient } from "./node_ble_impl";
import { NiimbotNodeSerialClient } from "./node_serial_impl";

/** Client type for {@link instantiateClient} */
export type NiimbotClientType = "bluetooth" | "serial" | "capacitor-ble" | "node-ble" | "node-serial";

const clientFactories: Record<NiimbotClientType, () => NiimbotAbstractClient> = {
  "bluetooth": () => new NiimbotBluetoothClient(),
  "serial": () => new NiimbotSerialClient(),
  "capacitor-ble": () => new NiimbotCapacitorBleClient(),
  "node-ble": () => new NiimbotNodeBleClient(),
  "node-serial": () => new NiimbotNodeSerialClient(),
};

/** Create new client instance */
export const instantiateClient = (t: NiimbotClientType): NiimbotAbstractClient => {
  const client = clientFactories[t]();
  if (client !== undefined) {
    return client;
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
