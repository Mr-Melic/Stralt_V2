# Enemy and Elite Evolution Design

**Author:** Enemy and Elite Evolution Designer (cron `0 */24 * * *`)  
**Date:** 2026-08-31  
**Status:** PROPOSED — design only. No production code in this change.  
**Scope:** World-pack enemies and family variants. Bosses stay on the existing 12-id catalog.

Stralt has **no character level cap**. Nothing in this document is a final enemy level, a final player level, or a last tier. Relevance comes from **player-relative spawn**, **role identity**, **AI sophistication**, **spell-pool growth**, and **variant mechanics**.

---

## 1. Existing families (read first)

World packs are not one roster. They are four stacked layers. New content must attach to these layers, not replace them with a level-capped bestiary.

### 1.1 Chess chassis (always on)

`generateEnemies` in `WorldExploration.tsx` picks `king | queen | pawn | rook | bishop | knight` uniformly. Every hostile is a chess piece first.

`buildEnemyKit` (`enemyAI.ts`) assigns spells from **piece type**, not family:

| Chassis | Role today | Kit (intended zone growth) |
| :--- | :--- | :--- |
| pawn | charger | `physical_attack`; + `spell-venom-strike` at zone ≥ 1 |
| knight | flanker / bruiser | `physical_attack` only |
| bishop | caster | `starter-frost`; + `starter-poison` at zone ≥ 1 |
| rook | tank | `physical_attack`; + `spell-iron-skin` at zone ≥ 1 |
| queen | caster / self-heal | frost or `spell-inferno`; + `starter-heal` at zone ≥ 1 |
| king | controller / buffer | frost or `spell-inferno`; + `spell-rallying-cry` at zone ≥ 1 |

**Kit growth is not live.** `buildEnemyKit(pieceType, currentMap.levelZone)` receives a `{ name, minLevel, maxLevel }` object. `Math.floor(levelZone)` is `NaN`, so every kit stays on the zone-0 branch. Spell-pool evolution must be re-keyed to **enemy level vs player level** (or a numeric band derived after `pickEnemyLevelFromTiers`), never to that object.

### 1.2 Live `EnemyFamily` overlay (30% per enemy)

`EnemyFamily` in `types/gameTypes.ts`: `wraith_bishop`, `iron_golem`, `plague_rat`, `ember_knight`, `tide_shade`, `bone_scribe`, `void_mirror`, plus `default`.

Family roll does **not** change `pieceType`. A plague rat can sit on a queen chassis. Family then overwrites HP/damage by multiplier and writes `res` / `sp` as **0.05–0.75 constants**. Those constants are not the integer `getEnemyBaseStats` contract (`progression.ts`). Battle start then rebuilds HP with `calcEnemyMaxHp(level)` = `floor(50 * (1 + (level - 1) * growthRate))` and **drops the family HP multiplier**.

So today, most families differ by **stat paper**, then lose that paper when combat starts. That is the exact failure mode this brief forbids.

Implemented combat hooks (only three):

| Family | Live hook | Register text (not live) |
| :--- | :--- | :--- |
| `ember_knight` | Melee applies 3/turn burn for 3 | Trail of burning tiles |
| `tide_shade` | Melee applies −1 MP for 2 | Adjacent slow + per-turn regen |
| `void_mirror` | 25% of pre-crit damage reflected | Magic immunity until a physical hit |
| `wraith_bishop` | Stat mult only | Phase walls, MP drain, shadow teleport |
| `iron_golem` | Stat mult only | Poison/burn immune, stagger on AP dumps |
| `plague_rat` | Stat mult only | Poison stacks, pack overwhelm |
| `bone_scribe` | Stat mult only | Ranged Weaken, low HP glass |

`EnemyRegister.tsx` also lists **Crimson Spawn**, **Shadow Lurker**, **Storm Caller**. Those three are UI lore only — not in `EnemyFamily`, not in the 30% roll.

### 1.3 Other pack layers

| Layer | Live rule | Design impact |
| :--- | :--- | :--- |
| Ancient names | Admin pool, unique per map | Cosmetic. Not identity. |
| Leader | Highest `level` in the pack | Champion is **not** “the leader.” Leader can be any family. |
| Summoner overlay | `0.12 + 0.02 * playerLevel`, one wolf or archer spell | Role is a flag, not a family. Cap 2 summons, 2-turn cooldown. |
| AI tier | `computeAITier(enemyLevel)` with 30% roll of 1–10 | Soft bands exist (`≤10` → tier 1 … `>900` → tier 10). **30% noise already prevents a hard cap.** Variant floors should sit on top, not replace this. |
| Erratic / betrayal | `aiTier ≥ 5` after leader death; `aiTier ≥ 10` 5% betrayal | Keep. Do not add a “max betrayal level.” |
| Dungeon | Extra count + `dungeonTierBoost * tierSize` added to picked level | Variants may become more common in dungeons; dungeon is not a level cap. |

### 1.4 Encounter probability (do not replace)

`pickEnemyLevelFromTiers` (`combatMath.ts`):

- Default: same tier 60%, adjacent 20%, two-away 10%, three-or-more 5%, optional ±1 variance 15%.
- Player tier = `floor((playerLevel - 1) / tierSize)` with `tierSize` default 10.
- Higher player level **already** raises the chance of near / equal / above-player enemies because the same-tier bucket rides the player’s current band.
- There is a **utility clamp** at level 999 when converting tier → level (`maxTier = floor(999 / ts)`). That is a spawn-math safety rail, not a content cap. New designs must not treat 999 as “endgame.”

**Rule:** variant rarity is a **second roll after** level is chosen. Do not retune the tier percents in this proposal.

### 1.5 AI and inference traps

`decideEnemyAction` archetypes: `caster | healer | charger | flanker | berserker | generic`. `summoner` is a separate WX branch (`decideSummonerAction`).

`inferArchetype` is metadata-hostile today:

1. Any spell with `spellType === "heal"` or `healAmount > 0` → **healer** (this includes `starter-drain`, `vampire_bite`, `spell-lifesteal-nova`).
2. Else majority ranged + LoS → caster.
3. Else knight → flanker.
4. Else `family` contains `"berserk"` or `aiStrategy === "berserk"` → berserker.
5. Else melee-only → charger.

**Identity rule for this design:** every family declares an explicit `aiProfile`. Heal-on-hit drain kits must **not** be inferred as healers. This document does not implement that; implementers must add explicit metadata later. Until then, CORE pools for non-healers avoid `healAmount`.

Summon profiles already exist and can be **reused**, not cloned: hunter, guardian, archer (kiter), bomber (kamikaze), healer.

### 1.6 Rewards (single funnel)

Victory XP = `sum(defeated.level * 20)` via `computeVictoryExp` → `applyRewards`. Doka is `level * multiplier`. Variant reward is a **multiplier on that existing product**, never a parallel writer (`updateCharacter` is forbidden for rewards).

### 1.7 Role coverage after this analysis

| Requested archetype | Live owner | Gap |
| :--- | :--- | :--- |
| bruiser | knight chassis; Crimson Spawn lore | No family |
| sniper | none | Open |
| kiter | tide_shade (partial); archer summon | No dedicated hostile kiter |
| assassin | Shadow Lurker lore | Open |
| healer | queen self-heal; wisp summon | No ally-healer family |
| buffer | king + `spell-rallying-cry` (enemy-blocked) | Open |
| debuffer | bone_scribe (stats only) | Need real kit |
| summoner | random overlay | No family identity |
| controller | king chassis | Open family |
| tank | iron_golem / rook | Golem needs mechanics |
| protector | golem **summon** only | Open |
| artillery | Storm Caller lore | Open |
| kamikaze | bomber **summon** only | Open |
| teleporter | wraith lore; `spell-swap` unused in kits | Open |
| displacement | `void_collapse` / `spell-swap` unused | Open |
| hazard creator | ember_knight (melee burn only) | Trail / glyph missing |
| status specialist | plague_rat (stats only) | Need real DoT kit |
| anti-summon | none | Open |
| anti-ranged | void_mirror (reflect) | No gap-closer |
| anti-melee | none | Open |

