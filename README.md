## NiimBlueLib [![NPM](https://img.shields.io/npm/v/@mmote/niimbluelib)](https://npmjs.com/package/@mmote/niimbluelib)

> [!WARNING]
>
> This project is intended for informational and educational purposes only.
> The project is not affiliated with or endorsed by the original software or hardware vendor,
> and is not intended to be used for commercial purposes without the consent of the vendor.

NiimBlueLib is a library for the communication with NIIMBOT printers.
Used in [NiimBlue](https://github.com/MultiMote/niimblue) project.

This project is in Alpha state. Use only exact version when you add it to your project. API can be changed anytime.

### Installation

Yarn:

```bash
yarn add @mmote/niimbluelib --exact
```

### Usage example (may be outdated)

```js
import { Utils, RequestCommandId, ResponseCommandId, NiimbotBluetoothClient, ImageEncoder, PrintTaskVersion } from "@mmote/niimbluelib";

const client = new NiimbotBluetoothClient();

client.addEventListener("packetsent", (e) => {
  console.log(`>> ${Utils.bufToHex(e.packet.toBytes())} (${RequestCommandId[e.packet.command]})`);
});

client.addEventListener("packetreceived", (e) => {
  console.log(`<< ${Utils.bufToHex(e.packet.toBytes())} (${ResponseCommandId[e.packet.command]})`);
});

client.addEventListener("connect", () => {
  console.log("connected");
});

client.addEventListener("disconnect", () => {
  console.log("disconnected");
});

client.addEventListener("printprogress", (e) => {
  console.log(`Page ${e.page}/${e.pagesTotal}, Page print ${e.pagePrintProgress}%, Page feed ${e.pageFeedProgress}%`);
});

await client.connect();

// label props
const props = {
  width: 240,
  height: 96,
  printDirection: "left",
};
const quantity = 1;

const canvas = document.createElement("canvas");
canvas.width = props.width;
canvas.height = props.height;

const ctx = canvas.getContext("2d");

ctx.fillStyle = "white";
ctx.lineWidth = 3;

// fill background
ctx.fillRect(0, 0, canvas.width, canvas.height);
// draw diagonal line
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(canvas.width, canvas.height);
ctx.stroke();
// draw border
ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);

const encoded = ImageEncoder.encodeCanvas(canvas, props.printDirection);

const printTaskName = client.getPrintTaskType() ?? "D110";

const printTask = client.abstraction.newPrintTask(printTaskName, {
  totalPages: quantity,
  statusPollIntervalMs: 100,
  statusTimeoutMs: 8_000
})

try {
  await printTask.printInit();
  await printTask.printPage(encoded, quantity);
  await printTask.waitForFinished();
} catch (e) {
  console.error(e);
}

await client.abstraction.printEnd();
await client.disconnect();
```

### Misc

Eslint not included. Install it with:

```
npm install --no-save --no-package-lock eslint@9.x globals @eslint/js typescript-eslint
```
