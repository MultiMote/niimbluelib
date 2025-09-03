import { EncodedImage } from "../image_encoder";
import { HeartbeatType, PacketGenerator } from "../packets";
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

  override async printPage(image: EncodedImage, quantity?: number): Promise<void> {
    this.checkAddPage(quantity ?? 1);

    // B21_PRO does not respond on first packet after PrintStart if using Bluetooth connection.
    // Originally PrintStatus is sent, no response waited.
    const statusPacket = PacketGenerator.printStatus();
    statusPacket.oneWay = true;
    await this.abstraction.send(statusPacket);

    return this.abstraction.sendAll(
      [
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

  override async printEnd(): Promise<boolean> {
    // B21_PRO drops the first packet after PrintEnd.
    // Originally `Heartbeat` is sent, no response waited.
    const pkt = PacketGenerator.heartbeat(HeartbeatType.Advanced1);
    pkt.oneWay = true;
    await this.abstraction.send(pkt);

    return this.abstraction.printEnd();
  }
}