---

## 2. Shared rules (uncapped)

### 2.1 Relative level behaviour (all families)

Let `R = enemy.level - player.level`. `T` = current `tierSize` (default 10).

| Band | Meaning | Behaviour |
| :--- | :--- | :--- |
| `R ≤ −T` | Well below | Same role, smaller budget. AI floor stays at BASE. Teaches the kit. |
| `−T < R < 0` | Near-below | Full CORE pool. Standard AI. |
| `R ≈ 0` | Peer | CORE + chance of one ADVANCED spell. |
| `0 < R < T` | Above | ADVANCED unlocked. VETERAN variant more common. |
| `R ≥ T` | Well above | RARE spell eligible. ELITE / CHAMPION weights rise. Still the same family. |

Dungeon depth adds to **picked level** already. It also adds a flat bonus to ELITE/CHAMPION weights (below). Depth is not a max level.

### 2.2 Stat scaling rule (all families)

Keep the live chassis formulas. Family and variant apply **ratios**, never a second absolute table.

```
hp     = calcEnemyMaxHp(level) * family.hp * variant.hp
sp/sr/init/res/chc = getEnemyBaseStats(level, chassis) * family.* * variant.*
ap/mp  = family action/move budget (small integers), +1 AP every 25 enemy levels (same cadence as player apMpGrowth)
```

Battle start **must keep** family HP. Today it does not. That is a prerequisite for any of these sheets, not a new HP curve.

Do **not** overwrite `res`/`sp` with 0.05–0.75. Those values are leftover fractions.

Variant stat ratios (mechanical, not level brackets):

| Variant | hp | threat (sp or atk) | res | init | extra |
| :--- | ---: | ---: | ---: | ---: | :--- |
| BASE | 1.00 | 1.00 | 1.00 | 1.00 | CORE kit |
| VETERAN | 1.10 | 1.08 | 1.05 | 1.05 | +1 ADVANCED spell |
| ELITE | 1.20 | 1.15 | 1.10 | 1.10 | + reactive passive |
| CHAMPION | 1.35 | 1.22 | 1.15 | 1.15 | + pack aura or terrain hook |

### 2.3 AI tier progression (variant floors)

Keep `computeAITier`. Variant sets a **minimum** so a high-relative Elite is never stuck at noisy tier 1.

| Variant | Min `aiTier` | Unlocks (existing gates) |
| :--- | ---: | :--- |
| BASE | 1 | Default decide\* |
| VETERAN | 3 | defensiveRetreat, chokepointCamp |
| ELITE | 6 | escapeRoute, LoS reposition, lethal lookahead |
| CHAMPION | 8 | bottleneckControl, overkill spill; betrayal-eligible if noise hits 10 |

`aiTier` may still rise with enemy level. There is no last tier.

### 2.4 Variant rarity (second roll, compatible with existing spawn)

After `pickEnemyLevelFromTiers` (and dungeon boost):

```
wVeteran  = 0.08 + 0.04 * clamp(R / T, 0, 3)
wElite    = 0.03 + 0.03 * clamp(R / T, 0, 3) + 0.02 * dungeonDepth
wChampion = 0.008 + 0.012 * clamp((R - T) / T, 0, 3) + 0.015 * max(0, dungeonDepth - 2)
```

Remainder is BASE. Higher player level increases `R ≥ 0` frequency **through the existing same/adjacent/above-tier buckets**, which then feeds these weights. Do not add a “max rarity at level N.”

Procedural / rare skins are a future fifth roll (palette + one borrowed RARE spell). Out of scope to specify generators here.

### 2.5 Spell-pool evolution and identity

- Assign by **family kit**, not only chassis. Chassis remains art + `getEnemyBaseStats` key.
- New spells must share the family’s `effectCategory` set (see each sheet). No random `usableByEnemy` grab-bag.
- Prefer live ids in CORE / ADVANCED. Ids marked `proposed:` are future metadata — not this PR.
- `usableByEnemy: false` today (`spell-rallying-cry`, `spell-mirror`, `spell-barrier`, `spell-timestep`, golem/bomber/wisp summons) stays false unless a sheet explicitly asks to flip **that one id**.
- Non-healers: no `healAmount` in CORE until `aiProfile` is explicit.

### 2.6 Reward expectation (all families)

| Variant | XP / Doka vs current `level * 20` / `level * dokaMult` |
| :--- | :--- |
| BASE | 1.00× |
| VETERAN | 1.15× |
| ELITE | 1.35× |
| CHAMPION | 1.60× |

Apply inside the existing recap → `applyRewards` path only.

### 2.7 Preferred chassis

Until dedicated sprites exist, each family pins a chassis so art and `getEnemyBaseStats` stay coherent. Family overlay should **re-roll or force** that chassis (today it does not).

---

## 3. Encounter synergy packs

Use these as spawn recipes, not level brackets. Weights rise with `R` the same way Elite does.

| Pack | Members | Why it is not “more HP” |
| :--- | :--- | :--- |
| Ash Court | ember_knight + cinder_martyr + glyph_sower | Fire DoT + detonate + tile denial |
| Quiet Choir | pale_cantor + hex_chorister + leash_warden | Heal + buff + body-block |
| Paper Plague | plague_rat ×2 + bone_scribe | Stack DoT then reduce damage |
| Broken Glass | glass_sniper + void_mirror + rust_reaver | Long shot + reflect + anti-kite |
| Rift Knot | rift_hook + blink_cutter + coil_arbiter | Pull / swap / action starve |
| Null Brood | brood_chanter + null_censor + iron_golem | Their summons vs your summons |
| Tide Mirror | tide_shade + storm_caller + leash_warden | Kite, bounce, peel |

Cap one CHAMPION per pack. Cap one dedicated summoner plus the existing overlay (do not stack two summon engines on one body).

---

## 4. Family sheets

All sheets: **STATUS: PROPOSED**.

---

### 4.1 Existing — evolve in place

#### ENEMY_ID: `wraith_bishop`

