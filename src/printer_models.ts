/* AUTO-GENERATED FILE. DO NOT EDIT! */
/* use 'yarn gen-printer-models' to generate */

import { PrintDirection } from "./image_encoder";
import { LabelType as LT } from "./packets";

export enum PrinterModel {
  UNKNOWN = "UNKNOWN",
  A20 = "A20",
  A203 = "A203",
  A63 = "A63",
  A8 = "A8",
  A8_P = "A8_P",
  B1 = "B1",
  B11 = "B11",
  B16 = "B16",
  B18 = "B18",
  B18S = "B18S",
  B203 = "B203",
  B21 = "B21",
  B21_PRO = "B21_PRO",
  B21_C2B = "B21_C2B",
  B21_L2B = "B21_L2B",
  B21S = "B21S",
  B21S_C2B = "B21S_C2B",
  B3 = "B3",
  B31 = "B31",
  B32 = "B32",
  B32R = "B32R",
  B3S = "B3S",
  B3S_P = "B3S_P",
  B50 = "B50",
  B50W = "B50W",
  BETTY = "BETTY",
  D101 = "D101",
  D11 = "D11",
  D11_H = "D11_H",
  D110 = "D110",
  D110_M = "D110_M",
  D11S = "D11S",
  D41 = "D41",
  D61 = "D61",
  DXX = "DXX",
  ET10 = "ET10",
  FUST = "FUST",
  HI_D110 = "HI_D110",
  HI_NB_D11 = "HI_NB_D11",
  JC_M90 = "JC_M90",
  JCB3S = "JCB3S",
  K3 = "K3",
  K3_W = "K3_W",
  M2_H = "M2_H",
  MP3K = "MP3K",
  MP3K_W = "MP3K_W",
  N1 = "N1",
  P1 = "P1",
  P18 = "P18",
  P1S = "P1S",
  S1 = "S1",
  S3 = "S3",
  S6 = "S6",
  S6_P = "S6_P",
  T2S = "T2S",
  T6 = "T6",
  T7 = "T7",
  T8 = "T8",
  T8S = "T8S",
  TP2M_H = "TP2M_H",
  Z401 = "Z401",
};

export interface PrinterModelMeta {
  model: PrinterModel;
  id: [number, ...number[]];
  dpi: number;
  printDirection: PrintDirection;
  printheadPixels: number;
  paperTypes: number[];
  densityMin: number;
  densityMax: number;
  densityDefault: number;
}

