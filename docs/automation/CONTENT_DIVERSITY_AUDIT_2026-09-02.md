# Content Diversity & Repetition Audit — 2026-09-02

**Source automation:** Content Diversity & Repetition Auditor (`5acab6fe-a49e-11f1-a7d1-d6b4613131ce`)  
**Constraint:** analysis and docs only. No production code, RAF, map generation, turn logic, or damage math.  
**HEAD inspected:** `58302bc` — `Merge pull request #258` (GameKey shop)  
**Prior auditor HEAD:** `dd275aa` (2026-09-01). That run’s ledger never landed on `main`. Every 09-01 check is **still true**; line numbers moved.

ACTION_IDs: [`ACTION_IDS_CONTENT_DIVERSITY_2026-09-02.md`](./ACTION_IDS_CONTENT_DIVERSITY_2026-09-02.md) (`CDA-2026-09-02-001` … `015`).

Sibling design that already exists — **do not re-propose as new families / rooms / spells**:

| Catalog | Status on this HEAD |
| :--- | :--- |
| Enemy family sheets Wave 1+2 | `ENEMY_ELITE_EVOLUTION_2026-08-31.md` / `2026-09-01.md` — PROPOSED |
| Named formations | `docs/design/ENEMY_FORMATIONS_2026-09-01.md` — PROPOSED, unwired |
| ENC-* rooms | `docs/encounters/ENCOUNTER_EVOLUTION_2026-08-31.md` / `2026-09-01.md` — PROPOSED |
| Spell verbs (push, attract, root, trap, delayed execute, …) | `SPELL_PROPOSALS_2026-08-31.md` / `2026-09-01.md` — PROPOSED |
| World features (`WF-*`, including `elite_patrol`) | `engine/worldFeatures.ts` — unit-tested, **not imported by WX** |
| Owner encounter pack | `WORLD_ENCOUNTER_ADMIN_DESIGN_2026-09-01.md` — WDEAD ids still NEW |

**Do not recommend** HP/damage reskins, Register-only families (Crimson Spawn / Shadow Lurker / Storm Caller), or a 16th RES-shred spell.

Indefinite progression is supposed to be:

`family × relative level × variant × AI × spell pool × formation × map × modifier`

Live spawn is:

`random chess piece × pickEnemyLevelFromTiers × 30% family sticker × inferred AI × kit band NaN=0 × quadrant scatter × extra dungeon bodies × 22-modifier two-roll`

---

## 0. Prior-run checks (2026-09-01 → this HEAD)

| # | Question | 2026-09-02 | Evidence |
| :--- | :--- | :--- | :--- |
| 1 | Does family still fail to select kit / AI / passive? | **Yes.** Overlay is stats + pixel art. Chassis stays random. | `WorldExploration.tsx` 5862–5953 vs `tryPlaceEnemy` 5765–5812 |
| 2 | Is family HP **and** RES/SP still wiped at battle start? | **Yes.** | HP: `calcEnemyMaxHp` 12085–12112. RES/SP: `computeEnemyStats` 11975–12017 |
| 3 | Are `starterSpells` still all forced `isBaseSpell`? | **Yes.** | `WorldExploration.tsx` 2356–2368 |
| 4 | Does any code **read** `combinedMechanic` besides the room table? | **No.** Only `useBossRush.ts` 19–131. | Grep: definition + ten string literals |
| 5 | Did Shield/Iron Skin or Poison/Venom diverge? | **No.** | `spellData.ts` 30–47 vs 293–312; 49–67 vs 394–415 |
| 6 | Is kit band still NaN (`levelZone` object)? | **Yes.** | `buildEnemyKit(..., currentMap.levelZone)` 12035; `enemyAI.ts` 192 `Math.floor(levelZone)` |
| 7 | Is summoner chance still linear in raw player level? | **Yes.** Saturates at level 44. | `gameConstants.ts` 298–299; WX 12047–12057 |

What **did** change since 09-01 (not diversity): challenge *honesty* (self-HP, walk hazards, BuffShop `healUsed`, Pacifist preview). Those make the nine existing predicates truthful. They do not add a tenth *kind* of challenge.

---

## 1. Live catalogs (do not treat Enemy Register as source of truth)

### 1.1 Enemy families

