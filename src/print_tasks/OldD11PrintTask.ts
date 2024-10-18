import { EncodedImage } from "../image_encoder";
import { LabelType, PacketGenerator } from "../packets";
import { AbstractPrintTask } from "./AbstractPrintTask";

export class OldD11PrintTask extends AbstractPrintTask {
  override printInit(): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setDensity(this.printOptions?.density ?? 2),
      PacketGenerator.setLabelType(this.printOptions?.labelType ?? LabelType.WithGaps),
      PacketGenerator.printStart(),
    ]);
  }

  override printPage(image: EncodedImage, quantity: number): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.printClear(),
      PacketGenerator.pageStart(),
      PacketGenerator.setPageSizeV1(image.rows),
      PacketGenerator.setPrintQuantity(quantity ?? 1),
      ...PacketGenerator.writeImageData(image),
      PacketGenerator.pageEnd(),
    ]);
  }

  override waitForFinished(options?: { timeoutMs?: number }): Promise<void> {
    return this.abstraction.waitUntilPrintFinishedV1(this.printOptions?.totalPages ?? 1, options?.timeoutMs);
  }
}
