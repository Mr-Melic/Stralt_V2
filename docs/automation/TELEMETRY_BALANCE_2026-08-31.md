# Telemetry-Driven Balance & Content Analyst — 2026-08-31

**Analyst:** Telemetry-Driven Balance & Content Analyst (`2786666f-a4a0-11f1-a7d1-d6b4613131ce`)  
**This run:** `bc-9825c839-aa6b-453d-a17c-9e4ed71f0dbf` (cron `0 */24 * * *`, triggered 2026-08-31 00:04 UTC)  
**HEAD inspected:** `22503b5` (`fix: keep generated maps solvable across seeds (#110)`)  
**Gameplay / balance code:** not modified.

## STATUS: WAITING_FOR_TELEMETRY

Activation guard fired. Real gameplay telemetry is **absent**. This run does **not** invent measurements, does **not** infer win rates or spell strength from source, and does **not** produce OVERPERFORMING / UNDERPERFORMING / DIFFICULTY_* / exploit classifications.

No Master Technical Director balance packet is emitted. The only durable outputs are this report and ACTION_IDs in [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md).

---

## Classification of statements

| Kind | This run |
| :--- | :--- |
| **OBSERVED FACT** | Infrastructure search results below. Prior Quality Auditor finding that player telemetry is none. ACTION_ID `AQA-2026-08-30-012` is still unimplemented on `main`. |
| **HYPOTHESIS** | None about player behavior, enemy difficulty, spell strength, economy, or content discovery. |
| **RECOMMENDATION** | Keep this analyst in `WAITING_FOR_TELEMETRY` until the measurement set exists and is populated. Human-design backend-authoritative event counters before any later run claims a balance finding. |

---

## Evidence sources (what was actually checked)

| Source | Result |
| :--- | :--- |
| Repo glob `**/*telemetry*` | **0 files** |
| Repo glob `**/*.{csv,jsonl,parquet}` | **0 files** |
| Workspace grep `telemetry` / `analytics` / `metrics` in `*.{md,ts,tsx,mo,json}` | Hits only in this folder’s 2026-08-30 Quality Auditor docs, plus one **comment** in `WorldExploration.tsx` (not a collector) |
| `src/` grep for PostHog, Mixpanel, Sentry, Amplitude, Segment, Plausible, Umami, GA4, `trackEvent`, `eventLog`, `metricsStore` | **No collector.** `pulseAmplitude` in `StarfieldBackground.tsx` is a render parameter. |
| GitHub code search `repo:Mr-Melic/stralt telemetry OR analytics OR trackEvent OR posthog OR mixpanel` | **0 files** |
| GitHub PR search `telemetry OR analytics OR metrics OR balance report` | No telemetry PRs (title noise only: leftover XP, Boss Rush wallet, strike range) |
| `docs/ARCHITECTURE.md` | Persistence table lists characters, Doka, profiles, buffs, achievements, Boss Rush, dungeon records, config. **No event / analytics store.** |
| Prior Quality Auditor (`docs/automation/QUALITY_AUDIT_2026-08-30.md`) | “Player telemetry: **None.**” Sample size of players unknown. |
| Live canister query / exported dumps / dashboard | **Not present** in this environment. No telemetry export path to query. |

`getLeaderboard`, `killCount`, current Doka, spell-bar snapshots, achievement flags, Boss Rush best room, and dungeon depth are **progress snapshots**, not telemetry. This run does not treat them as win/loss, duration, death-cause, or usage series.

---

## Domain coverage (required measurements — all missing)

| Analysis domain | Collector present? | Rows observed | Verdict |
| :--- | :--- | :--- | :--- |
| Enemy win / loss | No | 0 | Missing |
| Relative enemy difficulty | No | 0 | Missing |
| Battle duration | No | 0 | Missing |
| Death causes | No | 0 | Missing |
| Spell usage | No | 0 | Missing |
| Spell discovery | No | 0 | Missing |
| Discovery sources | No | 0 | Missing |
| Spell combinations | No | 0 | Missing |
| Boss completion | No | 0 | Missing |
| Challenge completion | No | 0 | Missing |
| Doka earned / spent | No series (wallet is an absolute Nat) | 0 events | Missing |
| Dungeon performance | No | 0 | Missing |
| Content usage | No | 0 | Missing |

There is no sample size, so confidence for any balance label is **N/A**.

---

## Finding (infrastructure only)

