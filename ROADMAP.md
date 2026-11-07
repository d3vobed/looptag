# Roadmap

LOOPTAG is deliberately small. The goal is a complete, testable loop rather than
a long list of half-built modules.

## v0 — shipped on testnet

- [x] Soroban contract with issuer-scoped merchant and station allowlists.
- [x] Deposit custody using a configurable SEP-41 token (native XLM SAC on testnet).
- [x] Transferable claims with a strict `Active → ReturnAuthorized → Redeemed`
      state machine.
- [x] Serial-hash attestation so a QR code from another item cannot close a claim.
- [x] Permissionless redemption to the current owner.
- [x] Merchant liability counters (`issued`, `redeemed`, `outstanding`).
- [x] Persistent-storage TTL bumping on every read/write.
- [x] 15 Rust unit tests covering auth, state transitions, accounting, and errors.
- [x] TypeScript SDK with exact amount handling, QR format, claim helpers, typed
      client, and event decoder.
- [x] 18 TypeScript tests.
- [x] Full testnet lifecycle with public transaction evidence.
- [x] Read-only demo dashboard and machine-readable deployment manifest.

## v1 — usable by a pilot merchant

- [ ] **Transaction helpers**: `issueClaim`, `transferClaim`, `authorizeReturn`,
      `redeem` in the SDK, including simulation and result parsing.
- [ ] **Indexer**: poll contract events, persist claims by owner/serial, expose a
      read-only HTTP API with cursor-based pagination.
- [ ] **Wallet demo**: connect Freighter / Stellar Wallets Kit, sign a transfer
      and a redemption against testnet.
- [ ] **Camera scanner**: scan the `looptag:v1` QR payload and resolve the claim.
- [ ] **Merchant dashboard**: issued/redeemed/outstanding liability, export CSV.
- [ ] **Station tool**: look up a claim by QR, verify the serial, submit
      `authorize_return`.
- [ ] **Rust integration tests**: multi-merchant accounting, station revocation,
      many-claim invariant checks.
- [ ] **CI hardening**: contract size budget, docs link check, deployment manifest
      validation.
- [ ] **Pilot runbook**: key management, merchant onboarding, return-station
      checklist, incident response.

## v2 — production hardening

- [ ] Independent security review of the contract and trust model.
- [ ] Multi-asset deposits with per-asset liability accounting.
- [ ] Station staking or bonded attestations to price collusion risk.
- [ ] Expiry policy: explicit forfeiture, grace periods, and a customer
      notification path. Never silently seize deposits.
- [ ] Upgrade/migration design with timelock and storage layout review.
- [ ] Two-step admin rotation and optional multisig admin.
- [ ] Privacy analysis for serial hashes and ownership graphs.
- [ ] Mainnet deployment checklist and incident drills.

## Explicitly out of scope

- A custodial wallet.
- A fiat on/off-ramp.
- An NFT marketplace for used cups.
- Any feature that requires the contract to verify physical reality without a
  named attestor.
