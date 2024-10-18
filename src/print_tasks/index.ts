import { Abstraction } from "../packets";
import { PrinterModel as M } from "../printer_models";
import { B1PrintTask } from "./B1PrintTask";
import { D110PrintTask } from "./D110PrintTask";
import { AbstractPrintTask, PrintOptions } from "./AbstractPrintTask";
import { OldD11PrintTask } from "./OldD11PrintTask";

export const printTasks = {
  D11_OLD: OldD11PrintTask,
  D110: D110PrintTask,
  B1: B1PrintTask,
};

export type ValidPrintTaskName = keyof typeof printTasks;

export const modelPrintTasks: Record<ValidPrintTaskName, M[]> = {
  D11_OLD: [M.D11, M.D11S, M.B21_L2B, M.B21, M.B21_PRO, M.B21_C2B],
  D110: [M.B21S, M.B21S_C2B, M.D110],
  B1: [M.D11_H, M.D110_M, M.B1],
};

export const findPrintTask = (model: M): ValidPrintTaskName | undefined => {
  return (Object.keys(modelPrintTasks) as ValidPrintTaskName[]).find((key) => modelPrintTasks[key].includes(model));
};

export const instantiatePrintTask = (
  name: ValidPrintTaskName,
  abstraction: Abstraction,
  printOptions?: PrintOptions
): AbstractPrintTask => {
  return new printTasks[name](abstraction, printOptions);
};

export const findAndInstantiatePrintTask = (model: M, abstraction: Abstraction): AbstractPrintTask | undefined => {
  const name: ValidPrintTaskName | undefined = findPrintTask(model);

  if (name !== undefined) {
    return instantiatePrintTask(name, abstraction);
  }

  return undefined;
};
