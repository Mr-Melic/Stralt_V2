# Spell and Tactical Mechanics — Design Pass 2026-08-31

**Role:** Spell and Tactical Mechanics Designer  
**Status:** PROPOSED — no production code in this pass  
**HEAD audited:** `22503b5` (`fix: keep generated maps solvable across seeds`)  
**Sibling system:** [Spell, Discovery & Achievement Admin Designer](https://cursor.com/automations/4efa22ec-a498-11f1-a7d1-d6b4613131ce) (`4efa22ec-a498-11f1-a7d1-d6b4613131ce`)

This document is a catalog audit plus sixteen proposed spells. Every proposed spell is **data-only**: it must resolve from explicit `SpellConfig` / `effectParams` fields. `spell.name` is UI and battle-log copy. Targeting and effects must never branch on name.

---

## 1. Catalog that actually exists

There are **two live catalogs** plus a stale boss-seed list. They do not agree.

### 1.1 Frontend runtime catalog — `src/frontend/src/data/spellData.ts`

`SPELL_ID_CATALOG` in `src/frontend/src/data/bossKits.ts` lists **32** ids. `WorldExploration.tsx` treats **every** `starterSpells` entry as `isBaseSpell: true` and always-owned (`baseSpells` union, ~2242–2272). Discovery currently has **nothing to discover** on the player path.

| ID | Name | Family (actual) | AP | Dmg / other | Range | Notes |
| :--- | :--- | :--- | ---: | :--- | ---: | :--- |
| `physical_attack` | Strike | direct physical | 2 | 10 | 1 | Only true melee baseline |
| `starter-shield` | Shield | RES% buff | 2 | +30% RES / 3 | 3 | Ally/self |
| `starter-poison` | Poison Arrow | DoT poison | 2 | 4×3 | 4 | No upfront |
| `starter-blast` | Chain Lightning | chain | 4 | 20 + 2 bounces | 4 | Only bounce spell |
| `starter-heal` | Blood Mend | self heal + CHC | 3 | 12 + +15% CHC / 2 | 0 | Self only |
| `starter-drain` | Life Drain | drain + SP | 3 | 10 / heal 5 + SP×0.8 / 2 | 2 | |
| `starter-frost` | Frost Bolt | damage + MP | 3 | 20 + MP−1 / 1 | 4 | |
| `spell-swap` | Swap | swap teleport | 3 | 0 | 3 | Only position spell |
| `spell-mark` | Mark | tile amp | 2 | next hit ×2 | 4 | Tile, not unit |
| `spell-barrier` | Barrier | obstacle | 3 | wall 2 turns | 2 | `freeCells`; player-only |
| `spell-mirror` | Mirror | reflect 1 spell | 4 | 0 | 0 | Player-only in data |
| `spell-timestep` | Timestep | full AP/MP once | 0 | once/battle | 0 | Player-only |
| `spell-sacrifice` | Sacrifice | HP-cost burst | 3 | 20% HP ×3 | 1 | |
| `spell-lifesteal-nova` | Lifesteal Nova | AoE drain | 5 | 20 + heal 10/hit r=2 | 1 | |
| `spell-enrage` | Enrage | DMG buff | 3 | +40% / 2 | 3 | |
| `spell-iron-skin` | Iron Skin | RES% buff | 3 | +30% RES / 3 | 3 | **Duplicate of Shield** |
| `spell-haste` | Haste | MP buff | 2 | +2 MP / 1 | 3 | |
| `spell-weaken` | Weaken | DMG debuff | 3 | ×0.7 / 2 | 3 | |
| `spell-slow` | Slow | MP debuff | 2 | −2 MP / 2 | 3 | Only “root-like” tool |
| `spell-expose` | Expose | dmg + RES/SP | 3 | 15 + ×0.8 / 2 | 3 | |
| `spell-venom-strike` | Venom Strike | DoT venom | 3 | 4×3 | 2 | **Near-duplicate of Poison Arrow** |
| `spell-rallying-cry` | Rallying Cry | self heal + CHC | 4 | 20 + +15% CHC / 2 | 0 | **Near-duplicate of Blood Mend** |
| `spell-drain-courage` | Drain Courage | drain + AP | 4 | 18 / heal 9 + AP−1 | 2 | Only AP debit |
| `spell-cursed-wound` | Cursed Wound | dmg + anti-heal | 3 | 22 + healRecv ×0.5 / 2 | 3 | |
| `spell-shadow-veil` | Shadow Veil | dmg + RES/SP | 3 | 18 + ×0.85 / 2 | 3 | **Near-duplicate of Expose** |
| `spell-inferno` | Inferno | DoT burn | 5 | 8×3, CD 3 | 3 | Only frontend cooldown |
| `spell-frost-nova` | Frost Nova | AoE + slow | 4 | 15 + MP−1 r=2 | 1 | |
| `summon-dire-wolf` | Dire Wolf | hunter summon | 3 | kit Strike + Venom | 2 | Lifespan 4 |
| `summon-sentinel` | Sentinel | guardian | 3 | Shield + Iron Skin | 2 | Player-only |
| `summon-archer` | Archer | kiter | 3 | Poison + Slow | 2 | |
| `summon-bomber` | Bomber | kamikaze | 2 | Inferno | 2 | Player-only |
| `summon-wisp` | Wisp | healer | 2 | Blood Mend + Rally | 2 | Player-only |

**None** of these frontend rows set `lineOfSight`, `linear`, `diagonal`, `modifiableRange`, `minRange`, or `maxRange`. Targeting therefore falls through to defaults in `targeting.ts` (Chebyshev for enemy/area, Manhattan for ground/barrier).

### 1.2 Backend admin seed — `src/backend/lib/admin.mo` `defaultSpells()`

Six ids, **not** in `SPELL_ID_CATALOG`. They *do* carry targeting flags.

| ID | Name | AP | CD | Flags | effectParams |
| :--- | :--- | ---: | ---: | :--- | :--- |
| `shadow_strike` | Shadow Strike | 3 | 2 | diagonal, no LoS, range 1–4 | none |
| `soul_rend` | Soul Rend | 3 | 4 | LoS, DoT 25 | none |
| `vampire_bite` | Vampire Bite | 3 | 2 | drain 20/20, adjacent | none |
| `reflect_barrier` | Reflect Barrier | 3 | 3 | self, defense | none — **Mirror clone** |
| `thunder_clap` | Thunder Clap | 4 | 3 | 8-dir AoE 25 | none |
| `void_collapse` | Void Collapse | 12 | 5 | attract-all + 80 AoE, `minLevel` 30 | `{"attractDistance":2,"attractAll":true}` |

`ownedSpells` can union backend rows that pass `OLD_SPELL_NAMES_SET` (`WorldExploration.tsx` ~2203–2236). These six are the only current “acquired” candidates — and they are not in boss kits or `ENEMY_KITS`.

### 1.3 Stale Motoko boss pools

`defaultBossConfigs()` still lists `fireball`, `cursed_gust`, `entangle`, `mist_form`, `blood_nova`, `obliterate`, `ice_shard`, `poison_dart`, `plague_wave`. Those ids are filtered by `OLD_SPELL_NAMES_SET`. Frontend `BOSS_KITS` is the kit that actually loads.

### 1.4 Engine support vs catalog use

| Mechanic | Engine | Catalog |
| :--- | :--- | :--- |
| `applyPushback` / `applyAttract` (`occupancy.ts`) | Implemented, collision-safe | **No caller.** Grep finds definitions only. |
| `effectCategory` `pushback` / `attract` / `teleport` | Typed on admin + targeting “offensive” list | Only Swap + backend Void Collapse |
| `isTrap` | `resolveSpellCast` calls `placeBarrier(..., 3)` | **No trap spell.** Trap is a fake wall. |
| `isMark` / `markedTilesRef` | Next hit ×2, then consume | Mark exists |
| `isBarrier` | 2-turn solid tile | Barrier exists |
| `isSwap` / `isMirror` / `isTimestep` / `isSacrifice` | Boolean flags in `spellEngine.ts` | One spell each |
| `modifiableRange` + `modifiableRangeBonusRef` | Range can be +delta, capped by `maxSpellRange` | **No frontend spell sets the flag; no spell writes the bonus** |
| `linear` / `diagonal` / `lineOfSight` | Enforced in `targeting.ts` | Frontend unused; backend Shadow Strike / Soul Rend only |
| DoT stacks (`dotStacks.ts`) | Additive stacks, independent duration | Poison / Venom / Inferno |
| Summon AI | hunter / guardian / archer / bomber / healer | Five summons; **no stationary** |
| Ally buffs | Shield path can buff player summons | Heals are **self-only** (`targetType === "self"`) |
| Delayed damage / execute / absorb / cleanse / root-to-0 / hazard-from-spell | Not first-class | Absent |

---

## 2. Gap map (mechanic families)

| Family | Present | Missing (tactical hole) |
| :--- | :--- | :--- |
| DAMAGE direct | Strike, Frost, Expose, Cursed Wound, Shadow Veil | Linear LoS poke with real geometry |
| DAMAGE delayed | — | Commit now, detonate later |
| DAMAGE DoT | Poison, Venom, Inferno | Tile/hazard DoT (unit DoTs only) |
| DAMAGE conditional | Mark ×2 (tile) | Unit-state gates (low HP, rooted, on hazard) |
| DAMAGE execute | — | Finish vs. overkill waste |
| DAMAGE chain | Chain Lightning | Bounce that *requires* a setup |
| POSITION push / knockback | Resolver only | Body-block, pit, collision |
| POSITION pull | Void Collapse (backend, 12 AP) | Cheap single-target hook |
| POSITION swap | Swap | — |
| POSITION teleport / dash | — | Self-move without swapping into a threat |
| CONTROL AP | Drain Courage (−1) | Tax a *zone*, not a target |
| CONTROL MP | Frost −1, Slow −2 | True root (MP = 0, cannot walk) |
| CONTROL range | Flag + ref exist | Player-facing range buff |
| CONTROL roots / slows | Slows only | Root |
| DEFENSE RES% | Shield, Iron Skin | Absorb buffer (can expire unused) |
| DEFENSE reactive | Mirror (full next-spell) | Redirect / partial return |
| DEFENSE redistribute | — | Force a targeting choice onto the attacker |
| SUPPORT heal | Self only | Cleanse (DoT/debuff answer) |
| SUPPORT range | — | Lens (see CONTROL range) |
| TERRAIN obstacle | Barrier | — |
| TERRAIN hazard / trap / zone | Map modifiers (lava, plague, thorns) | Player-placed hazard, real trap, AP-tax glyph |
| SUMMONS | 5 mobile archetypes | Stationary turret; sacrificial on-death (Bomber is AI kamikaze, not player-triggered) |

**Duplicates to stop cloning:** Shield ≈ Iron Skin; Blood Mend ≈ Rallying Cry; Poison Arrow ≈ Venom Strike; Expose ≈ Shadow Veil; Mirror ≈ Reflect Barrier.

---

## 3. Contract with Dynamic Spell Discovery

Coordinate with **Spell, Discovery & Achievement Admin Designer**. That system owns *how* a spell is granted. This pass only stamps each proposal with an acquisition model the admin/discovery layer can filter **by field**, not by name.

### 3.1 Why discovery is currently inert

1. All 32 frontend spells are `isBaseSpell` and pre-owned.
2. Recap (`rewardResolver.ts`) grants XP/Doka only — no spell pick.
3. Achievements (`defaultAchievements`) grant Doka only.
4. Challenges (`DEFAULT_CHALLENGES`) grant Doka/XP/badge only.
5. `upgradeSpell` levels a known id; it does not unlock ids.
6. Enemy kits (`ENEMY_KITS` in `enemyAI.ts`) reuse the same always-owned ids, so “I saw the bishop cast Frost” teaches nothing.

### 3.2 Rules for every proposed spell

- **Do not** append these ids to `starterSpells` as base. Discovery requires an empty slot in `ownedSpells`.
- Persist grants through the **same atomic recap/backend funnel** as rewards (new learned-id list on the character, not `localStorage` as authority). Discovery designer owns the persist field; this doc only requires it exist.
- `usableByPlayer` / `usableByEnemy` / `minLevel` / `acquisitionModel` / `discoveryEligible` / `discoverySources` are the filters.
- Enemy AI selects by **id in `assignedSpells` / `summonKit` / `aiHint`**, never `spell.name.includes(...)`.
- `NOT_PLAYER_LEARNABLE` spells may appear in boss kits so the player can *see* them. Discovery may record a witness without a grant.

### 3.3 Proposed metadata (not implemented here)

Add optional fields on `SpellConfig` (frontend + admin Motoko + Candid). Defaults keep old rows valid.

```text
acquisitionModel?:
  "ENEMY_DISCOVERY" | "ACHIEVEMENT" | "CHALLENGE" | "BOSS" | "ELITE"
  | "MULTI_SOURCE" | "NOT_PLAYER_LEARNABLE"
discoveryEligible?: boolean          // false if NOT_PLAYER_LEARNABLE
discoveryWeight?: number             // relative drop / offer weight
discoverySources?: {
  pieceTypes?: string[]              // pawn|knight|bishop|rook|queen|king
  levelZoneMin?: number              // ENEMY_KITS zone band
  eliteOnly?: boolean
  bossIds?: string[]
  challengeIds?: string[]            // easy_1 … legendary_3
  achievementIds?: string[]          // first_blood, survivor, …
}
aiHint?: string                      // explicit AI intent key, not a name
isBaseSpell: false                   // all proposals
```

`effectParams` remains a JSON object string. **Allowed keys for this pass** (parsers must whitelist; unknown keys ignored):

```text
pushDistance, attractDistance, attractAll,
teleportMode,          // "self_free_cell" | "swap" (swap already uses isSwap)
collisionBonusDamage,
delayedTurns, delayedDamage, executeHpPercent, executeDamage,
rootTurns,             // set currentMp = 0 for N turns; explicit, not "Slow-like"
rangeDelta, rangeBuffDuration,
absorbAmount, absorbDuration,
redirectMode,          // "nearest_hostile" | "linked_summon"
cleanseTypes,          // ["debuff","dot"]
hazardType, hazardDamage, hazardDuration,   // "burn" | "spike"
trapTrigger, trapDamage, trapRootTurns, trapHidden,
zoneApTax, zoneRadius, zoneDuration, zoneAppliesMark,
bounceOn,              // ["mark","hazard","root"]
onDeathHealOwner, onDeathMarkKillerTile
```

Do **not** add name tables. If a key is missing, the effect does not fire.

### 3.4 Acquisition model meanings (this pass)

| Model | Grant when | Typical `usableByEnemy` |
| :--- | :--- | :--- |
| `ENEMY_DISCOVERY` | Witness + survive/win vs a kit that includes the id (weight + zone) | true |
| `ELITE` | Same, but `eliteOnly` / `levelZoneMin >= 2` | true |
| `BOSS` | First victory vs listed `bossIds` (recap offer) | true on that boss |
| `ACHIEVEMENT` | Claim of listed achievement (in addition to Doka) | usually false |
| `CHALLENGE` | Complete listed challenge id | usually false |
| `MULTI_SOURCE` | Any listed source; first grant wins; no double copy | mixed |
| `NOT_PLAYER_LEARNABLE` | Never written to learned ids | true (boss/elite only) |

---

## 4. Power budget (relative, not a new math model)

Do not touch damage formulas. Numbers below are **base `SpellConfig.damage` / effect params**, then existing `spellDmgGrowthPercent` / `upgradeSpell` apply.

| Band | AP | Expected payload | Existing anchor |
| :--- | ---: | :--- | :--- |
| Cheap tool | 2 | 8–12 dmg **or** strong position/control, no both at full | Strike 10 / Slow −2 MP |
| Standard | 3 | ~18–22 dmg **or** 12 dmg + movement **or** clean utility | Frost 20, Swap, Barrier |
| Heavy | 4–5 | AoE / delayed / summon, CD 2–3 | Chain 20+2, Inferno 24 over 3, Nova 5 AP |
| Signature | 6 + CD 4+ | Multi-axis (pull+root). Boss-only unless said otherwise | Void Collapse is **overcosted** (12/80); do not copy that |

Collision / execute riders stay small so the **decision** (where they stand, when you wait) is the power, not the coefficient.

---

## 5. Proposed spells

All rows: `STATUS: PROPOSED`. `mpCost: 0` unless noted. `isBaseSpell: false`.

---

### SPELL_ID: `spell-shoulder-bash`

NAME: Shoulder Bash  
ROLE: DAMAGE direct + POSITION push (collision rider)  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 2  
RANGE: 1 (minRange 1, maxRange 1)  
TARGET_TYPE: enemy  
LOS: false  
COOLDOWN: 0  
EFFECT: Physical (`isPhysical: true`). Deal 8. Then `effectCategory: "pushback"` with `effectParams: {"pushDistance":2,"collisionBonusDamage":8}`. Push uses `applyPushback` from the caster. If a step is blocked by a unit, barrier, wall, or void, stop on the last free cell and deal the collision bonus (physical).  
DURATION: instant  
SCALING: `damage` and `collisionBonusDamage` follow spell-level dmg%; distance does not.  
SYNERGIES: Cinder Tile / Tripwire / Barrier (create the wall they slam into); Thorned Ground / lava map tiles; Mark on the landing tile; Frost Nova after clustering.  
COUNTERPLAY: Stand with your back to open floor; Swap after the shove; Barrier behind yourself as a player vs enemy bash.  
POWER_BUDGET: Cheap tool. 8+8 only if the attacker *pays* for setup. Without collision it is weaker than Strike.  
AI_USAGE: `aiHint: "push_toward_hazard_or_wall"`. Prefer when a 2-step ray from caster→target hits hazard/barrier/void. Else skip if Strike is available and no wall.  
DISCOVERY_ELIGIBILITY: `discoveryEligible: true`, `discoveryWeight: 12`, `discoverySources: { pieceTypes: ["pawn","knight"], levelZoneMin: 0 }`  
EDGE_CASES: Push of 0 when `dx===dy===0` (already in occupancy). Do not shove onto portals. Allied summons are blockers (collision), not victims, unless `hitsAllies`.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — resolvers exist, **cast path does not call them**. Wire `effectCategory === "pushback"` in `spellEngine` / player cast; do not match `"Bash"`.  
STATUS: PROPOSED

**SpellConfig sketch**

```text
id: spell-shoulder-bash
effectType: damage
effectCategory: pushback
spellType: damage
isPhysical: true
targetType: enemy
areaShape: single
usableByPlayer: true
usableByEnemy: true
minLevel: 1
```

---

### SPELL_ID: `spell-hook-line`

NAME: Hook Line  
ROLE: POSITION pull + light damage (linear LoS)  
ACQUISITION: MULTI_SOURCE  
AP_COST: 3  
RANGE: 4 (minRange 2, maxRange 4) — cannot hook adjacent  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 1  
EFFECT: `linear: true`. Deal 8 (spell). `effectCategory: "attract"`, `effectParams: {"attractDistance":2}`. `applyAttract` toward caster; stop one tile short (existing rule).  
DURATION: instant  
SCALING: damage only; pull distance fixed.  
SYNERGIES: Lifesteal Nova / Frost Nova / Inferno melee; Shoulder Bash after they land adjacent; Mark on the landing tile; Stone Turret covering the axis.  
COUNTERPLAY: Break LoS with Barrier; stand adjacent (minRange); diagonal-only positioning.  
POWER_BUDGET: Standard. Weaker than Frost Bolt on raw damage; the tile change is the payment.  
AI_USAGE: `aiHint: "pull_into_melee_or_aoe"`. Bishops/kings: cast when Chebyshev to player > 2 and a linear ray is clear.  
DISCOVERY_ELIGIBILITY: true. Sources: `pieceTypes: ["bishop"]` `levelZoneMin: 1` **or** `challengeIds: ["hard_3"]` (AP-discipline challenge). First grant wins.  
EDGE_CASES: Occupied tiles along the pull path stop early. Do not pull through void. If attract would stack on caster, stay adjacent (already specified).  
IMPLEMENTATION_COMPLEXITY: MEDIUM — same wire-up as push; targeting already supports `linear` + LoS.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-mist-step`

NAME: Mist Step  
ROLE: POSITION self-teleport (dash)  
ACQUISITION: CHALLENGE  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: ground  
LOS: false  
COOLDOWN: 2  
EFFECT: `freeCells: true`, `effectCategory: "teleport"`, `effectParams: {"teleportMode":"self_free_cell"}`. Move caster to the cell. No damage. Does not swap. Manhattan ground targeting (same as Barrier).  
DURATION: instant  
SCALING: range may use `modifiableRange: true` so Lens Shift and level-range growth apply.  
SYNERGIES: Untouchable / Blitz play; escape Gravity Well / Thorned paths; re-angle Hook Line; step off Cinder Tile.  
COUNTERPLAY: Zone the landing ring with Tripwire / Glyph Tax; Root Snare before they step; Fog of War does not block this (no LoS).  
POWER_BUDGET: Cheap reposition. CD 2 stops every-turn kiting vs 1-MP enemies.  
AI_USAGE: `aiHint: "self_reposition_escape"`. Enemies: only if `usableByEnemy` later; this grant is player-first (`usableByEnemy: false`).  
DISCOVERY_ELIGIBILITY: true. `challengeIds: ["legendary_1"]` (Untouchable). Optional second door: `hard_2` at lower weight.  
EDGE_CASES: Reject occupied, barrier, portal, void, hazard-optional (allow lava — player choice). Death-Realm portal lock unchanged.  
IMPLEMENTATION_COMPLEXITY: LOW–MEDIUM — Barrier already targets free ground; add a teleportMode branch, not a name check.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-grave-bell`

NAME: Grave Bell  
ROLE: DAMAGE delayed + execute  
ACQUISITION: ELITE  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: Apply a unique ActiveEffect `type: "debuff"` with `effectParams: {"delayedTurns":2,"delayedDamage":10,"executeHpPercent":30,"executeDamage":36}`. After 2 of the **target’s** turn starts, resolve: if `hp/maxHp <= 0.30` deal 36, else deal 10. Both go through existing `dealDamage` (RES+SR). Does not deal damage on cast.  
DURATION: 2 turns (then consume)  
SCALING: both damage keys follow spell-level dmg%. Threshold percent is fixed.  
SYNERGIES: Cursed Wound (anti-heal keeps them in the window); Weaken; DoT stacks to push them under 30%; Mark does **not** apply unless the detonation is implemented as a spell-hit on that tile (prefer: detonation is effect damage, no Mark — keep rules explicit).  
COUNTERPLAY: Heal above 30% before the bell; Cleanse Rite; kill the caster (bell still ticks — **documented**: effect is on the target, not channeled).  
POWER_BUDGET: Standard AP, payoff only if the table stays in execute range. Raw 10 after 2 turns is worse than Frost.  
AI_USAGE: `aiHint: "apply_execute_mark_on_wounded"`. Elites: cast when target HP% is already ≤ 50 so the 2-turn clock is realistic.  
DISCOVERY_ELIGIBILITY: true. `eliteOnly: true`, `levelZoneMin: 2`, `pieceTypes: ["queen","king"]`.  
EDGE_CASES: Target dies before tick → no extra recap. Multiple bells: stack by `stackId` like DoTs, each ticks independently (can be oppressive — **cap 1** per caster–target pair via effect id `grave-bell-${casterId}`).  
IMPLEMENTATION_COMPLEXITY: MEDIUM — needs a delayed-resolution hook at turn start (map modifiers already have `onTurnStart`).  
STATUS: PROPOSED

---

### SPELL_ID: `spell-root-snare`

NAME: Root Snare  
ROLE: CONTROL root (MP lock)  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: No damage. `effectCategory: "cc"`, `debuffStat: "mp"`, `effectParams: {"rootTurns":1}`. For 1 full turn the target’s **current MP is treated as 0** and they cannot spend MP to move. Distinct from Slow’s −2. Cleanse removes it.  
DURATION: 1 turn  
SCALING: none (duration +1 at spell level 5 only — if upgrade system gains a duration table later; until then fixed).  
SYNERGIES: Cinder Tile / Tripwire under their feet; Stone Turret free hits; Grave Bell clock; Shoulder Bash they cannot walk back from.  
COUNTERPLAY: Timestep does **not** clear root unless we add it to cleanseTypes (do not). Haste after root expires. Mist Step is a spell, not a walk — **root does not block spells** (AP still works). That is the decision: they can still nuke you, they just cannot reposition.  
POWER_BUDGET: Standard control, 0 damage, CD 2.  
AI_USAGE: `aiHint: "root_if_player_can_walk_to_safety_or_melee"`. Bishops: when player is in melee of a knight/rook ally.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["bishop"]`, `levelZoneMin: 1`.  
EDGE_CASES: Summons with 0 MP already: still apply (blocks Haste-on-summon). Do not set `maxMp`. Initiative unchanged.  
IMPLEMENTATION_COMPLEXITY: LOW — `debuffStat: "mp"` exists; need an explicit `rootTurns` so AI/movement reads `getEffectiveStat(..., "mp") === 0` **or** a `rooted` flag. Prefer a flag in the effect (`stat: "mp"`, `modifier: 0` meaning **absolute lock**, documented in engine — not “name is Snare”).  
STATUS: PROPOSED

---

### SPELL_ID: `spell-lens-shift`

NAME: Lens Shift  
ROLE: SUPPORT / CONTROL range buff  
ACQUISITION: ACHIEVEMENT  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: `effectCategory: "buff"`, `effectParams: {"rangeDelta":2,"rangeBuffDuration":2}`. For 2 turns, any cast whose config has `modifiableRange: true` gains +2 range via the existing `modifiableRangeBonusRef` path, still capped by `levelUpConfig.maxSpellRange`.  
DURATION: 2 turns  
SCALING: delta fixed; duration +1 at high spell level later.  
SYNERGIES: Hook Line, Shadow Strike (backend), Mist Step, Cinder Tile, Grave Bell — **only if those rows set `modifiableRange: true`**. Strike (range 1) should stay `modifiableRange: false` so Lens cannot become a sniper basic.  
COUNTERPLAY: Walk into minRange holes; Fog / LoS still applies to spells that require it.  
POWER_BUDGET: Cheap, long CD. Power is enabling other cards, not a stat stick.  
AI_USAGE: Player-only (`usableByEnemy: false`). If later given to queens: `aiHint: "prebuff_before_linear_poke"`.  
DISCOVERY_ELIGIBILITY: true. `achievementIds: ["spell_scholar"]` (upgrade any spell to 5).  
EDGE_CASES: Do not write bonuses for spells with `modifiableRange !== true`. Expiry must clear the ref (already decremented in WX ~1542).  
IMPLEMENTATION_COMPLEXITY: LOW — the ref already exists; no spell writes it.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-ward-plate`

NAME: Ward Plate  
ROLE: DEFENSE absorb shield  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 2  
EFFECT: `effectCategory: "defense"`, `effectParams: {"absorbAmount":18,"absorbDuration":2}`. Incoming damage subtracts from absorb first, then HP. Unused absorb expires. Not a RES% multiplier (that is Shield / Iron Skin).  
DURATION: 2 turns or until absorb 0  
SCALING: absorbAmount follows heal-style growth (`healAmount` field can mirror 18 for upgrade scale).  
SYNERGIES: Sentinel already applies RES — this stacks as a buffer; Glass Realm / Titan’s Vigor maps; no-heal challenges (absorb is not `spellType: "heal"` — challenge `no_healing` must key off `spellType === "heal"` / `effectType === "heal"`, which this is not).  
COUNTERPLAY: DoT ticks still chew absorb; Cursed Wound does not reduce absorb (only `healRecv`). Wait out 2 turns.  
POWER_BUDGET: ~Blood Mend 12 but can waste. 18 / 2 turns is a hold, not a full heal.  
AI_USAGE: `aiHint: "absorb_on_lowest_hp_ally"`. Rooks zone ≥1: self or leader.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["rook"]`, `levelZoneMin: 1`.  
EDGE_CASES: Two Ward Plates: **replace** same `stat: "absorb"` (not additive) to avoid 36-point turtles. Mirror / Pain Link resolve **after** absorb.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — new ActiveEffect stat `absorb`; damage pipeline must read it (do not invent from name “Ward”).  
STATUS: PROPOSED

---

### SPELL_ID: `spell-pain-link`

NAME: Pain Link  
ROLE: DEFENSE reactive redistribution  
ACQUISITION: BOSS  
AP_COST: 4  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: `effectCategory: "defense"`, `effectParams: {"redirectMode":"nearest_hostile"}`. Until end of next enemy action that deals HP damage to the caster (after absorb), that hit is applied to the nearest hostile instead (same `dealDamage` flags as the original). Then consume. Does **not** reflect spells like Mirror (Mirror is “next spell redirects to attacker”). Pain Link is **HP damage only** (melee, spell damage, DoT tick).  
DURATION: 1 incoming hit or 2 turns, whichever first  
SCALING: none  
SYNERGIES: Ward Plate first (smaller leftover redirect); stand next to a summon you are willing to… no — nearest **hostile**, so you want an enemy close. Glyph Tax + stand in their face.  
COUNTERPLAY: Don’t hit the linked target; attack their summon; wait 2 turns; use Weaken / anti-heal instead of a swing.  
POWER_BUDGET: Heavy utility, 0 damage, CD 3. Mirror stays the “spell” answer; this is the “autoattack / DoT” answer.  
AI_USAGE: Boss `alabaster_fortress` phase 2. `aiHint: "redirect_when_melee_threat_adjacent"`.  
DISCOVERY_ELIGIBILITY: true. `bossIds: ["alabaster_fortress"]`.  
EDGE_CASES: If no hostile exists, effect fizzles on trigger and the caster still takes the hit. Do not redirect to allies. Challenge `recordChallengeDamageTaken` must count **damage the player still receives**, not the redirected amount.  
IMPLEMENTATION_COMPLEXITY: HIGH — new reactive hook beside Mirror.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-cleanse-rite`

NAME: Cleanse Rite  
ROLE: SUPPORT cleanse  
ACQUISITION: MULTI_SOURCE  
AP_COST: 3  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 2  
EFFECT: `effectCategory: "buff"`, `effectParams: {"cleanseTypes":["debuff","dot"]}`. Remove matching `ActiveEffect`s from the caster. No heal.  
DURATION: instant  
SCALING: none  
SYNERGIES: Answers Inferno / Venom / Slow / Grave Bell / Root / Cursed Wound. Makes “stack three DoTs” a real line that can be spent against. Pacifist / no-heal challenges still valid (not a heal).  
COUNTERPLAY: Re-apply after; Burst during the CD.  
POWER_BUDGET: Standard, 0 throughput.  
AI_USAGE: Player-first. If enemies get it: `aiHint: "cleanse_if_dot_stacks_ge_2_or_rooted"`.  
DISCOVERY_ELIGIBILITY: true. `achievementIds: ["survivor"]` **or** `challengeIds: ["easy_1"]` (no healing).  
EDGE_CASES: Do not strip buffs. Do not strip Mark tiles (tile set, not ActiveEffect). Absorb/Ward is a buff — keep it.  
IMPLEMENTATION_COMPLEXITY: LOW  
STATUS: PROPOSED

---

### SPELL_ID: `spell-cinder-tile`

NAME: Cinder Tile  
ROLE: TERRAIN hazard (burn)  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ground  
LOS: true  
COOLDOWN: 1  
EFFECT: `freeCells: true`, `effectParams: {"hazardType":"burn","hazardDamage":6,"hazardDuration":3}`. Paint one floor tile. Any combatant **starting a turn** on it or **entering** it takes 6 (RES applies, SR does not — treat as environmental like lava; use `recordInBattleChallengeDamage` only if already in battle and the existing lava path says so). Not an Inferno unit DoT.  
DURATION: 3 turns  
SCALING: hazardDamage follows dmg%.  
SYNERGIES: Shoulder Bash / Hook Line / Swap onto the tile; Root Snare; Thorned Ground (they don’t want to leave either).  
COUNTERPLAY: Walk around; Barrier on the tile (**Barrier replaces hazard** — explicit: placing a barrier clears the hazard key). Mist Step off.  
POWER_BUDGET: 6×3 = 18 if they stay; often 6. Below Inferno’s 24 and cheaper.  
AI_USAGE: `aiHint: "paint_tile_on_player_or_escape_path"`. Queens zone ≥2.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["queen"]`, `levelZoneMin: 2`.  
EDGE_CASES: One hazard per cell; last writer wins. Do not stack with map lava as two ticks the same trigger — if the cell is already lava, add 6 to the existing tick table via a `spellHazards` map keyed by `"x,y"`, separate from map gen. Portals/void rejected.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — `hazardTiles` already exists for lava/ice/spikes.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-tripwire`

NAME: Tripwire  
ROLE: TERRAIN trap (real, not a wall)  
ACQUISITION: ELITE  
AP_COST: 2  
RANGE: 2  
TARGET_TYPE: ground  
LOS: false  
COOLDOWN: 2  
EFFECT: `isTrap: true` **redefined**: do **not** call `placeBarrier`. `effectParams: {"trapTrigger":"enter","trapDamage":15,"trapRootTurns":1,"trapHidden":true}`. Hidden to the opposing side until triggered or a unit spends 1 MP to “search” adjacent (optional later; v1: hidden in fog, visible to owner). On enter: 15 damage + Root Snare 1. Then consume.  
DURATION: 4 turns or until triggered  
SCALING: trapDamage only.  
SYNERGIES: Hook / Bash onto the cell; Glyph Tax funnels; Mist Step over it (teleport **does not** “enter” walk — **explicit: teleport does not trip**. Walking and push/pull **do**.  
COUNTERPLAY: Probe with a summon; Barrier the cell (clears trap); Swap the enemy onto their own wire if they can see it (hidden: they cannot).  
POWER_BUDGET: Cheap, information game. 15+root is Frost-adjacent but requires they step.  
AI_USAGE: `aiHint: "trap_chokepoint_or_melee_ring"`. Elite rooks/archers.  
DISCOVERY_ELIGIBILITY: true. `eliteOnly: true`, `pieceTypes: ["rook","bishop"]`, `levelZoneMin: 2`.  
EDGE_CASES: Current `isTrap → placeBarrier` **must be changed by metadata**, not by renaming. Owner walking on own trap: no trigger. Flying/dash: only walk/push/pull.  
IMPLEMENTATION_COMPLEXITY: HIGH — today’s trap is a stub wall.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-glyph-tax`

NAME: Glyph Tax  
ROLE: TERRAIN zone + CONTROL AP  
ACQUISITION: BOSS  
AP_COST: 4  
RANGE: 3  
TARGET_TYPE: ground  
LOS: true  
COOLDOWN: 3  
EFFECT: `aoe: true`, `areaShape: "circle"`, `areaRadius: 1` (center + adjacent = 3×3 Chebyshev 1). `effectParams: {"zoneRadius":1,"zoneDuration":3,"zoneApTax":1,"zoneAppliesMark":true}`. Combatants **casting** while standing in the zone pay +1 AP (min 1, stacks with Arcane Surge’s −1 as: compute base → surge → tax). Tiles in the zone are Marked for the duration (same `markedTilesRef`; consume-on-hit still applies — first spell on a glyph tile spends the mark).  
DURATION: 3 turns  
SCALING: tax fixed; radius fixed.  
SYNERGIES: Archivist fantasy; Stone Turret outside the zone; Hook into the glyph; `hard_3` (≤8 AP/turn) becomes a real puzzle.  
COUNTERPLAY: Leave the zone; Mist Step; Null Field map (if it already nulls marks — if not, do not invent a name check; only if that modifier’s hooks say so).  
POWER_BUDGET: Heavy control, 0 damage, CD 3.  
AI_USAGE: `pale_archivist` phase 2. `aiHint: "zone_on_player_cluster"`.  
DISCOVERY_ELIGIBILITY: true. `bossIds: ["pale_archivist"]`.  
EDGE_CASES: Overlapping glyphs: tax does not stack (max +1). Barrier in zone: still a glyph cell. Summon casts taxed too.  
IMPLEMENTATION_COMPLEXITY: HIGH — zone registry + AP hook (map modifiers already have `onApCost`).  
STATUS: PROPOSED

---

### SPELL_ID: `spell-stone-turret`

NAME: Stone Turret  
ROLE: SUMMON stationary offensive  
ACQUISITION: MULTI_SOURCE  
AP_COST: 4  
RANGE: 2  
TARGET_TYPE: ground  
LOS: false  
COOLDOWN: 3  
EFFECT: `isSummon: true`, `summonAI: "turret"`, `summonLifespan: 4`, `freeCells: true`. `summonUnitDef`: pieceType `turret`, hpScale 0.8, damageScale 1.0, `ap: 2`, `mp: 0`, `summonKit: ["spell-hook-line"]` is **wrong** (Hook is pull). Kit: a tiny innate bolt id `turret-bolt` (below) **or** reuse `physical_attack` at range 3 with `linear`+LoS if we attach those flags on a **clone config** `turret-shard` — **do not** change global Strike. Prefer nested kit id `spell-turret-shard` (NOT_PLAYER_LEARNABLE, usableByEnemy true for the summon only).  
DURATION: 4 summon turns  
SCALING: hp/damage scales with caster level via existing summon formulas.  
SYNERGIES: Root / Glyph / Cinder in the lane; Lens does not apply to the turret unless its shard has `modifiableRange`.  
COUNTERPLAY: Kill the turret (low HP); Barrier the lane; walk off-axis.  
POWER_BUDGET: Heavy, CD 3, no mobility. Weaker than Dire Wolf in open maps, stronger in corridors.  
AI_USAGE: Player and elite rooks. `aiHint: "summon_on_chokepoint"`. New `SUMMON_KIT.turret`.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["rook"]` `levelZoneMin: 2` **or** `achievementIds: ["spell_master"]` (8 spells equipped — ironic: you need a slot).  
EDGE_CASES: `mp: 0` + turret AI **must not path**. Occupies a cell (body-block). Death Realm / cleanupMap despawn with other summons.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — new archetype; do not reuse bomber.  
STATUS: PROPOSED

`spell-turret-shard` (kit-only): AP 2, damage 10, range 3, linear, LoS, `acquisitionModel: NOT_PLAYER_LEARNABLE`, `usableByPlayer: false`, `usableByEnemy: true`.

---

### SPELL_ID: `spell-blood-familiar`

NAME: Blood Familiar  
ROLE: SUMMON sacrificial support  
ACQUISITION: BOSS  
AP_COST: 2  
RANGE: 2  
TARGET_TYPE: ground  
LOS: false  
COOLDOWN: 2  
EFFECT: `summonAI: "sacrificial"`, lifespan 3, hpScale 0.25 (about 1–2 hits), `summonKit: []` (no casts). `effectParams: {"onDeathHealOwner":15,"onDeathMarkKillerTile":true}`. When the familiar’s HP hits 0 **from any source**, owner heals 15 (`healAmount` path, **does** trip `no_healing` if we count owner heal — **explicit: this heal sets the challenge heal flag**). Killer’s current cell is Marked.  
DURATION: 3 or until slain  
SCALING: heal 15 with heal growth.  
SYNERGIES: Pain Link / tank the familiar in melee; Cursed Wound on the killer is separate; you can Sacrifice-style **player-cast damage** onto your own familiar only if `hitsAllies` — **default false**. Player spends a Strike on it? Only if we allow targeting ally summons with Strike — today Strike is `targetType: enemy`. So the familiar dies to **enemies**, not a self-proc, unless they walk on Cinder. That’s the decision: park it on a hazard you own.  
COUNTERPLAY: Don’t kill it (kite); Cleanse won’t stop the death trigger; kill the owner first.  
POWER_BUDGET: Cheap body + delayed heal. Weaker than Wisp if ignored.  
AI_USAGE: `starved_vampire_pawn` phase 2. `aiHint: "summon_familiar_as_chump_block"`.  
DISCOVERY_ELIGIBILITY: true. `bossIds: ["starved_vampire_pawn"]`.  
EDGE_CASES: Lifespan expiry **does** fire on-death (documented: fade = death for this flag). Owner dead: no heal.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — lifespan hook already logs fade; add metadata-gated heal/mark.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-ricochet-mark`

NAME: Ricochet Shard  
ROLE: DAMAGE chain **conditional**  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 4  
RANGE: 4  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 1  
EFFECT: Deal 14. `bounces: 1`, `hitsMultiple: true`, `effectParams: {"bounceOn":["mark","hazard","root"]}`. The bounce to the nearest other hostile happens **only if** the primary tile is Marked, **or** the primary unit stands on a spell/map hazard, **or** the primary unit has `rootTurns` active. Otherwise single-target. Bounce damage 14, no second bounce.  
DURATION: instant  
SCALING: damage only.  
SYNERGIES: Mark, Cinder, Tripwire, Root Snare — this is the “combo finisher” that Chain Lightning is not (Chain always bounces).  
COUNTERPLAY: Don’t stand on the marked/hazard/root square; spread so bounce has no second target.  
POWER_BUDGET: Heavy. 14 = below Frost; 28 if they failed positioning.  
AI_USAGE: `aiHint: "conditional_bounce_if_setup_present"`. Kings/queens zone ≥1. If no setup, prefer Frost Bolt if in kit.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["queen","king"]`, `levelZoneMin: 1`.  
EDGE_CASES: Bounce must use **state flags**, not `spell.name === "Mark"`. No bounce to allies.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — Chain Lightning bounce exists; add a pre-bounce predicate.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-void-anchor`

NAME: Void Anchor  
ROLE: COMBINATION pull + root (signature)  
ACQUISITION: NOT_PLAYER_LEARNABLE  
AP_COST: 6  
RANGE: 2  
TARGET_TYPE: area  
LOS: false  
COOLDOWN: 4  
EFFECT: `aoe: true`, `areaShape: "circle"`, `areaRadius: 2`, `hitsAllies: false`. `effectCategory: "attract"`, `effectParams: {"attractDistance":1,"attractAll":true,"rootTurns":1}`. Pull each hostile 1 toward caster, then apply Root Snare 1. **No** 80-damage nuke (that is Void Collapse; do not merge). Damage 12 to each pulled unit.  
DURATION: pull instant; root 1  
SCALING: 12 follows dmg%.  
SYNERGIES: Boss identity for `void_grandmaster`; Cinder ring; Frost Nova after. Player **cannot** learn this — they learn Hook + Root separately and combo manually.  
COUNTERPLAY: Barrier body-block the pull; stay at radius 3; Cleanse the root; Mirror does not stop movement.  
POWER_BUDGET: Signature control, modest damage, long CD.  
AI_USAGE: `void_grandmaster` phase 2. `aiHint: "group_pull_then_root"`.  
DISCOVERY_ELIGIBILITY: **false**. Witness-only. `bossIds: ["void_grandmaster"]`.  
EDGE_CASES: Do not also grant Void Collapse. AttractAll must skip allies/summons of the caster.  
IMPLEMENTATION_COMPLEXITY: MEDIUM–HIGH — attract-all + root; Void Collapse params already sketch attractAll.  
STATUS: PROPOSED

---

## 6. Combination matrix (intended, not name-wired)

Resolve only via flags / tile maps / effect keys.

| Setup (metadata) | Payoff (metadata) | Decision |
| :--- | :--- | :--- |
| `isMark` tile | `bounceOn:["mark"]` | Spend Mark on a 14 or save for a 40 hit |
| `hazardType` cell | `pushDistance` / `attractDistance` | Who stands on the fire |
| `rootTurns` | Turret shard / Inferno / Grave Bell | They can still cast; they cannot leave |
| `zoneApTax` | `under_8_ap_per_turn` challenge | Cast inside and fail, or leave and waste MP |
| `teleportMode:self_free_cell` | Tripwire `trapTrigger:enter` | Blink does not trip; walk/push does |
| `absorbAmount` | `redirectMode` | Chip the plate then dump onto their friend |
| `cleanseTypes` | stacked `isDotSpell` | Hold Cleanse vs triple venom |
| `rangeDelta` | `modifiableRange: true` + `linear` | One turn of long Hook |
| Familiar `onDeathMarkKillerTile` | Ricochet / Sacrifice | Bait the melee kill |
| Barrier | Shoulder Bash collision | You built the wall |

Map modifiers (no spell-name checks): Thorned Ground punishes the walk *after* a bad pull; Slime/Frozen doubles the cost of leaving a glyph; Arcane Surge vs Glyph Tax is `max(1, ap-1)+1`; Plague Zone + Cinder is two environmental ticks (acceptable if both hooks fire — document in recap later).

---

## 7. Recommended unlock order (pacing)

Discovery designer should treat these as **bands**, not a shop list.

| Band | Spells | Why |
| :--- | :--- | :--- |
| Early (zone 0–1, easy challenge / first achievements) | Shoulder Bash, Root Snare, Cleanse Rite, Hook Line | Movement + answer to existing DoTs |
| Mid (zone 2, elites, spell_scholar) | Cinder Tile, Lens Shift, Ward Plate, Ricochet Shard | Terrain and combo payoff |
| Late (elites / 8-spell / turret) | Tripwire, Grave Bell, Stone Turret | Hidden info + delayed + board control |
| Boss recap | Glyph Tax, Pain Link, Blood Familiar | Identity pieces |
| Witness only | Void Anchor, Turret Shard | Teach the combo; do not dump the package |

**Prerequisite for any of this to matter:** split the current 32-spell “everything is base” blob. Discovery designer should keep as innate: `physical_attack` plus at most one heal, one DoT, one buff. Move Swap / Mark / Barrier / Mirror / summons / Inferno / etc. to learned. That split is **their** persist/admin work; this pass does not edit `spellData.ts`.

---

## 8. Implementation notes (for a later, explicit implementation PR)

1. Wire `effectCategory` `pushback` / `attract` / `teleport` in `resolvePlayerCast` and `resolveSpellCast` to `applyPushback` / `applyAttract` / cell move.  
2. Replace `isTrap → placeBarrier` with a trap table. Keep Barrier on `isBarrier` only.  
3. Add optional `SpellConfig` discovery fields; admin CRUD already stores `effectParams` / `usableBy*` / `minLevel`.  
4. `ENEMY_KITS` / `BOSS_KITS` / `SPELL_ID_CATALOG` gain ids **only when implemented**, together.  
5. Recap grant must use the reward funnel, not `updateCharacter` partial writes.  
6. Do not implement these rows as `if (spell.name === "Shoulder Bash")`.  
7. Do not touch RAF, map generation, turn order, or damage math.  
8. Dual catalog: prefer one write path (`spellData.ts` + admin seed sync), or backend-only for discoverables.

---

## 9. Explicit non-goals this pass

- No production TypeScript / Motoko / Candid edits.  
- No new damage formula, crit, or RES/SR identity.  
- No shop-bought spells (Doka shop is currency).  
- No fourth RES% buff.  
- No second Chain Lightning.  
- No 12-AP Void Collapse clone for players.

---

## 10. Proposal index

| ID | Acquisition | Complexity | Primary hole filled |
| :--- | :--- | :--- | :--- |
| `spell-shoulder-bash` | ENEMY_DISCOVERY | MEDIUM | Push + collision |
| `spell-hook-line` | MULTI_SOURCE | MEDIUM | Linear pull |
| `spell-mist-step` | CHALLENGE | LOW–MEDIUM | Self-teleport |
| `spell-grave-bell` | ELITE | MEDIUM | Delayed execute |
| `spell-root-snare` | ENEMY_DISCOVERY | LOW | True root |
| `spell-lens-shift` | ACHIEVEMENT | LOW | Range modification |
| `spell-ward-plate` | ENEMY_DISCOVERY | MEDIUM | Absorb |
| `spell-pain-link` | BOSS | HIGH | Redistribute |
| `spell-cleanse-rite` | MULTI_SOURCE | LOW | Cleanse |
| `spell-cinder-tile` | ENEMY_DISCOVERY | MEDIUM | Hazard |
| `spell-tripwire` | ELITE | HIGH | Real trap |
| `spell-glyph-tax` | BOSS | HIGH | Zone AP tax |
| `spell-stone-turret` | MULTI_SOURCE | MEDIUM | Stationary summon |
| `spell-blood-familiar` | BOSS | MEDIUM | Sacrificial summon |
| `spell-ricochet-mark` | ENEMY_DISCOVERY | MEDIUM | Conditional chain |
| `spell-void-anchor` | NOT_PLAYER_LEARNABLE | MEDIUM–HIGH | Boss combo |

All STATUS: **PROPOSED**.
