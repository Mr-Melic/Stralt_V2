# Player Experience Coherence Audit — 2026-08-31

**Auditor:** Player Experience Coherence Auditor  
**Automation:** `30118f7c-a49e-11f1-a7d1-d6b4613131ce` (cron `0 */48 * * *`)  
**HEAD inspected:** `22503b5` (`fix: keep generated maps solvable across seeds (#110)`)  
**Gameplay / production code:** not modified.

Stralt is judged here as **one tactical game**, not a bag of subsystems.  
There is **no level cap**. Flat numbers are judged by whether they still create a decision at high level, not by whether an “endgame” exists.

Protected:

- tactical clarity
- meaningful choice
- spell-discovery excitement
- progressive enemy sophistication
- comprehensible encounter rules

Every system was asked at least one of:

1. What tactical decision does this add?
2. What mastery does this reward?
3. What progression fantasy does this support?
4. What new counterplay does this create?

If the honest answer is “none,” the system is noise.

Actionable records: [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md).

---

## Verdict

Stralt’s **core identity is sound**: isometric Dofus-style AP/MP tactics, chess-piece bodies, a single Doka wallet, explicit spell metadata, a persist-locked reward funnel, and a Death Realm that actually costs something.

The game does **not** currently play as one coherent loop. Three fractures dominate:

1. **The player is handed the whole spell identity on minute one.** `starterSpells` is marked innate and unremovable. Discovery — the thing this audit is told to protect — is not a system.
2. **Encounter rules on the box are not the encounter rules in the engine.** Boss-rush rooms advertise pair mechanics that no code applies. Several map “events” are empty hooks. Admin-seeded bosses still name `fireball` / `blood_nova` while live combat uses `spellData.ts`.
3. **Most secondary rewards are flat.** Challenges, feats, shrine cash, and Boss Rush room tables do not scale with threat or level. On an unbounded curve (`100 * 2^(N-1)`), they are a tutorial jackpot, then a rounding error. That is not “missing endgame.” It is a funnel that stops answering the progression question.

Until those three are designed, adding more bosses, modifiers, or shop SKUs will make the identity *less* readable.

---

## Classification (all reviewed systems)

| System | Class | One-line why |
| :--- | :--- | :--- |
| **Combat AP/MP split** | KEEP | AP spends actions, MP spends movement; nearly every spell is `mpCost: 0`. This is the Dofus-like decision. |
| **Explicit spell targeting metadata** | KEEP | `targetType` / range / LoS — not name heuristics. Protect this. |
| **Atomic reward funnel + root recap** | KEEP | `applyRewards` / `saveBattleStats` + `PostBattleRecap` at app root. |
| **Death 20% XP / 40% Doka + Death Realm** | KEEP | Percentage cost stays meaningful with no cap. Realm + 1.5s guards are a real rule. |
| **Solo boss kits + `BossAbility` tags** | KEEP | 19 bosses, unique phase kits, real specials (lava trail, illusions, larvae…). |
| **Enemy / summon AI engine** | KEEP | Archetypes, lethal lookahead, LoS reposition, backline guard. This *is* progressive sophistication. |
| **Summon five-pack** | KEEP | Hunter / guardian / archer / bomber / healer are distinct counterplay. |
| **Signature spells (Swap, Mark, Barrier, Mirror, Timestep, Sacrifice)** | KEEP | Each answers a tactical question the rest of the book does not. |
| **JUICE (shake, hitstop, numbers, shatter)** | KEEP | Presentation only; does not invent a second combat language. |
| **Admin UI gated + backend `#admin`** | KEEP | Must stay off the player HUD. |
| **Spell catalog (full `starterSpells`)** | MERGE | Shield ≡ Iron Skin; Poison ≡ Venom; two heals+CHC; Expose ≡ Shadow Veil; three drains. |
| **Enemy identity** | SIMPLIFY | Chess piece *and* `EnemyFamily` *and* AI archetype *and* `aiTier`. Three posters for one unit. |
| **Achievements / Feats** | SIMPLIFY | Mastery feats (pacifist, 5 crits) mixed with chores (loot 10, visit 25) and RNG (betrayal, jackpot). |
| **Buff shop + IAP packages + Doka-heal + rename** | SIMPLIFY | Four Doka sinks; item costs disagree with the canister; inventory is `localStorage`. |
| **HUD Blood bar** | DEPRECATE | Rendered every session; never spent. `_setBloodBalance` is unused. |
| **`resilience` / `evasion` on persist path** | DEPRECATE or EXPAND | Required on `CharacterStats`; unused in `combatMath.ts`. Invisible tax on the 12-field contract. |
| **`covenantBuff` / `shrineCount` session fields** | DEPRECATE or EXPAND | Shrine pays 300 Doka. The 3-map “covenant” ref is write-only. |
| **Spell discovery** | REWORK | All 32 starters are `isBaseSpell: true`. Backend extras (`vampire_bite`, `void_collapse`, …) dump into the same owned pool. |
| **Battle challenges** | REWORK | Random pick among 9, including legendary 1000 XP, every fight. Flat. Overlaps no-heal / pacifist. |
| **Boss-rush combined mechanics** | REWORK | `combinedMechanic` strings exist only in `useBossRush.ts`. Engine never reads them. |
| **Admin-enabled catalogs** | REWORK | Live combat, `bossKits.ts`, and `admin.mo` default bosses/spells are three sources of truth. |
| **Map modifiers (“world events”)** | SIMPLIFY + MERGE | 22 entries. Slime Flood ≡ Frozen Terrain. Gravity Well / Fog of War are empty. Titan’s Vigor is +1000 HP and a 1–5× damage lottery. |
| **Dungeon chain** | EXPAND | 3–5 maps, `1 + 0.25*depth` Doka, white portal. Tactically the overworld with a multiplier. |
| **Progression / rewards (flat grants)** | EXPAND | Curve is unbounded; challenge / feat / rush / shrine numbers are not. |
| **Terminology** | SIMPLIFY | Feats vs Achievements; Blood vs Doka vs XP; SR vs RES vs resilience; `spellType: "damage"` on buffs. |

