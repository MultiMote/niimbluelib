## NiimBlueLib [![NPM](https://img.shields.io/npm/v/@mmote/niimbluelib)](https://npmjs.com/package/@mmote/niimbluelib)

> [!WARNING]
>
> This project is intended for informational and educational purposes only.
> The project is not affiliated with or endorsed by the original software or hardware vendor,
> and is not intended to be used for commercial purposes without the consent of the vendor.

[Documentation](https://niim-docs.pages.dev)

NiimBlueLib is a library for the communication with NIIMBOT printers.
Used in [NiimBlue](https://github.com/MultiMote/niimblue) project.

NiimBlueLib provides the most accurate open source implementation of the NIIMBOT printers protocol.

This project is in Alpha state. Use only exact version when you add it to your project. API can be changed anytime.

Also check out [niimblue-node](https://github.com/MultiMote/niimblue-node) for CLI use cases.

### Installation

NPM:

```bash
npm install -E @mmote/niimbluelib
```

CDN:

```html
<script src="https://unpkg.com/@mmote/niimbluelib@0.0.1-alpha.27/dist/umd/niimblue.min.js"></script>
```

Script uses `niimblue` namespace. Example: 

```js
const client = new niimblue.NiimbotBluetoothClient();
```

### Usage example

See [example/main.js](example/main.js)

### Misc

Eslint not included. Install it with:

```
npm install --no-save --no-package-lock eslint@9.x globals @eslint/js typescript-eslint
```
