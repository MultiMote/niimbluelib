import { RequestCommandId, commandsMap, Utils } from "../dist/index.js";

console.log("| Request ID | Name | Response ID(s) |");
console.log("|------|------------|------|");

Object.entries(commandsMap).forEach(([k, v]) => {
  if (k == "-1") return;
  const tx = Utils.bufToHex([parseInt(k)]);
  const txName = RequestCommandId[parseInt(k)];
  const rx = v === null ? "⚠ one way" : "0x" + Utils.bufToHex(v, ", 0x");
  console.log(`| 0x${tx} | ${txName} | ${rx} |`);
});
