import { EncodedImage } from "../utils";
import { HeartbeatType, NiimbotPacket, PacketGenerator, LabelType, PageColorType } from "../packets";
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

    // Grayscale printing was only verified with speed 0 (the known working B21 Pro flow
    // calls printStart9b(..., pageColor=3, speed=0)).
    const speed = this.printOptions.pageColor === PageColorType.MultiorderColor ? 0 : this.printOptions.speed;

    pkts.push(PacketGenerator.printStart9b(this.printOptions.totalPages, this.printOptions.pageColor, speed));

    return this.protocol.sendAll(pkts);
  }

  override async printPage(image: EncodedImage, quantity?: number): Promise<void> {
    this.validatePage(image, quantity ?? 1);

    // B21_PRO does not respond on first packet after PrintStart if using Bluetooth connection.
    // Originally PrintStatus is sent, no response waited.
    const statusPacket = PacketGenerator.printStatus();
    statusPacket.oneWay = true;
    await this.protocol.send(statusPacket);

    // Grayscale rows address the full color head. The page width is one less than the row width
    // (the known working B21 Pro flow sends 575 for 576-dot rows).
    const pageWidth = image.pageColor === PageColorType.MultiorderColor ? Math.max(1, image.cols - 1) : image.cols;

    const capabilities = this.protocol.getClient().getPrinterInfo().capabilities;
    const maxImageCompressBytes = capabilities?.maxImageCompressBytes ?? 0;
    const useImageCompression =
      image.pageColor === PageColorType.MultiorderColor &&
      capabilities?.imageCompressSupport?.includes(1) === true &&
      maxImageCompressBytes > 0;

    const imagePackets = useImageCompression
      ? PacketGenerator.writeImageDataGrayCompressed(image, maxImageCompressBytes)
      : PacketGenerator.writeImageData(image, { printheadPixels: this.printheadPixels() });

    return this.protocol.sendAll(
      [
        PacketGenerator.setPageSize13b(image.rows, pageWidth, quantity ?? 1, this.printOptions.cutHeight, this.printOptions.cutType),
        ...imagePackets,
        PacketGenerator.pageEnd(),
      ],
      this.printOptions.pageTimeoutMs,
      this.makePacketProgressCallback(),
    );
  }

  override waitForFinished(): Promise<void> {
    this.protocol.setPacketTimeout(this.printOptions.statusTimeoutMs);

    return this.protocol
      .waitUntilPrintFinishedByStatusPoll(this.printOptions.totalPages ?? 1, this.printOptions.statusPollIntervalMs)
      .finally(() => this.protocol.setDefaultPacketTimeout());
  }

  override async printEnd(): Promise<boolean> {
    // B21_PRO drops the first packet after PrintEnd.
    // Originally `Heartbeat` is sent, no response waited.
    const pkt = PacketGenerator.heartbeat(HeartbeatType.Advanced1);
    pkt.oneWay = true;

    const result = await this.protocol.printEnd();

    await this.protocol.send(pkt);

    this.emitPrintEndEvent();

    return result;
  }

  override isSupportColor(pageColor: PageColorType): boolean {
    return (
      pageColor === PageColorType.SingleColor ||
      pageColor === PageColorType.DoubleColor ||
      pageColor === PageColorType.MultiorderColor
    );
  }
}
