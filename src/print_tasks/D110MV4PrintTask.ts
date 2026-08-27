import { EncodedImage } from "../image_encoder";
import { HeartbeatType, NiimbotPacket, PacketGenerator, LabelType } from "../packets";
import { AbstractPrintTask } from "./AbstractPrintTask";

/**
 * @category Print tasks
 */
export class D110MV4PrintTask extends AbstractPrintTask {
  override printInit(): Promise<void> {
    const pkts: NiimbotPacket[] = [];

    if (
      (this.printOptions.tubeWidthMm !== undefined || this.printOptions.tubeType !== undefined) &&
      this.printOptions.labelType !== LabelType.Continuous
    ) {
      throw new Error("When using tube parameters, labelType must set to Continuous");
    }

    pkts.push(
      PacketGenerator.setLabelType(this.printOptions.labelType),
      PacketGenerator.setDensity(this.printOptions.density),
    );

    if (this.printOptions.tubeType !== undefined && this.printOptions.tubeWidthMm !== undefined) {
      pkts.push(PacketGenerator.setTubeTypeAndWidth(this.printOptions.tubeType, this.printOptions.tubeWidthMm));
    }

    if (this.printOptions.halfCut !== undefined) {
      pkts.push(PacketGenerator.setHalfCut(this.printOptions.halfCut));
    }

    pkts.push(
      PacketGenerator.printStart9b(this.printOptions.totalPages, this.printOptions.color, this.printOptions.speed),
    );

    return this.abstraction.sendAll(pkts);
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
      this.printOptions.pageTimeoutMs,
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

    const result = await this.abstraction.printEnd();

    await this.abstraction.send(pkt);

    return result;
  }
}
