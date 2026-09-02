# EOP stable-signature snapshots

`.most` files here are stand-ins for the stable signature of canisters (or of
Caffeine's stored "previous version") that may receive an upgrade of
`src/backend/main.mo`. This agent environment cannot talk to the live replica;
each file was rebuilt from the git commit named in its header with moc 1.11.2
exactly as `mops build` does (root `mops.toml`, chain
`--enhanced-migration=src/backend/migrations`).

## What Caffeine compares against

Caffeine's backend `[check]` is `mops check` (`src/backend/caffeine.toml`), i.e.
`moc --stable-compatible <previous.most> <new.most>`. The `previous.most` is
**Caffeine's own copy** of the `src/backend/dist/backend.most` of the last build
it deployed successfully — not the `.old` file committed in this repo (PR #311
committed an `.old` with GameKey and Caffeine still reported M0263 for GameKey;
`caffeine projects clone` writes that stored file to `.old/src/backend/dist/backend.most`).
For this project that build is the 2026-08-31 import (PR #181 merge `f8aa05e`):
chain `20260826/20260827/20260831`, 42 stables, no GameKey. `.old` in the repo is
a byte-identical copy so `mops check` here behaves exactly like Caffeine's.

## How moc decides whether an upgrade is compatible

Verified in the moc 1.11.2 source and on PocketIC (`scripts/eop-upgrade-matrix.mjs`):

* **Runtime** (`src/lowering/desugar.ml`): the canister stores the names of the
  migrations it applied; the new program compares the *most recently applied*
  name with each chain file name. That file is the position; the stored state is
  loaded as the chain type at that position and every later file runs. No match
  → the whole chain runs from the genesis input `{}`.
* **Compile time** (`mo_types/type.ml` `pre`/`post`): the position is the last
  name in the previous `.most` chain block. Every actor field that no later
  chain file produces is a *required input* there, and every `OldActor` field of
  a later file is required.
* The built wasm does **not** depend on `.old` (same md5 with a blank, wrong or
  real baseline; `mops build` passes no `--stable-baseline` to moc 1.11).

```
RTS error: Memory-incompatible program upgrade      (name not in chain, or extra / retyped fields at the position)
stable variable `x` … not found in persisted state  (field missing at the position and not produced later)
M0263 the previous version does not contain `x`     (compile-time form of the second line)
M0169 `x` of the previous version cannot be implicitly discarded (compile-time form of the first line)
```

False negative: when the previous version is already at the head of the new
chain, moc marks nothing as required, so `mops check-stable` passed
2026-08-31 → PR #258 while the runtime trapped. `scripts/check-eop-stables.py`
applies the runtime rule (`--verdict <file.most>` prints it for any signature).

So every name ever recorded on a canister we still want to upgrade must remain
a chain file (a `migration(_ : {}) : {}` no-op is enough), the cumulative chain
type at that name must equal what that canister holds, and every stable the
deployed tail lacks must be produced by a **later** chain file.

## Files

| File | Latest applied | Where it comes from | Upgradable by this chain |
| :--- | :--- | :--- | :--- |
| `../../../../.old/src/backend/dist/backend.most` (tracked) | `20260831_000000` (no GameKey) | PR #181 merge `f8aa05e`, 2026-08-31 18:50 UTC — Caffeine's previous-version record for this project (`zh6cg-aaaaa-aaaad-aar2q-cai`) | yes (`mops check`; reproduces Caffeine's M0263 with the #311 chain) |
| `deployed/caffeine-aug31-import-tail-20260831-no-gamekey.most` | same | same content with a provenance header | yes |
| `deployed/caffeine-354-tail-20260827.most` | `20260827_000000` | Caffeine build #354 `10d44dd` — `cwofb-yqaaa-aaaap-qp45q-cai` if #354 deployed | yes |
| `deployed/caffeine-348-tail-20260803.most` | `20260803_185500` | Caffeine build #348 `214fc41` — `cwofb…` if #354 never deployed | yes (via the `20260803_185500` no-op) |
| `deployed/pr259-tail-20260901.most` | `20260901_000000` | main between PR #259 and #311 `1d5395a`, fresh install | yes (head of the chain, nothing runs) |
| `empty-canister.most` | none | brand-new Caffeine project / first install | yes (whole chain runs) |
| `unsupported/pr258-tail-20260831-gamekey.most` | `20260831_000000` (with GameKey) | PR #258 `58302bc` | **no** — same name as the deployed tail but five extra fields (M0169 / Memory-incompatible). No Caffeine deploy of #258 succeeded, so no known canister holds it; if one does, deploy `origin/main@d8b8f35` (#311 chain: GameKey on 20260831, `20260901` no-op) first, then this chain. |
| `unsupported/caffeine-340-legacy-no-chain.most` | none, 37 legacy stables | Caffeine build #340 `cfe614b` | **no** — only a chain whose first input is the 37-field legacy actor could adopt it (that is what #347's `20260803_185500` did). |

`mops check-stable <file> backend` is expected to pass for every `deployed/`
file and `empty-canister.most`, and to fail (M0169 / M0263) for `unsupported/`.
`scripts/caffeine-import-gate.sh backend` runs all of them;
`python3 scripts/check-eop-stables.py` applies the runtime rule to the same set.

## Identifying the state of a live canister

```
dfx canister --network ic metadata <canister-id> motoko:stable-types > deployed.most
```

moc 1.11.2 embeds the full `.most` (chain block + actor signature) as the
`icp:private motoko:stable-types` custom section — verified on our wasm; it is
byte-identical to `src/backend/dist/backend.most`. Being **private**, only a
controller of the canister can read it; a Caffeine-managed canister is
controlled by Caffeine, so ask Caffeine support / use the Caffeine dashboard
export if the command is rejected.

Fallbacks when the metadata is not readable:

- `caffeine projects clone <project-id> <dir>`: the CLI writes Caffeine's stored
  `src/backend/dist/backend.most` to `<dir>/.old/src/backend/dist/backend.most`
  — that is the file Caffeine compares against;
- rebuild the commit you believe is deployed with `mops build` and diff
  `src/backend/dist/backend.most`;
- `dfx canister --network ic metadata <id> candid:service` (public) and match
  the Candid interface to a commit (`src/backend/dist/backend.did` history).

Then run `mops check-stable <that.most> backend`,
`python3 scripts/check-eop-stables.py --verdict <that.most>` and, when PocketIC
is available, `node scripts/eop-upgrade-matrix.mjs` for the runtime proof.

## Refreshing after a successful deploy

Copy the deployed program's `.most` (the `src/backend/dist/backend.most` of the
commit Caffeine deployed, built with `mops build`) byte-for-byte over
`.old/src/backend/dist/backend.most` and add the same content under `deployed/`
with a header naming the canister, the commit and the latest applied migration
(`check-eop-stables.py` requires `.old` to match one `deployed/` file). Never
replace `.old` with a blank `actor { };` (PR #177) or a hand-reconstructed
signature (PR #311) — the first hid three incompatible deploys, the second made
Caffeine's `mops check` fail with M0263 while the local one passed.
