# Threat Model

Scope: the v0 Soroban contract, the TypeScript SDK, the deployment scripts, and
the read-only demo. Testnet only; no real-value guarantees.

## Assets

| Asset | Why it matters |
| --- | --- |
| Locked deposits | Customer money held by the contract |
| Claim ownership | Right to receive a deposit |
| Merchant liability counters | Accounting and audit trail |
| Admin key | Can register/suspend merchants and stations |
| Station key | Can attest physical returns |
| Owner key | Can transfer a claim and receive a refund |
| Serial hash | Binds a claim to a physical item |
| Deployment manifest | Public evidence; must not contain secrets |

## Adversaries

1. **Malicious customer** — wants a refund without returning the item, or wants
   to transfer a claim after a return.
2. **Malicious merchant** — wants to issue unbacked claims, avoid refunds, or
   redirect deposits.
3. **Malicious station** — wants to attest false returns or block genuine ones.
4. **Relayer / MEV searcher** — can order or trigger public calls.
5. **Compromised admin** — can change allowlists and suspend merchants.
6. **Compromised owner key** — attacker can transfer/redeem the claim.
7. **Malicious token** — a SEP-41 asset with non-standard transfer behaviour.
8. **Accidental operator** — commits a secret, deploys the wrong contract, or
   loses a key.

## STRIDE summary

| Category | Threat | v0 control | Residual risk |
| --- | --- | --- | --- |
| Spoofing | Caller pretends to be claim owner | `from.require_auth()` + owner check | Stolen owner key |
| Spoofing | Caller pretends to be station | `station.require_auth()` + issuer allowlist | Colluding station |
| Tampering | Change claim owner without transfer | Atomic storage write + auth | Storage bug (covered by tests) |
| Tampering | Change merchant liability | Only contract writes counters | Bug in accounting path |
| Repudiation | Merchant denies issuing a claim | `claim_issued` event + on-chain claim | None for on-chain facts |
| Information disclosure | Serial number leaks | Only SHA-256 hash stored | Low-entropy serial brute force |
| Denial of service | Station never attests | Issuer can add other stations | Customer still depends on issuer policy |
| Denial of service | Merchant suspended | Existing claims remain redeemable | New issuance stops |
| Elevation of privilege | Admin redeems to itself | `redeem` pays `claim.owner` only | Admin can still grief allowlists |
| Elevation of privilege | Station redirects refund | Transfers frozen after attestation | Station can collude before attestation |

## Attack scenarios

### 1. Transfer after return

**Attempt:** Owner sees a return attestation and transfers the claim to a
friend before redemption, hoping the friend receives the deposit.

**Result:** `transfer_claim` checks `status == Active`. `authorize_return` sets
`ReturnAuthorized`, so the transfer fails with `ClaimNotActive`. The owner at
attestation time receives the deposit.

### 2. Double redemption / re-entrancy

**Attempt:** A malicious token re-enters `redeem` during `transfer`.

**Result:** `redeem` sets `status = Redeemed` and writes it before calling the
token. The re-entrant call sees `ClaimNotReturnAuthorized`. The second outer call
also fails. The token still must not mint arbitrary balances, which is why the
asset is a trusted dependency.

### 3. Fake serial / QR from another item

**Attempt:** Station scans a QR tag from item A but submits it for claim B.

**Result:** `authorize_return` compares the submitted hash with
`claim.serial_hash`. Different item → `SerialMismatch`. The station must read the
item's serial, not just the tag, for this to be meaningful.

### 4. Unauthorised station

**Attempt:** Attacker registers itself as a station or attests a return.

**Result:** `register_station` requires the issuer's auth. `authorize_return`
checks `Station(claim.issuer, station)`. An attacker cannot add itself for
another issuer. A compromised issuer key can, which is why issuer key management
matters.

### 5. Merchant suspends to avoid refunds

**Attempt:** Merchant calls `set_merchant_active(false)` after issuing claims.

**Result:** New issuance is blocked, but existing claims remain transferable and
redeemable. `redeem` does not check merchant `active`. The deposit is already in
the contract, so suspension cannot strand it.

### 6. Unbacked claim issuance

**Attempt:** Merchant calls `issue_claim` without enough token balance.

**Result:** The token transfer reverts, so no claim is created. The claim id is
allocated after the transfer, so a failed transfer does not consume an id.

### 7. Redirect redemption via front-running

**Attempt:** Relayer sees `authorize_return` in the mempool and tries to redeem
to itself.

**Result:** `redeem` ignores the caller and pays `claim.owner`. Front-running only
changes who pays the fee, not who receives the deposit.

### 8. Admin key compromise

**Attempt:** Attacker registers a malicious merchant/station or suspends an
honest merchant.

**Result:** The attacker can grief issuance and station selection, but cannot
move an existing deposit to itself. It can collude with a station to attest false
returns for claims it owns. Multisig admin and station bonding are v2 work.

### 9. Owner key loss

**Attempt/accident:** Customer loses the wallet key.

**Result:** The deposit remains locked. There is no recovery path in v0. This is
a deliberate limitation: an admin recovery path would be a custody backdoor.
Expiry/forfeiture policy must be designed carefully and is future work.

### 10. Serial hash brute force

**Attempt:** Attacker sees a serial hash on-chain and tries to recover the serial.

**Result:** SHA-256 is preimage-resistant, but a serial like `CUP-042` has low
entropy. An attacker can enumerate common serials. Mitigation: use random tag ids
or a per-merchant pepper, and document the privacy limitation. The hash is a
binding commitment, not a privacy guarantee.

### 11. Storage expiry

**Attempt:** Wait until persistent entries expire, then interact with a stale
claim.

**Result:** Every read/write calls `extend_ttl` for claims, merchants, and
stations. Instance storage is bumped on initialization and merchant/station
writes. A long period with no interactions can still let entries expire; a
keeper/notification service is future work.

### 12. Secret leakage in the repository

**Attempt/accident:** Commit `.env`, a Stellar secret key, or local CLI state.

**Result:** `.gitignore` excludes local secrets and build output;
`pnpm check:hygiene` scans tracked files for token/key patterns. CI runs the
check. This is a safety net, not a substitute for key hygiene.

## Security invariants to test

- `outstanding == Σ deposit(Active | ReturnAuthorized)` for each merchant.
- Contract token balance ≥ Σ outstanding across merchants.
- No transfer succeeds after `ReturnAuthorized`.
- No redeem succeeds before `ReturnAuthorized`.
- No redeem succeeds twice.
- No serial mismatch succeeds.
- No unauthorised station succeeds.
- A suspended merchant cannot issue, but can still have claims redeemed.

These are the first candidates for property-based and multi-actor integration
tests in the issue backlog.
