# Dead-code / legacy-drift audit — 2026-08-31

**Automation:** cron `0 */48 * * *` (`d449111b-a487-11f1-a7d1-d6b4613131ce`)  
**HEAD inspected:** `22503b5` (`fix: keep generated maps solvable across seeds (#110)`)  
**Gameplay / RAF / mapGen / turn / damage math:** not modified.

This pass classifies candidates. Only **SAFE TO REMOVE** items with high confidence were deleted. Static “no callers” was not enough — each item was checked for dynamic import, bindgen/dfx output, migrations, deployment wiring, and intentional docs/reference.

## Removed this run (SAFE TO REMOVE)

| Item | Why high confidence |
| :--- | :--- |
| `engine/deathPipeline.ts` (repo root) | Byte-for-byte duplicate of live `src/frontend/src/engine/deathPipeline.ts`. Not in any tsconfig. No imports. Docs’ `engine/deathPipeline.ts` means the frontend module. |
| Stub components: `BattleMode`, `DungeonSetup`, `DungeonCreator`, `DesktopDPad`, `DPad`, `WeatherCanvas`, `SpellVFX`, `RoomSelector`, `RoomEditor`, `ObjectPalette` | Comments said “dead / stub for safe imports.” No static or `import()` callers. Only lazy import in the app is `AdminDashboard`. |
| `SmallScreenWarning.tsx` | Full overlay unused. `App.tsx` already inlines `SmallScreenGuard`. |
| `StatMeters.tsx` + `.stat-gem-*` CSS | No imports. Classes existed only in that file + `index.css`. Live HUD is `BattleUIPanel` / `StatPopup`. |
| `types/dungeon.ts` | Dungeon-editor types (`Room`, `ObjectTool`). Zero importers. Live chain type is `gameTypes.DungeonChainState`. |
| Unused `PostBattleRecap` default import in `WorldExploration.tsx` | Recap mounts in `App.tsx`. WX only needed the `BattleRecapData` type. |
| Unused `_handleDungeonComplete` in `GameFlow.tsx` | Never called. `dungeonData` still passed through (see human-decision list). |

## Left in place

### LEGACY BUT REQUIRED

| Item | Why keep |
| :--- | :--- |
| `src/backend/migrations/` + `.old/src/backend/dist/backend.most` | Live mops migration chain / `check-stable`. `.old/` is gitignored but referenced by root `mops.toml`. |
| `src/backend/BaseToCore.mo` | Documented completed mo:base→mo:core marker (`AGENTS.md`). Not imported by `main.mo`. |
| `src/backend/lib/admin.mo`, `types/admin.mo` | Imported by canonical `main.mo`. |
| `src/frontend/src/backend.ts` + `src/frontend/src/backend.d.ts` + `src/frontend/src/declarations/` | Canonical bindgen (12-field `CharacterStats`, `killCount`, no `wp`/`wr`/`scp`). |
| `src/frontend/src/utils/debugLogger.ts` | Re-export shim; many engine/UI files still import it. |
| `src/frontend/src/hooks/useDungeonState.ts` | `getDungeonMultiplier` is tested. Hook export is a stub; table is live. |
| `src/frontend/src/components/InitiativeStrip.tsx` | Default component is unused, but `CombatantEntry` is the shared combatant type. |
| `src/backend/system-idl/aaaaa-aa.did` | Management-canister IDL; `main.mo` calls `actor "aaaaa-aa"`. |
| `src/backend/mops.toml`, `src/backend/caffeine.toml` | Nested caffeine/mops metadata. Stale moc pin vs root; still tooling. |
| `VITE_USE_MOCK` | Live local-dev flag (`useActor`). |
| `AI_*_ENABLED` constants | Live AI master toggles, not leftover flags. |

### STALE GENERATED ARTIFACT

| Item | Notes |
| :--- | :--- |
| Root `declarations/backend/` | 15-field snapshot (`wp`/`wr`/`scp`). Not imported. Frontend tsconfig `declarations/*` maps to `src/declarations`, not this tree. Default dfx output location — do not delete without a human retarget of dfx. Bindgen source of truth is `src/backend/dist/backend.did`. |

### NEEDS HUMAN DECISION

| Item | Question |
| :--- | :--- |
| `backend_extended/` (15-field actor, `migration.mo`, BaseToCore helpers) | Documented dfx-only leftover. **Do not delete** — upgrade/compat reference. `dfx.json` points at **non-existent** `src/backend_extended/main.mo` (real folder is repo-root `backend_extended/`). Retarget `dfx.json` → `src/backend/main.mo` vs keep a broken path as a deploy guard. |
| `src/backend/mixins/*`, `lib/types.mo`, `types/common.mo`, `types/chat.mo` | Unused by `main.mo`. Documented unused scaffolds / unused `EnemyConfig` combat template / unused `ChatMessage` (inlined in `main.mo`). Could be a future mixin split. |
| Unused shadcn `components/ui/*` (most of the kit) | Only `sonner` + `alert-dialog` (+ `button` transitively) are used by game UI. `ui-summary.json` / `components.json` are the Caffeine/shadcn catalog. |
| `InitiativeStrip` UI vs type | Extract `CombatantEntry` then delete the unused strip UI. |
| `GameFlow` `dungeonData` + WX `dungeon` prop | Always `null` after dungeon-editor removal. WX binds it as `_dungeon`. Removing the prop is an interface change. |
| Duplicate `DUNGEON_DOKA_MULTIPLIERS` | `useDungeonState.ts`, `portalRules.ts`, and `WorldExploration.tsx` each have the 1 / 1.5 / 2 / 2.5 / 3 / 4 table. Do not touch WX without a dedicated extract. |
| Duplicate camera / enemy-move constants | `gameConstants.ts` exports `_CAMERA_*` / `_ENEMY_MOVEMENT_*`; WX redeclares the same numbers. |
| `src/backend/mops.toml` moc 1.9.0 vs root 1.11.2 | Documented stale nested pin. |

## Not found

- Obsolete feature flags (no dead `FEATURE_*` / unused `VITE_*` besides the live mock actor).
- Stale frontend bindgen vs `src/backend/dist/backend.did` (12-field stats agree).
- Commented-out replacement implementations that were safe to strip as a block.

## Validation

After cleanup: `pnpm typecheck`, `pnpm fix`, `pnpm build` (see PR).
