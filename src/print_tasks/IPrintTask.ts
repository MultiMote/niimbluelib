import { EncodedImage } from "../image_encoder";
import { PrintOptions } from "../packets";
import { Abstraction } from "../packets/abstraction";
import { NiimbotPacket } from "../packets/packet";

export interface IPrintTask {
  abstraction: Abstraction;

  // getName(): string;
  //   instance(abstraction: Abstraction): PrintTask;

  printInit(options?: PrintOptions): Promise<void>;
  printPage(image: EncodedImage, options?: PrintOptions): Promise<void>;
  waitForFinished(pagesToPrint: number, options?: { pollIntervalMs?: number; timeoutMs?: number }): Promise<void>;
}
