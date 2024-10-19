import { EncodedImage } from "..";
import { LabelType, PacketGenerator } from "../packets";
import { AbstractPrintTask } from "./AbstractPrintTask";

export class B1PrintTask extends AbstractPrintTask {
  override printInit(): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setDensity(this.printOptions.density ?? 3),
      PacketGenerator.setLabelType(this.printOptions.labelType ?? LabelType.WithGaps),
      PacketGenerator.printStartV4(this.printOptions.totalPages ?? 1),
    ]);
  }

  override printPage(image: EncodedImage, quantity?: number): Promise<void> {
    this.checkAddPage(quantity ?? 1);

    return this.abstraction.sendAll([
      PacketGenerator.pageStart(),
      PacketGenerator.setPageSizeV3(image.rows, image.cols, quantity ?? 1),
      ...PacketGenerator.writeImageData(image),
      PacketGenerator.pageEnd(),
    ]);
  }

  override waitForFinished(): Promise<void> {
    return this.abstraction.waitUntilPrintFinishedV2(
      this.printOptions.totalPages ?? 1,
      this.printOptions.statusPollIntervalMs
    );
  }
}
