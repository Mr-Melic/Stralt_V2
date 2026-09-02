# Spell and Tactical Mechanics — Design Pass 2026-09-02

**Role:** Spell and Tactical Mechanics Designer  
**Status:** PROPOSED — no production code in this pass  
**HEAD audited:** `58302bc` (`Merge pull request #258` — Doka GameKey shop)  
**Sibling systems:**
- Dynamic Spell Discovery — [`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md) (Wave 1 law) and [`SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md) (Wave 2 generation)
- Spell, Discovery & Achievement Admin — [`SPELL_ADMIN_DESIGN_2026-09-01.md`](./SPELL_ADMIN_DESIGN_2026-09-01.md)
- Prior tactical passes — [`SPELL_PROPOSALS_2026-08-31.md`](./SPELL_PROPOSALS_2026-08-31.md) (Wave 1), [`SPELL_PROPOSALS_2026-09-01.md`](./SPELL_PROPOSALS_2026-09-01.md) (Wave 2)
- Boss adaptations — [`../design/BOSS_AND_SPELL_DISCOVERY.md`](../design/BOSS_AND_SPELL_DISCOVERY.md)

This is **Wave 3**. Wave 1 filled push, pull, self-teleport, delayed execute, root, range buff, absorb, redirect, self-cleanse, burn tile, real trap, AP-tax zone, turret, sacrificial familiar, conditional bounce, and a boss pull+root. Discovery Wave 1 formalized 19 more ids. Boss design reserved 10 adaptations. Wave 2 filled line poke, delayed tile fuse, instant execute, DoT detonate, range shrink, AP grant, ally cleanse, plus-shape, ice, smoke, tile-gravity, ally pull, defensive pylon, pet sacrifice, taunt, and shared HP.

**Wave 2 explicitly deferred seven holes to this pass:** first `mpCost > 0` spell; cone `areaShape` wire; two-enemy swap; self knockback; portal-pair; evasion buff; distance-scaled damage.

**This pass does not reuse any reserved id.** Every card below fills a hole that is still empty after that reserved set. Every proposed spell is **data-only**: it must resolve from explicit `SpellConfig` / `effectParams` fields. `spell.name` is UI and battle-log copy. Targeting and effects must never branch on name.

---

## 1. Re-audit of the catalog that actually exists

Verified against `origin/main` @ `58302bc`. Live combat catalog is unchanged since 2026-08-31. Discovery is still inert.

### 1.1 Frontend runtime catalog — `src/frontend/src/data/spellData.ts`

`SPELL_ID_CATALOG` (`src/frontend/src/data/bossKits.ts` 29–62) still lists **32** ids. `WorldExploration.tsx` 2356–2368 still maps **every** `starterSpells` row to `isBaseSpell: true` (“always shown, never removable”).

`ownedSpells` (2373–2401) still unions those 32 with backend rows that pass `shouldIncludeBackendSpellInLibrary` (`adminSafety.ts` 551–558). That helper only drops `usableByPlayer === false` unless the id is already owned. It does **not** create a discovery path.

| ID | Name | Family (actual) | AP | Payload | Range | Notes |
| :--- | :--- | :--- | ---: | :--- | ---: | :--- |
| `physical_attack` | Strike | direct physical | 2 | 10 | 1 | Only true melee baseline; only `isBaseSpell` in data |
| `starter-shield` | Shield | RES% buff | 2 | +30% RES / 3 | 3 | Ally/self |
| `starter-poison` | Poison Arrow | DoT poison | 2 | 4×3 | 4 | No upfront |
| `starter-blast` | Chain Lightning | chain | 4 | 20 + 2 bounces | 4 | Only bounce spell |
| `starter-heal` | Blood Mend | self heal + CHC | 3 | 12 + +15% CHC / 2 | 0 | Self only |
| `starter-drain` | Life Drain | drain + SP | 3 | 10 / heal 5 + SP×0.8 / 2 | 2 | |
| `starter-frost` | Frost Bolt | damage + MP | 3 | 20 + MP−1 / 1 | 4 | Debuff, not steal |
| `spell-swap` | Swap | caster ↔ enemy | 3 | 0 | 3 | Only position spell; `isSwap` → `swapPositions` |
| `spell-mark` | Mark | tile amp | 2 | next hit ×2 | 4 | Tile, not unit |
| `spell-barrier` | Barrier | obstacle | 3 | wall 2 turns | 2 | Blocks walk **and** LoS |
| `spell-mirror` | Mirror | reflect 1 spell | 4 | 0 | 0 | Player-only in data |
| `spell-timestep` | Timestep | full AP/MP once | 0 | once/battle | 0 | Player-only |
| `spell-sacrifice` | Sacrifice | HP-cost burst | 3 | 20% HP ×3 | 1 | HP, not MP |
| `spell-lifesteal-nova` | Lifesteal Nova | AoE drain | 5 | 20 + heal 10/hit r=2 | 1 | Circle only |
| `spell-enrage` | Enrage | DMG buff | 3 | +40% / 2 | 3 | Duration, not next-cast |
| `spell-iron-skin` | Iron Skin | RES% buff | 3 | +30% RES / 3 | 3 | Duplicate of Shield |
| `spell-haste` | Haste | MP **grant** | 2 | +2 MP / 1 | 3 | Only MP grant |
| `spell-weaken` | Weaken | DMG debuff | 3 | ×0.7 / 2 | 3 | |
| `spell-slow` | Slow | MP debuff | 2 | −2 MP / 2 | 3 | Not a root; not a steal |
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
| `summon-wisp` | Wisp | mobile healer | 2 | Mend + Rally | 2 | Walks; not a totem |

**None** of these rows set `lineOfSight`, `linear`, `diagonal`, `modifiableRange`, `minRange`, or `maxRange`. **No row sets `mpCost` ≠ 0** (every literal is `BigInt(0)`). No row uses `targetType: "line"` even though `targeting.ts` 531–568 implements that branch. `areaShape` is typed as `circle | cone | line | cross | single` (`gameTypes.ts` 224) but **targeting never reads `areaShape`** — area expansion is Chebyshev around `areaRadius` (`targeting.ts` 641–679). Cross / cone / line *shapes* therefore need `hitTiles` (`castHelpers.ts` 105–117) **or** a later `areaShape` wire. This pass wires cone via `areaShape: "cone"` (the deferred engine read), not a name table.

`CharacterStats.evasion` exists (`gameTypes.ts` 64) and is persisted. Combat never reads it. An evasion spell that only wrote `buffStat: "evasion"` would be a no-op. Wave 3 uses an explicit `evadeNextHits` consume gate **before** `dealDamage`, not a new miss formula inside damage math.

### 1.2 Backend admin seed — `src/backend/lib/admin.mo` `defaultSpells()`

Six ids, still **not** in `SPELL_ID_CATALOG`. They carry targeting flags. All six still have `mpCost = 0`.

| ID | Name | AP | CD | Flags | Notes |
| :--- | :--- | ---: | ---: | :--- | :--- |
| `shadow_strike` | Shadow Strike | 3 | 2 | diagonal, no LoS, range 1–4 | Only diagonal poke |
| `soul_rend` | Soul Rend | 3 | 4 | LoS, DoT 25 | |
| `vampire_bite` | Vampire Bite | 3 | 2 | drain 20/20, adjacent | |
| `reflect_barrier` | Reflect Barrier | 3 | 3 | self, defense | Mirror clone |
| `thunder_clap` | Thunder Clap | 4 | 3 | 8-dir AoE 25 via `hitTiles` | Closest thing to a cross |
| `void_collapse` | Void Collapse | 12 | 5 | attract-all + 80 AoE, `minLevel` 30 | Do not copy |

`OLD_SPELL_NAMES_SET` (`WorldExploration.tsx` 2329–2354) still filters by **name and id**. That heuristic is forbidden going forward (Admin design §1.6).

### 1.3 Engine support vs catalog use (still true, line numbers at this HEAD)

