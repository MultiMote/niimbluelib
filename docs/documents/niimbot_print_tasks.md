---
title: NIIMBOT print tasks
---

# NIIMBOT print tasks

Unfortunately, print sequence is not same across different printer models.
In order to support a wide model range, print tasks have been implemented.

The name of the print task does not necessarily represent the only model it will work with.
`PrintEnd` should be sent after the print is finished (progress polling is used).

## D11_V1

Used in old D11 models.

Print progress is fetched by continuously waiting `In_PrinterPageIndex` packet with `Data == total pages`.

Init:

```
SetDensity [density(u8)]
SetLabelType [type(u8)]
PrintStart [1(u8)]
```

Page:

```
PrintClear [1(u8)]
PageStart [1(u8)]
SetPageSize [rows(u16)]
PrintQuantity [quantity(u16)]
PrintEmptyRow | PrintBitmapRow | PrintBitmapRowIndexed
PageEnd [1(u8)]
```

End:

```
(status wait)
PrintEnd [1(u8)]
```

## B21_V1

Print progress is fetched by continuously sending `PrintEnd`. Print is finished when `Data == 1`.

Init:

```
SetDensity [density(u8)]
SetLabelType [type(u8)]
PrintStart [1(u8)]
```

Page:

```
PrintClear [1(u8)]
PageStart [1(u8)]
SetPageSize [rows(u16), cols(u16)]
PrintEmptyRow | PrintBitmapRow | PrintBitmapRowIndexed
PageEnd [1(u8)]
```

End:

```
(status poll)
```

## D110

Used in 203 DPI D110, D11.

Print progress is fetched by continuously sending `PrintStatus`.

Init:

```
SetDensity [density(u8)]
SetLabelType [type(u8)]
PrintStart [1(u8)]
```

Page:

```
PrintClear [1(u8)]
PageStart [1(u8)]
SetPageSize [rows(u16), cols(u16)]
PrintQuantity [quantity(u16)]
PrintEmptyRow | PrintBitmapRow | PrintBitmapRowIndexed
PageEnd [1(u8)]
```

End:

```
(status poll)
PrintEnd [1(u8)]
```

## B1

Used in most printers released recently (2024).

Print progress is fetched by continuously sending `PrintStatus`.

Init:

```
SetDensity [density(u8)]
SetLabelType [type(u8)]
PrintStart [totalPages(u16), 0(u8), 0(u8), 0(u8), 0(u8), pageColor(u8)]
```

Page:

```
PageStart [1(u8)]
SetPageSize [rows(u16), cols(u16), copiesCount(u16)]
PrintEmptyRow | PrintBitmapRow | PrintBitmapRowIndexed
PageEnd [1(u8)]
```

End:

```
(status poll)
PrintEnd [1(u8)]
```

pageColor is 0
