# Pull request

## Summary

<!-- What changed and why? Link the issue. -->

Closes #

## Type of change

- [ ] Contract behaviour
- [ ] SDK
- [ ] Indexer
- [ ] Demo / UI
- [ ] Docs
- [ ] CI / tooling
- [ ] Security fix

## How this was tested

<!--
List exact commands and results. Include transaction hashes for testnet
behaviour, and screenshots/recordings for UI changes.
-->

```bash
# commands
```

## Proof checklist

- [ ] I linked the issue this closes.
- [ ] I added or updated tests for the changed behaviour.
- [ ] `cargo test` passes (contract changes).
- [ ] `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` pass.
- [ ] `pnpm --filter @looptag/sdk build test typecheck` passes (SDK changes).
- [ ] `pnpm check:all` passes (docs, manifest, hygiene).
- [ ] I did not commit a secret key, `.env` file, or local Stellar config.
- [ ] I updated the relevant docs and the threat model if the change is security-sensitive.
- [ ] The PR is scoped to one issue and does not include unrelated refactors.

## Notes for reviewers

<!-- Trade-offs, follow-ups, or areas where you want scrutiny. -->
