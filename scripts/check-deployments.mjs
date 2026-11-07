#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), "deployments/testnet.json");
const deployment = JSON.parse(readFileSync(path, "utf8"));

const errors = [];
const contractRe = /^C[A-Z2-7]{55}$/;
const hashRe = /^[0-9a-f]{64}$/;

function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${field} must be a non-empty string`);
  }
}

requireString(deployment.network, "network");
if (deployment.network !== "testnet") errors.push("network must be testnet");

requireString(deployment.contractId, "contractId");
if (!contractRe.test(deployment.contractId)) errors.push("contractId is not a valid contract id");

requireString(deployment.wasmHash, "wasmHash");
if (!hashRe.test(deployment.wasmHash)) errors.push("wasmHash must be 64 lowercase hex characters");

if (!Number.isInteger(deployment.wasmSizeBytes) || deployment.wasmSizeBytes <= 0) {
  errors.push("wasmSizeBytes must be a positive integer");
}

requireString(deployment.depositToken?.contractId, "depositToken.contractId");
if (!contractRe.test(deployment.depositToken?.contractId ?? "")) {
  errors.push("depositToken.contractId is not a valid contract id");
}

for (const [name, hash] of Object.entries(deployment.transactions ?? {})) {
  if (!hashRe.test(hash)) errors.push(`transactions.${name} is not a transaction hash`);
}

const demo = deployment.demo ?? {};
for (const field of [
  "claimId",
  "serialHash",
  "depositStroops",
  "issuer",
  "originalOwner",
  "finalOwner",
  "returnStation",
]) {
  if (typeof demo[field] !== "string" || demo[field].length === 0) {
    errors.push(`demo.${field} is required`);
  }
}
if (!/^\d+$/.test(demo.claimId ?? "")) errors.push("demo.claimId must be a decimal string");
if (!hashRe.test(demo.serialHash ?? "")) errors.push("demo.serialHash must be 64 lowercase hex characters");
if (!/^\d+$/.test(demo.depositStroops ?? "")) errors.push("demo.depositStroops must be a decimal string");

if (errors.length > 0) {
  console.error(`deployment validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`deployment ok: ${deployment.contractId}`);
