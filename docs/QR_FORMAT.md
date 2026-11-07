# QR Format

A LOOPTAG tag carries enough information to find a claim and verify that a
scanned physical item matches it, without putting the raw serial number on the
tag.

## Payload

```text
looptag:v1:<network>:<contract-id>:<claim-id>:<serial-hash>:<checksum>
```

Example from the testnet demo:

```text
looptag:v1:testnet:CCTM224EKYEXNSULQBEW2HRG5CICUWWE46MLSRSASJZUQKXI5E5LK5GT:1:fa6ceb8d7a5cd1b8bc7c5959830c30704aad79dbe1ba90a794f04de6868712b1:097ff93a
```

| Field | Rule |
| --- | --- |
| `looptag` | fixed prefix |
| `v1` | format version; scanners must reject unknown versions |
| network | `testnet`, `mainnet`, `futurenet`, or `local` |
| contract-id | 56 characters, starts with `C`, base-32 alphabet |
| claim-id | decimal `u64`, `1 .. 2^64-1` |
| serial-hash | lowercase hex SHA-256, 64 characters |
| checksum | 8 lowercase hex characters, FNV-1a 32-bit over the first six fields |

## Checksum is not a security control

The checksum catches typos and truncated scans. It is **not** a signature and
does not prove authenticity. Anyone can construct a valid payload. The contract
is the authority: it checks the contract id, claim id, and serial hash on-chain.
Treat the QR as a pointer plus a typo check, not as a bearer token.

## Serial hashing

```text
serial_hash = SHA-256(UTF-8(serial))
```

The SDK exposes `hashSerial(serial)` and the demo manifest includes the hash for
serial `CUP-042`.

Why hash?

- The raw serial is not stored on-chain.
- A station can verify a physical item by reading its serial and hashing it.
- The contract stores a fixed 32-byte value.

Why this is not privacy:

- Low-entropy serials (for example, sequential cup numbers) can be enumerated
  from the hash.
- If serial privacy matters, use a random tag id or a per-merchant pepper and
  keep the pepper off-chain. Document the choice per deployment; the v0 contract
  accepts any 32-byte hash.

## Scanner algorithm

A station or wallet should:

1. Scan the QR payload and reject anything that is not `looptag:v1`.
2. Validate the checksum and the field formats locally (`decodeClaimQr`).
3. Fetch the claim from the contract (`get_claim`).
4. Compare `claim.serial_hash` with the payload hash.
5. Read the physical item's serial, hash it, and compare with the claim's hash.
6. Call `authorize_return(claim_id, station, serial_hash)` from the authorised
   station account.

Step 5 is the one the contract cannot do. Do not skip it; otherwise a copied tag
on the wrong item can pass the QR check.

## Why the claim id and contract id are both present

A deployment can have many contracts (testnet, mainnet, a new version). The
contract id tells the scanner where to look. The claim id is only unique within a
contract, so both are required.

## Why the network is present

Testnet and mainnet addresses use different network passphrases and different
contract ids. Including the network prevents a testnet tag from being submitted
to mainnet and vice versa. The contract itself does not read this field; the
client must enforce it.

## Versioning

A future `v2` could add a merchant id, an expiry hint, or a signature. Scanners
must reject unknown versions rather than guessing. The SDK's
`decodeClaimQr` throws on a version mismatch.
