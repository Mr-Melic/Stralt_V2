# Spell and Tactical Mechanics — Design Pass 2026-09-01

**Role:** Spell and Tactical Mechanics Designer  
**Status:** PROPOSED — no production code in this pass  
**HEAD audited:** `dd275aa` (`Merge pull request #182` — caffeine automation gates)  
**Sibling systems:**
- Dynamic Spell Discovery — [`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md) (`c26e5a83-a492-11f1-a7d1-d6b4613131ce`)
- Spell, Discovery & Achievement Admin — [`SPELL_ADMIN_DESIGN_2026-08-31.md`](./SPELL_ADMIN_DESIGN_2026-08-31.md) (`4efa22ec-a498-11f1-a7d1-d6b4613131ce`)
- Prior tactical pass — [`SPELL_PROPOSALS_2026-08-31.md`](./SPELL_PROPOSALS_2026-08-31.md)
- Boss adaptations — [`../design/BOSS_AND_SPELL_DISCOVERY.md`](../design/BOSS_AND_SPELL_DISCOVERY.md)

This is **Wave 2**. Wave 1 (#120, 2026-08-31) filled push, pull, self-teleport, delayed execute, root, range buff, absorb, redirect, self-cleanse, burn tile, real trap, AP-tax zone, turret, sacrificial familiar, conditional bounce, and a boss pull+root. Discovery Wave 1 formalized 18 more ids (Quiet Hex through Hex of Silence). Boss design reserved 10 adaptations (Ember Step through Echo Cast).

**This pass does not reuse any of those ids.** Every card below fills a hole that is still empty after that reserved set. Every proposed spell is **data-only**: it must resolve from explicit `SpellConfig` / `effectParams` fields. `spell.name` is UI and battle-log copy. Targeting and effects must never branch on name.

---

## 1. Re-audit of the catalog that actually exists

Verified against `origin/main` @ `dd275aa`. Counts are unchanged from 2026-08-31.

### 1.1 Frontend runtime catalog — `src/frontend/src/data/spellData.ts`

`SPELL_ID_CATALOG` (`src/frontend/src/data/bossKits.ts` 29–62) still lists **32** ids. `WorldExploration.tsx` 2393–2406 still maps **every** `starterSpells` row to `isBaseSpell: true` (“always shown, never removable”).

Delta since 2026-08-31: `ownedSpells` (2408–2438) now filters backend rows through `shouldIncludeBackendSpellInLibrary` (`adminSafety.ts` 311–318). That helper only drops `usableByPlayer === false` unless the id is already owned. It does **not** create a discovery path. The 32 frontend ids remain pre-owned. Discovery is still inert on the player path.

| ID | Name | Family (actual) | AP | Payload | Range | Notes |
| :--- | :--- | :--- | ---: | :--- | ---: | :--- |
| `physical_attack` | Strike | direct physical | 2 | 10 | 1 | Only true melee baseline; only `isBaseSpell` in data |
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
| `spell-lifesteal-nova` | Lifesteal Nova | AoE drain | 5 | 20 + heal 10/hit r=2 | 1 | Circle only |
| `spell-enrage` | Enrage | DMG buff | 3 | +40% / 2 | 3 | |
| `spell-iron-skin` | Iron Skin | RES% buff | 3 | +30% RES / 3 | 3 | Duplicate of Shield |
| `spell-haste` | Haste | MP buff | 2 | +2 MP / 1 | 3 | Only MP grant |
| `spell-weaken` | Weaken | DMG debuff | 3 | ×0.7 / 2 | 3 | |
| `spell-slow` | Slow | MP debuff | 2 | −2 MP / 2 | 3 | Not a root |
| `spell-expose` | Expose | dmg + RES/SP | 3 | 15 + ×0.8 / 2 | 3 | |
| `spell-venom-strike` | Venom Strike | DoT venom | 3 | 4×3 | 2 | Near-duplicate of Poison |
| `spell-rallying-cry` | Rallying Cry | self heal + CHC | 4 | 20 + +15% CHC / 2 | 0 | Near-duplicate of Mend |
| `spell-drain-courage` | Drain Courage | drain + AP | 4 | 18 / heal 9 + AP−1 | 2 | Only AP debit |
| `spell-cursed-wound` | Cursed Wound | dmg + anti-heal | 3 | 22 + healRecv ×0.5 / 2 | 3 | |
| `spell-shadow-veil` | Shadow Veil | dmg + RES/SP | 3 | 18 + ×0.85 / 2 | 3 | Near-duplicate of Expose |
| `spell-inferno` | Inferno | DoT burn | 5 | 8×3, CD 3 | 3 | Only frontend cooldown |
| `spell-frost-nova` | Frost Nova | AoE + slow | 4 | 15 + MP−1 r=2 | 1 | Circle only |
| `summon-dire-wolf` | Dire Wolf | hunter | 3 | Strike + Venom | 2 | Lifespan 4 |
| `summon-sentinel` | Sentinel | guardian | 3 | Shield + Iron Skin | 2 | Player-only |
| `summon-archer` | Archer | kiter | 3 | Poison + Slow | 2 | |
| `summon-bomber` | Bomber | kamikaze | 2 | Inferno | 2 | Player-only |
| `summon-wisp` | Wisp | healer | 2 | Mend + Rally | 2 | Player-only |

**None** of these rows set `lineOfSight`, `linear`, `diagonal`, `modifiableRange`, `minRange`, or `maxRange`. No row sets `mpCost` ≠ 0. No row uses `targetType: "line"` even though `targeting.ts` 352–385 implements that branch. `areaShape` is typed as `circle | cone | line | cross | single` (`gameTypes.ts` 224) but **targeting never reads `areaShape`** — area expansion is Chebyshev around `areaRadius` (`targeting.ts` 445–452). Cross / cone / line *shapes* therefore need `hitTiles` (already consumed in `castHelpers.ts` 105–117) or a later `areaShape` wire. This pass uses `hitTiles` / `targetType: "line"`, not a name table.

### 1.2 Backend admin seed — `src/backend/lib/admin.mo` `defaultSpells()`

Six ids, still **not** in `SPELL_ID_CATALOG`. They carry targeting flags.

| ID | Name | AP | CD | Flags | Notes |
| :--- | :--- | ---: | ---: | :--- | :--- |
| `shadow_strike` | Shadow Strike | 3 | 2 | diagonal, no LoS, range 1–4 | Only diagonal poke |
| `soul_rend` | Soul Rend | 3 | 4 | LoS, DoT 25 | |
| `vampire_bite` | Vampire Bite | 3 | 2 | drain 20/20, adjacent | |
| `reflect_barrier` | Reflect Barrier | 3 | 3 | self, defense | Mirror clone |
| `thunder_clap` | Thunder Clap | 4 | 3 | 8-dir AoE 25 via `hitTiles` | Closest thing to a cross |
| `void_collapse` | Void Collapse | 12 | 5 | attract-all + 80 AoE, `minLevel` 30 | Do not copy |

`OLD_SPELL_NAMES_SET` (`WorldExploration.tsx` 2360–2387) still filters by **name and id**. That heuristic is forbidden going forward (Admin design §1.6). These six remain the only current “acquired” candidates if they pass the name tombstone — and they are still absent from `ENEMY_KITS` / `BOSS_KITS`.

### 1.3 Engine support vs catalog use (still true)

| Mechanic | Engine | Live catalog | Already proposed (reserved) |
| :--- | :--- | :--- | :--- |
| `applyPushback` / `applyAttract` | Implemented, no cast callers | Unused | Shoulder Bash, Hook Line, Crosswind, Void Anchor |
| `targetType: "line"` | Implemented (8-dir ray) | **No spell** | Glass Shot is `enemy` + `linear`, not `line` |
| `areaShape` cone / cross / line | Typed, **unread** | Unused | — |
| `hitTiles` | `castHelpers` when `aoe: true` | Frontend unused; Thunder Clap only | — |
| `mpCost` | On `SpellConfig` | Always 0 | — |
| `modifiableRange` | Ref exists | No frontend writer | Lens Shift, Overcast |
| `isTrap` | Still `placeBarrier(..., 3)` | No trap row | Tripwire redefines it |
| Delayed unit damage | No first-class hook | Absent | Grave Bell |
| Delayed **tile** fuse | Absent | Absent | — |
| Instant execute | Absent | Absent | Grave Bell is delayed |
| DoT detonate | Stacks exist (`dotStacks.ts`) | No consume-to-burst | — |
| Range **debuff** | Flag is caster-side | Absent | Lens / Overcast are buffs |
| AP **grant** | Drain Courage is debit | Haste is MP only | Second Wind is conditional MP |
| Ally cleanse | Absent | Cleanse Rite is self | — |
| Ice / slip tile | `hazardTiles` ice exists on maps | No player paint | Cinder is burn |
| Walkable LoS block | Barriers block walk + LoS | Barrier is solid | Smoke is missing |
| Pull toward a **tile** | Attract is toward caster | Void Collapse / Hook | — |
| Pull **ally** | Swap is enemy-only | Ward Interpose is ally *swap* | — |
| Stationary **defense** summon | Five mobile AIs | Stone Turret is offense | — |
| Player-triggered pet sacrifice | Bomber is AI kamikaze | Familiar dies to *enemies* | — |
| Forced targeting (taunt) | Absent | Absent | — |
| Shared incoming HP | Pain Link *redirects* | Absent | — |

### 1.4 Reserved id tombstone (do not collide)

**Wave 1 tactical (`SPELL_PROPOSALS_2026-08-31.md`):**  
`spell-shoulder-bash`, `spell-hook-line`, `spell-mist-step`, `spell-grave-bell`, `spell-root-snare`, `spell-lens-shift`, `spell-ward-plate`, `spell-pain-link`, `spell-cleanse-rite`, `spell-cinder-tile`, `spell-tripwire`, `spell-glyph-tax`, `spell-stone-turret`, `spell-turret-shard`, `spell-blood-familiar`, `spell-ricochet-mark`, `spell-void-anchor`.

**Discovery Wave 1 (`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md` §11):**  
`spell-quiet-hex`, `spell-chain-ward`, `spell-crosswind`, `spell-glass-shot`, `spell-ember-wake`, `spell-split-mark`, `spell-phase-slip`, `spell-sever-tether`, `spell-overcast`, `spell-second-wind`, `spell-choir-hymn`, `spell-oath-bind`, `spell-leech-tempo`, `spell-null-brand`, `spell-false-retreat`, `spell-blood-benediction`, `spell-ward-interpose`, `spell-martyr-fuse`, `spell-hex-of-silence`.

**Boss adaptations (`BOSS_AND_SPELL_DISCOVERY.md` §5.2):**  
`spell-ember-step`, `spell-caltrop`, `spell-shock-glyph`, `spell-exsanguinate`, `spell-glyph-snare`, `spell-vault`, `spell-brood-ward`, `spell-aftershock`, `spell-rot-brand`, `spell-echo-cast`.

**Duplicates still forbidden to clone:** Shield ≈ Iron Skin; Blood Mend ≈ Rallying Cry; Poison ≈ Venom; Expose ≈ Shadow Veil; Mirror ≈ Reflect Barrier.

---

## 2. Remaining gap map (after reserved proposals)

| Family | Still missing (this pass) | Not this pass (already reserved or live) |
| :--- | :--- | :--- |
| DAMAGE direct geometry | Rank/file **line** poke that hits the ray | Glass Shot (min-range sniper); Shadow Strike (diagonal) |
| DAMAGE delayed **tile** | Fuse on a cell, detonates later | Grave Bell (unit, execute window) |
| DAMAGE execute **now** | Instant finish vs overkill waste | Grave Bell (2-turn clock) |
| DAMAGE DoT payoff | Consume stacks → burst | Inferno / Poison / Venom / Rot Brand apply stacks |
| DAMAGE cross AoE | Plus-shape via `hitTiles` | Nova / Thunder Clap are circle / 8-dir |
| POSITION tile-gravity | Attract toward a **ground** cell | Hook / Void Anchor / Collapse attract to caster |
| POSITION ally rescue | Pull ally adjacent (not swap) | Ward Interpose (ally swap); Mist Step (self) |
| CONTROL range shrink | Debuff target `modifiableRange` spells | Lens Shift / Overcast buff the caster |
| CONTROL AP grant | +1 AP next turn | Drain Courage / Quiet Hex / Glyph Tax are taxes |
| CONTROL forced target | Next hostile swing must hit the goader | Hex of Silence is fizzle, BOSS_ONLY |
| DEFENSE shared HP | Split incoming, both bodies stay valid | Pain Link redirects; Ward Plate absorbs |
| SUPPORT ally cleanse | Strip DoT/debuff on an **ally** | Cleanse Rite is self |
| TERRAIN ice | Extra MP to leave / enter | Cinder burn; Tripwire root+damage; Rime from Wave-2 boss is director |
| TERRAIN smoke | Walkable LoS block | Barrier is solid; Ink Veil is BOSS_ONLY |
| SUMMONS defensive post | Stationary body-block, no bolt | Stone Turret shoots; Sentinel walks |
| SUMMONS player sacrifice | Spend own summon HP as a cast | Blood Familiar dies to *them*; Bomber AI; Martyr Fuse ENEMY_ONLY |

**Still open after this wave (do not fill today):** first `mpCost > 0` spell; cone `areaShape` wire; two-enemy swap; self knockback; portal-pair; evasion buff; distance-scaled damage. Those stay Wave 3 so this pass stays discrete.

---

## 3. Contract with Dynamic Spell Discovery

Coordinate with Discovery (`c26e5a83-…`) and Admin (`4efa22ec-…`). This pass only stamps acquisition so those layers can filter **by field**.

### 3.1 Discovery is still inert (reconfirmed)

1. All 32 frontend spells are forced `isBaseSpell` (`WorldExploration.tsx` 2393–2406).
2. Recap grants XP/Doka only.
3. Achievements (`defaultAchievements`, `admin.mo` 311–325) grant Doka only.
4. Challenges (`DEFAULT_CHALLENGES`) grant Doka/XP/badge only.
5. `upgradeSpell` levels a known id; it does not unlock ids.
6. `ENEMY_KITS` (`enemyAI.ts` 156–178) still reuse always-owned ids. Seeing a bishop cast Frost teaches nothing.
7. `buildEnemyKit` still takes `levelZone`. Discovery ecosystem already recorded that callers can pass a non-number → `NaN` → every kit stays zone 0.

**Prerequisite (owned by Discovery, not this pass):** split the 32-id blob. Innate seed remains Strike + Shield + Poison Arrow + Blood Mend. Do **not** append Wave 2 ids to `starterSpells` as base.

### 3.2 Rules for every proposed spell

- Persist grants through the **same atomic recap/backend funnel** as rewards (`ownedSpellIds` on the character, not `localStorage` as authority).
- Filters: `usableByPlayer` / `usableByEnemy` / `minLevel` / `acquisitionModel` / `discoveryEligible` / `discoverySources`.
- Enemy AI selects by **id** in `assignedSpells` / `summonKit` / `aiHint`, never `spell.name.includes(...)`.
- `NOT_PLAYER_LEARNABLE` may appear in kits so the player can *see* them. Witness without grant.
- Default observe path (Discovery §3): hostile **uses** the id (WX `kind: "cast"` + AP spend) → persist observation → **same-encounter win** → `commitSpellDiscoveries`. Possession is not observation. Hit is not required.
- Do not require “see it N times” except where a boss adaptation already does. Wave 2 defaults `allowLaterVictory: false`.

### 3.3 Acquisition model meanings (unchanged)

| Model | Grant when | Typical `usableByEnemy` |
| :--- | :--- | :--- |
| `ENEMY_DISCOVERY` | Witness + same-encounter win | true |
| `ELITE` | Same, elite/champion tag | true |
| `BOSS` | First victory vs listed `bossIds` | true on that boss |
| `ACHIEVEMENT` | Claim of listed achievement (plus existing Doka) | usually false |
| `CHALLENGE` | Complete listed challenge id | usually false |
| `MULTI_SOURCE` | First completed child wins; no double copy | mixed |
| `NOT_PLAYER_LEARNABLE` | Never written to owned ids | true (kit-only) |

### 3.4 New `effectParams` keys for this pass

Parsers whitelist. Unknown keys ignored. Missing key → effect does not fire. Do **not** add name tables.

Reuse from Wave 1 where the meaning is identical: `attractDistance`, `cleanseTypes`, `executeHpPercent`, `executeDamage`, `rootTurns`.

**New keys (Wave 2 only):**

```text
executeMode,              // "instant" — Coup de Grâce. Grave Bell omits this (delayed).
fuseTurns, fuseDamage, fuseRadius,
detonateDotTypes,         // ["poison","venom","burn","bleed"]
detonateDamagePerStack, consumeDots,
rangeDebuffDelta,         // negative; Short Sight
rangeDebuffDuration,
grantApNextTurn,          // Tempo Gift
iceMpTax, iceDuration,    // Rime Tile
losBlock, losBlockDuration,
attractTowardTile,        // true → attract to targeted ground cell, not caster
pullAllyAdjacent,
tauntDuration, tauntNextHit,
splitIncomingRatio, tetherDuration, tetherRange,
sacrificeOwnSummon,       // true
sacrificeDamagePerMissingHp,
lineMaxHits,              // File Lance cap
crossArmLength            // Cross Cut; also expressed as hitTiles
```

If a key is missing, the rider does not fire.

---

## 4. Power budget (relative, not a new math model)

Do not touch damage formulas. Numbers are base `SpellConfig.damage` / effect params; existing `spellDmgGrowthPercent` / `upgradeSpell` apply.

| Band | AP | Expected payload | Anchor |
| :--- | ---: | :--- | :--- |
| Cheap tool | 2 | 8–12 dmg **or** strong position/control, not both at full | Strike 10 / Slow |
| Standard | 3 | ~18–22 **or** 12 + movement **or** clean utility | Frost 20 / Swap |
| Heavy | 4–5 | AoE / delayed / summon, CD 2–3 | Chain / Inferno |
| Signature | 6 + CD 4+ | Multi-axis; usually not player-learnable | Do not copy Void Collapse 12/80 |

Conditional riders stay small so the **decision** is the power.

---

## 5. Proposed spells (Wave 2)

All rows: `STATUS: PROPOSED`. `mpCost: 0` unless noted. `isBaseSpell: false`. None of these ids exist in `spellData.ts` or in the reserved tombstone (§1.4).

---

### SPELL_ID: `spell-file-lance`

NAME: File Lance  
ROLE: DAMAGE direct — rank/file line poke  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 3  
RANGE: 4  
TARGET_TYPE: line  
LOS: true  
COOLDOWN: 1  
EFFECT: `linear: true` (cardinal only — implementation must honor `linear` on the existing `targetType: "line"` branch, which today walks 8 dirs). Deal 12 to each hostile on the ray, max `lineMaxHits: 3`. Stops at wall / barrier. Does **not** pull, push, or slow. Distinct from Glass Shot (single-target, `minRange: 3`, range 6) and from Hook Line (pull + 8).  
DURATION: instant  
SCALING: damage follows dmg%; hit cap fixed.  
SYNERGIES: Root Snare / Glyph Tax keep bodies on the file; Split Mark; Cinder / Rime on the file; Shoulder Bash onto the line.  
COUNTERPLAY: Step off-axis; Barrier the file; stand diagonal.  
POWER_BUDGET: Standard. 12×1 is below Frost; 12×2–3 requires they lined up.  
AI_USAGE: `aiHint: "line_if_two_hostiles_on_file"`. Rooks / queens zone ≥ 1. Skip if the ray hits only one and Frost is in kit.  
DISCOVERY_ELIGIBILITY: `discoveryEligible: true`, `discoveryWeight: 10`, `discoverySources: { pieceTypes: ["rook","queen"], levelZoneMin: 1 }`  
EDGE_CASES: Do not hit allies (`hitsAllies: false`). Portals / void stop the ray. Friendly summons on the file body-block but take no damage.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — line targeting exists; must filter `linear` and apply per-tile damage without a name check.  
STATUS: PROPOSED

**SpellConfig sketch**

```text
id: spell-file-lance
effectType: damage
effectCategory: damage
spellType: damage
targetType: line
areaShape: line
linear: true
lineOfSight: true
hitsMultiple: true
aoe: true
usableByPlayer: true
usableByEnemy: true
minLevel: 1
effectParams: {"lineMaxHits":3}
```

---

### SPELL_ID: `spell-fuse-tile`

NAME: Fuse Tile  
ROLE: DAMAGE delayed — ground fuse  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ground  
LOS: true  
COOLDOWN: 2  
EFFECT: `freeCells: true`. Paint one floor tile with `effectParams: {"fuseTurns":2,"fuseDamage":22,"fuseRadius":0}`. After 2 **world** turns (same clock as barrier duration), the tile deals 22 (RES+SR, existing `dealDamage`) to whoever occupies it. Radius 0 = that cell only. No damage on cast. Distinct from Grave Bell (unit debuff + execute window) and from Cinder (per-enter/turn tick).  
DURATION: 2 turns, then consume  
SCALING: fuseDamage follows dmg%; turns fixed.  
SYNERGIES: Hook / Bash / Sinkhole / Swap onto the cell; Root Snare; Tripwire on an adjacent escape; Mark does **not** amp the fuse unless the detonation is implemented as a spell-hit on that tile — **explicit: fuse is environmental, no Mark**.  
COUNTERPLAY: Leave the cell; Barrier replaces the fuse (same last-writer rule as Cinder); Mist Step / Phase Slip off (teleport does not “enter” for Tripwire; fuse cares about **occupancy at tick**, so blink-off works).  
POWER_BUDGET: Standard. 22 if they stay — Frost-adjacent but delayed and dodgeable.  
AI_USAGE: `aiHint: "fuse_on_player_or_rooted_tile"`. Queens / bombers zone ≥ 1. Skip if the player has 3+ MP and an open ring (they will walk).  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["queen","bishop"]`, `levelZoneMin: 1`  
EDGE_CASES: One fuse per cell; last writer wins. Occupied-at-cast is legal (you can fuse under them). Death of the caster does **not** cancel the fuse (tile-owned). Challenge: tick uses `recordInBattleChallengeDamage` only if the existing lava path already would — prefer the same environmental helper, not combat `recordChallengeDamageTaken`, and document which one the implementer binds. **Bind `recordChallengeDamageTaken` if the fuse is treated as a spell-hit; `recordInBattleChallengeDamage` if treated as lava-like.** This card picks **spell-hit** (it is a delayed cast): `recordChallengeDamageTaken`.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — needs a tile fuse table next to `hazardTiles` / `markedTilesRef`.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-coup-de-grace`

NAME: Coup de Grâce  
ROLE: DAMAGE execute — instant  
ACQUISITION: ELITE  
AP_COST: 3  
RANGE: 1  
TARGET_TYPE: enemy  
LOS: false  
COOLDOWN: 2  
EFFECT: `isPhysical: true`. `effectParams: {"executeMode":"instant","executeHpPercent":25,"executeDamage":34}`. If target `hp/maxHp <= 0.25` deal 34, else deal 8. Both go through existing `dealDamage` (RES only — physical). Distinct from Grave Bell (no delay, melee, no 30% window).  
DURATION: instant  
SCALING: both damage numbers follow dmg%; threshold fixed.  
SYNERGIES: Inferno / Venom / Cinder to push them under 25%; Cursed Wound keeps heals from kicking them out; Weaken; File Lance chip.  
COUNTERPLAY: Heal above 25% before they step in; keep the elite at range 2; Ward Plate absorb is subtracted **before** the HP% check (absorb is not HP — execute reads `hp/maxHp` only).  
POWER_BUDGET: Standard AP. 8 is worse than Strike; 34 is a finish, not a opener. CD 2 stops every-turn execute fishing.  
AI_USAGE: `aiHint: "execute_if_hp_pct_le_25"`. Elite knights / kings. If HP% > 25 and Strike is in kit, skip.  
DISCOVERY_ELIGIBILITY: true. `eliteOnly: true`, `levelZoneMin: 2`, `pieceTypes: ["knight","king"]`  
EDGE_CASES: Summons with tiny maxHp: 25% is still the fraction, not a flat. Do not also fire Grave Bell’s delayed key. Cap 1 execute rider per cast (no double read).  
IMPLEMENTATION_COMPLEXITY: LOW–MEDIUM — one HP% branch on `executeMode === "instant"`.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-ignite-stacks`

NAME: Ignite Stacks  
ROLE: DAMAGE conditional — detonate DoTs  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 4  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: Deal 8. Then if the target has any `ActiveEffect` with `type: "dot"` whose `dotType` is in `detonateDotTypes`, deal `detonateDamagePerStack` (6) per matching `stackId` and, if `consumeDots: true`, remove those stacks. `effectParams: {"detonateDotTypes":["poison","venom","burn","bleed"],"detonateDamagePerStack":6,"consumeDots":true}`. Reads **stack metadata**, never `spell.name === "Poison"`. Distinct from Ricochet (bounce predicate) and from Inferno (applies burn).  
DURATION: instant; consume is immediate  
SCALING: 8 and 6 follow dmg%.  
SYNERGIES: Poison / Venom / Inferno / Ember / Rot Brand / Exsanguinate. The decision is **hold stacks for ticks vs cash them**.  
COUNTERPLAY: Cleanse Rite / Absolve before the ignite; don’t stack three DoTs on one body if they have this id.  
POWER_BUDGET: Heavy. 8 + 6×1 = 14 (worse than Frost). 8 + 6×3 = 26 (Inferno-adjacent) and you **lose** remaining ticks.  
AI_USAGE: `aiHint: "detonate_if_dot_stacks_ge_2"`. Queens zone ≥ 2. If stacks < 2, prefer Inferno / Frost.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["queen"], levelZoneMin: 2`  
EDGE_CASES: No matching stacks → 8 only (legal). Do not consume buffs / absorb / root. Bleed from Exsanguinate counts if `dotType: "bleed"` is set on that effect.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — `dotStacks.ts` already assigns `stackId`.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-short-sight`

NAME: Short Sight  
ROLE: CONTROL — range shrink  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: No damage. `effectCategory: "cc"`. `effectParams: {"rangeDebuffDelta":-2,"rangeDebuffDuration":2}`. For 2 turns, any spell the **target** casts with `modifiableRange: true` has −2 range (min 1, still respects that spell’s `minRange`). Spells with `modifiableRange !== true` are unchanged — Strike stays melee. Distinct from Lens Shift / Overcast (those write the **caster’s** `modifiableRangeBonusRef`).  
DURATION: 2 turns  
SCALING: delta fixed.  
SYNERGIES: Walk into Glass Shot’s minRange hole; Quiet Hex on the wasted long cast; File Lance after they cannot snipe.  
COUNTERPLAY: Cast unmodified-range tools (Strike, Frost today — **if those rows later set `modifiableRange`, this card becomes stronger; do not silently flip Frost**). Haste closer. Cleanse.  
POWER_BUDGET: Cheap control, 0 damage, CD 2.  
AI_USAGE: `aiHint: "range_debuff_if_target_holds_modifiable"`. Bishops zone ≥ 1. Skip if the player’s equipped ids all have `modifiableRange !== true`.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["bishop"], levelZoneMin: 1`  
EDGE_CASES: Stacking two Short Sights: **replace** (last writer), min range 1. Does not affect `maxSpellRange` cap (that cap is an upper bound).  
IMPLEMENTATION_COMPLEXITY: LOW — mirror the existing bonus ref with a **target-scoped** penalty.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-tempo-gift`

NAME: Tempo Gift  
ROLE: SUPPORT — AP buff  
ACQUISITION: ACHIEVEMENT  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 3  
EFFECT: `effectCategory: "buff"`. `effectParams: {"grantApNextTurn":1}`. Target (ally or self) gains +1 current AP at the **start of their next turn**. Does not raise max AP (cap 20 unchanged). Distinct from Haste (+2 MP) and from Timestep (full refill, once/battle).  
DURATION: 1 upcoming turn  
SCALING: grant fixed.  
SYNERGIES: `hard_3` (≤8 AP/turn) — the extra AP **does** count toward the challenge spend if they use it (`recordChallengeApSpend` on the casts, not on the grant). File Lance + Ignite in one turn; Wisp / Sentinel as the ally target.  
COUNTERPLAY: Kill the buffer; Drain Courage on the gifted body; wait the turn.  
POWER_BUDGET: Cheap, long CD. One extra 2–3 AP spell is the whole card.  
AI_USAGE: Player-first (`usableByEnemy: false`). If later given to kings: `aiHint: "buff_adjacent_ally"` on the highest-damage ally who is about to act.  
DISCOVERY_ELIGIBILITY: true. `achievementIds: ["unstoppable"]` (reach player level 10). Level-agnostic feat, not a last tier.  
EDGE_CASES: Grant on a dead target: no-op. Two Tempo Gifts: **replace**, not +2. Do not persist AP through `saveBattleStats` as a new CharacterStats field — battle overlay only.  
IMPLEMENTATION_COMPLEXITY: LOW  
STATUS: PROPOSED

---

### SPELL_ID: `spell-absolve`

NAME: Absolve  
ROLE: SUPPORT — ally cleanse  
ACQUISITION: MULTI_SOURCE  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 2  
EFFECT: `effectCategory: "buff"`. `effectParams: {"cleanseTypes":["debuff","dot"]}`. Remove matching `ActiveEffect`s from the **targeted ally** (including self). No heal. Distinct from Cleanse Rite (self, range 0) — this is the peel.  
DURATION: instant  
SCALING: none  
SYNERGIES: Answers Inferno / Venom / Slow / Grave Bell / Root / Short Sight / Cursed Wound on a Sentinel or Wisp. Pacifist / no-heal challenges stay valid (`spellType` is not `"heal"`).  
COUNTERPLAY: Re-apply after; burst during CD; don’t let them reach the ally.  
POWER_BUDGET: Standard, 0 throughput.  
AI_USAGE: `aiHint: "cleanse_ally_if_dot_stacks_ge_2_or_rooted"`. Requires `aiProfile: healer` or `buffer`. Pale Cantor / Wisp kits.  
DISCOVERY_ELIGIBILITY: true. `achievementIds: ["jackpot"]` **or** `challengeIds: ["hard_1"]`. First grant wins. (Cleanse Rite already claimed `survivor` / `easy_1` — do not reuse.)  
EDGE_CASES: Do not strip buffs, absorb, or Mark tiles. Ward Plate stays.  
IMPLEMENTATION_COMPLEXITY: LOW — same strip as Cleanse Rite, different `targetType`.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-cross-cut`

NAME: Cross Cut  
ROLE: DAMAGE — plus-shape AoE  
ACQUISITION: ELITE  
AP_COST: 4  
RANGE: 3  
TARGET_TYPE: area  
LOS: true  
COOLDOWN: 2  
EFFECT: `aoe: true`, `areaShape: "cross"` (presentation). **Resolution uses `hitTiles`**, which `castHelpers.ts` already consumes — do not wait for an `areaShape` reader. `hitTiles: [(0,1),(0,2),(1,0),(2,0),(0,-1),(0,-2),(-1,0),(-2,0)]` plus the origin. Deal 14 per hostile on those tiles. `hitsAllies: false`. Distinct from Frost Nova (Chebyshev r=2 circle) and Thunder Clap (8-dir r=1).  
DURATION: instant  
SCALING: 14 follows dmg%; arm length fixed (`crossArmLength: 2`).  
SYNERGIES: Hook / Sinkhole onto the origin; File Lance after they step off a file onto the cross; Root.  
COUNTERPLAY: Stand on a diagonal of the origin; Barrier an arm.  
POWER_BUDGET: Heavy. One body = 14 (below Frost); two+ on the plus is the payoff.  
AI_USAGE: `aiHint: "cross_if_two_on_plus"`. Elite rooks / queens. Skip if the plus covers < 2 hostiles and Nova is in kit.  
DISCOVERY_ELIGIBILITY: true. `eliteOnly: true`, `pieceTypes: ["rook","queen"]`, `levelZoneMin: 2`  
EDGE_CASES: Origin may be an empty tile (targetType area). Walls clip arms (skip those offsets).  
IMPLEMENTATION_COMPLEXITY: LOW — `hitTiles` path exists.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-rime-tile`

NAME: Rime Tile  
ROLE: TERRAIN — ice MP tax  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ground  
LOS: true  
COOLDOWN: 1  
EFFECT: `freeCells: true`. `effectParams: {"hazardType":"ice","iceMpTax":1,"iceDuration":3}`. Paint one floor tile. A combatant who **starts a turn on it** or **enters it by walking / push / pull** pays +1 MP for their **next** tile of movement that turn (min 0 MP left; they can become stuck). No HP damage. Distinct from Cinder (burn), Slow (unit MP debuff), and Frost Bolt (−1 MP stat).  
DURATION: 3 turns  
SCALING: tax fixed.  
SYNERGIES: Shoulder Bash / Hook / Sinkhole onto rime; Root after they spend the last MP; Glyph Tax (AP + MP squeeze); `hard_3`.  
COUNTERPLAY: Walk around; Barrier replaces ice; teleport off (Mist Step / Phase Slip / Swap do **not** pay the ice tax — same enter rule as Tripwire).  
POWER_BUDGET: Standard control, 0 damage.  
AI_USAGE: `aiHint: "paint_ice_on_escape_path"`. Bishops / Tide-style kits zone ≥ 1.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["bishop"], levelZoneMin: 1`  
EDGE_CASES: Map ice + spell rime on one cell: **one** tax (last writer). Do not also apply Cinder’s burn. Portals / void rejected.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — `hazardTiles` already knows ice on generated maps.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-smoke-veil`

NAME: Smoke Veil  
ROLE: TERRAIN — walkable LoS block  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ground  
LOS: false  
COOLDOWN: 2  
EFFECT: `freeCells: true`. `effectParams: {"losBlock":true,"losBlockDuration":3}`. Paint one floor tile. Units **may walk through it**. Bresenham LoS treats the cell as opaque (same as a barrier for `hasLoS` only). Distinct from Barrier (solid) and from Ink Veil (`BOSS_ONLY` arena director).  
DURATION: 3 turns  
SCALING: none  
SYNERGIES: Break Glass Shot / File Lance / Hook Line / Soul Rend rays; hide a Fuse; Short Sight + smoke = two ways to brick a sniper.  
COUNTERPLAY: Walk through and melee; diagonal around; spells with `lineOfSight: false` (Shadow Strike, Barrier, this spell).  
POWER_BUDGET: Standard utility, 0 damage, CD 2.  
AI_USAGE: `aiHint: "smoke_on_los_to_player_sniper"`. Lurkers / bishops zone ≥ 2. Skip if the player is already adjacent.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["bishop","queen"], levelZoneMin: 2`  
EDGE_CASES: Barrier on the same cell: barrier wins (solid). Smoke does not block movement, portals, or Swap. Multiple smokes: each cell independent.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — LoS helper must read a `smokeTiles` set, not `spell.name`.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-sinkhole`

NAME: Sinkhole  
ROLE: POSITION — pull toward a tile  
ACQUISITION: MULTI_SOURCE  
AP_COST: 4  
RANGE: 4  
TARGET_TYPE: ground  
LOS: true  
COOLDOWN: 3  
EFFECT: `aoe: true`, `areaShape: "circle"`, `areaRadius: 2` (Chebyshev, existing area expand). `effectCategory: "attract"`. `effectParams: {"attractTowardTile":true,"attractDistance":1}`. Each hostile in the radius is pulled **1 step toward the targeted cell** via `applyAttract` with attractor = the tile (not the caster). No damage. Distinct from Hook Line (single target, toward caster) and Void Anchor / Collapse (toward caster + damage/root).  
DURATION: instant  
SCALING: distance fixed.  
SYNERGIES: Fuse / Cinder / Rime / Tripwire / Mark on the sink cell; File Lance after they cluster; Cross Cut origin.  
COUNTERPLAY: Stand at radius 3; Barrier between you and the hole; body-block with a summon.  
POWER_BUDGET: Heavy control, 0 damage, CD 3.  
AI_USAGE: `aiHint: "tile_pull_into_hazard_or_fuse"`. Elite bishops / rift kits. Skip if no hazard / fuse / mark on a candidate cell.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["bishop"]` `levelZoneMin: 2` **or** `challengeIds: ["hard_3"]`. First grant wins.  
EDGE_CASES: Occupied sink cell is legal (you can pull onto a unit — attract already stops short). Do not pull allies. Do not pull through void.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — `applyAttract` exists; pass the tile as the attractor.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-leash-hook`

NAME: Leash Hook  
ROLE: SUPPORT / POSITION — ally rescue pull  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 2  
EFFECT: `effectCategory: "attract"`. `effectParams: {"pullAllyAdjacent":true}`. Pull the allied target to a free cell **adjacent** to the caster (Chebyshev 1). Prefer the cell closest to the ally’s current position; if none free, fizzle (AP spent). No damage. Distinct from Ward Interpose (swap places) and from Hook Line (enemy).  
DURATION: instant  
SCALING: none  
SYNERGIES: Peel a Wisp / Turret-adjacent ally off Cinder; Chain Ward after they land adjacent; Absolve the pulled body.  
COUNTERPLAY: Occupy the caster’s ring; Root the ally first (root **does** block this pull — explicit: `rootTurns` active → reject).  
POWER_BUDGET: Cheap reposition. CD 2.  
AI_USAGE: `aiHint: "pull_ally_out_of_melee_or_hazard"`. Guardian / buffer. Leash Warden family. Skip if the ally is already adjacent and safe.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["rook"], levelZoneMin: 1`  
EDGE_CASES: Cannot target enemies. Cannot pull yourself. Death Realm / portal cells rejected.  
IMPLEMENTATION_COMPLEXITY: LOW–MEDIUM — occupancy walk, no new damage path.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-bastion-pylon`

NAME: Bastion Pylon  
ROLE: SUMMON stationary defensive  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 4  
RANGE: 2  
TARGET_TYPE: ground  
LOS: false  
COOLDOWN: 3  
EFFECT: `isSummon: true`, `summonAI: "pylon"`, `summonLifespan: 4`, `freeCells: true`. `summonUnitDef`: pieceType `pylon`, hpScale 1.4, damageScale 0, `ap: 0`, `mp: 0`, `summonKit: []`. Occupies a cell (body-block, LoS block like a unit). Does **not** attack. Distinct from Stone Turret (`summonAI: "turret"` + shard) and from Sentinel (walks, casts Shield).  
DURATION: 4 summon turns  
SCALING: HP follows existing summon formulas.  
SYNERGIES: Place on a File Lance / Glass Shot file; Smoke is walkable, this is not; Fuse behind the pylon; Goad so they have to walk around it.  
COUNTERPLAY: Kill the pylon; walk around; Swap past.  
POWER_BUDGET: Heavy, CD 3, 0 damage. A wall with HP.  
AI_USAGE: `aiHint: "summon_pylon_on_los_file"`. Elite rooks. New `SUMMON_KIT.pylon`. Until `aiProfile: guardian` / pylon exists, **do not** put this in a live CORE pool (Discovery §9).  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["rook"], levelZoneMin: 2`  
EDGE_CASES: `ap: 0` + `mp: 0` **must not path**. CleanupMap / Death Realm despawn with other summons. 0 XP if an enemy pylon dies (not a reward body).  
IMPLEMENTATION_COMPLEXITY: MEDIUM — new archetype; do not reuse turret or bomber.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-blood-tithe`

NAME: Blood Tithe  
ROLE: SUMMON sacrificial — player-triggered  
ACQUISITION: CHALLENGE  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 3  
EFFECT: Target must be a **living allied summon** (`isSummon` combatant, `ownerId` = caster). `effectParams: {"sacrificeOwnSummon":true,"sacrificeDamagePerMissingHp":1}`. Destroy the summon (HP → 0, lifespan hooks fire). Deal damage to the nearest hostile within 3 of the **summon’s** cell equal to `floor((maxHp - hp) * 1)` + 10, capped at 28. The more wounded the pet, the harder the tithe — **waiting** is the decision. Distinct from Blood Familiar (they must kill it), Bomber (AI walks in), Martyr Fuse (ENEMY_ONLY).  
DURATION: instant  
SCALING: the +10 follows dmg%; the missing-HP term is raw summon HP (not double-scaled). Cap 28 fixed.  
SYNERGIES: Park a wounded Wolf / Archer on a Fuse / next to a boss; Brood Ward ends if it was your last pet; Sever Tether will punish the death if an enemy has it.  
COUNTERPLAY: Kill the pet at full HP first (tithe is weak); Cursed Wound does not apply to this damage unless the hit is a spell-hit — **explicit: this is a spell-hit** (RES+SR).  
POWER_BUDGET: Cheap AP, long CD, requires a body. Full-HP cheap pet ≈ 10 damage (worse than Strike).  
AI_USAGE: Player-first (`usableByEnemy: false`). Enemies already have Martyr Fuse.  
DISCOVERY_ELIGIBILITY: true. `challengeIds: ["hard_2"]` (under 10 turns — the “spend the pet to close” door).  
EDGE_CASES: No allied summon in range → fizzle, AP spent. Lifespan-fade the same turn: reject if HP already 0. Familiar `onDeathHealOwner` **does** fire (documented: tithe is a death). Challenge `no_healing`: the familiar heal still trips `healUsed` if that card’s rule says so — Blood Familiar already set that; Tithe itself is not a heal.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — must key off summon ownership metadata, not `name.includes("Wolf")`.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-goad`

NAME: Goad  
ROLE: CONTROL — forced targeting  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 2  
RANGE: 2  
TARGET_TYPE: enemy  
LOS: false  
COOLDOWN: 2  
EFFECT: No damage. `effectCategory: "cc"`. `effectParams: {"tauntDuration":1,"tauntNextHit":true}`. Until the target’s next damaging **action** (spell with `damage > 0` or `isPhysical`, or Strike), that action **must** choose the goading caster if the caster is a legal target for that spell (range, LoS, `targetType`). If the caster is illegal (out of range, blocked LoS, dead), the taunt fizzles and they may act normally. Distinct from Hex of Silence (fizzle) and Quiet Hex (AP tax).  
DURATION: 1 action or 1 turn, whichever first  
SCALING: none  
SYNERGIES: Bastion / Smoke between you and them; Ward Plate; Pain Link after they are forced to swing; File Lance while they walk in.  
COUNTERPLAY: Cast a non-damaging tool (Slow, Barrier, Haste); walk out of range so the taunt drops; Absolve.  
POWER_BUDGET: Cheap control, 0 damage.  
AI_USAGE: `aiHint: "taunt_if_ally_is_lower_hp"`. Knights / pawns / guardians. Skip if the caster is the only legal target anyway.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["pawn","knight"], levelZoneMin: 0`  
EDGE_CASES: AoE that already includes the goader **satisfies** the taunt (they may still hit others). DoTs already on the goader do not consume the taunt. Challenge damage: the forced hit still records normally.  
IMPLEMENTATION_COMPLEXITY: HIGH — AI and player targeting must read a `tauntCasterId` on the combatant.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-life-tether`

NAME: Life Tether  
ROLE: DEFENSE — shared incoming  
ACQUISITION: BOSS  
AP_COST: 4  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 3  
EFFECT: `effectCategory: "defense"`. `effectParams: {"splitIncomingRatio":0.5,"tetherDuration":2,"tetherRange":3}`. While caster and target remain Chebyshev ≤ 3, each incoming HP hit to **either** body is split 50/50 (after absorb, before death). If they separate, the tether breaks. Distinct from Pain Link (redirect whole hit to nearest hostile) and Chain Ward (RES% while adjacent).  
DURATION: 2 turns or until range break  
SCALING: ratio fixed.  
SYNERGIES: Ward Plate on one body (absorb first, then split leftover); Midnight Bishop **teaches** shared HP; Blood Benediction the weaker half.  
COUNTERPLAY: Pull one body beyond 3 (Hook / Swap / Sinkhole); AoE that hits both still splits **each** hit (two splits — do not also share the AoE a third time).  
POWER_BUDGET: Heavy utility, 0 damage, CD 3.  
AI_USAGE: `midnight_bishop` phase 1 (the twins already share a pool — this is the **player** adaptation, weaker and breakable). `aiHint: "tether_lowest_hp_ally"`.  
DISCOVERY_ELIGIBILITY: true. `bossIds: ["midnight_bishop"]`. Observation flags **false** (BOSS route).  
EDGE_CASES: Tether to a summon: legal. Tether to self: reject. If one body would die from its half, it dies; leftover does **not** dump onto the partner (no rebound). Challenge: each body records the HP it actually lost via `recordChallengeDamageTaken`.  
IMPLEMENTATION_COMPLEXITY: HIGH — incoming damage pipeline, two bodies, absorb order.  
STATUS: PROPOSED

---

## 6. Combination matrix (intended, not name-wired)

Resolve only via flags / tile maps / effect keys.

| Setup (metadata) | Payoff (metadata) | Decision |
| :--- | :--- | :--- |
| `isDotSpell` stacks + `stackId` | `consumeDots` + `detonateDamagePerStack` | Tick three turns or cash now |
| `hp/maxHp <= executeHpPercent` | `executeMode: "instant"` | Step in for 34 or Strike for 10 |
| `fuseTurns` cell | `attractTowardTile` / `pushDistance` | Who is on the bomb when it ticks |
| `hazardType: "ice"` | `rootTurns` / File Lance | They cannot leave the file |
| `losBlock` cell | `linear` + `lineOfSight` | Smoke the sniper file |
| `rangeDebuffDelta` | `modifiableRange: true` + Glass Shot | Close into the dead zone |
| `grantApNextTurn` | `hard_3` / Ignite + Lance | Spend 9 AP or fail the challenge |
| `cleanseTypes` on ally | stacked DoTs on a Sentinel | Peel vs self-Cleanse |
| `pullAllyAdjacent` | Cinder / Fuse under the ally | Rescue or leave them as bait |
| `sacrificeOwnSummon` | wounded `maxHp-hp` | Pop early for 10 or wait for 28 |
| `tauntNextHit` | Bastion / Smoke / Ward Plate | They must walk the long way |
| `splitIncomingRatio` | absorb then split | Who holds the plate |
| `hitTiles` cross | bodies on + not on diagonals | Stand on a bishop square |
| Barrier on fuse / rime / smoke | last writer | You built the answer |

Map modifiers stay metadata-only. Arcane Surge vs ice tax is independent (AP vs MP). Plague + fuse is two ticks if both hooks fire — document in recap later, do not name-check.

---

## 7. Recommended unlock order (pacing)

Discovery designer should treat these as **bands**, not a shop list.

| Band | Spells | Why |
| :--- | :--- | :--- |
| Early (zone 0–1, first feats) | Goad, Leash Hook, Short Sight, Rime Tile | Forced target, peel, range answer, ice |
| Mid (zone 1–2, hard_1 / jackpot) | File Lance, Fuse Tile, Absolve, Smoke Veil | Geometry + delayed tile + peel cleanse |
| Late (elites / zone 2 / hard_2) | Coup de Grâce, Ignite Stacks, Cross Cut, Bastion Pylon, Blood Tithe | Execute, detonate, plus-shape, wall, pet spend |
| Feat / challenge | Tempo Gift (`unstoppable`), Sinkhole (bishop **or** `hard_3`) | AP gift; tile gravity |
| Boss recap | Life Tether (`midnight_bishop`) | Shared-HP lesson, breakable |

**Still required for any of this to matter:** Discovery’s innate-four split. This pass does not edit `spellData.ts`.

---

## 8. Implementation notes (for a later, explicit implementation PR)

1. Honor `linear` / `diagonal` on the `targetType: "line"` branch (`targeting.ts` 352–385).  
2. Wire `effectCategory` `attract` with `attractTowardTile` vs caster attractor.  
3. Add `smokeTiles` / `fuseTiles` / `ice` paint next to `hazardTiles`; Barrier last-writer clears them.  
4. Instant execute reads `executeMode === "instant"` — do not treat Grave Bell’s delayed keys as instant.  
5. DoT detonate reads `stackId` + `dotType` enums, never names.  
6. Taunt and tether are combatant flags, not `if (spell.name === "Goad")`.  
7. Pylon AI is a new `summonAI` string; empty kit; no pathing.  
8. Recap grant uses the reward funnel + `commitSpellDiscoveries` / `unlockOwnedSpell`, not `updateCharacter`.  
9. Do not touch RAF, map generation, turn order, or damage math.  
10. Add ids to `SPELL_ID_CATALOG` **only when implemented**, together with `spellData.ts` and kits.

---

## 9. Explicit non-goals this pass

- No production TypeScript / Motoko / Candid edits.  
- No new damage formula, crit, or RES/SR identity.  
- No shop-bought spells.  
- No fourth RES% buff.  
- No second Chain Lightning, second absorb, second self-cleanse, second caster-range-buff.  
- No player-owned silence (Hex of Silence stays BOSS_ONLY).  
- No 12-AP Void Collapse clone.  
- No `mpCost > 0` spell yet (listed as Wave 3).  
- No cone `areaShape` engine rewrite (Cross Cut uses `hitTiles`).

---

## 10. Proposal index

| ID | Acquisition | Complexity | Primary hole filled |
| :--- | :--- | :--- | :--- |
| `spell-file-lance` | ENEMY_DISCOVERY | MEDIUM | Rank/file line poke |
| `spell-fuse-tile` | ENEMY_DISCOVERY | MEDIUM | Delayed ground fuse |
| `spell-coup-de-grace` | ELITE | LOW–MEDIUM | Instant execute |
| `spell-ignite-stacks` | ENEMY_DISCOVERY | MEDIUM | DoT detonate |
| `spell-short-sight` | ENEMY_DISCOVERY | LOW | Range shrink |
| `spell-tempo-gift` | ACHIEVEMENT | LOW | AP grant |
| `spell-absolve` | MULTI_SOURCE | LOW | Ally cleanse |
| `spell-cross-cut` | ELITE | LOW | Plus-shape AoE |
| `spell-rime-tile` | ENEMY_DISCOVERY | MEDIUM | Ice MP tax |
| `spell-smoke-veil` | ENEMY_DISCOVERY | MEDIUM | Walkable LoS block |
| `spell-sinkhole` | MULTI_SOURCE | MEDIUM | Pull toward a tile |
| `spell-leash-hook` | ENEMY_DISCOVERY | LOW–MEDIUM | Ally rescue pull |
| `spell-bastion-pylon` | ENEMY_DISCOVERY | MEDIUM | Stationary defense summon |
| `spell-blood-tithe` | CHALLENGE | MEDIUM | Player-triggered pet sacrifice |
| `spell-goad` | ENEMY_DISCOVERY | HIGH | Forced targeting |
| `spell-life-tether` | BOSS | HIGH | Shared incoming HP |

All STATUS: **PROPOSED**.

---

## 11. Source map (read-back)

| Topic | File | Lines |
| :--- | :--- | :--- |
| Live 32-id catalog | `src/frontend/src/data/spellData.ts` | 9–691 |
| Forced `isBaseSpell` | `src/frontend/src/components/WorldExploration.tsx` | 2393–2406 |
| Backend library filter | `src/frontend/src/utils/adminSafety.ts` | 311–318 |
| `SPELL_ID_CATALOG` | `src/frontend/src/data/bossKits.ts` | 29–62 |
| `SpellConfig` | `src/frontend/src/types/gameTypes.ts` | 160–241 |
| Line targeting (unused by data) | `src/frontend/src/engine/targeting.ts` | 352–385 |
| Area = Chebyshev, no `areaShape` | `src/frontend/src/engine/targeting.ts` | 445–452 |
| `hitTiles` AoE | `src/frontend/src/engine/castHelpers.ts` | 105–117 |
| Trap stub = barrier | `src/frontend/src/engine/spellEngine.ts` | 441–445 |
| Push / attract unused by casts | `src/frontend/src/engine/occupancy.ts` | 354+ |
| Enemy kits (owned ids) | `src/frontend/src/engine/enemyAI.ts` | 156–178 |
| Backend six | `src/backend/lib/admin.mo` | 168–191 |
| Feats | `src/backend/lib/admin.mo` | 311–325 |
| Challenges | `src/frontend/src/utils/challengeCompletion.ts` | 38–103 |

**Document status:** PROPOSED. Safe to review and implement in a later, explicit data PR. Not a license to land combat code in the same change as this spec.
