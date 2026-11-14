# Lifecycle

This document is the normative description of a LOOPTAG claim. The Rust
implementation in `contracts/looptag/src/lib.rs` is the source of truth; this
page explains the intended sequence and the authorisation rules. For a table of
every public entry point, return type, and event payload, see [API.md](API.md).

## Actors

| Actor | Role |
| --- | --- |
| Admin | registers merchants, suspends merchants, manages the issuer allowlist |
| Merchant / issuer | locks the deposit, defines its return stations, issues claims |
| Customer / owner | holds the claim, can transfer it while active, receives the refund |
| Return station | attests that a specific physical item was returned |
| Relayer | anyone; may call `redeem` after a return has been attested |

A merchant and an issuer are the same address in v0. The contract stores one
`Merchant` record per issuer.

## Step 0 — deployment setup

```text
initialize(admin, deposit_token)
  → stores Admin, DepositToken, ClaimCount = 0
  → event: init(admin, deposit_token)
```

`initialize` can only be called once. It requires the admin's signature. The
deposit token is a SEP-41 contract address; the testnet deployment uses the
native XLM SAC.

```text
register_merchant(merchant, name)        [admin auth]
  → Merchant { active: true, issued: 0, redeemed: 0, outstanding: 0 }

register_station(issuer, station)        [issuer auth]
  → Station(issuer, station) = true
```

A station is scoped to one issuer. The issuer is the party accepting the
returned item, so it decides which stations it trusts. Revoking a station does
not invalidate returns that were already attested.

## Step 1 — issue a claim

```text
issue_claim(issuer, owner, serial_hash, deposit, expires_at)   [issuer auth]
  → deposit > 0
  → expires_at == 0 or expires_at > now
  → merchant exists and is active
  → token.transfer(issuer, contract, deposit)
  → Claim {
      id: next id,
      owner,
      status: Active,
      serial_hash,
      deposit,
      issued_at: now,
      expires_at,
      return_station: None,
      returned_at: 0,
    }
  → merchant.issued += 1
  → merchant.outstanding += deposit
  → event: claim_issued(id, issuer, owner, deposit, serial_hash, expires_at)
```

The serial hash is `SHA-256(serial)`. The raw serial is not stored on-chain. The
issuer is responsible for printing a QR tag that binds the claim id, contract,
network, and serial hash. See [QR_FORMAT.md](QR_FORMAT.md).

## Step 2 — transfer the claim

```text
transfer_claim(claim_id, from, to)       [from auth]
  → claim.status == Active
  → claim.owner == from
  → from != to
  → claim.owner = to
  → event: claim_transferred(id, from, to)
```

Transfers are free and do not touch the deposit. This is what makes the claim
useful: a friend can return the cup, or the claim can be sold with the cup.

Transfers are frozen once a return has been attested. This is the key safety
property: a station cannot attest a return and then have someone redirect the
refund by transferring the claim.

## Step 3 — attest the return

```text
authorize_return(claim_id, station, serial_hash)   [station auth]
  → claim.status == Active
  → claim.serial_hash == serial_hash
  → Station(claim.issuer, station) == true
  → claim.status = ReturnAuthorized
  → claim.return_station = Some(station)
  → claim.returned_at = now
  → event: return_authorized(id, station, returned_at)
```

The station must scan the physical item, read its serial, hash it, and submit the
hash. A QR tag from a different item will not match. A station that is not on the
issuer's allowlist is rejected.

`authorize_return` is idempotent in the sense that a second call fails with
`ClaimNotActive`; it does not silently re-attest.

## Step 4 — redeem the deposit

```text
redeem(claim_id)                         [no auth required]
  → claim.status == ReturnAuthorized
  → claim.status = Redeemed                 (effects before interaction)
  → token.transfer(contract, claim.owner, claim.deposit)
  → merchant.outstanding -= claim.deposit
  → merchant.redeemed += 1
  → event: claim_redeemed(id, owner, deposit)
```

Redemption is permissionless. Anyone can pay the network fee to trigger it, but
the contract can only pay the current owner. This prevents a station, relayer, or
merchant from redirecting the refund after attestation.

The claim record is kept forever as an audit trail. The deposit is gone, but the
history remains queryable.

## Error reference

| Code | Name | Meaning |
| --- | --- | --- |
| 1 | `AlreadyInitialized` | `initialize` called twice |
| 2 | `NotInitialized` | setup has not run |
| 3 | `MerchantExists` | address already registered |
| 4 | `MerchantNotFound` | address is not a merchant |
| 5 | `MerchantInactive` | merchant is suspended |
| 6 | `StationNotAuthorized` | station is not on the issuer's allowlist |
| 7 | `ClaimNotFound` | claim id does not exist |
| 8 | `ClaimNotActive` | transfer or return on a non-active claim |
| 9 | `ClaimNotReturnAuthorized` | redeem before a return attestation |
| 10 | `NotClaimOwner` | `from` is not the current owner |
| 11 | `SerialMismatch` | scanned serial hash does not match the claim |
| 12 | `InvalidDeposit` | deposit is zero or negative |
| 13 | `InvalidExpiry` | expiry is in the past |
| 14 | `SameOwner` | transfer to the current owner |
| 15 | `Overflow` | counter or liability overflow |

## Invariants

1. A claim moves only forward: `Active → ReturnAuthorized → Redeemed`.
2. Only the current owner can transfer, and only while `Active`.
3. Only an authorised station can attest, and only with the claim's serial hash.
4. Redemption pays the owner at redemption time, never the station or relayer.
5. `Merchant.outstanding` equals the sum of deposits for claims in `Active` or
   `ReturnAuthorized` for that merchant.
6. A suspended merchant cannot issue new claims, but existing claims remain
   transferable and redeemable.
7. The contract never holds more of the deposit token than the sum of all
   outstanding liabilities (assuming the token behaves normally).

Invariant 5 and 7 are exercised by the unit tests and should be extended with
property tests as described in the issue backlog.
