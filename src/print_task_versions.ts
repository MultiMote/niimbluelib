import { PrinterModel as M } from "./printer_models";

export enum PrintTaskVersion {
  V1 = 1,
  V2,
  V3,
  V4,
  V5,
}

export const getPrintTaskVersion = (model: M): PrintTaskVersion | undefined => {
  switch (model) {
    case M.D11:
    case M.D11S:
    case M.B21_L2B:
    case M.B21:
    case M.B21_PRO:
    case M.B21S:
    case M.B21S_C2B:
    case M.B21_C2B:
      return PrintTaskVersion.V1;

    case M.D110:
      return PrintTaskVersion.V3;

    case M.D11_H:
    case M.D110_M:
    case M.B1:
      return PrintTaskVersion.V4;
  }

  return undefined;
};
