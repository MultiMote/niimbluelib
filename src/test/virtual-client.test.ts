import { test, describe, before, after } from "node:test";
import { match, strictEqual, rejects, ifError, deepStrictEqual } from "node:assert";
import { NiimbotVirtualClient, ResolutionClass, PrinterInfo, HeartbeatData, NiimbotAbstractClient } from "..";
import * as dumps from "./dumps";
import { CombinedRfidInfo } from "../packets";

const newClient = () => {
  const client = new NiimbotVirtualClient();
  client.setHeartbeatAutoStart(false);
  return client;
};

describe("Virtual bad client", () => {
  let client: NiimbotVirtualClient;

  before(async () => {
    client = newClient();
  });

  test("Failed connection with no connect packet", async () => {
    await rejects(() => client.connect());
  });
});

describe("Virtual B1 5.22 test", () => {
  let client: NiimbotVirtualClient;

  let info: PrinterInfo;
  let heartbeatInfo: HeartbeatData;

  before(async () => {
    client = newClient();
    client.loadHexDump(dumps.B1_V5_22);
    await client.connect();

    info = client.getPrinterInfo();
    heartbeatInfo = await client.protocol.heartbeat();
  });

  after(async () => {
    await client.disconnect();
  });

  describe("getPrinterInfo", () => {
    test("modelId", () => strictEqual(info.modelId, 4096));
    test("hardwareVersion", () => strictEqual(info.hardwareVersion, "5.10"));
    test("softwareVersion", () => strictEqual(info.softwareVersion, "5.22"));
    test("printheadWidth", () => strictEqual(info.printheadWidth, 384));
    test("protocolVersion", () => strictEqual(info.protocolVersion, 3));
    test("serial", () => strictEqual(info.serial, "G327071185"));
    test("resolutionClass", () => strictEqual(info.resolutionClass, ResolutionClass.DPI203));
    test("batteryPercents", () => strictEqual(info.batteryPercents, 100));
  });

  describe("heartbeatInfo", () => {
    test("batteryPercents", () => strictEqual(heartbeatInfo.batteryPercents, 100));
    test("lidClosed", () => strictEqual(heartbeatInfo.lidClosed, true));
  });
});

describe("Virtual B21 PRO 3.09 test", () => {
  let client: NiimbotVirtualClient;

  let info: PrinterInfo;
  let rfidInfo: CombinedRfidInfo;

  before(async () => {
    client = newClient();
    client.loadHexDump(dumps.B21_PRO_V3_09);
    await client.connect();

    info = client.getPrinterInfo();
    rfidInfo = client.getRfidInfo();
  });

  after(async () => {
    await client.disconnect();
  });

  describe("getPrinterInfo", () => {
    test("modelId", () => strictEqual(info.modelId, 785));
    test("hardwareVersion", () => strictEqual(info.hardwareVersion, "3.01"));
    test("softwareVersion", () => strictEqual(info.softwareVersion, "3.09"));
    test("printheadWidth", () => strictEqual(info.printheadWidth, 576));
    test("protocolVersion", () => strictEqual(info.protocolVersion, 5));
    test("serial", () => strictEqual(info.serial, "H613040618"));
    test("resolutionClass", () => strictEqual(info.resolutionClass, ResolutionClass.DPI300));
    test("batteryPercents", () => strictEqual(info.batteryPercents, 50));
  });

  test("labelRfidInfo", () =>
    deepStrictEqual(rfidInfo.labelRfidInfo, {
      allPaper: 276,
      barCode: "10262260",
      capacity: 230,
      consumablesType: 1,
      serialNumber: "PZ1G221322004205",
      tagPresent: true,
      usedPaper: 153,
      uuid: "881d7e4fd9970000",
    }));

  test("paperInfo", () =>
    deepStrictEqual(rfidInfo.paperInfo, {
      valid: false,
    }));
});

