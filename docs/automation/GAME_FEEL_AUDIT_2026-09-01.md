# Game Feel & Combat Feedback Audit — 2026-09-01

**Director:** Game Feel & Combat Feedback Director (`078e61d4-a49f-11f1-a7d1-d6b4613131ce`)  
**Run:** `bc-f3a08e41-bf43-43ae-8904-5093e7f298f9`  
**Schedule:** cron `0 */48 * * *` (second ledger; first was 2026-08-31 / #149)  
**HEAD inspected:** `dd275aa` (`Merge pull request #182`)  
**Telemetry:** still none in production. DEV-only `recordClickOutcome`. AQA-2026-08-30-012 remains unshipped. Treat telemetry as **absent**, not a clean bill of health.

This is distinct from general UX. The question is whether important actions communicate **what happened, why, what changed, and whether another action is possible**, through ANTICIPATION → ACTION → IMPACT → RECOVERY → INFORMATION.

Do not implement gameplay to chase engagement metrics. This run implemented only presentation-only corrections (walk-reject floats, leftover reject copy, unused `level_up` sound). Everything else is ACTION_IDs.

---

## Prior ledger status

| ID | Title | Status this run |
| :--- | :--- | :--- |
| GFCF-2026-08-31-001 | Screen-space juice anchors | **Shipped** (#149) |
| GFCF-2026-08-31-002 | Player-facing reject copy | **Shipped** (#149); this PR maps leftover barrier tokens + tile-miss `"invalid target"` |
| GFCF-2026-08-31-003 | `applyDamageToEnemy` IMPACT juice | **Still open.** Highest remaining unique P0. Not auto-implemented (MEDIUM double-spawn risk) |
| GFCF-2026-08-31-004 | Draw armed hit-flash | **Still open.** `getHitFlashAlpha` still has zero render call sites |
| GFCF-2026-08-31-005 | Hit-stop `timeScaleRef` | **Still deferred.** RAF freeze |
| GFCF-2026-08-31-006 | Walk reject floats | **Implemented this PR** |
| GFCF-2026-08-31-007 | In-battle feats on recap | **Shipped** (#159 / `recapUnlocks.ts`) |
| GFCF-2026-08-31-008 | `level_up` sound + banner | **Partial this PR** — sound on victory / Boss Rush when level increases. Recap still has no “LEVEL UP” chrome. Curve owned by merged #108/#138 |
| GFCF-2026-08-31-009 | Phase-2 banner | **Still open.** Log-only; encounter banner exists at WX ~18401 (1.5s) |
| GFCF-2026-08-31-010 | Walk-path overlay | **Still open** |
| GFCF-2026-08-31-011 | Label non-weapon damage | **Still open.** Lava/spikes still log-only (WX ~12007 / ~12047) |
| GFCF-2026-08-31-012 | Status-pill duration digits | **Still open.** Emoji-only pills at WX ~8876 / ~8992 |
| GFCF-2026-08-31-013 | Visible Death Realm wait | **Still open.** 1.5s timer still invisible; HP restored immediately |
| GFCF-2026-08-31-014 | `triggerVfx` heal no-op | **Still open.** WX `triggerVfx: () => { /* no-op */ }` |
| GFCF-2026-08-31-015 | Feel-telemetry | **Still deferred** to AQA-2026-08-30-012 |

Do not reopen recap XP `level * 100`. Do not wire hit-stop. Do not invent feel-telemetry.

---

## Telemetry

| Signal asked for | Status | Alternative explanation |
| :--- | :--- | :--- |
| Spells selected then cancelled | **No series.** DEV click traces only | Cancel may be the intended “deselect to walk” mode switch (`shouldClearSpellAfterApSpend`) |
| High flee in particular encounters | **No series** | Flee UI may simply be unused |
| Abandonment around boss phases | **No series** | Phase change is still log-only |
| Discovered spells rarely used | **No discovery layer** | Spellbook still shows all `allSpells` |
| Repeated illegal-action attempts | DEV `recordClickOutcome` only | Walk rejects were silent (now float). Attack-mode empty clicks still silent |
| Long turns around certain mechanics | **No series** | 30s turn timer exists; no per-mechanic duration |
| Sharp behaviour after a mechanic release | Cannot attribute | Same-week automation burst; no player population |

**Rule:** do not change balance or rarity from these gaps.

---

## Interaction matrix (re-read on `dd275aa`)

| Interaction | Anticipation | Action | Impact | Recovery | Information | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Movement | Hover MP is Manhattan, not path | Click → `findPath` same frame | 600ms path | Camera follows | Gold tile; **no path polyline**. Battle walk rejects now float | Weak anticipation; ACTION clearer |
| Tile selection | Hover pulse (walk green / spell blue) | Click gold tint | Immediate | — | Hazard tiles suppress clicked gold | Mostly clear |
| Spell selection | Footer/panel highlight; blue range | Ref + version bump | Range tiles | Auto-clear on 0 AP | No AP-empty flash on the button | Clear enough |
| Target highlight | Hover `-dmg` on enemy | Live entity-first gate | Cast or float | — | Hover ignores crit; no AoE ring | Anticipation incomplete |
| Valid / invalid | Blue/green tiles | Float text | — | — | Spell rejects mapped (incl. barriers this PR). Walk rejects float this PR. Attack-mode no-spell and world unreachable still silent | Better; two holes left |
| Damage | Hover `-dmg` | Sounds on spell path | Juice only on `enemyTakesDamage` | 900ms fade | Primary `applyDamageToEnemy` still skips numbers/flash/shake | **Primary hits still mute** |
| Healing | — | HP bar | `triggerVfx` still no-op; numbers on player when `heal()` runs | — | Drain heal is log-only | Weak |
| AP/MP spend | Hover MP; AP bars 0.3s | Immediate decrement | — | Mode switch to walk at 0 AP | No `-N AP` float. Vitals orbs now bind live caps (#181-era HUD) | HUD only |
| Crits | Hover uses non-crit `computeDamage` | `critical_hit` sound | Hitstop/shake only if `enemyTakesDamage` | — | Crit `!` unused on main spell path | Sound without punch |
| Enemy death | — | Shatter + log | Leader 36 gold particles + banner | 350ms fragments | Screen-space shatter from #149 | Leader > regular |
| Player death | HP bar | Recap + 1.5s timer | Toast after teleport | Death Realm | Timer invisible; body looks alive | Modal, not a moment |
| Summons | Lifespan `⏳N` | One-frame puff + cast SFX | Death pipeline | — | No spawn float | Weak spawn |
| Statuses | Inspect chips | Emoji pills (4 + overflow) | Log on tick/expiry | — | No remaining-turns on canvas | Readable but thin |
| Spell observation | Hover dmg + inspect | — | — | — | No “you were hit by X” toast | Log / inspect only |
| Spell discovery | Full spellbook | — | — | — | No unknown-spell fog | Product gap |
| Level-up | Recap XP bar (curve correct) | — | **`level_up` now plays** when recap level > pre-grant | — | Recap still says “Level N” with no LEVEL UP state | Sound yes; banner no |
| Achievement | Toast in world | In-battle queued | Recap section wired (#159) | 4s toast | Payload `newlyUnlockedAchievements` | Fixed |
| Boss phases | Encounter banner on *entry* | Log `PHASE 2!` | Stat/HP change | — | Easy to miss in log scroll | Weak climax |
| Victory | Recap immediate (persist async) | `battle_end` SFX | Overlay; canvas ignored while open (#166) | 1s XP bar | Feats wired; XP bar leftover-correct | Solid shell |
| Rewards | Recap Doka/XP | Persist lock | Doka float on pickup | — | Recap heal allowed (`pointerEvents`) | Shell good |

---

## Highest-impact disconnected systems (unchanged)

1. **`applyDamageToEnemy` never calls EffectsManager.** Player spells play hit/crit *sound* and write the log. Bounce / DoT / helper damage uses `enemyTakesDamage`, which *does* spawn juice. Same hit, two feels.

2. **`getHitFlashAlpha` has zero render call sites.** Flash is armed and expires unused.

3. **`triggerHitStop` is inert.** RAF uses `tick(16)` and never reads `timeScaleRef`. Do **not** implement here.

4. **Lava / spikes / reflect / shield** still move HP without a canvas source label.

5. **Phase 2** still has no reuse of the 1.5s encounter banner.

---

## Implemented this run (presentation only)

- `engine/walkRejectCopy.ts` — `No MP` / `Can't walk there` / `Can't reach` / `Not enough MP`.
- WorldExploration mouse + touch walk branches float those reasons (no `findPath` / duration change).
- `engine/rejectCopy.ts` — `ground_barrier`, `line_blocked_barrier`, `line_los_blocked`, `barrier_tile`.
- Tile-miss / self-tile leftovers now use `playerFacingRejectReason` instead of lowercase `"invalid target"`.
- `engine/rewardFeel.ts` — play `level_up` once when victory or Boss Rush recap level increased.

Not touched: RAF loop, map generation, turn logic, damage math.

---

## Open drafts that already own a feel surface

| PR | Theme | Director action |
| :--- | :--- | :--- |
| #183 | Death-penalty replay after portal / Doka credits | Persist, not juice. Do not fork. |
| #180 | Doka / shop races | Persist. Do not fork. |
| #174 | Candid / admin rollback | Bindings. Do not fork. |
| #173 | Persist / helper tests | Tests. Do not fork. |

#108 / #138 leftover-XP HUD: **merged**. #149 juice + reject copy: **merged**. #159 feat recap: **merged**. #166 recap-vs-canvas: **merged**.

---

## ACTION_ID ledger

See `docs/automation/ACTION_IDS_2026-09-01.md`. Prior IDs remain in `docs/automation/ACTION_IDS_2026-08-31.md`.
