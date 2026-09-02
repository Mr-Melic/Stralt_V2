# Dead-code / legacy-drift audit — 2026-09-02

**Automation:** cron `0 */48 * * *` (`d449111b-a487-11f1-a7d1-d6b4613131ce`)  
**HEAD inspected:** `58302bc` (`Merge pull request #258 from Mr-Melic/cursor/doka-gamekey-shop-46e6`)  
**Prior pass:** `docs/automation/DEAD_CODE_AUDIT_2026-09-01.md`  
**Gameplay / RAF / mapGen / turn / damage math:** not modified.

This pass classifies candidates. Only **SAFE TO REMOVE** items with high confidence were deleted. Static “no callers” was not enough — each item was checked for dynamic `import()`, bindgen/dfx output, migrations, deployment wiring, tests, sibling open-PR overlap, and intentional docs/reference.

## Removed this run (SAFE TO REMOVE)

Leftover CSS for components already deleted in the 2026-08-31 / 2026-09-01 audits. Zero `className` / dynamic-class hits in `src/frontend/src/**/*.ts(x)`. Live spell row is inline-styled in `BattleUIPanel`; live XP/HP bars use `dofus-xp-bar` / `stone-battle-hp-*`.

| Item | Why high confidence |
| :--- | :--- |
| `.isometric-tile`, `.dungeon-grid`, `.room-preview`, `.tool-button` definitions | Dungeon editor (`DungeonCreator` / `RoomEditor` / `ObjectPalette`) was removed 2026-08-31. No remaining className. Canvas already sets `image-rendering` on the `canvas` element. |
| `.dofus-spell-card*` | `SpellFooter.tsx` removed 2026-09-01. `BattleUIPanel` spell slots use inline styles, not these classes. |
| `.dofus-turn-timer*`, `.dofus-turn-indicator*` | Unused by `BattleUIPanel` (inline Tailwind timer) and by `InitiativeStrip` (`stone-well` / `stone-pill-*` only). |
| `.dofus-stat-value`, `.dofus-badge-red-accent` | Zero className hits. HUD uses inline `dofus-text-*` / `dofus-badge-gold`. |
| `.stone-bar-track` / `-fill` / `-fill-xp` / `-fill-blood` / `-label` / `-value` | Companion to deleted `StatMeters.tsx` (2026-08-31), same class as the `.stat-gem-*` cleanup. |
| `.stone-coin` | Unused. Live Doka HUD does not use this class. |
| `.stone-spell-tile*`, `.stone-spellbook-*`, `.stone-ap-badge`, `.stone-hotkey-badge`, `.stone-element-*`, `.stone-footprints` | SpellFooter / old spell-tile kit. Walk button uses a 👣 emoji, not CSS footprints. |
| `.stone-timer-well`, `.stone-timer-digits` | Unused LCD timer kit. |

**Left in `index.css` on purpose:** orphan `.dungeon-grid` / `.tool-button` selectors inside the `@media (max-width: 768px)` block (lines 683–707). PR **#286** (older in the merge queue) edits that same list to add `.stone-modal-close` and 16px inputs. Touching that hunk here would conflict; the selectors are no-ops without the deleted class definitions.

## Left in place

### LEGACY BUT REQUIRED

