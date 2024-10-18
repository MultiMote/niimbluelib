import { EncodedImage } from "../image_encoder";
import { LabelType } from "../packets";
import { Abstraction } from "../packets/abstraction";

export type PrintOptions = {
  /** Printer label type */
  labelType?: LabelType;
  /** Print density */
  density?: number;
  /** How many pages will be printed */
  totalPages?: number;
};

export abstract class AbstractPrintTask {
  abstraction: Abstraction;
  printOptions?: PrintOptions

  constructor(abstraction: Abstraction, printOptions?: PrintOptions) {
    this.abstraction = abstraction;
    this.printOptions = printOptions;
  }

  public abstract printInit(): Promise<void>;
  public abstract printPage(image: EncodedImage, quantity?: number): Promise<void>;
  public abstract waitForFinished(options?: { pollIntervalMs?: number; timeoutMs?: number }): Promise<void>;
}
