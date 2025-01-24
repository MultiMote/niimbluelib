import { EncodedImage } from "../image_encoder";
import { PacketGenerator } from "../packets";
import { AbstractPrintTask } from "./AbstractPrintTask";

/**
 * @category Print tasks
 */
export class OldD11PrintTask extends AbstractPrintTask {
  override printInit(): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setDensity(this.printOptions.density),
      PacketGenerator.setLabelType(this.printOptions.labelType),
      PacketGenerator.printStart(),
    ]);
  }

  override printPage(image: EncodedImage, quantity: number): Promise<void> {
    this.checkAddPage(quantity ?? 1);

    return this.abstraction.sendAll(
      [
        PacketGenerator.printClear(),
        PacketGenerator.pageStart(),
        PacketGenerator.setPageSizeV1(image.rows),
        PacketGenerator.setPrintQuantity(quantity ?? 1),
        ...PacketGenerator.writeImageData(image, { printheadPixels: this.printheadPixels() }),
        PacketGenerator.pageEnd(),
      ],
      this.printOptions.pageTimeoutMs
    );
  }

  override waitForFinished(): Promise<void> {
    return this.abstraction.waitUntilPrintFinishedByPageIndex(
      this.printOptions.totalPages ?? 1,
      this.printOptions.statusTimeoutMs
    );
  }
}