| Mechanic | Engine @ `58302bc` | Live catalog | Already proposed (reserved) |
| :--- | :--- | :--- | :--- |
| Spell `mpCost` debit | `executeCastAttempt` (`WorldExploration.tsx` 17184–17230) gates **AP only**. Spellbook UI can *display* MP (`SpellbookModal.tsx` 964–975). | Always 0 | **This pass: Ley Toll** |
| `areaShape` cone / cross / line | Typed, **unread**. Area = Chebyshev (`targeting.ts` 641–679) | Unused | Cross Cut uses `hitTiles`. **This pass: Fan Bolt wires cone** |
| `targetType: "line"` | Implemented 8-dir ray (`targeting.ts` 531–568). Does **not** read `spell.linear` (linear is only on enemy/area paths at 588 / 662) | **No spell** | File Lance |
| `applyPushback` / `applyAttract` | Implemented (`occupancy.ts` 462 / 517), **no cast callers** | Unused | Shoulder Bash, Hook Line, Crosswind, Void Anchor, Sinkhole, Leash Hook. **This pass: Back Step (self), Slide Tile, Board Tilt** |
| `isSwap` | Caster ↔ one enemy (`spellEngine.ts` 637, 767–768 → `swapPositions`) | Swap | Ward Interpose (ally). **This pass: Pawn Trade (two hostiles, caster stays)** |
| Map `portals` set | Occupancy treats portal tiles as **impassable** (`occupancy.ts` 13–14, 40) | World transitions | **Twin Gate must not reuse this set** |
| `isTrap` | Still `placeBarrier(..., 3)` (`spellEngine.ts` 442–445) | No trap row | Tripwire |
| `CharacterStats.evasion` | Persisted; **unread in combat** | Unused | **This pass: Sidestep Ward (`evadeNextHits`)** |
| Distance-scaled damage | Absent (flat `spell.damage`) | Absent | Glass Shot is min-range sniper, flat. **This pass: Far Sting** |
| Walk / forced-move flag | **No** `movedThisTurn` | Absent | Still Brand punishes *standing*. **This pass: Stride Brand** |
| Walk axis lock | Absent | Slow is MP; Root is zero walk; Grounded Lock is swap/blink | **This pass: Rank Lock** |
| Pit (walk-block, LoS-open) | Barriers block both | Barrier / Smoke (reserved) | **This pass: Open Pit** |
| Stationary healer summon | Five mobile AIs; Bastion is empty-kit wall; Turret shoots | Wisp walks | **This pass: Mercy Font** |
| Ally-scoped range buff | `modifiableRangeBonusRef` is **caster-side** | Lens / Overcast are self | **This pass: Lens Share** |
| Unit next-cast AP tax | Glyph Tax is a **tile** | Drain Courage is immediate −1 AP | **This pass: Hex Toll** |
| MP **steal** (zero-sum) | Frost/Slow **debuff** MP; Haste **grants** | No steal | **This pass: Soul Sip** |

### 1.4 Reserved id tombstone (do not collide)

**Wave 1 tactical (`SPELL_PROPOSALS_2026-08-31.md`):**  
`spell-shoulder-bash`, `spell-hook-line`, `spell-mist-step`, `spell-grave-bell`, `spell-root-snare`, `spell-lens-shift`, `spell-ward-plate`, `spell-pain-link`, `spell-cleanse-rite`, `spell-cinder-tile`, `spell-tripwire`, `spell-glyph-tax`, `spell-stone-turret`, `spell-turret-shard`, `spell-blood-familiar`, `spell-ricochet-mark`, `spell-void-anchor`.

**Discovery Wave 1 (`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md` §11):**  
`spell-quiet-hex`, `spell-chain-ward`, `spell-crosswind`, `spell-glass-shot`, `spell-ember-wake`, `spell-split-mark`, `spell-phase-slip`, `spell-sever-tether`, `spell-overcast`, `spell-second-wind`, `spell-choir-hymn`, `spell-oath-bind`, `spell-leech-tempo`, `spell-null-brand`, `spell-false-retreat`, `spell-blood-benediction`, `spell-ward-interpose`, `spell-martyr-fuse`, `spell-hex-of-silence`. Formal blink id remains `spell-phase-slip` (never add `spell-phase-step`).

**Boss adaptations (`BOSS_AND_SPELL_DISCOVERY.md` §5.2):**  
`spell-ember-step`, `spell-caltrop`, `spell-shock-glyph`, `spell-exsanguinate`, `spell-glyph-snare`, `spell-vault`, `spell-brood-ward`, `spell-aftershock`, `spell-rot-brand`, `spell-echo-cast`.

**Wave 2 tactical (`SPELL_PROPOSALS_2026-09-01.md`):**  
`spell-file-lance`, `spell-fuse-tile`, `spell-coup-de-grace`, `spell-ignite-stacks`, `spell-short-sight`, `spell-tempo-gift`, `spell-absolve`, `spell-cross-cut`, `spell-rime-tile`, `spell-smoke-veil`, `spell-sinkhole`, `spell-leash-hook`, `spell-bastion-pylon`, `spell-blood-tithe`, `spell-goad`, `spell-life-tether`.

**Discovery Wave 2 (`SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md` §11):**  
`spell-load-bearing`, `spell-void-glyph`, `spell-paper-wind`, `spell-rear-cut`, `spell-hold-ground`, `spell-rime-sheet`, `spell-hex-theft`, `spell-still-brand`, `spell-grounded-lock`, `spell-file-lance`, `spell-loan-tempo`, `spell-dispel-thread`, `spell-taunt-oath`, `spell-convert-whelp`, `spell-last-ember`, `spell-blood-tithe`, `spell-search-dust`, `spell-fog-hood`, `spell-claim-ward`, `spell-self-anchor`, `spell-pack-howl`, `spell-reliquary-lock`.

**Known same-id collisions already on paper (not this pass’s job to rename):**  
`spell-file-lance` (tactical W2 line poke **and** Discovery W2); `spell-blood-tithe` (tactical W2 pet sacrifice **versus** Discovery W2 HP→AP — **different fantasies, same id**). Implementers must pick one owner before data-entry. Wave 3 does not add a third.

**Fantasy overlaps to not clone a third time:** Short Sight ≈ Paper Wind (range cut); Tempo Gift ≈ Loan Tempo (AP grant); Goad ≈ Taunt Oath (forced target); Rime Tile ≈ Rime Sheet (ice tax); Lens Shift / Overcast (self range).

**Duplicates still forbidden to clone:** Shield ≈ Iron Skin; Blood Mend ≈ Rallying Cry; Poison ≈ Venom; Expose ≈ Shadow Veil; Mirror ≈ Reflect Barrier.

---

## 2. Remaining gap map (after reserved proposals)

| Family | Still missing (this pass) | Not this pass (already reserved or live) |
| :--- | :--- | :--- |
| RESOURCE mpCost | First spell with `mpCost > 0` (competes with walking) | Every live row is 0; Haste/Second Wind **grant** MP |
| DAMAGE cone | `areaShape: "cone"` engine read + a real cone card | Nova/Thunder Clap circle/8-dir; Cross Cut plus via `hitTiles` |
| DAMAGE distance | Payload grows with Chebyshev | Glass Shot is min-range, flat; File Lance is per-body on a ray |
| DAMAGE moved-condition | Bonus if the target **changed cell** this round | Still Brand punishes standing; Rear Cut is facing |
| POSITION two-hostile swap | Swap two hostiles; caster stays | Swap is caster↔enemy; Ward Interpose is ally swap |
| POSITION self knockback | `applyPushback` on the **caster** | Mist Step / Phase Slip teleport; Vault is boss dash; False Retreat |
| POSITION portal-pair | Two walkable pads that teleport between them | Map `portals` are impassable; Claim Ward blocks swap-onto |
| POSITION mass shove | All other bodies 1 step (signature, not learnable) | Shoulder Bash is one body; Board Tilt is this pass’s `NOT_PLAYER_LEARNABLE` |
| CONTROL MP steal | Zero-sum: they lose 1, you gain 1 **this turn** | Frost/Slow debuff; Haste grants; Drain Courage is AP |
| CONTROL next-cast AP tax | Unit-scoped +1 AP on **their next spell** | Glyph Tax is a tile; Quiet Hex is a different Discovery card |
| CONTROL axis lock | May walk, but only along current rank **or** file | Root = 0 walk; Slow = less MP; Grounded Lock = no swap/blink |
| DEFENSE evade | Next damaging hit misses (consume) | Mirror reflects; Ward Plate absorbs; evasion stat unread |
| SUPPORT ally range | +range on **their** `modifiableRange` casts | Lens / Overcast write the caster |
| TERRAIN pit | Unwalkable, LoS **open** | Barrier blocks both; Smoke is walkable LoS-block |
| TERRAIN conveyor | Enter → auto-push 1 in a stored dir | Slide is not ice tax, not fuse, not pit |
| SUMMONS heal totem | Stationary, no pathing, ally heal pulse | Wisp walks; Bastion empty kit; Turret shoots |
| COMBINATION | MP spend vs walk; cone × rank-lock; gates × pits; steal × Ley Toll | See §6 |