- **NAME:** Wraith Bishop
- **ROLE:** teleporter / caster
- **BASE_ELIGIBILITY:** Family overlay; preferred chassis `bishop`. Eligible at any player level.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: frost poke + one `spell-swap` if already in danger. Peer: swap to break LoS. Above: swap *into* backline (Wisp first — existing harassment bias).
- **STAT_SCALING_RULE:** hp 0.70, sp 1.25, sr 1.15, res 0.75, init 1.20, chc 1.10. Low body, high init — not a damage clone of bishop.
- **AI_TIER_PROGRESSION:** Profile `caster` + swap as reposition. VETERAN: LoS check before swap. ELITE: swap only if it creates a cast or escapes melee. CHAMPION: after swap, prefer `starter-frost` (MP tax) on the player.
- **CORE_SPELL_POOL:** `starter-frost`, `spell-swap`
- **ADVANCED_SPELL_POOL:** `starter-poison`, `spell-shadow-veil`
- **RARE_SPELL_POOL:** `spell-mark` then frost (mark is existing metadata)
- **ELITE_SPELL_POOL:** `proposed:spell-phase-step` (self-teleport 2 tiles, no swap); until then a second `spell-swap` with a 2-turn cooldown
- **SIGNATURE_MECHANICS:** Occupies floor only (no wall-walk until a real occupancy hook exists). Swap is the identity. Do not add MP-drain-on-hit — that belongs to drain families.
- **VARIANT_PROGRESSION:** BASE swap+frost → VETERAN poison → ELITE veil after swap → CHAMPION marks a tile then swaps off it
- **RARITY_CURVE:** Standard §2.4. Slightly higher VETERAN when `R > 0` (ghostly peers).
- **SYNERGIES:** `rift_hook` (pull then swap), `void_mirror` (you cannot chase both), `coil_arbiter` (AP starve after swap)
- **WEAKNESSES:** `spell-slow` / frost MP tax; melee once swap is on cooldown; Null Field (no swap value)
- **PLAYER_COUNTERPLAY:** Stand on the tile they want; hold Swap yourself; dump AP after they spend theirs
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-swap`, `starter-frost`, `spell-shadow-veil`
- **REWARD_EXPECTATION:** Standard §2.6
- **IMPLEMENTATION_COMPLEXITY:** LOW (kit + existing swap). Wall-phase remains out of scope.
- **STATUS:** PROPOSED

#### ENEMY_ID: `iron_golem`

- **NAME:** Iron Golem
- **ROLE:** tank
- **BASE_ELIGIBILITY:** Overlay; preferred chassis `rook`.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: walks up and Strikes. Peer: Iron Skin before entering melee. Above: camps a chokepoint (gate 3) and only steps in to body-block a protector ally.
- **STAT_SCALING_RULE:** hp 1.45, sp 0.75, sr 1.20, res 1.40, init 0.70, chc 0.70. MP budget 2. Identity is **inertia**, not HP-only.
- **AI_TIER_PROGRESSION:** Profile `charger` with retreat disabled above 50% HP. VETERAN: Iron Skin first. ELITE: ignore lava/spikes (hazard creator bait). CHAMPION: taunt-equivalent — `spell-enrage` on self when an ally is below 50% so it stays the focus.
- **CORE_SPELL_POOL:** `physical_attack`, `spell-iron-skin`
- **ADVANCED_SPELL_POOL:** `starter-shield` (self/ally), `spell-enrage` (self)
- **RARE_SPELL_POOL:** `spell-frost-nova` (peel, not nuke)
- **ELITE_SPELL_POOL:** `proposed:spell-load-bearing` (while this golem lives, adjacent allies take 20% less — protector-lite; CHAMPION only)
- **SIGNATURE_MECHANICS:** Immune to poison/venom/burn **application** (status specialist / ember / rat counter). Not immune to physical. Stagger: if it spends ≥4 AP in a turn, next turn MP is 1 (already slow).
- **VARIANT_PROGRESSION:** BASE wall → VETERAN skin-up → ELITE hazard-walker → CHAMPION adjacent damage share
- **RARITY_CURVE:** Standard. ELITE weight +0.02 in fortress map archetypes (composition, not level).
- **SYNERGIES:** `pale_cantor`, `leash_warden`, `brood_chanter` (body for summons), `null_censor`
- **WEAKNESSES:** Expose (`res_sp` down), Cursed Wound, kiting, Time Warp (short turns)
- **PLAYER_COUNTERPLAY:** DoT that is **not** poison/burn (cursed wound), RES shred, never stand in its 1-range
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-iron-skin`, `starter-shield`, `spell-enrage`
- **REWARD_EXPECTATION:** Standard. No extra Doka for “tankiness.”
- **IMPLEMENTATION_COMPLEXITY:** MED (DoT immunity flag + keep family HP)
- **STATUS:** PROPOSED

#### ENEMY_ID: `plague_rat`

- **NAME:** Plague Rat
- **ROLE:** status specialist
- **BASE_ELIGIBILITY:** Overlay; preferred chassis `pawn`. Prefer **pairs** when one rat already exists on the map (pack identity).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: apply venom and leave. Peer: two rats focus the same target (existing utility score). Above: apply then `spell-expose` so DoT bites harder.
- **STAT_SCALING_RULE:** hp 0.55, sp 0.80, sr 0.70, res 0.70, init 1.35, chc 1.05. MP 4. Damage is the **DoT**, not Strike.
- **AI_TIER_PROGRESSION:** Profile `flanker` (even on pawn). Never infer healer. VETERAN: refuse to melee a target that already has this rat’s venom. ELITE: chase Wisp. CHAMPION: on death, leave a 1-tile poison puddle for 2 turns (`proposed:`, else skip).
- **CORE_SPELL_POOL:** `spell-venom-strike`, `starter-poison`
- **ADVANCED_SPELL_POOL:** `spell-expose`, `spell-slow`
- **RARE_SPELL_POOL:** `soul_rend` (backend DoT)
- **ELITE_SPELL_POOL:** death-puddle (CHAMPION)
- **SIGNATURE_MECHANICS:** DoTs **stack** via existing `stackId` / `appendDotStack`. Two rats are the weapon. No HP inflation.
- **VARIANT_PROGRESSION:** BASE applicator → VETERAN no-waste DoT → ELITE shred → CHAMPION corpse hazard
- **RARITY_CURVE:** Standard. If map modifier `plague_zone` is active, VETERAN weight +0.10.
- **SYNERGIES:** `bone_scribe` (Weaken), `ember_knight` (burn + venom), `glyph_sower`
- **WEAKNESSES:** Single-target burst, Iron Golem immunity (mirror fight), Mending Mist
- **PLAYER_COUNTERPLAY:** Kill one rat immediately; Shield / Iron Skin; do not stack with the player’s own poison
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-venom-strike`, `starter-poison`, `spell-expose`
- **REWARD_EXPECTATION:** Standard. Pack of two BASE rats ≈ one VETERAN, not double Doka cheese — recap still sums `level * 20` (unchanged).
- **IMPLEMENTATION_COMPLEXITY:** LOW–MED (kit + stack DoT already exists)
- **STATUS:** PROPOSED

#### ENEMY_ID: `ember_knight`

- **NAME:** Ember Knight
- **ROLE:** bruiser / hazard creator
- **BASE_ELIGIBILITY:** Overlay; preferred chassis `knight`.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: melee + existing burn hook. Peer: Inferno at 3 range then walk in. Above: walks a **path** that matters (see signature).
- **STAT_SCALING_RULE:** hp 1.10, sp 1.00, sr 0.85, res 1.10, init 1.10, chc 0.90.
- **AI_TIER_PROGRESSION:** Profile `flanker` (knight) but **never** retreats through its own fire if a proposed trail exists; otherwise `charger`. VETERAN: Inferno first. ELITE: Enrage then melee. CHAMPION: trail + Blood Moon synergy (lifesteal on burn ticks if that modifier is up).
- **CORE_SPELL_POOL:** `physical_attack`, `spell-inferno`
- **ADVANCED_SPELL_POOL:** `spell-enrage`, `starter-blast`
- **RARE_SPELL_POOL:** `thunder_clap`
- **ELITE_SPELL_POOL:** `proposed:spell-ember-wake` (tiles it **leaves** become 3-dmg fire for 2 turns — this is the register promise)
- **SIGNATURE_MECHANICS:** Keep live melee burn. Identity upgrade is **terrain**, not more burn damage. Do not also become the kamikaze.
- **VARIANT_PROGRESSION:** BASE ignite-on-hit → VETERAN Inferno → ELITE Enrage → CHAMPION wake
- **RARITY_CURVE:** Standard. +ELITE on `blood_moon` / lava-heavy maps.
- **SYNERGIES:** `cinder_martyr`, `glyph_sower`, `hex_chorister` (Enrage from ally)
- **WEAKNESSES:** `starter-frost`, Frozen Terrain, Tide Shade’s slow (mirror)
- **PLAYER_COUNTERPLAY:** Do not stand in last-walk tiles; frost the MP; fight from 4+ if they lack blast
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-inferno`, `spell-enrage`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (trail is new tile state; melee burn already exists)
- **STATUS:** PROPOSED

#### ENEMY_ID: `tide_shade`

