import { Buffer } from "buffer";
import { describe, expect, it } from "vitest";
import {
  claimToQrPayload,
  decodeClaimQr,
  encodeClaimQr,
  encodeClaimQrFromClaim,
  hashSerial,
  isValidContractId,
  parseClaimQr,
  serialHashToBuffer,
  type ClaimQrPayload,
} from "../src/qr.js";

const CONTRACT_ID = "CCTM224EKYEXNSULQBEW2HRG5CICUWWE46MLSRSASJZUQKXI5E5LK5GT";
const SERIAL_HASH =
  "fa6ceb8d7a5cd1b8bc7c5959830c30704aad79dbe1ba90a794f04de6868712b1";

const payload: ClaimQrPayload = {
  network: "testnet",
  contractId: CONTRACT_ID,
  claimId: "1",
  serialHash: SERIAL_HASH,
};

describe("claim QR payloads", () => {
  it("round-trips a valid payload", () => {
    const encoded = encodeClaimQr(payload);
    expect(encoded.startsWith("looptag:v1:testnet:")).toBe(true);
    expect(encoded.endsWith(":")).toBe(false);
    expect(decodeClaimQr(encoded)).toEqual(payload);
    expect(parseClaimQr(encoded)).toEqual(payload);
  });

  it("rejects a tampered payload", () => {
    const encoded = encodeClaimQr(payload);
    const tampered = encoded.replace(":1:", ":2:");
    expect(() => decodeClaimQr(tampered)).toThrow(/checksum/);
  });

  it("rejects unknown versions, prefixes, and malformed fields", () => {
    const encoded = encodeClaimQr(payload);
    expect(() =>
      decodeClaimQr(encoded.replace("looptag:v1:", "looptag:v2:")),
    ).toThrow(/version/);
    expect(() => decodeClaimQr(encoded.replace("looptag:", "other:"))).toThrow(
      /prefix/,
    );
    expect(() => encodeClaimQr({ ...payload, contractId: "C123" })).toThrow(
      /contract id/,
    );
    expect(() => encodeClaimQr({ ...payload, claimId: "0" })).toThrow(
      /claim id/,
    );
    expect(() => encodeClaimQr({ ...payload, serialHash: "abc" })).toThrow(
      /serial hash/,
    );
  });

  it("hashes a serial deterministically", async () => {
    await expect(hashSerial("CUP-042")).resolves.toBe(SERIAL_HASH);
  });

  it("validates contract ids locally", () => {
    expect(isValidContractId(CONTRACT_ID)).toBe(true);
    expect(isValidContractId("C123")).toBe(false);
    expect(
      isValidContractId(
        "GCTM224EKYEXNSULQBEW2HRG5CICUWWE46MLSRSASJZUQKXI5E5LK5GT",
      ),
    ).toBe(false);
  });

  it("builds a QR payload from an on-chain claim and normalizes uppercase hex", () => {
    const claim = {
      id: 1n,
      serial_hash: serialHashToBuffer(SERIAL_HASH.toUpperCase()),
    };
    const built = claimToQrPayload(claim, {
      network: "testnet",
      contractId: CONTRACT_ID,
      serialHash: SERIAL_HASH.toUpperCase(),
    });
    expect(built).toEqual(payload);
    expect(
      encodeClaimQrFromClaim(claim, {
        network: "testnet",
        contractId: CONTRACT_ID,
        serialHash: SERIAL_HASH,
      }),
    ).toBe(encodeClaimQr(payload));
  });

  it("rejects mismatched serial hashes and malformed claim ids when building from a claim", () => {
    const claim = {
      id: 1n,
      serial_hash: Buffer.from(SERIAL_HASH, "hex"),
    };
    const wrongHash = "0".repeat(64);
    expect(() =>
      encodeClaimQrFromClaim(claim, {
        network: "testnet",
        contractId: CONTRACT_ID,
        serialHash: wrongHash,
      }),
    ).toThrow(/serial hash mismatch/);

    expect(() =>
      claimToQrPayload(
        { id: 0n, serial_hash: Buffer.from(SERIAL_HASH, "hex") },
        {
          network: "testnet",
          contractId: CONTRACT_ID,
          serialHash: SERIAL_HASH,
        },
      ),
    ).toThrow(/claim id/);

    expect(() =>
      claimToQrPayload(
        {
          id: 18_446_744_073_709_551_616n,
          serial_hash: Buffer.from(SERIAL_HASH, "hex"),
        },
        {
          network: "testnet",
          contractId: CONTRACT_ID,
          serialHash: SERIAL_HASH,
        },
      ),
    ).toThrow(/claim id/);

    expect(() => serialHashToBuffer("not-hex")).toThrow(/serial hash/);
  });
});