**Still open after this wave (do not fill today):** cone+knockback as one id; two-ally swap; mid-combat initiative rewrite; player-owned Echo Cast; HP+MP hybrid cost; facing damage beyond Rear Cut; second `mpCost > 0` damage nuke (Ley Toll is the first MP spender, not a snipe). Those stay Wave 4 so this pass stays discrete.

---

## 3. Contract with Dynamic Spell Discovery

Coordinate with Discovery (`c26e5a83-…`) and Admin (`4efa22ec-…`). This pass only stamps acquisition so those layers can filter **by field**.

### 3.1 Discovery is still inert (reconfirmed @ `58302bc`)

1. All 32 frontend spells are forced `isBaseSpell` (`WorldExploration.tsx` 2356–2368).
2. Recap grants XP/Doka/feats only.
3. Achievements (`defaultAchievements`, `admin.mo` 309–326) grant Doka only.
4. Challenges (`DEFAULT_CHALLENGES` 38–103) grant Doka/XP/badge only.
5. `upgradeSpell` levels a known id; it does not unlock ids.
6. `ENEMY_KITS` (`enemyAI.ts` 156–178) still reuse always-owned ids. Seeing a bishop cast Frost teaches nothing.
7. `buildEnemyKit` still takes `levelZone`. Discovery already recorded that a non-number → `NaN` → every kit stays zone 0.
8. `executeCastAttempt` still does not debit `spell.mpCost`. Shipping Ley Toll without that debit makes the card free.

**Prerequisite (owned by Discovery, not this pass):** split the 32-id blob. Innate seed remains Strike + Shield + Poison Arrow + Blood Mend. Do **not** append Wave 3 ids to `starterSpells` as base. Do **not** land Wave-3 data before Wave-1 ownership split (`SDE-2026-08-31-001`).

### 3.2 Rules for every proposed spell

- Persist grants through the **same atomic recap/backend funnel** as rewards (`ownedSpellIds` on the character, not `localStorage` as authority).
- Filters: `usableByPlayer` / `usableByEnemy` / `minLevel` / `acquisitionModel` / `discoveryEligible` / `discoverySources`.
- Enemy AI selects by **id** in `assignedSpells` / `summonKit` / `aiHint`, never `spell.name.includes(...)`. New `summonAI: "font"` is a **string enum on the config**, not a parse of `"Mercy Font"`.
- `NOT_PLAYER_LEARNABLE` may appear in kits so the player can *see* them. Witness without grant. Maps to Discovery `ENEMY_ONLY` / `BOSS_ONLY` for persist (never written to owned ids).
- Default observe path (Discovery §3): hostile **uses** the id (WX `kind: "cast"` + AP spend, and after the MP gate lands, MP spend too) → persist observation → **same-encounter win** → `commitSpellDiscoveries`. Possession is not observation. Hit is not required. Fizzle that spent AP/MP **does** observe.
- Twin Gate **arming** (pad placed, AP/MP spent) **is** observation. A later teleport trigger is **not** a second observe (same rule as Discovery W2 Hold Ground).
- Do not require “see it N times” except where a boss adaptation already does. Wave 3 defaults `allowLaterVictory: false`.
- Do not gate on `unstoppable` / `level_10` (Discovery W2: that feat is a milestone, not a last tier). Tempo Gift already claimed it.

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

### 3.4 Doors this pass actually stamps (avoid taken keys)

Already claimed by prior waves (do not reuse as the **only** door):

| Door | Taken by |
| :--- | :--- |
| `unstoppable` | Tempo Gift (W2 tactical) |
| `spell_scholar` | Lens Shift (W1) |
| `survivor` / `easy_1` | Cleanse Rite (W1) |
| `jackpot` / `hard_1` | Absolve (W2) |
| `hard_2` | Blood Tithe (W2) / Mist Step optional |
| `hard_3` | Hook Line / Sinkhole |
| `legendary_1` | Mist Step |
| `explorer` | Search Dust (Discovery W2) |
| `pacifist_run` | Blood Benediction |
| `leader_slayer` / `spell_master` | Ward Interpose / Stone Turret |
| `easy_2` | Self Anchor (Discovery W2) |
| `midnight_bishop` | Life Tether |
| `chessboard_lich` | Claim Ward |
| `twin_monarchs` | Choir Hymn |

Wave 3 doors: `easy_3`, `critical_striker`, `loot_hunter`, `double_betrayal`, `void_grandmaster`, plus piece-type observe paths.

### 3.5 New `effectParams` keys for this pass

Parsers whitelist. Unknown keys ignored. Missing key → effect does not fire. Do **not** add name tables.

`mpCost` is already a first-class `SpellConfig` field. Ley Toll sets it on the row; it is **not** an effectParam.

Reuse from earlier waves where the meaning is identical: `attractDistance`, `pushDistance` (Back Step uses a **self** variant below).

**New keys (Wave 3 only):**

```text
nextSpellDamageMul, nextSpellCharges,   // Ley Toll
coneLength,                             // Fan Bolt; 8-dir wedge, not hitTiles
swapTwoHostiles, swapSearchRadius,      // Pawn Trade — NOT isSwap
selfPushDistance, selfPushFromTarget,   // Back Step — applyPushback(caster, target)
gatePairDuration,                       // Twin Gate; walkable pads, not occupancy.portal
evadeNextHits,                          // Sidestep Ward — miss gate before dealDamage
distanceDamageBase, distanceDamagePerTile, distanceMaxBonus,  // Far Sting
stealMpAmount,                          // Soul Sip — this-turn current MP
pitBlocksWalk, pitBlocksLos,            // Open Pit
allyRangeDelta, allyRangeDuration,      // Lens Share — target-scoped
movedThisTurnBonus,                     // Stride Brand — reads movedThisTurn flag
nextCastApTax, nextCastApTaxDuration,   // Hex Toll — their next spell only
slideDistance, slideDuration,           // Slide Tile — dir = caster→target at paint
walkAxisLockTurns,                      // Rank Lock — rank XOR file of caster→target
massPushDistance, massPushExcludeCaster // Board Tilt
```

If a key is missing, the rider does not fire.

Nested kit-only id (not a player card): `spell-font-pulse` — same pattern as `spell-turret-shard`.

---

## 4. Power budget (relative, not a new math model)

Do not touch damage formulas. Numbers are base `SpellConfig.damage` / effect params; existing `spellDmgGrowthPercent` / `upgradeSpell` apply.

| Band | AP | Expected payload | Anchor |
| :--- | ---: | :--- | :--- |
| Cheap tool | 2 | 8–12 dmg **or** strong position/control, not both at full | Strike 10 / Slow |
| Standard | 3 | ~18–22 **or** 12 + movement **or** clean utility | Frost 20 / Swap |
| Heavy | 4–5 | AoE / delayed / summon, CD 2–3 | Chain / Inferno |
| Signature | 6 + CD 4+ | Multi-axis; usually not player-learnable | Do not copy Void Collapse 12/80 |

Conditional riders stay small so the **decision** is the power. MP on Ley Toll is paid in **walk tiles**, not in extra AP.

---

## 5. Proposed spells (Wave 3)

All rows: `STATUS: PROPOSED`. `mpCost: 0` unless noted. `isBaseSpell: false`. None of these ids exist in `spellData.ts` or in the reserved tombstone (§1.4).

---

### SPELL_ID: `spell-ley-toll`