- **NAME:** Tide Shade
- **ROLE:** kiter
- **BASE_ELIGIBILITY:** Overlay; preferred chassis `bishop` or `queen`.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: frost + stay at range 3–4 (reuse archer summon spacing). Peer: Slow then frost. Above: Frost Nova if the player steps adjacent, then flee.
- **STAT_SCALING_RULE:** hp 0.85, sp 1.10, sr 1.15, res 0.90, init 1.15, chc 1.00. MP 5. The extra MP **is** the mechanic.
- **AI_TIER_PROGRESSION:** Needs a real `kiter` profile (copy summon `archer`: keep 3+ Chebyshev). Until then, `caster` + retreat under 50% HP (tighter than 30%). VETERAN: Slow first. ELITE: never melee. CHAMPION: after applying Slow, prefer tiles that are **water-adjacent hazards** (ice / slime_flood).
- **CORE_SPELL_POOL:** `starter-frost`, `spell-slow`
- **ADVANCED_SPELL_POOL:** `spell-frost-nova`, `spell-haste` (self)
- **RARE_SPELL_POOL:** `spell-weaken`
- **ELITE_SPELL_POOL:** Keep live melee −1 MP as a **punish for catching it**, not a primary attack
- **SIGNATURE_MECHANICS:** Range discipline + MP tax. Register regen is **not** copied (that is Pale Cantor). Adjacent slow aura is CHAMPION-only if implemented; otherwise Slow spell is enough.
- **VARIANT_PROGRESSION:** BASE frost-kite → VETERAN Slow → ELITE Nova peel → CHAMPION modifier surf
- **RARITY_CURVE:** Standard. +VETERAN on `slime_flood` / `frozen_terrain`.
- **SYNERGIES:** `storm_caller` (player clumps), `leash_warden` (peels chasers), `glass_sniper`
- **WEAKNESSES:** `spell-swap` onto it, Paper Windstorm (range cut), gap-closers (`rust_reaver`)
- **PLAYER_COUNTERPLAY:** Swap, Haste, walk through LoS blockers, Attack Nearest only when already in 2
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-slow`, `starter-frost`, `spell-frost-nova`, `spell-haste`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (kiter profile reuse from summon AI)
- **STATUS:** PROPOSED

#### ENEMY_ID: `bone_scribe`

- **NAME:** Bone Scribe
- **ROLE:** debuffer
- **BASE_ELIGIBILITY:** Overlay; preferred chassis `bishop`.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: one Weaken and hide. Peer: Weaken → Expose → Cursed Wound. Above: Drain Courage (AP tax) then the same chain.
- **STAT_SCALING_RULE:** hp 0.65, sp 1.05, sr 1.20, res 0.80, init 1.00, chc 0.85. If it is killing you with raw damage, the kit is wrong.
- **AI_TIER_PROGRESSION:** Profile `caster`. Priority: target **without** the scribe’s debuff. VETERAN: never recast the same debuff id on a still-active target. ELITE: Cursed Wound on a player who just self-healed. CHAMPION: `spell-mark` the tank ally’s tile so the player’s AoE is punished — actually mark the **player**.
- **CORE_SPELL_POOL:** `spell-weaken`, `spell-expose`
- **ADVANCED_SPELL_POOL:** `spell-cursed-wound`, `spell-drain-courage`
- **RARE_SPELL_POOL:** `spell-shadow-veil`, `spell-mark`
- **ELITE_SPELL_POOL:** CHAMPION may use `spell-rallying-cry` **only if** `usableByEnemy` is flipped for this family — otherwise skip (do not steal buffer identity)
- **SIGNATURE_MECHANICS:** Debuff uptime. Glass body. Focus-fire magnet (existing wLowHp).
- **VARIANT_PROGRESSION:** BASE shred → VETERAN anti-heal → ELITE AP tax → CHAMPION mark
- **RARITY_CURVE:** Standard
- **SYNERGIES:** `plague_rat`, `glass_sniper`, `hex_chorister` (buff their side while scribe strips yours)
- **WEAKNESSES:** Any gap-close; Null Field; killing it in one turn
- **PLAYER_COUNTERPLAY:** Priority target; Timestep after AP tax; do not heal into Cursed Wound
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-weaken`, `spell-expose`, `spell-cursed-wound`, `spell-drain-courage`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW (all ids live, `usableByEnemy: true`)
- **STATUS:** PROPOSED

#### ENEMY_ID: `void_mirror`

- **NAME:** Void Mirror
- **ROLE:** anti-ranged (reflect)
- **BASE_ELIGIBILITY:** Overlay; preferred chassis `queen` or `king`.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: 25% reflect (live) + Strike if you walk in. Peer: Mirror-like behaviour via existing reflect only. Above: `spell-mark` itself? No — mark the player so reflected math still hurts. Prefer standing in `mirror_field` if present.
- **STAT_SCALING_RULE:** hp 1.00, sp 0.90, sr 1.35, res 1.00, init 0.95, chc 0.90.
- **AI_TIER_PROGRESSION:** Profile `generic` / holder. VETERAN: does not chase. ELITE: steps to keep the player in a 3–4 range **reflect corridor**. CHAMPION: first **physical** hit each battle disables reflect for 1 turn (the register “open with melee” becomes a real window, not immunity).
- **CORE_SPELL_POOL:** `physical_attack`, `spell-shadow-veil`
- **ADVANCED_SPELL_POOL:** `spell-mark`, `starter-shield`
- **RARE_SPELL_POOL:** `reflect_barrier` (backend)
- **ELITE_SPELL_POOL:** CHAMPION reflect 35% instead of 25%, still not immunity
- **SIGNATURE_MECHANICS:** Keep live 25% pre-crit reflect. Do **not** implement full magic immunity. Identity is “spells hurt you too.”
- **VARIANT_PROGRESSION:** BASE reflect → VETERAN camp → ELITE corridor → CHAMPION physical-break window
- **RARITY_CURVE:** Standard. +ELITE if `mirror_field` is on.
- **SYNERGIES:** `glass_sniper` (you want to hide behind it), `rust_reaver` (closes for the team)
- **WEAKNESSES:** Physical Strike, Sacrifice (you choose the reflect), low-damage pokes
- **PLAYER_COUNTERPLAY:** Open physical; do not Inferno it; pull it into melee with Swap
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-shadow-veil`, `spell-mark`, `reflect_barrier`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW–MED (tune existing reflect; optional physical-break flag)
- **STATUS:** PROPOSED

---

### 4.2 Register promotions (lore → family)

#### ENEMY_ID: `crimson_spawn`

- **NAME:** Crimson Spawn
- **ROLE:** bruiser
- **BASE_ELIGIBILITY:** New family overlay; preferred chassis `pawn` or `knight`. Register already taught the name.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Strike. Peer: Enrage then Strike. Above: Sacrifice if HP > 40%, else Enrage. At `hp/max < 0.3`, `aiStrategy = berserk` (existing infer).
- **STAT_SCALING_RULE:** hp 1.15, sp 0.70, sr 0.80, res 1.05, init 1.10, chc 1.15. Threat is **physical + Enrage**, not drain (drain would trip healer inference).
- **AI_TIER_PROGRESSION:** Profile `berserker` via `aiStrategy`. VETERAN: Enrage before first Strike. ELITE: Sacrifice line. CHAMPION: `vampire_bite` **only after** explicit `aiProfile` exists; until then no `healAmount`.
- **CORE_SPELL_POOL:** `physical_attack`, `spell-enrage`
- **ADVANCED_SPELL_POOL:** `spell-sacrifice`, `spell-expose`
- **RARE_SPELL_POOL:** `vampire_bite` (gated on aiProfile)
- **ELITE_SPELL_POOL:** `spell-lifesteal-nova` (gated; CHAMPION, clustered player+summons)
- **SIGNATURE_MECHANICS:** Low-HP berserk (already in infer). Burst windows, not regen races. Register “30% lifesteal” waits on metadata.
- **VARIANT_PROGRESSION:** BASE thug → VETERAN Enrage → ELITE Sacrifice → CHAMPION drain (profiled)
- **RARITY_CURVE:** Standard. +VETERAN on `vampiric_ground` / `blood_moon`.
- **SYNERGIES:** `hex_chorister` (more Enrage), `pale_cantor` (keeps it in the berserk band — dangerous)
- **WEAKNESSES:** Weaken, kiting, Cursed Wound once drain is live
- **PLAYER_COUNTERPLAY:** Burst through the Enrage; Slow; do not leave it at 25% “to finish later”
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-enrage`, `spell-sacrifice`, later `vampire_bite`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW now; MED when drain is allowed
- **STATUS:** PROPOSED

#### ENEMY_ID: `shadow_lurker`