---

## System notes (evidence)

### Enemies — SIMPLIFY

Overworld packs are **chess pieces** (`pawn`…`king`) with kits from `buildEnemyKit` (`engine/enemyAI.ts` 156–178). Knight never grows a second spell. Queen/King only swap frost→inferno at `levelZone >= 2`. That is a real sophistication curve, but it stops at band 2 — it does not keep teaching new reads as the player’s level goes to 30, 80, 200.

On top of that, a **30% family overlay** (`WorldExploration.tsx` 6236–6245) paints `wraith_bishop` / `iron_golem` / `plague_rat` / … stat mults and pixels. Families do not change the kit table. The player is asked to learn two bestiaries for one AI.

`aiTier` gates erratic / betrayal (`gameConstants.ts` 200–208, `WorldExploration.tsx` 15506+) are a third axis.

**Keep** the piece-kit curve and the AI engine.  
**Fold** families into piece+kit (or replace pieces with families — pick one poster).  
**Extend** kits past zone 2 so “progressive sophistication” is not a three-step staircase.

### AI — KEEP (kits: EXPAND)

`decideEnemyAction` is the best expression of Stralt’s identity: retreat, heal-ally, lethal lookahead, overkill spill, LoS step, kamikaze density, summoner cap. Summon AI mirrors the five kits.

Do not add more toggles. Teach the existing ones through **readable enemy kits** as level rises.

### Spells — MERGE the clones, KEEP the signatures

`data/spellData.ts` 27–691 ships **32** “starter” spells. Near-duplicates:

| Pair | Same decision |
| :--- | :--- |
| Shield / Iron Skin | +30% RES, 3 turns |
| Poison Arrow / Venom Strike | 4 DoT × 3 turns, no upfront |
| Blood Mend / Rallying Cry | self-heal + +15% CHC / 2 turns |
| Expose / Shadow Veil | damage + RES+SP shred |
| Life Drain / Drain Courage / backend Vampire Bite | drain + a small debuff |
| Frost Bolt / Slow / Frost Nova | MP reduction |
| Mirror / backend Reflect Barrier | reflect next spell |
| Enrage / Fury Potion | damage buff (shop vs book) |
| Haste / Swift Boots | extra MP |

Signatures that **do** add a decision: Strike, Swap, Mark, Barrier, Mirror, Timestep (once/battle), Sacrifice, Chain Lightning, Inferno, Frost Nova, Lifesteal Nova, Cursed Wound, Weaken, and the five summons.

`spellType` is `"damage"` on Shield, Swap, Timestep, Enrage, etc. (`spellData.ts` 40, 152, 225, 283). That is not a player-facing word, but it leaks into admin and logs.

Almost every spell has `mpCost: 0`. **Keep that.** MP is the movement resource. Do not invent a second mana bar.

### Spell discovery — REWORK

```2242:2243:src/frontend/src/components/WorldExploration.tsx
  // Base spells = the always-owned innate spells (ALL starter spells + physical attack)
  // Every spell in starterSpells is a base/innate spell — always shown, never removable.
```

