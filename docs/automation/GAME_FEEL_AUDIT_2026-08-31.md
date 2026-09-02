# Game Feel & Combat Feedback Audit — 2026-08-31

**Director:** Game Feel & Combat Feedback Director (`078e61d4-a49f-11f1-a7d1-d6b4613131ce`)  
**Run:** `bc-1587d4c7-46c8-44f1-8266-9e6f86dec851`  
**Schedule:** cron `0 */48 * * *` (first ledger from this automation)  
**HEAD inspected:** current `main` checkout on this branch  
**Telemetry:** none in production. DEV-only `recordClickOutcome` / click-trace. AQA-2026-08-30-012 already asked for outcome counters. This audit treats telemetry as **absent**, not as a clean bill of health.

This is distinct from general UX. The question is whether important actions communicate **what happened, why, what changed, and whether another action is possible**, through ANTICIPATION → ACTION → IMPACT → RECOVERY → INFORMATION.

Do not implement gameplay to chase engagement metrics. This run implemented only two presentation-only corrections (screen-space juice anchors + player-facing reject copy). Everything else is ACTION_IDs.

---

## Telemetry

| Signal asked for | Status | Alternative explanation |
| :--- | :--- | :--- |
| Spells selected then cancelled | **No series.** DEV click traces only | Cancel may be the intended “deselect to walk” mode switch (`shouldClearSpellAfterApSpend`) |
| High flee in particular encounters | **No series** | Flee UI may simply be unused |
| Abandonment around boss phases | **No series** | Phase change is log-only; players may miss it without leaving |
| Discovered spells rarely used | **No discovery layer** | Spellbook shows all `allSpells`; there is no fog-of-war to measure |
| Repeated illegal-action attempts | DEV `recordClickOutcome` only | Silent miss on out-of-range tiles (now floats “Out of range” on this PR) would have inflated retries |
| Long turns around certain mechanics | **No series** | 30s turn timer exists; no per-mechanic duration |
| Sharp behaviour after a mechanic release | Cannot attribute | Same-week automation burst; no player population |

**Rule:** do not change balance or rarity from these gaps.

---

## Interaction matrix

| Interaction | Anticipation | Action | Impact | Recovery | Information | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Movement | Hover MP label (Manhattan, not path) | Click → `findPath` same frame | 600ms path stepped | Camera follows | Gold clicked tile; **no path polyline** | Weak anticipation (cost can lie); no trail |
| Tile selection | Hover pulse (walk green / spell blue) | Click gold tint | Immediate | — | Hazard tiles suppress clicked gold | Mostly clear |
| Spell selection | Footer/panel highlight; blue range | Ref + version bump | Range tiles | Auto-clear on 0 AP | No AP-empty flash on the button | Clear enough |
| Target highlight | Hover `-dmg` on enemy | Live entity-first gate | Cast or float | — | Hover ignores crit; no player-target preview; no AoE ring | Anticipation incomplete |
| Valid / invalid | Blue/green tiles | Float text on many rejects | — | — | Sprite path showed **raw** `ground_los_blocked`; empty-tile miss was **silent** (fixed this PR). Walk unreachable / no MP still silent | Partial |
| Damage | Hover `-dmg` | Sounds on spell path | Juice only on `enemyTakesDamage` | 900ms fade | Primary `applyDamageToEnemy` skips numbers/flash/shake; leftover `(0,0)` anchors (fixed this PR) | **Primary hits feel mute** |
| Healing | — | HP bar | `triggerVfx` is a no-op; numbers were at origin (now on player tile) | — | Drain heal is log-only | Weak |
| AP/MP spend | Hover MP; AP bars 0.3s | Immediate decrement | — | Mode switch to walk at 0 AP | No `-N AP` float | HUD only |
| Crits | Hover uses non-crit `computeDamage` | `critical_hit` sound | Hitstop/shake only if `enemyTakesDamage` | — | Crit `!` kind unused on main spell path | Sound without punch |
| Enemy death | — | Shatter + log | Leader gets 36 gold particles + banner | 350ms fragments | Normal shatter was grid-space (fixed this PR) | Leader > regular |
| Player death | HP bar | Recap + 1.5s timer | Toast after teleport | Death Realm | Timer invisible; HP restored immediately so the body looks alive | Modal, not a moment |
| Summons | Lifespan `⏳N` | One-frame puff + cast SFX | Death pipeline | — | No spawn float; puff not animated | Weak spawn |
| Statuses | Inspect chips | Emoji pills (4 + overflow) | Log on tick/expiry | — | No remaining-turns on canvas; StatPopup key mismatch risk | Readable but thin |
| Spell observation | Hover dmg + inspect | — | — | — | No “you were hit by X” toast | Log / inspect only |
| Spell discovery | Full spellbook | — | — | — | No unknown-spell fog; #116 is admin design only | Product gap |
| Level-up | Recap XP bar | — | **`level_up` sound unused** | — | Recap threshold on `main` is `level * 100` (wrong). **#108 already drafts the curve fix — do not reopen** | Silent + lying bar |
| Achievement | Toast in world | In-battle queued | Recap section exists | 4s toast | `_newlyUnlockedInBattle` never passed from `App.tsx` | Unlock can vanish |
| Boss phases | Encounter banner on *entry* | Log `PHASE 2!` | Stat/HP change | — | Easy to miss in log scroll | Weak climax |
| Victory | Recap immediate (persist async) | `battle_end` SFX | Overlay | 1s XP bar | Achievements unwired; XP bar may lag persist | Solid shell |
| Rewards | Recap Doka/XP | Persist lock | Doka float on pickup | — | Recap heal allowed (`pointerEvents`); leftover XP theme owned by #108 | Shell good |

---

## Highest-impact disconnected systems

1. **`applyDamageToEnemy` (`castHelpers.ts`) never calls EffectsManager.** Player spells (the common path) play hit/crit *sound* and write the log. Bounce / DoT / helper damage uses `enemyTakesDamage`, which *does* spawn juice. The two paths feel different for the same hit.

2. **`getHitFlashAlpha` has zero render call sites.** Flash is armed and expires unused.

3. **`triggerHitStop` sets `timeScaleRef` to 0 for 75ms.** The RAF tick uses fixed `tick(16)` and never reads the scale. Do **not** implement here — AGENTS.md forbids RAF edits.

4. **Recap XP denominator on `main` is `level * 100`.** Canonical curve is `100 * 2^(N-1)` (`utils/xpCurve.ts`). Open draft **#108** already replaces this. This director does not duplicate it.

5. **In-battle achievements** collect into `_newlyUnlockedInBattle` and `PostBattleRecap` already renders them — `App.tsx` never passes the prop.

---

## Implemented this run (presentation only)

- `engine/combatJuice.ts` — spawn damage / death at `tileCenter`, not `(0,0)` or raw grid.
- `engine/rejectCopy.ts` — `ground_los_blocked` → “No line of sight”, etc.
- WorldExploration call-site wiring + “Out of range” float on spell-tile miss (mouse + touch).
- Tests: `combatJuice.test.ts`, `rejectCopy.test.ts`.

Not touched: RAF loop, map generation, turn logic, damage math.

---

## Open drafts that already own a feel surface

| PR | Theme | Director action |
| :--- | :--- | :--- |
| #108 | Leftover XP HUD + recap threshold | Cite only. Do not reopen. |
| #105 | Preview / live-cast unification | Targeting, not juice. Do not fork. |
| #116 | Spell / discovery / achievement *admin* design | Product, not in-combat observation. |

---

## ACTION_ID ledger

See `docs/automation/ACTION_IDS_2026-08-31.md`.