- **NAME:** Shadow Lurker
- **ROLE:** assassin
- **BASE_ELIGIBILITY:** New family; preferred chassis `knight`.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: flank Strike. Peer: Veil then Strike from a side tile (existing flanker pathing). Above: Mark → Veil → Strike. Back-attack 1.5× **only** if a facing check already exists; otherwise keep flanker pathing as the whole identity (do not fake a new damage formula).
- **STAT_SCALING_RULE:** hp 0.75, sp 1.00, sr 0.85, res 0.80, init 1.40, chc 1.30. Evasion is flavor until the persist stat is wired in combat; do not invent a new stat.
- **AI_TIER_PROGRESSION:** Profile `flanker`. VETERAN: Veil first. ELITE: only attacks if it has a side/rear tile this turn (skip rather than frontal). CHAMPION: `shadow_strike` (backend, no-LoS diagonal).
- **CORE_SPELL_POOL:** `physical_attack`, `spell-shadow-veil`
- **ADVANCED_SPELL_POOL:** `spell-mark`, `spell-swap` (leave after the hit)
- **RARE_SPELL_POOL:** `shadow_strike`
- **ELITE_SPELL_POOL:** CHAMPION may skip a turn in Fog of War to re-flank
- **SIGNATURE_MECHANICS:** Positioning and CHC, not HP. Frontal fights should feel **wrong**.
- **VARIANT_PROGRESSION:** BASE flank → VETERAN veil → ELITE refuse frontals → CHAMPION no-LoS strike
- **RARITY_CURVE:** Standard. +ELITE on `fog_of_war`.
- **SYNERGIES:** `hex_chorister` (Haste), `blink_cutter` (opens a back tile)
- **WEAKNESSES:** Forced facing (you step to meet it), Frost Nova, guardian summons
- **PLAYER_COUNTERPLAY:** Keep a wall at your back; golem body-block; Shield before its init
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-shadow-veil`, `spell-mark`, `shadow_strike`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW–MED (flanker exists; no-LoS strike is data)
- **STATUS:** PROPOSED

#### ENEMY_ID: `storm_caller`

- **NAME:** Storm Caller
- **ROLE:** artillery
- **BASE_ELIGIBILITY:** New family; preferred chassis `queen`.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Chain Lightning if ≥2 player-side bodies (player + summon). Peer: Thunder Clap if you clump. Above: Inferno on the marked tile.
- **STAT_SCALING_RULE:** hp 0.80, sp 1.30, sr 0.90, res 0.75, init 1.00, chc 1.15.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: prefer `hitsMultiple` spells when two targets are in bounce range. ELITE: Mark then blast. CHAMPION: `starter-blast` into a pack that includes the Wisp (existing threat table).
- **CORE_SPELL_POOL:** `starter-blast`, `starter-frost`
- **ADVANCED_SPELL_POOL:** `thunder_clap`, `spell-mark`
- **RARE_SPELL_POOL:** `spell-inferno`
- **ELITE_SPELL_POOL:** `void_collapse` only at CHAMPION and only if ≥2 targets (attract_multi is extreme — treat as rare set-piece, still no level cap)
- **SIGNATURE_MECHANICS:** Bounce and clump punishment. Register “storm clouds” are map-modifier flavour (`arcane_surge`), not a new entity.
- **VARIANT_PROGRESSION:** BASE chain → VETERAN clap → ELITE mark-nuke → CHAMPION collapse
- **RARITY_CURVE:** Standard. +ELITE on `arcane_surge` / `arcane_overflow`.
- **SYNERGIES:** `tide_shade` (holds you), `rift_hook` (stacks bodies), `glyph_sower`
- **WEAKNESSES:** Spread (already the register tip), Paper Windstorm, SR
- **PLAYER_COUNTERPLAY:** Desummon, stand 3+ apart, LoS break
- **SPELL_DISCOVERY_OPPORTUNITIES:** `starter-blast`, `thunder_clap`, `spell-mark`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW (all live). Collapse is HIGH-care, optional.
- **STATUS:** PROPOSED

---

### 4.3 New families (fill remaining roles)

#### ENEMY_ID: `glass_sniper`

- **NAME:** Glass Sniper
- **ROLE:** sniper
- **BASE_ELIGIBILITY:** New family; preferred chassis `bishop`. Not eligible as the **only** enemy in a 1-pack (needs a frontliner). If pack size is 1, reroll family.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Frost at 4. Peer: Mark at 4 then Frost. Above: refuses any destination that is within 2 of the player (true min-range).
- **STAT_SCALING_RULE:** hp 0.60, sp 1.35, sr 0.80, res 0.65, init 1.05, chc 1.25.
- **AI_TIER_PROGRESSION:** Profile `caster` with **minRange 3** on its damage spells (metadata, not name). VETERAN: Mark first. ELITE: if player enters 2, `spell-haste` away, never Nova. CHAMPION: shoots the Wisp through the same rules.
- **CORE_SPELL_POOL:** `starter-frost` (treat maxRange 4 as the gun), `spell-mark`
- **ADVANCED_SPELL_POOL:** `starter-poison`, `spell-expose`
- **RARE_SPELL_POOL:** `proposed:spell-glass-shot` (damage, minRange 3, maxRange 6, LoS)
- **ELITE_SPELL_POOL:** CHAMPION glass-shot + Mark
- **SIGNATURE_MECHANICS:** Minimum range. Dying if caught is correct. Not a bishop with more damage.
- **VARIANT_PROGRESSION:** BASE long frost → VETERAN mark → ELITE flee-melee → CHAMPION true min-range
- **RARITY_CURVE:** Standard. Never CHAMPION in a solo pack.
- **SYNERGIES:** `iron_golem`, `leash_warden`, `void_mirror`
- **WEAKNESSES:** Any close spell (`spell-swap`, Sacrifice, melee)
- **PLAYER_COUNTERPLAY:** Close the gap; barriers; fog
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-mark`, later glass-shot
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (minRange already exists on backend spells; frontend kits must set it)
- **STATUS:** PROPOSED

#### ENEMY_ID: `cinder_martyr`