NAME: Ley Toll  
ROLE: SUPPORT — next-cast amp paid in MP (first `mpCost > 0`)  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 2  
EFFECT: `mpCost: 2` (first-class field). No damage. `effectParams: {"nextSpellDamageMul":1.25,"nextSpellCharges":1}`. The caster’s **next** damaging spell (`damage > 0` or `isDotSpell`) applies ×1.25 to that hit’s **base** `spell.damage` / `dotDamage` **before** existing SP/RES/SR/crit/Mark — do **not** rewrite `dealDamage`; pass the already-multiplied base into the existing helper. Charge consumes even if the next cast fizzles. Distinct from Enrage (+40% for 2 **turns**, AP 3, 0 MP) and from Mark (tile ×2). The decision is **2 walk tiles vs a fatter nuke**.  
DURATION: until 1 damaging cast or battle end  
SCALING: multiplier fixed.  
SYNERGIES: Far Sting / Fan Bolt / Frost / Ignite; Soul Sip to pay the MP; `hard_3` is unaffected (MP is not AP).  
COUNTERPLAY: Quiet Hex / Hex Toll the primed caster; walk them off MP with ice / slide so they cannot pay; force them to fizzle the charge.  
POWER_BUDGET: Cheap AP. 1.25× Frost 20 = 25, paid with 2 MP + 2 AP + CD 2. Without a follow-up, it is a dead turn.  
AI_USAGE: `aiHint: "prime_if_mp_ge_2_and_nuke_ready"`. Bishops / queens zone ≥ 1. Skip if `currentMp < 2` **or** no damaging id is off cooldown. Never prime as the last action of the turn if they still need to walk.  
DISCOVERY_ELIGIBILITY: `discoveryEligible: true`, `discoveryWeight: 10`, `discoverySources: { pieceTypes: ["bishop","queen"], levelZoneMin: 1 }`  
EDGE_CASES: `executeCastAttempt` must reject when `currentBattleMp < mpCost` **and** debit MP on the same `castResultSpendsAp` path as AP (`WorldExploration.tsx` 17184–17230 today is AP-only — **this card is illegal to ship without that debit**). Fizzle spends MP (observation still fires). Do not run walk `mapModifierRegistry.applyMpCost` on spell MP (Frozen/Slime is a **walk** modifier). Timestep refill after a prime does not add charges. `nextSpellCharges` does not stack; last writer wins. Challenge: MP spend is **not** `recordChallengeApSpend`.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — MP gate in the unified cast helper; one consume flag on the caster.  
STATUS: PROPOSED

**SpellConfig sketch**

```text
id: spell-ley-toll
effectType: buff
effectCategory: buff
spellType: damage
targetType: self
areaShape: single
apCost: 2
mpCost: 2
damage: 0
range: 0
cooldown: 2
usableByPlayer: true
usableByEnemy: true
minLevel: 1
isBaseSpell: false
effectParams: {"nextSpellDamageMul":1.25,"nextSpellCharges":1}
```

---

### SPELL_ID: `spell-fan-bolt`

NAME: Fan Bolt  
ROLE: DAMAGE direct — cone  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: area  
LOS: true  
COOLDOWN: 2  
EFFECT: `areaShape: "cone"`, `areaRadius: 3`, `hitsMultiple: true`, `aoe: true`, `hitsAllies: false`. Click a tile in an 8-dir facing. Deal 10 to each hostile whose cell is in the cone: Chebyshev 1..3 from the **caster**, 8-dir from caster→click is the facing **or a 45° neighbor** (90° wedge), LoS required, walls/barriers stop that ray only. **Do not** fake this with a static `hitTiles` list (that cannot rotate). This **is** the Wave-2-deferred `areaShape` wire. Distinct from Frost Nova (Chebyshev circle around target), Thunder Clap (8-dir `hitTiles` around target), Cross Cut (plus from target), File Lance (cardinal ray).  
DURATION: instant  
SCALING: 10 follows dmg%; wedge geometry fixed.  
SYNERGIES: Rank Lock / Root / Glyph Tax hold bodies in the wedge; Shoulder Bash onto the fan; Smoke on the other files so they step into the cone.  
COUNTERPLAY: Step to the back-diagonal (outside the 90°); Barrier a spoke; hug the caster (Chebyshev 0 is excluded — `playerSpellAllowsCasterTile` stays false for `area`).  
POWER_BUDGET: Standard. 10×1 = Strike; 10×2–3 requires they clustered in a facing.  
AI_USAGE: `aiHint: "cone_if_two_hostiles_in_wedge"`. Queens / kings zone ≥ 1. Skip if the wedge contains only one and Frost is in kit.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["queen","king"]`, `levelZoneMin: 1`  
EDGE_CASES: Preview, live gate, and execute must share one cone helper (same contract as `computeTargetableTiles` === `isTileCastableLive`). Do not hit allies / player-side summons. `areaShape !== "cone"` must not enter this helper. Until the wire exists, **do not** ship a facing-agnostic Chebyshev blob and call it Fan Bolt.  
IMPLEMENTATION_COMPLEXITY: HIGH — first `areaShape` reader in `targeting.ts` 641–679 and a matching hit collector in `castHelpers.ts`.  
STATUS: PROPOSED

**SpellConfig sketch**

```text
id: spell-fan-bolt
effectType: damage
effectCategory: damage
spellType: damage
targetType: area
areaShape: cone
areaRadius: 3
range: 3
lineOfSight: true
hitsMultiple: true
aoe: true
hitsAllies: false
usableByPlayer: true
usableByEnemy: true
effectParams: {"coneLength":3}
```

---

### SPELL_ID: `spell-pawn-trade`

NAME: Pawn Trade  
ROLE: POSITION — swap two hostiles (caster stays)  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: **Not** `isSwap` (that path is caster ↔ target via `swapPositions`, `spellEngine.ts` 767–768). `effectParams: {"swapTwoHostiles":true,"swapSearchRadius":3}`. Target one living hostile. Find the nearest **other** living hostile within Chebyshev `swapSearchRadius` of **that target** (not of the caster). Swap those two bodies through occupancy (`isCellFree` vacated-pair: both cells are legal because they exchange). Caster does not move. If no second body, fizzle (AP spent). Distinct from Swap, Ward Interpose (ally), Claim Ward (tile cannot be swapped **onto** — if the destination cell is claim-warded, that body does not land there and the whole swap fizzles).  
DURATION: instant  
SCALING: none.  
SYNERGIES: Fuse / Cinder / Open Pit / Slide / Rank Lock on one body — trade the safe one onto the trap; Goad the frontliner then trade them back; File Lance after they share a file.  
COUNTERPLAY: Isolate (one body); Self Anchor (Discovery W2) on a body that must not move; stay outside the 3-radius pair.  
POWER_BUDGET: Standard utility, 0 damage, CD 2. Power is the board, not the number.  
AI_USAGE: `aiHint: "swap_two_hostiles_if_improves_frontline"`. Kings / queens with ≥2 player-side bodies (player + summon). Skip if pack size < 2. Enemy caster: the two hostiles are **player-side**.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["king","queen"]`, `levelZoneMin: 1`  
EDGE_CASES: Do not call `swapPositions(targetEnemyId)` (that is the player↔enemy helper). Three-body ties: nearest Chebyshev, then lowest id. Summon + player is a legal pair. Hazard on landing: **must tick** (MIMA-2026-08-31-001 — Swap today copies coords only; this card is not license to leave that broken, but do not rewrite global Swap in the same PR as the data). Challenge: the swap is not a spell-hit; no `recordChallengeDamageTaken` unless a dest hazard deals damage through the existing environmental helper.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — occupancy pair swap; new flag, not `isSwap`.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-back-step`

NAME: Back Step  
ROLE: POSITION — self knockback  
ACQUISITION: CHALLENGE  
AP_COST: 2  
RANGE: 1  
TARGET_TYPE: enemy  
LOS: false  
COOLDOWN: 1  
EFFECT: `effectParams: {"selfPushDistance":2,"selfPushFromTarget":true}`. Call `applyPushback(casterCell, targetCell, 2, occupancy)` — the **caster** is pushed away from the targeted adjacent hostile. Collision stops (`occupancy.ts` 462–496). No damage. Distinct from Mist Step / Phase Slip (teleport to a chosen free cell), Vault (boss dash), False Retreat, Shoulder Bash (they move). You need a body to kick off; empty-tile blink is a different card.  
DURATION: instant  
SCALING: distance fixed.  
SYNERGIES: Ley Toll then step out of melee; Slide / Cinder / Fuse behind you (you choose to land on it); Far Sting after creating distance; Open Pit behind the enemy so **they** cannot follow.  
COUNTERPLAY: Corner them (push distance 0); Root the caster first; occupy the two tiles behind them.  
POWER_BUDGET: Cheap tool. 0 damage. CD 1 because the collision rule already caps it.  
AI_USAGE: `aiHint: "self_push_if_adjacent_and_unsafe"`. Knights / pawns zone ≥ 1. Skip if already at desired range or the push cell is a pit / lava.  
DISCOVERY_ELIGIBILITY: true. `challengeIds: ["easy_3"]` (`under_50_damage` — the kiting lesson). Observation not required.  
EDGE_CASES: Range 1 Chebyshev. Diagonal adjacent is legal. If `selfPushFromTarget` is missing, do not guess from the name. Push onto a Twin Gate pad **does** teleport (walk-enter rule) if the pad is walkable. Death-realm portal guards do **not** fire (this is not a world portal). `movedThisTurn` = true on a successful ≥1 tile slide (Stride Brand).  
IMPLEMENTATION_COMPLEXITY: LOW–MEDIUM — resolver exists; zero cast callers today.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-twin-gate`

