# Contract API Reference & Event Catalog

This document is the complete reference for every public entry point, data type, error code, and Soroban event exposed by the LOOPTAG contract (`contracts/looptag/src/lib.rs`) and its TypeScript SDK (`packages/sdk/`).

For the step-by-step state machine and authorization invariants, see [LIFECYCLE.md](LIFECYCLE.md).

---

## Data Types

### `ClaimStatus` (`#[contracttype]`)

| Variant | Discriminant | Description |
| --- | --- | --- |
| `Active` | `0` | Deposit is locked in the contract and the claim can be transferred by its current owner. |
| `ReturnAuthorized` | `1` | An authorized return station has attested the physical return. Transfers are frozen. |
| `Redeemed` | `2` | The deposit has been paid out to the owner. Retained as a permanent audit record. |

### `Claim` (`#[contracttype]`)

| Field | Soroban Type | SDK Type (`packages/sdk`) | Description |
| --- | --- | --- | --- |
| `id` | `u64` | `u64` (`bigint`) | Monotonically increasing 1-based claim identifier. |
| `issuer` | `Address` | `string` | Registered merchant that locked the deposit. |
| `owner` | `Address` | `string` | Current holder entitled to transfer or receive the deposit refund. |
| `serial_hash` | `BytesN<32>` | `Buffer` | `SHA-256` digest of the physical item's serial or tag identifier. |
| `deposit` | `i128` | `i128` (`bigint`) | Deposit amount in the smallest unit of `deposit_token` (7 decimals / stroops for XLM). |
| `issued_at` | `u64` | `u64` (`bigint`) | Ledger timestamp (Unix seconds) when the claim was issued. |
| `expires_at` | `u64` | `u64` (`bigint`) | Optional overdue timestamp (`0` = no expiry; informational in v0). |
| `status` | `ClaimStatus` | `ClaimStatus` | Lifecycle status (`Active`, `ReturnAuthorized`, or `Redeemed`). |
| `return_station` | `Option<Address>` | `Option<string>` | Station address that attested the return (`None` while `Active`). |
| `returned_at` | `u64` | `u64` (`bigint`) | Ledger timestamp when return was attested (`0` while `Active`). |

### `Merchant` (`#[contracttype]`)

| Field | Soroban Type | SDK Type (`packages/sdk`) | Description |
| --- | --- | --- | --- |
| `address` | `Address` | `string` | Merchant account or contract address. |
| `name` | `String` | `string` | Human-readable merchant label. |
| `active` | `bool` | `boolean` | Whether the merchant may issue new claims and register stations. |
| `issued` | `u64` | `u64` (`bigint`) | Total claims issued by this merchant. |
| `redeemed` | `u64` | `u64` (`bigint`) | Total claims redeemed for this merchant. |
| `outstanding` | `i128` | `i128` (`bigint`) | Sum of deposits currently locked in `Active` or `ReturnAuthorized` claims. |

---

## State-Mutating Entry Points

### Summary Table

