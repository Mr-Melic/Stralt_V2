# Game Feel ACTION_IDs — 2026-09-02

**SOURCE_AUTOMATION:** Game Feel & Combat Feedback Director  
**Companion audit:** `docs/automation/GAME_FEEL_AUDIT_2026-09-02.md`

Prior IDs `GFCF-2026-08-31-001` … `015` live in `ACTION_IDS_2026-08-31.md`.  
`GFCF-2026-09-01-001` … `003` live in `ACTION_IDS_2026-09-01.md`.  
This file records this run’s implementations and **new unique** recommendations only. Do not re-open 003–005 / 008 remaining / 009–015 as NEW.

---

ACTION_ID: GFCF-2026-09-01-002  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Explain attack-mode clicks when no spell is selected  
CATEGORY: combat-feedback  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Mouse and touch battle handlers fell through to an empty else when `battleActionMode === "attack"` and no spell was selected (pre-fix `WX` ~10675 / ~11289). Footer Attack Nearest already titles `"Select a spell in Attack mode…"`. Post-fix: `SELECT_SPELL_COPY` at `WX` 10704 / 11350. Off-turn tile clicks now prefer `WAIT_FOR_TURN_COPY` (turn guard runs first).  
SYSTEMS_AFFECTED: `engine/rejectCopy.ts`; WorldExploration attack-mode empty branch only  
RECOMMENDED_ACTION: IMPLEMENT. Float `"Select a spell"` at `tileCenter`. One float, no modal, no gameplay change.  
AUTONOMY: IMPLEMENTED_THIS_PR  
DEPENDENCIES: none  
REGRESSION_RISK: LOW — copy only. Inspect still opens from the initiative chip, not canvas.  
VALIDATION_REQUIRED: Enter attack with no spell on the player turn; click a tile; one `"Select a spell"` float. Selecting a spell then clicking a target is unchanged. `rejectCopy.test.ts`.  
STATUS: IMPLEMENTED

---

ACTION_ID: GFCF-2026-09-01-003  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Float world-mode unreachable (non-adjacent empty path)  
CATEGORY: combat-feedback  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: World-mode click set `clickedTile` then `findPath`. Empty path only auto-stepped if Chebyshev-adjacent; otherwise the gold tint appeared and nothing walked. Distinct from battle-walk 006. Post-fix: `shouldFloatWorldUnreachable` (`walkRejectCopy.ts` 30) + `"Can't reach"` at `WX` 10738 / 11383. Self-tile stays quiet. Portal death-guard still returns before the path (`shouldBlockWorldMoveOntoPortal`) — owned by 013.  
SYSTEMS_AFFECTED: `engine/walkRejectCopy.ts`; WorldExploration world-mode click/touch  
RECOMMENDED_ACTION: IMPLEMENT. Float `"Can't reach"` when path is empty and the adjacent fallback does not apply. Do not change `findPath` or portal guards.  
AUTONOMY: IMPLEMENTED_THIS_PR  
DEPENDENCIES: GFCF-2026-08-31-006 copy  
REGRESSION_RISK: LOW — copy only. Adjacent floor still steps. Wall/void clicks still skip the floor branch.  
VALIDATION_REQUIRED: Click an isolated floor across a wall; float once; adjacent floor still steps; clicking self does not float. `walkRejectCopy.test.ts`.  
STATUS: IMPLEMENTED

---

ACTION_ID: GFCF-2026-09-02-001  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Explain off-turn canvas clicks after playerCastGate  
CATEGORY: combat-feedback  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `shouldAllowPlayerCastEntry` (`playerCastGate.ts`) landed after 09-01. Sprite-first leftover-spell hits returned with no float (`WX` pre-fix ~10228 / ~10309). Tile clicks already returned when `_entry?.type !== "player"` (`WX` 10388) with no reason. A selected spell on an enemy or summon turn looked like a dead canvas. BattleUIPanel already says `"Wait for your turn"`. Post-fix: `WAIT_FOR_TURN_COPY` on sprite enemy/self (mouse 10237 / 10326; touch 10990 / 11052) and the tile turn-guard (mouse 10393; touch 11105). End Turn button guard at `WX` 19047 left unchanged.  
SYSTEMS_AFFECTED: `engine/rejectCopy.ts`; WorldExploration sprite-first + tile turn-guard only  
RECOMMENDED_ACTION: IMPLEMENT. Float `"Wait for your turn"`. Do not change the gate.  
AUTONOMY: IMPLEMENTED_THIS_PR  
DEPENDENCIES: `playerCastGate.ts` (already shipped)  
REGRESSION_RISK: LOW — copy only. Summon-control still routes before this path. Recap / death clicks still return earlier.  
VALIDATION_REQUIRED: Select a spell; wait for an enemy turn; click an enemy sprite and an empty tile; one `"Wait for your turn"` each. Player-turn casts unchanged. `rejectCopy.test.ts`.  
STATUS: IMPLEMENTED

---