NAME: Twin Gate  
ROLE: POSITION — portal-pair  
ACQUISITION: BOSS  
AP_COST: 4  
RANGE: 4  
TARGET_TYPE: ground  
LOS: true  
COOLDOWN: 3  
EFFECT: `freeCells: true`. `effectParams: {"gatePairDuration":3}`. One cast plants **two walkable pads**: pad B on the targeted empty floor cell, pad A on the **caster’s current cell** (side effect — do not require clicking self; ground targeting rejects the caster tile, `targeting.ts` 129–137). For 3 turns, a unit that **enters** a pad (walk, push, pull, slide, swap landing) teleports to the **other** pad if that cell is `isCellFree` after vacating the source; else the unit stays (teleport fizzles, they occupy the source pad). 0 extra MP for the teleport. Distinct from map portals: occupancy `portals` are **impassable** (`occupancy.ts` 13–14). Twin Gate pads **must** live in a new `gatePads` table, never in `portals`. Distinct from Swap, Mist Step, Claim Ward.  
DURATION: 3 turns, then both pads expire  
SCALING: duration fixed.  
SYNERGIES: Open Pit / Fuse / Cinder / Glyph Tax on one pad; Back Step onto your pad; Rank Lock so they cannot walk around the pair; Goad through a gate.  
COUNTERPLAY: Occupy the dest pad; Barrier the dest (last writer vs pad — **Barrier replaces the pad** on that cell); stand off the pads.  
POWER_BUDGET: Heavy utility, 0 damage, CD 3.  
AI_USAGE: `void_grandmaster` already casts Swap — this is the **player** adaptation (weaker: pads, not an instant body swap). `aiHint: "gate_behind_self_if_kiting"`. If given to a world caster: skip if dest is adjacent to the player (they will use it).  
DISCOVERY_ELIGIBILITY: true. `bossIds: ["void_grandmaster"]`. Observation **false** (BOSS route, first victory). Not room-0 farm — same rule as other BOSS grants.  
EDGE_CASES: Do **not** plant on occupancy reserved / world-portal / void / barrier cells. Last writer on a cell: Barrier > pad > fuse/rime/smoke (pad is a structure). Entering a pad is not a world-portal; do **not** `armDeathGuards`. Destination hazard **must tick** (MIMA swap/walk gap). Re-entering the dest pad the same resolution does **not** bounce-loop: one teleport per enter event. Two Twin Gates: one pair per caster; a second cast replaces that caster’s pair. `movedThisTurn` = true on a successful teleport.  
IMPLEMENTATION_COMPLEXITY: HIGH — new tile table, walk + forced-move enter hook, must not touch map generation or world portals.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-sidestep-ward`

NAME: Sidestep Ward  
ROLE: DEFENSE — evade next hit  
ACQUISITION: ACHIEVEMENT  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: No damage. `effectCategory: "defense"`. `effectParams: {"evadeNextHits":1}`. The next **damaging** instance that would call `dealDamage` (or environmental spell-hit) against this unit **misses**: no HP loss, no absorb chew, no DoT apply from that hit. Then the charge is consumed. Do **not** implement as `buffStat: "evasion"` — that field is unread and wiring it as a percent miss would be a damage-math change. This is a Mirror-shaped consume gate **before** the formula. Distinct from Mirror (reflects the spell at the attacker), Ward Plate (absorb), Iron Skin (RES%).  
DURATION: until 1 miss or 2 turns, whichever first (`buffDuration: 2` as the timeout)  
SCALING: charges fixed.  
SYNERGIES: `legendary_1` / Untouchable — a miss is not damage taken; Goad so the hit they must throw is the one you dodge; Life Tether does not split a miss.  
COUNTERPLAY: Throw a 0-damage control first (Slow / Short Sight) to **not** consume, then the real hit; wait 2 turns; AoE: **each** damaging instance against this unit can consume (first one misses, second hits — do not make the whole Fan Bolt miss).  
POWER_BUDGET: Cheap, long CD, 0 damage. One swing.  
AI_USAGE: Player-leaning (`usableByEnemy: true` still, so observation kits can show it). `aiHint: "evade_if_player_adjacent_and_can_strike"`. Skip if already shielded with Ward Plate.  
DISCOVERY_ELIGIBILITY: true. `achievementIds: ["critical_striker"]` (`critical_5_in_battle`). Usually `usableByEnemy: false` on the granted row is OK; keep `true` so a champion can demonstrate it.  
EDGE_CASES: DoT **ticks** after apply are not “the hit” — the apply is. If the apply missed, no stack. Lava/spikes: if treated as environmental, **do not** consume Sidestep (keep the consume for spell-hits / `recordChallengeDamageTaken` path). Challenge `no_damage_taken`: a miss does not increment `totalDamage`. Sacrifice self-HP is not an incoming hit — do not evade it.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — one flag in the incoming-hit pipeline, not inside `computeDamage`.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-far-sting`

NAME: Far Sting  
ROLE: DAMAGE direct — distance-scaled  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 3  
RANGE: 5  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 1  
EFFECT: `modifiableRange: true`, `minRange: 2`, `lineOfSight: true`. `effectParams: {"distanceDamageBase":6,"distanceDamagePerTile":4,"distanceMaxBonus":16}`. Payload = `base + perTile * Chebyshev(caster,target)`, capped so bonus ≤ 16, then passed as `spell.damage` into existing `dealDamage`. At dist 2: 6+8=14. At dist 5: 6+16=22 (cap). Distinct from Glass Shot (minRange 3, **flat** snipe) and File Lance (per body on a ray). Close is worse than Strike; far is Frost-adjacent.  
DURATION: instant  
SCALING: both keys follow dmg%; cap fixed.  
SYNERGIES: Back Step / Twin Gate to create distance; Short Sight / Paper Wind **hurts this card** (range shrink — decision); Lens Share on an ally who holds it; Rank Lock to keep them at 5.  
COUNTERPLAY: Walk to Chebyshev 1 (below `minRange`); Smoke the file; Barrier.  
POWER_BUDGET: Standard. 14 at min is below Frost; 22 at max equals Frost without the MP debuff, but requires a 5-tile hole.  
AI_USAGE: `aiHint: "sting_if_chebyshev_ge_3"`. Bishops zone ≥ 2. If dist == 2 and Frost is in kit, prefer Frost.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["bishop"]`, `levelZoneMin: 2`  
EDGE_CASES: Missing keys → 0 bonus (only `SpellConfig.damage` if set — **set `damage: 0`** and require the params so a forgotten parser cannot fire a flat 0 forever without a test). `minRange: 2` so it cannot replace Strike. Mark on the dest tile still applies via existing Mark (tile amp) — that is a tile flag, not a name check.  
IMPLEMENTATION_COMPLEXITY: LOW — one Chebyshev multiply before `dealDamage`.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-soul-sip`

NAME: Soul Sip  
ROLE: CONTROL — MP steal (zero-sum)  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: No HP damage. `effectCategory: "cc"`. `effectParams: {"stealMpAmount":1}`. If target `currentMp >= 1`, subtract 1 from **current** MP (not max) and add 1 to caster **current** MP this turn, capped at max 20. If target MP is 0, fizzle rider (AP still spent). Distinct from Slow (−2 MP for 2 **turns** of max/current debuff), Frost (−1 MP **debuff duration** 1), Haste (+2 without stealing), Drain Courage (AP).  
DURATION: instant (current-turn MP only; no lingering debuff)  
SCALING: amount fixed.  
SYNERGIES: Ley Toll (stolen MP pays the 2-cost); ice / Rank Lock so they cannot spend the last MP walking; Far Sting after you took their approach MP.  
COUNTERPLAY: Spend MP before the sip; sit at 0 MP and walk 0; Second Wind after.  
POWER_BUDGET: Cheap control, 0 damage, CD 2.  
AI_USAGE: `aiHint: "steal_mp_if_target_mp_ge_2"`. Bishops zone ≥ 1. Skip if target MP is 0 or caster is already at max MP **and** has no Ley Toll.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["bishop","pawn"]`, `levelZoneMin: 1`  
EDGE_CASES: Do not write `debuffStat: "mp"` — that would linger like Slow. Summons with 0 max MP: fizzle. Challenge: not a heal, not AP.  
IMPLEMENTATION_COMPLEXITY: LOW.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-open-pit`

