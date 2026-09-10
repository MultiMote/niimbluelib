import { test, describe } from "node:test";
import { match, strictEqual } from "node:assert";
import { NiimbotVirtualClient, ResolutionClass } from "..";
import * as dumps from "./dumps";

describe("Virtual B1 5.22 test", async () => {
  const client = new NiimbotVirtualClient();
  client.loadHexDump(dumps.B1_V5_22);
  await client.connect();

  const info = client.getPrinterInfo();
  const heartbeatInfo = await client.protocol.heartbeat();

  describe("getPrinterInfo", async () => {
    test("modelId", async () => strictEqual(info.modelId, 4096));
    test("hardwareVersion", async () => strictEqual(info.hardwareVersion, "5.10"));
    test("softwareVersion", async () => strictEqual(info.softwareVersion, "5.22"));
    test("printheadWidth", async () => strictEqual(info.printheadWidth, 384));
    test("protocolVersion", async () => strictEqual(info.protocolVersion, 3));
    test("serial", async () => strictEqual(info.serial, "G327071185"));
    test("resolutionClass", async () => strictEqual(info.resolutionClass, ResolutionClass.DPI203));
    test("batteryPercents", async () => strictEqual(info.batteryPercents, 100));
  });

  describe("heartbeatInfo", async () => {
    test("batteryPercents", async () => strictEqual(heartbeatInfo.batteryPercents, 100));
    test("lidClosed", async () => strictEqual(heartbeatInfo.lidClosed, true));
  });

  await client.disconnect();
});

describe("Virtual B21 PRO 3.09 test", async () => {
  const client = new NiimbotVirtualClient();
  client.loadHexDump(dumps.B21_PRO_V3_09);
  await client.connect();

  const info = client.getPrinterInfo();

  describe("getPrinterInfo", async () => {
    test("modelId", async () => strictEqual(info.modelId, 785));
    test("hardwareVersion", async () => strictEqual(info.hardwareVersion, "3.01"));
    test("softwareVersion", async () => strictEqual(info.softwareVersion, "3.09"));
    test("printheadWidth", async () => strictEqual(info.printheadWidth, 576));
    test("protocolVersion", async () => strictEqual(info.protocolVersion, 5));
    test("serial", async () => strictEqual(info.serial, "H613040618"));
    test("resolutionClass", async () => strictEqual(info.resolutionClass, ResolutionClass.DPI300));
    test("batteryPercents", async () => strictEqual(info.batteryPercents, 50));
  });

  await client.disconnect();
});

describe("Virtual D110 5.34 test", async () => {
  const client = new NiimbotVirtualClient();
  client.loadHexDump(dumps.D110_V13_14);
  await client.connect();

  const info = client.getPrinterInfo();
  const heartbeatInfo = await client.protocol.heartbeat();

  describe("getPrinterInfo", async () => {
    test("modelId", async () => strictEqual(info.modelId, 2304));
    test("hardwareVersion", async () => match(info.hardwareVersion!, /13\.10/));
    test("softwareVersion", async () => match(info.softwareVersion!, /13\.14/));
    test("printheadWidth", async () => strictEqual(info.printheadWidth, undefined));
    test("protocolVersion", async () => strictEqual(info.protocolVersion, 1));
    test("serial", async () => strictEqual(info.serial, "G326030306"));
    test("batteryPercents", async () => strictEqual(info.batteryPercents, 75));
  });

  describe("heartbeatInfo", async () => {
    test("batteryPercents", async () => strictEqual(heartbeatInfo.batteryPercents, 75));
    test("lidClosed", async () => strictEqual(heartbeatInfo.lidClosed, true));
  });

  await client.disconnect();
});

describe("Virtual D110M 4.23 test", async () => {
  const client = new NiimbotVirtualClient();
  client.loadHexDump(dumps.D110M_V4_23);
  await client.connect();

  const info = client.getPrinterInfo();
  const heartbeatInfo = await client.protocol.heartbeat();

  describe("getPrinterInfo", async () => {
    test("modelId", async () => strictEqual(info.modelId, 2320));
    test("hardwareVersion", async () => strictEqual(info.hardwareVersion, "4.01"));
    test("softwareVersion", async () => strictEqual(info.softwareVersion, "4.23"));
    test("protocolVersion", async () => strictEqual(info.protocolVersion, 4));
    test("serial", async () => strictEqual(info.serial, "H322062548"));
    test("printheadWidth", async () => strictEqual(info.printheadWidth, 96));
    test("resolutionClass", async () => strictEqual(info.resolutionClass, ResolutionClass.DPI203));
    test("batteryPercents", async () => strictEqual(info.batteryPercents, 100));
  });

  describe("heartbeatInfo", async () => {
    test("batteryPercents", async () => strictEqual(heartbeatInfo.batteryPercents, 100));
    test("lidClosed", async () => strictEqual(heartbeatInfo.lidClosed, true));
  });

  await client.disconnect();
});

describe("Virtual B2 PRO 2.09 test", async () => {
  const client = new NiimbotVirtualClient();
  client.loadHexDump(dumps.B2_PRO_V2_01);
  await client.connect();

  const info = client.getPrinterInfo();
  const heartbeatInfo = await client.protocol.heartbeat();

  describe("getPrinterInfo", async () => {
    test("modelId", async () => strictEqual(info.modelId, 6912));
    test("hardwareVersion", async () => strictEqual(info.hardwareVersion, "2.01"));
    test("softwareVersion", async () => strictEqual(info.softwareVersion, "2.09"));
    test("protocolVersion", async () => strictEqual(info.protocolVersion, 5));
    test("serial", async () => strictEqual(info.serial, "I122050127"));
    test("printheadWidth", async () => strictEqual(info.printheadWidth, 576));
    test("resolutionClass", async () => strictEqual(info.resolutionClass, ResolutionClass.DPI300));
    test("batteryPercents", async () => strictEqual(info.batteryPercents, 60));
  });

  describe("heartbeatInfo", async () => {
    test("batteryPercents", async () => strictEqual(heartbeatInfo.batteryPercents, 60));
    test("lidClosed", async () => strictEqual(heartbeatInfo.lidClosed, true));
  });

  await client.disconnect();
});

describe("Virtual B21S 40.28 test", async () => {
  const client = new NiimbotVirtualClient();
  client.loadHexDump(dumps.B21S_V40_28);
  await client.connect();

  const info = client.getPrinterInfo();
  const heartbeatInfo = await client.protocol.heartbeat();

  describe("getPrinterInfo", async () => {
    test("modelId", async () => strictEqual(info.modelId, 777));
    test("hardwareVersion", async () => match(info.hardwareVersion!, /40\.10/));
    test("softwareVersion", async () => match(info.softwareVersion!, /40\.28/));
    test("protocolVersion", async () => strictEqual(info.protocolVersion, 0));
    test("serial", async () => strictEqual(info.serial, "G626070087"));
    test("printheadWidth", async () => strictEqual(info.printheadWidth, undefined));
    test("resolutionClass", async () => strictEqual(info.resolutionClass, undefined));
  });

  describe("heartbeatInfo", async () => {
    test("batteryPercents", async () => strictEqual(heartbeatInfo.batteryPercents, 75));
    test("lidClosed", async () => strictEqual(heartbeatInfo.lidClosed, true));
  });

  await client.disconnect();
});