- **NAME:** Cinder Martyr
- **ROLE:** kamikaze
- **BASE_ELIGIBILITY:** New family; preferred chassis `pawn`. At most one per pack.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: walks in, Inferno, dies if HP < 30% (existing `AI_KAMIKAZE_LOW_HP_PCT`). Peer: waits for 2 bodies in radius 2 (`AI_KAMIKAZE_MIN_TARGETS`). Above: Haste then walk.
- **STAT_SCALING_RULE:** hp 0.70, sp 1.10, sr 0.70, res 0.70, init 1.20, chc 0.80.
- **AI_TIER_PROGRESSION:** Reuse summon `bomber` profile (`decideSummonAction` bomber), **do not** invent a second detonator. VETERAN: respects min-targets. ELITE: detonates on Wisp+player. CHAMPION: death also applies ember-knight-style burn to adjacent (no extra HP).
- **CORE_SPELL_POOL:** `spell-inferno`, `physical_attack`
- **ADVANCED_SPELL_POOL:** `spell-haste`, `spell-sacrifice` (self-hurt into the blast math — only if Sacrifice target can be self; otherwise skip)
- **RARE_SPELL_POOL:** `thunder_clap`
- **ELITE_SPELL_POOL:** `proposed:spell-martyr-fuse` (cast = bomber detonate + remove self)
- **SIGNATURE_MECHANICS:** Existing kamikaze constants. Identity is **when** it pops, not how much HP it has.
- **VARIANT_PROGRESSION:** BASE fuse → VETERAN patience → ELITE hunt backline → CHAMPION corpse burn
- **RARITY_CURVE:** Standard. Weight 0 if pack already has a martyr.
- **SYNERGIES:** `ember_knight`, `rift_hook` (stacks you), `storm_caller`
- **WEAKNESSES:** Slow, knockback/swap away, killing it at 4 range
- **PLAYER_COUNTERPLAY:** Spread; Slow; Swap it into its own allies (betrayal-adjacent, allowed)
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-inferno`, `spell-haste`
- **REWARD_EXPECTATION:** Standard. No bonus for suicide (prevents farm)
- **IMPLEMENTATION_COMPLEXITY:** MED (wire bomber profile onto a family flag)
- **STATUS:** PROPOSED

#### ENEMY_ID: `pale_cantor`

- **NAME:** Pale Cantor
- **ROLE:** healer
- **BASE_ELIGIBILITY:** New family; preferred chassis `queen`. At most one per pack. Do not also roll the random summoner overlay onto this body.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: self `starter-heal` (this **should** infer healer). Peer: Shield the lowest-HP ally (existing healer ally pick). Above: Shield the Champion / golem first (`wThreat` on allies).
- **STAT_SCALING_RULE:** hp 0.80, sp 1.10 (heal scales with SP), sr 1.00, res 0.85, init 0.90, chc 0.70.
- **AI_TIER_PROGRESSION:** Profile `healer` (live). VETERAN: heal ally at 50% (`ENEMY_HEAL_ALLY_THRESHOLD_PCT`). ELITE: backline guard (`AI_BACKLINE_PROTECT`). CHAMPION: `proposed:spell-blood-benediction` (ally-target heal 16, range 3). Until that id exists, Shield is the ally tool — `starter-heal` is self-only.
- **CORE_SPELL_POOL:** `starter-heal`, `starter-shield`
- **ADVANCED_SPELL_POOL:** `spell-iron-skin` (ally), `spell-haste` (ally)
- **RARE_SPELL_POOL:** `proposed:spell-blood-benediction`
- **ELITE_SPELL_POOL:** Flip `spell-rallying-cry` `usableByEnemy` **for this family only** (CHAMPION)
- **SIGNATURE_MECHANICS:** Ally support. Not a queen Inferno bot. Kill priority is already high in `ENEMY_THREAT_VALUES.healer`.
- **VARIANT_PROGRESSION:** BASE self-mend → VETERAN shields → ELITE interpose → CHAMPION ally mend
- **RARITY_CURVE:** Standard. +VETERAN when pack has a tank/protector.
- **SYNERGIES:** `iron_golem`, `leash_warden`, `hex_chorister`, `crimson_spawn`
- **WEAKNESSES:** Cursed Wound, focus fire, anti-heal
- **PLAYER_COUNTERPLAY:** Kill the Cantor first (same as Wisp harassment, mirrored)
- **SPELL_DISCOVERY_OPPORTUNITIES:** `starter-heal`, `starter-shield`, later rally / benediction
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW on live healer AI; MED for ally-heal spell
- **STATUS:** PROPOSED

#### ENEMY_ID: `hex_chorister`

- **NAME:** Hex Chorister
- **ROLE:** buffer
- **BASE_ELIGIBILITY:** New family; preferred chassis `king`. At most one per pack.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Enrage the highest-damage ally. Peer: Haste the kiter/assassin. Above: Iron Skin the tank, then Enrage the bruiser (two-turn plan at ELITE).
- **STAT_SCALING_RULE:** hp 0.75, sp 0.90, sr 1.00, res 0.85, init 1.10, chc 0.80. If this unit is topping damage meters, the kit leaked.
- **AI_TIER_PROGRESSION:** Needs a `buffer` profile (ally-first, like healer without heal). Until then, do **not** put `starter-heal` on this kit. VETERAN: skip if the buff is already up. ELITE: Haste lurkers / martyrs. CHAMPION: Rally if flipped, else second Enrage.
- **CORE_SPELL_POOL:** `spell-enrage`, `spell-haste`
- **ADVANCED_SPELL_POOL:** `spell-iron-skin`, `starter-shield`
- **RARE_SPELL_POOL:** `spell-rallying-cry` (family flip)
- **ELITE_SPELL_POOL:** CHAMPION aura: allies within 2 get +10% CHC (passive, no new persist field — battle effect only)
- **SIGNATURE_MECHANICS:** Other people’s turns get worse for the player. Coherent buffs only (`buff` category).
- **VARIANT_PROGRESSION:** BASE Enrage → VETERAN Haste → ELITE Skin → CHAMPION aura
- **RARITY_CURVE:** Standard. Reroll if no ally exists.
- **SYNERGIES:** Almost every pack; best with `crimson_spawn`, `shadow_lurker`, `ember_knight`
- **WEAKNESSES:** Isolated (1v1 it is a weak caster), Null Field
- **PLAYER_COUNTERPLAY:** Kill or Slow it before the Enrage lands; pull it with Swap
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-enrage`, `spell-haste`, `spell-iron-skin`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (new ally-first profile, or a narrow healer fork)
- **STATUS:** PROPOSED

#### ENEMY_ID: `leash_warden`

- **NAME:** Leash Warden
- **ROLE:** protector / anti-melee
- **BASE_ELIGIBILITY:** New family; preferred chassis `rook`. Reroll if no ally to guard.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: stand adjacent to the ally with highest `wThreat`. Peer: Shield that ally. Above: Swap **with the player** if the player is adjacent to the ward (displacement used as peel).
- **STAT_SCALING_RULE:** hp 1.20, sp 0.70, sr 1.10, res 1.25, init 0.95, chc 0.70.
- **AI_TIER_PROGRESSION:** Reuse summon `guardian` (backline distance 1). VETERAN: Shield. ELITE: Swap peel. CHAMPION: if the player is melee-range on the ward, Warden steps **into** that tile if free (interpose already exists).
- **CORE_SPELL_POOL:** `starter-shield`, `physical_attack`
- **ADVANCED_SPELL_POOL:** `spell-iron-skin`, `spell-swap`
- **RARE_SPELL_POOL:** `spell-weaken` (on the player only when they are melee on the ward)
- **ELITE_SPELL_POOL:** `proposed:spell-ward-interpose` (forced swap with ally)
- **SIGNATURE_MECHANICS:** You cannot melee the backline for free. Anti-melee is **peel**, not thorns (thorns are Ember/Glyph).
- **VARIANT_PROGRESSION:** BASE body-block → VETERAN Shield → ELITE Swap peel → CHAMPION forced interpose
- **RARITY_CURVE:** Standard. +ELITE in Quiet Choir packs.
- **SYNERGIES:** `pale_cantor`, `glass_sniper`, `bone_scribe`, `brood_chanter`
- **WEAKNESSES:** Ranged / artillery, two melee threats, Gravity Well
- **PLAYER_COUNTERPLAY:** Kill the Warden first or snipe with LoS around it; DoT the ward
- **SPELL_DISCOVERY_OPPORTUNITIES:** `starter-shield`, `spell-swap`, `spell-iron-skin`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (guardian profile on family)
- **STATUS:** PROPOSED

#### ENEMY_ID: `null_censor`

