import { EncodedImage } from '../image_encoder'
import { PacketGenerator } from '../packets'
import { AbstractPrintTask } from './AbstractPrintTask'

/**
 * @category Print tasks
 */
export class V5PrintTask extends AbstractPrintTask {
  override printInit(): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setDensity(this.printOptions.density),
      PacketGenerator.setLabelType(this.printOptions.labelType),
      PacketGenerator.printStartV5(this.printOptions.totalPages, 0, 0),
    ])
  }

  override printPage(image: EncodedImage, quantity?: number): Promise<void> {
    this.checkAddPage(quantity ?? 1)

    return this.abstraction.sendAll(
      [
        PacketGenerator.pageStart(),
        PacketGenerator.setPageSizeV4(image.rows, image.cols, quantity ?? 1, 0, false),
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