| Item | Why keep |
| :--- | :--- |
| `src/backend/migrations/` + `.old/src/backend/dist/backend.most` | Live mops migration chain / `check-stable`. Do not delete. |
| `src/backend/BaseToCore.mo` | Documented completed mo:base→mo:core marker (`AGENTS.md`). Not imported by `main.mo`. |
| `src/backend/lib/admin.mo`, `lib/adminGuard.mo`, `lib/gameKey.mo`, `types/admin.mo` | Imported by canonical `main.mo` (GameKey shop is live). |
| `src/frontend/src/backend.ts` + `backend.d.ts` + `src/frontend/src/declarations/` | Canonical bindgen (12-field `CharacterStats` with `killCount`, no `wp`/`wr`/`scp`). In sync with `src/backend/dist/backend.did`. |
| `src/frontend/src/utils/debugLogger.ts` | Re-export shim; engine/UI files still import it. |
| `src/frontend/src/hooks/useDungeonState.ts` | `getDungeonMultiplier` now **delegates** to `portalRules.dungeonDokaMultiplierFor` (no third copy in WX). Tests cover the helper. Stub `useDungeonState = () => ({})` kept for safe imports. |
| `src/frontend/src/components/InitiativeStrip.tsx` | Default UI unused, but `CombatantEntry` is the shared combatant type (14+ importers). |
| `src/backend/dist/backend.did` + `backend.most` | Canonical Candid / build artifact. Regen via bindgen; do not hand-edit. |
| `VITE_USE_MOCK` | Live local-dev flag (`useActor`). |
| `AI_*_ENABLED` constants | Live AI master toggles (all `true`), not leftover flags. |
| `calculateAndAwardDoka` | Unused public mint on the Candid surface. Must not be called from the official reward funnel. Keep the stub. |
| `engine/worldFeatures.ts` | Tests + `docs/WORLD_DYNAMICS.md` contract. |
| `utils/longHorizonSim.ts` | CLI/dev balance tool. |
| `engine/mapGen.simulate.ts` | Solvability test helper. |
| GameKey shop files | `dokaGameKey.ts`, `iapShopCopy.ts`, `itemShop.ts`, `DokaGameKeyShop.tsx`, `AdminGameKeyPurchases.tsx` — live after PR #258. |

### STALE GENERATED ARTIFACT

| Item | Notes |
| :--- | :--- |
| Root `declarations/backend/` | 14-field snapshot **with** `wp`/`wr`/`scp`, **no** `killCount`. Not imported. Frontend tsconfig `declarations/*` maps to `src/frontend/../declarations` (`/workspace/src/declarations`, missing) — a footgun if anyone starts using the alias. Default dfx output location — do not delete without a human retarget of dfx. Bindgen source of truth is `src/backend/dist/backend.did`. |
| Untracked root `frontend/public/assets/` | If present locally: screenshots + duplicate sprites. Not git-tracked. Live assets are `src/frontend/public/`. |

### NEEDS HUMAN DECISION