- **NAME:** Null Censor
- **ROLE:** anti-summon
- **BASE_ELIGIBILITY:** New family; preferred chassis `bishop`. Weight ×2 if the player has a summon spell equipped; still valid if they do not (hunts the empty board as a debuffer).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Weaken the player. Peer: Expose then focus any `isSummon` (existing threat 0.6, raise to Wisp-level **for this family only**). Above: Cursed Wound on the summon, not the player.
- **STAT_SCALING_RULE:** hp 0.85, sp 1.00, sr 1.10, res 0.90, init 1.15, chc 0.90.
- **AI_TIER_PROGRESSION:** Profile `caster` with summon-first targeting (already half-done via Wisp hunt). VETERAN: never waste Inferno on a 1-turn-left summon. ELITE: `proposed:spell-sever-tether` (if a summon dies this turn, owner loses 1 AP next turn). CHAMPION: `proposed:spell-null-brand` (target cannot spawn a summon for 2 turns).
- **CORE_SPELL_POOL:** `spell-weaken`, `spell-expose`
- **ADVANCED_SPELL_POOL:** `spell-cursed-wound`, `starter-frost`
- **RARE_SPELL_POOL:** `spell-drain-courage`
- **ELITE_SPELL_POOL:** sever-tether / null-brand (proposed)
- **SIGNATURE_MECHANICS:** Summons are the fight. Respect `ENEMY_SUMMON_CAP` on **their** side — this family should **not** be a summoner.
- **VARIANT_PROGRESSION:** BASE hunt → VETERAN efficient focus → ELITE punish death → CHAMPION lockout
- **RARITY_CURVE:** Standard, with the equipped-summon weight bump (player build, not level).
- **SYNERGIES:** `iron_golem` (ignores the leftover player), `void_mirror`
- **WEAKNESSES:** Players who do not summon; burst the Censor
- **PLAYER_COUNTERPLAY:** Desummon / wait lifespan; fight without pets; kill Censor first
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-weaken`, `spell-cursed-wound`, later null-brand
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (targeting); HIGH for lockout spell
- **STATUS:** PROPOSED

#### ENEMY_ID: `rift_hook`

- **NAME:** Rift Hook
- **ROLE:** displacement specialist
- **BASE_ELIGIBILITY:** New family; preferred chassis `knight`.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Swap if the player is on a safe tile and an ally wants the hole. Peer: Swap the player onto lava/spikes/void if those tiles exist (hazard hook). Above: `void_collapse` only as CHAMPION with ≥2 targets.
- **STAT_SCALING_RULE:** hp 0.90, sp 0.95, sr 0.90, res 0.90, init 1.25, chc 0.85.
- **AI_TIER_PROGRESSION:** Profile `generic` with **cast-Swap-first**. VETERAN: only swap if destination is worse for the player (hazard, or adjacent to martyr). ELITE: swap an ally **out** of danger (protector-lite). CHAMPION: collapse.
- **CORE_SPELL_POOL:** `spell-swap`, `physical_attack`
- **ADVANCED_SPELL_POOL:** `spell-slow` (after a pull-in), `starter-frost`
- **RARE_SPELL_POOL:** `void_collapse`
- **ELITE_SPELL_POOL:** `proposed:spell-hook-line` (attract 2 along a line — metadata `attract`)
- **SIGNATURE_MECHANICS:** The board moves. Damage is incidental. Must read `hazardTiles` (AI already avoids hazards when low HP — invert that for the **player’s** landing tile).
- **VARIANT_PROGRESSION:** BASE swap → VETERAN hazard toss → ELITE ally rescue → CHAMPION collapse
- **RARITY_CURVE:** Standard. +ELITE if the map has lava/spikes/void.
- **SYNERGIES:** `cinder_martyr`, `glyph_sower`, `ember_knight`, `coil_arbiter`
- **WEAKNESSES:** Empty safe maps, Timestep, standing on the tile they want
- **PLAYER_COUNTERPLAY:** Occupy hazards first; swap them back; do not clump
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-swap`, `void_collapse`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED–HIGH (swap-value scoring)
- **STATUS:** PROPOSED

#### ENEMY_ID: `brood_chanter`

- **NAME:** Brood Chanter
- **ROLE:** summoner
- **BASE_ELIGIBILITY:** New family; preferred chassis `king`. Replaces the **random overlay** on this body (`isSummoner = true` always). Other enemies in the pack still use the 12% overlay as today.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: wolf. Peer: wolf or archer 50/50 (live). Above: prefer archer (kiter synergy). Never exceed `ENEMY_SUMMON_CAP` (2) or break `ENEMY_SUMMON_COOLDOWN_TURNS` (2).
- **STAT_SCALING_RULE:** hp 0.90, sp 1.00, sr 1.00, res 0.90, init 0.85, chc 0.80. The summons scale with **spell level / enemy level** via existing `getSummonBaseStats`.
- **AI_TIER_PROGRESSION:** Live `decideSummonerAction`. VETERAN: skip summon if cap reached (already). ELITE: Haste the living summon. CHAMPION: Enrage the living summon.
- **CORE_SPELL_POOL:** `summon-dire-wolf` **or** `summon-archer` (one at BASE)
- **ADVANCED_SPELL_POOL:** the other summon id; `spell-haste`
- **RARE_SPELL_POOL:** `spell-enrage` (on the pet)
- **ELITE_SPELL_POOL:** Do **not** unlock player-only golem/bomber/wisp unless those flags are flipped later. Broodmother-style larvae stay a **boss** mechanic.
- **SIGNATURE_MECHANICS:** The existing enemy-summon pipeline. Family makes it readable instead of a silent 12% flag.
- **VARIANT_PROGRESSION:** BASE one pet → VETERAN both pet ids → ELITE Haste pet → CHAMPION Enrage pet
- **RARITY_CURVE:** Standard. Do not also apply overlay.
- **SYNERGIES:** `leash_warden`, `pale_cantor`, `hex_chorister`, `null_censor` (mirror match)
- **WEAKNESSES:** Null Censor, AoE (`starter-blast`), cap already 2
- **PLAYER_COUNTERPLAY:** Kill pets first if they block; or ignore and snipe the Chanter
- **SPELL_DISCOVERY_OPPORTUNITIES:** `summon-dire-wolf`, `summon-archer`, `spell-haste`
- **REWARD_EXPECTATION:** Standard. Pets do not grant extra XP (existing reward filter drops player-side summons; keep enemy summons out of the defeated list if they are minions — follow current recap rules).
- **IMPLEMENTATION_COMPLEXITY:** LOW (flag + kit)
- **STATUS:** PROPOSED

#### ENEMY_ID: `glyph_sower`

- **NAME:** Glyph Sower
- **ROLE:** hazard creator
- **BASE_ELIGIBILITY:** New family; preferred chassis `bishop`. Distinct from Ember (fire on **bodies**) — this one paints **tiles**.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Mark a tile at the player’s feet. Peer: Mark + poison the marked tile’s occupant. Above: prefers void/spike adjacent tiles (Void Rift synergy).
- **STAT_SCALING_RULE:** hp 0.75, sp 1.15, sr 1.00, res 0.80, init 0.95, chc 1.00.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: Mark then any damage spell. ELITE: will not Mark a tile the player can step off before the next nuke (simple: Mark only if player MP ≤ 1). CHAMPION: `proposed:spell-void-glyph` (tile deals 4 for 3 turns, same hook family as lava).
- **CORE_SPELL_POOL:** `spell-mark`, `starter-poison`
- **ADVANCED_SPELL_POOL:** `starter-frost`, `spell-inferno` (on the marked occupant, not a new trail)
- **RARE_SPELL_POOL:** `soul_rend`
- **ELITE_SPELL_POOL:** void-glyph (proposed)
- **SIGNATURE_MECHANICS:** Mark is already “next spell on that tile ×2.” That **is** a glyph. Do not also steal Ember’s wake.
- **VARIANT_PROGRESSION:** BASE mark → VETERAN mark-into-DoT → ELITE MP-aware mark → CHAMPION persistent tile
- **RARITY_CURVE:** Standard. +ELITE on `void_rift` / `thorned_ground`.
- **SYNERGIES:** `storm_caller`, `rift_hook`, `plague_rat`
- **WEAKNESSES:** High MP (walk off the mark), Null Field
- **PLAYER_COUNTERPLAY:** Step off marked tiles; do not stand still on Time Warp
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-mark`, `starter-poison`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW now; HIGH for persistent glyphs
- **STATUS:** PROPOSED

#### ENEMY_ID: `blink_cutter`

- **NAME:** Blink Cutter
- **ROLE:** teleporter (self)
- **BASE_ELIGIBILITY:** New family; preferred chassis `knight`. Distinct from Wraith (Wraith **swaps**; this one **leaves**).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Strike then want out. Peer: Swap with an **ally** to take their front tile (self-teleport via ally swap). Above: proposed phase-step behind the player.
- **STAT_SCALING_RULE:** hp 0.80, sp 0.85, sr 0.85, res 0.85, init 1.45, chc 1.20.
- **AI_TIER_PROGRESSION:** Profile `flanker`. VETERAN: after a hit, Swap with a backline ally if any. ELITE: never ends turn adjacent if a swap exists. CHAMPION: `proposed:spell-phase-step`.
- **CORE_SPELL_POOL:** `physical_attack`, `spell-swap`
- **ADVANCED_SPELL_POOL:** `spell-haste`, `spell-shadow-veil`
- **RARE_SPELL_POOL:** `shadow_strike`
- **ELITE_SPELL_POOL:** phase-step (shared proposed id with Wraith Elite — **same spell, different AI**: Wraith casts to escape LoS, Cutter casts to enter rear)
- **SIGNATURE_MECHANICS:** Self-reposition. If both Wraith and Cutter are in one pack, they must not share the same destination logic (one out, one in).
- **VARIANT_PROGRESSION:** BASE stab → VETERAN ally-swap → ELITE hit-and-leave → CHAMPION blink-in
- **RARITY_CURVE:** Standard
- **SYNERGIES:** `shadow_lurker`, `hex_chorister`, `wraith_bishop` (careful — see above)
- **WEAKNESSES:** Isolation (no ally to swap), Slow, walls
- **PLAYER_COUNTERPLAY:** Kill the swap partner first; stand in corners
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-swap`, `spell-haste`, `shadow_strike`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED
- **STATUS:** PROPOSED

