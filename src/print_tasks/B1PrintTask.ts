import { EncodedImage } from "../image_encoder";
import { PacketGenerator, PageColorType } from "../packets";
import { AbstractPrintTask } from "./AbstractPrintTask";

/**
 * @category Print tasks
 */
export class B1PrintTask extends AbstractPrintTask {
  override printInit(): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setDensity(this.printOptions.density),
      PacketGenerator.setLabelType(this.printOptions.labelType),
      PacketGenerator.printStart7b(this.printOptions.totalPages, this.printOptions.pageColor),
    ]);
  }

  override printPage(image: EncodedImage, quantity?: number): Promise<void> {
    this.validatePage(image, quantity ?? 1);

    return this.abstraction.sendAll(
      [
        PacketGenerator.pageStart(),
        PacketGenerator.setPageSize6b(image.rows, image.cols, quantity ?? 1),
        ...PacketGenerator.writeImageData(image, { printheadPixels: this.printheadPixels() }),
        PacketGenerator.pageEnd(),
      ],
      this.printOptions.pageTimeoutMs,
    );
  }

  override waitForFinished(): Promise<void> {
    this.abstraction.setPacketTimeout(this.printOptions.statusTimeoutMs);

    return this.abstraction
      .waitUntilPrintFinishedByStatusPoll(this.printOptions.totalPages, this.printOptions.statusPollIntervalMs)
      .finally(() => this.abstraction.setDefaultPacketTimeout());
  }

  override isSupportColor(pageColor: PageColorType): boolean {
    return pageColor === PageColorType.SingleColor || pageColor === PageColorType.DoubleColor;
  }
}
