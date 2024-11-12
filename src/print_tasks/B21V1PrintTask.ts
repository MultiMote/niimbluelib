import { EncodedImage } from "../image_encoder";
import { PacketGenerator } from "../packets";
import { AbstractPrintTask } from "./AbstractPrintTask";

/**
 * @category Print tasks
 */
export class B21V1PrintTask extends AbstractPrintTask {
  override printInit(): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setDensity(this.printOptions.density),
      PacketGenerator.setLabelType(this.printOptions.labelType),
      PacketGenerator.printStart(),
    ]);
  }

  override async printPage(image: EncodedImage, quantity?: number): Promise<void> {
    this.checkAddPage(quantity ?? 1);

    for (let i = 0; i < (quantity ?? 1); i++) {
      await this.abstraction.sendAll([
        PacketGenerator.pageStart(),
        PacketGenerator.setPageSizeV2(image.rows, image.cols),
        ...PacketGenerator.writeImageData(image, this.printheadPixels()),
        PacketGenerator.pageEnd(),
      ], this.printOptions.pageTimeoutMs);
    }
  }

  override waitForFinished(): Promise<void> {
    this.abstraction.setPacketTimeout(this.printOptions.statusTimeoutMs);

    return this.abstraction.waitUntilPrintFinishedByPrintEndPoll(
      this.printOptions.totalPages,
      this.printOptions.statusPollIntervalMs
    ).finally(() => this.abstraction.setDefaultPacketTimeout());
  }
}
