# Enemy and Elite Evolution Design — Wave 3

**Author:** Enemy and Elite Evolution Designer (cron `0 */24 * * *`)  
**Date:** 2026-09-02  
**Status:** PROPOSED — design only. No production code in this change.  
**Scope:** Third daily pass. New world-pack families that consume **SPELL_PROPOSALS Wave 2 verbs** (fuse, instant execute, DoT detonate, range shrink, AP grant, ally cleanse, cross AoE, ice tile, smoke LoS, tile-gravity, ally rescue, defensive pylon, taunt, shared HP). Bosses stay on the existing catalog.

**Does not replace:**
- [`ENEMY_ELITE_EVOLUTION_2026-08-31.md`](./ENEMY_ELITE_EVOLUTION_2026-08-31.md) (Wave 1, 22 family sheets)
- [`ENEMY_ELITE_EVOLUTION_2026-09-01.md`](./ENEMY_ELITE_EVOLUTION_2026-09-01.md) (Wave 2, 14 family sheets)

Those ids stay **PROPOSED**. This run does **not** re-list them as new content.

Stralt has **no character level cap**. Nothing here is a final enemy level, a final player level, or a last variant. Relevance is player-relative spawn + role + AI + spell-pool growth + variant mechanics.

---

## 0. What changed since Wave 2

