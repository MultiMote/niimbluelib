import { PrinterModel as M } from "../printer_models";
import { B1PrintTask } from "./B1PrintTask";
import { B21V1PrintTask } from "./B21V1PrintTask";
import { D110PrintTask } from "./D110PrintTask";
import { OldD11PrintTask } from "./OldD11PrintTask";
import { V5PrintTask } from "./V5PrintTask";

export const printTasks = {
  D11_V1: OldD11PrintTask,
  D110: D110PrintTask,
  B1: B1PrintTask,
  B21_V1: B21V1PrintTask,
  V5: V5PrintTask,
};

export type PrintTaskName = keyof typeof printTasks;

export const printTaskNames = Object.keys(printTasks) as PrintTaskName[];

export const modelPrintTasks: Partial<Record<PrintTaskName, M[]>> = {
  D11_V1: [M.D11, M.D11S],
  B21_V1: [M.B21, M.B21_L2B, M.B21_C2B],
  D110: [M.B21S, M.B21S_C2B, M.D110],
  B1: [M.D11_H, M.D110_M, M.B1],
};

export const findPrintTask = (model: M): PrintTaskName | undefined => {
  return (Object.keys(modelPrintTasks) as PrintTaskName[]).find((key) => modelPrintTasks[key]?.includes(model));
};

export { AbstractPrintTask } from "./AbstractPrintTask";
