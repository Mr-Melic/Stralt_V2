# Dead-code / legacy-drift audit — 2026-09-01

**Automation:** cron `0 */48 * * *` (`d449111b-a487-11f1-a7d1-d6b4613131ce`)  
**HEAD inspected:** `dd275aa` (`Merge pull request #182 from Mr-Melic/cursor/caffeine-automation-gates-46e6`)  
**Prior pass:** `docs/automation/DEAD_CODE_AUDIT_2026-08-31.md`  
**Gameplay / RAF / mapGen / turn / damage math:** not modified.

This pass classifies candidates. Only **SAFE TO REMOVE** items with high confidence were deleted. Static “no callers” was not enough — each item was checked for dynamic `import()`, bindgen/dfx output, migrations, deployment wiring, tests, and intentional docs/reference.

## Removed this run (SAFE TO REMOVE)

| Item | Why high confidence |
| :--- | :--- |
| `components/SpellFooter.tsx` | Complete unused spell bar. Zero static/dynamic importers. Live bar is `BattleUIPanel` (`WorldExploration.tsx`). Only leftover mention was a comment in `challengeCompletion.ts`. `panelId="spell-footer"` is layout-cache only if the panel had ever mounted. |
| `.spell-glow-*` rules in `index.css` | Used only by `SpellFooter` (`getSpellGlowClass`). `BattleUIPanel` does not use these classes. `spell-glow-cyan` was referenced but never defined. |
| Unused `BoostToggle` import in `WorldExploration.tsx` | Default import, never rendered. Component file kept (see human-decision list). |
| Unused `App.tsx` `_showShop` / `_setShowShop` | Shop lives in `GameFlow` / `WorldExploration`. State was never read. |
| `useGetBossConfig` in `hooks/useBossQueries.ts` | Never imported (including via `useQueries` barrel). Admin uses `useGetAllBossConfigs`. |
| `getDefaultBossConfig` in `types/bossDefaults.ts` | Never imported. Callers use `DEFAULT_BOSS_CONFIGS.find(...)`. |
| `useBossSystem()` hook + `UseBossSystemParams` | Never called. WX / `useBossAI` import named functions (`initBossState`, `applyBossAbility`, …) directly. |

Stale comments that claimed a non-existent `handleSummonTurn` / live `runSummonAI` path were corrected in `enemyAI.ts`, `summonIntegration.ts`, `gameConstants.ts`, and `docs/ARCHITECTURE.md`. **`engine/summonAI.ts` was not deleted.**

## Left in place

### LEGACY BUT REQUIRED

| Item | Why keep |
| :--- | :--- |
| `src/backend/migrations/` + `.old/src/backend/dist/backend.most` | Live mops migration chain / `check-stable`. Do not delete. |
| `src/backend/BaseToCore.mo` | Documented completed mo:base→mo:core marker (`AGENTS.md`). Not imported by `main.mo`. |
| `src/backend/lib/admin.mo`, `lib/adminGuard.mo`, `types/admin.mo` | Imported by canonical `main.mo`. |
| `src/frontend/src/backend.ts` + `backend.d.ts` + `src/frontend/src/declarations/` | Canonical bindgen (12-field `CharacterStats`, `killCount`, no `wp`/`wr`/`scp`). In sync with `src/backend/dist/backend.did`. |
| `src/frontend/src/utils/debugLogger.ts` | Re-export shim; engine/UI files still import it. |
| `src/frontend/src/hooks/useDungeonState.ts` | `getDungeonMultiplier` is tested. Hook export is a stub; table is live. |
| `src/frontend/src/components/InitiativeStrip.tsx` | Default UI unused, but `CombatantEntry` is the shared combatant type (14+ importers). |
| `src/backend/dist/backend.did` + `backend.most` | Canonical Candid / build artifact. Regen via bindgen; do not hand-edit. |
| `VITE_USE_MOCK` | Live local-dev flag (`useActor`). |
| `AI_*_ENABLED` constants | Live AI master toggles (all `true`), not leftover flags. |
| `calculateAndAwardDoka` | Unused public mint on the Candid surface (`#user`, banned). Must not be called from the official reward funnel. Keep the stub. |
| `engine/worldFeatures.ts` | Tests + `docs/WORLD_DYNAMICS.md` contract. |
| `utils/longHorizonSim.ts` | CLI/dev balance tool. |
| `engine/mapGen.simulate.ts` | Solvability test helper. |

### STALE GENERATED ARTIFACT

| Item | Notes |
| :--- | :--- |
| Root `declarations/backend/` | 15-field snapshot (`wp`/`wr`/`scp`), ~13 methods. Not imported. Frontend tsconfig `declarations/*` maps to `src/declarations` (repo-root), a footgun if anyone starts using the alias. Default dfx output location — do not delete without a human retarget of dfx. Bindgen source of truth is `src/backend/dist/backend.did`. |
| Untracked root `frontend/public/assets/` | Screenshots + a duplicate `skateboard-sprite.png`. Not git-tracked. Live assets are `src/frontend/public/`. |

