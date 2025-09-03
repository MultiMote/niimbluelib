import { EncodedImage } from "../image_encoder";
import { LabelType } from "../packets";
import { Abstraction } from "../packets/abstraction";

/**
 * Print options for print tasks.
 * @category Print tasks
 */
export type PrintOptions = {
  /** Printer label type */
  labelType: LabelType;

  /** Print density */
  density: number;

  /** How many pages will be printed */
  totalPages: number;

  /** Used in {@link AbstractPrintTask.waitForFinished} where status is received by polling */
  statusPollIntervalMs: number;

  /** Used in {@link AbstractPrintTask.waitForFinished} */
  statusTimeoutMs: number;

  /** Used in {@link AbstractPrintTask.printPage} */
  pageTimeoutMs: number;
};

/** Default print options for print tasks. */
const printOptionsDefaults: PrintOptions = {
  labelType: LabelType.WithGaps,
  density: 2,
  totalPages: 1,
  statusPollIntervalMs: 300,
  statusTimeoutMs: 5_000,
  pageTimeoutMs: 10_000,
};

/**
 * Different printer models have different print algorithms. Print task defines this algorithm.
 *
 * @example
 * ```ts
 * const quantity = 1;
 *
 * const printTask = client.abstraction.newPrintTask("D110", {
 *   totalPages: quantity
 * });
 *
 * try {
 *   await printTask.printInit();
 *   await printTask.printPage(encodedImage, quantity); // encode your canvas with ImageEncoder.encodeCanvas
 *   await printTask.waitForFinished();
 * } catch (e) {
 *   alert(e);
 * } finally {
 *   await client.abstraction.printEnd();
 * }
 * ```
 *
 * @category Print tasks
 **/
export abstract class AbstractPrintTask {
  protected abstraction: Abstraction;
  protected printOptions: PrintOptions;
  protected pagesPrinted: number;

  constructor(abstraction: Abstraction, printOptions?: Partial<PrintOptions>) {
    this.abstraction = abstraction;
    this.pagesPrinted = 0;

    this.printOptions = {
      ...printOptionsDefaults,
      ...printOptions,
    };
  }

  /** Check added pages not does not exceed {@link pagesPrinted} */
  protected checkAddPage(quantity: number) {
    if (this.pagesPrinted + quantity > (this.printOptions.totalPages ?? 1)) {
      throw new Error("Trying to print too many pages (task totalPages may not be set correctly)");
    }
  }

  /** Prepare print (set label type, density, print start, ...) */
  abstract printInit(): Promise<void>;
  /** Print image with a specified number of copies */
  abstract printPage(image: EncodedImage, quantity?: number): Promise<void>;
  /** Wait for print is finished */
  abstract waitForFinished(): Promise<void>;
  /** Printer's printhead resolution in pixels */
  protected printheadPixels(): number | undefined {
    return this.abstraction.getClient().getModelMetadata()?.printheadPixels;
  }

  /** End print, cleanup */
  printEnd(): Promise<boolean> {
    return this.abstraction.printEnd();
  }
}