Re-read against `HEAD` `58302bc` (Merge PR #258 — GameKey shop). Wave 2 closed as docs in the 2026-09-01 pass. Formations, AI catalog, enemy admin, and SPELL_PROPOSALS Wave 2 are also docs-only.

`WorldExploration.tsx` is now **19,253** lines (Wave 2 expansion sheet still quoted 20,063). Line numbers below are this checkout.

| Wave 2 claim | 2026-09-02 live | Verdict |
| :--- | :--- | :--- |
| 7 `EnemyFamily` ids + `default` | `gameTypes.ts` 12–20 unchanged | No Wave 1/2 sheet shipped |
| 30% family roll is stat-only | `WorldExploration.tsx` 5863–5952 | Still true |
| Family `res`/`sp` written as 0.05–0.75 | same block (`iron_golem.res = 0.75`, `plague_rat.res = 0.05`) | Still broken vs `getEnemyBaseStats` |
| Battle start drops family HP | `WX` 12085–12089 `calcEnemyMaxHp(e.level)` | Still true |
| Kit zone is NaN | `WX` 12035 `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` | Still true (`enemyAI.ts` 187–192) |
| Live combat hooks | ember melee-burn `WX` 16877–16891; tide melee-slow `WX` 16893–16908; void 25% reflect `castHelpers.ts` 328–337 | Still the only three |
| Register extras | Crimson Spawn / Shadow Lurker / Storm Caller still lore-only (`EnemyRegister.tsx` 66–80) | Not in `EnemyFamily` |
| `pickEnemyLevelFromTiers` | `combatMath.ts` 54–107; `maxTier = floor(999 / ts)` at 58 | Do not retune percents; 999 remains a spawn-math rail, not a content cap |
| `computeAITier` | `combatMath.ts` 36–52; bands then 30% 1–10 noise | Variant floors still sit on top |
| Summoner chance | `WX` 12047–12058 `0.12 + playerLevel * 0.02` (`gameConstants.ts` 298–299) | Still saturates; Wave 1 `brood_chanter` still the family fix |
| `inferArchetype` healer-first | `enemyAI.ts` 421–450; `family.includes("berserk")` heuristic | Still metadata-hostile |
| `applyPushback` / `applyAttract` | `occupancy.ts` 462 / 517; tests exist; **no spell caller** | Wave 2 still owns bash/hook; Wave 3 uses attract **toward a tile** and **ally** |
| `isTrap` | `spellEngine.ts` 442 → `placeBarrier(..., 3)` | Still a fake wall. Wave 2 `trip_mason` still owns the redefine |
| `areaShape` | Typed on `SpellConfig`; **unread** in `targeting.ts` | Wave 3 `plus_cutter` resolves via `hitTiles`, not an `areaShape` reader |
| Delayed **tile** fuse / instant execute / DoT consume / range shrink / AP grant / ally cleanse / ice paint / smoke LoS / taunt / shared HP / defensive pylon | Absent in live catalog | Wave 3 primary opportunity |

**Wave 1 ids — do not re-propose:**  
`wraith_bishop`, `iron_golem`, `plague_rat`, `ember_knight`, `tide_shade`, `bone_scribe`, `void_mirror`, `crimson_spawn`, `shadow_lurker`, `storm_caller`, `glass_sniper`, `cinder_martyr`, `pale_cantor`, `hex_chorister`, `leash_warden`, `null_censor`, `rift_hook`, `brood_chanter`, `glyph_sower`, `blink_cutter`, `coil_arbiter`, `rust_reaver`.

**Wave 2 ids — do not re-propose:**  
`rank_lancer`, `bash_bruiser`, `snare_weaver`, `trip_mason`, `void_anchoret`, `bell_sexton`, `execute_jackal`, `plate_warden`, `pain_suture`, `stone_castellan`, `ricochet_vicar`, `tax_scribe`, `mist_walker`, `leech_familiar`.

---

## 1. Shared rules (inherit Wave 1 §2)

This pass does **not** retune `pickEnemyLevelFromTiers` percents, RAF, map generation, turn order, or damage math.

Reuse Wave 1:

- Relative band `R = enemy.level - player.level`, `T = tierSize` (default 10).
- Stat ratios after `calcEnemyMaxHp` / `getEnemyBaseStats` — family HP must **survive** battle start.
- Variant floors: BASE min `aiTier` 1, VETERAN 3, ELITE 6, CHAMPION 8.
- Rarity second roll after level pick (`wVeteran` / `wElite` / `wChampion` vs `R/T` + dungeon depth).
- Rewards: 1.00 / 1.15 / 1.35 / 1.60× on existing `level * 20` XP and Doka, **only** through `applyRewards`.
- Explicit `aiProfile` on every family. Non-healers: no `healAmount` in CORE.
- Preferred chassis forced on family roll.
- `usableByEnemy: false` stays false unless a sheet flips **that one id**.
- Proposed spells are `SpellConfig` rows with flags — never `spell.name` heuristics.

**Fifth variant (Wave 2 specified the 2% `wRare` skin):** palette + **one borrowed RARE spell from this family's allowed categories**. Never borrow a forbidden category. Never a new persist stat. This run does not invent a generator.

---

## 2. Why Wave 3 exists (gaps Waves 1–2 did not fill)

Wave 1 covered every requested **role word**. Wave 2 covered unused **engine verbs** (push, caster-pull, root, trap, linear file, delayed unit execute, absorb, redirect, offensive turret, conditional bounce, zone AP tax, self-dash, sacrificial familiar).

SPELL_PROPOSALS Wave 2 (`SPELL_PROPOSALS_2026-09-01.md`) then stamped **new** verbs. No family owns them yet. If a family only gained more HP/damage to “use” those ids, it would be the failure mode this brief forbids.

| Unused Wave 2 spell verb | Nearest older family | Why that is not enough |
| :--- | :--- | :--- |
| `spell-fuse-tile` (delayed **tile**) | `bell_sexton` (unit clock); `trip_mason` (enter trap) | Fuse cares about **occupancy at tick**. Bell is a person. Wire is enter. |
| `spell-coup-de-grace` (instant ≤25%) | `execute_jackal` (wait for Bell / 30–40%) | Jackal **refuses** a healthy target. Coup **punishes** a wounded one now. |
| `spell-ignite-stacks` (consume DoTs) | `plague_rat` / `ember_knight` (apply stacks) | Applicators want ticks. The alchemist **cashes** them. |
| `spell-short-sight` (range shrink) | `void_mirror` (reflect); `rust_reaver` (gap-close) | Optic bricks **modifiableRange** without reflecting or walking in. |
| `spell-tempo-gift` (+1 AP next turn) | `hex_chorister` (Enrage / Haste MP) | Haste is walk budget. Tempo is **action** budget. |
| `spell-absolve` (ally cleanse) | `pale_cantor` (heal / Shield) | Heal does not strip Root / Grave Bell / Short Sight. |
| `spell-cross-cut` (plus via `hitTiles`) | `storm_caller` (always bounce); `ricochet_vicar` (predicate bounce) | Plus is **geometry**, not a bounce table. |
| `spell-rime-tile` (ice MP tax) | `tide_shade` (kite + Slow); `trip_mason` (HP+root) | Rime is a **painted ice cell**. Slow is a unit. Wire deals HP. |
| `spell-smoke-veil` (walkable LoS block) | `spell-barrier` (solid); Ink Veil BOSS_ONLY | Smoke is walk-through fog, not a wall. |
| `spell-sinkhole` (attract toward **tile**) | `void_anchoret` (Hook toward caster); `rift_hook` (swap) | The hole is the attractor. Standing on the caster is not safety. |
| `spell-leash-hook` (pull **ally** adjacent) | `leash_warden` (body-block / Swap peel) | Rescue pull ≠ occupying the tile. Root blocks the pull. |
| `spell-bastion-pylon` (stationary **0-damage** summon) | `stone_castellan` (turret shard); Sentinel (walks) | Pylon is a wall with HP. It must not shoot. |
| `spell-goad` (forced next damaging action) | `iron_golem` (inertia); `plate_warden` (absorb) | Taunt is a **legal-target rewrite**, not extra RES. |
| `spell-life-tether` (50/50 split) | `pain_suture` (redirect whole hit); `plate_warden` (absorb) | Both bodies stay valid. Pulling them apart is the counter. |

`spell-file-lance` is **not** a new family. It is the official id for Wave 2 `rank_lancer` (amendment, §5).  
`spell-blood-tithe` stays **player-first** (`usableByEnemy: false`). Enemies already have `cinder_martyr` / `spell-martyr-fuse`. Do not clone a tithe family.

Wave 3 leftover **spell** verbs (mpCost > 0, cone `areaShape` reader, two-enemy swap, self knockback, portal-pair, evasion buff, distance-scaled damage) stay **unfamilied** until SPELL_PROPOSALS stamps ids. Do not invent colliding `wave3:` spell ids in this pass.

---

## 3. Encounter synergy packs (Waves 1–3)

Weights rise with `R` the same way Elite does. Cap one CHAMPION. Cap one dedicated summoner plus the existing overlay. Cap one pylon **or** turret, not both, in the same pack.

| Pack | Members | Decision (not “more HP”) |
| :--- | :--- | :--- |
| Wick Court | `fuse_binder` + `sink_chanter` + `bash_bruiser` | Pull/push onto a 2-turn bomb |
| Ice File | `rime_mason` + `rank_lancer` + `snare_weaver` | Ice tax then root on the file |
| Smoke Hunt | `smoke_thurifer` + `glass_sniper` + `dim_optic` | LoS brick + range shrink + min-range gun |
| Plus Battery | `plus_cutter` + `sink_chanter` + `glyph_sower` | Cluster on the plus origin, then Mark |
| Tempo Choir | `tempo_precentor` + `ignite_alchemist` + `plague_rat` | Gift AP so Ignite + another DoT land same window |
| Absolve Race | `ash_absolver` + `plate_warden` + `ignite_alchemist` | Cleanse the plate vs cash the stacks |
| Rescue Line | `hook_chaplain` + `leash_warden` + `glass_sniper` | Pull the gun off melee; Warden occupies |
| Bastion Gate | `pylon_prelate` + `goad_herald` + `glass_sniper` | Taunt into a pylon file |
| Twin Plate | `twin_tether` + `plate_warden` + `pale_cantor` | Absorb then split; healer keeps both halves |
| Finish Line | `coup_duelist` + `ignite_alchemist` + `plague_rat` | Cash stacks under 25%, then instant execute |
| Fog Fuse | `smoke_thurifer` + `fuse_binder` + `mist_walker` | Hide the fuse; dash does not trip, fuse still ticks occupancy |

Keep Wave 1 packs (Ash Court, Quiet Choir, Paper Plague, Broken Glass, Rift Knot, Null Brood, Tide Mirror) and Wave 2 packs (File & Wire, Bell Court, Gravity Choir, Plate Choir, Shard Battery, Mist Hunt, Ash Slam). Do not spawn Ice File on a map with no 4-tile file. Do not spawn Bastion Gate in a 1-tile closet (solvability).

Do **not** pack `coup_duelist` with `bell_sexton` as a teaching pair — 25% instant vs 30% delayed will read as the same lesson. They may share a COURT later, never a PAIR.

---

## 4. Family sheets — Wave 3

All sheets: **STATUS: PROPOSED**.  
Spell ids are from [`SPELL_PROPOSALS_2026-09-01.md`](./SPELL_PROPOSALS_2026-09-01.md) unless marked otherwise.

---

### ENEMY_ID: `fuse_binder`

- **NAME:** Fuse Binder
- **ROLE:** hazard creator (delayed tile)
- **BASE_ELIGIBILITY:** New family; preferred chassis `queen` **without** `starter-heal`. Distinct from `trip_mason` (hidden enter) and `bell_sexton` (unit clock). At most one per pack.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: fuse the tile the player stands on. Peer: fuse a choke the player must enter next turn. Above: fuse only if an ally can push/pull onto the cell (else Frost).
- **STAT_SCALING_RULE:** hp 0.80, sp 1.10, sr 1.00, res 0.80, init 1.05, chc 0.80. If it is topping the damage meter **on cast turn**, the kit leaked — Fuse deals **0 on cast**.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: skip fuse if player MP ≥ 3 and an open ring exists. ELITE: fuse a cell an ally bash/sink already owns. CHAMPION: two live fuses max; never stack two on one cell (last-writer is a lie to the player).
- **CORE_SPELL_POOL:** `spell-fuse-tile`, `starter-frost`
- **ADVANCED_SPELL_POOL:** `spell-mark` on a **different** tile (decoy vs bomb), `spell-slow`
- **RARE_SPELL_POOL:** `spell-inferno` only if the player is already committed to the fused cell (DoT while they wait)
- **ELITE_SPELL_POOL:** none new — CHAMPION is two-fuse discipline
- **SIGNATURE_MECHANICS:** 2-turn tile bomb. Caster death does **not** cancel. Teleport-off works; walk-on at tick does not. Mark does **not** amp the fuse (SPELL_PROPOSALS: environmental). Distinct from Cinder (per-enter tick).
- **VARIANT_PROGRESSION:** BASE fuse-feet → VETERAN value-check → ELITE combo-fuse → CHAMPION dual-wick
- **RARITY_CURVE:** Standard Wave 1 §2.4. +ELITE on `void_rift` / corridor maps.
- **SYNERGIES:** `sink_chanter`, `bash_bruiser`, `smoke_thurifer`, `mist_walker` (dash off — teaching contrast)
- **WEAKNESSES:** Leave the cell; Barrier replaces fuse; burst the Binder before the tick if you cannot move
- **PLAYER_COUNTERPLAY:** Step off; Swap the Binder onto their wick; do not stand still on Time Warp
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-fuse-tile` (ENEMY_DISCOVERY)
- **REWARD_EXPECTATION:** Standard Wave 1 §2.6
- **IMPLEMENTATION_COMPLEXITY:** MED (tile fuse table; challenge bind is spell-hit per SPELL_PROPOSALS)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `coup_duelist`

- **NAME:** Coup Duelist
- **ROLE:** assassin (instant execute)
- **BASE_ELIGIBILITY:** New family; preferred chassis `knight`. Distinct from `execute_jackal` (holds for Bell / 30–40%) and `shadow_lurker` (flank/veil).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Strike if HP% > 25, Coup if ≤ 25. Peer: only Coup when the window is public; otherwise path to 1 and wait. Above: refuse Strike on a target already ≤ 25% (never waste the execute on a 10).
- **STAT_SCALING_RULE:** hp 0.75, sp 1.05, sr 0.85, res 0.80, init 1.30, chc 1.10.
- **AI_TIER_PROGRESSION:** Profile `flanker` + melee gate. VETERAN: skip Coup if HP% > 25. ELITE: path to the DoT’d body, not the nearest. CHAMPION: Veil the approach, Coup the window (no extra damage formula).
- **CORE_SPELL_POOL:** `physical_attack`, `spell-coup-de-grace`
- **ADVANCED_SPELL_POOL:** `spell-shadow-veil`, `spell-mark`
- **RARE_SPELL_POOL:** `spell-expose` (so 34 bites through RES — still existing math)
- **ELITE_SPELL_POOL:** none — honesty is the elite
- **SIGNATURE_MECHANICS:** `executeMode: "instant"` at 25%. Absorb is **not** HP — Ward Plate can fake a healthy bar. Distinct from Grave Bell (delay, 30%). Do not invent `instantKill`.
- **VARIANT_PROGRESSION:** BASE window-strike → VETERAN refuse-healthy-Coup → ELITE hunt-the-DoT → CHAMPION veil-in
- **RARITY_CURVE:** Standard. +VETERAN when an Alchemist or Rat is already in the pack. Never CHAMPION in a solo pack.
- **SYNERGIES:** `ignite_alchemist`, `plague_rat`, `ember_knight`
- **WEAKNESSES:** Heal above 25%; keep Chebyshev ≥ 2; Plate then walk
- **PLAYER_COUNTERPLAY:** Mend before they step in; Slow the last tile; do not dump Inferno into a fresh absorb
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-coup-de-grace` (ELITE observe)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW–MED (HP% gate; no new damage formula)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `ignite_alchemist`

- **NAME:** Ignite Alchemist
- **ROLE:** status specialist (DoT payoff)
- **BASE_ELIGIBILITY:** New family; preferred chassis `queen` **without** heal. Distinct from `plague_rat` / `ember_knight` (they **apply**). Reroll if pack has no DoT applicator and the Alchemist’s own Inferno is locked (BASE may apply one stack then cash later).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Poison then wait. Peer: Ignite only if matching stacks ≥ 2. Above: refuse Ignite at 1 stack (Frost instead).
- **STAT_SCALING_RULE:** hp 0.75, sp 1.20, sr 0.90, res 0.75, init 1.10, chc 0.90. Identity is **the cash-in**, not a bigger Inferno.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: `aiHint: "detonate_if_dot_stacks_ge_2"` — read `stackId` / `dotType`, never names. ELITE: apply then wait one turn if Ignite AP cannot follow honestly. CHAMPION: prefer a target that also sits on Cinder/Rime so leftover ticks were already “spent” by terrain.
- **CORE_SPELL_POOL:** `starter-poison`, `spell-ignite-stacks`
- **ADVANCED_SPELL_POOL:** `spell-inferno`, `spell-venom-strike`
- **RARE_SPELL_POOL:** `soul_rend`
- **ELITE_SPELL_POOL:** none — honesty is the elite
- **SIGNATURE_MECHANICS:** 8 + 6×stacks, consume. Player chooses: cleanse / wait ticks / eat the burst. Distinct from Ricochet (bounce predicate).
- **VARIANT_PROGRESSION:** BASE apply-or-cash → VETERAN stack gate → ELITE two-turn combo → CHAMPION terrain-cash
- **RARITY_CURVE:** Standard. +ELITE on `plague_zone` / `blood_moon`.
- **SYNERGIES:** `plague_rat`, `ember_knight`, `tempo_precentor`, `coup_duelist`
- **WEAKNESSES:** Absolve / Cleanse Rite before the cash; don’t triple-stack if you see this kit
- **PLAYER_COUNTERPLAY:** Strip DoTs; spread so Inferno is a bad apply; kill the Alchemist first in Finish Line
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-ignite-stacks`, `starter-poison`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (`dotStacks.ts` already has `stackId`)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `dim_optic`

- **NAME:** Dim Optic
- **ROLE:** anti-ranged (range shrink) / debuffer
- **BASE_ELIGIBILITY:** New family; preferred chassis `bishop`. Distinct from `void_mirror` (reflect) and `rust_reaver` (closes the gap).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Short Sight if the player’s equipped ids include any `modifiableRange: true`; else Frost. Peer: Sight then step to Chebyshev 2 (dead zone vs Glass Shot). Above: Sight the Wisp if the Wisp holds the long kit.
- **STAT_SCALING_RULE:** hp 0.70, sp 1.00, sr 1.15, res 0.85, init 1.20, chc 0.80. If it is killing you with raw damage, the kit is wrong.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: skip if **all** player equipped ids have `modifiableRange !== true` (today: most of the 32-id blob — the family still teaches Frost). ELITE: Sight then Smoke-ally coordination (pack). CHAMPION: Drain Courage after they waste a long cast (visible leftover AP).
- **CORE_SPELL_POOL:** `spell-short-sight`, `starter-frost`
- **ADVANCED_SPELL_POOL:** `spell-slow`, `spell-expose`
- **RARE_SPELL_POOL:** `spell-drain-courage`
- **ELITE_SPELL_POOL:** CHAMPION sight + drain (readable two-step)
- **SIGNATURE_MECHANICS:** −2 range for 2 turns on **modifiable** spells only. Strike stays melee. Do **not** silently flip Frost to `modifiableRange` to make this family work.
- **VARIANT_PROGRESSION:** BASE shrink → VETERAN skip-if-useless → ELITE pack-brick → CHAMPION tax-the-whiff
- **RARITY_CURVE:** Standard. Weight ×1.5 if the player last battle used a majority range>2 kit (optional history; skip if none).
- **SYNERGIES:** `smoke_thurifer`, `glass_sniper` (enemy sniper still has min-range — player cannot snipe back), `rust_reaver`
- **WEAKNESSES:** Unmodified tools (Strike, Barrier, Swap); Cleanse; walking in
- **PLAYER_COUNTERPLAY:** Melee; Absolve; do not rely on a long-range `modifiableRange` gun this fight
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-short-sight`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (debuff writes target range, not caster bonus)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `tempo_precentor`

- **NAME:** Tempo Precentor
- **ROLE:** buffer (AP grant)
- **BASE_ELIGIBILITY:** New family; preferred chassis `king`. At most one per pack. Distinct from `hex_chorister` (Enrage / Haste). Reroll if no ally.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Tempo the highest-damage ally. Peer: Tempo the Alchemist / Lancer / Coup the turn **before** their commit. Above: skip if the gift is already queued (SPELL_PROPOSALS: replace, not +2).
- **STAT_SCALING_RULE:** hp 0.70, sp 0.85, sr 1.00, res 0.80, init 1.35, chc 0.75. Init is high so the gift lands **before** the ally acts. If this unit tops the damage meter, the kit leaked.
- **AI_TIER_PROGRESSION:** Profile `buffer` (ally-first). Until that profile exists, do **not** put `starter-heal` on this kit. VETERAN: skip duplicate Tempo. ELITE: gift the body that has Ignite or File Lance in kit. CHAMPION: Haste the same body next turn (AP then MP — readable two-axis).
- **CORE_SPELL_POOL:** `spell-tempo-gift` (**family flip** `usableByEnemy: true` for this id only — SPELL_PROPOSALS ships it player-first / ACHIEVEMENT)
- **ADVANCED_SPELL_POOL:** `spell-haste`, `spell-enrage`
- **RARE_SPELL_POOL:** `spell-iron-skin` (on the gifted carry)
- **ELITE_SPELL_POOL:** CHAMPION tempo + haste sequence
- **SIGNATURE_MECHANICS:** +1 AP next turn, not max AP, not Timestep. Challenge `hard_3` still counts spends. Do not persist AP as a CharacterStats field.
- **VARIANT_PROGRESSION:** BASE gift → VETERAN no-stack → ELITE gift-the-payoff → CHAMPION AP-then-MP
- **RARITY_CURVE:** Standard. +VETERAN in Tempo Choir.
- **SYNERGIES:** `ignite_alchemist`, `rank_lancer`, `plus_cutter`, `coup_duelist`
- **WEAKNESSES:** Isolated 1v1; Drain Courage on the gifted body; kill the Precentor first
- **PLAYER_COUNTERPLAY:** Focus the buffer; wait the CD 3; Null Field
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-tempo-gift` (ACHIEVEMENT `unstoppable` is the official door — family observe is a **second** door; do not double-grant)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW–MED (next-turn AP overlay + family flag flip)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `ash_absolver`

- **NAME:** Ash Absolver
- **ROLE:** healer-adjacent support (ally cleanse) — **not** a healer
- **BASE_ELIGIBILITY:** New family; preferred chassis `queen` **without** `starter-heal` (must not infer healer). Distinct from `pale_cantor` (HP). At most one per pack.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Absolve an ally with ≥1 matching effect. Peer: Absolve Root / Grave Bell / Short Sight first (control), DoTs second. Above: skip if the ally is clean; Shield instead.
- **STAT_SCALING_RULE:** hp 0.80, sp 0.95, sr 1.05, res 0.85, init 1.15, chc 0.70. Zero throughput is correct.
- **AI_TIER_PROGRESSION:** Profile `buffer` (not healer — no `healAmount`). VETERAN: never Absolve a clean ally. ELITE: peel the golem / plate / sniper, not self, unless self is rooted. CHAMPION: Absolve then Iron Skin the same ally.
- **CORE_SPELL_POOL:** `spell-absolve`, `starter-shield`
- **ADVANCED_SPELL_POOL:** `spell-iron-skin`, `spell-haste`
- **RARE_SPELL_POOL:** `spell-slow` (on the player after the peel)
- **ELITE_SPELL_POOL:** none — CHAMPION is peel-then-skin
- **SIGNATURE_MECHANICS:** Strip `debuff` + `dot` from an **ally**. Does not strip absorb, buffs, or Mark tiles. Pacifist / no-heal challenges stay valid (`spellType` is not `"heal"`). Distinct from `spell-cleanse-rite` (self).
- **VARIANT_PROGRESSION:** BASE strip → VETERAN no-waste → ELITE peel-the-carry → CHAMPION strip-then-skin
- **RARITY_CURVE:** Standard. +VETERAN when pack has a tank/protector or when `plague_zone` is on.
- **SYNERGIES:** `plate_warden`, `iron_golem`, `glass_sniper`, `goad_herald`
- **WEAKNESSES:** Re-apply after CD 2; burst during the window; Cursed Wound does not care about cleanse of *other* types if you never heal
- **PLAYER_COUNTERPLAY:** Kill the Absolver; double-apply DoT after the strip; don’t put all control on one body
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-absolve` (MULTI_SOURCE jackpot / hard_1 — family observe is a second door; do not double-grant)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW (same strip as Cleanse Rite, `targetType: ally`)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `plus_cutter`

- **NAME:** Plus Cutter
- **ROLE:** artillery (cross geometry)
- **BASE_ELIGIBILITY:** New family; preferred chassis `rook` or `queen` **without** heal. Distinct from `storm_caller` (bounce) and `ricochet_vicar` (conditional bounce). Reroll on maps with no 5-tile plus (tiny `ruinsIslands` pockets).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Frost if the plus covers < 2 hostiles. Peer: Cross Cut only if two player-side bodies sit on the plus. Above: refuse Cross without geometry (Frost / Mark instead).
- **STAT_SCALING_RULE:** hp 0.85, sp 1.20, sr 0.90, res 0.80, init 1.00, chc 1.05.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: count `hitTiles` occupancy, never name. ELITE: wait one turn if Sink/Hook will create the plus. CHAMPION: origin on an empty tile (area target) so the player cannot “stand off the caster.”
- **CORE_SPELL_POOL:** `starter-frost`, `spell-mark`
- **ADVANCED_SPELL_POOL:** `spell-cross-cut`, `starter-blast` (only if two bodies already stacked — else skip)
- **RARE_SPELL_POOL:** `thunder_clap`
- **ELITE_SPELL_POOL:** none — honesty is the elite
- **SIGNATURE_MECHANICS:** Plus via **`hitTiles`** (engine already consumes this). Diagonals are safe. Distinct from Nova (circle) and File Lance (one rank).
- **VARIANT_PROGRESSION:** BASE frost+mark → VETERAN plus-gate → ELITE wait-for-cluster → CHAMPION empty-origin
- **RARITY_CURVE:** Standard. +ELITE on `arcane_surge` / `chessboard`.
- **SYNERGIES:** `sink_chanter`, `glyph_sower`, `snare_weaver`, `tempo_precentor`
- **WEAKNESSES:** Stand on a diagonal of the origin; Barrier an arm; desummon so the plus has one body
- **PLAYER_COUNTERPLAY:** Diagonal stance; split from the Wisp; LoS break
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-cross-cut` (ELITE observe)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW (`hitTiles` path exists)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `rime_mason`

- **NAME:** Rime Mason
- **ROLE:** hazard creator (ice) / controller
- **BASE_ELIGIBILITY:** New family; preferred chassis `bishop`. Distinct from `tide_shade` (kite + unit Slow) and `trip_mason` (HP+root wire). At most one per pack.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: paint ice on the player’s escape tile. Peer: paint the file a lancer wants. Above: paint only if an ally can push/pull onto it (else Frost).
- **STAT_SCALING_RULE:** hp 0.85, sp 0.95, sr 1.05, res 0.90, init 1.00, chc 0.80. **0 HP on the paint.** If it is a damage dealer, the kit leaked.
- **AI_TIER_PROGRESSION:** Profile `caster` / setter. VETERAN: never ice a cell the player can ignore (must be on-path). ELITE: ice then Slow (unit + tile). CHAMPION: two rime cells if AP allows (cap 2 live per Mason); last-writer vs map ice (one tax).
- **CORE_SPELL_POOL:** `spell-rime-tile`, `starter-frost`
- **ADVANCED_SPELL_POOL:** `spell-slow`, `spell-mark`
- **RARE_SPELL_POOL:** `spell-frost-nova`
- **ELITE_SPELL_POOL:** CHAMPION rime + Slow (two MP axes, still 0 fuse damage)
- **SIGNATURE_MECHANICS:** Painted ice: start-turn or walk/push/pull enter pays +1 MP for the **next** step. Teleport does not pay. Distinct from Slow (−2 MP unit) and Frost Bolt (stat −1).
- **VARIANT_PROGRESSION:** BASE escape-ice → VETERAN on-path-only → ELITE ice+Slow → CHAMPION dual-rime
- **RARITY_CURVE:** Standard. +ELITE on `frozen_terrain` / `slime_flood`. Weight 0 if pack already has a Rime Mason.
- **SYNERGIES:** `rank_lancer`, `snare_weaver`, `bash_bruiser`, `sink_chanter`
- **WEAKNESSES:** Walk around; Barrier replaces ice; high MP
- **PLAYER_COUNTERPLAY:** Detour; Swap; do not let them paint the only aisle
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-rime-tile`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (`hazardTiles` already knows generated ice)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `smoke_thurifer`

- **NAME:** Smoke Thurifer
- **ROLE:** controller (LoS) / anti-ranged
- **BASE_ELIGIBILITY:** New family; preferred chassis `bishop`. Distinct from Barrier (solid) and `void_mirror` (reflect). At most one per pack.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: smoke the LoS tile between player and a glass ally. Peer: smoke the player’s long ray even in a 1v1. Above: skip if the player is already adjacent (smoke is useless in melee).
- **STAT_SCALING_RULE:** hp 0.80, sp 0.90, sr 1.10, res 0.85, init 1.10, chc 0.80.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: smoke only cells that currently break a live LoS (not random fog). ELITE: smoke a fuse cell (hide the wick). CHAMPION: smoke + Short Sight ally pack, or self Shadow Veil after placing.
- **CORE_SPELL_POOL:** `spell-smoke-veil`, `starter-frost`
- **ADVANCED_SPELL_POOL:** `spell-shadow-veil`, `spell-mark`
- **RARE_SPELL_POOL:** `spell-slow`
- **ELITE_SPELL_POOL:** CHAMPION smoke-the-fuse
- **SIGNATURE_MECHANICS:** Walkable LoS block. Bresenham treats the cell as opaque. Barrier on the same cell wins (solid). Spells with `lineOfSight: false` ignore it.
- **VARIANT_PROGRESSION:** BASE cover-glass → VETERAN live-ray-only → ELITE hide-wick → CHAMPION fog-the-sniper
- **RARITY_CURVE:** Standard. +ELITE when `fog_of_war` is announced (family **is** the fog until the stub is wired).
- **SYNERGIES:** `glass_sniper`, `fuse_binder`, `dim_optic`, `pylon_prelate`
- **WEAKNESSES:** Walk through and melee; diagonal around; Shadow Strike / Swap
- **PLAYER_COUNTERPLAY:** Close; occupy the smoke cell; use no-LoS tools
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-smoke-veil`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (`smokeTiles` in LoS helper, not `spell.name`)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `sink_chanter`

- **NAME:** Sink Chanter
- **ROLE:** displacement specialist (tile gravity) / controller
- **BASE_ELIGIBILITY:** New family; preferred chassis `bishop`. Distinct from `void_anchoret` (Hook toward **caster**) and `rift_hook` (swap).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Sinkhole on a Marked / fused / rime cell if any; else Frost. Peer: Sink only if ≥2 hostiles would move **or** one would land on a hazard. Above: skip if the hole is safer for the player.
- **STAT_SCALING_RULE:** hp 0.80, sp 1.05, sr 1.00, res 0.80, init 1.15, chc 0.80.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: `attractTowardTile` scoring — attractor is the **cell**, not self. ELITE: hole = fuse / rime / wire / plus origin. CHAMPION: hole under a pylon-adjacent choke.
- **CORE_SPELL_POOL:** `spell-sinkhole`, `starter-frost`
- **ADVANCED_SPELL_POOL:** `spell-mark` on the sink cell, `spell-slow` after they land
- **RARE_SPELL_POOL:** `proposed:spell-hook-line` only if `void_anchoret` is absent (do not double-pull a pack)
- **ELITE_SPELL_POOL:** none — CHAMPION is better holes, not Void Collapse
- **SIGNATURE_MECHANICS:** Radius-2 Chebyshev pull **1 step toward a ground cell**. Adjacent to the Chanter is **not** immunity (that is Hook). Standing at radius 3 is.
- **VARIANT_PROGRESSION:** BASE hole-if-setup → VETERAN tile-attractor → ELITE combo-hole → CHAMPION choke-hole
- **RARITY_CURVE:** Standard. +ELITE if `gravity_well` announce is on (family is gravity until the stub is wired).
- **SYNERGIES:** `fuse_binder`, `rime_mason`, `plus_cutter`, `bash_bruiser`, `trip_mason`
- **WEAKNESSES:** Radius 3; Barrier between you and the hole; body-block with a summon
- **PLAYER_COUNTERPLAY:** Spread; occupy the sink cell first; do not clump at radius 2
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-sinkhole` (MULTI_SOURCE / hard_3 — family observe is a second door; do not double-grant)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (`applyAttract` with tile attractor)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `hook_chaplain`

- **NAME:** Hook Chaplain
- **ROLE:** protector (ally rescue pull)
- **BASE_ELIGIBILITY:** New family; preferred chassis `rook`. Distinct from `leash_warden` (occupies / Swap peel). Reroll if no ally.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Leash Hook an ally in melee or on a hazard. Peer: skip if the ally is already adjacent and safe. Above: pull the sniper/cantor, not the golem (threat table).
- **STAT_SCALING_RULE:** hp 1.10, sp 0.70, sr 1.05, res 1.15, init 1.00, chc 0.70.
- **AI_TIER_PROGRESSION:** Reuse summon `guardian` spacing after the pull. VETERAN: fizzle-aware (no free adjacent cell → do not spend). ELITE: refuse pull if the ally has `rootTurns` (SPELL_PROPOSALS: root blocks). CHAMPION: pull then Shield the landing cell.
- **CORE_SPELL_POOL:** `spell-leash-hook`, `physical_attack`
- **ADVANCED_SPELL_POOL:** `starter-shield`, `spell-iron-skin`
- **RARE_SPELL_POOL:** `spell-swap` (only if the ring is occupied — Swap peel, not a second identity)
- **ELITE_SPELL_POOL:** CHAMPION pull + Shield
- **SIGNATURE_MECHANICS:** Pull **ally** to a free adjacent cell. Cannot self-pull. Cannot pull enemies (that is Hook Line). Occupying the Chaplain’s ring is the counter.
- **VARIANT_PROGRESSION:** BASE rescue → VETERAN no-fizzle-spend → ELITE respect-root → CHAMPION land-and-skin
- **RARITY_CURVE:** Standard. +ELITE in Rescue Line / Quiet Choir.
- **SYNERGIES:** `leash_warden`, `glass_sniper`, `pale_cantor`, `ash_absolver`
- **WEAKNESSES:** Occupy the ring; Root the ally first; kill the Chaplain; artillery still works
- **PLAYER_COUNTERPLAY:** Stand on the landing tiles; Slow the sniper before the pull; focus the backline anyway with no-LoS
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-leash-hook`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW–MED (occupancy walk)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `pylon_prelate`

- **NAME:** Pylon Prelate
- **ROLE:** summoner (stationary defense) / tank-lite
- **BASE_ELIGIBILITY:** New family; preferred chassis `rook`. Replaces random overlay on this body. Distinct from `stone_castellan` (shoots) and `brood_chanter` (mobile pets). At most one per pack. Do **not** also roll wolf/archer overlay. Do not co-spawn with `stone_castellan`.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: place pylon on the LoS file to a glass ally. Peer: place on the player’s approach aisle. Above: place off-axis so Goad walks them around it into a sniper.
- **STAT_SCALING_RULE:** hp 1.00, sp 0.80, sr 1.00, res 1.15, init 0.70, chc 0.70. Pylon uses existing `getSummonBaseStats` with `damageScale: 0`.
- **AI_TIER_PROGRESSION:** New summon AI `pylon` (SPELL_PROPOSALS): `ap: 0`, `mp: 0`, **must not path**, **must not cast**. VETERAN: skip if cap reached. ELITE: Shield the pylon. CHAMPION: Goad-ally pack so the player must path around.
- **CORE_SPELL_POOL:** `spell-bastion-pylon`
- **ADVANCED_SPELL_POOL:** `starter-shield`, `spell-iron-skin` (on the pylon)
- **RARE_SPELL_POOL:** `spell-mark` on a tile **behind** the pylon (payoff for walking around)
- **ELITE_SPELL_POOL:** Do **not** unlock turret / wolf / archer / bomber on this body.
- **SIGNATURE_MECHANICS:** Occupies + blocks LoS like a unit. Lifespan 4. Cap shares `ENEMY_SUMMON_CAP`. 0 XP on pylon death. Weak in open field, strong in corridors.
- **VARIANT_PROGRESSION:** BASE wall → VETERAN respect-cap → ELITE skin-the-post → CHAMPION goad-around
- **RARITY_CURVE:** Standard. +ELITE on `fortress` / `corridorMaze`. Weight 0 on cramped 1-tile closets (solvability).
- **SYNERGIES:** `goad_herald`, `glass_sniper`, `smoke_thurifer`, `hook_chaplain`
- **WEAKNESSES:** Kill the pylon; walk around; Swap past; open field
- **PLAYER_COUNTERPLAY:** Burst the post; sit on the placement cell; artillery over the top if LoS isn’t blocked from your angle
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-bastion-pylon` (pylon kit is empty — nothing to steal from the post)
- **REWARD_EXPECTATION:** Standard. Pylon death is not a reward event.
- **IMPLEMENTATION_COMPLEXITY:** MED (new `SUMMON_KIT.pylon`; do not reuse turret or bomber)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `goad_herald`

- **NAME:** Goad Herald
- **ROLE:** protector / tank (forced targeting)
- **BASE_ELIGIBILITY:** New family; preferred chassis `pawn` or `knight`. Distinct from `iron_golem` (inertia) and `plate_warden` (absorb). Reroll if no ally (solo Goad is still a “hit me” puzzle — allowed at BASE).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Goad when an ally is lower HP. Peer: Goad then step so the Herald **is** a legal Strike target. Above: Goad then Smoke/Pylon so the forced path is expensive.
- **STAT_SCALING_RULE:** hp 1.20, sp 0.75, sr 1.10, res 1.10, init 1.05, chc 0.80. Threat is **the taunt**, not HP-only.
- **AI_TIER_PROGRESSION:** Profile `charger` with retreat disabled while taunt is live. VETERAN: skip if the Herald is already the only legal target. ELITE: Goad the player when a Cantor/Sniper is the real threat. CHAMPION: Ward Plate first (absorb then eat the forced swing) **only if** `plate_warden` is absent.
- **CORE_SPELL_POOL:** `spell-goad`, `physical_attack`
- **ADVANCED_SPELL_POOL:** `starter-shield`, `spell-enrage` (self, after goad)
- **RARE_SPELL_POOL:** `proposed:spell-ward-plate` only if Plate Warden is not in the pack
- **ELITE_SPELL_POOL:** CHAMPION goad + plate (readable two-step)
- **SIGNATURE_MECHANICS:** Next **damaging** action must choose the Herald if they are a legal target. Non-damage tools (Slow, Barrier, Haste, Absolve) ignore taunt. AoE that already includes the Herald satisfies it. DoTs already ticking do not consume it.
- **VARIANT_PROGRESSION:** BASE taunt-if-ally-low → VETERAN skip-redundant → ELITE protect-glass → CHAMPION absorb-the-swing
- **RARITY_CURVE:** Standard. +ELITE in Bastion Gate / Quiet Choir.
- **SYNERGIES:** `pylon_prelate`, `pain_suture` (forced swing into redirect — pack carefully, COURT only), `ash_absolver`, `glass_sniper`
- **WEAKNESSES:** Cast a non-damaging tool; walk out of range so taunt drops; Absolve the taunt if it is implemented as a debuff (SPELL_PROPOSALS: `effectCategory: "cc"` — Absolve **does** strip it)
- **PLAYER_COUNTERPLAY:** Slow / Barrier / Swap; kill the Herald with a legal AoE that also hits the backline; wait CD 2
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-goad`
- **REWARD_EXPECTATION:** Standard. No extra Doka for “tankiness.”
- **IMPLEMENTATION_COMPLEXITY:** HIGH (`tauntCasterId` on targeting for player **and** AI)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `twin_tether`

- **NAME:** Twin Tether
- **ROLE:** protector (shared incoming)
- **BASE_ELIGIBILITY:** New family; preferred chassis `king` or `rook`. Distinct from `pain_suture` (redirect to hostile) and `plate_warden` (absorb). Reroll if no ally. Do not also be a summoner overlay.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Tether the lowest-HP ally. Peer: Tether the Cantor / Sniper. Above: Tether then walk to keep Chebyshev ≤ 3.
- **STAT_SCALING_RULE:** hp 1.05, sp 0.70, sr 1.00, res 1.05, init 0.90, chc 0.70. **Lower HP than golem** — the split is the extra life.
- **AI_TIER_PROGRESSION:** Profile `generic` / holder. VETERAN: break-aware — will not Tether if already > 3 apart with no MP to close. ELITE: Tether the carry, Shield self. CHAMPION: Tether + Absolver pack (keep both halves clean).
- **CORE_SPELL_POOL:** `spell-life-tether`, `physical_attack`
- **ADVANCED_SPELL_POOL:** `starter-shield`, `spell-iron-skin`
- **RARE_SPELL_POOL:** `spell-haste` (self, to stay in range)
- **ELITE_SPELL_POOL:** none — CHAMPION is range-discipline, not 100% Midnight Bishop
- **SIGNATURE_MECHANICS:** 50/50 split after absorb, before death, while Chebyshev ≤ 3. Separate them and it breaks. AoE that hits both splits **each** hit. Leftover from a lethal half does **not** rebound. Challenge records the HP each body actually lost.
- **VARIANT_PROGRESSION:** BASE tether-low → VETERAN range-check → ELITE tether-the-carry → CHAMPION hold-the-band
- **RARITY_CURVE:** Standard. +ELITE in Twin Plate. Never CHAMPION in a solo pack.
- **SYNERGIES:** `plate_warden` (absorb then split), `pale_cantor`, `ash_absolver`, `hook_chaplain` (pulls them back into range — player can also Hook them apart)
- **WEAKNESSES:** Pull/Swap/Sink one body beyond 3; focus the Tether; two independent DoTs
- **PLAYER_COUNTERPLAY:** Break the band; Hook the carry out; do not dump a single-target nuke into the plated half first without breaking range
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-life-tether` (BOSS `midnight_bishop` is the official door — family observe is a **second** door; do not double-grant)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** HIGH (incoming pipeline, two bodies, absorb order)
- **STATUS:** PROPOSED

---

## 5. Wave 1 / Wave 2 amendments (not new ids)

| Family | Amendment | Why |
| :--- | :--- | :--- |
| `rank_lancer` | CORE/ADVANCED may use official `spell-file-lance` instead of unnamed `wave2:spell-file-thrust` | SPELL_PROPOSALS Wave 2 owns that id; do not invent a second file poke |
| `leash_warden` | Do **not** steal `spell-leash-hook` as CORE | Rescue pull is Hook Chaplain. Warden stays occupy / Swap peel. CHAMPION may take Hook only if Chaplain is absent |
| `pale_cantor` | Do **not** steal `spell-absolve` as CORE | Cleanse is Ash Absolver. Cantor stays HP / Shield |
| `hex_chorister` | Do **not** steal `spell-tempo-gift` | AP grant is Tempo Precentor. Chorister stays Enrage / Haste |
| `execute_jackal` | Do **not** steal `spell-coup-de-grace` | Instant 25% is Coup Duelist. Jackal stays wait-for-window |
| `void_anchoret` | Do **not** steal `spell-sinkhole` | Tile gravity is Sink Chanter. Anchoret stays caster-Hook |
| `stone_castellan` | Do **not** steal `spell-bastion-pylon` | Zero-damage post is Pylon Prelate. Castellan stays turret shard |
| `trip_mason` | Do **not** steal `spell-fuse-tile` | Delayed occupancy bomb is Fuse Binder. Mason stays enter-trap |
| `tide_shade` | Do **not** steal `spell-rime-tile` as identity | Ice paint is Rime Mason. Tide CHAMPION may still **surf** existing map ice |
| `iron_golem` | Do **not** steal `spell-goad` | Taunt is Goad Herald. Golem stays inertia / DoT immunity |
| `pain_suture` | Do **not** steal `spell-life-tether` | Shared HP is Twin Tether. Suture stays redirect-to-hostile |
| `plague_rat` / `ember_knight` | Do **not** steal `spell-ignite-stacks` | They apply. Alchemist cashes |
| `bell_sexton` | Do **not** pair as PAIR with `coup_duelist` | Two execute clocks would teach the same sentence |
| All prior waves | Fifth `wRare` 2% skin still applies | Mechanical identity, not a level bracket |

---

## 6. Identity matrix (Wave 3 — keep kits coherent)

When a future spell is assigned, it must match the family’s allowed categories. If it does not, drop it — do not “fill a slot.”

| Family | Allowed categories / flags | Forbidden |
| :--- | :--- | :--- |
| fuse_binder | delayed tile fuse, damage (frost), isMark (decoy), debuff(mp) | heal, isSummon, isTrap-as-identity, absorb |
| coup_duelist | instant execute, damage (physical), veil, isMark | heal, isSummon, long artillery, delayed Bell |
| ignite_alchemist | consumeDots, dot apply, damage | heal, isSummon, bounce-as-identity |
| dim_optic | rangeDebuff, damage, debuff | heal, isSummon, reflect, gap-close Swap |
| tempo_precentor | grantApNextTurn, buff(mp/dmg/res) | heal, isSummon, isSacrifice, inferno |
| ash_absolver | ally cleanse, defense, buff(mp) | healAmount, isSummon, inferno, isSacrifice |
| plus_cutter | hitTiles cross, damage, isMark | heal, melee-only, isSummon |
| rime_mason | ice tile, debuff(mp), damage (frost) | heal, isSummon, burn-as-identity, isTrap |
| smoke_thurifer | losBlock tile, damage, veil | heal, isSummon, solid Barrier-as-identity |
| sink_chanter | attractTowardTile, damage, isMark, debuff | heal, isSummon, swap-as-primary |
| hook_chaplain | pullAllyAdjacent, defense, damage (physical) | isSummon, inferno, enemy-Hook as CORE |
| pylon_prelate | isSummon (pylon), defense, isMark | turret/wolf/archer/bomber, heal, shard |
| goad_herald | taunt, defense, damage (physical), optional absorb | isSummon, inferno, teleport |
| twin_tether | splitIncoming, defense, buff(mp) | isSummon, redirect-as-identity, inferno |

Wave 1 matrix in the 2026-08-31 doc and Wave 2 matrix in the 2026-09-01 doc still apply to those ids.

---

## 7. Role coverage after Wave 3

| Archetype | Wave 1 owner | Wave 2 extra | Wave 3 extra (new verb) |
| :--- | :--- | :--- | :--- |
| bruiser | crimson_spawn | rank_lancer, bash_bruiser | — |
| sniper | glass_sniper | — | — |
| kiter | tide_shade | — | — |
| assassin | shadow_lurker | execute_jackal (threshold wait) | coup_duelist (instant 25%) |
| healer | pale_cantor | — | ash_absolver is **cleanse**, not heal |
| buffer | hex_chorister | leech_familiar | tempo_precentor (AP) |
| debuffer | bone_scribe | tax_scribe | dim_optic (range) |
| summoner | brood_chanter | stone_castellan, leech_familiar | pylon_prelate (0-damage post) |
| controller | coil_arbiter | snare_weaver, void_anchoret | rime_mason, smoke_thurifer, sink_chanter |
| tank | iron_golem | plate_warden | goad_herald (taunt) |
| protector | leash_warden | pain_suture | hook_chaplain, twin_tether |
| artillery | storm_caller | ricochet_vicar, stone_castellan | plus_cutter |
| kamikaze | cinder_martyr | — | — |
| teleporter | wraith_bishop, blink_cutter | mist_walker | — |
| displacement | rift_hook | bash_bruiser, void_anchoret | sink_chanter, hook_chaplain |
| hazard creator | ember_knight, glyph_sower | trip_mason | fuse_binder, rime_mason, smoke_thurifer |
| status specialist | plague_rat | bell_sexton | ignite_alchemist |
| anti-summon | null_censor | pain_suture | — |
| anti-ranged | void_mirror, rust_reaver | rank_lancer | dim_optic, smoke_thurifer |
| anti-melee | leash_warden | pain_suture, trip_mason | goad_herald, pylon_prelate |

Every requested archetype still has a Wave 1 owner. Wave 3 does not invent a 21st role word. It adds **verbs**.

---

## 8. Implementation prerequisites (still not this change)

Order from Wave 1 §6 and Wave 2 §8, plus Wave 3 verbs:

1. Numeric kit band into `buildEnemyKit` (`WX` 12035).
2. Keep family HP through `calcEnemyMaxHp` (`WX` 12085–12089).
3. Stop writing `res`/`sp` as 0.05–0.75 (`WX` 5883–5951).
4. Explicit `aiProfile` / `familyKit`; stop healer inference and `family.includes("berserk")`.
5. Force preferred chassis.
6. Wave 1 kits first (live ids), then Wave 2 verbs, then Wave 3 verbs one at a time: fuse table → instant execute gate → DoT consume → range debuff → next-turn AP → ally cleanse → `hitTiles` plus → ice paint → smoke LoS → tile attract → ally pull → pylon AI → taunt targeting → incoming split.
7. Proposed spells are metadata rows. Wire `effectParams` keys from SPELL_PROPOSALS Wave 2, never names.
8. Register text updates only when hooks land.
9. Discovery: family observe must not double-grant ACHIEVEMENT / BOSS / MULTI_SOURCE doors (`tempo-gift`, `absolve`, `sinkhole`, `life-tether`).

Do **not** retune `pickEnemyLevelFromTiers` percents. Do not treat 999 as endgame. Do not implement `instantKill`. Do not add a parallel reward writer. Do not invent `wp` / `wr` / `scp`.

---

## 9. Held for a later wave (no ids reserved here)

These need SPELL_PROPOSALS to stamp ids first. This run does **not** mint colliding `wave3:` spell ids.

- First `mpCost > 0` caster family
- Cone `areaShape` **reader** family (plus-cutter uses `hitTiles` instead)
- Two-enemy swap family (distinct from `rift_hook` player-swap)
- Self-knockback bruiser (distinct from `bash_bruiser` player-push)
- Portal-pair teleporter (distinct from `mist_walker` / `wraith_bishop`)
- Evasion-buff kiter (do not invent a persist evasion field)
- Distance-scaled shot (do not retune live damage math; would be a spell rider)

---

## 10. What this run did not do

- No production TypeScript / Motoko.
- No re-proposal of the 22 Wave 1 or 14 Wave 2 ids as new families.
- No boss redesign.
- No player or enemy level cap.
- No RAF / mapGen / turn / damage-math edits.
- No reward writers outside `applyRewards`.
- No new persist stats (`wp` / `wr` / `scp` stay gone).
- No `spell-blood-tithe` enemy family (player-first; martyrs already exist).
