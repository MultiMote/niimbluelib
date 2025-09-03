import { PrinterModel as M } from "../printer_models";
import { B1PrintTask } from "./B1PrintTask";
import { B21V1PrintTask } from "./B21V1PrintTask";
import { D110PrintTask } from "./D110PrintTask";
import { OldD11PrintTask } from "./OldD11PrintTask";
import { D110MV4PrintTask } from "./D110MV4PrintTask";

/**
 * Define available print tasks.
 * @category Print tasks
 */
export const printTasks = {
  D11_V1: OldD11PrintTask,
  D110: D110PrintTask,
  B1: B1PrintTask,
  B21_V1: B21V1PrintTask,
  D110M_V4: D110MV4PrintTask,
};

/**
 * Available print task name type.
 * @category Print tasks
 */
export type PrintTaskName = keyof typeof printTasks;

/**
 * List of available print task names.
 * @category Print tasks
 */
export const printTaskNames = Object.keys(printTasks) as PrintTaskName[];

/** @category Printer model library */
export type ModelWithProtocol = {
  /** Model */
  m: M;
  /** Protocol version */
  v: number;
};

/**
 * Define print tasks for models.
 * Model or model with protocol version can be specified.
 * Model with protocol version has priority over just model.
 * @category Print tasks
 */
export const modelPrintTasks: Partial<Record<PrintTaskName, (ModelWithProtocol | M)[]>> = {
  D11_V1: [M.D11, M.D11S],
  B21_V1: [M.B21, M.B21_L2B],
  D110: [M.B21S, M.B21S_C2B, M.D110, { m: M.D11, v: 1 }, { m: M.D11, v: 2 }],
  B1: [M.D110_M, M.B1, M.B21_C2B ],
  D110M_V4: [{ m: M.D110_M, v: 4 }, M.D11_H, M.B21_PRO],
};

/**
 * Search print task.
 * @category Print tasks
 */
export const findPrintTask = (model: M, protocolVersion?: number): PrintTaskName | undefined => {
  const tasks = Object.keys(modelPrintTasks) as PrintTaskName[];

  const foundExact = tasks.find((key) =>
    modelPrintTasks[key]?.find(
      (o: ModelWithProtocol | M) => typeof o === "object" && o.v === protocolVersion && o.m === model
    )
  );

  return foundExact ?? tasks.find((key) => modelPrintTasks[key]?.includes(model));
};

export { AbstractPrintTask, PrintOptions } from "./AbstractPrintTask";
export { B1PrintTask, B21V1PrintTask, D110PrintTask, OldD11PrintTask, D110MV4PrintTask as V5PrintTask };
