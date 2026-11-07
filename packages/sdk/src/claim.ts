import { Buffer } from "buffer";
import { ClaimStatus } from "./generated/index.js";
import type { Claim } from "./generated/index.js";

export { ClaimStatus };
export type { Claim };

export interface ClaimSummary {
  id: string;
  status: string;
  statusCode: ClaimStatus;
  issuer: string;
  owner: string;
  deposit: bigint;
  serialHash: string;
  issuedAt: number;
  expiresAt: number;
  returnStation: string | null;
  returnedAt: number;
  transferable: boolean;
  redeemable: boolean;
  overdue: boolean;
}

/** Human-readable status used by dashboards and QR scanners. */
export function statusLabel(status: ClaimStatus): string {
  switch (status) {
    case ClaimStatus.Active:
      return "Active — deposit locked";
    case ClaimStatus.ReturnAuthorized:
      return "Return verified — refund ready";
    case ClaimStatus.Redeemed:
      return "Redeemed — deposit paid";
    default:
      return "Unknown status";
  }
}

/** A claim can move to another wallet only while it is active. */
export function isTransferable(claim: Pick<Claim, "status">): boolean {
  return claim.status === ClaimStatus.Active;
}

/** A claim can be paid out only after a station attested the return. */
export function isRedeemable(claim: Pick<Claim, "status">): boolean {
  return claim.status === ClaimStatus.ReturnAuthorized;
}

/** True when an active claim has passed its return-by date. */
export function isOverdue(
  claim: Pick<Claim, "status" | "expires_at">,
  nowSeconds: number | bigint = Math.floor(Date.now() / 1000),
): boolean {
  if (claim.status !== ClaimStatus.Active) {
    return false;
  }
  const expiresAt = BigInt(claim.expires_at);
  return expiresAt !== 0n && BigInt(nowSeconds) > expiresAt;
}

export function claimSummary(
  claim: Claim,
  nowSeconds: number | bigint = Math.floor(Date.now() / 1000),
): ClaimSummary {
  return {
    id: BigInt(claim.id).toString(),
    status: statusLabel(claim.status),
    statusCode: claim.status,
    issuer: claim.issuer,
    owner: claim.owner,
    deposit: BigInt(claim.deposit),
    serialHash: Buffer.from(claim.serial_hash).toString("hex"),
    issuedAt: Number(claim.issued_at),
    expiresAt: Number(claim.expires_at),
    returnStation: claim.return_station ?? null,
    returnedAt: Number(claim.returned_at),
    transferable: isTransferable(claim),
    redeemable: isRedeemable(claim),
    overdue: isOverdue(claim, nowSeconds),
  };
}