`EnemyFamily` (`gameTypes.ts` 12–20): `wraith_bishop`, `iron_golem`, `plague_rat`, `ember_knight`, `tide_shade`, `bone_scribe`, `void_mirror`, `default`.

Spawn (`WorldExploration.tsx` 5862–5953): after a fully random chess piece is placed, each body has an independent **30%** chance to receive a uniformly chosen family. Overlay writes `hp`, `maxHp`, `damage`, `res`, `sp`, `aiTier`. `familyStatMults` also lists `mp` / `ap` — **never assigned**.

Battle start then:

1. Re-rolls `sp`, `sr`, `init`, `res`, `chc` from `computeEnemyStats(e.level, e.pieceType, e.id)` (`WorldExploration.tsx` 11975–12017) — piece-type integer rolls (`progression.ts` 180–186: `res` is `roll(2, 4 + base*0.9, …)`, **not** a 0–1 fraction).
2. Overwrites combatant HP with `calcEnemyMaxHp(e.level)` (`WorldExploration.tsx` 3568–3573, 12085–12112): `floor(50 * (1 + (level-1)*growth))`. Family `hpMult` 0.4–2.5 is discarded.

Family RES values `0.05–0.75` are the **wrong unit** even if the wipe were removed. Binding family stats must use the integer `getEnemyBaseStats` scale, not the overlay fractions.

**Live combat hooks (three):**

| Family | Live verb | Where |
| :--- | :--- | :--- |
| `ember_knight` | melee applies burn 3/turn × 3 | `WorldExploration.tsx` 16877–16891 |
| `tide_shade` | melee applies MP −1 × 2 | `WorldExploration.tsx` 16893–16908 |
| `void_mirror` | 25% of pre-crit spell damage reflected | `castHelpers.ts` 328–338 |

`wraith_bishop`, `iron_golem`, `plague_rat`, `bone_scribe` have **pixel patterns only** in combat. Register copy (`EnemyRegister.tsx` 22–64) claims wall-phase, poison-on-hit, Weaken-from-range, magic immunity — none of that is wired.

Family does **not** force `pieceType`. A “Wraith Bishop” may be a pawn with Strike. Kit and `inferArchetype` follow the random chassis.

### 1.2 Variants / elite / champion

No `isElite`, no `isChampion`, no rarity second roll. Leader = highest `level` in the pack (`WorldExploration.tsx` 12125–12129). `computeAITier` (`combatMath.ts` 36–51) is a level bucket, then **30%** uniform 1–10 noise — not a variant floor.

`worldFeatures.ts` `WF-ELT-BANNER_PATROL` / `WF-ELT-TOLL_KEEPER` (`elite_patrol`) are designed + tested and **not imported by WX**.

### 1.3 AI profiles

`EnemyArchetype` union (`enemyAI.ts` 79–86): caster, healer, charger, flanker, berserker, summoner, generic.

`inferArchetype` (`enemyAI.ts` 421–451) never returns `summoner`. Order: any `healAmount > 0` → healer (so `starter-drain`, `spell-drain-courage`, `spell-lifesteal-nova` are healers); majority ranged + LoS → caster; knight → flanker; `aiStrategy === "berserk"` or family name contains `"berserk"` → berserker; melee-only → charger; else generic.

No spawn writes `aiStrategy` except an empty string at WX 16249. No family has `aiStrategy: "berserk"`.

**Nuance vs 09-01:** summoner **behavior** exists. WX 16463–16472 calls `decideSummonerAction` when `enemy.isSummoner`. That flag is a **random overlay**, not a family. Pets are 50/50 wolf or archer (`WorldExploration.tsx` 12047–12057). Chance `0.12 + 0.02 * playerLevel` — 100% of non-summon bodies at player level ≥ 44.

### 1.4 Spell pools

`ENEMY_KITS` (`enemyAI.ts` 156–178) is **piece-type only**, three bands:

| Piece | Band 0 (live, always) | Band 1 | Band 2 |
| :--- | :--- | :--- | :--- |
| pawn | Strike | + Venom | — |
| knight | Strike | Strike | Strike |
| bishop | Frost | Frost + Poison | — |
| rook | Strike | Strike + Iron Skin | — |
| queen | Frost | Frost/Inferno + Blood Mend | Inferno + Blood Mend |
| king | Frost | Frost/Inferno + Rallying Cry | Inferno + Rallying Cry |