#### ENEMY_ID: `coil_arbiter`

- **NAME:** Coil Arbiter
- **ROLE:** controller
- **BASE_ELIGIBILITY:** New family; preferred chassis `king`.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Slow. Peer: Slow + Frost (MP −1 extra). Above: Drain Courage (AP −1) then Slow.
- **STAT_SCALING_RULE:** hp 0.90, sp 1.05, sr 1.05, res 0.95, init 1.30, chc 0.80. Init is high so the tax lands **before** the player turn.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: will not Slow a already-Slowed target. ELITE: Drain Courage if player AP is the threat (they have Inferno/Sacrifice). CHAMPION: Frost Nova if two player-side units are adjacent.
- **CORE_SPELL_POOL:** `spell-slow`, `starter-frost`
- **ADVANCED_SPELL_POOL:** `spell-drain-courage`, `spell-weaken`
- **RARE_SPELL_POOL:** `spell-frost-nova`
- **ELITE_SPELL_POOL:** CHAMPION may apply both MP and AP tax in one turn if AP allows
- **SIGNATURE_MECHANICS:** Action economy. King chassis without Inferno. Distinct from Bone Scribe (Scribe shreds **stats**; Arbiter shreds **AP/MP**).
- **VARIANT_PROGRESSION:** BASE Slow → VETERAN no-refresh → ELITE AP tax → CHAMPION double tax
- **RARITY_CURVE:** Standard
- **SYNERGIES:** `tide_shade` (more MP tax), `rift_hook`, `glass_sniper` (you cannot walk in)
- **WEAKNESSES:** Timestep, Haste, burst before its init
- **PLAYER_COUNTERPLAY:** Win init; Timestep; do not plan a 5-AP turn
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-slow`, `spell-drain-courage`, `starter-frost`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW
- **STATUS:** PROPOSED

#### ENEMY_ID: `rust_reaver`

- **NAME:** Rust Reaver
- **ROLE:** anti-ranged (gap closer)
- **BASE_ELIGIBILITY:** New family; preferred chassis `knight`. Distinct from Void Mirror (Mirror **punishes shots**; Reaver **ends the kite**).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: walk in and Strike. Peer: Haste then Strike. Above: Swap **onto** the player if they are ≥3 away, then Strike.
- **STAT_SCALING_RULE:** hp 1.05, sp 0.75, sr 1.15 (eats chips), res 1.05, init 1.20, chc 0.90.
- **AI_TIER_PROGRESSION:** Profile `charger` with Swap as closer. VETERAN: Haste if out of range. ELITE: Swap only when Chebyshev ≥ 3. CHAMPION: after close, Iron Skin (stays in).
- **CORE_SPELL_POOL:** `physical_attack`, `spell-haste`
- **ADVANCED_SPELL_POOL:** `spell-swap`, `spell-iron-skin`
- **RARE_SPELL_POOL:** `spell-enrage`
- **ELITE_SPELL_POOL:** none new — CHAMPION is the full closer kit
- **SIGNATURE_MECHANICS:** Deletes sniper / kiter / artillery spacing. Not a second Ember.
- **VARIANT_PROGRESSION:** BASE rush → VETERAN Haste → ELITE Swap-in → CHAMPION Skin-up
- **RARITY_CURVE:** Standard. Weight ×1.5 if the pack already has `tide_shade` or `glass_sniper` (internal anti-synergy? **No** — Reaver is against the **player**. Weight ×1.5 if the **player** last battle used a range>2 majority — optional, skip if no history.)
- **SYNERGIES:** `void_mirror` (you cannot shoot, you cannot run), `crimson_spawn`
- **WEAKNESSES:** Protector summons, thorned ground (it must walk), Slow
- **PLAYER_COUNTERPLAY:** Slow first; melee it on purpose next to a golem; do not kite in a straight line
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-haste`, `spell-swap`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW–MED
- **STATUS:** PROPOSED

---

## 5. Identity matrix (keep kits coherent)

When a future spell is assigned, it must match the family’s allowed categories. If it does not, drop it — do not “fill a slot.”

| Family | Allowed `effectCategory` / flags | Forbidden |
| :--- | :--- | :--- |
| wraith_bishop | damage, teleport, dot, debuff | heal, isSummon, isSacrifice |
| iron_golem | damage (physical), defense, buff(res) | dot, isSummon, teleport |
| plague_rat | dot, debuff | heal, isSummon, large aoe |
| ember_knight | damage, dot(burn), buff(dmg) | heal, teleport |
| tide_shade | damage, debuff(mp), buff(mp) | isSummon, isSacrifice |
| bone_scribe | debuff, drain (no healAmount until profiled) | isSummon, isTimestep |
| void_mirror | defense, damage, debuff | isSummon, isSacrifice |
| crimson_spawn | damage, buff(dmg), isSacrifice | teleport, isSummon |
| shadow_lurker | damage, teleport, debuff(mark) | heal, isSummon |
| storm_caller | aoe, damage, isMark | heal, melee-only kits |
| glass_sniper | damage, isMark, dot | melee-only, isSummon |
| cinder_martyr | aoe, dot(burn), buff(mp) | heal, long-term tanking |
| pale_cantor | heal, defense, buff | isSacrifice, inferno |
| hex_chorister | buff | heal (until rally flip), isSacrifice |
| leash_warden | defense, teleport(peel), damage | isSummon, inferno |
| null_censor | debuff, damage | isSummon |
| rift_hook | teleport, attract, debuff | heal, isSummon |
| brood_chanter | isSummon, buff(on pet) | inferno, sacrifice |
| glyph_sower | isMark, dot, damage | heal, isSummon |
| blink_cutter | teleport, damage | heal, isSummon |
| coil_arbiter | debuff(ap/mp), damage | isSummon, isSacrifice |
| rust_reaver | damage, buff(mp), teleport | heal, isSummon, long-range nukes |

---

## 6. Implementation prerequisites (not this change)

Design-only. When someone implements later, order matters:

1. Pass a **number** into `buildEnemyKit` (relative band or `floor(enemy.level / tierSize)`), not `currentMap.levelZone`.
2. Stop `calcEnemyMaxHp` from wiping family HP; apply §2.2 ratios after the formula.
3. Stop writing `res`/`sp` as 0.05–0.75.
4. Add `aiProfile` / `familyKit` metadata; stop inferring healer from `healAmount`.
5. Force preferred chassis on family roll.
6. Then add kits. Then add one new AI profile at a time (`kiter`, `buffer`, bomber-on-enemy).
7. Proposed spells are new `SpellConfig` rows with explicit flags — no name heuristics.
8. Register text should be updated to match live hooks when those hooks land (Register is currently aspirational).

Do **not** retune `pickEnemyLevelFromTiers` percents, RAF, map generation, turn order, or damage math for this content.

---

## 7. What this run did not do

- No production TypeScript / Motoko.
- No boss redesign (12 seeded bosses stay).
- No player level cap, enemy level cap, or “final variant.”
- No reward writers outside `applyRewards`.
- No new persist stats (`wp` / `wr` / `scp` stay gone).
