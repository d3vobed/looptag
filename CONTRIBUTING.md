# Contributing to LOOPTAG

Thanks for helping make reusable packaging work. This repository is part of the
Stellar Wave program. Issues labelled `Stellar Wave` are scoped for Wave
contributors; `good first issue` marks a small, well-bounded start.

## Before you start

1. Read [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md).
2. Pick an open issue and comment that you are taking it. Wait for a maintainer
   to assign it if the issue says so.
3. Keep the change focused. One issue per pull request is the default.

## Development setup

```bash
pnpm install
pnpm --filter @looptag/sdk build
pnpm --filter @looptag/sdk test

cd contracts
cargo test
cargo fmt --check
cargo clippy --all-targets -- -D warnings
```

Required toolchain:

- Node.js 22+ and pnpm 10+
- Rust stable with the `wasm32v1-none` target
- Stellar CLI 27+ for deployment and regenerating bindings

## Branch and commit style

- Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, or `docs/<short-name>`.
- Use conventional commits when practical: `feat(sdk): add transfer helper`.
- Keep generated files (`packages/sdk/src/generated/index.ts`) in the same PR as
  the contract interface change that caused them.

## Pull request checklist

Every PR should include:

- A link to the issue it closes (`Closes #123`).
- A short description of the behaviour change and the trade-offs.
- The exact commands you ran and their results.
- Testnet transaction hashes if the change touches contract behaviour.
- Screenshots or a short recording for UI changes.
- Confirmation that no secret keys, `.env` files, or local Stellar config were
  committed.

The PR template mirrors this checklist.

## Tests are the review

For contract changes, add a unit test that fails before the change and passes
after it. For accounting changes, assert the invariant:

```text
merchant.outstanding == sum of deposits of claims that are Active or ReturnAuthorized
```

For SDK changes, add a Vitest test under `packages/sdk/test/`. Prefer a table of
valid and invalid inputs over a single happy path.

## Code style

- Rust: `cargo fmt`, no clippy warnings, explicit error variants.
- TypeScript: `pnpm --filter @looptag/sdk format:check`, strict mode, no `any`
  in public APIs.
- Docs: relative links must resolve; run `pnpm check:docs`.
- Keep comments about *why*, not *what*. The contract should read like a
  specification.

## Security-sensitive changes

Anything touching custody, authorisation, transfer ordering, redemption, admin
roles, or storage TTLs is security-sensitive. Expect a slower review and a
threat-model update in `docs/THREAT_MODEL.md`. Do not disclose an exploitable
finding in a public issue; follow [SECURITY.md](SECURITY.md).

## Wave-specific notes

- Do not open a PR for an issue you were not assigned to, unless a maintainer
  explicitly says the issue is open for anyone.
- Do not split one issue into several low-value PRs to farm points.
- If you cannot finish, say so early so the issue can be unassigned.
- Include the issue number in the PR title or body so Drips can link the work.

## Questions

Open a discussion or ask on the issue. For maintainer/application questions, see
[docs/WAVE_11.md](docs/WAVE_11.md).