Owned pool = that full set **union** every backend spell not in `OLD_SPELL_NAMES_SET` (`WorldExploration.tsx` 2203–2271). The filter drops `fireball` / `blood_nova` / … but **keeps** current `defaultSpells()` (`shadow_strike`, `soul_rend`, `vampire_bite`, `reflect_barrier`, `thunder_clap`, `void_collapse` — `admin.mo` 168–191). `void_collapse` is tagged `minLevel = 30` and still lands in the library.

The bar is 8 slots. The book is 32–38 identities on create. Loadout is a **filter**, not a discovery.

This is the highest-leverage PX break. A no-cap game can drip new tools forever. Today it cannot.

### Achievements (Feats) — SIMPLIFY

Seed (`admin.mo` 309–326): 15 feats. UI title is **Feats** (`AchievementsPanel.tsx` 231), `aria-label` is Achievements.

| Kind | Examples | Answers |
| :--- | :--- | :--- |
| Mastery | pacifist_run, critical_5_in_battle, survive_1hp | Yes — play a certain way |
| Progression stamp | first_blood, level_10, spell_level_5, spell_master_8 | Soft onboarding |
| Chore | loot_10_doka, explore_25_maps, doka_1000 / 10000 | No tactical decision |
| RNG spectator | betrayal_witness, double_betrayal, jackpot_heal | The world did something |

Rewards are flat Doka (50–1000). After the XP curve leaves the hundreds, claiming a feat is flavor, not a fantasy.

### Challenges — REWORK

`DEFAULT_CHALLENGES` (`challengeCompletion.ts` 38–103): 9 contracts, three tiers. Every battle picks **one at random** (`WorldExploration.tsx` 12474–12482), including `legendary_1` (1000 XP / 500 Doka) on a first-map pack.

Predicates are real and now wired (heal flag, AP peak, Chebyshev ≤ 2). The **offer** is not:

- Difficulty of the *challenge* is not the difficulty of the *room*.
- `easy_1` / `hard_1` / `pacifist_run` all tax healing.
- XP 400–1000 is huge at level 3 and invisible at level 20. No cap means this only gets worse.

Challenges should be **encounter-shaped** (this pack, this modifier, this boss phase) and **scale** with threat.

### Bosses — KEEP kits; REWORK rush pairs

Frontend: 19 ids (`bossTypes.ts` 390–410), kits in `bossKits.ts`, abilities in `BossAbility`. Phase 2 is a strict kit superset. This is the right boss language.

Backend seed: **12** bosses whose `spellPoolIds` are `fireball`, `cursed_gust`, `blood_nova`, … (`admin.mo` 350+). Live client filters those names out.

Boss Rush (`useBossRush.ts` 23–134): 10 rooms, paired bosses, a `combinedMechanic` sentence each (heal every 2 turns, decoy king, jackpot feed loop, …). **Grep: `combinedMechanic` is only declared, never consumed.** The player is taught a rule that the fight does not run.

Room rewards are flat (500/200 → 5000/2000). Same no-cap problem as challenges.

### Dungeons — EXPAND (identity), SIMPLIFY (vocabulary)

Two different “dungeons”:

1. **Chain** (`portalRules.ts` / ARCHITECTURE): 3–5 maps, depth multiplier, completion bonus `maxDepth * 50` Doka, white sanctuary portal.
2. **Editor** (`types/dungeon.ts`, `DungeonCreator.tsx`): admin room tiles.

The chain does not change targeting, AI, or hazards versus free roam. It is a **reward skin** on the overworld. Either give chain maps a readable rule (no flee, unique modifier table, boss at last depth) or stop calling it a dungeon.

### World events / map modifiers — SIMPLIFY + MERGE

22 registry entries (`mapModifiers.ts` 4, 152–). Two-roll trigger (20% then 50%).

| Problem | Evidence |
| :--- | :--- |
| Duplicate | Slime Flood and Frozen Terrain both `onMpCost: * 2` (154–172) |
| Vaporware | Gravity Well, Fog of War: “Mechanism not located. Placeholder.” (280–296) |
| Arbitrary | Titan’s Vigor: **+1000 HP** and damage `* (1..5)` (299–316) — does not scale, does not teach |
| Stat inflation | Glass Realm ×2; Doka Fever +25% enemy HP and ×2 rewards |
| Real tactics | Thorned Ground, Void Rift, Mirror Field, Arcane Overflow fizzle, Time Warp 15s |

Keep a **short** event list the player can learn. Merge movement-cost twins. Delete or implement placeholders. Replace Titan’s lottery with a rule (e.g. first hit each turn is huge — a real decision).

### Progression — EXPAND the *grants*, KEEP the *curve*

`xpForNextLevel` = `100 * 2^(N-1)` (`xpCurve.ts` 10–12). Victory XP is `sum(enemy.level * 20)` (`rewardResolver.ts` 82–94). Player AP/MP grow +1 per 25 levels (`progression.ts` 66–72). Boss level-diff is `1.08^diff` (`progression.ts` 290–324) — this **does** stay relevant with no cap.