`buildEnemyKit` floors `levelZone`. Call site passes `currentMap.levelZone` **object** (`{ name, minLevel, maxLevel }`). `Math.floor(object)` is `NaN` → `Math.max(0, NaN)` is `NaN` → every `z >= 1` is false → **band 0 forever**. `longHorizonSim.ts` 50–57 documents the same NaN.

Knight never grows. Queen/king “late Inferno” never arrives. Drain on a queen kit would steal healer AI (`healAmount`).

Frontend catalog: 32 ids in `spellData.ts` / `SPELL_ID_CATALOG`. All `starterSpells` forced innate (`WorldExploration.tsx` 2356–2368). Backend `defaultSpells()` (`admin.mo` 168–191) is a **second** six-id catalog (`shadow_strike`, `soul_rend`, `vampire_bite`, `reflect_barrier`, `thunder_clap`, `void_collapse`) with targeting flags the frontend rows lack. Backend boss seeds (`admin.mo` 349+) still name `fireball` / `cursed_gust` / `entangle` that are in neither frontend kit table.

Engine verbs with **no live spell caller:** `applyPushback` / `applyAttract` (`occupancy.ts` 462, 517 — tests only). Targeting supports `linear` / `diagonal` / `minRange`; no enemy kit sets them.

### 1.5 Formations

Live: four quadrants around (8,8) then fill, Chebyshev ≥ 4 (`WorldExploration.tsx` 5738–5755). Battle start re-scatters ≥ 2 from allies, ≥ 3 from player (11972–12006). Named formation catalogs and `worldFeatures.ts` encounter slots are unwired.

### 1.6 Bosses

19 `BOSS_IDS` (`bossTypes.ts` 390–410). `BossAbility` enums are **unique per later boss** — that axis is actually diverse. Kits are not: they remix the same frontend ids.

| Spell id | Boss kits using it |
| ---: | :--- |
| `spell-shadow-veil` | 7 |
| `spell-cursed-wound` | 6 |
| `spell-frost-nova` | 6 |
| `spell-swap` | 5 |
| `spell-iron-skin` | 5 |
| `spell-lifesteal-nova` | 4 |
| `starter-blast` | 4 |

Phase 2 is “add a catalog spell” (`bossKits.ts` 90–92: phase 2 always contains at least one id phase 1 lacks). Signature twists stay in `BossAbility` / `useBossAI`, not in the kit.

Boss Rush: 10 hardcoded pairs (`useBossRush.ts` 24–135). `combinedMechanic` is flavor text. Room 9 `boss2Id: "weeping_pawn_2"` is **not** in `BOSS_IDS`. Admin copy already admits the mismatch (`AdminDashboard.tsx` 6943–6946).

Register boss tips (e.g. Archbishop invulnerable while pawns live) are lore, not the live `BossAbility` set.

### 1.7 Encounters / dungeon rooms

`generateEnemies` (`WorldExploration.tsx` 5698+): pack size `1+rand*8` plus dungeon extras `[0,2,3,4,4,5][min(depth,5)]` and tier boost `[0,1,2,2,3,3]` (5708–5709). Same quadrant scatter. No encounter id, no wave, no objective, no formation id.

Live dungeon “rooms” are **more bodies + higher tier**, not ENC-* structures. Rest / boss / dungeon portals are separate chance rolls, not a taught chain.

Proposed ENC-* / WDEAD encounter catalog remain PROPOSED.

### 1.8 Challenges

Nine `DEFAULT_CHALLENGES` (`challengeCompletion.ts` 38–103):

| Kind | Ids | Distinct player decision? |
| :--- | :--- | :--- |
| Turn-count clone | `under_15_turns`, `under_10_turns`, `under_5_turns` | Same verb, tighter number |
| Damage-taken clone | `under_50_damage`, `no_healing_under_30_damage`, `no_damage_taken` | Same verb, tighter number (+ heal ban) |
| Unique | `no_healing`, `under_8_ap_per_turn`, `direct_hit` | Yes — resource / range discipline |

No OBJECTIVE_PLAY, SPELL_DISCOVERY, or TEAM_SYNERGY predicate.

### 1.9 Achievements

