import { EncodedImage } from "..";
import { LabelType, PacketGenerator } from "../packets";
import { AbstractPrintTask } from "./AbstractPrintTask";

export class V5PrintTask extends AbstractPrintTask {
  override printInit(): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setDensity(this.printOptions.density ?? 3),
      PacketGenerator.setLabelType(this.printOptions.labelType ?? LabelType.WithGaps),
      PacketGenerator.printStartV5(this.printOptions.totalPages ?? 1, 0, 0)
    ]);
  }

  override printPage(image: EncodedImage, quantity?: number): Promise<void> {
    this.checkAddPage(quantity ?? 1);

    return this.abstraction.sendAll([
      PacketGenerator.pageStart(),
      PacketGenerator.setPageSizeV4(image.rows, image.cols, quantity ?? 1, 0, false),
      ...PacketGenerator.writeImageData(image, this.printheadPixels()),
      PacketGenerator.pageEnd(),
    ], this.printOptions.pageTimeoutMs);
  }

  override waitForFinished(): Promise<void> {
    return this.abstraction.waitUntilPrintFinishedByStatusPoll(
      this.printOptions.totalPages ?? 1,
      this.printOptions.statusPollIntervalMs
    );
  }
}
