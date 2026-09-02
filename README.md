# Stralt

Turn-based tactical RPG (Dofus-inspired combat, isometric chess-piece aesthetic) on the Internet Computer. Players explore maps, fight, summon units, enter portals, and progress through dungeon / boss-rush rooms. Persistence is backend-authoritative.

Visual language lives in [`DESIGN.md`](DESIGN.md). Agent/ops constraints live in [`AGENTS.md`](AGENTS.md).

## Repo map

| Path | Role |
| :--- | :--- |
| `src/backend/main.mo` | Canonical Motoko actor (characters, Doka, admin config, rewards) |
| `src/backend/lib/adminGuard.mo` | Admin input / URL / retirement / rollback guards (authoritative) |
| `src/backend/migrations/` | Stable-memory chain: `20260801` genesis, `20260803_185500` name-only, `20260827` drop-transients, `20260831` summon + rollback (frozen, the 2026-08-31 deployed tail, no GameKey), `20260901` GameKey maps (frozen, `OldActor = {}`). `snapshots/` = recorded `.most` baselines |
| `src/backend/types/` | Shared Motoko types (`common.mo` combat, `admin.mo` config + summon fields) |
| `src/frontend/src/` | React + Vite client |
| `src/frontend/src/backend.ts` | Generated bindgen client — do not hand-edit; can lag Motoko public types |
| `src/frontend/src/engine/` | Pure combat helpers extracted from `WorldExploration.tsx` |
| `src/frontend/src/engine/portalRules.ts` | Run-mode portals + dungeon-chain snapshot (before `cleanupMap`) |
| `src/frontend/src/engine/mapGen.ts` | Archetypes + `finalizePlayableLayout` (spawn / exit / hostile reachability) |
| `src/frontend/src/engine/spawnPolicy.ts` | Overworld spawn filters + family variants + dungeon extras (not placement) |
| `src/frontend/src/engine/worldFeatures.ts` | World-dynamics catalog (tests only — not wired into map gen) |
| `src/frontend/src/utils/progressPersist.ts` | World-session lock: serialize `applyRewards`, `redeemGameKey`, `saveBattleStats` |
| `src/frontend/src/utils/dokaPersist.ts` | One-shot ground / shrine / dungeon-complete credits before `applyRewards` |
| `src/frontend/src/utils/challengeCompletion.ts` | Challenge predicates + damage / AP / opening-turn / Sacrifice accumulators |
| `src/frontend/src/utils/deathGuards.ts` | Death-realm timer + one-shot death guards |
| `src/frontend/src/utils/deathPenalty.ts` | 20/40 death cut + localStorage replay (`pbv_pending_death_penalty_slotN`) |
| `src/frontend/src/utils/dokaGameKey.ts` | Buy Doka GameKey format / email / consent (120-char single-use codes) |
| `src/frontend/src/utils/rewardResolver.ts` | Victory / boss-rush / challenge deltas → `applyRewards` (clamped to canister maxima) |
| `src/frontend/src/utils/xpCurve.ts` | Shared `100 * 2^(N-1)` leftover-XP threshold (bigint) |
| `src/frontend/src/utils/versionGate.ts` | Version-bump wipe: keep spawn/level-up config and `*_inventory` |
| `backend_extended/` | Legacy actor (15-field stats). Not the caffeine/mops build |
| `declarations/backend/` | Stale Candid snapshot (still lists `wp`/`wr`/`scp`) |

Canonical build entry: root `mops.toml` → `src/backend/main.mo`.  
`dfx.json` points at missing `src/backend_extended/main.mo`; the legacy tree is root `backend_extended/`. Do not treat dfx as the source of truth.

## Quick start

```bash
pnpm install
pnpm typecheck    # tsc --noEmit in each package
pnpm check        # Biome (unused vars + hook deps are errors)
pnpm fix          # biome --write on frontend
pnpm build        # frontend Vite build + env.json copy
mops check        # Motoko + check-stable vs .old = Caffeine's previous-version signature (byte-identical copy; or: caffeine check)
                  # New stables: bash scripts/caffeine-import-gate.sh backend (all snapshots/deployed/*.most)
```

Caffeine GitHub → import is exactly those check commands. Run `bash scripts/caffeine-import-gate.sh all` (or `pnpm gate`) and `bash scripts/open-pr-stack-compat.sh --self` before a PR. See [docs/automation/CAFFEINE_IMPORT_GATES.md](docs/automation/CAFFEINE_IMPORT_GATES.md) and [docs/automation/OPEN_PR_STACK_COMPAT.md](docs/automation/OPEN_PR_STACK_COMPAT.md).

Regenerate the frontend actor after Motoko/Candid changes:

```bash
pnpm bindgen      # caffeine-bindgen from src/backend/dist/backend.did
```

Frontend-only mock actor (no canister):

```bash
VITE_USE_MOCK=true pnpm --filter '@caffeine/template-frontend' dev
```

This container typically has no `dfx`. Use `caffeine check --fix` / `caffeine build` for Motoko, not `mops build`.

