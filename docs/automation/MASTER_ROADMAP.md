# Stralt Master Roadmap

**Director:** Stralt Master Technical Director (`0b92479e-a49e-11f1-a7d1-d6b4613131ce`)  
**Run:** 2026-09-02 00:03 UTC (daily cron)  
**This agent:** `bc-a7b3fff6-cf5d-40c4-9b9a-bfcde9471ba3`  
**HEAD inspected:** `58302bc` — `Merge pull request #258` (GameKey shop)  
**Prior director HEAD:** `dd275aa` (#182) at 2026-09-01 00:02 UTC  
**Gameplay / production code:** not modified.

This file is the living prioritized roadmap. ACTION_ID records for this run live in [`ACTION_IDS_2026-09-02.md`](./ACTION_IDS_2026-09-02.md). Prior director ledger: [`ACTION_IDS_2026-09-01.md`](./ACTION_IDS_2026-09-01.md) (polluted by TBC/LHIPS concatenation — do not append). Dump yard: [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md). Process audit: [`QUALITY_AUDIT_2026-08-30.md`](./QUALITY_AUDIT_2026-08-30.md).

## Evidence available this run

| Source | Status |
| :--- | :--- |
| `AGENTS.md`, `README.md`, `DESIGN.md`, `docs/ARCHITECTURE.md` | Read |
| Prior director roadmap (2026-09-01 00:02) | Read. Several P0 leftovers **landed**. Flock-halt **failed again**. |
| Orchestrators 00:00 / 06:00 / 12:00 / 18:00 (09-01) | Read. Unique display items they asked for mostly merged. Persist/map/combat leftovers they held were merged anyway. |
| Specialist reports (09-01) | Expansion, PX, long-horizon, telemetry balance/architecture/dashboard, spell admin, discovery, enemy/boss admin, world-encounter, visual assets, mechanic matrix, game feel, UX, admin UX/drift, dead-code, data-evolution, performance, enemy AI/elites/formations |
| Open ACTION_IDs | Hundreds still `NEW` across dated producer files. Reuse; do not mint twins. |
| Recent commits | `git log` `dd275aa` → `58302bc` (~62 merge commits; humans merged the 09-01 leftover queue **and** frozen surfaces) |
| Open drafts | **#259** (P0 EOP). During this run the 00:00 flock opened **#260–#273** (and still launching). Docs-only PRs are the intended specialist output. **Hold gameplay:** #265 (WX reject floats), #272 (GameKey bindgen — restack after #259). |
| Player telemetry | **Still none.** `longHorizonSim.telemetry.available === false`. TBC remains `WAITING_FOR_TELEMETRY`. No collectors in `src/backend`. |
| Same-hour flock (this minute) | **41** automations launched ~00:00 UTC 2026-09-02, including implementers (Approved Game Design, map integrity, combat parity, adversarial QA, security, persist, economy, complexity reduction, admin, expansion, AI, feel, telemetry dashboard). |

**Evidence classes used below**

| Class | Meaning |
| :--- | :--- |
| MEASURED PLAYER BEHAVIOUR | Live play counters. **None exist.** |
| DESIGN INTERPRETATION | Product rules in this prompt + `AGENTS.md` / `DESIGN.md` / specialist design docs |
| ENGINEERING EVIDENCE | Code on `58302bc`, tests, PR history, automation volume, GitHub #259 body (IC0503 trap) |

Telemetry is not allowed to set priority. Correlation is not causation. No CLEAR_POSITIVE_SIGNAL is claimed.

---

## What changed since the 09-01 director run (do not rediscover)

The 09-01 run asked: halt the flock; merge #183; write the reward-trust ADR; ignore-client `writeLevel`; rebase #180 helpers; re-freeze WX / mapGen / targeting.

**Integrity that landed (accept `main`; do not re-open):**

| Theme | Landed as |
| :--- | :--- |
| Death replay after portal / Doka-only credit | **#183** then **#255 / #256** (`resolvePendingDeathReplay` now applies unpaid 20/40 to the live snapshot; `cutConfirmed` blocks recut) |
| Live Doka ref / rename / shop rollback helpers | **#180** stacked then persist audits — `writeLiveDoka` / `creditLiveDoka` / `beginRename` are on `main` |
| `saveBattleStats` ignore client level | **IMPLEMENTED** — `main.mo` 2028–2032 `level = character.level` (MTD-2026-09-01-005) |
| Bindgen summon fields | **#174** path — `backend.ts` now has `isSummon` / `summonAI` / `summonLifespan` / `summonUnitDef` (SDA-2026-09-01-002) |
| Pacifist preview no longer mutates feat state | `getSpellRangeTiles` comment + no `applyHealBuffSideEffect` (MIMA-2026-09-01-003 preview half) |
| Recap dismiss vs in-flight credit | WX passes `victoryPersistPendingRef` into `shouldIgnoreWorldInputDuringRecap` (MIMA-2026-09-01-004 partial) |
| Controlled-summon dest occupancy / unseal | `applyControlledSummonWalk` → `resolveControlledSummonMoveDest` (`occupancy.ts` 358–388) — dest occupancy **yes**; hazard landing **no** |
| Shop 60s auto-complete | **SUPERSEDED** — `processPendingPurchases` is a no-op; paid Doka is `redeemGameKey` (#258) |
| Security shop proofs / Inf-HP summon / chat | #209 + later hardenings (`03644ac`, `3b9461a`) |
| Oldest-first open-PR stack CI | **#257** |
| Leftover walks / off-turn casts / CA islands | #243 #246 #250 class |
| Admin spriteUrl honesty | orchestrator 18:00 — copy says stored, not rendered |

**09-01 leftovers that are DONE:** MTD-2026-09-01-002 (#183), MTD-2026-09-01-003 (#180 helpers), MTD-2026-09-01-005 (`writeLevel`), AQA-005 (#173 stacked), SDA-2026-09-01-002 (bindgen summon fields).

**09-01 leftovers that are NOT done:**

| ID | Why still open |
| :--- | :--- |
| MTD-2026-08-31-001 / AQA-001 / AQA-002 | Flock repeated. **41** agents this hour. `996df6df` still not GetAutomation-visible. `1aa41c6c` still enabled. |
| AQA-008 | Clamps **and** ignore-client level exist. **No written ADR.** |
| AQA-006 / AQA-007 | mapGen 1,348 → **1,544**; WX 20,063 → **19,253** (shrank, but **49** WX commits since `dd275aa`; 198 since 08-24). Freeze still broken. |
| MIMA-001 | Swap (`WX` 9436–9448) still copies coordinates; no `applyBattleWalkHazards`. |
| MIMA-002 remainder | Occupancy/unseal landed; **no** lava/spike landing on summon walk (`occupancy.ts` 358; WX 10027–10031). |
| MIMA-2026-09-01-001 | Frozen/Slime preview uses `applyMpCost`; execute still `path.length` (WX 10663 / 11278). |
| MIMA-2026-09-01-002 | `findPath` (WX 4427–4493) still ignores `barrierTilesRef` and occupants. |
| MTD-2026-08-31-003 | HP/death still dual-written. Do not start a large extract this hour. |
| MTD-2026-08-31-004 | Design catalogs shipped (correct). Gameplay from those catalogs must stay frozen. Humans merged expansion-adjacent PRs (#185–#197 class) as docs; implementer flock is running **again**. |
| AQA-012 / TBC-* | Still no counters. Dashboard specialist running with nothing to display. |
| EXPANSION-PREREQ-A | `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` still passes `{ name, minLevel, maxLevel }` (WX 12035, 4680–4684, 558). |
| SDA-002 / 004 | `ownedSpells` is still starters ∪ filtered backend (`WX` 2371–2400). `shouldIncludeBackendSpellInLibrary` returns true whenever `usableByPlayer !== false` (`adminSafety.ts` 551–558). |
| MTD-005…008 | `saveKillCount` still unused (`useSaveKillCount` has no UI caller); admin DVA not a canister workflow; 30% random AI tier unchanged (`combatMath.ts` 34–50). |

**New P0 this run (not in 09-01 ledger):**

Caffeine `install_code` onto populated canister `cwofb-yqaaa-aaaap-qp45q-cai` trapped `RTS error: Memory-incompatible program upgrade` / IC0503. Root cause: **#258 stuffed GameKey stables into already-shipped `20260831_000000.mo` `NewActor`**. Empty `.old` check-stable still passed. Draft **#259** restores the frozen 20260831 actor and adds `20260901_000000.mo`. Until #259 merges **and is deployed**, GameKey source and the live canister disagree. Do not add more persistent `let`/`var` on `main.mo`.

---

## Seven-dimension evaluation

### 1. Correctness — official client much safer; landing + kits still lie

ENGINEERING: Death replay, live Doka refs, ignore-client level, and GameKey replacing 60s auto-complete closed the 09-01 persist cluster for the official client. Do not open a fourth persist rewrite.

Recurring defect class: **teleport landing.** Swap still skips occupancy and hazards (MIMA-001). Controlled-summon dest now goes through `isCellFree` + unseal, then writes HP-unaware `updateCombatant`. Local Attack-Nearest / LoS patches are no longer the bottleneck — **landing authority** still is.

Recurring defect class: **preview vs execute.** Frozen/Slime MP doubling is still highlight-only. `findPath` still clips barriers. Pacifist preview mutation is closed; summon-kill Pacifist policy is a product decision, not a twin PR.

Recurring defect class: **kit zone NaN.** Piece kits exist and grow at zone 1/2. Battle start still passes a LevelZone **object**. Every overworld enemy is zone-0. This is the cheapest unlock of “dynamic enemy spell pools” and it has survived two director cycles.

Recurring defect class: **EOP stables.** Stuffing maps into a frozen `NewActor` is a new failure mode. Local Motoko “just add the field” patches are **no longer sufficient**. The intervention is a later migration file + populated `check-stable` snapshot (#259). Do not perform a large persist refactor.

### 2. Player experience — honesty up, identity still incomplete

ENGINEERING: HUD leftover XP, recap feats, recap-under-credit input gate, admin spriteUrl copy, Buy Doka vs Items copy (#241), BuffShop `inventoryRef` consume, Pacifist preview. Those were unique; do not re-implement.

DESIGN (PXA + Expansion + Spell Admin, no player data): the player is still handed the live catalog on minute one. Enemy-observed discovery is **not implemented**. Achievement/challenge/boss rewards remain Doka/XP, not spells. Four map modifiers are announce-only stubs. Family HP multipliers still die at battle start (`calcEnemyMaxHp`). Enemies register still describes a different game than the three live melee hooks.

GameKey (#258) is a **real** PX/ops change: Mollie → admin approve → 120-char code → `redeemGameKey` on the persist lock. It is not expansion content. It is blocked on #259 deploy.

MEASURED: none. Do not claim spells are over/underused.

### 3. Technical health — hotspot + ledger + EOP

| Surface | Lines now | 09-01 director | Verdict |
| :--- | ---: | ---: | :--- |
| `WorldExploration.tsx` | 19,253 | 20,063 | Shrank (extraction) but 49 commits — freeze still broken |
| `AdminDashboard.tsx` | 8,035 | 7,737 | Grew (GameKey tab / honesty). No publish pipeline |
| `enemyAI.ts` | 2,583 | 2,582 | Frozen size; do not grow tonight |
| `main.mo` | 3,838 | 3,501 | GameKey + clamps; **unupgradeable** on live Caffeine until #259 |
| `mapGen.ts` | 1,544 | 1,348 | Freeze broken; freeze again |
| `progressPersist.ts` | 323 | 323 | Leave it |
| `targeting.ts` | 1,031 | 1,120 | Leave it |
| `deathPenalty.ts` | 597 | — | Leave it after #256 |

`docs/automation/ACTION_IDS_2026-09-01.md` was supposed to be the director ledger. TBC and LHIPS concatenated into the same file. AQA-003 is still **PARTIAL and harmful**. Producers already have dated files — use them. Director index = this roadmap + `ACTION_IDS_2026-09-02.md`.

Caffeine import gates (#182) plus stack-compat (#257) are process wins that should stay. #259 adds populated EOP `check-stable` — that is the missing half of the Motoko gate. Empty `.old` is **not** a live upgrade.

Stale paths remain documented, not live bugs: `dfx.json` → missing `src/backend_extended`; root `declarations/` 15-field snapshot; unused `src/backend/mixins/*`.

### 4. Content depth — over-specified, under-wired

Present on `main`: player-relative tier spawn, AI tiers 1–10, named boss kits, dungeon chain, Boss Rush (10 rooms), 9 challenges, feats, frontend catalog + GameKey shop.

Dead or contradictory vs core rules (DESIGN + ENGINEERING):

- `buildEnemyKit(..., currentMap.levelZone)` still passes an **object** → zone-0 kits forever.
- Summoner chance `0.12 + playerLevel * 0.02` saturates by the mid-40s.
- `pickEnemyLevelFromTiers` `maxTier = floor(999 / tierSize)` stops climbing.
- `computeAITier` still has a **30% fully random 1–10** roll (`combatMath.ts` 48–50).
- Dual spell catalogs (frontend starters vs canister `shadow_strike`…`void_collapse`).
- Admin adding a catalog spell still grants it to every player on hydrate (SDA-002).
- `worldFeatures.ts` still tests-only; no WX import.
- `ENEMY_AI_TIER_GATES` names still unused in `enemyAI.ts`.

Design specialists produced overlapping catalogs again on 09-01 (SDA, SDE, SPELL_DISCOVERY, EBA, ENEMY_AI, FORMATIONS, ELITE, WORLD_DYNAMICS, ENCOUNTER, VISUAL, SPELL_PROPOSALS). That is **expansion overlap**, not a license to implement. The 09-02 00:00 wave includes Approved Game Design Implementer, expansion, AI, spell mechanics, and dungeon encounters — default **hold**.

### 5. Long-term scalability — rules vs implementation

| Core rule | Implementation on `58302bc` |
| :--- | :--- |
| No character level cap | Yes (`applyRewards` Nat loop). HUD saturates at 48 (`LHIPS-2026-09-01-001`). |
| Increasing XP | Yes `100 * 2^(N-1)`. Practical wall ~level 15–22 on kill XP (DESIGN, not a bug to “fix” tonight). |
| Player-relative enemies | Yes until the 999-tier ceiling (PREREQ-B). |
| Progressively sophisticated enemies | Partial; 30% random tier + zone-0 kits undermine it. |
| Dynamic enemy spell pools | Boss phases yes; overworld = static piece kits stuck at zone 0. |
| Enemy-observed spell discovery | **Absent** |
| Achievement / challenge / boss spell unlocks | Rewards are Doka/XP |
| Backend-authoritative persistence | Wallet/XP/death yes (clamped; level pinned). Combat client-side. Achievement unlock still client-asserted. BuffShop potions still `${principal}_inventory`. GameKey redeem is canister-authoritative **in source**; live canister cannot take the wasm yet. |
| Optional owner-uploaded visuals + pixel fallback | Still true; admin copy now says stored. Do not make URLs required. |
| Admin Draft → Validate → Activate | **Not a canister workflow.** Local React drafts + retire-via-`usableByPlayer` remain. |

Expansion that adds spells, AI behaviors, or admin chrome **before** #259 deploy, landing-authority extraction, and a reward-trust ADR will not scale. GameKey was a legitimate ops expansion that skipped the EOP file rule — that is the lesson, not a reason to freeze GameKey product code after #259.

### 6. Data / persistence safety — official client safer; live upgrade is the P0

`saveBattleStats` may still **lower** Doka/XP (required for heals/spends/death). It must not raise them — that write is on `main`. Finding 3 is still stale if phrased as “must not write Doka.” Client level can no longer demote.

`applyRewards` is still client-trusted **within** 100k/500k. Custom clients can still drip-mint. `calculateAndAwardDoka` remains an unused public mint. `markAchievementUnlocked` is still unproven. Shop 60s auto-complete is **gone** in source (GameKey).

#259 is the official-canister upgrade hole that #258 created. Empty-canister M0263 is the wrong test for this class.

Wallet seeding / idle-hydrate / unpaid death replay remain load-bearing. Do not invent a second persist path for telemetry or discovery grants. `redeemGameKeyThroughPersist` already uses the lock — leave that shape.

### 7. Automation coherence — P0, same failure, third consecutive midnight

AQA-001…012 were written 08-30 19:00. The 08-31 and 09-01 00:00 waves ignored them. Humans then merged almost every draft. Orchestrators correctly said “hold dirty persist/targeting/mapGen” and were overridden.

This 00:00 UTC window launched **41 automations** — including Dungeon Solvability Guardian, Combat Rules Consistency, Adversarial QA, Security & Abuse, Economy hunter, Persist auditor, Approved Game Design Implementer, complexity reduction, admin implementers, expansion, AI, feel, and telemetry dashboard.

That is exactly “P2/P3 expansion displacing unresolved P0/P1.” #259 is the P0 that should merge; everything else from this hour should be ACTION_IDs or hold.

| AQA / MTD ID | Director status 2026-09-02 |
| :--- | :--- |
| AQA-001 hunter throttle | **OPEN** — `996df6df` still not GetAutomation-visible. |
| AQA-002 one critical hunter | **OPEN** — `1aa41c6c` enabled. Volume problem remains the rest of the flock. |
| AQA-003 in-repo ACTION_ID ledger | **PARTIAL / HARMFUL** — 09-01 file concatenated; dump-yard still exists. Need one **index**, not one append-only blob. |
| AQA-004 don’t merge the 08-30 stack | **SUPERSEDED** — accept `main`. |
| AQA-005 test clone mill | **PARTIAL** — #173 stacked; test builder in tonight’s flock. |
| AQA-006 no mapGen implementation | **BROKEN** — #206 / #246 and CA-island punches. Guardian running now. |
| AQA-007 freeze drive-by WX | **BROKEN** — 49 commits; file shrank via extraction but hunters still live there. |
| AQA-008 security → ADR | **PARTIAL** — clamps + ignore-client level on `main`; no ADR. Security running again tonight. |
| AQA-009 orchestrator must not implement gameplay | **PARTIAL** — 09-01 orchestrators implemented unique display (acceptable). Orchestrator is running this hour. |
| AQA-010 persist/economy dedup | **PARTIAL** — cluster landed; do not open a third persist PR. Economy hunter running tonight. |
| AQA-011 prompts vs live architecture | **OPEN** |
| AQA-012 outcome telemetry | **OPEN** — dashboard specialist running with nothing to display. |
| MTD-001 flock halt | **OPEN** — failed 08-31; failed 09-01; failing 09-02. |
| MTD-2026-09-02-002 | **NEW** — merge #259. |

Cursor Cloud has **no write API** for dashboard prompts (`get-automation` is read-only). Halt is a human config action. In-repo gates (Caffeine import, stack-compat, forthcoming EOP snapshot in #259) are the enforceable half.

---

## Recurring hotspots — local patches no longer sufficient

Do **not** automatically perform a large refactor.

1. **EOP / frozen NewActor** — #259 is the last allowed GameKey-migration patch in this cluster. After it, new stables = new later file + populated `check-stable`. Stop stuffing fields into `20260831`.
2. **Landing / occupancy / MP-cost authority** — Swap + summon-walk hazards + Frozen execute + barrier-aware `findPath` need **helpers**, not more WX branches. Occupancy dest for summons already exists (`resolveControlledSummonMoveDest`). Next is `applyHazardLanding` + `battleWalkMpCost` + battle `findPath` wrapper. One helper PR each; one-line WX wiring.
3. **Kit-zone number** (PREREQ-A) — not a refactor. One call site. Unblocks dynamic pools. Wait until this hour’s flock is held.
4. **Canister trust** — write the ADR (AQA-008). Clamps and ignore-client level already match de-facto (a). Until the ADR exists, no new credit APIs and no discovery grant writer.
5. **Automation flock** — one critical hunter, report-only specialists on cron restart, no same-hour implementer pile-on after a merge burst. **This is still the binding constraint.** Three midnights in a row.

HP/death extraction (MTD-003) is still valid. Do not start it in the same hour as #259 or the flock.

---

## Human merge queue (do not autonmerge)

| Order | PR | Action |
| :--- | :--- | :--- |
| 1 | **#259** | Review/merge/deploy. Unique P0 EOP migration so Caffeine can upgrade GameKey stables. Draft, +1397/−54, 15 files, clean vs `58302bc`. Oldest open PR. |
| 2 | **#272** | GameKey bindgen/Candid sync. **After #259**, not instead of it. #259 does not regenerate `backend.ts`. |
| — | **#261** | GameKey Candid tests. After #259/#272. |
| — | **#265** | **Hold.** WX reject floats (AQA-007 / GFCF). Display-only but touches the freeze file during a flock. |
| — | **#260 #262–#264 #266–#271 #273** | Docs-only from this hour. OK if they do not rewrite SDA/SDE/EBA schemas or retune BAL-*. Do not merge ahead of #259 when files overlap. |
| — | Any later PR from the 09-02 00:00 wave | Default **hold**. Especially hold mapGen, targeting, persist, `enemyAI`, AdminDashboard, `main.mo` stables, and telemetry UI. |
| — | Motoko PRs that add persistent `let`/`var` | **Hold until #259 is on `main` and deployed.** Restack onto #259; never amend `20260831` / `20260901` NewActor. |

Do not restack death-replay, `writeLiveDoka`, `writeLevel`, leftover-XP HUD, recap click-through, or GameKey product code.

---

## Prioritized roadmap (what to work next)

**P0 — do these before any expansion PR merges**

1. Halt the 09-02 same-hour implementer flock (MTD-2026-08-31-001, MTD-2026-09-02-001).
2. Merge and deploy #259 (MTD-2026-09-02-002). Freeze Motoko stables until that lands (MTD-2026-09-02-003).
3. Write the reward-trust ADR (AQA-008). Finding 3 = unbounded/absolute misuse, not “Doka write is a bug.” Clamps and ignore-client level already match option (a).
4. Stop concatenating specialist catalogs into director ledgers (MTD-2026-09-02-004 / AQA-003).

**P1 — infrastructure / gameplay integrity**

5. Re-freeze `mapGen.ts`, `targeting.ts`, `enemyAI.ts`, and WX drive-bys (AQA-006, AQA-007). Solvability Guardian = fixtures + ACTION_IDs only.
6. Extract `applyHazardLanding` for Swap + controlled-summon walk (MIMA-001 + MIMA-002 remainder). Occupancy helper already exists — do not rewrite it.
7. Shared `battleWalkMpCost` for Frozen/Slime (MIMA-2026-09-01-001) and barrier-aware battle path (MIMA-2026-09-01-002). Helpers, then one WX call site each. Do not change the 2× formula.
8. Controlled HP/death extraction (MTD-2026-08-31-003) **after** landing helpers — not tonight.

**P2 — high-value expansion (after P0/P1, not this hour)**

9. Outcome counters, then maybe a dashboard (AQA-012 before TADD UI).
10. Fix kit-zone call site (Expansion PREREQ-A) — pass a **number**, not `levelZone` object. This unblocks dynamic pools without a new AI rewrite.
11. Enemy-observed spell discovery + ownership maps (SDA-002/003/004). Requires persist lock + metadata; never `spell.name`. Requires a **new later** migration after #259, not a stuffed NewActor.
12. Admin Draft → Validate → Activate on the canister (SDA-005 / MTD-006). Do not grow the 8.0k dashboard first.
13. Seed frontend starter ids; stop treating `usableByPlayer` as ownership (SDA-007 / SDA-2026-09-01-003).
14. Revisit `computeAITier` 30% random vs progressive sophistication (MTD-008). Report/design, not an `enemyAI.ts` rewrite.
15. Wire `saveKillCount` or drop it from the leaderboard (MTD-005).
16. BuffShop `buffInventories` vs `${principal}_inventory` (SDEG-005) — after persist quiet.

**P3 — polish**

17. Recap / HUD leftovers already shipped — do not restack.
18. Visual / game-feel / mobile — DESIGN.md already specifies the look; GFCF-003 (primary-hit juice) is the unique remaining feel P0 but **must not** land in this hour’s flock. Do not edit combat math or WX for feel.
19. Dead-code / maintainability — report only while hunters are hot.
20. GameKey operator UX polish — only after #259 deploy.

---

## Contradictions and duplicates (do not re-litigate)

| Conflict | Resolution |
| :--- | :--- |
| Security “don’t write Doka from `saveBattleStats`” vs ARCHITECTURE | Write stays; **clamp / no-mint**. ADR still required. |
| Solvability vs `AGENTS.md` mapGen | #110 plus later punches already merged; **freeze**. |
| AQA-004 vs human merge of 08-30/08-31/09-01 stacks | Accept `main`; clean leftovers; do not re-open merged themes. |
| #180 vs #167/#169/#175 | Helpers won; they are on `main`. Do not restack. |
| #183 vs #175 vs #256 death replay | All on `main`. Freeze `deathPenalty.ts`. |
| Progressive AI vs 30% random tier | Design decision later; no first-hour AI PR. |
| SDA vs SDE vs SPELL_DISCOVERY vs EBA vs BOSS docs | One discovery persist shape (SDA-002/004). Others are content cards, not parallel schemas. |
| Expansion specialists vs “P0/P1 first” | Tonight’s wave is the violation. Hold their PRs. |
| Telemetry dashboard vs no counters | AQA-012 first. TBC stays WAITING_FOR_TELEMETRY. |
| Empty `.old` check-stable vs live Caffeine | Empty proves import. Live upgrade needs populated snapshot + later migration (#259). |
| GameKey on `main` vs canister trap | Source is ahead of deploy. Merge #259; do not revert GameKey product. |
| `usableByPlayer=false` as retire vs enemy-only gate | SDA-2026-09-01-001; do not extend the flag. |
| Family HP paper vs `calcEnemyMaxHp` | PREREQ-H; honesty bug; not an AI rewrite. |

---

## TOP 5 CURRENT PRIORITIES

1. **Halt the 09-02 00:00 implementer flock** (41 automations). First-run and expansion specialists: ACTION_IDs only. Especially hold mapGen, persist, targeting, `enemyAI`, AdminDashboard, `main.mo` stables, telemetry UI.
2. **#259 EOP GameKey migration** — unique official-canister P0. Caffeine already trapped IC0503. Merge, then deploy. No more persistent fields until that chain is live.
3. **Reward-trust ADR (AQA-008)** — clamps and ignore-client level landed; the written decision did not. Security is running again tonight with the stale Finding 3 phrasing.
4. **Re-freeze WX / mapGen / targeting / enemyAI** so landing/MP helpers can be one extraction each, not another burst.
5. **Ledger hygiene (AQA-003)** — director writes `ACTION_IDS_YYYY-MM-DD.md`; specialists write `ACTION_IDS_<PREFIX>_YYYY-MM-DD.md`. Do not concatenate into 09-01 or 08-31.

## BLOCKED WORK

- Spell discovery / observed enemy kits / new unlock loops — no ownership persist, combat landing still racing, ADR unwritten, EOP chain broken on live Caffeine.
- Enemy AI capability expansion — `enemyAI.ts` already 2,583 lines; kits never leave zone 0; HP/death still dual-written.
- Telemetry admin dashboard — no counters to display (AQA-012). Balance analyst correctly idle.
- Any Motoko PR that adds stables until #259 is merged and deployed.
- Further `mapGen.ts` punches without an explicit human playtest of the #110→#246 sequence.
- Custom-client mint proofs / new credit APIs until the ADR exists.
- `calculateAndAwardDoka` productization (unused official path; still a sink).
- Formula-level `BAL-*` / `LHIPS-*` retunes (no telemetry; jackpot 100k clamp is architecture).
- Admin Draft→Validate→Activate chrome on the 8k dashboard before canister lifecycle exists.

## SAFE EXPANSION WORK

- Merge #259 (scoped migration + gate docs already in that PR). Do not duplicate it.
- Adopt per-producer ledgers + this director index (AQA-003) — process, not gameplay.
- Design-only (no PR): keep SDA/SDE/EBA catalogs; do not author a fifth discovery schema.
- Query-only / persist-lock-enqueued counters (AQA-012) — **design + tiny isolated PR after flock halt**, not a dashboard.
- Kit-zone number fix (PREREQ-A) **after** the flock is held — one call site + `enemyAI` test, no WX growth.
- Display-only unique copy if orchestrator finds one hole not already on `main`.

## AREAS TO STOP TOUCHING TEMPORARILY

- `src/frontend/src/components/WorldExploration.tsx` except one-line helper wiring
- `src/frontend/src/engine/mapGen.ts`
- RAF loop, turn-order math, damage formulas (`AGENTS.md`)
- `src/frontend/src/utils/progressPersist.ts` (leave the lock)
- `src/frontend/src/utils/deathPenalty.ts` (cluster closed)
- `src/frontend/src/engine/targeting.ts`
- `src/frontend/src/engine/enemyAI.ts`
- `src/frontend/src/components/AdminDashboard.tsx`
- `src/backend/main.mo` persistent fields until #259 deploys
- `src/backend/migrations/20260831_000000.mo` (frozen; #259 restores it)
- `docs/automation/ACTION_IDS_2026-08-31.md` and `ACTION_IDS_2026-09-01.md` (do not append)
- GameKey product methods (`requestGameKeyPurchase` / `redeemGameKey`) except via #259

## ARCHITECTURAL HOTSPOTS

1. EOP stables vs frozen migration `NewActor` (#258/#259) — new class of deploy blocker
2. Dual HP / death / landing authority (React snapshot vs `combatantsRef` vs Swap/summon teleport)
3. Client-trusted `applyRewards` without a written ADR (clamps exist; decision does not)
4. 19k-line world orchestrator absorbing every hunter (shrank, still the magnet)
5. Automation pile-on (41 same-hour agents, third consecutive midnight)
6. ACTION_ID dump / concatenation replacing a usable index
7. Dual spell catalogs + implicit ownership (blocks discovery)
8. Kit-zone object call site (dynamic pools implemented and dead)

## TELEMETRY SIGNALS WORTH INVESTIGATING

**None can be investigated in production — the series do not exist.**

When AQA-012 lands, investigate in this order (engineering + design, not telemetry-alone priority):

1. persist-ok vs persist-fail and death-penalty-applied vs victory-paid vs **single-axis-credit-then-death** (integrity; #183/#256 class — measure whether the hole is closed, do not assume)
2. GameKey request vs approve vs redeem vs redeem-fail (ops; new funnel; do not treat 0 rows as “players don’t buy”)
3. recap opened vs dismissed vs lava-death-during-recap (PX; input gate may have closed — measure)
4. spell-cast counts **by acquisition path** (starter vs unlocked vs observed) — a “weak” spell may be undiscovered, not weak. Today every catalog id is treated as owned, so this series would be **meaningless** until SDA-002.
5. Attack Nearest vs aimed-cast ratio (gate confusion vs power)
6. challenge accept vs complete vs advertised-reward-missing
7. Swap / summon-walk onto hazards vs walk onto the same tile (MIMA-001 remainder — if “Untouchable complete rate” is high, DESIGN INTERPRETATION is skip-landing, not player skill)
8. Frozen/Slime maps: tiles walked vs preview budget (MIMA-2026-09-01-001 — if players “cheat” MP, ENGINEERING is execute 1×)

Until those exist: automations must not claim CLEAR_POSITIVE_SIGNAL or “players don’t use X.” Distinguish MEASURED PLAYER BEHAVIOUR (none) from DESIGN INTERPRETATION and ENGINEERING EVIDENCE.
