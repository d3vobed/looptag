#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import QRCode from "qrcode";
import { encodeClaimQr } from "../packages/sdk/dist/index.js";

const root = resolve(process.cwd());
const deployment = JSON.parse(readFileSync(resolve(root, "deployments/testnet.json"), "utf8"));

const payload = encodeClaimQr({
  network: "testnet",
  contractId: deployment.contractId,
  claimId: deployment.demo.claimId,
  serialHash: deployment.demo.serialHash,
});

await QRCode.toFile(resolve(root, "demo/claim-qr.svg"), payload, {
  type: "svg",
  margin: 1,
  width: 360,
  color: { dark: "#0b1220", light: "#ffffff" },
});
writeFileSync(resolve(root, "demo/claim-qr.txt"), `${payload}\n`);

console.log(payload);
