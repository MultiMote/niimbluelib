import { EncodedImage } from "..";
import { Abstraction, LabelType, PacketGenerator, PrintOptions } from "../packets";
import { IPrintTask } from "./IPrintTask";

export class B1PrintTask implements IPrintTask {
  abstraction: Abstraction;

  constructor(abstraction: Abstraction) {
    this.abstraction = abstraction;
  }

  printInit(options?: PrintOptions): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setDensity(options?.density ?? 2),
      PacketGenerator.setLabelType(options?.labelType ?? LabelType.WithGaps),
      PacketGenerator.printStartV4(options?.quantity ?? 1),
    ]);
  }

  printPage(image: EncodedImage, options?: PrintOptions): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.pageStart(),
      PacketGenerator.setPageSizeV3(image.rows, image.cols, options?.quantity ?? 1),
      ...PacketGenerator.writeImageData(image),
      PacketGenerator.pageEnd(),
    ]);
  }

  waitForFinished(pagesToPrint: number, options?: { pollIntervalMs?: number }): Promise<void> {
    return this.abstraction.waitUntilPrintFinishedV2(pagesToPrint, options?.pollIntervalMs);
  }
}
