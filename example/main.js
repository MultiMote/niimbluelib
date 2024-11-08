import {
  Utils,
  RequestCommandId,
  ResponseCommandId,
  NiimbotBluetoothClient,
  ImageEncoder,
  NiimbotSerialClient,
} from "@mmote/niimbluelib";

let client = null;

const bleConnectButton = document.querySelector("button.connect.ble");
const serialConnectButton = document.querySelector("button.connect.serial");
const disconnectButton = document.querySelector("button.disconnect");
const printButton = document.querySelector("button.print");
const logPane = document.querySelector(".logger");
const canvas = document.querySelector("canvas");

/** Draw canvas test content */
const repaint = () => {
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.lineWidth = 3;

  // fill background
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // draw diagonal line
  ctx.beginPath();
  ctx.moveTo(0, ctx.lineWidth / 2);
  ctx.lineTo(canvas.width, canvas.height-ctx.lineWidth / 2);
  ctx.stroke();

  // draw border
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
};

/** Add text to log pane */
const logger = (text) => {
  console.log(text);
  logPane.innerText += text + "\n";
  logPane.scrollTop = logPane.scrollHeight;
};


/** Instantiate client */
const newClient = (transport) => {
  if (client) {
    client.disconnect();
  }

  if (transport === "ble") {
    client = new NiimbotBluetoothClient();
  } else if (transport === "serial") {
    client = new NiimbotSerialClient();
  }

  client.on("packetsent", (e) => {
    logger(`>> ${Utils.bufToHex(e.packet.toBytes())} (${RequestCommandId[e.packet.command]})`);
  });

  client.on("packetreceived", (e) => {
    logger(`<< ${Utils.bufToHex(e.packet.toBytes())} (${ResponseCommandId[e.packet.command]})`);
  });

  client.on("connect", () => {
    logger("connected");
    disconnectButton.disabled = false;
    printButton.disabled = false;
    bleConnectButton.disabled = true;
    serialConnectButton.disabled = true;
  });

  client.on("disconnect", () => {
    logger("disconnected");
    disconnectButton.disabled = true;
    printButton.disabled = true;
    bleConnectButton.disabled = false;
    serialConnectButton.disabled = false;
  });

  client.on("printprogress", (e) => {
    logger(`Page ${e.page}/${e.pagesTotal}, Page print ${e.pagePrintProgress}%, Page feed ${e.pageFeedProgress}%`);
  });
};

/** On "Disconnect" clicked */
disconnectButton.onclick = () => {
  client.disconnect();
  client = null;
}

/** On "Connect BLE" clicked */
bleConnectButton.onclick = async () => {
  newClient("ble");

  try {
    await client.connect();
  } catch (e) {
    alert(e);
  }
};

/** On "Connect Serial" clicked */
serialConnectButton.onclick = async () => {
  newClient("serial");

  try {
    await client.connect();
  } catch (e) {
    alert(e);
  }
};

/** On "Print" clicked */
printButton.onclick = async () => {
  /** left or top */
  const printDirection = "left";
  const quantity = 1;

  /** Convert image to black and white bits */
  const encoded = ImageEncoder.encodeCanvas(canvas, printDirection);

  /** todo: Auto-detection works only for a small set of printers so manual user selection is required */
  const printTaskName = client.getPrintTaskType() ?? "D110";

  const printTask = client.abstraction.newPrintTask(printTaskName, {
    totalPages: quantity,
    statusPollIntervalMs: 100,
    statusTimeoutMs: 8_000,
  });

  try {
    await printTask.printInit();
    await printTask.printPage(encoded, quantity);
    await printTask.waitForFinished();
  } catch (e) {
    alert(e);
  } finally {
    await client.abstraction.printEnd();
  }
};

repaint();
