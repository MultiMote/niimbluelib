import { test, describe } from "node:test";
import { match, strictEqual,  } from "node:assert";
import { NiimbotVirtualClient, ResolutionClass } from "..";
import { B1_V5_22, B21_PRO_V3_09, B21S_V40_28, B2_PRO_V2_01, C1_V3_12, D110_V5_34, D110M_V4_23 } from "./dumps";

describe("Virtual B1 5.22 test", async () => {
  const client = new NiimbotVirtualClient();
  client.loadHexDump(B1_V5_22);
  await client.connect();

  const info = client.getPrinterInfo();

  test("modelId", async () => strictEqual(info.modelId!, 4096));
  test("hardwareVersion", async () => strictEqual(info.hardwareVersion!, "5.10"));
  test("softwareVersion", async () => strictEqual(info.softwareVersion!, "5.22"));
  test("printheadWidth", async () => strictEqual(info.printheadWidth!, 384));
  test("protocolVersion", async () => strictEqual(info.protocolVersion!, 3));
  test("serial", async () => strictEqual(info.serial!, "G327071185"));
  test("resolutionClass", async () => strictEqual(info.resolutionClass!, ResolutionClass.DPI203));

  await client.disconnect();
});

describe("Virtual B21 3.09 PRO test", async () => {
  const client = new NiimbotVirtualClient();
  client.loadHexDump(B21_PRO_V3_09);
  await client.connect();

  const info = client.getPrinterInfo();

  test("modelId", async () => strictEqual(info.modelId!, 785));
  test("hardwareVersion", async () => strictEqual(info.hardwareVersion!, "3.01"));
  test("softwareVersion", async () => strictEqual(info.softwareVersion!, "3.09"));
  test("printheadWidth", async () => strictEqual(info.printheadWidth!, 576));
  test("protocolVersion", async () => strictEqual(info.protocolVersion!, 5));
  test("serial", async () => strictEqual(info.serial!, "H613040618"));
  test("resolutionClass", async () => strictEqual(info.resolutionClass!, ResolutionClass.DPI300));

  await client.disconnect();
});


describe("Virtual D110 5.34 test", async () => {
  const client = new NiimbotVirtualClient();
  client.loadHexDump(D110_V5_34);
  await client.connect();

  const info = client.getPrinterInfo();

  test("modelId", async () => strictEqual(info.modelId!, 2304));
  test("hardwareVersion", async () => match(info.hardwareVersion!, /5\.30/));
  test("softwareVersion", async () => match(info.softwareVersion!, /5\.34/));
  test("printheadWidth", async () => strictEqual(info.printheadWidth!, undefined));
  test("protocolVersion", async () => strictEqual(info.protocolVersion!, 1));
  test("serial", async () => strictEqual(info.serial!, "G326030306"));

  await client.disconnect();
});


describe("Virtual D110M 4.23 test", async () => {
  const client = new NiimbotVirtualClient();
  client.loadHexDump(D110M_V4_23);
  await client.connect();

  const info = client.getPrinterInfo();

  test("modelId", async () => strictEqual(info.modelId!, 2320));
  test("hardwareVersion", async () => strictEqual(info.hardwareVersion!, "4.01"));
  test("softwareVersion", async () => strictEqual(info.softwareVersion!, "4.23"));
  test("protocolVersion", async () => strictEqual(info.protocolVersion!, 4));
  test("serial", async () => strictEqual(info.serial!, "H322062548"));
  test("printheadWidth", async () => strictEqual(info.printheadWidth!, 96));
  test("resolutionClass", async () => strictEqual(info.resolutionClass!, ResolutionClass.DPI203));

  await client.disconnect();
});


describe("Virtual B2 PRO 2.09 test", async () => {
  const client = new NiimbotVirtualClient();
  client.loadHexDump(B2_PRO_V2_01);
  await client.connect();

  const info = client.getPrinterInfo();

  test("modelId", async () => strictEqual(info.modelId!, 6912));
  test("hardwareVersion", async () => strictEqual(info.hardwareVersion!, "2.01"));
  test("softwareVersion", async () => strictEqual(info.softwareVersion!, "2.09"));
  test("protocolVersion", async () => strictEqual(info.protocolVersion!, 5));
  test("serial", async () => strictEqual(info.serial!, "I122050127"));
  test("printheadWidth", async () => strictEqual(info.printheadWidth!, 576));
  test("resolutionClass", async () => strictEqual(info.resolutionClass!, ResolutionClass.DPI300));

  await client.disconnect();
});

describe("Virtual B21S 40.28 test", async () => {
  const client = new NiimbotVirtualClient();
  client.loadHexDump(B21S_V40_28);
  await client.connect();

  const info = client.getPrinterInfo();

  test("modelId", async () => strictEqual(info.modelId!, 777));
  test("hardwareVersion", async () => match(info.hardwareVersion!, /40\.10/));
  test("softwareVersion", async () => match(info.softwareVersion!, /40\.28/));
  test("protocolVersion", async () => strictEqual(info.protocolVersion!, 0));
  test("serial", async () => strictEqual(info.serial!, "G626070087"));
  test("printheadWidth", async () => strictEqual(info.printheadWidth!, undefined));
  test("resolutionClass", async () => strictEqual(info.resolutionClass!, undefined));

  await client.disconnect();
});
