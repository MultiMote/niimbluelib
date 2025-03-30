import { ConnectEvent, DisconnectEvent, RawPacketSentEvent } from '../events'
import { ConnectionInfo, NiimbotAbstractClient } from '.'
import { ConnectResult } from '../packets'
import { Utils } from '../utils'
import { modelsLibrary } from '../printer_models'

const getAllModelFirstLetters = (): string[] => [...new Set(modelsLibrary.map(m => m.model[0]))]

/**
 * @category Client
 */
export class BleDefaultConfiguration {
  public static readonly SERVICES: string[] = ['e7810a71-73ae-499d-8c15-faa9aef0c3f2']
  public static readonly NAME_FILTERS: BluetoothLEScanFilter[] = [
    ...getAllModelFirstLetters().map(l => ({ namePrefix: l })),
  ]
}

/**
 * Uses [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
 *
 * @category Client
 */
export class NiimbotBluetoothClient extends NiimbotAbstractClient {
  private gattServer?: BluetoothRemoteGATTServer = undefined
  private channel?: BluetoothRemoteGATTCharacteristic = undefined
  private serviceUuidFilter: string[] = BleDefaultConfiguration.SERVICES

  public getServiceUuidFilter(): string[] {
    return this.serviceUuidFilter
  }

  public setServiceUuidFilter(ids: string[]): void {
    this.serviceUuidFilter = ids
  }

  public async connect(): Promise<ConnectionInfo> {
    await this.disconnect()

    const options: RequestDeviceOptions = {
      filters: [
        ...BleDefaultConfiguration.NAME_FILTERS,
        {
          services: this.serviceUuidFilter ?? BleDefaultConfiguration.SERVICES,
        },
      ],
    }

    const device: BluetoothDevice = await navigator.bluetooth.requestDevice(options)

    if (device.gatt === undefined) {
      throw new Error('Device has no Bluetooth Generic Attribute Profile')
    }

    const disconnectListener = () => {
      this.gattServer = undefined
      this.channel = undefined
      this.info = {}
      this.emit('disconnect', new DisconnectEvent())
      device.removeEventListener('gattserverdisconnected', disconnectListener)
    }

    device.addEventListener('gattserverdisconnected', disconnectListener)

    const gattServer: BluetoothRemoteGATTServer = await device.gatt.connect()

    const channel: BluetoothRemoteGATTCharacteristic | undefined =
      await this.findSuitableBluetoothCharacteristic(gattServer)

    if (channel === undefined) {
      gattServer.disconnect()
      throw new Error('Suitable device characteristic not found')
    }

    console.log(`Found suitable characteristic ${channel.uuid}`)

    channel.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic
      this.processRawPacket(target.value!)
    })

    await channel.startNotifications()

    this.gattServer = gattServer
    this.channel = channel

    try {
      await this.initialNegotiate()
      await this.fetchPrinterInfo()
    } catch (e) {
      console.error('Unable to fetch printer info.')
      console.error(e)
    }

    const result: ConnectionInfo = {
      deviceName: device.name,
      result: this.info.connectResult ?? ConnectResult.FirmwareErrors,
    }

    this.emit('connect', new ConnectEvent(result))

    return result
  }

  private async findSuitableBluetoothCharacteristic(
    gattServer: BluetoothRemoteGATTServer,
  ): Promise<BluetoothRemoteGATTCharacteristic | undefined> {
    const services: BluetoothRemoteGATTService[] = await gattServer.getPrimaryServices()

    for (const service of services) {
      if (service.uuid.length < 5) {
        continue
      }

      const characteristics: BluetoothRemoteGATTCharacteristic[] = await service.getCharacteristics()

      for (const c of characteristics) {
        if (c.properties.notify && c.properties.writeWithoutResponse) {
          return c
        }
      }
    }
    return undefined
  }

  public isConnected(): boolean {
    return this.gattServer !== undefined && this.channel !== undefined
  }

   
  public async disconnect() {
    this.stopHeartbeat()
    this.gattServer?.disconnect()
    this.gattServer = undefined
    this.channel = undefined
    this.info = {}
  }

  public async sendRaw(data: Uint8Array, force?: boolean) {
    const send = async () => {
      if (this.channel === undefined) {
        throw new Error('Channel is closed')
      }
      await Utils.sleep(this.packetIntervalMs)
      await this.channel.writeValueWithoutResponse(data)
      this.emit('rawpacketsent', new RawPacketSentEvent(data))
    }

    if (force) {
      await send()
    } else {
      await this.mutex.runExclusive(send)
    }
  }
}
