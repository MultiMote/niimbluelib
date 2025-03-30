import { EncodedImage } from '../image_encoder'
import { PacketGenerator } from '../packets'
import { AbstractPrintTask } from './AbstractPrintTask'

/**
 * @category Print tasks
 */
export class D110PrintTask extends AbstractPrintTask {
  override printInit(): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setDensity(this.printOptions.density),
      PacketGenerator.setLabelType(this.printOptions.labelType),
      PacketGenerator.printStart(),
    ])
  }

  override printPage(image: EncodedImage, quantity?: number): Promise<void> {
    this.checkAddPage(quantity ?? 1)

    return this.abstraction.sendAll(
      [
        PacketGenerator.printClear(),
        PacketGenerator.pageStart(),
        PacketGenerator.setPageSizeV2(image.rows, image.cols),
        PacketGenerator.setPrintQuantity(quantity ?? 1),
        ...PacketGenerator.writeImageData(image, {
          printheadPixels: this.printheadPixels(),
        }),
        PacketGenerator.pageEnd(),
      ],
      this.printOptions.pageTimeoutMs,
    )
  }

  override waitForFinished(page: number): Promise<boolean> {
    this.abstraction.setPacketTimeout(this.printOptions.statusTimeoutMs)

    return this.abstraction
      .waitUntilPrintFinishedByStatusPoll(page, this.printOptions.statusPollIntervalMs)
      .finally(() => this.abstraction.setDefaultPacketTimeout())
  }
}
