import { EncodedImage } from "../image_encoder";
import { Abstraction, LabelType, PacketGenerator, PrintOptions } from "../packets";
import { IPrintTask } from "./IPrintTask";

export class OldD11PrintTask implements IPrintTask {
  abstraction: Abstraction;

  constructor(abstraction: Abstraction) {
    this.abstraction = abstraction;
  }

  printInit(options?: PrintOptions): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setDensity(options?.density ?? 2),
      PacketGenerator.setLabelType(options?.labelType ?? LabelType.WithGaps),
      PacketGenerator.printStart(),
    ]);
  }

  printPage(image: EncodedImage, options?: PrintOptions): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.printClear(),
      PacketGenerator.pageStart(),
      PacketGenerator.setPageSizeV1(image.rows),
      PacketGenerator.setPrintQuantity(options?.quantity ?? 1),
      ...PacketGenerator.writeImageData(image),
      PacketGenerator.pageEnd(),
    ]);
  }

  waitForFinished(pagesToPrint: number, options?: { timeoutMs?: number }): Promise<void> {
    return this.abstraction.waitUntilPrintFinishedV1(pagesToPrint, options?.timeoutMs);
  }
}