ANALYSIS_ID: TBC-F-2026-08-31-001  
OBSERVATION: Gameplay telemetry infrastructure is absent. The only “telemetry” string in product code is a comment that surfaces `action.intent` for a hypothetical caller. The Quality Auditor already recorded the same gap (`AQA-2026-08-30-012`).  
DATA: Search results in the table above. HEAD `22503b5`. No event schema, no ingest, no export.  
SAMPLE_SIZE: 0 player sessions; 0 battles; 0 spell casts; 0 deaths; 0 Doka ledger rows.  
CONFIDENCE: HIGH (absence of collectors and datasets is directly observed).  
POSSIBLE_EXPLANATIONS: Telemetry was never specified; product is pre-instrumentation; `AQA-2026-08-30-012` has not been implemented.  
RECOMMENDED_ACTION: Do not change enemy stats, spells, XP, Doka, or content weights. Do not infer balance from source. Implement the human-designed measurement set below (ACTION_ID `TBC-2026-08-31-002`) and keep this analyst gated until rows exist.  
NEEDS_MORE_DATA: YES — every analysis domain.

No OVERPERFORMING, UNDERPERFORMING, UNDERUSED, OVERUSED, DIFFICULTY_SPIKE, DIFFICULTY_COLLAPSE, CONTENT_NOT_DISCOVERED, POSSIBLE_EXPLOIT, or HEALTHY_VARIATION labels are assigned.

---

## Required measurements (for the next run that is allowed to analyze)

Backend-authoritative, append-only (or query-aggregable) events. Do not derive these from `updateCharacter` snapshots or from reading combat code. Counters that touch Doka / XP must enqueue on `createProgressPersist` or be query-only (see `AQA-2026-08-30-012`).

Stralt has **no player level cap**. All events must carry `playerLevel` and content id so later analysis is **relative** (vs peers at similar level / vs that enemy’s own history), not vs a fictional endgame band.

### Minimum event set

1. **Battle outcome** — `battle_end`: encounter id, enemy/boss/challenge ids, result (`win` / `loss` / `flee` / `abort`), duration ms, player level, map/region/dungeon depth, death cause enum if loss (combat / reflect / lava / spikes / modifier / other — explicit metadata, not name heuristics).
2. **Enemy / boss identity** — stable config id on every `battle_end` and kill credit. Needed for relative difficulty (win rate and duration vs that id, sliced by player-level band).
3. **Spell cast** — `spell_cast`: spell id, level, encounter id, outcome tag if known (hit / miss / resist / no-target). Usage ≠ power.
4. **Spell discovery** — `spell_discovered`: spell id, source enum (achievement / drop / shop / admin / other). Required so low usage is not labeled UNDERPERFORMING.
5. **Spell bar snapshot (optional, low rate)** — `spell_bar_set`: ordered ids. Combinations come from co-presence on a bar *plus* co-casts in one encounter — not from source spell lists.
6. **Challenge completion** — `challenge_end`: challenge id, success/fail, damage/AP credited flags already required by architecture (`recordChallengeDamageTaken` / `recordChallengeApSpend`).
7. **Doka ledger** — `doka_delta`: signed amount, reason (`applyRewards` / `upgradeSpell` / shop / heal / death_penalty / achievement / purchase / admin). Wallet Nat alone is not earned/spent telemetry.
8. **Dungeon / Boss Rush step** — `dungeon_step` / `boss_rush_room`: depth or room, result, duration.
9. **Content exposure** — `content_seen`: portal type / region / shop SKU / recap shown. Distinguishes CONTENT_NOT_DISCOVERED from UNDERUSED.
10. **Quality counters already requested** — persist-ok / persist-fail, death-penalty applied, victory paid, recap open/dismiss, shop credit committed (`AQA-2026-08-30-012`). Complementary, not a substitute for items 1–9.

### Adequacy gate (next analyst run)

Do **not** leave `WAITING_FOR_TELEMETRY` unless **all** of the following are true:

- Collectors 1–9 exist in the live actor (or an exported store fed by that actor), not only in a design doc.
- At least one complete UTC day of events is queryable.
- Per-entity sample sizes are stated; if N is too small for a claim, the claim stays `NEEDS_MORE_DATA`.
- Low spell usage is cross-checked against discovery source, rarity, and exposure before any UNDERPERFORMING label.

Suggested (not current) floors once data exists: ≥30 `battle_end` rows per enemy id before a relative-difficulty claim; ≥50 `spell_cast` rows per spell id before OVERUSED/UNDERUSED; discovery + exposure counts before CONTENT_NOT_DISCOVERED. These floors are methodology, not observations.

---

## Explicit non-actions

- No enemy HP / damage / AP / MP / init edits.
- No spell cost, damage, or rarity edits.
- No XP / Doka curve edits.
- No content weight or spawn-table edits.
- No “balance conclusion from code review.”

Feed to Master Technical Director: **STATUS WAITING_FOR_TELEMETRY** + ACTION_IDs `TBC-2026-08-31-001` and `TBC-2026-08-31-002`. Do not schedule balance implementation from this run.
