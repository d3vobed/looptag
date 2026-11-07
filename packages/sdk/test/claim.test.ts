import { Buffer } from "buffer";
import { describe, expect, it } from "vitest";
import {
  ClaimStatus,
  claimSummary,
  isOverdue,
  isRedeemable,
  isTransferable,
  statusLabel,
  type Claim,
} from "../src/claim.js";

const SERIAL_HASH =
  "fa6ceb8d7a5cd1b8bc7c5959830c30704aad79dbe1ba90a794f04de6868712b1";
const ISSUER = "GDI6UIHJGRSHN4FF6FWXUWSVQYYAV2BBH734S3LCYCQQCWYWLLEQ2UXJ";
const OWNER = "GCQK5S33PEWHTJQYSJFVKCWSCDF73XQEDH4GPD3UDCCPZWP7TNKP4ACT";
const STATION = "GDSROSZJFCNGBLFFY3NKMKKC5CMCOXTCAYTL7DFZMRT2P5NF4J4RVBWH";

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 1n,
    issuer: ISSUER,
    owner: OWNER,
    serial_hash: Buffer.from(SERIAL_HASH, "hex"),
    deposit: 20_000_000n,
    issued_at: 1_794_093_217n,
    expires_at: 0n,
    status: ClaimStatus.Active,
    return_station: null,
    returned_at: 0n,
    ...overrides,
  };
}

describe("claim helpers", () => {
  it("describes the lifecycle states", () => {
    expect(statusLabel(ClaimStatus.Active)).toMatch(/Active/);
    expect(statusLabel(ClaimStatus.ReturnAuthorized)).toMatch(/refund ready/);
    expect(statusLabel(ClaimStatus.Redeemed)).toMatch(/Redeemed/);
  });

  it("allows transfers only while active", () => {
    expect(isTransferable(claim())).toBe(true);
    expect(
      isTransferable(claim({ status: ClaimStatus.ReturnAuthorized })),
    ).toBe(false);
    expect(isTransferable(claim({ status: ClaimStatus.Redeemed }))).toBe(false);
  });

  it("allows redemption only after return attestation", () => {
    expect(isRedeemable(claim({ status: ClaimStatus.ReturnAuthorized }))).toBe(
      true,
    );
    expect(isRedeemable(claim())).toBe(false);
    expect(isRedeemable(claim({ status: ClaimStatus.Redeemed }))).toBe(false);
  });

  it("detects overdue claims without treating expiry as forfeiture", () => {
    expect(isOverdue(claim())).toBe(false);
    expect(isOverdue(claim({ expires_at: 1_000n }), 1_001)).toBe(true);
    expect(isOverdue(claim({ expires_at: 1_000n }), 999)).toBe(false);
    expect(
      isOverdue(
        claim({ expires_at: 1_000n, status: ClaimStatus.Redeemed }),
        2_000,
      ),
    ).toBe(false);
  });

  it("summarizes an on-chain claim for a dashboard", () => {
    const summary = claimSummary(
      claim({ status: ClaimStatus.ReturnAuthorized, return_station: STATION }),
      1_794_093_300,
    );
    expect(summary).toMatchObject({
      id: "1",
      statusCode: ClaimStatus.ReturnAuthorized,
      issuer: ISSUER,
      owner: OWNER,
      deposit: 20_000_000n,
      serialHash: SERIAL_HASH,
      returnStation: STATION,
      transferable: false,
      redeemable: true,
      overdue: false,
    });
  });
});
