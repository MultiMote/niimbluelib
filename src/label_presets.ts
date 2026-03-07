/**
 * Known Niimbot label sizes scraped from niimbots.com product listings.
 *
 * The `barcodes` and `skus` arrays are used to match against the RFID tag's
 * `barCode` and `serialNumber` fields reported by the printer.
 *
 * @module Label presets
 */

/** @category Label presets */
export interface LabelPreset {
  /** Label width in mm */
  widthMm: number;
  /** Label height in mm */
  heightMm: number;
  shape: "round" | "rectangle";
  /** Total labels on a standard roll */
  labelsPerRoll: number;
  /** Human-readable name, e.g. "50×50mm Round" */
  name: string;
  /** Known SKU prefixes from Niimbot product listings */
  skus: string[];
  /** Known barcode/EAN values read from RFID tags */
  barcodes: string[];
}

/** @category Label presets */
export const labelPresets: LabelPreset[] = [
  {
    widthMm: 12, heightMm: 22, shape: "rectangle", labelsPerRoll: 260,
    name: "12×22mm",
    skus: ["A2A68601701"],
    barcodes: ["6972842743558"],
  },
  {
    widthMm: 12, heightMm: 30, shape: "rectangle", labelsPerRoll: 210,
    name: "12×30mm",
    skus: ["A2A68601201"],
    barcodes: ["6972842747594"],
  },
  {
    widthMm: 12, heightMm: 40, shape: "rectangle", labelsPerRoll: 160,
    name: "12×40mm",
    skus: ["A2A68601601", "A2A48348601", "A2A68301701", "A2A68301601", "A2A68301201"],
    barcodes: ["6972842743572"],
  },
  {
    widthMm: 12, heightMm: 75, shape: "rectangle", labelsPerRoll: 95,
    name: "12×75mm",
    skus: ["A2A08311501"],
    barcodes: ["06232104"],
  },
  {
    widthMm: 12.5, heightMm: 109, shape: "rectangle", labelsPerRoll: 65,
    name: "12.5×109mm Cable",
    skus: ["A2K18638601", "A2K18638501", "A2K18638901", "A2K18638301", "A2K18638001"],
    barcodes: ["6971501227095", "6972842743794", "6972842743800", "6975746637701", "6972842743817", "6972842743787"],
  },
  {
    widthMm: 14, heightMm: 25, shape: "rectangle", labelsPerRoll: 240,
    name: "14×25mm",
    skus: [],
    barcodes: [],
  },
  {
    widthMm: 14, heightMm: 28, shape: "round", labelsPerRoll: 220,
    name: "14×28mm Round",
    skus: ["A2A08061801", "A2G88778901", "A2A78391201", "A2A28618801"],
    barcodes: ["6975746630696", "07052201", "08112116", "06092221"],
  },
  {
    widthMm: 14, heightMm: 30, shape: "rectangle", labelsPerRoll: 210,
    name: "14×30mm",
    skus: ["A2G88788601"],
    barcodes: ["6972842743725"],
  },
  {
    widthMm: 14, heightMm: 40, shape: "rectangle", labelsPerRoll: 160,
    name: "14×40mm",
    skus: ["A2G88588302"],
    barcodes: ["6972842743831"],
  },
  {
    widthMm: 14, heightMm: 50, shape: "rectangle", labelsPerRoll: 130,
    name: "14×50mm",
    skus: ["1EA00703901"],
    barcodes: [],
  },
  {
    widthMm: 14, heightMm: 60, shape: "rectangle", labelsPerRoll: 110,
    name: "14×60mm",
    skus: [],
    barcodes: [],
  },
  {
    widthMm: 15, heightMm: 30, shape: "rectangle", labelsPerRoll: 210,
    name: "15×30mm",
    skus: ["A2A68601301"],
    barcodes: ["6972842743589"],
  },
  {
    widthMm: 15, heightMm: 50, shape: "rectangle", labelsPerRoll: 130,
    name: "15×50mm",
    skus: ["A2A68601001"],
    barcodes: ["6972842743596"],
  },
  {
    widthMm: 25, heightMm: 50, shape: "rectangle", labelsPerRoll: 130,
    name: "25×50mm",
    skus: ["1EA01585001"],
    barcodes: ["6975746632522"],
  },
  {
    widthMm: 25, heightMm: 60, shape: "rectangle", labelsPerRoll: 110,
    name: "25×60mm",
    skus: ["A2G88418701"],
    barcodes: ["04162207"],
  },
  {
    widthMm: 21, heightMm: 21, shape: "round", labelsPerRoll: 300,
    name: "21×21mm Round",
    skus: ["A2A18348301"],
    barcodes: ["03032203"],
  },
  {
    widthMm: 25, heightMm: 76, shape: "rectangle", labelsPerRoll: 200,
    name: "25×76mm Cable",
    skus: ["A2K88318401", "A2K88018803", "A2K88018802", "A2K88018804", "A2K88018801"],
    barcodes: ["6972842740700", "6975746630665", "6975746630658", "6975746630672", "6975746630641"],
  },
  {
    widthMm: 30, heightMm: 20, shape: "rectangle", labelsPerRoll: 320,
    name: "30×20mm",
    skus: ["A2A88658501"],
    barcodes: ["6971501227699"],
  },
  {
    widthMm: 30, heightMm: 40, shape: "rectangle", labelsPerRoll: 180,
    name: "30×40mm",
    skus: ["A2A88888001"],
    barcodes: ["090223012"],
  },
  {
    widthMm: 30, heightMm: 60, shape: "rectangle", labelsPerRoll: 125,
    name: "30×60mm",
    skus: ["1EA01548101"],
    barcodes: ["090223016"],
  },
  {
    widthMm: 30, heightMm: 70, shape: "rectangle", labelsPerRoll: 100,
    name: "30×70mm Jewelry",
    skus: ["A2L88888101"],
    barcodes: ["6971501221871"],
  },
  {
    widthMm: 31, heightMm: 31, shape: "round", labelsPerRoll: 210,
    name: "31×31mm Round",
    skus: ["A2A78161901"],
    barcodes: ["03262006"],
  },
  {
    widthMm: 40, heightMm: 20, shape: "rectangle", labelsPerRoll: 320,
    name: "40×20mm",
    skus: ["A2A88658401"],
    barcodes: ["6971501227743"],
  },
  {
    widthMm: 40, heightMm: 30, shape: "rectangle", labelsPerRoll: 230,
    name: "40×30mm",
    skus: ["A2A88608401"],
    barcodes: ["11102108"],
  },
  {
    widthMm: 40, heightMm: 40, shape: "rectangle", labelsPerRoll: 180,
    name: "40×40mm",
    skus: ["A2A18518701"],
    barcodes: ["6975746633574"],
  },
  {
    widthMm: 40, heightMm: 60, shape: "rectangle", labelsPerRoll: 120,
    name: "40×60mm",
    skus: [],
    barcodes: [],
  },
  {
    widthMm: 40, heightMm: 70, shape: "rectangle", labelsPerRoll: 110,
    name: "40×70mm",
    skus: ["A2A88358201"],
    barcodes: ["6975746634540"],
  },
  {
    widthMm: 42, heightMm: 21, shape: "rectangle", labelsPerRoll: 205,
    name: "42×21mm",
    skus: ["A2A28848201"],
    barcodes: ["6975746633802"],
  },
  {
    widthMm: 50, heightMm: 30, shape: "rectangle", labelsPerRoll: 230,
    name: "50×30mm",
    skus: ["A2A88358101"],
    barcodes: ["6971501227941"],
  },
  {
    widthMm: 50, heightMm: 50, shape: "rectangle", labelsPerRoll: 150,
    name: "50×50mm",
    skus: ["A2A18918501"],
    barcodes: ["12222117"],
  },
  {
    widthMm: 50, heightMm: 50, shape: "round", labelsPerRoll: 150,
    name: "50×50mm Round",
    skus: ["A2A68351901"],
    barcodes: ["6975746630467"],
  },
  {
    widthMm: 50, heightMm: 70, shape: "rectangle", labelsPerRoll: 110,
    name: "50×70mm",
    skus: ["A2A18918301"],
    barcodes: ["12222114"],
  },
  {
    widthMm: 50, heightMm: 80, shape: "rectangle", labelsPerRoll: 95,
    name: "50×80mm",
    skus: ["A2A88358701"],
    barcodes: ["6971501220607"],
  },
  {
    widthMm: 70, heightMm: 40, shape: "rectangle", labelsPerRoll: 110,
    name: "70×40mm",
    skus: ["1EA01770401"],
    barcodes: ["6975746638852"],
  },
];

/**
 * Find a label preset by RFID barcode or serial number.
 * Tries exact barcode match first, then matches serialNumber against known SKU prefixes.
 *
 * @category Label presets
 */
export function findLabelPreset(
  rfidInfo: { barCode: string; serialNumber: string }
): LabelPreset | undefined {
  if (rfidInfo.barCode) {
    const match = labelPresets.find((p) => p.barcodes.includes(rfidInfo.barCode));
    if (match) return match;
  }
  if (rfidInfo.serialNumber) {
    const match = labelPresets.find((p) =>
      p.skus.some((sku) => rfidInfo.serialNumber.startsWith(sku) || rfidInfo.serialNumber.includes(sku))
    );
    if (match) return match;
  }
  return undefined;
}

/**
 * Find label presets by labels-per-roll count (fallback heuristic).
 * May return multiple presets since different label sizes can share the same count.
 *
 * @category Label presets
 */
export function findLabelPresetsByRoll(labelsPerRoll: number): LabelPreset[] {
  return labelPresets.filter((p) => p.labelsPerRoll === labelsPerRoll);
}