describe("Virtual B21 PRO 3.13 test", () => {
  let client: NiimbotVirtualClient;

  let info: PrinterInfo;
  let rfidInfo: CombinedRfidInfo;

  before(async () => {
    client = newClient();
    client.loadHexDump(dumps.B21_PRO_V3_13);
    await client.connect();
    info = client.getPrinterInfo();
    rfidInfo = client.getRfidInfo();
  });

  after(async () => {
    await client.disconnect();
  });

  describe("getPrinterInfo", () => {
    test("modelId", () => strictEqual(info.modelId, 785));
    test("hardwareVersion", () => strictEqual(info.hardwareVersion, "3.01"));
    test("softwareVersion", () => strictEqual(info.softwareVersion, "3.13"));
    test("printheadWidth", () => strictEqual(info.printheadWidth, 576));
    test("protocolVersion", () => strictEqual(info.protocolVersion, 5));
    test("serial", () => strictEqual(info.serial, "H613040618"));
    test("resolutionClass", () => strictEqual(info.resolutionClass, ResolutionClass.DPI300));
    test("batteryPercents", () => strictEqual(info.batteryPercents, 50));
  });

  test("labelRfidInfo", () =>
    deepStrictEqual(rfidInfo.labelRfidInfo, {
      allPaper: 276,
      barCode: "10262260",
      capacity: 230,
      consumablesType: 1,
      serialNumber: "PZ1G221322004205",
      tagPresent: true,
      usedPaper: 155,
      uuid2: "881d7e4fd9970000",
      uuid: "881d7e4fd9970000",
    }));

  test("paperInfo", () =>
    deepStrictEqual(rfidInfo.paperInfo, {
      valid: true,
      gapHeightPixel: 70,
      totalHeightPixel: 779,
      paperType: 1,
      gapHeight: 6,
      totalHeight: 66,
      paperWidthPixel: 472,
      paperWidth: 40,
      direction: 0,
      tailLengthPixel: 0,
      tailLength: 0,
      paperHeight: 60,
      paperHeightPixel: 709,
    }));
});

describe("Virtual D110 13.14 test", () => {
  let client: NiimbotVirtualClient;
  let info: PrinterInfo;
  let heartbeatInfo: HeartbeatData;

  before(async () => {
    client = newClient();
    client.loadHexDump(dumps.D110_V13_14);
    await client.connect();

    info = client.getPrinterInfo();
    heartbeatInfo = await client.protocol.heartbeat();
  });

  after(async () => {
    await client.disconnect();
  });

  describe("getPrinterInfo", () => {
    test("modelId", () => strictEqual(info.modelId, 2304));
    test("hardwareVersion", () => match(info.hardwareVersion!, /13\.10/));
    test("softwareVersion", () => match(info.softwareVersion!, /13\.14/));
    test("printheadWidth", () => ifError(info.printheadWidth));
    test("protocolVersion", () => strictEqual(info.protocolVersion, 1));
    test("serial", () => strictEqual(info.serial, "G326030306"));
    test("batteryPercents", () => strictEqual(info.batteryPercents, 75));
  });

  describe("heartbeatInfo", () => {
    test("batteryPercents", () => strictEqual(heartbeatInfo.batteryPercents, 75));
    test("lidClosed", () => strictEqual(heartbeatInfo.lidClosed, true));
  });
});

describe("Virtual D110M 4.23 test", () => {
  let client: NiimbotVirtualClient;
  let info: PrinterInfo;
  let heartbeatInfo: HeartbeatData;

  before(async () => {
    client = newClient();
    client.loadHexDump(dumps.D110M_V4_23);
    await client.connect();

    info = client.getPrinterInfo();
    heartbeatInfo = await client.protocol.heartbeat();
  });

  after(async () => {
    await client.disconnect();
  });

  describe("getPrinterInfo", () => {
    test("modelId", () => strictEqual(info.modelId, 2320));
    test("hardwareVersion", () => strictEqual(info.hardwareVersion, "4.01"));
    test("softwareVersion", () => strictEqual(info.softwareVersion, "4.23"));
    test("protocolVersion", () => strictEqual(info.protocolVersion, 4));
    test("serial", () => strictEqual(info.serial, "H322062548"));
    test("printheadWidth", () => strictEqual(info.printheadWidth, 96));
    test("resolutionClass", () => strictEqual(info.resolutionClass, ResolutionClass.DPI203));
    test("batteryPercents", () => strictEqual(info.batteryPercents, 100));

    test("capabilities:printheadWidth", () => strictEqual(info.capabilities?.printheadWidth, 96));
    test("capabilities:supportedLabelTypes", () => deepStrictEqual(info.capabilities?.supportedLabelTypes, [1, 2, 3, 5]));
  });

  describe("heartbeatInfo", () => {
    test("batteryPercents", () => strictEqual(heartbeatInfo.batteryPercents, 100));
    test("lidClosed", () => strictEqual(heartbeatInfo.lidClosed, true));
  });
});

describe("Virtual B2 PRO 2.09 test", () => {
  let client: NiimbotVirtualClient;

  let info: PrinterInfo;
  let heartbeatInfo: HeartbeatData;

  before(async () => {
    client = newClient();
    client.loadHexDump(dumps.B2_PRO_V2_01);
    await client.connect();

    info = client.getPrinterInfo();
    heartbeatInfo = await client.protocol.heartbeat();
  });

  after(async () => {
    await client.disconnect();
  });

  describe("getPrinterInfo", () => {
    test("modelId", () => strictEqual(info.modelId, 6912));
    test("hardwareVersion", () => strictEqual(info.hardwareVersion, "2.01"));
    test("softwareVersion", () => strictEqual(info.softwareVersion, "2.09"));
    test("protocolVersion", () => strictEqual(info.protocolVersion, 5));
    test("serial", () => strictEqual(info.serial, "I122050127"));
    test("printheadWidth", () => strictEqual(info.printheadWidth, 576));
    test("resolutionClass", () => strictEqual(info.resolutionClass, ResolutionClass.DPI300));
    test("batteryPercents", () => strictEqual(info.batteryPercents, 60));
  });

  describe("heartbeatInfo", () => {
    test("batteryPercents", () => strictEqual(heartbeatInfo.batteryPercents, 60));
    test("lidClosed", () => strictEqual(heartbeatInfo.lidClosed, true));
  });
});

