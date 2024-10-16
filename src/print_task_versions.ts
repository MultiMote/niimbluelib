import { PrinterModel as M } from "./printer_models";

export enum PrintTaskVariant {
  D11_OLD = 1,
  V2,
  D110,
  B1,
  V5,
  // B21,
  // B21S,
}

export const getPrintTaskVariant = (model: M): PrintTaskVariant | undefined => {
  switch (model) {
    case M.D11:
    case M.D11S:
    case M.B21_L2B:
    case M.B21:
    case M.B21_PRO:
    case M.B21_C2B:
      return PrintTaskVariant.D11_OLD;

    case M.B21S:
    case M.B21S_C2B:
    case M.D110:
      return PrintTaskVariant.D110;

    case M.D11_H:
    case M.D110_M:
    case M.B1:
      return PrintTaskVariant.B1;
  }

  return undefined;
};