### NEEDS HUMAN DECISION

| Item | Question |
| :--- | :--- |
| `backend_extended/` (15-field actor, `migration.mo`, BaseToCore helpers) | Documented dfx-only leftover. **Do not delete** — upgrade/compat reference. `dfx.json` points at **non-existent** `src/backend_extended/main.mo` (real folder is repo-root `backend_extended/`). Retarget `dfx.json` → `src/backend/main.mo` vs keep a broken path as a deploy guard. |
| `src/backend/mixins/*`, `lib/types.mo`, `types/common.mo`, `types/chat.mo` | Unused by `main.mo`. Unused combat `EnemyConfig` template / unused `ChatMessage` (inlined in `main.mo`). Could be a future mixin split. |
| Unused shadcn `components/ui/*` | Game UI uses `sonner` + `alert-dialog` (+ `button` transitively). `ui-summary.json` / `components.json` are the Caffeine/shadcn catalog. |
| `InitiativeStrip` UI vs type | Extract `CombatantEntry` then delete the unused strip UI. |
| `GameFlow` `dungeonData` + WX `dungeon` prop | Always `null` after dungeon-editor removal. WX binds it as `_dungeon`. Removing the prop is an interface change. |
| Duplicate `DUNGEON_DOKA_MULTIPLIERS` | `useDungeonState.ts`, `portalRules.ts`, and `WorldExploration.tsx` each have the 1 / 1.5 / 2 / 2.5 / 3 / 4 table. Do not touch WX without a dedicated extract. |
| Duplicate camera / enemy-move constants | `gameConstants.ts` exports `_CAMERA_*` / `_ENEMY_MOVEMENT_*`; WX redeclares the same numbers. |
| `MAP_MODIFIER_*` in `gameConstants.ts` vs inline values in `mapModifiers.ts` | Comments say sourced from `gameConstants`; engine copies the numbers locally. |
| `ENEMY_AI_TIER_GATES` | Exported, zero importers. Comment in `enemyAI.ts` notes the table has no wounded-sacrifice entry. Planned gates vs dead scaffold. |
| `BoostToggle.tsx` + App → GameFlow `boostMode` / `onBoostToggle` | Component never mounted. App still passes the props; GameFlow discards them (`_boostMode`). WX owns a separate `boostMode` (setter unused, so always `"xp"`). Wire the pill vs delete the feature UI. |
| `engine/summonAI.ts` (`runSummonAI`) | ~600-line pure dispatcher, never imported. Live summon turns use `enemyAI.decideSummonAction` / `summonExecutor`. Documented as the intended React-free path (`handleSummonTurn` was never added). Wire vs delete in a dedicated PR. |
| `utils/oneShotCredit.ts` | Test-only. Production pickups use `dokaPersist.ts`. |
| `utils/absoluteStatsClamp.ts` | Test-only. Intended guard before `saveBattleStats`; not wired. |
| `DEFAULT_GAME_CONFIG` | Unused named default. Same 10 / 40 / 5 fallbacks are inlined in `useAdminQueries`, Admin, WX, and mocks. Consolidate vs leave as documentation. |
| `src/backend/mops.toml` moc 1.9.0 vs root 1.11.2 | Documented stale nested pin. |
| Root `mops.toml` `[dependencies] ic = "4.2.0"` | No `mo:ic` import in backend `.mo` files. |
| `src/backend/system-idl/aaaaa-aa.did` | **Not** imported by current `main.mo` (2026-08-31 audit claim is stale). Keep until Caffeine/mops toolchain need is proven. |
| `ChatPanel` import of `ChatMessage` from `backend.d.ts` | Parallel bindgen surface. Same type exists on `backend.ts` / `declarations/`. |
| `src/frontend/biome.json` ignore `src/declarations/**` | Actual bindgen path is `src/frontend/src/declarations/`. Harmless mis-path today. |

## Not found

- Obsolete `FEATURE_*` / unused `VITE_*` / `ENABLE_*` env flags (besides live `VITE_USE_MOCK`).
- Stale frontend bindgen vs `src/backend/dist/backend.did` (12-field stats still agree).
- Commented-out replacement implementations that were safe to strip as a block.
- New leftover `engine/` copies at repo root (the 2026-08-31 `deathPipeline.ts` duplicate stayed gone).

## Re-verified from 2026-08-31 (unchanged class)

`backend_extended/`, root `declarations/`, mixins / `types/common.mo` / `types/chat.mo`, shadcn kit, `InitiativeStrip` + `CombatantEntry`, dungeon prop, duplicate dungeon/camera tables.

**Doc correction:** `src/backend/system-idl/aaaaa-aa.did` is not referenced by live `main.mo`. Reclassified from “required because main.mo calls `actor "aaaaa-aa"`” to **NEEDS HUMAN DECISION**.

## Validation

After cleanup: `bash scripts/caffeine-import-gate.sh all` (`pnpm typecheck`, `pnpm check`, `mops check`).