export const modelsLibrary: PrinterModelMeta[] = [
  {
    model: PrinterModel.A20,
    id: [2817],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 400,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.A203,
    id: [2818],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 400,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.A63,
    id: [2054],
    dpi: 300,
    printDirection: "top",
    printheadPixels: 851,
    paperTypes: [LT.WithGaps, LT.Transparent, LT.Black],
    densityMin: 1,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.A8,
    id: [256],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 600,
    paperTypes: [LT.Black, LT.WithGaps, LT.Continuous],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.A8_P,
    id: [273],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 616,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B1,
    id: [4096],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B11,
    id: [51457],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Perforated, LT.Transparent],
    densityMin: 6,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.B16,
    id: [1792],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 96,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 3,
    densityDefault: 2,
  },
  {
    model: PrinterModel.B18,
    id: [3584],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 120,
    paperTypes: [LT.WithGaps, LT.Transparent, LT.BlackMarkGap, LT.HeatShrinkTube],
    densityMin: 1,
    densityMax: 3,
    densityDefault: 2,
  },
  {
    model: PrinterModel.B18S,
    id: [3585],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 120,
    paperTypes: [LT.WithGaps, LT.Transparent, LT.BlackMarkGap, LT.HeatShrinkTube],
    densityMin: 1,
    densityMax: 3,
    densityDefault: 2,
  },
  {
    model: PrinterModel.B203,
    id: [2816],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 400,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B21,
    id: [768],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B21_PRO,
    id: [785],
    dpi: 300,
    printDirection: "top",
    printheadPixels: 591,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B21_C2B,
    id: [771, 775],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Continuous, LT.Transparent, LT.Black],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B21_L2B,
    id: [769],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B21S,
    id: [777],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B21S_C2B,
    id: [776],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B3,
    id: [52993],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 600,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B31,
    id: [5632],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 600,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B32,
    id: [2049],
    dpi: 300,
    printDirection: "top",
    printheadPixels: 851,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.B32R,
    id: [2050],
    dpi: 300,
    printDirection: "top",
    printheadPixels: 851,
    paperTypes: [LT.WithGaps],
    densityMin: 1,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.B3S,
    id: [256, 260, 262],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 576,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B3S_P,
    id: [272],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 576,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.B50,
    id: [51713],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 400,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Perforated],
    densityMin: 6,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.B50W,
    id: [51714],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Perforated],
    densityMin: 6,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.BETTY,
    id: [2561],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 192,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 3,
    densityDefault: 2,
  },
  {
    model: PrinterModel.D101,
    id: [2560],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 192,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 3,
    densityDefault: 2,
  },
  {
    model: PrinterModel.D11,
    id: [512],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 96,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 3,
    densityDefault: 2,
  },
  {
    model: PrinterModel.D11_H,
    id: [528],
    dpi: 300,
    printDirection: "left",
    printheadPixels: 178,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.D110,
    id: [2304, 2305],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 96,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 3,
    densityDefault: 2,
  },
  {
    model: PrinterModel.D110_M,
    id: [2320],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 120,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.D11S,
    id: [514],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 96,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 3,
    densityDefault: 2,
  },
  {
    model: PrinterModel.ET10,
    id: [5376],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 1600,
    paperTypes: [LT.Continuous],
    densityMin: 3,
    densityMax: 3,
    densityDefault: 3,
  },
  {
    model: PrinterModel.FUST,
    id: [513],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 96,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.HI_D110,
    id: [2305],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 120,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 3,
    densityDefault: 3,
  },
  {
    model: PrinterModel.HI_NB_D11,
    id: [512],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 120,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 3,
    densityDefault: 2,
  },
  {
    model: PrinterModel.JC_M90,
    id: [51461],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Perforated],
    densityMin: 6,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.JCB3S,
    id: [256],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 576,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 2,
  },
  {
    model: PrinterModel.K3,
    id: [4864],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 656,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.K3_W,
    id: [4865],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 656,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.M2_H,
    id: [4608],
    dpi: 300,
    printDirection: "top",
    printheadPixels: 591,
    paperTypes: [LT.WithGaps, LT.Transparent, LT.Black, LT.BlackMarkGap],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.MP3K,
    id: [4866],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 656,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.MP3K_W,
    id: [4867],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 656,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.N1,
    id: [3586],
    dpi: 203,
    printDirection: "left",
    printheadPixels: 120,
    paperTypes: [LT.WithGaps, LT.HeatShrinkTube, LT.Transparent, LT.BlackMarkGap],
    densityMin: 1,
    densityMax: 3,
    densityDefault: 2,
  },
  {
    model: PrinterModel.P1,
    id: [1024],
    dpi: 300,
    printDirection: "left",
    printheadPixels: 697,
    paperTypes: [LT.PvcTag],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.P18,
    id: [1026],
    dpi: 300,
    printDirection: "left",
    printheadPixels: 662,
    paperTypes: [LT.PvcTag],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.P1S,
    id: [1025],
    dpi: 300,
    printDirection: "left",
    printheadPixels: 662,
    paperTypes: [LT.PvcTag],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.S1,
    id: [51458],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Perforated],
    densityMin: 6,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.S3,
    id: [51460],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Perforated],
    densityMin: 6,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.S6,
    id: [261, 259, 258, 257],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 576,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.S6_P,
    id: [274],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 600,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.T2S,
    id: [53250],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 832,
    paperTypes: [LT.WithGaps, LT.Black],
    densityMin: 1,
    densityMax: 20,
    densityDefault: 15,
  },
  {
    model: PrinterModel.T6,
    id: [51715],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Perforated],
    densityMin: 6,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.T7,
    id: [51717],
    dpi: 203,
    printDirection: "top",
    printheadPixels: 384,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Perforated],
    densityMin: 6,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.T8,
    id: [51718],
    dpi: 300,
    printDirection: "top",
    printheadPixels: 567,
    paperTypes: [LT.WithGaps, LT.Black, LT.Continuous, LT.Perforated],
    densityMin: 6,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.T8S,
    id: [2053],
    dpi: 300,
    printDirection: "top",
    printheadPixels: 851,
    paperTypes: [LT.WithGaps],
    densityMin: 1,
    densityMax: 15,
    densityDefault: 10,
  },
  {
    model: PrinterModel.TP2M_H,
    id: [4609],
    dpi: 300,
    printDirection: "top",
    printheadPixels: 591,
    paperTypes: [LT.WithGaps, LT.Black, LT.Transparent],
    densityMin: 1,
    densityMax: 5,
    densityDefault: 3,
  },
  {
    model: PrinterModel.Z401,
    id: [2051],
    dpi: 300,
    printDirection: "top",
    printheadPixels: 851,
    paperTypes: [LT.WithGaps, LT.Transparent],
    densityMin: 1,
    densityMax: 15,
    densityDefault: 10,
  },
];

export const getPrinterMetaById = (id: number): PrinterModelMeta | undefined => {
    return modelsLibrary.find((o) => o.id.includes(id));
};

export const getPrinterMetaByModel = (model: PrinterModel): PrinterModelMeta | undefined => {
    return modelsLibrary.find((o) => o.model === model);
};