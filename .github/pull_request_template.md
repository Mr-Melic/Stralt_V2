## Caffeine import gate

Same commands as GitHub → Caffeine import. Do not skip.

- [ ] `pnpm typecheck` and `pnpm check` pass (or `pnpm fix` then `pnpm check`)
- [ ] Duplicate `export function` copies: `python3 scripts/check-duplicate-exports.py src/frontend/src` (restack union ≠ concatenate)
- [ ] If Motoko / migrations / `.old` / mocks / `mops.toml` changed: `mops check` or `caffeine check` passes
- [ ] If new persistent `let`/`var` on `main.mo`: a **new later** migration file exists after `20260901` with `OldActor = {}` (do not edit a shipped `NewActor`; do not rename/delete chain files; never add a stable to a file at or before the deployed tail); `check-limit` covers the chain; `python3 scripts/check-eop-stables.py`; `bash scripts/caffeine-import-gate.sh backend` passes (check-stable vs `.old` = Caffeine's previous version, byte-identical, never blank or hand-written + `snapshots/deployed/*.most`)

```bash
bash scripts/caffeine-import-gate.sh all
```

## Oldest-first open PR stack

Still-open PRs merge oldest `createdAt` first. Rebase onto bare `main` is not enough.

- [ ] Older still-open PRs listed (`gh pr list`, `createdAt` ascending); overlapping files **unioned**, not overwritten
- [ ] `bash scripts/open-pr-stack-compat.sh --self` is clean vs `origin/main` and as the next oldest-first queue item