describe("Virtual B21S 40.28 test", () => {
  let client: NiimbotVirtualClient;

  let info: PrinterInfo;
  let heartbeatInfo: HeartbeatData;

  before(async () => {
    client = newClient();
    client.loadHexDump(dumps.B21S_V40_28);
    await client.connect();

    info = client.getPrinterInfo();
    heartbeatInfo = await client.protocol.heartbeat();
  });

  after(async () => {
    await client.disconnect();
  });

  describe("getPrinterInfo", () => {
    test("modelId", () => strictEqual(info.modelId, 777));
    test("hardwareVersion", () => match(info.hardwareVersion!, /40\.10/));
    test("softwareVersion", () => match(info.softwareVersion!, /40\.28/));
    test("protocolVersion", () => strictEqual(info.protocolVersion, 0));
    test("serial", () => strictEqual(info.serial, "G626070087"));
    test("printheadWidth", () => ifError(info.printheadWidth));
    test("resolutionClass", () => ifError(info.resolutionClass));
  });

  describe("heartbeatInfo", () => {
    test("batteryPercents", () => strictEqual(heartbeatInfo.batteryPercents, 75));
    test("lidClosed", () => strictEqual(heartbeatInfo.lidClosed, true));
  });
});

describe("Virtual B2 PRO 2.12 test", () => {
  let client: NiimbotVirtualClient;

  let info: PrinterInfo;
  let heartbeatInfo: HeartbeatData;

  before(async () => {
    client = newClient();
    client.loadHexDump(dumps.B1_PRO_V2_12);
    await client.connect();

    info = client.getPrinterInfo();
    heartbeatInfo = await client.protocol.heartbeat();
  });

  after(async () => {
    await client.disconnect();
  });

  describe("getPrinterInfo", () => {
    test("modelId", () => strictEqual(info.modelId, 4097));
    test("hardwareVersion", () => strictEqual(info.hardwareVersion!, "2.01"));
    test("softwareVersion", () => strictEqual(info.softwareVersion!, "2.12"));
    test("protocolVersion", () => strictEqual(info.protocolVersion, 5));
    test("serial", () => strictEqual(info.serial, "I304031441"));
    test("printheadWidth", () => strictEqual(info.printheadWidth, 576));
    test("resolutionClass", () => strictEqual(info.resolutionClass, ResolutionClass.DPI300));
    test("batteryPercents", () => strictEqual(info.batteryPercents, 40));
  });

  describe("heartbeatInfo", () => {
    test("batteryPercents", () => strictEqual(heartbeatInfo.batteryPercents, 40));
    test("lidClosed", () => strictEqual(heartbeatInfo.lidClosed, true));
  });
});

describe("Virtual C1 3.12 test", () => {
  let client: NiimbotVirtualClient;

  let info: PrinterInfo;
  let heartbeatInfo: HeartbeatData;

  before(async () => {
    client = newClient();
    client.loadHexDump(dumps.C1_V3_12);
    await client.connect();

    info = client.getPrinterInfo();
    heartbeatInfo = await client.protocol.heartbeat();
  });

  after(async () => {
    await client.disconnect();
  });

  describe("getPrinterInfo", () => {
    test("modelId", () => strictEqual(info.modelId, 5120));
    test("hardwareVersion", () => strictEqual(info.hardwareVersion!, "3.01"));
    test("softwareVersion", () => strictEqual(info.softwareVersion!, "3.12"));
    test("protocolVersion", () => strictEqual(info.protocolVersion, 5));
    test("serial", () => strictEqual(info.serial, "HC22010295"));
    test("printheadWidth", () => strictEqual(info.printheadWidth, 128));
    test("resolutionClass", () => strictEqual(info.resolutionClass, ResolutionClass.DPI300));
    test("batteryPercents", () => strictEqual(info.batteryPercents, 100));

    test("capabilities:printheadWidth", () => strictEqual(info.capabilities?.printheadWidth, 128));
    test("capabilities:supportedLabelTypes", () => deepStrictEqual(info.capabilities?.supportedLabelTypes, [3]));
  });

  describe("heartbeatInfo", () => {
    test("batteryPercents", () => strictEqual(heartbeatInfo.batteryPercents, 100));
    test("lidClosed", () => strictEqual(heartbeatInfo.lidClosed, true));
  });
});
