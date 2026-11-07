# Testnet Evidence

This page records the canonical LOOPTAG testnet deployment and the full
issue → transfer → return → redeem lifecycle. Every transaction is public and
linked to Stellar Expert.

## Deployment

| Field | Value |
| --- | --- |
| Network | Stellar testnet |
| Contract id | [`CCTM224EKYEXNSULQBEW2HRG5CICUWWE46MLSRSASJZUQKXI5E5LK5GT`](https://stellar.expert/explorer/testnet/contract/CCTM224EKYEXNSULQBEW2HRG5CICUWWE46MLSRSASJZUQKXI5E5LK5GT) |
| WASM hash | `dd4eeb3d6f27857e7ac2be2f99c1c94600c6718b6e521fdc4ee833b6de871a0f` |
| WASM size | 14,817 bytes |
| Deposit asset | Native XLM SAC [`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |
| Admin / issuer | [`GDI6UIHJGRSHN4FF6FWXUWSVQYYAV2BBH734S3LCYCQQCWYWLLEQ2UXJ`](https://stellar.expert/explorer/testnet/account/GDI6UIHJGRSHN4FF6FWXUWSVQYYAV2BBH734S3LCYCQQCWYWLLEQ2UXJ) |
| Original owner (Alice) | [`GANINHD7GYIUIYH7WTGQ25TZ3BMEJG5JIW6JIJNVOB7PQPWABVW5LQJP`](https://stellar.expert/explorer/testnet/account/GANINHD7GYIUIYH7WTGQ25TZ3BMEJG5JIW6JIJNVOB7PQPWABVW5LQJP) |
| Final owner (Bob) | [`GCQK5S33PEWHTJQYSJFVKCWSCDF73XQEDH4GPD3UDCCPZWP7TNKP4ACT`](https://stellar.expert/explorer/testnet/account/GCQK5S33PEWHTJQYSJFVKCWSCDF73XQEDH4GPD3UDCCPZWP7TNKP4ACT) |
| Return station | [`GDSROSZJFCNGBLFFY3NKMKKC5CMCOXTCAYTL7DFZMRT2P5NF4J4RVBWH`](https://stellar.expert/explorer/testnet/account/GDSROSZJFCNGBLFFY3NKMKKC5CMCOXTCAYTL7DFZMRT2P5NF4J4RVBWH) |

The machine-readable version is in
[`deployments/testnet.json`](../deployments/testnet.json).

## Transaction trail

| Step | Transaction | Result |
| --- | --- | --- |
| Upload WASM | [`da78b492…237fda`](https://stellar.expert/explorer/testnet/tx/da78b492e416ac42f8397062241ab77441d14eec4cd07f0cc88f8b2b1c237fda) | WASM installed |
| Deploy contract | [`fd878f5a…327706`](https://stellar.expert/explorer/testnet/tx/fd878f5a73e9d9a0af4e9869e699f36b13f9cef9cf4978a97c5fe8f711327706) | Contract created |
| `initialize` | [`20de6a93…67412e`](https://stellar.expert/explorer/testnet/tx/20de6a93cc5086a697a333722eed90d456a5875129c90765b2f90d641067412e) | Admin + XLM SAC set |
| `register_merchant` | [`67bfb2ce…8f20d4`](https://stellar.expert/explorer/testnet/tx/67bfb2ce0326d2867ffddee7a1e3e41eb1996286b0863c3e6582cb658f8f20d4) | `Circular Cafe` registered |
| `register_station` | [`72132b38…e8186`](https://stellar.expert/explorer/testnet/tx/72132b38c7d85a0e55be9ed1308d7a9109ba4e66b034aac2d2bbbcbbe22e8186) | Station authorised |
| `issue_claim` | [`1c085011…ec4ad`](https://stellar.expert/explorer/testnet/tx/1c0850116da732caafee8be89ed4424d9dbbf1942d56e1de4ab7220bf7aec4ad) | Claim #1, 2 XLM, owner Alice |
| `transfer_claim` | [`0101956d…ac977`](https://stellar.expert/explorer/testnet/tx/0101956d7fa09fd65344a0b6fe9df89f569f251322f5585ac6cb8bde314ac977) | Alice → Bob |
| `authorize_return` | [`60e7794d…f1cc4`](https://stellar.expert/explorer/testnet/tx/60e7794de5b1cb6f1a0a8fa938d9795254c3f6b32fdab1d719694709d0ff1cc4) | Station attests `CUP-042` |
| `redeem` | [`800b8187…d476`](https://stellar.expert/explorer/testnet/tx/800b81872be058d4aaab8de70a07e232d6b26ad06e0ccc11288e3e9f2490d476) | 2 XLM paid to Bob |

## Lifecycle facts

| Field | Value |
| --- | --- |
| Claim id | `1` |
| Serial | `CUP-042` |
| Serial hash | `fa6ceb8d7a5cd1b8bc7c5959830c30704aad79dbe1ba90a794f04de6868712b1` |
| Deposit | `20000000` stroops = 2 XLM |
| Issued at | `2026-11-07T23:13:37Z` (ledger timestamp `1794093217`) |
| Return attested at | `2026-11-07T23:14:12Z` (ledger timestamp `1794093252`) |
| Final status | `Redeemed` (`ClaimStatus = 2`) |
| Final owner | Bob |
| Merchant outstanding | `0` |
| Merchant issued / redeemed | `1 / 1` |
| Bob balance after redeem | `100040000000` stroops (includes the 2 XLM refund) |

## Final contract reads

`get_claim(1)`:

```json
{
  "deposit": "20000000",
  "expires_at": 0,
  "id": 1,
  "issued_at": 1794093217,
  "issuer": "GDI6UIHJGRSHN4FF6FWXUWSVQYYAV2BBH734S3LCYCQQCWYWLLEQ2UXJ",
  "owner": "GCQK5S33PEWHTJQYSJFVKCWSCDF73XQEDH4GPD3UDCCPZWP7TNKP4ACT",
  "return_station": "GDSROSZJFCNGBLFFY3NKMKKC5CMCOXTCAYTL7DFZMRT2P5NF4J4RVBWH",
  "returned_at": 1794093252,
  "serial_hash": "fa6ceb8d7a5cd1b8bc7c5959830c30704aad79dbe1ba90a794f04de6868712b1",
  "status": 2
}
```

`get_merchant(issuer)`:

```json
{
  "active": true,
  "address": "GDI6UIHJGRSHN4FF6FWXUWSVQYYAV2BBH734S3LCYCQQCWYWLLEQ2UXJ",
  "issued": 1,
  "name": "Circular Cafe",
  "outstanding": "0",
  "redeemed": 1
}
```

## Event sequence

The contract emitted the following typed events (abridged):

```text
init              admin=GDI6…UXJ  deposit_token=CDLZ…YSC
merchant_registered  merchant=GDI6…UXJ  name="Circular Cafe"  active=true
station_changed   issuer=GDI6…UXJ  station=GDSR…BWH  authorized=true
claim_issued      claim_id=1  issuer=GDI6…UXJ  owner=GANI…QJP  deposit=20000000  serial_hash=fa6c…12b1
claim_transferred claim_id=1  from=GANI…QJP  to=GCQK…ACT
return_authorized claim_id=1  station=GDSR…BWH  returned_at=1794093252
claim_redeemed    claim_id=1  owner=GCQK…ACT  deposit=20000000
```

The XLM SAC also emitted its standard `transfer` events for the deposit in and
the refund out.

## Reproduce

With the canonical testnet identities in your local Stellar config:

```bash
export STELLAR_CONFIG_DIR="$HOME/.config/stellar"
export ADMIN=admin ALICE=alice BOB=bob STATION=station
export CONTRACT_ID=CCTM224EKYEXNSULQBEW2HRG5CICUWWE46MLSRSASJZUQKXI5E5LK5GT
./scripts/demo-testnet.sh
```

That script creates a **new** claim id and new transactions. The table above is
the original evidence, not a live query.

## What this proves

- The contract deploys and initializes with the native XLM SAC.
- A merchant can register and authorize a station.
- A real 2 XLM deposit is pulled into the contract.
- Ownership can move without touching the deposit.
- A return attestation freezes ownership and enables redemption.
- Redemption pays the current owner and decrements the merchant's liability to
  zero.
- Events are emitted in the expected order.

## What this does not prove

- That any of this is safe for real money. There is no audit.
- That the station actually received the cup. This is a testnet simulation.
- That the serial hash is private. `CUP-042` is low entropy.
- That the contract survives adversarial tokens, storage expiry over months, or a
  compromised admin key. See [THREAT_MODEL.md](THREAT_MODEL.md).
