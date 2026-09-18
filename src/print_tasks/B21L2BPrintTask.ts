import { PacketGenerator } from "../packets";
import { Utils, EncodedImage } from "../utils";
import { AbstractPrintTask } from "./AbstractPrintTask";

/**
 * @category Print tasks
 */
export class B21L2BPrintTask extends AbstractPrintTask {
  override printInit(): Promise<void> {
    return this.protocol.sendAll([
      PacketGenerator.setDensity(this.printOptions.density),
      PacketGenerator.setLabelType(this.printOptions.labelType),
      PacketGenerator.printStart1b(),
    ]);
  }

  override async printPage(image: EncodedImage, quantity?: number): Promise<void> {
    this.validatePage(image, quantity ?? 1);

    for (let i = 0; i < (quantity ?? 1); i++) {
      await Utils.doUntilTrue(() => this.protocol.pageStart(), 5, 500);

      await this.protocol.sendAll(
        [
          PacketGenerator.setPageSize4b(image.rows, image.cols),
          ...PacketGenerator.writeImageData(image, {
            countsMode: "total",
            enableCheckLine: true,
            printheadPixels: this.printheadPixels(),
          }),
          PacketGenerator.pageEnd(),
        ],
        this.printOptions.pageTimeoutMs,
      this.makePacketProgressCallback(),
      );
    }
  }

  override async waitForPageFinished(): Promise<void> {
    await Utils.doUntilTrue(() => this.protocol.pageEnd(), 20, 500);
    this.emitProgressEvent();
  }

  override waitForFinished(): Promise<void> {
    return Promise.resolve();
  }

}