| Item | Question |
| :--- | :--- |
| `backend_extended/` (15-field actor, `migration.mo`, BaseToCore helpers) | Documented dfx-only leftover. **Do not delete** — upgrade/compat reference. `dfx.json` points at **non-existent** `src/backend_extended/main.mo` (real folder is repo-root `backend_extended/`). Retarget `dfx.json` → `src/backend/main.mo` vs keep a broken path as a deploy guard. |
| `src/backend/mixins/*`, `lib/types.mo`, `types/common.mo`, `types/chat.mo` | Unused by `main.mo`. Unused combat `EnemyConfig` template / unused `ChatMessage` (inlined in `main.mo`). Could be a future mixin split. |
| Unused shadcn `components/ui/*` | Game UI uses `sonner` + `alert-dialog` (+ `button` transitively). `ui-summary.json` / `components.json` are the Caffeine/shadcn catalog. |
| `InitiativeStrip` UI vs type | Extract `CombatantEntry` then delete the unused strip UI. |
| `GameFlow` `dungeonData` + WX `dungeon` prop | Always `null` after dungeon-editor removal. WX binds it as `_dungeon`. Removing the prop is an interface change. |
| Duplicate camera / enemy-move constants | `gameConstants.ts` exports unused `_CAMERA_*` / `_ENEMY_MOVEMENT_*` / unused `CAMERA_SMOOTHING_FACTOR`; WX redeclares the live numbers next to the RAF camera. Do not touch WX camera locals. |
| `MAP_MODIFIER_*` in `gameConstants.ts` vs inline values in `mapModifiers.ts` | Catalog unused; engine copies the numbers locally. Wire imports vs delete catalog. |
| `ENEMY_AI_TIER_GATES` | Exported, zero importers. Comment in `enemyAI.ts` notes the table has no wounded-sacrifice entry. Planned gates vs dead scaffold. |
| `BoostToggle.tsx` + App → GameFlow `boostMode` / `onBoostToggle` | Component never mounted (zero importers). App still passes the props; GameFlow discards them (`_boostMode`). WX owns a separate `boostMode` (setter unused, so always `"xp"`). Wire the pill vs delete the feature UI. |
| `engine/summonAI.ts` (`runSummonAI`) | ~600-line pure dispatcher, never imported. Live summon turns use `enemyAI.decideSummonAction` / `summonExecutor`. Wire vs delete in a dedicated PR. |
| `utils/oneShotCredit.ts` | Test-only. Production pickups use `dokaPersist.ts`. |
| `utils/absoluteStatsClamp.ts` | Test-only. Intended guard before `saveBattleStats`; not wired. |
| `DEFAULT_GAME_CONFIG` | Unused named default. Same 10 / 40 / 5 fallbacks are inlined in `useAdminQueries`, Admin, WX, and mocks. |
| `hooks/useShopQueries.ts` | Entire React Query wrappers (`useGetShopPackages`, `useInitiatePurchase`, `useGetPurchaseRecords`) have **zero callers**. Live checkout is `shopPurchase.ts` + `DokaGameKeyShop`. Backend `ShopPackage` / `initiatePurchase` Candid is still live. Drop wrappers vs keep as the official query API. |
| Unused barrel hook symbols | `useIsCallerAdmin`, `useAdminSetMapModifierChance`, `useSetBossPortalAssignment`, `useDokaAchievementTracker`, `useGetCharacter`, `useRenameCharacter`, `useBackendStatus`, `useSaveKillCount` — never invoked; wrap live Candid. App uses `useGetUserRole` instead of `useIsCallerAdmin`. |
| `src/backend/mops.toml` moc 1.9.0 vs root 1.11.2 | Documented stale nested pin. |
| Root `mops.toml` `[dependencies] ic = "4.2.0"` | No `mo:ic` import in backend `.mo` files. |
| `src/backend/system-idl/aaaaa-aa.did` | **Not** imported by current `main.mo`. Keep until Caffeine/mops toolchain need is proven. |
| `src/frontend/biome.json` ignore `src/declarations/**` | Correct relative to the frontend package (maps to `src/frontend/src/declarations/`). |
| Orphan `.dungeon-grid` / `.tool-button` media-query selectors | Kept to avoid overlapping PR #286’s 44px / 16px hunk. Clean up after #286 lands. |
| `.glow*` / `.animate-pulse-glow` / `.modal-backdrop` / `.cursor-grab*` / `.text-shadow` / unused `stone-pill-blue`/`purple` / unused `stone-stat-chip-orange`/`periwinkle`/`lightslate` / non-portal `.stone-popup` | Zero hits this pass, but they are generic design-kit utilities. Not deleted. |

## Not found

- Obsolete `FEATURE_*` / unused `VITE_*` / `ENABLE_*` env flags (besides live `VITE_USE_MOCK`).
- Stale frontend bindgen vs `src/backend/dist/backend.did` (12-field stats still agree; `killCount` present).
- Commented-out replacement implementations that were safe to strip as a block.
- New leftover `engine/` copies at repo root.
- Unused GameKey / item-shop modules (all live).

## Re-verified / corrected from 2026-09-01

`backend_extended/`, root `declarations/`, mixins / `types/common.mo` / `types/chat.mo`, shadcn kit, `InitiativeStrip` + `CombatantEntry`, dungeon prop, camera-constant duplicates, `summonAI.ts`, `BoostToggle`.

**Correction:** dungeon Doka multipliers are **no longer triplicated**. Single table in `portalRules.ts` (`dungeonDokaMultiplierFor`); `useDungeonState.getDungeonMultiplier` delegates; WX calls `dungeonDokaMultiplierFor` directly.

**New since last pass:** GameKey shop (PR #258) is live. Unused `useShopQueries` wrappers are a **new** human-decision item (parallel unused React Query path over still-live Candid packages).

## Validation

After cleanup: `bash scripts/caffeine-import-gate.sh all` (`pnpm typecheck`, `pnpm check`, `mops check`) and `bash scripts/open-pr-stack-compat.sh --self`.
