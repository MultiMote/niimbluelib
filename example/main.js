import {
  Utils,
  RequestCommandId,
  ResponseCommandId,
  NiimbotBluetoothClient,
  ImageEncoder,
  NiimbotSerialClient,
  PageColorType,
  printTaskNames,
} from "@mmote/niimbluelib";

let client = null;

const bleConnectButton = document.querySelector("button.connect.ble");
const serialConnectButton = document.querySelector("button.connect.serial");
const disconnectButton = document.querySelector("button.disconnect");
const printButton = document.querySelector("button.print");
const logPane = document.querySelector(".logger");
const canvas = document.querySelector("canvas");
const printTaskSelect = document.querySelector(".print-task");
const pageColorSelect = document.querySelector(".page-color");
const printDirectionSelect = document.querySelector(".print-direction");
const printDensitySelect = document.querySelector(".print-density");
const canvasWidthInput = document.querySelector(".canvas-width");
const canvasHeightInput = document.querySelector(".canvas-height");

const init = () => {
  for (const name of printTaskNames) {
    const option = document.createElement("option");
    option.value = name;
    option.innerText = name;
    printTaskSelect.appendChild(option);
  }
  printTaskSelect.value = "B1";

  // iterate PageColorType enum names and values
  Object.keys(PageColorType)
    .filter((key) => Number.isNaN(Number(key)))
    .forEach((name) => {
      const value = PageColorType[name];

      const option = document.createElement("option");
      option.value = value;
      option.innerText = name;
      pageColorSelect.appendChild(option);
    });

  pageColorSelect.value = PageColorType.SingleColor;
  pageColorSelect.onchange = () => {
    repaint();
  };
};

/** Draw canvas test content */
const repaint = () => {
  const width = Number(canvasWidthInput.value);
  const height = Number(canvasHeightInput.value);

  if (width < 1 || height < 1) {
    return;
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.lineWidth = 3;

  // fill background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const pageColor = Number(pageColorSelect.value);

  if (pageColor === PageColorType.SingleColor) {
    // draw diagonal line
    ctx.beginPath();
    ctx.moveTo(0, ctx.lineWidth / 2);
    ctx.lineTo(canvas.width, canvas.height - ctx.lineWidth / 2);
    ctx.stroke();

    // draw border
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  } else if (pageColor === PageColorType.DoubleColor) {
    // draw red and black stroke rectangles next to each other with some shift to use all types of color packets
    const rectSize = Math.round(Math.min(canvas.width, canvas.height) / 3);
    const shift = rectSize / 4;
    ctx.strokeStyle = "#ff0000";
    ctx.strokeRect(
      Math.round(canvas.width / 2 - rectSize - shift) + 0.5,
      Math.round(canvas.height / 2 - rectSize / 2 - shift) + 0.5,
      rectSize,
      rectSize,
    );
    ctx.strokeStyle = "black";
    ctx.strokeRect(
      Math.round(canvas.width / 2 + shift) + 0.5,
      Math.round(canvas.height / 2 - rectSize / 2 + shift) + 0.5,
      rectSize,
      rectSize,
    );
  }
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

    const detectedPrintTask = client.getPrintTaskType();

    if (detectedPrintTask) {
      printTaskSelect.value = detectedPrintTask;
    }
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
};

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
  const quantity = 1;
  const pageColor = Number(pageColorSelect.value);
  const density = Number(printDensitySelect.value);

  /** Convert image to black and white bits */
  const encoded = ImageEncoder.encodeCanvas(canvas, pageColor, printDirectionSelect.value);

  const printTask = client.abstraction.newPrintTask(printTaskSelect.value, {
    totalPages: quantity,
    statusPollIntervalMs: 100,
    statusTimeoutMs: 8_000,
    pageColor,
    density,
  });

  try {
    await printTask.printInit();
    await printTask.printPage(encoded, quantity);
    await printTask.waitForPageFinished();
    await printTask.waitForFinished();
  } catch (e) {
    console.error(e);
    alert(e);
  } finally {
    await printTask.printEnd();
  }
};

canvasWidthInput.oninput = repaint;
canvasHeightInput.oninput = repaint;

init();
repaint();
