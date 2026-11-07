# Trust Model

LOOPTAG does not verify the physical world. It verifies signatures and state
transitions. This page states exactly what the contract guarantees, what it
delegates, and who can hurt whom.

## What the contract guarantees

Given a correctly behaving SEP-41 deposit token:

1. **Deposit custody is deterministic.** A claim can only be issued after the
   deposit is transferred into the contract, and the recorded `deposit` equals
   the amount transferred in that call.
2. **Only the current owner can redirect ownership.** `transfer_claim` requires
   the `from` address's signature and checks it against the stored owner.
3. **Ownership freezes on return attestation.** After `authorize_return`, no
   transfer can succeed. The refund therefore belongs to the owner at the moment
   the station attested the return.
4. **Only an authorised station can attest.** The station must be on the issuer's
   allowlist, and the submitted serial hash must match the claim.
5. **Redemption is permissionless but not redirectable.** Anyone can call
   `redeem`; the contract pays `claim.owner`, not the caller.
6. **Double redemption is impossible.** The claim is marked `Redeemed` before the
   token transfer, and `redeem` requires `ReturnAuthorized`.
7. **Suspension cannot strand funds.** A suspended merchant cannot issue new
   claims, but existing claims remain transferable and redeemable.
8. **Liability is tracked.** `Merchant.outstanding` is increased on issuance and
   decreased on redemption in the same transaction as the token movement.

## What the contract delegates

### Physical return verification → the station

The contract cannot see a cup. A station attests that it physically received the
item and that the serial matches. The security of the deposit therefore depends
on the issuer choosing honest stations and on customers trusting that choice.

A malicious station can:

- Attest a return for an item that was never returned, releasing the deposit to
  the current owner (usually the attacker).
- Refuse to attest a genuine return, leaving the deposit locked.

The second is a liveness failure; the first is a collusion/theft risk. The
issuer's reputation and station policy are the mitigation in v0. Bonded
attestations and station staking are future work (see [ROADMAP.md](../ROADMAP.md)).

### Asset behaviour → the SEP-41 token

The contract assumes the deposit token:

- Transfers the exact amount or reverts.
- Does not re-enter `redeem` in a way that bypasses the status change.
- Does not silently mint or burn balances.

The checks-effects-interactions ordering protects against re-entrancy, but a
malicious token contract is still a trusted dependency. Deployers should use a
reviewed asset, such as the native XLM SAC or a regulated stablecoin.

### Merchant solvency → the merchant

The merchant locks the full deposit at issuance, so the contract is fully
collateralised for that claim. The merchant cannot withdraw a deposit while the
claim is outstanding. However, the merchant can:

- Refuse to issue new claims.
- Suspend operations.
- Choose bad stations.

It cannot take back an existing deposit through the contract.

### Admin behaviour → the admin key

The admin can register merchants and stations and suspend merchants. The admin
**cannot**:

- Transfer a claim.
- Attest a return.
- Redeem a claim to itself.
- Withdraw deposits.

A compromised admin can grief issuance and station selection, but cannot directly
steal locked deposits. Admin key compromise is still serious and should be
handled with a multisig before mainnet.

## Who bears which risk

| Risk | Bearer | Mitigation |
| --- | --- | --- |
| Item not actually returned but attested | Issuer / current owner | station selection, reputation, future bonding |
| Genuine return refused | Customer | issuer policy, multiple stations, dispute process |
| Lost owner key | Customer | wallet hygiene; future recovery/expiry policy |
| Merchant goes offline after issuance | Customer | deposit is already locked; redemption is permissionless |
| Admin key compromise | All users | multisig, key rotation (v2) |
| Malicious SEP-41 token | Deployer | use reviewed assets |
| QR tag copied to another item | Issuer/customer | serial hash must match the physical item |
| Low-entropy serial guessed | Privacy | random tag ids or peppered hashes |

## Trust boundaries in one sentence

> The contract makes the money rules auditable; the issuer and its stations are
> trusted for the physical facts; the customer is trusted to protect their key.

## Non-claims

LOOPTAG does **not** claim to be:

- A trustless proof of physical return.
- A privacy system.
- A guarantee that a merchant will stay in business.
- A substitute for a legal deposit scheme or consumer-protection regime.
- Audited or mainnet-ready.