NAME: Open Pit  
ROLE: TERRAIN — unwalkable, LoS open  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ground  
LOS: true  
COOLDOWN: 2  
EFFECT: `freeCells: true`. `effectParams: {"pitBlocksWalk":true,"pitBlocksLos":false}`. Paint one floor cell as a pit for 3 turns. Occupancy `isCellFree` returns false (new `pitTiles` set — **not** `barrierTiles`). Bresenham LoS **ignores** pits (unlike Barrier / Smoke). Units already on the cell when painted are **not** displaced (they stand in the hole until they leave; leaving spends MP as a normal step onto an adjacent free cell). Distinct from Barrier (blocks LoS), Smoke (walkable LoS-block), Open Pit’s opposite.  
DURATION: 3 turns  
SCALING: duration fixed.  
SYNERGIES: File Lance / Far Sting through the pit (LoS open); Back Step so melee cannot follow; Twin Gate dest = pit (teleport fizzles if dest is not `isCellFree` — **pit is not free**, so gates cannot dump into a pit; plant the pit on the **approach** instead); Rank Lock + pit on the only step.  
COUNTERPLAY: Walk around; Barrier last-writer **fills** the pit (solid wall — you paid LoS); Mist Step over.  
POWER_BUDGET: Standard utility.  
AI_USAGE: `aiHint: "pit_on_melee_approach"`. Rooks zone ≥ 1. Skip if the player is already at range 4 with Far Sting (you just gave them a LoS tunnel).  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["rook"]`, `levelZoneMin: 1`  
EDGE_CASES: AI pathing and player `findPath` must both see pits (MIMA walk × occupancy). Summon spawn reserved cells: do not pit a reserved progression cell. Last writer vs fuse/rime/smoke: pit wins vs those paints; Barrier wins vs pit. Flying does not exist — no exception.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — occupancy + LoS split.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-mercy-font`

NAME: Mercy Font  
ROLE: SUMMONS — stationary healer totem  
ACQUISITION: ACHIEVEMENT  
AP_COST: 4  
RANGE: 2  
TARGET_TYPE: ground  
LOS: false  
COOLDOWN: 3  
EFFECT: `isSummon: true`, `summonAI: "font"`, `summonLifespan: 4`, `freeCells: true`. `summonUnitDef`: pieceType `font` (not a chess piece name heuristic), hpScale 0.6, damageScale 0, `ap: 2`, `mp: 0`. **Does not path.** Kit: `spell-font-pulse` only (below). Distinct from Wisp (walks, Mend+Rally), Bastion Pylon (empty kit wall), Stone Turret (shard bolt), Blood Familiar (sacrificial).  
DURATION: lifespan 4  
SCALING: hpScale with summon rules; pulse heal fixed.  
SYNERGIES: Load Bearing / Chain Ward on the font; Leash Hook the font forward; Cursed Wound on the enemy so the pulse is half-value — still a decision. `no_healing` / `hard_1`: the **pulse** is `spellType: "heal"` and fails those challenges; **planting** the font is not a heal.  
COUNTERPLAY: Kill the post (0.6 HP); Null Brand lockout; Cursed Wound the ally it is topping.  
POWER_BUDGET: Heavy, CD 3, 0 direct damage.  
AI_USAGE: Player-leaning. If a pale buffer gets it: `aiHint: "font_behind_ally"`. `inferSummonArchetype` must key `summonAI === "font"`, **never** `name.includes("font")`.  
DISCOVERY_ELIGIBILITY: true. `achievementIds: ["loot_hunter"]` (`loot_10_doka`). `usableByEnemy: false` on the player row; a later kit may flip it.  
EDGE_CASES: `summonAI: "font"` empty pathing (like turret). Pulse uses `recordChallenge` heal flag. Do not give the font `starter-heal` (self) — that would teach the wrong targetType. Spawn reserved cells: same dual-path as other summons.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — new AI string + kit id.  
STATUS: PROPOSED

**Kit-only:** `spell-font-pulse` — AP 2, `healAmount: 8`, range 2, `targetType: "ally"`, `spellType: "heal"`, `acquisitionModel: NOT_PLAYER_LEARNABLE`, `usableByPlayer: false`, `usableByEnemy: true`.

---

### SPELL_ID: `spell-lens-share`

NAME: Lens Share  
ROLE: SUPPORT — ally range buff  
ACQUISITION: MULTI_SOURCE  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 3  
EFFECT: `effectParams: {"allyRangeDelta":2,"allyRangeDuration":2}`. For 2 turns, the **target** (ally or self) adds +2 range to casts they make with `modifiableRange: true`, still capped by `levelUpConfig.maxSpellRange`. Does **not** write the caster’s `modifiableRangeBonusRef` unless the target **is** the caster. Distinct from Lens Shift / Overcast (self only). Strike stays unmodified unless a later row sets `modifiableRange` (do not silently flip Strike).  
DURATION: 2 turns  
SCALING: delta fixed.  
SYNERGIES: An Archer / ally holding Far Sting or Hook; Wisp does not need it. Short Sight on **them** fights this (last writer per unit: penalty vs bonus — **add** then clamp min 1, do not name-check).  
COUNTERPLAY: Kill the buffer; Short Sight the sniper; walk into minRange.  
POWER_BUDGET: Cheap, CD 3, 0 damage.  
AI_USAGE: `aiHint: "range_buff_ally_with_modifiable"`. Skip if no ally holds `modifiableRange: true`.  
DISCOVERY_ELIGIBILITY: true. Bishop observe+win (`pieceTypes: ["bishop"]`, `levelZoneMin: 2`) **or** `achievementIds: ["double_betrayal"]`. First grant wins.  
EDGE_CASES: Targeting ally already allows self (`targeting.ts` 476–479). Two Lens Shares: replace on that unit. Do not also apply Lens Shift’s caster ref.  
IMPLEMENTATION_COMPLEXITY: LOW — target-scoped copy of the existing bonus ref.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-stride-brand`

NAME: Stride Brand  
ROLE: DAMAGE conditional — bonus if they moved  
ACQUISITION: ELITE  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: Deal 8. Then if the target’s `movedThisTurn === true`, deal `movedThisTurnBonus` (12) as a second existing `dealDamage` call (two hits, two Mark chances if the tile is marked — **explicit: both are spell-hits**). `effectParams: {"movedThisTurnBonus":12}`. Reads a **flag**, never “did they path.” Distinct from Still Brand (punish standing), Rear Cut (facing), Grave Bell (HP window).  
DURATION: instant  
SCALING: 8 and 12 follow dmg%.  
SYNERGIES: Slide / Back Step / Pawn Trade / Twin Gate / Board Tilt / Shoulder Bash **set the flag**; ice tax does not (they may not have left). The decision: shove them, then brand.  
COUNTERPLAY: Stand still; Grounded Lock / Rank Lock so they cannot (or will not) move; cleanse does not clear `movedThisTurn` (it is not a debuff — it is a turn flag).  
POWER_BUDGET: Standard. 8 if they camped (worse than Frost). 20 if they stepped (Frost-equal, two hits).  
AI_USAGE: `aiHint: "stride_if_movedThisTurn"`. Elite knights. If flag is false and Strike is in kit at range 1, skip.  
DISCOVERY_ELIGIBILITY: true. `eliteOnly: true`, `pieceTypes: ["knight"]`, `levelZoneMin: 2`  
EDGE_CASES: **Implementers must set `movedThisTurn`** on successful walk, push, pull, swap landing, slide, and gate teleport; clear it at **that unit’s** turn start. The flag does not exist today. Forced movement on the **enemy turn** still counts until their next start. Missing param → 8 only.  
IMPLEMENTATION_COMPLEXITY: MEDIUM — flag plumbing on occupancy commits.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-hex-toll`

