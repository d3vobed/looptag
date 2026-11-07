/**
 * QR payloads for physical LOOPTAG items.
 *
 * A printed tag contains the contract, the claim id, and a SHA-256 hash of the
 * item's serial number. The raw serial is never placed on the tag. A return
 * station scans the tag, hashes the serial it reads from the item, and submits
 * the hash to `authorize_return`. The contract checks it against the claim.
 */

export type LooptagNetwork = "testnet" | "mainnet" | "futurenet" | "local";

export interface ClaimQrPayload {
  network: LooptagNetwork;
  /** Stellar contract id (56 characters, starts with C). */
  contractId: string;
  /** On-chain claim id as a decimal string. */
  claimId: string;
  /** Lowercase hex SHA-256 of the physical serial number (64 characters). */
  serialHash: string;
}

export const QR_PREFIX = "looptag";
export const QR_VERSION = "v1";

const CONTRACT_ID_RE = /^C[A-Z2-7]{55}$/;
const SERIAL_HASH_RE = /^[0-9a-f]{64}$/;
const U64_MAX = 18_446_744_073_709_551_615n;

/** Encode a payload into `looptag:v1:<network>:<contract>:<claim>:<hash>:<checksum>`. */
export function encodeClaimQr(payload: ClaimQrPayload): string {
  const normalized = normalizePayload(payload);
  const body = [
    QR_PREFIX,
    QR_VERSION,
    normalized.network,
    normalized.contractId,
    normalized.claimId,
    normalized.serialHash,
  ].join(":");
  return `${body}:${fnv1a32Hex(body)}`;
}

/** Decode and validate a LOOPTAG QR payload. Throws on malformed input. */
export function decodeClaimQr(value: string): ClaimQrPayload {
  const parts = value.trim().split(":");
  if (parts.length !== 7) {
    throw new TypeError("QR payload must have exactly 7 colon-separated parts");
  }

  const [prefix, version, network, contractId, claimId, serialHash, checksum] =
    parts;
  if (prefix !== QR_PREFIX) {
    throw new TypeError(`QR prefix must be "${QR_PREFIX}"`);
  }
  if (version !== QR_VERSION) {
    throw new TypeError(`unsupported QR version "${version}"`);
  }

  const body = parts.slice(0, 6).join(":");
  if (checksum !== fnv1a32Hex(body)) {
    throw new TypeError("QR checksum does not match");
  }

  return normalizePayload({
    network: network as LooptagNetwork,
    contractId,
    claimId,
    serialHash,
  });
}

/** Alias used by scanners that call the operation "parse". */
export const parseClaimQr = decodeClaimQr;

/** Lowercase hex SHA-256 of a serial number. */
export async function hashSerial(serial: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto is not available in this runtime");
  }
  const digest = await subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serial),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Validate a Stellar contract id without contacting the network. */
export function isValidContractId(value: string): boolean {
  return CONTRACT_ID_RE.test(value);
}

function normalizePayload(payload: ClaimQrPayload): ClaimQrPayload {
  const { network, contractId, claimId, serialHash } = payload;

  if (!["testnet", "mainnet", "futurenet", "local"].includes(network)) {
    throw new TypeError(`unsupported network "${network}"`);
  }
  if (!CONTRACT_ID_RE.test(contractId)) {
    throw new TypeError(`invalid Stellar contract id "${contractId}"`);
  }

  const claimText = String(claimId).trim();
  if (!/^\d+$/.test(claimText)) {
    throw new TypeError(
      `claim id must be a positive decimal integer, got "${claimId}"`,
    );
  }
  const claim = BigInt(claimText);
  if (claim <= 0n || claim > U64_MAX) {
    throw new RangeError("claim id must be between 1 and 2^64 - 1");
  }

  const hash = serialHash.trim().toLowerCase();
  if (!SERIAL_HASH_RE.test(hash)) {
    throw new TypeError(
      `serial hash must be 64 lowercase hex characters, got "${serialHash}"`,
    );
  }

  return {
    network,
    contractId,
    claimId: claim.toString(),
    serialHash: hash,
  };
}

function fnv1a32Hex(value: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
