# Game Feel & Combat Feedback Audit — 2026-09-02

**Director:** Game Feel & Combat Feedback Director (`078e61d4-a49f-11f1-a7d1-d6b4613131ce`)  
**Run:** `bc-800632e0-788b-4e77-b726-f7e0ae99d365`  
**Schedule:** cron `0 */48 * * *` (third ledger; 2026-08-31 / #149, 2026-09-01 / walk-reject + level_up sound)  
**HEAD inspected:** `58302bc` (`Merge pull request #258`)  
**Telemetry:** still none in production. DEV-only `recordClickOutcome`. AQA-2026-08-30-012 / GTAD collectors remain unshipped. Treat telemetry as **absent**, not a clean bill of health.

This is distinct from general UX. The question is whether important actions communicate **what happened, why, what changed, and whether another action is possible**, through ANTICIPATION → ACTION → IMPACT → RECOVERY → INFORMATION.

Do not implement gameplay to chase engagement metrics. This run implemented only presentation-only corrections (attack-mode / off-turn / world-unreachable floats). Everything else is ACTION_IDs.

---

## Prior ledger status

| ID | Title | Status this run |
| :--- | :--- | :--- |
| GFCF-2026-08-31-001 | Screen-space juice anchors | **Shipped** (#149) |
| GFCF-2026-08-31-002 | Player-facing reject copy | **Shipped** (#149); barrier tokens shipped 09-01 |
| GFCF-2026-08-31-003 | `applyDamageToEnemy` IMPACT juice | **Still open.** Highest remaining unique P0. Not auto-implemented (MEDIUM double-spawn vs bounce / `enemyTakesDamage`) |
| GFCF-2026-08-31-004 | Draw armed hit-flash | **Still open.** `getHitFlashAlpha` still has zero render call sites (`effects.ts` 331) |
| GFCF-2026-08-31-005 | Hit-stop `timeScaleRef` | **Still deferred.** RAF freeze |
| GFCF-2026-08-31-006 | Walk reject floats | **Shipped** (09-01) |
| GFCF-2026-08-31-007 | In-battle feats on recap | **Shipped** (#159 / `recapUnlocks.ts`) |
| GFCF-2026-08-31-008 | `level_up` sound + banner | **Partial.** Sound shipped. Recap header still `Level {currentLevel}` (`PostBattleRecap.tsx` 267 / 295) with no LEVEL UP chrome |
| GFCF-2026-08-31-009 | Phase-2 banner | **Still open.** Log-only at WX 15957; encounter banner still 1.5s on *entry* |
| GFCF-2026-08-31-010 | Walk-path overlay | **Still open.** Hover MP is still Manhattan (`WX` 10730-adjacent hover at 8574) |
| GFCF-2026-08-31-011 | Label non-weapon damage | **Still open.** Lava/spikes still log-only (`WX` ~11550 / ~11590) |
| GFCF-2026-08-31-012 | Status-pill duration digits | **Still open.** Emoji-only pills (`WX` 8321 / 8437) |
| GFCF-2026-08-31-013 | Visible Death Realm wait | **Still open.** 1.5s `armDeathGuards` (`WX` 13481) still invisible; HP restored immediately |
| GFCF-2026-08-31-014 | `triggerVfx` heal no-op | **Still open.** `WX` 9396 `triggerVfx: () => { /* no-op */ }` |
| GFCF-2026-08-31-015 | Feel-telemetry | **Still deferred** to AQA-2026-08-30-012 |
| GFCF-2026-09-01-001 | Barrier tokens + leftover invalid-target | **Shipped** (09-01) |
| GFCF-2026-09-01-002 | Attack-mode silent clicks | **Implemented this PR** |
| GFCF-2026-09-01-003 | World-mode unreachable float | **Implemented this PR** |

Do not reopen recap XP `level * 100`. Do not wire hit-stop. Do not invent feel-telemetry.

---

## Telemetry

| Signal asked for | Status | Alternative explanation |
| :--- | :--- | :--- |
| Spells selected then cancelled | **No series.** DEV click traces only | Cancel may be the intended “deselect to walk” mode switch (`shouldClearSpellAfterApSpend`) |
| High flee in particular encounters | **No series** | Flee UI may simply be unused |
| Abandonment around boss phases | **No series** | Phase change is still log-only (`WX` 15957) |
| Discovered spells rarely used | **No discovery layer** | Spellbook still shows all `allSpells` |
| Repeated illegal-action attempts | DEV `recordClickOutcome` only | Attack-mode / off-turn / world-unreachable were silent (floats this PR). Summon-control empty path and Attack Nearest no-AP hotkey still silent |
| Long turns around certain mechanics | **No series** | 30s turn timer exists; no per-mechanic duration |
| Sharp behaviour after a mechanic release | Cannot attribute | Same-week automation burst; no player population. `playerCastGate` and summon-control dock landed since 09-01 without canvas INFORMATION |

**Rule:** do not change balance or rarity from these gaps.

---

## What changed since 2026-09-01 (feel-relevant)

Integrity and persist work merged (#211–#258). None of it wired primary-hit juice, hit-flash draw, phase banners, or heal VFX.

New feel holes from those landings (not in the 08-31 / 09-01 unique NEW list):

1. **`shouldAllowPlayerCastEntry`** (`playerCastGate.ts`) now blocks sprite-first and Attack Nearest off the player turn. Tile clicks already returned when `_entry?.type !== "player"` (`WX` 10388). Both paths were **silent**. A leftover selected spell on an enemy turn looked like a dead canvas.
2. **Summon control dock** (`SummonControlPanel` + `WX` 10064). Player-walk rejects float; controlled-summon “Not enough MP” is **log-only** (`WX` 10114) and empty path is silent (`WX` 10116).
3. **Attack Nearest [S]** still returns with no float when `canAffordCastAp` fails (`WX` 17382) even though the footer button is disabled. Tile casts already float `"No AP!"`.

---

## Interaction matrix (re-read on `58302bc`)

| Interaction | Anticipation | Action | Impact | Recovery | Information | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Movement | Hover MP is Manhattan, not path (`WX` 8574) | Click → `findPath` same frame | 600ms path | Camera follows | Gold tile; **no path polyline**. Battle walk rejects float. World unreachable floats this PR | Weak anticipation; ACTION clearer |
| Tile selection | Hover pulse (walk green / spell blue) | Click gold tint | Immediate | — | Hazard tiles suppress clicked gold | Mostly clear |
| Spell selection | Footer/panel highlight; blue range | Ref + version bump | Range tiles | Auto-clear on 0 AP | No AP-empty flash on the button | Clear enough |
| Target highlight | Hover `-dmg` on enemy (`computeDamage` at `WX` 8243, non-crit) | Live entity-first gate | Cast or float | — | Hover ignores crit; no AoE ring | Anticipation incomplete |
| Valid / invalid | Blue/green tiles | Float text | — | — | Spell / walk / attack-mode / off-turn / world-unreachable now float. Summon-control empty path and Attack Nearest no-AP hotkey still silent | Better; two holes left |
| Damage | Hover `-dmg` | Sounds on spell path | Juice only on `enemyTakesDamage` | 900ms fade | Primary `applyDamageToEnemy` still skips numbers/flash/shake (`castHelpers.ts` 268–481; bounce at 442 is the juice path) | **Primary hits still mute** |
| Healing | — | HP bar | `triggerVfx` still no-op; numbers on player when `playerTakesDamage` / `heal()` runs | — | Drain heal is log-only. Potion `handleUseItem` (`WX` 3511) is log-only | Weak |
| AP/MP spend | Hover MP; AP bars 0.3s | Immediate decrement | — | Mode switch to walk at 0 AP | No `-N AP` float | HUD only |
| Crits | Hover uses non-crit `computeDamage` | `critical_hit` sound | Hitstop/shake only if `enemyTakesDamage` | — | Crit `!` unused on main spell path | Sound without punch |
| Enemy death | — | Shatter + log | Leader 36 gold particles + banner | 350ms fragments | Screen-space shatter from #149 | Leader > regular |
| Player death | HP bar | Recap + 1.5s timer | Toast after teleport | Death Realm | Timer invisible; body looks alive | Modal, not a moment |
| Summons | Lifespan `⏳N`; control dock | One-frame puff + cast SFX | Death pipeline | — | No spawn float. Control-walk rejects log-only | Weak spawn; control weaker than player walk |
| Statuses | Inspect chips | Emoji pills (4 + overflow) | Log on tick/expiry | — | No remaining-turns on canvas | Readable but thin |
| Spell observation | Hover dmg + inspect | — | — | — | No “you were hit by X” toast. Paper Windstorm miss is log-only (`WX` 9608) | Log / inspect only |
| Spell discovery | Full spellbook | — | — | — | No unknown-spell fog | Product gap (PXA) |
| Level-up | Recap XP bar (curve correct) | — | **`level_up` plays** when recap level > pre-grant | — | Recap still says “Level N” with no LEVEL UP state | Sound yes; banner no |
| Achievement | Toast in world | In-battle queued | Recap section wired (#159) | 4s toast | Payload `newlyUnlockedAchievements` | Fixed |
| Boss phases | Encounter banner on *entry* | Log `PHASE 2!` (`WX` 15957) | Stat/HP change | — | Easy to miss in log scroll | Weak climax |
| Victory | Recap immediate (persist async) | `battle_end` SFX | Overlay; canvas ignored while open | 1s XP bar | Feats wired; leftover XP correct | Solid shell |
| Rewards | Recap Doka/XP | Persist lock | Doka float on pickup | — | Recap heal allowed (`pointerEvents`) | Shell good |

---

## Highest-impact disconnected systems (unchanged)

1. **`applyDamageToEnemy` never calls EffectsManager.** Player spells play hit/crit *sound* and write the log. Bounce / DoT / helper damage uses `enemyTakesDamage`, which *does* spawn juice. Same hit, two feels.

2. **`getHitFlashAlpha` has zero render call sites.** Flash is armed and expires unused.

3. **`triggerHitStop` is inert.** RAF uses `tick(16)` and never reads `timeScaleRef`. Do **not** implement here.

4. **Lava / spikes / reflect / shield / drain / Sacrifice** still move HP without a canvas source label on those paths.

5. **Phase 2** still has no reuse of the 1.5s encounter banner.

---

## Implemented this run (presentation only)

- `SELECT_SPELL_COPY` / `WAIT_FOR_TURN_COPY` in `engine/rejectCopy.ts`.
- Attack-mode empty branch (mouse `WX` 10704 / touch `WX` 11350) floats `"Select a spell"`.
- Off-turn sprite enemy/self and tile turn-guard (mouse `WX` 10237 / 10326 / 10393; touch `WX` 10990 / 11052 / 11105) float `"Wait for your turn"`.
- `shouldFloatWorldUnreachable` in `engine/walkRejectCopy.ts`. World-mode empty path (mouse `WX` 10738 / touch `WX` 11383) floats `"Can't reach"` when the Chebyshev-adjacent fallback does not apply. Self-tile stays quiet.
- Tests: `rejectCopy.test.ts`, `walkRejectCopy.test.ts`.

Not touched: RAF loop, map generation, turn logic, damage math.

---

## Open drafts that already own a feel surface

| PR | Theme | Director action |
| :--- | :--- | :--- |
| #259 | EOP / GameKey Motoko migration | Backend stables. No frontend overlap. Do not fork. |

#108 / #138 leftover-XP HUD: **merged**. #149 juice + reject copy: **merged**. #159 feat recap: **merged**. Persist PRs cited on 09-01 (#183/#180/#174/#173): **merged**. Only still-open PR at audit time is #259.

---

## ACTION_ID ledger

See `docs/automation/ACTION_IDS_GFCF_2026-09-02.md`. Prior IDs remain in `docs/automation/ACTION_IDS_2026-08-31.md` and `docs/automation/ACTION_IDS_2026-09-01.md`.
