import { PrintProgressEvent } from "../events";
import { EncodedImage } from "../image_encoder";
import { PacketGenerator } from "../packets";
import { Utils } from "../utils";
import { AbstractPrintTask } from "./AbstractPrintTask";

/**
 * @category Print tasks
 */
export class B21L2BPrintTask extends AbstractPrintTask {
  override printInit(): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setDensity(this.printOptions.density),
      PacketGenerator.setLabelType(this.printOptions.labelType),
      PacketGenerator.printStart1b(),
    ]);
  }

  override async printPage(image: EncodedImage, quantity?: number): Promise<void> {
    this.checkAddPage(quantity ?? 1);

    for (let i = 0; i < (quantity ?? 1); i++) {
      await Utils.doUntilTrue(() => this.abstraction.pageStart(), 5, 500);

      await this.abstraction.sendAll(
        [
          PacketGenerator.setPageSize4b(image.rows, image.cols),
          ...PacketGenerator.writeImageData(image, {
            countsMode: "total",
            enableCheckLine: true,
            printheadPixels: this.printheadPixels(),
          }),
          PacketGenerator.pageEnd(),
        ],
        this.printOptions.pageTimeoutMs
      );
    }
  }

  override async waitForPageFinished(): Promise<void> {
    await Utils.doUntilTrue(() => this.abstraction.pageEnd(), 20, 500);
    this.abstraction.getClient().emit("printprogress", new PrintProgressEvent(this.printOptions.totalPages, this.pagesPrinted, 100, 100));
  }

  override waitForFinished(): Promise<void> {
    return Promise.resolve();
  }

}
