# 0.0.1-alpha.46

* BREAKING: rename `abstraction` to `protocol`
* Move parsing operations to `PacketParser`
* Allow reconnecting to an previously authorized `SerialPort`/`BluetoothDevice`

# 0.0.1-alpha.45

* node: fix BLE scan and connection setup
* Add `NiimbotClientType.getType`
* Add statusPollTimer cleanup to printEnd
* `AbstractPrintTask`:
   - Add `isSupportColor`, `setPrintOptions`, `reset` (allow reusing the same print task for multiple print jobs)
   - Add `options.cutHeight`
   - Fix `options.cutType` not being used
* Add `printheadWidth`, `supportColor` gathering on printer connection (`PrinterInfo` object)
* Add double color support to `B1PrintTask`

# 0.0.1-alpha.44

* Add more packet command ID's
* Add double color printing support to `D110MV4PrintTask` (`PrintBitmapRowMoreColor` packets)
* Add double color encoding to `ImageEncoder.encodeCanvas` (second color is #ff0000 when pageColor is DoubleColor)
* BREAKING: `ImageEncoder.encodeCanvas` now requires implicit parameters
* Add tube printing support for `D110MV4PrintTask` (options `halfCut`, `tubeWidthMm`, `cutType`, `tubeType`)
