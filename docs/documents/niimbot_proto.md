---
title: NIIMBOT printers protocol
---

WIP

# NIIMBOT printers protocol

## Packet structure

![](proto/packet.png)

* **Prefix** - prefix `0x03` is present in only one command - **Connect**.
* **Head** - always 2 bytes (`0x55` `0x55`).
* **Command** - command (packet) identifier.
* **Data Length** - number of bytes of data.
* **Data** - data with **Data length** length.
* **Checksum** - calculated by XOR of all bytes from **Command** to the last byte of **Data** (inclusive).
* **Tail** - always 2 bytes (`0xAA` `0xAA`).

## List of packets

| Request ID | Name | Response ID(s) | [Simple](#simple-packet) |
|------|------------|------|-|
| 0x01 | PrintStart | 0x02 |✅|
| 0x03 | PageStart | 0x04 |✅|
| 0x05 | PrinterLog | 0x06 |✅|
| 0x0b | AntiFake | 0x0c |✅|
| 0x13 | SetPageSize | 0x14 | |
| 0x15 | PrintQuantity | 0x16 | |
| 0x1a | RfidInfo | 0x1b |✅|
| 0x1c | RfidInfo2 | 0x1d |✅|
| 0x20 | PrintClear | 0x30 |✅|
| 0x21 | SetDensity | 0x31 | |
| 0x23 | SetLabelType | 0x33 | |
| 0x27 | SetAutoShutdownTime | 0x37 | |
| 0x28 | PrinterReset | 0x38 |✅|
| 0x40 | PrinterInfo | 0x4f, 0x47, 0x4d, 0x4a, 0x41, 0x4c, 0x43, 0x46, 0x48, 0x4b, 0x49, 0x42 | |
| 0x54 | RfidSuccessTimes | 0x64 |✅|
| 0x58 | SoundSettings | 0x68 | |
| 0x59 | CalibrateHeight | 0x69 | |
| 0x5a | PrintTestPage | 0x6a |✅|
| 0x70 | WriteRFID | 0x71 | |
| 0x83 | PrintBitmapRowIndexed | ⚠ one way | |
| 0x84 | PrintEmptyRow | ⚠ one way | |
| 0x85 | PrintBitmapRow | ⚠ one way | |
| 0x8e | LabelPositioningCalibration | 0x8f |✅|
| 0xa3 | PrintStatus | 0xb3 |✅|
| 0xa5 | PrinterStatusData | 0xb5 |✅|
| 0xaf | PrinterConfig | 0xbf | |
| 0xc1 | Connect | 0xc2 |✅|
| 0xda | CancelPrint | 0xd0 |✅|
| 0xdc | Heartbeat | 0xde, 0xdf, 0xdd, 0xd9 | |
| 0xe3 | PageEnd | 0xe4 |✅|
| 0xf3 | PrintEnd | 0xf4 |✅|

## Packet details

### Simple packet

This packet has `Data length=1`, `Request ID` and `Data=1`.

Checksum will be same as `Request ID` because `N^1^1 == N`.

Example (RfidInfo):

```
55 55 1a 01 01 1a aa aa
      │  │  │  │
      │  │  │  └─ Checksum (h1a^h01^h01)
      │  │  └─ Data
      │  └─ Data length
      └─ RfidInfo command
```

## Packets example

* `55 55 40 01 0b 4a aa aa` - get device serial number
* `55 55 1a 01 01 1a aa aa` - get rfid data
* `55 55 58 03 01 01 01 5a aa aa` - enable Bluetooth connection sound
* `55 55 58 03 01 01 00 5b aa aa` - disable Bluetooth connection sound
