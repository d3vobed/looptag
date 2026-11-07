# Security Policy

LOOPTAG is testnet software. It has not been audited and must not be used to
custody real funds without an independent review.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for an exploitable finding.

Send a private report to the repository maintainer with:

- A description of the issue and the affected contract function or SDK module.
- A minimal reproduction (test, script, or transaction sequence).
- The impact: lost funds, stuck funds, unauthorised transfer, denial of service,
  or privacy leak.
- Any suggested mitigation.

If GitHub private vulnerability reporting is enabled on the repository, use
**Security → Report a vulnerability**. Otherwise contact the maintainer directly.
You should receive an acknowledgement within 72 hours.

## Scope

In scope:

- `contracts/looptag` — authorisation, custody, accounting, state transitions,
  serial-hash checks, storage TTL behaviour.
- `packages/sdk` — amount parsing, QR validation, event decoding, transaction
  construction once implemented.
- `scripts/` — deployment and demo scripts that handle keys or network calls.

Out of scope for v0:

- The physical return process itself. The contract trusts an authorised station.
- The read-only demo dashboard's visual design.
- Stellar testnet instability or RPC outages.
- Issues that require a compromised admin or station key, unless the design
  makes that compromise catastrophically uncontainable.

## Known limitations

- **Trusted stations.** A colluding station can attest a return for an item that
  was not returned. The issuer chooses its stations; customers must trust the
  issuer's station policy. Bonded attestations are future work.
- **Single admin key.** The admin can register merchants and stations. There is
  no multisig or two-step rotation in v0.
- **No upgrade path.** The v0 contract is not upgradeable. A bug may require a new
  deployment and a migration.
- **Claim key loss.** A lost owner key means the deposit stays locked. There is no
  recovery or expiry forfeiture in v0.
- **Public ownership graph.** Claims and transfers are public on-chain.
- **Serial hash privacy.** A low-entropy serial can be brute-forced from its hash.
  Use a random tag id or a server-side pepper if serial privacy matters.

## Safe defaults for contributors

- Never commit `.env`, Stellar secret keys, or `~/.config/stellar` contents.
- Use dedicated testnet identities, never a mainnet key.
- Treat all transaction hashes and addresses in docs as public evidence, not as
  credentials.
- Run `pnpm check:hygiene` before pushing.
