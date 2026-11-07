# Deployment

The canonical testnet deployment is recorded in
[`deployments/testnet.json`](../deployments/testnet.json). This page explains how
to reproduce it, verify it, and update the manifest.

> **Never commit secret keys.** The scripts use names from your local Stellar CLI
> config. The repository only contains public addresses and transaction hashes.

## Prerequisites

- Stellar CLI 27+
- Rust stable with the `wasm32v1-none` target
- Node.js 22+ and pnpm 10+
- Funded testnet identities. For the demo: `admin`, `alice`, `bob`, `station`.

Create and fund identities (testnet only):

```bash
stellar keys generate admin --network testnet --fund
stellar keys generate alice --network testnet --fund
stellar keys generate bob   --network testnet --fund
stellar keys generate station --network testnet --fund
```

Use a dedicated config directory if you do not want to touch your default
identities:

```bash
export STELLAR_CONFIG_DIR="$PWD/.stellar-local"
stellar keys generate admin --network testnet --fund --config-dir "$STELLAR_CONFIG_DIR"
```

`.stellar-local` and `.stellar` are ignored by git.

## Build

```bash
cd contracts
stellar contract build
sha256sum target/wasm32v1-none/release/looptag.wasm
```

The SHA-256 of the WASM is the on-chain WASM hash. For the canonical deployment:

```text
dd4eeb3d6f27857e7ac2be2f99c1c94600c6718b6e521fdc4ee833b6de871a0f
```

If your local build produces a different hash, confirm the toolchain and commit
before deploying. Soroban builds are deterministic for a fixed toolchain, but
the Rust version, SDK version, and profile all matter.

## Deploy and initialize

The scripted path:

```bash
export STELLAR_CONFIG_DIR="$HOME/.config/stellar"
export ADMIN=admin STATION=station
./scripts/deploy-testnet.sh
```

The script:

1. Builds the contract.
2. Deploys the WASM under the alias `looptag`.
3. Reads the native XLM SAC id with `stellar contract id asset --asset native`.
4. Calls `initialize(admin, deposit_token)`.
5. Calls `register_merchant(admin, "Circular Cafe")`.
6. Calls `register_station(admin, station)`.

It prints the new contract id and the addresses. Copy them into a new manifest.

Manual equivalent:

```bash
stellar contract deploy \
  --wasm contracts/target/wasm32v1-none/release/looptag.wasm \
  --source-account admin \
  --network testnet

stellar contract invoke --id <CONTRACT_ID> --source-account admin --network testnet -- \
  initialize --admin <ADMIN_ADDRESS> --deposit_token <XLM_SAC>

stellar contract invoke --id <CONTRACT_ID> --source-account admin --network testnet -- \
  register_merchant --merchant <ADMIN_ADDRESS> --name "Circular Cafe"

stellar contract invoke --id <CONTRACT_ID> --source-account admin --network testnet -- \
  register_station --issuer <ADMIN_ADDRESS> --station <STATION_ADDRESS>
```

## Run the lifecycle

```bash
export ADMIN=admin ALICE=alice BOB=bob STATION=station
export SERIAL=CUP-042 DEPOSIT=20000000
./scripts/demo-testnet.sh
```

The script issues a claim to Alice, transfers it to Bob, has the station attest
the return, redeems to Bob, and prints the final claim and liability.

## Manifest schema

`deployments/testnet.json` is machine-readable so the demo, docs, and checks all
agree:

```jsonc
{
  "network": "testnet",
  "contractId": "C...",
  "wasmHash": "64 hex chars",
  "wasmSizeBytes": 14817,
  "depositToken": { "code": "XLM", "contractId": "C...", "decimals": 7 },
  "demo": {
    "claimId": "1",
    "serial": "CUP-042",
    "serialHash": "64 hex chars",
    "depositStroops": "20000000",
    "issuer": "G...",
    "originalOwner": "G...",
    "finalOwner": "G...",
    "returnStation": "G...",
    "issuedAt": "2026-11-07T23:13:37Z",
    "returnedAt": "2026-11-07T23:14:12Z",
    "finalStatus": "Redeemed"
  },
  "transactions": {
    "deployContract": "64 hex chars",
    "initialize": "64 hex chars",
    "registerMerchant": "64 hex chars",
    "registerStation": "64 hex chars",
    "issueClaim": "64 hex chars",
    "transferClaim": "64 hex chars",
    "authorizeReturn": "64 hex chars",
    "redeem": "64 hex chars"
  }
}
```

Validate it:

```bash
pnpm check:deployments
```

The check verifies contract ids, transaction hashes, required demo fields, and
the wasm hash format. It does **not** contact the network; use Stellar Expert or
the commands below for that.

## Verify on-chain state

```bash
stellar contract invoke --id <CONTRACT_ID> --network testnet -- get_claim --claim_id 1
stellar contract invoke --id <CONTRACT_ID> --network testnet -- get_merchant --merchant <ISSUER>
stellar contract invoke --id <CONTRACT_ID> --network testnet -- get_outstanding_liability --issuer <ISSUER>
```

The canonical final state is:

```json
{
  "status": "Redeemed",
  "owner": "GCQK5S33PEWHTJQYSJFVKCWSCDF73XQEDH4GPD3UDCCPZWP7TNKP4ACT",
  "deposit": "20000000",
  "merchantOutstanding": "0",
  "merchantIssued": "1",
  "merchantRedeemed": "1"
}
```

## Regenerate the TypeScript bindings

After a contract interface change:

```bash
stellar contract bindings typescript \
  --contract-id <CONTRACT_ID> \
  --network testnet \
  --output-dir /tmp/looptag-bindings \
  --overwrite

cp /tmp/looptag-bindings/src/index.ts packages/sdk/src/generated/index.ts
pnpm --filter @looptag/sdk build
pnpm --filter @looptag/sdk test
```

Review the diff: the generated `networks.testnet.contractId` should point at the
deployed contract, and any new methods should have SDK tests.

## Regenerate the demo QR

```bash
pnpm --filter @looptag/sdk build
node scripts/generate-demo-qr.mjs
```

This writes `demo/claim-qr.svg` and `demo/claim-qr.txt` from
`deployments/testnet.json`.

## Updating the deployment

1. Deploy a new contract.
2. Run the lifecycle.
3. Update every field in `deployments/testnet.json`.
4. Regenerate the QR and the demo.
5. Run `pnpm check:all`.
6. Update [TESTNET_EVIDENCE.md](TESTNET_EVIDENCE.md) with the new transaction
   links.

Do not silently reuse an old contract id. The manifest is the source of truth for
the demo and the SDK.
