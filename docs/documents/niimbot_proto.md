---
title: NIIMBOT printers protocol
---

WIP

# NIIMBOT printers protocol

## Packet structure

### Main packet

![](proto/packet.png)

* **Prefix** - prefix `0x03` is present in only one command - **Connect**.
* **Head** - always 2 bytes (`0x55` `0x55`).
* **Command** - command (packet) identifier.
* **Data Length** - number of bytes of data.
* **Data** - data with **Data length** length.
* **Checksum** - calculated by XOR of all bytes from **Command** to the last byte of **Data** (inclusive).
* **Tail** - always 2 bytes (`0xAA` `0xAA`).

### CRC32 (firmware) packet

![](proto/crc32packet.png)

* **Head** - always 2 bytes (`0x55` `0x55`).
* **Command** - command (packet) identifier.
* **Index** - firmware chunk index, used only in `FirmwareChunk` and `In_RequestFirmwareChunk` packets, otherwise equals zero.
* **Data Length** - number of bytes of data.
* **Data** - data with **Data length** length.
* **Checksum** - crc32 checksum of all bytes from **Command** to the last byte of **Data** (inclusive).
* **Tail** - always 2 bytes (`0xAA` `0xAA`).

## List of packet commands

| Request ID | Name | Response ID(s) | [Simple OUT](#simple-request-packet) | [Simple IN](#simple-response-packet) |
|------|------------|------|-|-|
| 0x01 | [PrintStart](#printstart)        | 0x02 |❌|✅|
| 0x03 | PageStart                        | 0x04 |✅|✅|
| 0x05 | PrinterLog                       | 0x06 |✅|❌|
| 0x0b | AntiFake                         | 0x0c |✅|❌|
| 0x0d | GetPrintQuality                  | 0x0d |❌|❌|
| 0x13 | [SetPageSize](#setpagesize)      | 0x14 |❌|✅|
| 0x15 | PrintQuantity                    | 0x16 |❌|✅|
| 0x1a | RfidInfo                         | 0x1b |✅|❌|
| 0x1c | RfidInfo2                        | 0x1d |✅|❌|
| 0x20 | PrintClear                       | 0x30 |✅|✅|
| 0x21 | SetDensity                       | 0x31 |❌|✅|
| 0x23 | SetLabelType                     | 0x33 |❌|✅|
| 0x27 | SetAutoShutdownTime              | 0x37 |❌|✅|
| 0x28 | PrinterReset                     | 0x38 |✅|❌|
| 0x40 | PrinterInfo                      | 0x4f, 0x47, 0x4d, 0x4a, 0x41, 0x4c, 0x43, 0x46, 0x48, 0x4b, 0x49, 0x42 |✅|❌|
| 0x54 | RfidSuccessTimes                 | 0x64 |✅|❌|
| 0x58 | SoundSettings                    | 0x68 |❌|❌|
| 0x59 | CalibrateHeight                  | 0x69 |❌|❓ |
| 0x5a | PrintTestPage                    | 0x6a |✅|✅|
| 0x70 | WriteRFID                        | 0x71 |❓|❓ |
| 0x83 | [PrintBitmapRowIndexed](#printbitmaprowindexed) |❌|❌|❌|
| 0x84 | [PrintEmptyRow](#printemptyrow)  |  ❌  |❌|❌|
| 0x85 | [PrintBitmapRow](#printbitmaprow)|  ❌  |❌|❌|
| 0x8e | LabelPositioningCalibration | 0x8f |✅|✅|
| 0xa3 | PrintStatus                      | 0xb3 |✅|❌|
| 0xa5 | PrinterStatusData                | 0xb5 |✅|❌|
| 0xaf | PrinterConfig                    | 0xbf |❌|❌|
| 0xc1 | Connect                          | 0xc2 |✅|❌|
| 0xda | CancelPrint                      | 0xd0 |✅|✅|
| 0xdc | Heartbeat                        | 0xde, 0xdf, 0xdd, 0xd9 |❌|❌|
| 0xe3 | PageEnd                          | 0xe4 |✅|✅|
| 0xf3 | PrintEnd                         | 0xf4 |✅|✅|
| 0xf5 | StartFirmwareUpgrade             | 0xf6 |❌|✅|

CRC32 packets:

| Request ID | Name |
|------|------------|
| 0x91 | FirmwareCrc          |
| 0x92 | FirmwareCommit       |
| 0x9b | FirmwareChunk        |
| 0x9c | FirmwareNoMoreChunks |

Comes from printer only:

| Request ID | Name | Client response ID | CRC32 |
|------|------------|------|-|
| 0xe0 | In_PrinterPageIndex | |
| 0x90 | In_RequestFirmwareCrc | 0x91 |✅|
| 0x9a | In_RequestFirmwareChunk | 0x9b |✅|
| 0x9d | In_FirmwareCheckResult | |✅|
| 0x9e | In_FirmwareResult | |✅|

## Packet details

### Simple request packet

This packet has `Request ID`, `Data length=1`, and `Data=1`.

Checksum will be same as `Request ID` because `N^1^1 == N`.

Example (RfidInfo):

```
55 55 1a 01 01 1a aa aa
       │  │  │  │
       │  │  │  └─ Checksum (1a^01^01)
       │  │  └─ Data
       │  └─ Data length
       └─ RfidInfo command
```

### Simple response packet

Same format as [simple request packet](#simple-response-packet).

Example (In_SetDensity):

```
55 55 31 01 01 31 aa aa
       │  │  │  │
       │  │  │  └─ Checksum (31^01^01)
       │  │  └─ Data (1 - success, 0 - error)
       │  └─ Data length
       └─ In_SetDensity command
```

### PrintStart

Can have different format depending on the model.

#### 1 byte (used in D11, B21, D110)

```
55 55 02 01 01 XX aa aa
       │  │  │  │
       │  │  │  └─ Checksum
       │  │  └─ Always 1
       │  └─ Data length
       └─ PrintStart command
```

#### 2 bytes

```
55 55 01 02 00 01 XX aa aa
       │  │  └──┤  │
       │  │     │  └─ Checksum
       │  │     └─ Total pages (sum of page quantity of each page)
       │  └─ Data length
       └─ PrintStart command
```

#### 7 bytes (used in B1 and newer printers)

```
55 55 01 07 00 01 00 00 00 00 00 XX aa aa
       │  │  └──┤  └──┴──┴──┘  │  │
       │  │     │   Always 0   │  └─ Checksum
       │  │     │              └─ Page color (unknown use)
       │  │     └─ Total pages (sum of page quantity of each page)
       │  └─ Data length
       └─ PrintStart command
```

#### 9 bytes

```
55 55 01 09 00 01 00 00 00 00 00 00 00 XX aa aa
       │  │  └──┤  └──┴──┴──┘  │  │  │  │
       │  │     │   Always 0   │  │  │  └─ Checksum
       │  │     │              │  │  └─ Some flag (unknown use)
       │  │     │              │  └─ Quality (unknown use)
       │  │     │              └─ Page color (unknown use)
       │  │     └─ Total pages (sum of page quantity of each page)
       │  └─ Data length
       └─ PrintStart command
```

### SetPageSize

Can have different format depending on the model.
Column count must be less or equal printhead size.

#### 2 bytes

```
55 55 13 02 00 f0 XX aa aa
       │  │  └──┤  │
       │  │     │  └─ Checksum
       │  │     └─ Row count (240px)
       │  └─ Data length
       └─ SetPageSize command
```

#### 4 bytes

```
55 55 13 04 00 f0 01 80 XX aa aa
       │  │  └──┤  └──┤  │
       │  │     │     │  └─ Checksum
       │  │     │     └─ Column count (384px)
       │  │     └─ Row count (240px)
       │  └─ Data length
       └─ SetPageSize command
```

#### 6 bytes

```
55 55 13 06 00 f0 01 80 00 01 XX aa aa
       │  │  └──┤  └──┤  └──┤  │
       │  │     │     │     │  └─ Checksum
       │  │     │     │     └─ Copies count
       │  │     │     └─ Column count (384px)
       │  │     └─ Row count (240px)
       │  └─ Data length
       └─ SetPageSize command
```

#### 9 bytes

```
55 55 13 09 00 f0 01 80 00 01 00 00 00 XX aa aa
       │  │  └──┤  └──┤  └──┤  └──┤  │  │
       │  │     │     │     │     │  │  └─ Checksum
       │  │     │     │     │     │  └─ Is divide (0 or 1, unknown use)
       │  │     │     │     │     └─ Some size (unknown use)
       │  │     │     │     └─ Copies count (1)
       │  │     │     └─ Column count (384px)
       │  │     └─ Row count (240px)
       │  └─ Data length
       └─ SetPageSize command
```

## Packet details (image data packets)

See [print tasks](niimbot_print_tasks.md) to understand how to images are printed.

### PrintEmptyRow

Used to fill row with blank (white) pixels.

Example:

```
55 55 84 03 00 04 02 XX aa aa
       │  │  └──┤  │  │
       │  │     │  │  └─ Checksum
       │  │     │  └─ Repeat count (repeat row two times)
       │  │     └─ Row number is 4
       │  └─ Data length
       └─ PrintEmptyRow command
```

### PrintBitmapRowIndexed

Used when black pixel count is less than 7. Data is encoded with pixel indexes (unsigned 16-bit integers).

Information about `Black pixel count` segment can be found in {@link API.Utils.countPixelsForBitmapPacket} function docs.

Usually printer prints without problems when all of 3 bytes are zeros.

Example:

```
55 55 83 0a 00 03 02 00 00 02 00 0a 01 40 XX aa aa
       │  │  └──┤  └──┴──┤  │  └──┤  └──┤  │
       │  │     │        │  │     │     │  └─ Checksum
       │  │     │        │  │     │     └─ Draw pixel at x=320
       │  │     │        │  │     └─ Draw pixel at x=10
       │  │     │        │  └─ Repeat count (repeat row two times)
       │  │     │        └─ Black pixel count (see above)
       │  │     └─ Row number is 3
       │  └─ Data length
       └─ PrintBitmapRowIndexed command
```

### PrintBitmapRow

Used to send full row segment that includes both black and white pixels.

Image row example:

![pixels](proto/pixels.png)

Packet example:

```
55 55 85 0a 00 00 13 00 00 01 ff 00 df 0f XX aa aa
       │  │  └──┤  └──┴──┤  │  └──┴──┴──┤  │
       │  │     │        │  │           │  └─ Checksum
       │  │     │        │  │           │
       │  │     │        │  │           └─ Draw 32 pixels (19 black, 13 empty)
       │  │     │        │  └─ Repeat count (repeat row 1 time)
       │  │     │        └─ Black pixel count (19)
       │  │     └─ Row number is 0
       │  └─ Data length
       └─ PrintBitmapRow command

```

## Other packets example

* `55 55 40 01 0b 4a aa aa` - get device serial number
* `55 55 1a 01 01 1a aa aa` - get rfid data
* `55 55 58 03 01 01 01 5a aa aa` - enable Bluetooth connection sound
* `55 55 58 03 01 01 00 5b aa aa` - disable Bluetooth connection sound