NAME: Hex Toll  
ROLE: CONTROL — next spell they cast costs +1 AP  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: No damage. `effectParams: {"nextCastApTax":1,"nextCastApTaxDuration":2}`. The target’s next **spell** cast (not walk) costs `apCost + 1` for 2 turns or until they successfully spend on a spell, whichever first. Distinct from Glyph Tax (tile), Drain Courage (immediate −1 current AP), Quiet Hex (Discovery — do not clone its fizzle), Loan Tempo / Tempo Gift (grants).  
DURATION: 2 turns or 1 taxed cast  
SCALING: tax fixed.  
SYNERGIES: `hard_3` (≤8 AP/turn) — their 4-cost Inferno becomes 5; Ley Toll on you is unrelated; Rank Lock so they waste the window walking.  
COUNTERPLAY: Walk and wait 2 turns; cast a 2-cost tool to burn the tax; Cleanse / Absolve / Dispel Thread if those strip this **debuff** (`type: "debuff"`, `stat: "ap"` tax flag — strip lists must include it via `cleanseTypes`, not via name).  
POWER_BUDGET: Cheap control, 0 damage.  
AI_USAGE: `aiHint: "ap_tax_if_target_holds_cost_ge_3"`. Bishops / hex families zone ≥ 1. Skip if the player’s bar is all 2-cost.  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["bishop"]`, `levelZoneMin: 1`  
EDGE_CASES: Tax applies inside `executeCastAttempt` **after** `applyApCost` map modifiers (Arcane Surge then +1, not instead of). If they cannot pay, the cast rejects (`no_ap`) and the tax **remains**. Fizzle that spent AP consumes the tax (they paid the inflated cost). Walk / potions do not consume it.  
IMPLEMENTATION_COMPLEXITY: LOW–MEDIUM — one flag in the AP gate.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-slide-tile`

NAME: Slide Tile  
ROLE: TERRAIN — conveyor  
ACQUISITION: ENEMY_DISCOVERY  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ground  
LOS: true  
COOLDOWN: 2  
EFFECT: `freeCells: true`. Paint one floor cell for 3 turns. Direction = 8-dir from **caster to the painted cell** stored on the tile (`slideDistance: 1`). A unit that **enters** the cell (walk dest, push/pull/swap/gate landing) is then `applyPushback` 1 along that stored dir. Standing on it at paint time does **not** slide (enter-only). Distinct from Rime (MP tax, no auto-move), Fuse (delayed damage), Cinder (tick).  
DURATION: 3 turns  
SCALING: distance 1 fixed.  
SYNERGIES: Open Pit / Fuse / Cinder **one tile further** on the dir; Rank Lock so the only legal step is onto the slide; Stride Brand after they are forced; Back Step onto your own conveyor.  
COUNTERPLAY: Do not enter; Barrier the cell; enter from a dir that slides you to safety.  
POWER_BUDGET: Standard utility.  
AI_USAGE: `aiHint: "slide_toward_hazard_or_off_melee"`. Queens zone ≥ 1. Skip if the stored dir is blocked by a wall (the slide would no-op).  
DISCOVERY_ELIGIBILITY: true. `pieceTypes: ["queen","bishop"]`, `levelZoneMin: 1`  
EDGE_CASES: One slide per cell; last writer vs other paints (Barrier clears). No bounce-loop: slide resolution does not re-trigger the same pad/slide in the same enter event (same as Twin Gate). Dest hazard ticks. `movedThisTurn` = true if they slid ≥1. Chain of two slides: **not** this card (distance 1, one cell).  
IMPLEMENTATION_COMPLEXITY: MEDIUM — enter hook shared with Twin Gate.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-rank-lock`

NAME: Rank Lock  
ROLE: CONTROL — walk constrained to one axis  
ACQUISITION: ELITE  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 3  
EFFECT: No damage. `effectParams: {"walkAxisLockTurns":2}`. For 2 turns, the target may only walk to cells that share **either** the target’s current `x` **or** current `y` with the **axis of the caster→target line at cast time**. If the line is cardinal, lock that rank **or** file (the one they already share). If the line is diagonal / knight-offset, lock the **dominant** axis (`|dx| >= |dy|` → file `x` locked, they may change `y` only). Walk preview and execute both reject other dests. Forced movement (push/pull/swap/slide/gate) **is allowed** — the lock is a **walk** restriction, not Root. Distinct from Root Snare (0 walk), Slow (MP), Grounded Lock (no swap/blink), Quiet Hex.  
DURATION: 2 turns  
SCALING: duration fixed.  
SYNERGIES: File Lance / Fan Bolt on the locked axis; Open Pit on the only step; Far Sting if they are locked at dist 5; Glyph Tax on the file.  
COUNTERPLAY: Teleport / Swap / Back Step (if they have it) / wait 2 turns; the lock does not spend their MP for them.  
POWER_BUDGET: Standard control, 0 damage, CD 3.  
AI_USAGE: `aiHint: "axis_lock_if_linear_spell_in_kit"`. Elite rooks. Skip if the player is already on a dead-end file.  
DISCOVERY_ELIGIBILITY: true. `eliteOnly: true`, `pieceTypes: ["rook"]`, `levelZoneMin: 2`  
EDGE_CASES: Summon-control walks honor the lock. AI pathing must not highlight illegal dests (preview parity). Missing param → no lock. Cleanse strips it (`cleanseTypes` include `"walkAxisLock"`).  
IMPLEMENTATION_COMPLEXITY: MEDIUM — walk stepper + preview. Do not touch turn order.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-board-tilt`

NAME: Board Tilt  
ROLE: POSITION — mass shove  
ACQUISITION: NOT_PLAYER_LEARNABLE  
AP_COST: 5  
RANGE: 1  
TARGET_TYPE: ground  
LOS: false  
COOLDOWN: 4  
EFFECT: Click an adjacent cardinally aligned empty or occupied cell to choose dir. `effectParams: {"massPushDistance":1,"massPushExcludeCaster":true}`. Every **other** living combatant is `applyPushback` 1 in that dir. Resolve **farthest-first** along the axis so they do not stack. No damage. Distinct from Void Collapse (attract-all + 80), Void Anchor, Shoulder Bash (one body), Crosswind. Player **never** owns this.  
DURATION: instant  
SCALING: distance 1 fixed.  
SYNERGIES (as a witness puzzle): Open Pit / Fuse / Slide / Cinder in the dir; Stride Brand after; Rank Lock then tilt off the lock (forced move is legal).  
COUNTERPLAY: Stand on the up-dir wall; Self Anchor; occupy so the farthest-first slide stops short.  
POWER_BUDGET: Signature control, 0 damage, CD 4, not learnable.  
AI_USAGE: `aiHint: "tilt_if_three_plus_improve"`. Elite / boss kits only. Skip if fewer than 3 other bodies would move. Missing `aiHint` = drop from resolve (Discovery principle 6).  
DISCOVERY_ELIGIBILITY: `discoveryEligible: false`. Observation may still record for telemetry; **grant never fires**. `usableByPlayer: false`, `usableByEnemy: true`.  
EDGE_CASES: Player-side summons move. Hazard ticks on landing. `movedThisTurn` on anyone who slid. Do not tilt world-portal reserved cells onto sealed corridors (skip units whose dest is reserved; they stay).  
IMPLEMENTATION_COMPLEXITY: MEDIUM–HIGH — multi-unit occupancy order.  
STATUS: PROPOSED

---

## 6. Combination matrix (intended, not name-wired)

Resolve only via flags / tile maps / effect keys.

| Setup (metadata) | Payoff (metadata) | Decision |
| :--- | :--- | :--- |
| `mpCost: 2` Ley Toll | `currentMp` vs walk tiles | Prime the nuke or take the 2-step |
| `stealMpAmount` | `mpCost > 0` | Sip to afford Ley Toll |
| `areaShape: "cone"` | `walkAxisLockTurns` | They cannot leave the wedge |
| `swapTwoHostiles` | `fuseTurns` / `pitBlocksWalk` / `hazardType: "ice"` | Trade the safe body onto the trap |
| `selfPushDistance` | `gatePairDuration` / `slideDistance` | Kick yourself onto your pad / conveyor |
| `gatePairDuration` | dest `isCellFree` (pits/barriers fail the teleport) | Gate is a path, not a dump-into-pit |
| `evadeNextHits` | `tauntNextHit` (Goad) | They must throw the swing you dodge |
| `distanceDamagePerTile` | `allyRangeDelta` / `rangeDebuffDelta` | Range war |
| `movedThisTurn` | `movedThisTurnBonus` | Shove first, brand second |
| `nextCastApTax` | `hard_3` / Inferno 5 AP | Cast small or wait |
| `slideDistance` | pit / fuse one cell further | Enter-or-not |
| `massPushDistance` | same paints as slide | Witness-only scramble |
| `summonAI: "font"` | `spellType: "heal"` pulse | Plant vs `no_healing` |
| Barrier last-writer | pit / pad / slide / fuse / rime / smoke | You built the answer |

