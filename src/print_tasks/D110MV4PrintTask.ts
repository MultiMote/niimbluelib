import { EncodedImage } from "../image_encoder";
import { PacketGenerator } from "../packets";
import { AbstractPrintTask } from "./AbstractPrintTask";

/**
 * @category Print tasks
 */
export class D110MV4PrintTask extends AbstractPrintTask {
  override printInit(): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setDensity(this.printOptions.density),
      PacketGenerator.setLabelType(this.printOptions.labelType),
      PacketGenerator.printStart9b(this.printOptions.totalPages, 0, 1),
    ]);
  }

  override printPage(image: EncodedImage, quantity?: number): Promise<void> {
    this.checkAddPage(quantity ?? 1);

    return this.abstraction.sendAll(
      [
        PacketGenerator.pageStart(),
        PacketGenerator.setPageSize13b(image.rows, image.cols, quantity ?? 1),
        ...PacketGenerator.writeImageData(image, { printheadPixels: this.printheadPixels() }),
        PacketGenerator.pageEnd(),
      ],
      this.printOptions.pageTimeoutMs
    );
  }

  override waitForFinished(): Promise<void> {
    this.abstraction.setPacketTimeout(this.printOptions.statusTimeoutMs);

    return this.abstraction
      .waitUntilPrintFinishedByStatusPoll(this.printOptions.totalPages ?? 1, this.printOptions.statusPollIntervalMs)
      .finally(() => this.abstraction.setDefaultPacketTimeout());
  }
}