Fifteen `defaultAchievements()` (`admin.mo` 309–326). Grind / event keys: `first_battle_win`, `survive_1hp`, `spell_level_5`, `doka_1000`, `explore_25_maps`, `betrayal_witness`, `leader_slayer`, `jackpot_heal`, `loot_10_doka`, `double_betrayal`, `level_10`, `spell_master_8`, `critical_5_in_battle`, `pacifist_run`, `doka_10000`.

Twins: Doka hoard 1k/10k; betrayal / double betrayal. `level_10` (`unstoppable`) is a **horizon cap** on a game with no character level cap. Rewards are Doka only — never a spell.

### 1.10 Environmental mechanics / modifiers

Live hazards: lava / ice / spikes (mapGen + battle walk). 22 `MAP_MODIFIERS` (`mapModifiers.ts` 152–490).

| Problem | Ids |
| :--- | :--- |
| Identical hook | `slime_flood` ≡ `frozen_terrain` (both `onMpCost: ×2`) |
| Announce-only placeholders | `blood_moon`, `mirror_field`, `gravity_well`, `fog_of_war` |
| Numeric HP/damage reskins | `titans_vigor` (+1000 HP, 1–5× dmg), `glass_realm` (×2), `doka_fever` (+25% enemy HP) |
| Useful distinct verbs | `null_field`, `chaos_initiative`, `thorned_ground`, `arcane_overflow`, `iron_curse` (heal tax), `vampiric_ground` |

`worldFeatures.ts` (20 `WF-*` rows, including shrine / teleport / elite patrol / spell-bearing enemy) is unused by spawn.

---

## 2. Mechanic category census (live)

Counts are **distinct player-facing verbs**, not name variants.

| Category | Live density | Notes |
| :--- | :--- | :--- |
| DAMAGE | **Over** | Strike, Inferno, Sacrifice, chain, Expose/Veil, Cursed Wound, Frost Bolt/Nova, most boss kits, glass/titan/fever modifiers |
| STATUS | **Over** | RES/SP shred pair; poison≡venom; ember burn; Weaken; anti-heal |
| RESOURCE_MANIPULATION | **Over** | MP −1/−2 cluster (Frost Bolt, Slow, Frost Nova, tide melee); Drain Courage AP −1; Timestep (player) |
| SUPPORT | Clone-heavy | Shield≡Iron Skin; Blood Mend≈Rallying Cry; Enrage; wisp player-only |
| DEFENSE | Clone-heavy | Shield/Iron Skin; Mirror (player); Barrier (player); void 25% reflect |
| SUMMONING | Shallow | Five player pets; enemy overlay wolf/archer only; bosses spawn via abilities |
| CONTROL | Partial | MP taxes, no true root; no delayed execute |
| TERRAIN | Partial | lava/ice/spikes + some modifiers; four placeholders; slime≡frozen |
| POSITIONING | **Under** | Swap only; formations are scatter; push/attract unwired |
| REACTION | **Under** | Mirror (player) + void reflect. No counter, no delayed interrupt |
| MOBILITY | **Under** | Swap; Haste +MP; random knight chassis. No dash |
| TEAM_SYNERGY | **Under** | Leader-by-level; no pack roles; `combinedMechanic` unused |
| OBJECTIVE_PLAY | **Absent** | Challenges are numeric; ENC-* unwired |
| SPELL_DISCOVERY | **Absent** | Entire frontend catalog pre-owned as base |

---

## 3. Redundancy (differs mainly by HP / damage / name / number)

### Redundant enemies

- Four families with no combat hook: wraith / golem / rat / scribe = palette + wiped multipliers.
- Register extras Crimson Spawn / Shadow Lurker / Storm Caller = lore rows, not `EnemyFamily`.
- Pack members of different piece types often share band-0 Strike (pawn, knight, rook) — chassis name without kit.
- Dungeon depth extra bodies = more of the same random pieces.

### Redundant spells

| Pair | Same verb | Cosmetic delta |
| :--- | :--- | :--- |
| Shield / Iron Skin | +30% RES / 3 turns, ally, range 3 | AP 2 vs 3 |
| Poison Arrow / Venom Strike | 4 dmg/turn × 3, no upfront | range 4 AP 2 vs range 2 AP 3; `dotType` string |
| Expose / Shadow Veil | damage + RES+SP shred / 2 turns | 15 @ ×0.8 vs 18 @ ×0.85 |
| Blood Mend / Rallying Cry | self heal + +15% CHC / 2 | 12 HP AP 3 vs 20 HP AP 4; Cry `usableByEnemy: false` |
| Life Drain / Drain Courage / Lifesteal Nova | drain + heal | SP shred vs AP −1 vs AoE — related, not identical |
| Frost Bolt / Slow / Frost Nova | MP tax | −1/1 vs −2/2 vs AoE −1 |

