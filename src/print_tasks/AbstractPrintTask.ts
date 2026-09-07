import { EncodedImage } from "../image_encoder";
import { LabelType, PageColorType } from "../packets";
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

  /** Print speed (it called "printing mode" with "print for clarity" and "print for speed" variants on original app).
   * Supported in D110MV4PrintTask */
  speed: 0 | 1;

  /** Color mode for multicolor / grayscale print.
   * Supported in D110MV4PrintTask */
  pageColor: PageColorType;

  halfCut?: boolean;

  /** For shrink tube */
  tubeWidthMm?: number;

  cutType: number;

  cutHeight: number;

  tubeType?: number;
};

/** Default print options for print tasks. */
const printOptionsDefaults: PrintOptions = {
  labelType: LabelType.WithGaps,
  density: 2,
  totalPages: 1,
  statusPollIntervalMs: 300,
  statusTimeoutMs: 5_000,
  pageTimeoutMs: 10_000,
  speed: 1,
  pageColor: PageColorType.SingleColor,
  cutType: 0,
  cutHeight: 0,
};

/**
 * Different printer models have different print algorithms. Print task defines this algorithm.
 *
 * @example
 * ```ts
 * const quantity = 1;
 *
 * const printTask = client.abstraction.newPrintTask("B1", {
 *   totalPages: quantity
 * });
 *
 * try {
 *   await printTask.printInit();
 *
 *   // you can print multiple pages in a loop, make sure options.totalPages is set correctly
 *   await printTask.printPage(encodedImage, quantity); // encode your canvas with ImageEncoder.encodeCanvas
 *   await printTask.waitForPageFinished();
 *   // loop ends here
 *
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

  /** Update print options for this print task */
  setPrintOptions(printOptions: Partial<PrintOptions>) {
    this.printOptions = {
      ...this.printOptions,
      ...printOptions,
    };
  }
  /** Reset print task state (pages printed) */
  reset() {
    this.pagesPrinted = 0;
  }
  /**
   * Validate page before printing. Checks:
   *  - Page color is supported by this print task
   *  - Page color matches print task color
   *  - Added pages not does not exceed {@link pagesPrinted}
   *
   * Also increments {@link pagesPrinted} by quantity.
   **/
  protected validatePage(image: EncodedImage, quantity: number) {
    if (this.pagesPrinted + quantity > (this.printOptions.totalPages ?? 1)) {
      throw new Error("Trying to print too many pages (task totalPages may not be set correctly)");
    }

    if (!this.isSupportColor(image.pageColor)) {
      throw new Error(`Page color ${image.pageColor} is not supported by this print task`);
    }

    if (this.printOptions.pageColor !== image.pageColor) {
      throw new Error(`Page color ${image.pageColor} does not match print task color ${this.printOptions.pageColor}`);
    }

    this.pagesPrinted += quantity;
  }

  /** Prepare print (set label type, density, print start, ...) */
  abstract printInit(): Promise<void>;
  /** Print image with a specified number of copies */
  abstract printPage(image: EncodedImage, quantity?: number): Promise<void>;
  /** Wait for page print is finished */
  waitForPageFinished(): Promise<void> {
    return Promise.resolve();
  }
  /** Wait for all print is finished */
  abstract waitForFinished(): Promise<void>;
  /** Printer's printhead resolution in pixels */
  protected printheadPixels(): number | undefined {
    return this.abstraction.getClient().getModelMetadata()?.printheadPixels;
  }
  /** End print, cleanup */
  printEnd(): Promise<boolean> {
    return this.abstraction.printEnd();
  }
  /** Check if this print task supports a specified page color */
  isSupportColor(pageColor: PageColorType): boolean {
    return pageColor === PageColorType.SingleColor;
  }
}
