# @looptag/sdk

TypeScript SDK for the LOOPTAG deposit-claim protocol on Stellar.

```bash
pnpm add @looptag/sdk
```

```ts
import {
  createClient,
  encodeClaimQr,
  decodeClaimQr,
  toStroops,
  fromStroops,
} from "@looptag/sdk";

const client = createClient({
  contractId: "CCTM224EKYEXNSULQBEW2HRG5CICUWWE46MLSRSASJZUQKXI5E5LK5GT",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
});

const payload = encodeClaimQr({
  network: "testnet",
  contractId: client.options.contractId,
  claimId: "1",
  serialHash: "fa6ceb8d7a5cd1b8bc7c5959830c30704aad79dbe1ba90a794f04de6868712b1",
});

decodeClaimQr(payload); // validates the checksum
toStroops("2"); // 20000000n
fromStroops(20_000_000n); // "2"
```

## Modules

- `amount` — exact decimal ↔ base-unit conversion, no floating-point money.
- `qr` — versioned QR payloads, serial hashing, checksum validation.
- `claim` — status labels, transfer/redeem/overdue predicates, summaries.
- `client` — typed generated client plus Stellar Expert URL helpers.
- `events` — decode contract events into a discriminated union.

## Development

```bash
pnpm install
pnpm --filter @looptag/sdk build
pnpm --filter @looptag/sdk test
pnpm --filter @looptag/sdk typecheck
```

The package is testnet software and has not been audited. See the repository
root `SECURITY.md` before using it with real value.