| Function | Arguments & Types | Auth Required | Returns | Errors | State Change | Event Emitted |
| --- | --- | --- | --- | --- | --- | --- |
| `initialize` | `admin: Address`, `deposit_token: Address` | `admin.require_auth()` | `Result<(), Error>` | `AlreadyInitialized` (1) | Sets instance `Admin`, `DepositToken`, `ClaimCount = 0`; extends instance TTL | `init` |
| `register_merchant` | `merchant: Address`, `name: String` | `admin.require_auth()` | `Result<(), Error>` | `NotInitialized` (2), `MerchantExists` (3) | Creates persistent `Merchant(merchant)` with `active = true`, counters `0`; extends TTL | `merchant_registered` |
| `set_merchant_active` | `merchant: Address`, `active: bool` | `admin.require_auth()` | `Result<(), Error>` | `NotInitialized` (2), `MerchantNotFound` (4) | Updates `Merchant(merchant).active = active`; extends persistent TTL | `merchant_status_changed` |
| `register_station` | `issuer: Address`, `station: Address` | `issuer.require_auth()` | `Result<(), Error>` | `MerchantNotFound` (4), `MerchantInactive` (5) | Sets persistent `Station(issuer, station) = true`; extends persistent TTL | `station_changed` |
| `remove_station` | `issuer: Address`, `station: Address` | `issuer.require_auth()` | `Result<(), Error>` | None | Removes persistent `Station(issuer, station)` | `station_changed` |
| `issue_claim` | `issuer: Address`, `owner: Address`, `serial_hash: BytesN<32>`, `deposit: i128`, `expires_at: u64` | `issuer.require_auth()` | `Result<u64, Error>` | `NotInitialized` (2), `MerchantNotFound` (4), `MerchantInactive` (5), `InvalidDeposit` (12), `InvalidExpiry` (13), `Overflow` (15) | Transfers `deposit` from `issuer` to contract; increments `ClaimCount`; stores `Claim(id)`; increments `merchant.issued` and `merchant.outstanding` | `claim_issued` |
| `transfer_claim` | `claim_id: u64`, `from: Address`, `to: Address` | `from.require_auth()` | `Result<(), Error>` | `ClaimNotFound` (7), `ClaimNotActive` (8), `NotClaimOwner` (10), `SameOwner` (14) | Updates `Claim(claim_id).owner = to`; extends persistent TTL | `claim_transferred` |
| `authorize_return` | `claim_id: u64`, `station: Address`, `serial_hash: BytesN<32>` | `station.require_auth()` | `Result<(), Error>` | `ClaimNotFound` (7), `ClaimNotActive` (8), `SerialMismatch` (11), `StationNotAuthorized` (6) | Sets `claim.status = ReturnAuthorized`, `return_station = Some(station)`, `returned_at = now`; extends TTL | `return_authorized` |
| `redeem` | `claim_id: u64` | None (permissionless) | `Result<(), Error>` | `NotInitialized` (2), `MerchantNotFound` (4), `ClaimNotFound` (7), `ClaimNotReturnAuthorized` (9), `Overflow` (15) | Sets `claim.status = Redeemed`; transfers `deposit` from contract to `claim.owner`; decrements `merchant.outstanding` and increments `merchant.redeemed` | `claim_redeemed` |

---

## Read-Only Views

| Function | Arguments & Types | Auth Required | Returns | Errors | State / TTL Side Effects | Event Emitted |
| --- | --- | --- | --- | --- | --- | --- |
| `get_admin` | *(none)* | None | `Result<Address, Error>` | `NotInitialized` (2) | None | None |
| `get_deposit_token` | *(none)* | None | `Result<Address, Error>` | `NotInitialized` (2) | None | None |
| `get_claim_count` | *(none)* | None | `u64` | None (returns `0` before initialization) | None | None |
| `get_claim` | `claim_id: u64` | None | `Result<Claim, Error>` | `ClaimNotFound` (7) | Extends persistent TTL of `Claim(claim_id)` | None |
| `get_merchant` | `merchant: Address` | None | `Result<Merchant, Error>` | `MerchantNotFound` (4) | Extends persistent TTL of `Merchant(merchant)` | None |
| `get_outstanding_liability` | `issuer: Address` | None | `Result<i128, Error>` | `MerchantNotFound` (4) | Extends persistent TTL of `Merchant(issuer)` | None |
| `is_station` | `issuer: Address`, `station: Address` | None | `bool` | None | None | None |

---

## Event Catalog

All contract events use `#[contractevent(data_format = "vec")]`. Topic `0` is the snake_case symbol matching the struct name, topic `1` is the indexed `#[topic]` field, and the event value is an `ScVal::Vec` containing the remaining fields in declaration order.

`decodeLooptagEvent(topics, value)` in [`packages/sdk/src/events.ts`](../packages/sdk/src/events.ts) decodes each event into the `LooptagEvent` discriminated union:

| Event Name (`topics[0]`) | Rust Struct | Indexed Topic (`topics[1]`) | Data Vector Fields (`value`) | SDK `LooptagEvent` Shape |
| --- | --- | --- | --- | --- |
| `init` | `Init` | `admin: Address` | `[deposit_token: Address]` | `{ type: "init", admin: string, depositToken: string }` |
| `merchant_registered` | `MerchantRegistered` | `merchant: Address` | `[name: String, active: bool]` | `{ type: "merchant_registered", merchant: string, name: string, active: boolean }` |
| `merchant_status_changed` | `MerchantStatusChanged` | `merchant: Address` | `[name: String, active: bool]` | `{ type: "merchant_status_changed", merchant: string, name: string, active: boolean }` |
| `station_changed` | `StationChanged` | `issuer: Address` | `[station: Address, authorized: bool]` | `{ type: "station_changed", issuer: string, station: string, authorized: boolean }` |
| `claim_issued` | `ClaimIssued` | `claim_id: u64` | `[issuer: Address, owner: Address, deposit: i128, serial_hash: BytesN<32>, expires_at: u64]` | `{ type: "claim_issued", claimId: string, issuer: string, owner: string, deposit: bigint, serialHash: string, expiresAt: number }` |
| `claim_transferred` | `ClaimTransferred` | `claim_id: u64` | `[from: Address, to: Address]` | `{ type: "claim_transferred", claimId: string, from: string, to: string }` |
| `return_authorized` | `ReturnAuthorized` | `claim_id: u64` | `[station: Address, returned_at: u64]` | `{ type: "return_authorized", claimId: string, station: string, returnedAt: number }` |
| `claim_redeemed` | `ClaimRedeemed` | `claim_id: u64` | `[owner: Address, deposit: i128]` | `{ type: "claim_redeemed", claimId: string, owner: string, deposit: bigint }` |

---

## Error Codes (`#[contracterror]`)

See also the lifecycle error summary in [LIFECYCLE.md](LIFECYCLE.md#error-reference).

| Code | Variant | Returned By | Meaning |
| --- | --- | --- | --- |
| `1` | `AlreadyInitialized` | `initialize` | Contract has already been initialized (`DataKey::Admin` exists). |
| `2` | `NotInitialized` | `register_merchant`, `set_merchant_active`, `issue_claim`, `redeem`, `get_admin`, `get_deposit_token` | Contract has not been initialized yet. |
| `3` | `MerchantExists` | `register_merchant` | Merchant address is already registered. |
| `4` | `MerchantNotFound` | `set_merchant_active`, `register_station`, `issue_claim`, `redeem`, `get_merchant`, `get_outstanding_liability` | Merchant address is not registered. |
| `5` | `MerchantInactive` | `register_station`, `issue_claim` | Merchant is currently suspended (`active == false`). |
| `6` | `StationNotAuthorized` | `authorize_return` | Station is not authorized for the claim's issuer. |
| `7` | `ClaimNotFound` | `transfer_claim`, `authorize_return`, `redeem`, `get_claim` | Claim ID does not exist in persistent storage. |
| `8` | `ClaimNotActive` | `transfer_claim`, `authorize_return` | Claim status is not `Active`. |
| `9` | `ClaimNotReturnAuthorized` | `redeem` | Claim status is not `ReturnAuthorized`. |
| `10` | `NotClaimOwner` | `transfer_claim` | `from` does not match the current `claim.owner`. |
| `11` | `SerialMismatch` | `authorize_return` | Provided `serial_hash` does not match `claim.serial_hash`. |
| `12` | `InvalidDeposit` | `issue_claim` | `deposit <= 0`. |
| `13` | `InvalidExpiry` | `issue_claim` | `expires_at != 0` and `expires_at <= env.ledger().timestamp()`. |
| `14` | `SameOwner` | `transfer_claim` | `from == to` (self-transfer is rejected). |
| `15` | `Overflow` | `issue_claim`, `redeem` | Checked arithmetic overflow or underflow on claim count or merchant liability counters. |

---

## Regenerating TypeScript Bindings

The generated contract client in [`packages/sdk/src/generated/index.ts`](../packages/sdk/src/generated/index.ts) is produced from the compiled Soroban contract spec and matches all 16 entry points, 8 event specs, and error codes `1–15` above.

After changing any public function signature, struct, event, or error in `contracts/looptag/src/lib.rs`, regenerate the TypeScript bindings following [DEPLOYMENT.md — Regenerate the TypeScript bindings](DEPLOYMENT.md#regenerate-the-typescript-bindings).