Backend `reflect_barrier` ≈ frontend Mirror. Backend `vampire_bite` ≈ drain cluster.

### Repeated encounter structures

Every fight: random pieces, quadrant spread, optional 30% sticker, optional summoner overlay, optional modifier two-roll, win = kill all. Dungeon = that plus extra count. Boss Rush = two catalog bosses, flavor synergy, kill all.

### Repeated boss mechanics

Unique `BossAbility` tags are the real diversity. Kits repeatedly: shred, frost-slow, swap, iron-skin, drain-nova. Phase 2 = add a row from the same 32-id list. Dual-boss rooms do not implement the printed “kill A first or B resurges” rules.

---

## 4. Combinatorial product — which axes actually bind

| Axis | Bound in live spawn? |
| :--- | :--- |
| family | Sticker (30%). Three passives. Stats wiped. Chassis not forced. |
| relative level | **Yes** — `pickEnemyLevelFromTiers` |
| variant | **No** |
| AI | Inferred from kit / piece. Summoner is a separate random flag. `aiTier` 30% chaos. |
| spell pool | Piece-type, **band 0 only** |
| formation | Quadrant scatter |
| map | mapGen archetypes exist; dungeon does not pick a room id |
| modifier | Two-roll among 22, including four no-ops and one duplicate |

Relative level without the other axes is HP/damage inflation — the failure mode this audit is meant to stop.

---

## 5. What to build (only if it creates a new player decision)

Do **not** add families, ENC rooms, or Wave-2 spells until the seven live families survive battle start and select kit/AI. Those catalogs already exist as PROPOSED.

| Gap | New player decision | Prefer existing id |
| :--- | :--- | :--- |
| Family persist + chassis + one unique verb | “This is a golem — walk around / shred RES / don’t poison-expect” | CDA-001; family sheets already written |
| Numeric kit band | “This late queen has Inferno — break LoS / save Mirror” | CDA-002; SDE kit-band ids |
| Elite as AI/kit floor | “The banner one never kites — I must burst or leave” | CDA-003; `WF-ELT-*` |
| Named formation | “Tank in front, frost behind — peel the bishop first” | CDA-004; `ENEMY_FORMATIONS_*` |
| Clone collapse | Each remaining id has one answer (melee vs ranged DoT, etc.) | CDA-005 |
| Family-bound AI; drain ≠ healer | “The drain bishop will not walk up to Blood-Mend me” | CDA-006 |
| Summoner by zone + family pet | “Kill the cantor or the board fills; this family brings a bomber not a wolf” | CDA-007 |
| `combinedMechanic` as code | “I must kill Archbishop first or the Pawn comes back” | CDA-008 |
| Challenge kinds, not tighter numbers | “Hold the tile / observe the frost / kill the summoner first” | CDA-009 |
| Achievement = learn, not hoard | “I unlocked by seeing Void reflect, not by hitting level 10” | CDA-010 |
| Distinct / real modifiers | “Fog: I cannot snipe; Frozen: ice tiles, not another slime” | CDA-011 |
| One spell catalog | Discovery can exist; kits stop pointing at ghost ids | CDA-012 |
| Freeze new stickers | Prevents another Register row from being mistaken for content | CDA-013 |
| Encounter objects (hold / escort / wave) | “The shrine dies if I chase the rat” | CDA-014; ENC-* / `worldFeatures` |
| Unused POSITIONING verbs | “If I stand here they slam me into lava” | CDA-015; `applyPushback` / SPELL_PROPOSALS |

---

## 6. What this run will not recommend

- New HP%, damage%, or palette families.
- Shipping Crimson Spawn / Shadow Lurker / Storm Caller as Register lore.
- A third Doka-hoard achievement or a 12-turn challenge.
- Retuning `pickEnemyLevelFromTiers` percents, RAF, mapGen solvability, or combatMath formulas.
- Treating `longHorizonSim.ts` as player telemetry (still `available === false`).
