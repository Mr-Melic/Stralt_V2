# Caffeine import gates

Caffeine GitHub → import uses:

| Surface | Config | Command |
| :--- | :--- | :--- |
| Frontend | `src/frontend/caffeine.toml` `[check]` | `pnpm typecheck` then `pnpm check` (`biome check src`) |
| Frontend | `src/frontend/caffeine.toml` `[build]` | `pnpm build` (vite/esbuild; duplicate exports fail here) |
| Backend | `src/backend/caffeine.toml` `[check]` | `mops check` (also `caffeine check` at the workspace) |

`pnpm check` errors on unused locals, exhaustive React hook deps, and `noRedeclare` (`src/frontend/biome.json`). Duplicate `export function` implementations in one file also fail `python3 scripts/check-duplicate-exports.py` and Caffeine `[build]` (`pnpm build` / vite esbuild). `mops check` compiles Motoko, runs the migration chain (`check-limit = 5`), and check-stable against the tracked `.old/src/backend/dist/backend.most` (directory is gitignored; that file is force-tracked). That file is **Caffeine-owned**: Caffeine compares every import against its own copy of the `.most` of the last build it deployed successfully — for this project the 2026-08-31 import (PR #181 merge `f8aa05e`: latest applied `20260831_000000`, 42 stables, **no GameKey**). The repo copy must stay byte-identical to that build so local `mops check` fails and passes exactly like Caffeine's (PR #311 committed a hand-reconstructed `.old` *with* GameKey; local `mops check` passed and Caffeine's failed with M0263). Never a blank `actor { };` either — the blank baseline from #177 let three incompatible deploys pass `mops check`. The gate script also runs `python3 scripts/check-eop-stables.py`, `mops check-stable` against every reconstructed live shape under `src/backend/migrations/snapshots/deployed/*.most` plus `snapshots/empty-canister.most`, and expects `snapshots/unsupported/*.most` to fail (documented limits). See `src/backend/migrations/snapshots/README.md`.

Caffeine backend build is exactly `mops build` from the repo root (`src/backend/caffeine.toml` `[build]`), so the mops migration chain **is** applied at deploy. The runtime loads the canister at the chain position of the **latest applied migration name**; renaming/deleting a recorded name or changing a shipped `NewActor` traps `RTS error: Memory-incompatible program upgrade` (IC0503) even when static check-stable passes.

Do **not** require `caffeine build` / `mops build` for this gate (PocketIC / dfx). When `pocket-ic` is available, `node scripts/eop-upgrade-matrix.mjs` is the runtime proof (install each candidate commit, upgrade to HEAD, probe a user profile).

Local:

```bash
bash scripts/caffeine-import-gate.sh all
# or
pnpm typecheck && pnpm check
python3 scripts/check-duplicate-exports.py src/frontend/src
pnpm --dir src/frontend build
python3 scripts/check-eop-stables.py
mops check          # or: caffeine check
mops check --no-lint --no-check-limit
for f in src/backend/migrations/snapshots/deployed/*.most src/backend/migrations/snapshots/empty-canister.most; do
  mops check-stable "$f" backend
done
node scripts/eop-upgrade-matrix.mjs   # optional runtime proof; needs pocket-ic
```

CI: `.github/workflows/caffeine-import-gate.yml` (frontend + backend jobs on every PR and `main`). Both jobs always run. Neither is allowed to skip.

## Why this exists

Import failed after merge bursts on:

| Failure | Gate that now fails first |
| :--- | :--- |
| Biome unused `needsLos` | `pnpm check` (`noUnusedVariables: error`) |
| Missing `probeLiveCast` hook dep | `pnpm check` (`useExhaustiveDependencies: error`) |
| Format nits | `pnpm check` (formatter enabled) |
| Mock TS2740 | `pnpm typecheck` |
| Motoko M0215 / M0001 / M0155 | `mops check` / `caffeine check` |
| Empty-canister M0263 | `mops check --no-check-limit` + `mops check-stable snapshots/empty-canister.most` + genesis migration `20260801_000000` (`OldActor = {}`) |
| Duplicate `export function` (esbuild “already been declared”) | `python3 scripts/check-duplicate-exports.py` + `pnpm typecheck` (TS2393) + Biome `noRedeclare` + `pnpm --dir src/frontend build` |
| Populated EOP `Memory-incompatible program upgrade` / IC0503 (3× on `cwofb…` / `zh6cg…`) | `python3 scripts/check-eop-stables.py` (frozen `NewActor`s, recorded chain names must stay files, `.old` must be a real signature, runtime-rule verdict for every snapshot) + `mops check-stable` vs `.old` **and** every `snapshots/deployed/*.most` + a **new later** migration (never edit a shipped `NewActor`) + `node scripts/eop-upgrade-matrix.mjs` when PocketIC is present |
| Caffeine `M0263 the previous version does not contain the stable variable X` (PR #311 import) | `mops check` against the byte-identical `.old` of Caffeine's last deployed build reproduces it locally; fix = introduce `X` in a chain file that sorts **after** the deployed tail (`20260901_000000` for GameKey), never on the deployed step |

Agents must not treat those as “pre-existing, skip.” `AGENTS.md` Verified Commands and `.cursor/rules/caffeine-import-gate.mdc` say the same.

## Cursor Cloud Automations — no write API

`cursor-cloud` MCP exposes `get-automation` (read metadata: id, name, enabled, url, owner). There is **no** list/update/write tool for automation prompts. This run cannot edit dashboard prompts.

Equivalent enforcement is in-repo: `AGENTS.md`, `.cursor/rules/caffeine-import-gate.mdc`, this file, `scripts/caffeine-import-gate.sh`, and the GitHub Actions workflow. Cloud agents that produce PRs still load `AGENTS.md`.

Paste the following into **every** automation prompt that can produce or merge code (Cursor dashboard → each URL below):

```
Caffeine import gate (mandatory, do not skip):
Before finishing or opening a PR, run `pnpm typecheck` and `pnpm check`
(or `pnpm fix` then `pnpm check`). Unused locals and React hook-deps are errors.
If Motoko, migrations, `.old`, mops.toml, or frontend mocks changed, run
`mops check` or `caffeine check`. Missing mops/caffeine is a failure, not a skip.
Do not run caffeine build / PocketIC just to finish. Do not treat lint, tsc,
Motoko compile, or empty-canister stable-compat as pre-existing.
See AGENTS.md Verified Commands and docs/automation/CAFFEINE_IMPORT_GATES.md.

EOP / Caffeine deploy (mandatory when adding persistent let/var on main.mo):
Caffeine runs `mops build`, so the mops migration chain IS deployed. The runtime
loads the canister at the chain position of the LATEST APPLIED migration name.
Add a NEW later file under src/backend/migrations/ (after 20260901_000000).
Never edit a shipped NewActor (20260801 / 20260803_185500 / 20260827 /
20260831 / 20260901) and never delete or rename a chain file — a live canister
recorded those names; a missing name falls back to the {} genesis and traps.
New file: input = only the fields you transform ({} for pure additions);
output = the new stables with empty-map / zero defaults. Bump mops.toml
check-limit to the chain length. python3 scripts/check-eop-stables.py must pass.
.old/src/backend/dist/backend.most is Caffeine-owned: the byte-identical .most
of the last build Caffeine deployed (2026-08-31 import, PR #181 f8aa05e, no
GameKey). Caffeine checks imports against its own copy of it, so never blank it
and never hand-write it; a new stable must be produced by a file that sorts
AFTER the deployed tail (else Caffeine fails M0263 at import). Also run:
  bash scripts/caffeine-import-gate.sh backend
  (= mops check, mops check --no-lint --no-check-limit, mops check-stable vs
   .old, snapshots/deployed/*.most, empty-canister.most; unsupported/ must fail)
  node scripts/eop-upgrade-matrix.mjs   # when pocket-ic is installed
RTS error: Memory-incompatible program upgrade (IC0503) = latest applied name
missing from the chain or extra fields at that position; `stable variable …
not found in persisted state` = missing field there. Static check-stable
passing is necessary, not sufficient (it passed Aug-31 -> #258, which trapped). Do not delete needed stables from
main.mo to make the upgrade pass. After a successful Caffeine deploy, refresh
.old with that build's src/backend/dist/backend.most and add it under
src/backend/migrations/snapshots/deployed/.

Duplicate TS exports (mandatory):
Keep one `export function` / `export const` implementation per name in a file.
Restack “union” does not mean concatenate two copies. Caffeine import `pnpm build`
(esbuild) fails on “Multiple exports with the same name”. Local: python3
scripts/check-duplicate-exports.py src/frontend/src
```

Also paste the oldest-first open-PR stack addendum from `docs/automation/OPEN_PR_STACK_COMPAT.md` into those same prompts. Dashboard prompts have no write API; the in-repo rule + `scripts/open-pr-stack-compat.sh` + CI job `open-pr-stack` are the gate.

## Inventory (2026-08-31)

343 automation-sourced cloud-agent runs were visible in this environment. **59** unique `automationId` values. Official names from `get-automation` unless marked.

### Not writable / not readable via API

These IDs appear on agent `sourceDetails` but `get-automation` returns not found (legacy or restricted). Names are from agent titles / `docs/automation/QUALITY_AUDIT_2026-08-30.md`.

| ID | Observed names | Code-producing? |
| :--- | :--- | :--- |
| `996df6df-9d7a-11f1-a7d1-d6b4613131ce` | Critical bug identification / investigation / management / scan | Yes (high volume PRs) |
| `4a5a5880-9d7c-11f1-a7d1-d6b4613131ce` | Missing test coverage; Regression prevention tests | Yes |
| `b82ecc58-9d7b-11f1-a7d1-d6b4613131ce` | Application security review | Yes |
| `9c30083d-a20f-11f1-b532-320a589b8025` | Daily engineering digest | Docs / digest |
| `27809f11-9d7c-11f1-a7d1-d6b4613131ce` | Engineering documentation updates | Docs |

### Readable, enabled (owner: Sergio Melicio de Bel)

Code-producing hunters / implementers / auditors that regularly open PRs:

| ID | Official name | URL |
| :--- | :--- | :--- |
| `1aa41c6c-a483-11f1-a7d1-d6b4613131ce` | Find Critical Gameplay Bugs | https://cursor.com/automations/1aa41c6c-a483-11f1-a7d1-d6b4613131ce |
| `1f90a60d-a484-11f1-a7d1-d6b4613131ce` | Regression Hunter | https://cursor.com/automations/1f90a60d-a484-11f1-a7d1-d6b4613131ce |
| `1e548d83-a485-11f1-a7d1-d6b4613131ce` | Economy & Exploit Hunter | https://cursor.com/automations/1e548d83-a485-11f1-a7d1-d6b4613131ce |
| `607e0304-a484-11f1-a7d1-d6b4613131ce` | State & Persistence Race Auditor | https://cursor.com/automations/607e0304-a484-11f1-a7d1-d6b4613131ce |
| `9dcfd122-a484-11f1-a7d1-d6b4613131ce` | Dungeon Solvability Guardian | https://cursor.com/automations/9dcfd122-a484-11f1-a7d1-d6b4613131ce |
| `f37b7505-a484-11f1-a7d1-d6b4613131ce` | Combat Rules Consistency Auditor | https://cursor.com/automations/f37b7505-a484-11f1-a7d1-d6b4613131ce |
| `72eb90fe-a483-11f1-a7d1-d6b4613131ce` | Gameplay Invariant Guardian | https://cursor.com/automations/72eb90fe-a483-11f1-a7d1-d6b4613131ce |
| `4fba3a56-a485-11f1-a7d1-d6b4613131ce` | Backend Contract Guardian | https://cursor.com/automations/4fba3a56-a485-11f1-a7d1-d6b4613131ce |
| `81c2e934-a485-11f1-a7d1-d6b4613131ce` | Regression Test Builder | https://cursor.com/automations/81c2e934-a485-11f1-a7d1-d6b4613131ce |
| `c97e5c0c-a485-11f1-a7d1-d6b4613131ce` | Security & Abuse Scanner | https://cursor.com/automations/c97e5c0c-a485-11f1-a7d1-d6b4613131ce |
| `08e7de28-a486-11f1-a7d1-d6b4613131ce` | Adversarial Gameplay Simulator | https://cursor.com/automations/08e7de28-a486-11f1-a7d1-d6b4613131ce |
| `68f2958f-a489-11f1-a7d1-d6b4613131ce` | Stralt Report Action Orchestrator | https://cursor.com/automations/68f2958f-a489-11f1-a7d1-d6b4613131ce |
| `fe5b679a-a489-11f1-a7d1-d6b4613131ce` | Approved Game Design Implementer | https://cursor.com/automations/fe5b679a-a489-11f1-a7d1-d6b4613131ce |
| `d449111b-a487-11f1-a7d1-d6b4613131ce` | Dead Code & Legacy Drift Cleaner | https://cursor.com/automations/d449111b-a487-11f1-a7d1-d6b4613131ce |
| `386a157d-a4a5-11f1-a7d1-d6b4613131ce` | Code Modularity & Complexity Reduction Engineer | https://cursor.com/automations/386a157d-a4a5-11f1-a7d1-d6b4613131ce |
| `3089f18d-a49a-11f1-a7d1-d6b4613131ce` | Admin Dashboard Implementation Engineer | https://cursor.com/automations/3089f18d-a49a-11f1-a7d1-d6b4613131ce |
| `67820d12-a49d-11f1-a7d1-d6b4613131ce` | Admin Regression, Render & Contract Gate | https://cursor.com/automations/67820d12-a49d-11f1-a7d1-d6b4613131ce |
| `7e907066-a499-11f1-a7d1-d6b4613131ce` | Admin Safety, Authorization & Rollback Guardian | https://cursor.com/automations/7e907066-a499-11f1-a7d1-d6b4613131ce |
| `e4d996b0-a497-11f1-a7d1-d6b4613131ce` | Admin Feature & Drift Auditor | https://cursor.com/automations/e4d996b0-a497-11f1-a7d1-d6b4613131ce |
| `469b7020-a49f-11f1-a7d1-d6b4613131ce` | Save/Data Evolution Guardian | https://cursor.com/automations/469b7020-a49f-11f1-a7d1-d6b4613131ce |

Design / audit / digest automations (still load `AGENTS.md` if they open a code PR; CI still runs):

| ID | Official name |
| :--- | :--- |
| `0b92479e-a49e-11f1-a7d1-d6b4613131ce` | Stralt Master Technical Director |
| `976261d8-a49f-11f1-a7d1-d6b4613131ce` | Automation Quality Auditor |
| `0c6caa64-a489-11f1-a7d1-d6b4613131ce` | Weekly Game Development Changelog & Health Review |
| `d066ac72-a488-11f1-a7d1-d6b4613131ce` | Daily Stralt Engineering Summary |
| `013ac98d-a488-11f1-a7d1-d6b4613131ce` | Generate Living Developer Docs |
| `047ac8a1-a4a0-11f1-a7d1-d6b4613131ce` | Gameplay Telemetry Architecture Director |
| `078e61d4-a49f-11f1-a7d1-d6b4613131ce` | Game Feel & Combat Feedback Director |
| `091b545a-a498-11f1-a7d1-d6b4613131ce` | Visual Asset Library & Assignment Designer |
| `1330956a-a493-11f1-a7d1-d6b4613131ce` | Spell & Tactical Mechanics Designer |
| `1592c6c0-a499-11f1-a7d1-d6b4613131ce` | World, Dungeon & Encounter Admin Designer |
| `2786666f-a4a0-11f1-a7d1-d6b4613131ce` | Telemetry-Driven Balance & Content Analyst |
| `29176a08-a494-11f1-a7d1-d6b4613131ce` | Enemy Synergy & Formation Designer |
| `299b70f5-a498-11f1-a7d1-d6b4613131ce` | Enemy & Boss Admin Content Designer |
| `30118f7c-a49e-11f1-a7d1-d6b4613131ce` | Player Experience Coherence Auditor |
| `39040ad2-a493-11f1-a7d1-d6b4613131ce` | Boss & Boss-Spell Designer |
| `3c083a4a-a487-11f1-a7d1-d6b4613131ce` | Game Balance Analyst |
| `3f31b18f-a492-11f1-a7d1-d6b4613131ce` | Stralt Expansion Director |
| `4191af8a-a486-11f1-a7d1-d6b4613131ce` | Performance & Render Auditor |
| `48eb1df6-a499-11f1-a7d1-d6b4613131ce` | Admin UX & Information Architecture Auditor |
| `4b026695-a4a0-11f1-a7d1-d6b4613131ce` | Telemetry Admin Dashboard Designer |
| `4efa22ec-a498-11f1-a7d1-d6b4613131ce` | Spell, Discovery & Achievement Admin Designer |
| `5acab6fe-a49e-11f1-a7d1-d6b4613131ce` | Content Diversity & Repetition Auditor |
| `62dfc3fc-a494-11f1-a7d1-d6b4613131ce` | World Events & Environmental Evolution Designer |
| `637c51d2-a487-11f1-a7d1-d6b4613131ce` | Architecture Debt & Refactor Scout |
| `67b03c2f-a492-11f1-a7d1-d6b4613131ce` | Advanced Enemy AI Evolution Designer |
| `73740435-a493-11f1-a7d1-d6b4613131ce` | Dungeon & Encounter Evolution Designer |
| `7b2f2b58-a49e-11f1-a7d1-d6b4613131ce` | Emergent Build & Meta Analyzer |
| `93fcf1b7-a492-11f1-a7d1-d6b4613131ce` | Infinite Enemy & Elite Evolution Designer |
| `96624677-a486-11f1-a7d1-d6b4613131ce` | Player Journey & UX Auditor |
| `aac69fba-a49e-11f1-a7d1-d6b4613131ce` | Long-Horizon Infinite Progression Simulator |
| `b1bc1d63-a497-11f1-a7d1-d6b4613131ce` | Admin Dashboard Product Director |
| `c26e5a83-a492-11f1-a7d1-d6b4613131ce` | Dynamic Spell Discovery & Enemy Spell Evolution Designer |
| `c8f71c67-a486-11f1-a7d1-d6b4613131ce` | Mobile & Accessibility QA |
| `cf1460bd-a49e-11f1-a7d1-d6b4613131ce` | Mechanic Interaction Matrix Auditor |

Dashboard URL for any readable id: `https://cursor.com/automations/<id>`.

## Other automations in this repo

| What | Status | Change in this work |
| :--- | :--- | :--- |
| `.github/workflows/caffeine-import-gate.yml` | Existed on #181 (frontend only) | Added Motoko `mops check --locked` job; both jobs always run |
| `open-pr-stack` job + `scripts/open-pr-stack-compat.sh` | Missing | Oldest-first open-PR sequential `merge-tree` on PRs/`main`; `pull-requests: read`; no PocketIC/dfx |
| `.cursor/rules/open-pr-stack-compat.mdc` | Missing | `alwaysApply` restack/union rule before opening a PR |
| `AGENTS.md` Verified Commands | typecheck / fix / build only | Added `pnpm check`, `mops check` / `caffeine check`, finish gate |
| `.cursor/rules/` | Missing | Added `caffeine-import-gate.mdc` (`alwaysApply`) |
| `scripts/caffeine-import-gate.sh` | Missing | Shared frontend + backend runner |
| Root `package.json` scripts | typecheck / check / fix / build | Added `gate` / `gate:frontend` / `gate:backend` |
| `src/frontend/caffeine.toml` / `biome.json` | Already Caffeine-shaped after #181 | Unchanged |
| `src/backend/caffeine.toml` / `mops.toml` | Already `mops check` + check-stable | `check-limit` tracks chain length; `.old` = Caffeine's previous version (2026-08-31 import, no GameKey), byte-identical; `snapshots/deployed/*.most` are additional check-stable baselines; `scripts/eop-upgrade-matrix.mjs` is the PocketIC runtime proof |
| `.cursor/environment.json` | Not in repo (personal db-backed env) | Cannot edit |
| Dependabot / pre-commit / Husky | None | Not added (no extra stack) |
| Cursor environment install/start | Owner-restricted; no repo file | Cannot edit |

Require the GitHub Actions check on `main` in branch protection so a red gate blocks merge.