ACTION_ID: GFCF-2026-09-02-002  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Float controlled-summon walk rejects on the canvas  
CATEGORY: combat-feedback  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Player battle-walk floats `"Not enough MP"` / `"Can't reach"` (006). Controlled-summon walk (`WX` 10104–10116, mirrored on touch) logs `"Not enough MP"` to the battle log only and returns silently on empty path. The docked `SummonControlPanel` does not show a tile reason. Same INFORMATION question as 006, different actor.  
SYSTEMS_AFFECTED: WorldExploration summon-control click/touch walk branch  
RECOMMENDED_ACTION: Reuse `playerFacingWalkReject("not_enough_mp" | "unreachable")` at `tileCenter`. Do not change `findPath`, MP debit, or summon AI. Empty path + not adjacent → `"Can't reach"`.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: GFCF-2026-08-31-006; GFCF-2026-09-01-003 helper may be reused  
REGRESSION_RISK: LOW — copy only. Occupied / wall cases must not start a walk.  
VALIDATION_REQUIRED: Control a wolf; click a far tile with 0 leftover MP; one canvas float; log may stay. Adjacent legal walk unchanged.  
STATUS: NEW

---

ACTION_ID: GFCF-2026-09-02-003  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Canvas float when Paper Windstorm blows a spell off course  
CATEGORY: combat-feedback  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Player miss is a 30% `paperWindstormMiss` (`WX` 9608–9612) that only `logBattleEntry`s. Enemy miss is 50% when `range > 1` (`WX` ~16579 / ~16817), also log-only. Announce text still claims “reach halved” (`mapModifiers.ts` 249–257) while live code is a miss roll (PXA already owns the copy lie). IMPACT is missing: AP is spent, no number, no `"Missed!"`. Distinct from 011 (hazard HP source labels).  
SYSTEMS_AFFECTED: WorldExploration `paperWindstormMiss` + enemy AI miss branches; optional announce copy (PXA)  
RECOMMENDED_ACTION: One short `"Missed!"` (or `"Blown off course"`) float at the target tile. Do not change the 30%/50% rolls or range. Do not add extra particles.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: none for the float; PXA owns announce-text vs live miss  
REGRESSION_RISK: LOW for a single float. Do not add a modal or 1.5s banner — that would slow turns.  
VALIDATION_REQUIRED: Force the miss branch in a test double; one float; AP still spent; no second fizzle string.  
STATUS: NEW

---

ACTION_ID: GFCF-2026-09-02-004  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Potion / item use needs the same IMPACT as spell heals  
CATEGORY: combat-feedback  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `handleUseItem` (`WX` 3511–3554) restores HP / AP / MP and only `logItem`s. No `spawnDamageAtTile(..., "heal")`, no AP/MP float, no shield flash. Distinct from 014 (`triggerVfx` no-op on the spell-heal path) because potions never call `triggerVfx`. Player cannot see what changed except the HUD bar.  
SYSTEMS_AFFECTED: WorldExploration `handleUseItem`; existing `spawnDamageAtTile`  
RECOMMENDED_ACTION: For HP potions, spawn the existing green heal number at the player tile. For elixir/boots, a short `"+3 AP"` / `"+2 MP"` float is enough. No new VFX system. Do not change potion math or shop prices.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: GFCF-2026-08-31-001 (screen-space helper); 014 if a shared heal flash is drawn later  
REGRESSION_RISK: LOW — presentation on an already-committed item use.  
VALIDATION_REQUIRED: Use a health potion in battle; green number matches the log amount; wallet/item count still decrements once.  
STATUS: NEW

---

ACTION_ID: GFCF-2026-09-02-005  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Attack Nearest hotkey should float when AP is missing  
CATEGORY: combat-feedback  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Footer button `canAttackNearest` already requires `canAffordCastAp` (`WX` 18957) and disables. `attackNearestEnemy` still returns with no float when the same check fails (`WX` 17382). The `[S]` hotkey (`WX` 17425-era listener) bypasses the disabled button. Tile casts already float `"No AP!"`. Cooldown on this path already floats `"On cooldown"` (`WX` ~17302).  
SYSTEMS_AFFECTED: WorldExploration `attackNearestEnemy` only  
RECOMMENDED_ACTION: Float `"No AP!"` (same copy as tile `castResult === "no_ap"`) at the player tile. Do not enable the button. Do not change AP math.  
AUTONOMY: RECOMMEND  
DEPENDENCIES: none  
REGRESSION_RISK: LOW — copy on an already-failing return.  
VALIDATION_REQUIRED: Select a 4-AP spell with 1 AP left; press S; one float; no cast. Button stays disabled.  
STATUS: NEW

---

## Still open from 2026-08-31 / 09-01 (do not duplicate)

- **GFCF-2026-08-31-003** P0 — `onDamageJuice` on `applyDamageToEnemy` (skip bounce double-count). Highest remaining unique P0. MEDIUM risk — do not auto-implement.  
- **GFCF-2026-08-31-004** P0 — draw `getHitFlashAlpha` in the existing sprite pass (not RAF).  
- **GFCF-2026-08-31-005** P2 DEFER — hit-stop needs RAF exemption.  
- **GFCF-2026-08-31-008** remaining — recap LEVEL UP chrome (sound shipped).  
- **GFCF-2026-08-31-009** P2 — reuse `bossEncounterBanner` for PHASE 2 / Weeping Pawn promote.  
- **GFCF-2026-08-31-010** P2 — dashed walk-path overlay. Hover MP is still Manhattan.  
- **GFCF-2026-08-31-011** P2 — lava / spikes / reflect / shield / DoT / Sacrifice source labels.  
- **GFCF-2026-08-31-012** P2 — duration digit on status pills.  
- **GFCF-2026-08-31-013** P2 — “Entering the Death Realm…” for the existing 1.5s wait.  
- **GFCF-2026-08-31-014** P2 — map `triggerVfx("heal")` to flash + existing green number.  
- **GFCF-2026-08-31-015** P2 DEFER — no production feel-telemetry.