What does **not**: challenge XP, feat Doka, shrine 300, rush room table, dungeon `*50` completion. Those are constants. On an unbounded curve they stop supporting a fantasy.

Spell upgrade `10 * 2^level` (summons ×10 UI) is the one sink that still grows. Lean on it; do not invent a third currency.

### Shops — SIMPLIFY

| Sink | Where | Role |
| :--- | :--- | :--- |
| Buff items (6) | `BuffShop.tsx` 23–71; inventory `localStorage` `${principal}_inventory` | Combat shortcuts that clone book buffs |
| Canister buff catalog | `main.mo` 1867–1874 | **Different ids/costs** (`greater_potion` vs `greater_health_potion`; elixir 200 vs 80; fury 100 vs 150) |
| IAP packages | `admin.mo` 265–282 | 15 SKUs, 10 Doka → 1.6M Doka |
| Rename | 100 Doka | Cosmetic |
| Spell upgrade | `upgradeSpell` | The real mastery sink |

Buffs are not wired through `purchaseBuff` / `useBuffItem` in the frontend shop UI (no callers under `components/`). Player-facing shop is a **cache**, not the canister. That is an architecture bug *and* a PX lie (“I bought a potion”).

IAP at 1.6M Doka can skip the upgrade curve for a long band. That is a product choice; it must be an explicit one, not an unnoticed SKU list.

### Death — KEEP

`DEATH_XP_PENALTY_RATE = 0.2`, `DEATH_DOKA_PENALTY_RATE = 0.4` (`deathPenalty.ts` 9–10). Absolute write via `saveBattleStats`. Death Realm timer 1.5s blocks portals **and** encounters (`deathGuards.ts`). Percentage Doka loss remains a decision at any wallet size. Do not flatten this into a slap-on-the-wrist or a wipe.

### Rewards — REWORK the *menu*, KEEP the *pipe*

One persist pipe is correct. Too many **flat** faucets feed it: victory, portal +10 XP, ground Doka, shrine 300, challenges, feats, rush rooms, dungeon complete, IAP, jackpot heal, admin grant.

A player cannot form a mental model of “what was this fight *for*.” Recap should show **one** threat-scaled combat grant plus optional **named** challenge/feat lines — not a pile of constants.

### Visual feedback — KEEP juice; SIMPLIFY chrome

`JUICE` (`gameConstants.ts` 140–146) is the right layer.

The top bar shows **Blood** (`GameFlow.tsx` 307–321) that does nothing. Challenge panel, map-modifier chips, initiative strip, spell bar, orbs, Feats, shop, chat, and debug can all be up at once. Carved-stone chrome is the brand; **count of simultaneous languages** is the overload.

### Admin-enabled content — REWORK

Admin can CRUD enemies, spells, bosses, achievements, modifiers, shop, ads (`ARCHITECTURE.md` 206–217). Reads are public.

There is **no contract** that an admin spell must carry the targeting fields `spellEngine` / `targeting.ts` require, or that a boss `spellPoolIds` exists in `SPELL_ID_CATALOG` (`bossKits.ts` 29–62). Default canister bosses still reference the retired name list the client strips.

This is how Stralt’s identity gets overwritten by a well-meaning config edit: a `blood_nova` with no `targetType` either no-ops or falls through a generic damage path.

---

## What already fits (do not “fix”)

- AP for spells / MP for walk.
- Eight-slot bar as a **commitment** (once the book is earned, not gifted).
- Summon archetypes and lifespan-on-own-turn.
- Persist lock + recap at root.
- Death Realm as a place, not a modal-only wipe.
- Boss phase 2 as kit + ability escalation.
- No level cap + exponential leftover XP + percentage death + compounding boss level-diff.

---

## Recommended sequence (human, not automation)

1. **Discovery contract** — what is innate (Strike + 2–3 starters), how a spell is found, how admin spells enter that path. (PXA-001, PXA-002, PXA-005, PXA-015)
2. **Encounter honesty** — implement or delete rush pair rules; slim modifiers; one enemy poster. (PXA-003, PXA-007, PXA-008)
3. **Unbounded grants** — scale challenge / rush / dungeon / feat cash with threat. (PXA-004, PXA-009, PXA-010)
4. **HUD / currency honesty** — hide Blood; kill write-only shrine buff; one shop authority. (PXA-006, PXA-011, PXA-014)
5. **Words** — Feats *or* Achievements; one resist name. (PXA-012)

Do not implement these from this file unless a human or the Report Action Orchestrator picks an ID and it is still unique versus open PRs.