## Doc index

| Doc | Contents |
| :--- | :--- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Persistence, persist lock, challenges, Death Realm, dungeon chain, map solvability, public API, migrations |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Setup, Candid/wallet pitfalls, challenges, shop, boss rush, maps, deploy, debug overlay |
| [DESIGN.md](DESIGN.md) | Color, type, panel, motion constraints |
| [AGENTS.md](AGENTS.md) | Verified commands and non-negotiable product rules |
| [docs/automation/CAFFEINE_IMPORT_GATES.md](docs/automation/CAFFEINE_IMPORT_GATES.md) | Caffeine import CI + agent gates; Cursor automation inventory |
| [docs/automation/OPEN_PR_STACK_COMPAT.md](docs/automation/OPEN_PR_STACK_COMPAT.md) | Oldest-first open-PR merge simulation (`scripts/open-pr-stack-compat.sh --self`) |
| [docs/automation/QUALITY_AUDIT_2026-08-30.md](docs/automation/QUALITY_AUDIT_2026-08-30.md) | Weekly automation quality audit (process only) |
| [docs/automation/EXPANSION_PROPOSALS_2026-09-01.md](docs/automation/EXPANSION_PROPOSALS_2026-09-01.md) | Expansion Director living catalog (proposals only; no gameplay code) |
| [docs/automation/EXPANSION_PROPOSALS_2026-08-31.md](docs/automation/EXPANSION_PROPOSALS_2026-08-31.md) | Expansion Director first catalog (2026-08-31 archive) |
| `src/frontend/src/utils/challengeCompletion.ts` | Challenge predicates + damage / AP accumulators |
| `backend_extended/` | Legacy dfx entry. Stale 15-field stats. Not the caffeine/mops build |
| [docs/automation/MASTER_ROADMAP.md](docs/automation/MASTER_ROADMAP.md) | Master Technical Director roadmap (no gameplay changes) |
| [docs/automation/ACTION_IDS_2026-09-01.md](docs/automation/ACTION_IDS_2026-09-01.md) | Current director ACTION_ID ledger (reuses 08-30/08-31 IDs) |
| [docs/automation/ACTION_IDS_2026-08-31.md](docs/automation/ACTION_IDS_2026-08-31.md) | 2026-08-31 specialist dump yard — do not append |
| [docs/automation/PX_COHERENCE_AUDIT_2026-08-31.md](docs/automation/PX_COHERENCE_AUDIT_2026-08-31.md) | Player-experience coherence audit (systems, not process) |
| [docs/automation/TELEMETRY_ARCHITECTURE_2026-08-31.md](docs/automation/TELEMETRY_ARCHITECTURE_2026-08-31.md) | Owner-facing aggregate telemetry design (no production instrumentation) |
| [docs/automation/TELEMETRY_BALANCE_2026-09-01.md](docs/automation/TELEMETRY_BALANCE_2026-09-01.md) | TBC cron 2026-09-01: STATUS WAITING_FOR_TELEMETRY (no collectors, 0 rows) |
| [docs/automation/ACTION_IDS_2026-09-01.md](docs/automation/ACTION_IDS_2026-09-01.md) | TBC 2026-09-01 ACTION_ID ledger (`TBC-2026-09-01-001`; prior TBC/AQA IDs still NEW) |
| [docs/automation/TELEMETRY_BALANCE_2026-09-02.md](docs/automation/TELEMETRY_BALANCE_2026-09-02.md) | TBC cron 2026-09-02: STATUS WAITING_FOR_TELEMETRY (HEAD `58302bc`; still 0 collectors / 0 rows) |
| [docs/automation/ACTION_IDS_TBC_2026-09-02.md](docs/automation/ACTION_IDS_TBC_2026-09-02.md) | TBC 2026-09-02 ACTION_ID ledger (`TBC-2026-09-02-001` / `002`; prior TBC/AQA IDs still NEW) |
| [docs/automation/TELEMETRY_DASHBOARD_2026-09-01.md](docs/automation/TELEMETRY_DASHBOARD_2026-09-01.md) | Owner Health dashboard support matrix (design only; refresh of 2026-08-31) |
| [docs/automation/ACTION_IDS_TADD_2026-09-01.md](docs/automation/ACTION_IDS_TADD_2026-09-01.md) | Telemetry dashboard designer ACTION_IDs (2026-09-01) |
| [docs/automation/TELEMETRY_DASHBOARD_2026-09-02.md](docs/automation/TELEMETRY_DASHBOARD_2026-09-02.md) | Owner Health dashboard support matrix (design only; refresh after GameKey + audit bindgen) |
| [docs/automation/ACTION_IDS_TADD_2026-09-02.md](docs/automation/ACTION_IDS_TADD_2026-09-02.md) | Telemetry dashboard designer ACTION_IDs (2026-09-02) |
| [docs/automation/TELEMETRY_ARCHITECTURE_2026-09-01.md](docs/automation/TELEMETRY_ARCHITECTURE_2026-09-01.md) | Current owner-facing aggregate telemetry design (no production instrumentation) |
| [docs/automation/ACTION_IDS_GTAD_2026-09-01.md](docs/automation/ACTION_IDS_GTAD_2026-09-01.md) | GTAD-2026-09-01 ACTION_ID ledger (supersedes 08-31 GTAD ids for implementers) |
| [docs/automation/TELEMETRY_ARCHITECTURE_2026-08-31.md](docs/automation/TELEMETRY_ARCHITECTURE_2026-08-31.md) | Prior telemetry architecture (PR #130; still valid policy, stale line numbers) |
| [docs/design/ENEMY_FORMATIONS_2026-08-31.md](docs/design/ENEMY_FORMATIONS_2026-08-31.md) | Proposed enemy synergy packs (design only) |
| [docs/ENEMY_AI_EVOLUTION.md](docs/ENEMY_AI_EVOLUTION.md) | Proposed unbounded enemy AI modules (design only; no production AI in that doc) |
| [docs/design/BOSS_AND_SPELL_DISCOVERY.md](docs/design/BOSS_AND_SPELL_DISCOVERY.md) | Proposed boss sheets (19 shipped + Wave 2 + Wave 3), no-cap scaling, and boss-spell discovery classes (design only) |
| [docs/WORLD_DYNAMICS.md](docs/WORLD_DYNAMICS.md) | World-feature catalog (rarity + relative difficulty). Not wired into map gen |
| `src/frontend/src/engine/battleStartPlacement.ts` | Battle-start cell spacing (player ≥3 / enemies ≥2, occupancy fallback) |
| `src/frontend/src/engine/statusEffects.ts` | Non-DoT apply/refresh + `getStatModifier` (DoT stacking stays in `dotStacks.ts`) |
| [docs/automation/ENEMY_BOSS_ADMIN_DESIGN_2026-08-31.md](docs/automation/ENEMY_BOSS_ADMIN_DESIGN_2026-08-31.md) | Owner enemy/boss studio design (docs only) |
| [docs/automation/ACTION_IDS_ENEMY_BOSS_ADMIN_2026-08-31.md](docs/automation/ACTION_IDS_ENEMY_BOSS_ADMIN_2026-08-31.md) | EBA-2026-08-31 ACTION_ID ledger |
| [docs/automation/SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md](docs/automation/SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md) | Observe→win discovery, pool generations, Wave-1 spell cards (design only) |
| [docs/automation/ACTION_IDS_2026-08-31-1200.md](docs/automation/ACTION_IDS_2026-08-31-1200.md) | 12:00 orchestrator ledger (post-merge-burst) |
| [docs/automation/ACTION_IDS_2026-08-31-1800.md](docs/automation/ACTION_IDS_2026-08-31-1800.md) | 18:00 orchestrator ledger (vitals jewels) |
| [docs/automation/ACTION_IDS_2026-09-01-0000.md](docs/automation/ACTION_IDS_2026-09-01-0000.md) | 00:00 orchestrator ledger (walk reject floats) |
| [docs/automation/ACTION_IDS_2026-09-01-0600.md](docs/automation/ACTION_IDS_2026-09-01-0600.md) | 06:00 orchestrator ledger (pacifist preview) |
| [docs/automation/ACTION_IDS_2026-09-01-1800.md](docs/automation/ACTION_IDS_2026-09-01-1800.md) | 18:00 orchestrator ledger (admin spriteUrl honesty) |
| [docs/automation/ACTION_IDS_2026-09-01-1200.md](docs/automation/ACTION_IDS_2026-09-01-1200.md) | 12:00 orchestrator ledger (Buy Doka IAP copy) |

## Hard rules (product)

- Backend owns persisted state. `localStorage` is a cache / UI preference only.
- Battle XP and Doka **credits** persist only through `applyRewards`. Do not write rewards via `updateCharacter`. Portal +10 XP must not update the HUD until that write commits. Official deltas clamp to `100_000` Doka / `500_000` XP (canister `#err` above that). Ground / shrine / dungeon-complete credits are one-shot (`dokaPersist.ts`); after invoke, a transport miss must **keep** the claim (`settleOneShotAfterCredit`) so RAF cannot remint.
- Paid IAP Doka credits through `redeemGameKey` on the same persist lock. `initiatePurchase` always `#err`s (signature kept). `processPendingPurchases` is a no-op that returns `0`.
- Penalties and item-shop/heal spends persist through `saveBattleStats` on the same progress-persist lock. `applyRewards` cannot subtract. `saveBattleStats` never mints Doka/XP/level. Items (BuffShop potions) is a different store from Buy Doka.
- Spell targeting uses explicit `SpellConfig` metadata (`targetType`, range, LoS flags). Never name-based heuristics. Admin catalog spells carry explicit summon fields — do not infer from the name.
- Admin and debug tools stay gated. Do not ship them to normal players as first-class UI.
- Recap UI mounts once, at app root (`App.tsx` → `PostBattleRecap`).