Map modifiers stay metadata-only. Frozen/Slime × **walk** MP does not inflate Ley Toll’s `mpCost`. Arcane Surge × Hex Toll is `applyApCost` then +1. Plague + slide landing is two hooks if both fire — document in recap later, do not name-check.

Mechanic Interaction Matrix still OPEN (do not “fix” in this spec, but do not ship new movement that repeats the gap):

- Swap × hazards (MIMA-2026-08-31-001) — Pawn Trade / Twin Gate / Slide **must** tick dest hazards.
- Push/pull × hazards (MIMA-2026-08-31-005) — Back Step / Board Tilt / Slide use `applyPushback`; landing must tick.
- Controlled-summon walk × occupancy (MIMA-2026-08-31-002) — Rank Lock / pits must apply to summon-control walks.

---

## 7. Recommended unlock order (pacing)

Discovery designer should treat these as **bands**, not a shop list.

| Band | Spells | Why |
| :--- | :--- | :--- |
| Early (zone 0–1, first feats) | Soul Sip, Hex Toll, Back Step (`easy_3`) | MP fight, AP tax, kiting |
| Mid (zone 1–2, loot_hunter / crits) | Ley Toll, Open Pit, Slide Tile, Sidestep Ward, Mercy Font | MP vs walk, terrain, dodge, totem |
| Late (elites / zone 2) | Far Sting, Fan Bolt, Pawn Trade, Stride Brand, Rank Lock | Distance, cone, pair-swap, move-punish, axis |
| Feat / multi | Lens Share (bishop **or** `double_betrayal`) | Ally sniper enable |
| Boss recap | Twin Gate (`void_grandmaster`) | Pad-pair lesson after living with Swap |
| Witness only | Board Tilt | Mass shove stays identity |

**Still required for any of this to matter:** Discovery’s innate-four split. This pass does not edit `spellData.ts`.

---

## 8. Implementation notes (for a later, explicit implementation PR)

1. **MP debit:** `executeCastAttempt` (`WorldExploration.tsx` 17184–17230) must gate and spend `Number(spell.mpCost)` on the same success/fizzle path as AP. Until that exists, Ley Toll is a bug. Do not use walk `applyMpCost` modifiers on spell MP.  
2. **Cone:** Read `areaShape === "cone"` in targeting + `castHelpers`. Preview/live/execute share one helper. Do not ship a Chebyshev circle labeled Fan Bolt.  
3. **`linear` on `targetType: "line"`** is still unwired (`targeting.ts` 531–568 vs 588). File Lance still needs it; Fan Bolt does not depend on it.  
4. **Twin Gate ≠ `portals`.** New `gatePads`. World portal / death-realm guards stay untouched.  
5. **Open Pit ≠ `barrierTiles`.** New `pitTiles` in occupancy; LoS ignores them.  
6. **Pawn Trade ≠ `isSwap`.** Do not call `swapPositions`.  
7. **Back Step / Board Tilt / Slide** call `applyPushback` with distances from params.  
8. **Sidestep** consumes in the incoming-hit pipeline **before** `dealDamage`. Do not add a percent miss inside combat math.  
9. **`movedThisTurn`** is set on occupancy commits, cleared at that unit’s turn start. Stride Brand only reads the flag.  
10. **Rank Lock** is a walk-dest filter, not Root. Forced movement still legal.  
11. **`summonAI: "font"`** — no name parse. Kit id `spell-font-pulse` is `NOT_PLAYER_LEARNABLE`.  
12. Recap grant uses the reward funnel + `commitSpellDiscoveries` / `unlockOwnedSpell`, not `updateCharacter`.  
13. Do not touch RAF, map generation, turn order, or damage math.  
14. Add ids to `SPELL_ID_CATALOG` **only when implemented**, together with `spellData.ts` and kits.  
15. Do **not** append these ids to `starterSpells` as `isBaseSpell`.

---

## 9. Explicit non-goals this pass

- No production TypeScript / Motoko / Candid edits.  
- No new damage formula, crit, or RES/SR identity.  
- No shop-bought spells.  
- No fourth RES% buff.  
- No second Chain Lightning, second absorb, second self-cleanse, second **self** range-buff.  
- No player-owned silence (Hex of Silence stays BOSS_ONLY).  
- No 12-AP Void Collapse clone.  
- No third File Lance / Blood Tithe (ids already collide across siblings).  
- No cone+knockback hybrid id (Wave 4).  
- No wiring of `CharacterStats.evasion` as a percent (Sidestep is a consume gate).

---

## 10. Proposal index

| ID | Acquisition | Complexity | Primary hole filled |
| :--- | :--- | :--- | :--- |
| `spell-ley-toll` | ENEMY_DISCOVERY | MEDIUM | First `mpCost > 0` |
| `spell-fan-bolt` | ENEMY_DISCOVERY | HIGH | Cone `areaShape` |
| `spell-pawn-trade` | ENEMY_DISCOVERY | MEDIUM | Two-hostile swap |
| `spell-back-step` | CHALLENGE | LOW–MEDIUM | Self knockback |
| `spell-twin-gate` | BOSS | HIGH | Portal-pair |
| `spell-sidestep-ward` | ACHIEVEMENT | MEDIUM | Evade next hit |
| `spell-far-sting` | ENEMY_DISCOVERY | LOW | Distance-scaled damage |
| `spell-soul-sip` | ENEMY_DISCOVERY | LOW | MP steal |
| `spell-open-pit` | ENEMY_DISCOVERY | MEDIUM | Walk-block, LoS-open |
| `spell-mercy-font` | ACHIEVEMENT | MEDIUM | Stationary healer summon |
| `spell-font-pulse` | NOT_PLAYER_LEARNABLE | LOW | Font kit heal |
| `spell-lens-share` | MULTI_SOURCE | LOW | Ally range buff |
| `spell-stride-brand` | ELITE | MEDIUM | Moved-this-turn damage |
| `spell-hex-toll` | ENEMY_DISCOVERY | LOW–MEDIUM | Unit next-cast AP tax |
| `spell-slide-tile` | ENEMY_DISCOVERY | MEDIUM | Conveyor terrain |
| `spell-rank-lock` | ELITE | MEDIUM | Axis walk lock |
| `spell-board-tilt` | NOT_PLAYER_LEARNABLE | MEDIUM–HIGH | Mass shove signature |

All STATUS: **PROPOSED**.

---

## 11. Source map (read-back)

| Topic | File | Lines |
| :--- | :--- | :--- |
| Live 32-id catalog | `src/frontend/src/data/spellData.ts` | 9–691 |
| Forced `isBaseSpell` | `src/frontend/src/components/WorldExploration.tsx` | 2356–2368 |
| Backend library filter | `src/frontend/src/utils/adminSafety.ts` | 551–558 |
| `SPELL_ID_CATALOG` | `src/frontend/src/data/bossKits.ts` | 29–62 |
| `SpellConfig` / `areaShape` / `evasion` | `src/frontend/src/types/gameTypes.ts` | 64, 160–241 |
| Line targeting (unused by data; no `linear`) | `src/frontend/src/engine/targeting.ts` | 531–568 |
| Area = Chebyshev, no `areaShape` | `src/frontend/src/engine/targeting.ts` | 641–679 |
| Caster-tile rule | `src/frontend/src/engine/targeting.ts` | 129–137 |
| `hitTiles` AoE | `src/frontend/src/engine/castHelpers.ts` | 105–117 |
| Trap stub = barrier | `src/frontend/src/engine/spellEngine.ts` | 441–445 |
| `isSwap` → `swapPositions` | `src/frontend/src/engine/spellEngine.ts` | 637, 767–768 |
| Push / attract unused by casts | `src/frontend/src/engine/occupancy.ts` | 462–541 |
| Portals impassable | `src/frontend/src/engine/occupancy.ts` | 13–14, 40 |
| AP-only cast debit | `src/frontend/src/components/WorldExploration.tsx` | 17184–17230 |
| MP display only | `src/frontend/src/components/SpellbookModal.tsx` | 964–975 |
| Enemy kits (owned ids) | `src/frontend/src/engine/enemyAI.ts` | 156–178 |
| Backend six | `src/backend/lib/admin.mo` | 168–191 |
| Feats | `src/backend/lib/admin.mo` | 309–326 |
| Challenges | `src/frontend/src/utils/challengeCompletion.ts` | 38–103 |
| Boss ids | `src/frontend/src/types/bossTypes.ts` | 390–410 |

**Document status:** PROPOSED. Safe to review and implement in a later, explicit data PR. Not a license to land combat code in the same change as this spec.
