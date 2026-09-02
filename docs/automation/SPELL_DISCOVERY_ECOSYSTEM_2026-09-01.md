# Dynamic Spell Discovery & Enemy Spell Evolution — Wave 2

**Author:** Dynamic Spell Discovery and Enemy Spell Evolution Designer  
**Automation:** `c26e5a83-a492-11f1-a7d1-d6b4613131ce`  
**Date:** 2026-09-01  
**Status:** PROPOSED — design only. **No production code in this change.**  
**HEAD audited:** `dd275aa` (`ci: require Caffeine import gates on all automations`, #182)

Stralt has **no character level cap**. Wave 1 ([`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md), PR #156) is the **product law** for observe → win → unlock, acquisition enums, persistence, and UX. This document does **not** replace that law. It is the next **generation** of the expandable catalog: G≥2 verbs, remaining #136 family signatures, and unused feat / challenge / boss / special doors.

ACTION_IDs: [`ACTION_IDS_SDE_2026-09-01.md`](./ACTION_IDS_SDE_2026-09-01.md).

**Do not implement production code from this PR.**

---

## 0. Sibling designs (do not duplicate)

| Sibling | Path / PR | Owns |
| :--- | :--- | :--- |
| Wave-1 discovery contract | #156 — `SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md` | State machine, innate four, persist writers, UX copy, Wave-1 cards |
| Wave-1 ACTION_IDs | `ACTION_IDS_SDE_2026-08-31.md` (`SDE-2026-08-31-001`…`009`) | Ownership split, observe hook, victory commit — **still blocking, still NEW** |
| Spell admin | #116 / #187 — `SPELL_ADMIN_DESIGN_2026-08-31.md` | `ownedSpellIds` / `observedSpellIds`, soft-retire |
| Tactical gap-fillers | #120 — `SPELL_PROPOSALS_2026-08-31.md` | `spell-shoulder-bash` … `spell-void-anchor` |
| Family sheets | #136 — `ENEMY_ELITE_EVOLUTION_2026-08-31.md` | Variant floors, pack recipes |
| Boss adaptations | #137 — `docs/design/BOSS_AND_SPELL_DISCOVERY.md` | `spell-ember-step` … `spell-echo-cast` |
| Encounter rooms | `docs/encounters/ENCOUNTER_EVOLUTION_2026-08-31.md` | Room pacing; Wave-2 specials attach here |

**Id collision rule:** do not reuse any id in §0.1. Wave-2 ids in §11 are new.

### 0.1 Reserved tombstone (never re-propose)

**#120:** `spell-shoulder-bash`, `spell-hook-line`, `spell-mist-step`, `spell-grave-bell`, `spell-root-snare`, `spell-lens-shift`, `spell-ward-plate`, `spell-pain-link`, `spell-cleanse-rite`, `spell-cinder-tile`, `spell-tripwire`, `spell-glyph-tax`, `spell-stone-turret`, `spell-turret-shard`, `spell-blood-familiar`, `spell-ricochet-mark`, `spell-void-anchor`.

**#137:** `spell-ember-step`, `spell-caltrop`, `spell-shock-glyph`, `spell-exsanguinate`, `spell-glyph-snare`, `spell-vault`, `spell-brood-ward`, `spell-aftershock`, `spell-rot-brand`, `spell-echo-cast`.

**Wave 1:** `spell-quiet-hex`, `spell-chain-ward`, `spell-crosswind`, `spell-glass-shot`, `spell-ember-wake`, `spell-split-mark`, `spell-phase-slip`, `spell-sever-tether`, `spell-overcast`, `spell-second-wind`, `spell-choir-hymn`, `spell-oath-bind`, `spell-leech-tempo`, `spell-null-brand`, `spell-false-retreat`, `spell-blood-benediction`, `spell-ward-interpose`, `spell-martyr-fuse`, `spell-hex-of-silence`. Formal blink id remains `spell-phase-slip` (never add `spell-phase-step`).

**#136 one-liners already formalized in Wave 1:** `spell-glass-shot`, `spell-ember-wake`, `spell-blood-benediction`, `spell-null-brand`, `spell-sever-tether`, `spell-ward-interpose`, `spell-martyr-fuse`. `#120` already owns `spell-hook-line`.

**#136 one-liners formalized in this Wave 2:** `spell-load-bearing`, `spell-void-glyph`.

---

## 1. Why discovery is still inert (re-audit `origin/main` @ `dd275aa`)

Wave 1 did not ship. The live player path still has nothing to discover.

| Fact | Where (this HEAD) | Effect |
| :--- | :--- | :--- |
| Every `starterSpells` row is forced `isBaseSpell: true` and unioned into `ownedSpells` | `WorldExploration.tsx` 2393–2438 | The 32-id frontend catalog is pre-owned |
| Comment still says “ALL starter spells + physical attack” | `WorldExploration.tsx` 2393–2394 | Innate-four split (`SDE-2026-08-31-001`) not landed |
| No `ownedSpellIds` / `observedSpellIds` persist maps | `Character` still `spellLevelKeys` / `spellBarOrder` | Observation cannot survive reload |
| Recap grants XP/Doka/feats only | `PostBattleRecap.tsx` 6–34 `BattleRecapData` | No `discoveredSpells` field |
| Achievements grant Doka only | `admin.mo` `defaultAchievements()` 309–326 | Feats cannot grant a spell id |
| Challenges grant Doka / XP / badge | `challengeCompletion.ts` `DEFAULT_CHALLENGES` 38–103 | Challenges cannot grant a spell id |
| `upgradeSpell` levels a known id and **charges Doka** | `main.mo` (unchanged contract) | Must never be the grant writer |
| `ENEMY_KITS` is still piece-type + zone | `enemyAI.ts` 156–193 | Seeing a bishop cast Frost teaches nothing |
| `buildEnemyKit(pieceType, currentMap.levelZone)` still gets a `{ name, minLevel, maxLevel }` object | `WorldExploration.tsx` 12479–12488; zone object built at 5265–5269 | `Math.floor(levelZone)` is `NaN`; every kit stays zone 0 |
| `inferArchetype` still treats any `healAmount > 0` as healer | `enemyAI.ts` 420–424 | Drain kits become healers |
| Summon archetype still falls back to **name** | `enemyAI.ts` 210–217 (`wolf` / `golem` / `wisp`) | Forbidden for new ids |
| `computeAITier` still plateaus at label 10 after level 900 + 30% noise | `combatMath.ts` 36–51 | Soft band, **not** a content cap |
| `pickEnemyLevelFromTiers` still clamps `maxTier = floor(999 / ts)` | `combatMath.ts` 58 | Spawn safety rail, **not** a last generation |

Quality audit still marks discovery pacing `NO_MEASURABLE_EFFECT`. Wave-1 P0 (`SDE-2026-08-31-001`…`003`, `006`) remains the prerequisite. **Do not land Wave-2 data before the ownership split.**

**Do not unlock because the encounter started.**  
**Do not require the player to be hit.** Hostile **use** (WX-applied `kind === "cast"` that spent AP) is sufficient observation.

---

## 2. Design principles (unchanged law)

Wave 1 §2 still applies in full. Restated only where Wave 2 adds a clause:

1. **Id is identity.** Observation, kits, AI, and grants key off `spell.id` only.
2. **Catalog ≠ ownership.**
3. **Use → observe → win → unlock** is the default `ENEMY_DISCOVERY` path. Same-encounter victory. `allowLaterVictory` defaults **false**.
4. **Tactical patience** is a real decision. G≥2 rares make it sharper: a CHAMPION may hold the generation-2 verb until turn 4.
5. **Not every ability is player-learnable.** `ENEMY_ONLY` / `BOSS_ONLY` / `SYSTEM_ONLY` remain closed.
6. **Never assign a spell an AI cannot use.** Missing `aiProfile` / `aiHint` = drop from resolve.
7. **Expand, do not replace.** Wave 2 fills holes Wave 1 and #120 left open (see §10). It does not clone Shield, Quiet Hex, Cinder Tile, Root, Lens, or Phase Slip.
8. **No last tier.** `G = floor(max(0, R) / T)` is unbounded. Wave 2 stamps `generationMin`. When the next designer needs a verb, they stamp `generationMin = currentPublishedMax(family) + 1`.
9. **Backend-authoritative, idempotent.** Same writers as Wave 1 §8. No Doka/XP from the grant. No `upgradeSpell`. No `updateCharacter`.
10. **Single recap.** `NEW SPELL DISCOVERED` on root `PostBattleRecap` only.
11. **Do not touch** RAF, map generation, turn logic, or damage math.

Innate seed is still **four ids only:** `physical_attack`, `starter-shield`, `starter-poison`, `starter-heal`.

---

## 3. Core mechanic (pointer)

Default discovery rule is Wave 1 §3. All five steps must hold for `ENEMY_DISCOVERY` (and for `MULTI_SOURCE` children that include it):

```
1. Hostile possesses an eligible player-learnable spell id
2. Hostile ACTUALLY USES that id during battle
     (WX applied kind === "cast" that spent AP; not AI consider, not preview)
3. Spell becomes OBSERVED for this (principal, slot, spellId)
4. Player successfully WINS that battle (same encounterId)
5. Spell becomes permanently unlocked in the Spell Library
```

Wave-2 additions to “what is used”:

| Event | Observed? |
| :--- | :--- |
| Overwatch / stance **armed** (`spell-hold-ground` applied, AP spent) | **Yes** — the technique was used |
| Overwatch **trigger** later (the stored hit fires) | **No** — do not double-observe |
| `spell-pack-howl` aura ticking without a cast | **No** — no AP spend, and `ENEMY_ONLY` anyway |
| Convert / steal that fizzles (no legal 1-HP summon) | **Yes** if AP was spent (`resolveSpellCast` fail / fizzle still observes) |

Flee / death: observation **stays**. Unlock does **not** fire. A later win without re-observation does **not** unlock (default).

---

## 4. Acquisition sources (closed enums)

Same table as Wave 1 §4. Wave-2 stamps unused **doors**, not new enum members.

| Source | Wave-2 grants (this doc) |
| :--- | :--- |
| `ENEMY_DISCOVERY` | Twelve generation / family verbs |
| `ELITE` | Taunt Oath, Convert Whelp, Last Ember |
| `ACHIEVEMENT` | Search Dust ← `explorer` (`explore_25_maps`) |
| `CHALLENGE` | Blood Tithe ← `hard_2` (`under_10_turns`) |
| `BOSS` | Claim Ward ← `chessboard_lich` (not room-0 farm) |
| `SPECIAL_ENCOUNTER` | Fog Hood ← `mist_gallery` |
| `MULTI_SOURCE` | Self Anchor ← golem observe+win **or** `easy_2` |
| `ENEMY_ONLY` | Pack Howl (never owned) |
| `BOSS_ONLY` | Reliquary Lock (never owned) |
| `SYSTEM_ONLY` | unchanged innate four |

Do **not** gate a Wave-2 spell on `unstoppable` / `level_10`. That feat is a milestone, not a last tier.

`usableByPlayer` / `usableByEnemy` remain **cast gates**, not acquisition.

---

## 5. Spell pool evolution — Generation 2+ (never a last tier)

Wave 1 §6 five pools stay. Wave 2 adds a **generation stamp** so high-relative enemies can grow verbs without retiring CORE.

```
G = floor(max(0, R) / T)     // 0, 1, 2, … no maximum
R = enemy.level − player.level
T = current tierSize (default 10)
```

| G | Pool policy (additive) |
| :--- | :--- |
| 0 | CORE only (+ Strike if empty) |
| 1 | CORE + one ADVANCED (`generationMin ≤ 1`) |
| 2 | ADVANCED guaranteed; one slot may be `generationMin ≤ 2`; RARE eligible |
| 3 | RARE weight rises; one RARE may be `generationMin ≤ 3` |
| 4+ | Same recipe. Add a definition with `generationMin = currentPublishedMax(family) + 1`. **Still the same family.** |

There is **no** `G_max`. Do not delete Wave-1 CORE to “make room.” Do not require `enemy.level >= N` as a last level.

### 5.1 Resolve order (later implementation — extends Wave 1 §6.3)

```
resolveEnemyKit(familyId, pieceType, R, variant, encounterTags, aiProfile) → SpellConfig[]
  1. CORE_POOL (always; generationMin 0)
  2. if G ≥ 1 or variant ≥ VETERAN: one ADVANCED with generationMin ≤ G
  3. if G ≥ 2: one additional slot from ADVANCED ∪ RARE with generationMin ≤ G
     (skip if no legal id)
  4. if rare roll hits: at most one RARE_POOL id with generationMin ≤ G
  5. if elite/champion tag: ELITE_POOL / SIGNATURE the AI can use
  6. drop any id whose AI_REQUIREMENTS are unmet
  7. keep ENEMY_ONLY on enemies (they cast; they never grant)
  8. if empty: [physical_attack]
```

Kit growth must pass a **number** (`G` or `floor(enemy.level / T)`), not `currentMap.levelZone` (the NaN bug is still live at `WorldExploration.tsx` 12484).

`currentPublishedMax` is a data query, not a constant in combat math.

---

## 6. New `aiHint` keys (metadata, not names)

Wave 1 §9.1 profiles still required: existing `caster | healer | charger | flanker | berserker | summoner | generic` plus needed `kiter`, `buffer`, `bomber`, `guardian`, `turret`, `controller`.

Until a profile exists, **do not** put its required spells in a live pool. Healer-inference lock unchanged: non-healer CORE must not include `healAmount > 0`.

| `aiHint` | Safe profiles | Predicate (intent) |
| :--- | :--- | :--- |
| `aura_adjacent_damage_share` | guardian, charger | Living ally within 1; skip if aura already up |
| `paint_void_tile_under_feet` | caster | Player tile is floor (not portal/void/barrier); skip if already void-glyph |
| `shrink_target_range` | caster, kiter, controller | Target has a `range > 2` spell in the known bar **or** Chebyshev ≥ 3 |
| `rear_or_flank_only` | flanker, berserker | Caster is not on the target’s front-orthogonal tile |
| `overwatch_enter_melee` | guardian, charger | Player is 2–3 away and likely to walk in; skip if already in 1 |
| `paint_ice_leave_tax` | kiter, caster | Paint the tile the player will leave toward the caster |
| `steal_one_buff` | caster, controller | Target has ≥ 1 buff ActiveEffect; skip if none |
| `punish_zero_mp_spent` | caster, controller | Target spent 0 MP on its last turn |
| `lock_teleport_swap` | caster, controller | Target kit / last actions include swap or teleport; else skip if Frost available |
| `linear_file_poke` | caster | Clear rank **or** file, Chebyshev 2–4 |
| `loan_ap_to_ally` | buffer | Ally will cast this turn and has a ≥ 3 AP spell; skip if no ally |
| `strip_one_buff` | caster | Target has a buff; prefer RES% / Enrage |
| `taunt_next_hostile_hit` | guardian | Ally within 1 is the player’s likely target |
| `steal_low_hp_summon` | caster | Hostile-to-caster summon at ≤ 25% HP (player pet vs enemy) |
| `self_buff_if_low_hp` | charger, berserker | Caster HP% ≤ 30; skip if already armed |
| `shrink_hostile_los_range` | caster | Encounter tag `mist_gallery` **or** player last used a LoS spell |
| `immune_to_push_pull` | guardian, charger | Caster is on a hazard-adjacent tile or just got swapped |
| `reveal_traps_in_radius` | — | Player-only until a scout profile exists |
| `hp_for_ap` | — | Player-only |
| `pack_chc_aura` | buffer | CHAMPION only; skip if aura up |
| `reliquary_reflect_while_object` | **boss AI only** | Reliquary still stands |
| `no_cast` | — | Kit must not include this id on world packs |

If no listed profile can satisfy the hint, the spell is `ENEMY_ONLY` **or** `usableByEnemy: false`.

---

## 7. Spell discovery UX (unchanged chrome)

Wave 1 §7 stands. No second visual system.

- In-battle: `TECHNIQUE OBSERVED` — top-centre toast + `logBattleEntry`, 2.4s, gold/crimson, name only, dedup `(encounterId, spellId)`. Existing toast family: `WorldExploration.tsx` 2181–2245.
- After victory: `NEW SPELL DISCOVERED` on root recap. Fields: **name, role, AP, range, target type, key effect, source enemy**.
- Stance / overwatch may add a **battle-log line** when it triggers (`HOLD GROUND snaps`) — that is combat feedback, not a second discovery toast.
- `ENEMY_ONLY` / `BOSS_ONLY`: optional dim `UNKNOWN TECHNIQUE` log. No observe persist.

---

## 8. Persistence (same writers)

Wave 1 §8 is the persist contract. Wave 2 adds **no** new canister methods.

| Writer | Wave-2 use |
| :--- | :--- |
| `recordSpellObservation` | All `OBSERVATION_REQUIRED` cards |
| `commitSpellDiscoveries` | Victory grants; empty if already owned |
| `unlockOwnedSpell` | `explorer`, `hard_2`, `chessboard_lich`, `mist_gallery`, `easy_2` child |

Rules that must stay true:

- Enqueue on `createProgressPersist`. `commit` after the canister write.
- Grant is owned-id **append only**.
- Must not call `upgradeSpell` (charges `spellLevelingBaseCost * 2^level`).
- Must not call `updateCharacter`.
- Must not mint Doka/XP.
- Must not reset `spellLevelKeys`.
- Duplicate victory callback → empty grant list.
- Death penalty (`saveBattleStats` 20/40) does not touch owned/observed.
- `localStorage` is cache only.

---

## 9. Special encounters (Wave 2)

Tagged world/dungeon rooms. Not level gates. Maps stay solvable (`finalizePlayableLayout`). Rewards still go through `applyRewards`; the **spell** grant is `unlockOwnedSpell` / observe+win, never a second wallet.

| `encounterId` | Composition (intent) | Discoverable |
| :--- | :--- | :--- |
| `rime_gallery` | Tide Shade + Coil on existing ice tiles; teaches leave-tax | `spell-rime-sheet` via observe+win (also available on any Tide that uses it) |
| `still_court` | Coil + Glyph; AI prefers `still-brand` if the player stands | `spell-still-brand` |
| `mist_gallery` | Two casters behind fog-like LoS breaks (existing walls; do **not** implement the `fog_of_war` stub) | `spell-fog-hood` on **victory** (observation not required — `SPECIAL_ENCOUNTER`) |

`echo_dummies` (Wave 1 False Retreat) is not re-specified.

---

## 10. Balance doctrine — holes this wave fills

Wave 1 + #120 already cover: push, pull, blink, root, range **buff**, absorb, redirect, cleanse **self**, burn tile, hidden trap, AP **zone**, turret, sacrificial pet, conditional bounce, next-spell AP tax, adjacent RES share, min-range sniper, walk-off fire, split mark, summon lock, init steal, decoy, ally heal, ally swap.

**Still open (Wave 2 only):**

| Hole | Wave-2 id | Why it is not a clone |
| :--- | :--- | :--- |
| Protector damage share | `spell-load-bearing` | Not RES% (Chain Ward / Iron Skin) |
| Null tile (anti-heal floor) | `spell-void-glyph` | Not burn (Cinder / Wake / Ember Step); not AP tax (Glyph Tax) |
| Range **cut** | `spell-paper-wind` | Opposite of Lens / Overcast |
| Rear/flank gate | `spell-rear-cut` | Positioning requirement, not a bigger Strike |
| Visible melee overwatch | `spell-hold-ground` | Not a hidden Tripwire; not Root |
| Ice leave-tax tile | `spell-rime-sheet` | Not Slow (unit); not burn |
| Steal a buff | `spell-hex-theft` | Not Cleanse (self strip) |
| Punish standing still | `spell-still-brand` | Instant condition, not Grave Bell delay |
| Block swap/blink only | `spell-grounded-lock` | Walk still legal (Root blocks walk) |
| Linear file poke | `spell-file-lance` | Geometry, no bounce (not Chain) |
| AP **loan** | `spell-loan-tempo` | Not Haste (MP) |
| Offensive one-buff strip | `spell-dispel-thread` | One buff off **them** |
| Forced targeting | `spell-taunt-oath` | Not Pain Link (redirect incoming) |
| Steal a dying pet | `spell-convert-whelp` | Not Null Brand (lockout) |
| Low-HP next physical | `spell-last-ember` | Not Enrage (+40% all) |
| HP→AP | `spell-blood-tithe` | Not Sacrifice (HP→damage) |
| Reveal traps | `spell-search-dust` | Information, 0 damage |
| Shrink **their** LoS range | `spell-fog-hood` | Not Lens |
| Tile cannot be swapped onto | `spell-claim-ward` | Not Barrier (not solid) |
| Immune to push/pull | `spell-self-anchor` | Not Iron Skin |

Duplicates still forbidden: Shield ≈ Iron Skin; Blood Mend ≈ Rally; Poison ≈ Venom; Expose ≈ Veil; Mirror ≈ Reflect Barrier.

Power bands unchanged (Wave 1 §10). Signature 6 AP stays `ENEMY_ONLY` / `BOSS_ONLY` unless a card says otherwise.

---

## 11. Proposed spells (Wave 2)

All rows: `STATUS: PROPOSED`. `mpCost: 0`. `isBaseSpell: false`. None of these ids exist in `spellData.ts`, `SPELL_ID_CATALOG`, Wave 1, #120, or #137.

`SCALING` follows existing `spellDmgGrowthPercent` / `upgradeSpell` unless marked fixed.

---

### SPELL_ID: `spell-load-bearing`

NAME: Load Bearing  
ROLE: DEFENSE — adjacent damage share  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `iron_golem`, variant ≥ CHAMPION **or** `G ≥ 2`; `aiProfile` guardian  
ENEMY_FAMILIES: `iron_golem`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL / SIGNATURE. `generationMin: 2`  
RARITY: RARE  
AP_COST: 3  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: For 2 turns, each living ally at Chebyshev ≤ 1 has 20% of incoming HP damage applied to the caster instead (`effectParams: {"shareIncomingPct":0.20,"shareRadius":1,"shareDuration":2}`). Not RES%. Not Chain Ward. Share applies **after** absorb if both exist.  
SCALING: percent fixed  
AI_REQUIREMENTS: `aiHint: "aura_adjacent_damage_share"`. Guardian / charger. Skip if no ally in 1 or aura already up.  
PLAYER_COUNTERPLAY: Pull the ally off the golem (Swap); snipe from 2; DoT the golem  
SYNERGIES: Chain Ward (RES then share — **document**: share uses post-RES remaining); Ward Interpose  
BALANCE_RISK: 20% + Iron Skin + Chain 1.15 can turtle. CD 3 + CHAMPION/`G≥2` gate. Share does **not** stack with a second Load Bearing (replace same `stat: "shareIncoming"`).  
PERSISTENCE_REQUIREMENTS: Standard observe → same-encounter win. No Doka.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-void-glyph`

NAME: Void Glyph  
ROLE: TERRAIN — anti-heal tile  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `glyph_sower`, CHAMPION or `G ≥ 2`; `aiProfile` caster  
ENEMY_FAMILIES: `glyph_sower`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL. `generationMin: 2`  
RARITY: RARE  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ground  
LOS: true  
COOLDOWN: 2  
EFFECT: `freeCells: true`. Paint one floor tile 3 turns. Combatant **starting a turn** on it or **entering** it takes 4 (environmental; RES applies, SR does not). While standing on it, `healRecv` is treated as 0 (`effectParams: {"hazardType":"void","hazardDamage":4,"hazardDuration":3,"tileHealRecv":0}`). Distinct from Cinder (burn), Glyph Tax (AP), Ember Wake (walk-off fire), #137 Glyph Snare (enter-slow).  
SCALING: hazardDamage follows dmg%; heal lock fixed  
AI_REQUIREMENTS: `aiHint: "paint_void_tile_under_feet"`. Caster. Skip if the cell is already a void-glyph or a portal.  
PLAYER_COUNTERPLAY: Step off before Blood Mend; Barrier replaces the glyph (same last-writer rule as Cinder); fight from 1 tile over  
SYNERGIES: Cursed Wound (already anti-heal — **do not** double-lock: tile lock **wins** while on the cell, Wound applies off-cell); Rift Hook toss  
BALANCE_RISK: Tile + Wound + Exsanguinate is a hospital ban. Void-glyph is **position**, not a second Wound. One cell. Challenge lava debit: use `recordInBattleChallengeDamage` only while `inBattleRef` if the tick is treated as environmental.  
PERSISTENCE_REQUIREMENTS: Standard observe → win. Observation counts **their** glyph, not player Cinder.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-paper-wind`

NAME: Paper Wind  
ROLE: CONTROL — cut their range  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: `G ≥ 1`; families `tide_shade` or `storm_caller`; `aiProfile` kiter/caster  
ENEMY_FAMILIES: `tide_shade`, `storm_caller`  
RELATIVE_DIFFICULTY_REQUIREMENT: ADVANCED. `generationMin: 1`  
RARITY: UNCOMMON  
AP_COST: 2  
RANGE: 4  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: No damage. Target’s spells with `modifiableRange: true` get `rangeDelta: -2` for 2 turns, still `minRange` respectful and `max(1, range)` (`effectParams: {"rangeDelta":-2,"rangeBuffDuration":2}`). Opposite writer to Lens / Overcast. **Last rangeDelta writer wins** (Wave 1 Overcast rule). Strike (`modifiableRange: false`) is unaffected.  
SCALING: delta fixed  
AI_REQUIREMENTS: `aiHint: "shrink_target_range"`. Kiter / caster / controller. Skip if the target is already in melee.  
PLAYER_COUNTERPLAY: Walk in; Strike; Lens after (you overwrite the cut)  
SYNERGIES: Glass Shot (they cannot hold 6); Tide Slow; Rust Reaver (the gap closer’s partner)  
BALANCE_RISK: Cut + Slow can brick a sniper bar. 2 AP / CD 2 / 2 turns is the payment. Do not also cut `minRange`.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-rear-cut`

NAME: Rear Cut  
ROLE: DAMAGE — flank-only physical  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Families `shadow_lurker` or `blink_cutter`; `aiProfile` flanker  
ENEMY_FAMILIES: `shadow_lurker`, `blink_cutter`  
RELATIVE_DIFFICULTY_REQUIREMENT: CORE for those families; ADVANCED if borrowed. `generationMin: 0`  
RARITY: COMMON  
AP_COST: 2  
RANGE: 1  
TARGET_TYPE: enemy  
LOS: false  
COOLDOWN: 0  
EFFECT: Physical. Deal 16. Legal **only** if the caster is not on the unique front-orthogonal tile of the target (`effectParams: {"requireNotFrontOrthogonal":true}`). Front = the last direction the target **walked**; if they have not walked this battle, front = the vector from target to the highest-threat hostile (usually the player). If illegal, the cast **fizzles** (AP spent — still observed). Distinct from Strike (always legal, 10).  
SCALING: damage follows dmg%; gate fixed  
AI_REQUIREMENTS: `aiHint: "rear_or_flank_only"`. Flanker / berserker. If not flanked, use Strike or Phase Slip / Swap first. **Do not** assign to chargers who only walk straight in.  
PLAYER_COUNTERPLAY: Face them; stand in a corridor; Barrier the rear tile  
SYNERGIES: Phase Slip (Wave 1); Swap; Shadow Veil after the cut  
BALANCE_RISK: 16 vs Strike 10 is the flank tax. If facing data is missing, **fail closed** (fizzle), never silently become Strike.  
PERSISTENCE_REQUIREMENTS: Standard observe → win. Fizzle still observes.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-hold-ground`

NAME: Hold Ground  
ROLE: DEFENSE — visible melee overwatch  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: `G ≥ 2` or variant ≥ ELITE; families `leash_warden`, `iron_golem`; `aiProfile` guardian  
ENEMY_FAMILIES: `leash_warden`, `iron_golem`  
RELATIVE_DIFFICULTY_REQUIREMENT: ADVANCED / ELITE. `generationMin: 2`  
RARITY: UNCOMMON  
AP_COST: 3  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: Stance, 2 turns, **visible** on the caster (carved seal, not hidden). The next hostile who **walks or is pushed/pulled into** Chebyshev 1 of the caster takes 10 (physical) and **stops on that cell** (`effectParams: {"overwatchRadius":1,"overwatchDamage":10,"overwatchStop":true,"overwatchDuration":2,"overwatchTrigger":"enter"}`). Teleport / Swap **does not** trigger (same rule as Tripwire vs Mist Step). Then consume. Distinct from Tripwire (hidden tile) and Root (MP lock).  
SCALING: damage follows dmg%; radius fixed  
AI_REQUIREMENTS: `aiHint: "overwatch_enter_melee"`. Guardian / charger. Skip if the player is already adjacent (use Strike / Shield).  
PLAYER_COUNTERPLAY: Stay at 2; Swap past; poke with Frost; send a summon in first  
SYNERGIES: Taunt Oath (force the walk); Rime Sheet (tax the leave)  
BALANCE_RISK: Stop + 10 can feel like a free Root. Consume-on-first-body and CD 3. Observation is the **arm**, not the snap.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-rime-sheet`

NAME: Rime Sheet  
ROLE: TERRAIN — ice leave-tax  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `tide_shade`; `G ≥ 1` or VETERAN  
ENEMY_FAMILIES: `tide_shade`  
RELATIVE_DIFFICULTY_REQUIREMENT: ADVANCED. `generationMin: 1`  
RARITY: UNCOMMON  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ground  
LOS: true  
COOLDOWN: 2  
EFFECT: `freeCells: true`. Paint one floor tile 3 turns (`hazardType: "rime"`). **Leaving** the tile by walking costs +1 MP (min 1). Entering is free. No damage. `effectParams: {"hazardType":"rime","leaveMpTax":1,"hazardDuration":3}`. Distinct from Slow (−2 MP on the unit) and from map ice (do not retune map ice). Last writer on `"x,y"` wins vs Cinder / void-glyph.  
SCALING: tax fixed  
AI_REQUIREMENTS: `aiHint: "paint_ice_leave_tax"`. Kiter / caster. Paint the cell between the player and the Tide, not under a 0-MP target (they are already stuck).  
PLAYER_COUNTERPLAY: Don’t step on it; Haste; Mist Step / Phase Slip off (teleport does **not** pay the leave tax)  
SYNERGIES: Paper Wind; Frost Bolt; `still_court`  
BALANCE_RISK: Rime + Slow + Drain Courage bricks a turn. AI skip if target MP is already 0. Challenge: MP tax is not HP — do not call `recordChallengeDamageTaken`.  
PERSISTENCE_REQUIREMENTS: Standard observe → win. Also the intended `rime_gallery` teach.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-hex-theft`

NAME: Hex Theft  
ROLE: CONTROL — steal one buff  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: `G ≥ 2`; families `bone_scribe`, `coil_arbiter`; `aiProfile` caster/controller  
ENEMY_FAMILIES: `bone_scribe`, `coil_arbiter`  
RELATIVE_DIFFICULTY_REQUIREMENT: RARE. `generationMin: 2`  
RARITY: RARE  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 3  
EFFECT: No damage. Remove **one** `ActiveEffect` with `type: "buff"` from the target (prefer `buffStat` in order `res`, then damage/Enrage, then `chc`, then other). Copy that effect onto the caster for the **remaining** duration (`effectParams: {"stealBuffCount":1,"preferStats":["res","dmg","chc"]}`). If none, fizzle (AP spent). Distinct from Cleanse Rite (self, debuff+DoT) and Dispel Thread (strip, no copy).  
SCALING: none  
AI_REQUIREMENTS: `aiHint: "steal_one_buff"`. Caster / controller. Skip if no buff.  
PLAYER_COUNTERPLAY: Don’t pre-buff; Cleanse is the wrong answer (you already lost it); kill the thief  
SYNERGIES: Quiet Hex after; Enrage they stole becomes their problem  
BALANCE_RISK: Stealing Iron Skin + Load Bearing is a swing. One buff, CD 3, no damage. Do not steal absorb **and** RES in one cast.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-still-brand`

NAME: Still Brand  
ROLE: DAMAGE — punish no-move  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: `G ≥ 1`; families `coil_arbiter`, `glyph_sower`  
ENEMY_FAMILIES: `coil_arbiter`, `glyph_sower`  
RELATIVE_DIFFICULTY_REQUIREMENT: ADVANCED. `generationMin: 1`  
RARITY: UNCOMMON  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: Deal 10. If the target spent **0 MP** on its last turn (no walk), deal 18 instead and apply `isMark` on **their current tile** (`effectParams: {"baseDamage":10,"stillDamage":18,"stillRequiresZeroMpSpent":true,"stillAppliesMark":true}`). Instant. Distinct from Grave Bell (delay + execute%).  
SCALING: both damages follow dmg%; condition fixed  
AI_REQUIREMENTS: `aiHint: "punish_zero_mp_spent"`. Caster / controller. If they walked, AI may still cast for 10 only when Frost is unavailable.  
PLAYER_COUNTERPLAY: Spend 1 MP (step and step back); Haste leftover; don’t camp a glyph  
SYNERGIES: Root Snare (#120) sets up the “still” window — **legal**: root is MP lock, so Still Brand **does** see 0 MP. That combo is the point (18 + Mark).  
BALANCE_RISK: Root + Still every 2 turns. CD 2 + 3 AP. Do not also apply Cursed Wound in the same kit turn at BASE.  
PERSISTENCE_REQUIREMENTS: Standard observe → win. `still_court` teaches it.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-grounded-lock`

NAME: Grounded Lock  
ROLE: CONTROL — block blink / swap  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: `G ≥ 2`; families `null_censor`, `rift_hook`; `aiProfile` controller/caster  
ENEMY_FAMILIES: `null_censor`, `rift_hook`  
RELATIVE_DIFFICULTY_REQUIREMENT: RARE. `generationMin: 2`  
RARITY: RARE  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 3  
EFFECT: No damage. For 2 turns the target cannot resolve `isSwap`, `effectCategory: "teleport"`, or `teleportMode` (`effectParams: {"grounded":true,"blocksSwap":true,"blocksTeleport":true,"durationTurns":2}`). **Walk still works.** Distinct from Root Snare (MP = 0).  
SCALING: duration fixed  
AI_REQUIREMENTS: `aiHint: "lock_teleport_swap"`. Skip if the target has not shown swap/teleport this fight **and** Frost is in kit.  
PLAYER_COUNTERPLAY: Walk; Phase Slip is illegal so plan two turns of feet; Cleanse Rite if it lists `grounded` in `cleanseTypes` (Wave-2: add `"grounded"` to that whitelist when implemented)  
SYNERGIES: Hold Ground (they must walk into the ring); File Lance  
BALANCE_RISK: Grounded + Root is a hard brick. **Do not** put both on one BASE kit. ELITE may own both only if AI never casts them the same turn.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-file-lance`

NAME: File Lance  
ROLE: DAMAGE — linear rank/file  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `storm_caller`; `G ≥ 2`; `linear` + LoS metadata  
ENEMY_FAMILIES: `storm_caller`  
RELATIVE_DIFFICULTY_REQUIREMENT: RARE. `generationMin: 2`  
RARITY: RARE  
AP_COST: 4  
RANGE: 4  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: `linear: true`. Hits the primary and every combatant on the same **rank or file** up to 3 tiles behind them (max 3 bodies). 12 spell each. No bounce, no diagonal (`effectParams: {"lineMode":"rank_or_file","lineExtraTiles":3,"lineDamage":12}`). Distinct from Chain Lightning (bounce to nearest) and from Starborn `ATTACK_ALL_LINES` (`BOSS_ONLY`).  
SCALING: damage follows dmg%; tile count fixed  
AI_REQUIREMENTS: `aiHint: "linear_file_poke"`. Caster. Skip if the line is blocked by Barrier or would hit more allies than hostiles (`hitsAllies: false`).  
PLAYER_COUNTERPLAY: Stand off-axis; Barrier the file; don’t clump summons  
SYNERGIES: Mark on the primary; Paper Wind (they cannot snipe back from 6)  
BALANCE_RISK: 36 on a stacked file is Inferno-adjacent. 4 AP + LoS + axis gate. Do **not** give this to queens as a generic nuke.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-loan-tempo`

NAME: Loan Tempo  
ROLE: SUPPORT — AP loan  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `hex_chorister`; `aiProfile` buffer; `G ≥ 1`  
ENEMY_FAMILIES: `hex_chorister`  
RELATIVE_DIFFICULTY_REQUIREMENT: ADVANCED. `generationMin: 1`  
RARITY: UNCOMMON  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 2  
EFFECT: Ally gains +1 **current** AP this turn (not max). Caster’s **next** turn starts at −1 AP (min 1 remaining after regen) (`effectParams: {"allyApNow":1,"selfApNextTurn":-1}`). Not Haste (MP). Not Timestep. Does not write persisted `CharacterStats.ap`.  
SCALING: none  
AI_REQUIREMENTS: `aiHint: "loan_ap_to_ally"`. **Buffer only.** Skip if no ally or ally already has leftover AP ≥ 2. Do not assign until `buffer` exists (Wave 1 §9.1).  
PLAYER_COUNTERPLAY: Kill the Chorister first; Slow the ally so the borrowed AP is wasted  
SYNERGIES: Enrage the same ally; `hard_3` (the player copy can break 8 AP — **explicit**: Loan Tempo **does** count toward `maxApUsedInTurn` on the **receiver**)  
BALANCE_RISK: Player +1 AP on an Inferno turn. 2 AP cost + next-turn debt + CD 2. Do not also restore MP.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-dispel-thread`

NAME: Dispel Thread  
ROLE: CONTROL — strip one buff  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `bone_scribe`; `G ≥ 0`  
ENEMY_FAMILIES: `bone_scribe`  
RELATIVE_DIFFICULTY_REQUIREMENT: CORE for scribe; ADVANCED if borrowed. `generationMin: 0`  
RARITY: COMMON  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: No damage. Remove **one** buff from the target. Do **not** copy it (`effectParams: {"stripBuffCount":1}`). If none, fizzle (AP spent). Distinct from Hex Theft (steal) and Cleanse Rite (self debuff+DoT).  
SCALING: none  
AI_REQUIREMENTS: `aiHint: "strip_one_buff"`. Caster. Prefer Enrage / Iron Skin / Shield. Skip if no buff (cast Weaken instead).  
PLAYER_COUNTERPLAY: Recast the cheap Shield; don’t stack three buffs in front of a scribe  
SYNERGIES: Quiet Hex; Expose after the Skin drops  
BALANCE_RISK: Cheap answer to every buff. 0 damage + CD 2 + one buff only. **Do not** strip DoTs or Mark tiles.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-taunt-oath`

NAME: Taunt Oath  
ROLE: DEFENSE — forced targeting  
ACQUISITION_SOURCE: ELITE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Elite/champion pack; family `iron_golem` or `leash_warden`; `G ≥ 2`  
ENEMY_FAMILIES: `iron_golem`, `leash_warden`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL. `generationMin: 2`  
RARITY: RARE  
AP_COST: 3  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: For 1 hostile action, any damaging **spell or Strike** that hostile spends must target this caster if the caster is in that action’s legal range. If the caster is out of range, the action proceeds normally (`effectParams: {"tauntNextHostileAction":true,"tauntRequiresInRange":true}`). Distinct from Pain Link (redirect after the hit).  
SCALING: none  
AI_REQUIREMENTS: `aiHint: "taunt_next_hostile_hit"`. Guardian. Cast when an ally is the likely focus and the player is in Strike/Frost range of the tank.  
PLAYER_COUNTERPLAY: Cast a utility (Slow, Mark) — taunt is **damaging** actions only; walk out of range; AoE that already includes the tank  
SYNERGIES: Load Bearing; Hold Ground  
BALANCE_RISK: Taunt + Load Bearing + Iron Skin can stall. 1 action, CD 3. Inferno / Nova still hit others if they are in the area **and** the primary is the tank (area primary must be the tank).  
PERSISTENCE_REQUIREMENTS: Observe + elite/champion victory.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-convert-whelp`

NAME: Convert Whelp  
ROLE: ANTI-SUMMON — steal a dying pet  
ACQUISITION_SOURCE: ELITE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Elite/champion; family `brood_chanter` or `null_censor`; a summon at ≤ 25% HP exists  
ENEMY_FAMILIES: `brood_chanter`, `null_censor`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL. `generationMin: 2`  
RARITY: RARE  
AP_COST: 4  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 4  
EFFECT: Legal only if the target is `isSummon` (or a hostile summon combatant) and `hp/maxHp ≤ 0.25`. On success, the summon’s `side` flips to the caster’s side for its **remaining** lifespan (`effectParams: {"convertSummon":true,"maxHpPct":0.25}`). Does not count as a new `isSummon` cast for Null Brand. Does not grant extra `level * 20` XP (minion filter). Distinct from Null Brand (lock) and Oath Bind (mutual lock).  
SCALING: threshold fixed  
AI_REQUIREMENTS: `aiHint: "steal_low_hp_summon"`. Caster. Brood Chanter may convert a **player** pet. Null Censor may convert then immediately focus the owner. Fizzle if no legal target (still observed).  
PLAYER_COUNTERPLAY: Keep pets above 25%; dismiss by lifespan on your turn; don’t leave a 1-HP wolf  
SYNERGIES: Cursed Wound first; Sever Tether after you kill your own converted leftover  
BALANCE_RISK: Stealing a Sentinel is huge. 4 AP / CD 4 / 25% gate. Converted unit keeps its remaining lifespan (usually 1–2). `ENEMY_SUMMON_CAP` still applies to the **new** owner.  
PERSISTENCE_REQUIREMENTS: Observe + elite/champion victory.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-last-ember`

NAME: Last Ember  
ROLE: SUPPORT — low-HP next physical  
ACQUISITION_SOURCE: ELITE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Elite/champion; family `ember_knight` or `crimson_spawn`; caster HP% ≤ 50 to **learn-gate kits**, ≤ 30 to **cast**  
ENEMY_FAMILIES: `ember_knight`, `crimson_spawn`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL. `generationMin: 2`  
RARITY: RARE  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: If caster `hp/maxHp > 0.30`, fizzle (AP spent). Else, next `isPhysical` hit from the caster deals +12 (`effectParams: {"requireHpPctAtMost":0.30,"nextPhysicalBonus":12}`). Distinct from Enrage (+40% all damage, 2 turns).  
SCALING: bonus follows dmg%; threshold fixed  
AI_REQUIREMENTS: `aiHint: "self_buff_if_low_hp"`. Charger / berserker. Skip if HP% > 30 or Enrage is already up (do not stack the same turn).  
PLAYER_COUNTERPLAY: Finish them before the Strike; don’t chip to 29% and walk adjacent  
SYNERGIES: Rear Cut; Sacrifice (HP cost can **arm** this — legal and documented)  
BALANCE_RISK: Sacrifice → Last Ember → Rear Cut is a burst package. CD 3 + 30% gate. **Do not** let Last Ember apply to Inferno.  
PERSISTENCE_REQUIREMENTS: Observe + elite/champion victory.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-blood-tithe`

NAME: Blood Tithe  
ROLE: SUPPORT — HP for AP  
ACQUISITION_SOURCE: CHALLENGE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Complete `hard_2` (`under_10_turns`)  
ENEMY_FAMILIES: none (`usableByEnemy: false`)  
RELATIVE_DIFFICULTY_REQUIREMENT: n/a  
RARITY: CHALLENGE  
AP_COST: 1  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: Pay 8 current HP (cannot drop below 1). Gain +2 current AP this turn (`effectParams: {"payHp":8,"gainAp":2,"floorHp":1}`). If HP ≤ 8, pay down to 1 and gain only +1 AP. Not a heal (`spellType` must not be `"heal"`). Not Sacrifice (no damage). `no_healing` challenges stay valid. Overworld Doka-to-HP must **not** set `healUsed` (existing rule); this spell also must not.  
SCALING: pay/gain fixed  
AI_REQUIREMENTS: Player-only. `aiHint` unused.  
PLAYER_COUNTERPLAY: Chip them so the floor-1 path is painful  
SYNERGIES: Blitz / `hard_2` / `legendary_2`; Inferno turn; `hard_3` — Tithe **does** count the resulting AP spend  
BALANCE_RISK: +2 AP on demand. HP payment + CD 3. Do not also grant MP. Challenge HP from the 8 is **self-spend**, not `recordChallengeDamageTaken` (that helper is incoming combat). Document: self-tithe does **not** fail `no_damage_taken`.  
PERSISTENCE_REQUIREMENTS: Grant on challenge persist (`rewards.spellIds`) only when `isChallengeCompleted` is true. Same lock as XP/Doka. Failed challenge grants nothing. Idempotent.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-search-dust`

NAME: Search Dust  
ROLE: SUPPORT — reveal traps  
ACQUISITION_SOURCE: ACHIEVEMENT  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Feat `explorer` (`explore_25_maps`) unlocked  
ENEMY_FAMILIES: none (`usableByEnemy: false`)  
RELATIVE_DIFFICULTY_REQUIREMENT: n/a  
RARITY: FEAT  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: Reveal opposing-side hidden traps (`trapHidden`) and Mark tiles in Chebyshev ≤ 2 for the rest of this turn (`effectParams: {"revealTrapsRadius":2,"revealDurationTurns":1}`). 0 damage. Does not disarm. Distinct from Tripwire (place) and Glyph Snare (place).  
SCALING: none  
AI_REQUIREMENTS: Player-only until a scout profile exists (`aiHint: "reveal_traps_in_radius"`).  
PLAYER_COUNTERPLAY: n/a (player tool); enemies: place the wire after they search  
SYNERGIES: Tripwire (#120); Pale Archivist glyphs; `mist_gallery`  
BALANCE_RISK: Information only. Do not also grant damage.  
PERSISTENCE_REQUIREMENTS: Grant on `markAchievementUnlocked("explorer")` via `spellRewardIds`. Idempotent. Doka claim stays on `claimAchievementReward`. `getPlayerAchievements(identity.getPrincipal())`.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-fog-hood`

NAME: Fog Hood  
ROLE: CONTROL — shrink their LoS range  
ACQUISITION_SOURCE: SPECIAL_ENCOUNTER  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Tagged encounter `mist_gallery`  
ENEMY_FAMILIES: encounter script may use `wraith_bishop` / `tide_shade` art  
RELATIVE_DIFFICULTY_REQUIREMENT: Special encounter only for the **grant**. Later world casters may receive a weaker enemy-cast copy at `G ≥ 3` (`generationMin: 3`)  
RARITY: SPECIAL  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: false  
COOLDOWN: 3  
EFFECT: Target’s LoS spells (`lineOfSight: true`) treat `range` as `max(1, range - 2)` for 2 turns (`effectParams: {"losRangeDelta":-2,"durationTurns":2}`). Does not write `modifiableRangeBonusRef` (that is Lens / Paper Wind). Distinct from Paper Wind (all `modifiableRange` spells) — Fog Hood is **LoS only**, so Swap / Strike / Barrier are untouched.  
SCALING: delta fixed  
AI_REQUIREMENTS: Encounter script may cast it. World packs: `aiHint: "shrink_hostile_los_range"` only at `G ≥ 3`.  
PLAYER_COUNTERPLAY: Melee; Swap; wait 2  
SYNERGIES: Search Dust; Glass Shot (they lose the 6); Barrier  
BALANCE_RISK: Paper Wind + Fog Hood must **not** stack to −4. If both apply, **max cut is −2** (one range writer family).  
PERSISTENCE_REQUIREMENTS: Grant on special-encounter victory writer (`encounterId = mist_gallery`). Idempotent. No observe required.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-claim-ward`

NAME: Claim Ward  
ROLE: TERRAIN — anti-swap cell  
ACQUISITION_SOURCE: BOSS  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Defeat `chessboard_lich` (not room-0 farm)  
ENEMY_FAMILIES: none as world-pack  
RELATIVE_DIFFICULTY_REQUIREMENT: Boss clear  
RARITY: BOSS  
AP_COST: 3  
RANGE: 2  
TARGET_TYPE: ground  
LOS: true  
COOLDOWN: 3  
EFFECT: `freeCells: true`. Paint one floor tile 2 turns. That cell **cannot be a Swap or teleport destination** (`effectParams: {"claimForbidsSwap":true,"claimForbidsTeleport":true,"hazardDuration":2}`). Walk on / off is legal. Not a Barrier (not solid). Not the Lich’s 3×3 `BOARD_CLAIM` (`BOSS_ONLY`).  
SCALING: duration fixed  
AI_REQUIREMENTS: Player-first. If a later glyph sower gets it: `aiHint: "paint_void_tile_under_feet"` is the wrong hint — add `paint_anti_swap_tile` at that time, do not reuse void-glyph scoring.  
PLAYER_COUNTERPLAY: Walk onto it; wait 2; Barrier is the solid answer  
SYNERGIES: Grounded Lock (unit + tile); Hold Ground  
BALANCE_RISK: Claim + Barrier + Grounded deletes mobility. CD 3 + one cell + 2 turns.  
PERSISTENCE_REQUIREMENTS: Grant on Chessboard Lich victory persist. Idempotent. No extra Doka.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-self-anchor`

NAME: Self Anchor  
ROLE: DEFENSE — ignore push / pull  
ACQUISITION_SOURCE: MULTI_SOURCE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true if learned via golem; false if via `easy_2`  
MINIMUM_ELIGIBILITY: Iron Golem used it **or** complete `easy_2` (`under_15_turns`)  
ENEMY_FAMILIES: `iron_golem`  
RELATIVE_DIFFICULTY_REQUIREMENT: ADVANCED for the family (`generationMin: 1`); feat/challenge is level-agnostic  
RARITY: UNCOMMON  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: For 2 turns the caster cannot be moved by `pushback` / `attract` (`effectParams: {"anchorIgnorePush":true,"anchorIgnoreAttract":true,"durationTurns":2}`). Swap **still works** (that is Grounded’s job). Walk still works. Distinct from Iron Skin (RES%) and Void Anchor (#120 boss combo).  
SCALING: none  
AI_REQUIREMENTS: `aiHint: "immune_to_push_pull"`. Guardian / charger. Cast after a Swap scare or when standing on a hazard-adjacent tile.  
PLAYER_COUNTERPLAY: Swap them anyway; Root; just hit them  
SYNERGIES: Load Bearing (stay on the share tile); Rift Hook becomes a wasted Swap  
BALANCE_RISK: Anchor + Grounded on one kit deletes all displacement. **Do not** put both on BASE. First completed MULTI_SOURCE child wins — no double copy.  
PERSISTENCE_REQUIREMENTS: Observe+win **or** `easy_2` challenge persist `rewards.spellIds`. Idempotent.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-pack-howl`

NAME: Pack Howl  
ROLE: SUPPORT — champion CHC aura  
ACQUISITION_SOURCE: ENEMY_ONLY  
PLAYER_LEARNABLE: false  
OBSERVATION_REQUIRED: n/a  
MINIMUM_ELIGIBILITY: Family `hex_chorister`, CHAMPION; `aiProfile` buffer  
ENEMY_FAMILIES: `hex_chorister`  
RELATIVE_DIFFICULTY_REQUIREMENT: SIGNATURE. `generationMin: 2`  
RARITY: FAMILY SIGNATURE  
AP_COST: 3  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 4  
EFFECT: Allies within Chebyshev 2 gain `buffStat: "chc"`, `buffModifier: 0.10`, 2 turns (`effectParams: {"packChc":0.10,"packRadius":2,"packDuration":2}`). Player already has Choir Hymn (single-target 10%). They do **not** learn a pack aura.  
SCALING: modifier fixed  
AI_REQUIREMENTS: `aiHint: "pack_chc_aura"`. Buffer / CHAMPION only. Skip if aura up or no ally in 2.  
PLAYER_COUNTERPLAY: Isolate; kill the Chorister; Null Field  
SYNERGIES: Enrage + Howl on a Lurker  
BALANCE_RISK: Pack 10% + Enrage + player CHC. That is why it is `ENEMY_ONLY`.  
PERSISTENCE_REQUIREMENTS: Never written to `ownedSpellIds`. Optional dim `UNKNOWN TECHNIQUE` log only. Aura ticks without a second observe.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-reliquary-lock`

NAME: Reliquary Lock  
ROLE: DEFENSE — object-gated reflect  
ACQUISITION_SOURCE: BOSS_ONLY  
PLAYER_LEARNABLE: false  
OBSERVATION_REQUIRED: n/a  
MINIMUM_ELIGIBILITY: `pale_archbishop` while the Reliquary object still stands  
ENEMY_FAMILIES: none (boss id only)  
RELATIVE_DIFFICULTY_REQUIREMENT: Boss phase 1–2 as long as the object lives  
RARITY: BOSS SIGNATURE  
AP_COST: 4  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: Next spell reflects (Mirror-class) **only if** a living Reliquary object exists (`effectParams: {"reflectRequiresObject":true,"objectTag":"reliquary"}`). Player already has `spell-mirror`. Arena reflect stays identity.  
SCALING: none  
AI_REQUIREMENTS: Boss AI only. `aiHint: "reliquary_reflect_while_object"`. **Do not** put in world `ENEMY_KITS`. Never recast if the Reliquary is down (#137 sheet).  
PLAYER_COUNTERPLAY: Break the Reliquary; Strike; don’t dump a nova into an up lock  
SYNERGIES: Archbishop curse  
BALANCE_RISK: A player-owned object-gated reflect would require a pet/object system we do not have. `BOSS_ONLY`.  
PERSISTENCE_REQUIREMENTS: Never owned.  
STATUS: PROPOSED

---

## 12. Family pool attachments (Wave 2 only)

Add these ids to the **named** family pools in a later data PR. Do not grab random `usableByEnemy` rows.

| Family | Pool | Id |
| :--- | :--- | :--- |
| `iron_golem` | ADVANCED | `spell-self-anchor` |
| `iron_golem` | ELITE / SIGNATURE | `spell-load-bearing`, `spell-taunt-oath` |
| `leash_warden` | ADVANCED | `spell-hold-ground` |
| `leash_warden` | ELITE | `spell-taunt-oath` |
| `glyph_sower` | ADVANCED | `spell-still-brand` |
| `glyph_sower` | ELITE | `spell-void-glyph` |
| `tide_shade` | ADVANCED | `spell-rime-sheet`, `spell-paper-wind` |
| `storm_caller` | ADVANCED | `spell-paper-wind` |
| `storm_caller` | RARE | `spell-file-lance` |
| `shadow_lurker` | CORE | `spell-rear-cut` |
| `blink_cutter` | CORE | `spell-rear-cut` |
| `bone_scribe` | CORE | `spell-dispel-thread` |
| `bone_scribe` | RARE | `spell-hex-theft` |
| `coil_arbiter` | ADVANCED | `spell-still-brand` |
| `coil_arbiter` | RARE | `spell-hex-theft`, `spell-grounded-lock` |
| `null_censor` | RARE | `spell-grounded-lock` |
| `null_censor` | ELITE | `spell-convert-whelp` |
| `rift_hook` | RARE | `spell-grounded-lock` |
| `hex_chorister` | ADVANCED | `spell-loan-tempo` |
| `hex_chorister` | SIGNATURE | `spell-pack-howl` (ENEMY_ONLY) |
| `brood_chanter` | ELITE | `spell-convert-whelp` |
| `ember_knight` / `crimson_spawn` | ELITE | `spell-last-ember` |

Empty slot → skip. Empty kit → `[physical_attack]`.

---

## 13. How to add Generation 3 forever

Same recipe as Wave 1 §12, with the generation stamp:

1. Pick a hole that is not in §10 or the tombstone.
2. Stamp `generationMin = currentPublishedMax(family) + 1`.
3. Default `ENEMY_DISCOVERY` + observe + same-encounter win.
4. Write `AI_REQUIREMENTS`. If no profile can satisfy them, `usableByEnemy: false` or `ENEMY_ONLY`.
5. Explicit `SpellConfig` metadata. No `if (spell.name === …)`.
6. Add the id to the family pool **and** `SPELL_ID_CATALOG` **and** `spellData.ts` in the **same** implementation PR.
7. Persist only through Wave 1 §8 writers.
8. UX: `TECHNIQUE OBSERVED` / `NEW SPELL DISCOVERED`.
9. `STATUS: PROPOSED` until a human/orchestrator picks the ACTION_ID.

---

## 14. Implementation slices (later PRs — not this change)

Wave-1 slices A–D (ownership, observe, commit, toast) **before** any Wave-2 data.

| Slice | Touches | Must not touch |
| :--- | :--- | :--- |
| W2-A. `generationMin` on resolve | Kit resolver | `pickEnemyLevelFromTiers` percents |
| W2-B. New `aiHint` predicates | `decide*` helpers | Name fallbacks; RAF |
| W2-C. Wave-2 data | `spellData.ts` + kits + catalog | Name heuristics |
| W2-D. Special rooms | Encounter tag table | `mapGen.ts` algorithms |
| W2-E. Feat/challenge/boss stamps | `spellRewardIds` / `rewards.spellIds` | Doka formula |

Extract helpers. Do not grow `WorldExploration.tsx`.

---

## 15. QA matrix (additive to Wave 1 §14)

| # | Check | Pass |
| :--- | :--- | :--- |
| W2-1 | Encounter start | Possessed-but-unused G2 id does not observe |
| W2-2 | Hold Ground arm | Observe on arm; snap does not second-observe |
| W2-3 | Rear Cut fizzle | Illegal facing still observes; no grant until win |
| W2-4 | Hex Theft empty | Fizzle observes; no buff copied |
| W2-5 | Convert illegal | No 25% pet → fizzle observes; no side flip |
| W2-6 | Pack Howl | Never in `ownedSpellIds` |
| W2-7 | Reliquary Lock | Never in `ownedSpellIds` |
| W2-8 | Fog Hood | `mist_gallery` win grants once; defeat does not |
| W2-9 | Blood Tithe | Failed `hard_2` grants neither XP nor the spell |
| W2-10 | Search Dust | Other accounts do not gain it when Admin edits the catalog |
| W2-11 | Paper Wind + Fog Hood | Range cut caps at −2 |
| W2-12 | Grounded + Root | Not on one BASE kit |
| W2-13 | Multi-source Self Anchor | First child wins; no second row |
| W2-14 | G=0 Tide | No File Lance (generationMin 2) |
| W2-15 | Duplicate victory | One owned row; levels untouched; no Doka |
| W2-16 | Typecheck | `pnpm typecheck` / `pnpm check` clean when code lands |

---

## 16. Out of scope

- Production TypeScript / Motoko / Candid in this PR
- RAF, map generation, turn logic, damage math
- Re-authoring Wave 1, #120, or #137 cards
- Gating on `unstoppable` / `level_10`
- Implementing the `fog_of_war` map-modifier stub
- Shop-bought spells
- A level cap, a last generation, or a last spell tier

---

## 17. Wave-2 index

| SPELL_ID | Source | Learnable | Family / gate | Hole |
| :--- | :--- | :--- | :--- | :--- |
| `spell-load-bearing` | ENEMY_DISCOVERY | yes | golem CHAMPION / G≥2 | Adjacent damage share |
| `spell-void-glyph` | ENEMY_DISCOVERY | yes | glyph_sower | Anti-heal tile |
| `spell-paper-wind` | ENEMY_DISCOVERY | yes | tide / storm | Range cut |
| `spell-rear-cut` | ENEMY_DISCOVERY | yes | lurker / cutter | Flank-only physical |
| `spell-hold-ground` | ENEMY_DISCOVERY | yes | warden / golem | Visible melee overwatch |
| `spell-rime-sheet` | ENEMY_DISCOVERY | yes | tide_shade | Ice leave-tax |
| `spell-hex-theft` | ENEMY_DISCOVERY | yes | scribe / coil | Steal one buff |
| `spell-still-brand` | ENEMY_DISCOVERY | yes | coil / glyph | Punish 0 MP spent |
| `spell-grounded-lock` | ENEMY_DISCOVERY | yes | censor / rift | Block swap/blink |
| `spell-file-lance` | ENEMY_DISCOVERY | yes | storm_caller G≥2 | Rank/file poke |
| `spell-loan-tempo` | ENEMY_DISCOVERY | yes | hex_chorister | AP loan |
| `spell-dispel-thread` | ENEMY_DISCOVERY | yes | bone_scribe | Strip one buff |
| `spell-taunt-oath` | ELITE | yes | golem / warden | Forced targeting |
| `spell-convert-whelp` | ELITE | yes | brood / censor | Steal dying pet |
| `spell-last-ember` | ELITE | yes | ember / crimson | Low-HP next physical |
| `spell-blood-tithe` | CHALLENGE | yes | `hard_2` | HP for AP |
| `spell-search-dust` | ACHIEVEMENT | yes | `explorer` | Reveal traps |
| `spell-fog-hood` | SPECIAL_ENCOUNTER | yes | `mist_gallery` | LoS range cut |
| `spell-claim-ward` | BOSS | yes | Chessboard Lich | Anti-swap cell |
| `spell-self-anchor` | MULTI_SOURCE | yes | golem **or** `easy_2` | Ignore push/pull |
| `spell-pack-howl` | ENEMY_ONLY | no | hex_chorister CHAMPION | Pack CHC aura |
| `spell-reliquary-lock` | BOSS_ONLY | no | Pale Archbishop | Object-gated reflect |

All STATUS: **PROPOSED**.

---

**Document status:** PROPOSED. Safe to review and to implement in sliced PRs after Wave-1 P0 and after a human or orchestrator picks an ACTION_ID. Not a license to land combat code in the same change as this spec.
