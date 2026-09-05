# 0.0.1-alpha.45

* node: fix BLE scan and connection setup

# 0.0.1-alpha.44

* Add more packet command ID's
* Add double color printing support to D110MV4PrintTask (`PrintBitmapRowMoreColor` packets)
* Add double color encoding to ImageEncoder.encodeCanvas (second color is #ff0000 when pageColor is DoubleColor)
* BREAKING: ImageEncoder.encodeCanvas now requires implicit parameters
* Add tube printing support for D110MV4PrintTask (options `halfCut`, `tubeWidthMm`, `cutType`, `tubeType`)
