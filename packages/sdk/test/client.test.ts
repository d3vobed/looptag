import { describe, expect, it } from "vitest";
import {
  TESTNET_CONTRACT_ID,
  explorerContractUrl,
  explorerTxUrl,
} from "../src/client.js";

describe("explorer URL helpers", () => {
  it("builds a Stellar Expert transaction URL for a tx hash", () => {
    const hash =
      "3d689d9b8421b6069a67a5f95f97e2f8f1c9a0d1b2c3d4e5f6a7b8c9d0e1f2a3";
    expect(explorerTxUrl(hash)).toBe(
      `https://stellar.expert/explorer/testnet/tx/${hash}`,
    );
  });

  it("uses the generated testnet contract id by default", () => {
    expect(explorerContractUrl()).toBe(
      `https://stellar.expert/explorer/testnet/contract/${TESTNET_CONTRACT_ID}`,
    );
  });

  it("overrides the default contract id when an explicit contract id is passed", () => {
    const customContractId =
      "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
    expect(explorerContractUrl(customContractId)).toBe(
      `https://stellar.expert/explorer/testnet/contract/${customContractId}`,
    );
  });
});
