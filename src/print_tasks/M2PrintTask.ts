import { EncodedImage, ImageRow } from '../image_encoder'
import { PacketGenerator } from '../packets'
import { AbstractPrintTask } from './AbstractPrintTask'

/**
 * @category Print tasks
 */
export class M2PrintTask extends AbstractPrintTask {
  override async printInit(): Promise<void> {
    return this.abstraction.sendAll([
      PacketGenerator.setLabelType(this.printOptions.labelType),
      PacketGenerator.setDensity(this.printOptions.density),
      PacketGenerator.printStartV5(this.printOptions.totalPages),
    ])
  }

  private getImageLastRow(rowData: ImageRow | undefined): ImageRow[] {
    if (rowData === undefined) return []

    const newRowData: ImageRow[] = []

    if (rowData.dataType === 'check') {
      newRowData.push(rowData)
      newRowData.push({
        dataType: 'void',
        rowNumber: rowData.rowNumber + 1,
        repeat: 1,
        blackPixelsCount: 0,
      })
    } else {
      if (rowData.dataType === 'void') {
        newRowData.push({
          ...rowData,
          repeat: rowData.repeat + 1,
        })
      }

      if (rowData.dataType === 'pixels') {
        newRowData.push({
          dataType: 'void',
          rowNumber: rowData.rowNumber + 1,
          repeat: 1,
          blackPixelsCount: 0,
        })
      }

      if ((rowData.rowNumber + rowData.repeat) % 200 === 199) {
        newRowData.push({
          dataType: 'check',
          rowNumber: rowData.rowNumber + rowData.repeat,
          repeat: 0,
          rowData: undefined,
          blackPixelsCount: 0,
        })
      }
    }

    return newRowData
  }

  override printPage(image: EncodedImage, quantity?: number): Promise<void> {
    this.checkAddPage(quantity ?? 1)

    const addedRowImage: EncodedImage = {
      rows: image.rows + 1,
      cols: image.cols,
      rowsData: [...image.rowsData.slice(0, -1), ...this.getImageLastRow(image.rowsData.at(-1))],
    }

    return this.abstraction.sendAll(
      [
        PacketGenerator.pageStart(),
        PacketGenerator.setPageSizeV3(addedRowImage.rows, addedRowImage.cols, quantity ?? 1),
        PacketGenerator.printStatus(),
        ...PacketGenerator.writeImageData(addedRowImage, {
          printheadPixels: this.printheadPixels(),
        }),
        PacketGenerator.printStatus(),
        PacketGenerator.pageEnd(),
      ],
      this.printOptions.pageTimeoutMs,
    )
  }

  override waitForFinishedCancellable(page: number, shouldCancel: () => boolean): Promise<boolean> {
    this.abstraction.setPacketTimeout(this.printOptions.statusTimeoutMs)

    return this.abstraction
      .waitUntilPrintFinishedByStatusPoll(page, this.printOptions.statusPollIntervalMs, shouldCancel)
      .finally(() => this.abstraction.setDefaultPacketTimeout())
  }

  override cleanupPrint(): Promise<void> {
    return this.abstraction.send(PacketGenerator.connect()).then()
  }

  override waitForFinished(page: number): Promise<boolean> {
    return this.waitForFinishedCancellable(page, () => false)
  }
}
