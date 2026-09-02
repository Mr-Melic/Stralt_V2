# Enemy and Elite Evolution Design — Wave 2

**Author:** Enemy and Elite Evolution Designer (cron `0 */24 * * *`)  
**Date:** 2026-09-01  
**Status:** PROPOSED — design only. No production code in this change.  
**Scope:** Second daily pass. New world-pack families that use **unused engine** (push, attract, trap, linear/diagonal, delayed execute, absorb, redirect, stationary summon). Bosses stay on the existing catalog.

**Does not replace:** [`ENEMY_ELITE_EVOLUTION_2026-08-31.md`](./ENEMY_ELITE_EVOLUTION_2026-08-31.md) (Wave 1, 22 family sheets). Those ids stay **PROPOSED**. This run does **not** re-list them as new content.

Stralt has **no character level cap**. Nothing here is a final enemy level, a final player level, or a last variant. Relevance is player-relative spawn + role + AI + spell-pool growth + variant mechanics.

---

## 0. What changed since Wave 1

Re-read against `HEAD` `dd275aa` (Merge PR #182). Wave 1 closed as docs in [#136](https://github.com/Mr-Melic/stralt/pull/136). Formations [#131], AI catalog [#133], enemy admin [#146] are also docs-only.

| Wave 1 claim | 2026-09-01 live | Verdict |
| :--- | :--- | :--- |
| 7 `EnemyFamily` ids + `default` | `gameTypes.ts` 12–20 unchanged | No sheet shipped |
| 30% family roll is stat-only | `WorldExploration.tsx` 6448–6538 | Still true |
| Family `res`/`sp` written as 0.05–0.75 | same block (`iron_golem.res = 0.75`, `plague_rat.res = 0.05`) | Still broken vs `getEnemyBaseStats` |
| Battle start drops family HP | `WX` 12533–12538 `calcEnemyMaxHp(e.level)` | Still true |
| Kit zone is NaN | `WX` 12484 `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` | Still true (`enemyAI.ts` 187–192) |
| Live combat hooks | ember melee-burn `WX` 17224–17238; tide melee-slow `WX` 17240–17255; void 25% reflect `castHelpers.ts` 327–336 | Still the only three |
| Register extras | Crimson Spawn / Shadow Lurker / Storm Caller still lore-only | Not in `EnemyFamily` |
| `pickEnemyLevelFromTiers` | `combatMath.ts` 54–107; `maxTier = floor(999 / ts)` at 58 | Do not retune percents; 999 remains a spawn-math rail, not a content cap |
| `computeAITier` | `combatMath.ts` 36–52; bands then 30% 1–10 noise | Variant floors still sit on top |
| Summoner chance | `WX` 12496–12506 `0.12 + playerLevel * 0.02` | Still saturates; Wave 1 `brood_chanter` still the family fix |
| `inferArchetype` healer-first | `enemyAI.ts` 420–449; `family.includes("berserk")` heuristic | Still metadata-hostile |
| `applyPushback` / `applyAttract` | `occupancy.ts` 354 / 406; tests exist; **no spell caller** | Wave 2 primary opportunity |
| `isTrap` | `spellEngine.ts` 442 → `placeBarrier(..., 3)` | Trap is a fake wall. Wave 2 `trip_mason` needs the SPELL_PROPOSALS redefine |
| Frontend `linear` / `diagonal` / `minRange` | Targeting supports them; no enemy kit sets them | Wave 2 `rank_lancer` / `ricochet_vicar` |
| Delayed execute / absorb / root-to-0 / stationary turret | Absent in live catalog | Wave 2 consumes SPELL_PROPOSALS ids |

**Wave 1 ids — do not re-propose:**  
`wraith_bishop`, `iron_golem`, `plague_rat`, `ember_knight`, `tide_shade`, `bone_scribe`, `void_mirror`, `crimson_spawn`, `shadow_lurker`, `storm_caller`, `glass_sniper`, `cinder_martyr`, `pale_cantor`, `hex_chorister`, `leash_warden`, `null_censor`, `rift_hook`, `brood_chanter`, `glyph_sower`, `blink_cutter`, `coil_arbiter`, `rust_reaver`.

**Wave 1 id that now has an official proposed spell:** `rift_hook` ELITE may consume `spell-hook-line` from [`SPELL_PROPOSALS_2026-08-31.md`](./SPELL_PROPOSALS_2026-08-31.md) instead of an unnamed hook. That is a **sheet amendment**, not a new family.

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

**Fifth variant (this run specifies the roll, still not a generator):** after Champion weight is subtracted, a 2% `wRare` may attach a **procedural skin**: palette + **one borrowed RARE spell from this family's allowed categories**. Never borrow a forbidden category. Never a new persist stat.

---

## 2. Why Wave 2 exists (gaps Wave 1 did not fill)

Wave 1 covered every requested **role word**. It did not consume the engine's unused **verbs**:

| Unused live verb | Wave 1 nearest | Why that is not enough |
| :--- | :--- | :--- |
| `applyPushback` | `rift_hook` swaps | Swap exchanges two bodies. Push slams into a wall/hazard. |
| `applyAttract` | `rift_hook` / `void_collapse` CHAMPION | Collapse is a 12-AP set-piece. Cheap linear pull is missing. |
| True root (`rootTurns`) | `coil_arbiter` Slow / frost MP tax | Slow is −2 MP. Root is MP = 0 for the walk, spells still legal. |
| Real `isTrap` | `glyph_sower` Mark | Mark amps the next hit. Trap is hidden enter-damage + root. |
| `linear` geometry | `glass_sniper` min-range | Sniper is range band. Lancer is **file/rank**. |
| Delayed execute | `shadow_lurker` flank | Lurker is position. Sexton is a 2-turn clock. |
| Absorb buffer | `iron_golem` RES/HP | Absorb can expire unused. Not a thicker golem. |
| Damage redirect | `void_mirror` 25% spell reflect | Mirror punishes **casts**. Pain Link punishes **HP hits**. |
| Stationary summon | `brood_chanter` wolf/archer | Both pets path. Turret occupies and shoots a lane. |
| Conditional bounce | `storm_caller` Chain Lightning | Chain always bounces. Ricochet needs Mark/hazard/root. |
| Zone AP tax | `bone_scribe` Drain Courage | Scribe taxes a **unit**. Tax Scribe taxes a **tile**. |
| Self-teleport | `wraith_bishop` swap; `blink_cutter` ally-swap | Neither is a free-cell dash. |
| On-death familiar | `cinder_martyr` self-detonate | Martyr is the bomb. Familiar is a chump that heals the owner when **you** kill it. |

Wave 2 families are those verbs as identities. If a future spell does not match the family's allowed categories, drop it.

---

## 3. Encounter synergy packs (Wave 1 + Wave 2)

Weights rise with `R` the same way Elite does. Cap one CHAMPION. Cap one dedicated summoner plus the existing overlay.

| Pack | Members | Decision (not “more HP”) |
| :--- | :--- | :--- |
| File & Wire | `rank_lancer` + `trip_mason` + `snare_weaver` | Linear charge into a hidden wire + root |
| Bell Court | `bell_sexton` + `execute_jackal` + `bone_scribe` | Clock → shred → finish under 30% |
| Gravity Choir | `void_anchoret` + `bash_bruiser` + `tax_scribe` | Pull, slam, tax the landing glyph |
| Plate Choir | `plate_warden` + `pain_suture` + `pale_cantor` | Absorb then redirect; healer keeps the plate up |
| Shard Battery | `stone_castellan` + `ricochet_vicar` + `glyph_sower` | Lane turret + Mark + conditional bounce |
| Mist Hunt | `mist_walker` + `shadow_lurker` + `leech_familiar` | Dash to a back tile; lurker commits; familiar is bait |
| Ash Slam | `bash_bruiser` + `ember_knight` + `cinder_martyr` | Push onto burn / martyr radius |
| Quiet Choir+ | Wave 1 Quiet Choir + `plate_warden` | Replace golem when absorb is the lesson |

Keep Wave 1 packs (Ash Court, Paper Plague, Broken Glass, Rift Knot, Null Brood, Tide Mirror). Do not spawn File & Wire on a map with no 4-tile file (prefer `chessboard` / `fortress` lane).

---

## 4. Family sheets — Wave 2

All sheets: **STATUS: PROPOSED**.  
`proposed:` ids are from SPELL_PROPOSALS unless marked `wave2:`.

---

### ENEMY_ID: `rank_lancer`

- **NAME:** Rank Lancer
- **ROLE:** bruiser (geometry) / anti-ranged
- **BASE_ELIGIBILITY:** New family; preferred chassis `rook`. Reroll on maps with no 4-tile open file or rank (tiny `ruinsIslands` pockets). Eligible at any player level.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: walk the file and Strike. Peer: only commit if a **linear** ray to the player is clear. Above: hold the file until the player steps on it, then charge.
- **STAT_SCALING_RULE:** hp 1.05, sp 0.85, sr 1.10, res 1.10, init 1.15, chc 0.85. MP 3. Threat is **the file**, not HP.
- **AI_TIER_PROGRESSION:** Profile `charger` with **linear-only** approach (4-dir along shared x or y). VETERAN: refuse diagonal approach. ELITE: wait if the player is one tile off-axis. CHAMPION: after a miss, `spell-haste` to re-align, not to kite.
- **CORE_SPELL_POOL:** `physical_attack` with kit metadata `linear: true`, `minRange: 1`, `maxRange: 4` on a **clone config** `wave2:spell-file-thrust` (do not mutate global Strike)
- **ADVANCED_SPELL_POOL:** `spell-iron-skin`, `spell-haste`
- **RARE_SPELL_POOL:** `proposed:spell-shoulder-bash` (only if the dest cell is on the same file)
- **ELITE_SPELL_POOL:** CHAMPION may use `starter-frost` **only** along the file (MP tax to pin you on-axis)
- **SIGNATURE_MECHANICS:** Chess rook identity. Off-axis you are safe. Distinct from `rust_reaver` (any-direction closer) and `ember_knight` (burn trail).
- **VARIANT_PROGRESSION:** BASE file-walk → VETERAN no-diagonal → ELITE patience → CHAMPION pin-the-file
- **RARITY_CURVE:** Standard Wave 1 §2.4. +ELITE on `chessboard` / `fortress`.
- **SYNERGIES:** `trip_mason` (wire on the file), `snare_weaver`, `stone_castellan`
- **WEAKNESSES:** Step off the file; Barrier on the ray; `paper_windstorm` does not matter (physical)
- **PLAYER_COUNTERPLAY:** Never share a rank; occupy the neck with a summon; Swap off-axis
- **SPELL_DISCOVERY_OPPORTUNITIES:** file-thrust (observe), later shoulder-bash
- **REWARD_EXPECTATION:** Standard Wave 1 §2.6
- **IMPLEMENTATION_COMPLEXITY:** MED (linear kit clone + charger path constraint)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `bash_bruiser`

- **NAME:** Bash Bruiser
- **ROLE:** displacement specialist (push) / bruiser
- **BASE_ELIGIBILITY:** New family; preferred chassis `pawn` or `knight`. Weight ×1.5 if the map has lava, spikes, void, or a wall 2 tiles behind typical player stand.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Strike. Peer: Shoulder Bash if a 2-step ray hits wall/hazard. Above: only bash when collision or hazard EV > Strike.
- **STAT_SCALING_RULE:** hp 1.10, sp 0.80, sr 0.90, res 1.05, init 1.10, chc 0.90.
- **AI_TIER_PROGRESSION:** Profile `charger`. VETERAN: skip bash into open floor. ELITE: aim so the player lands on ally `cinder_martyr` / ember-wake / tripwire. CHAMPION: bash then Iron Skin (stays in).
- **CORE_SPELL_POOL:** `physical_attack`, `proposed:spell-shoulder-bash`
- **ADVANCED_SPELL_POOL:** `spell-enrage`, `spell-iron-skin`
- **RARE_SPELL_POOL:** `spell-expose` (so the collision bonus bites)
- **ELITE_SPELL_POOL:** none new — CHAMPION is bash + skin
- **SIGNATURE_MECHANICS:** `applyPushback` + collision bonus. If bash is implemented as “more Strike damage,” the family is wrong. Distinct from `rift_hook` (swap).
- **VARIANT_PROGRESSION:** BASE shove → VETERAN wall-only → ELITE hazard aim → CHAMPION stay
- **RARITY_CURVE:** Standard. +ELITE on lava/spike maps.
- **SYNERGIES:** `ember_knight`, `cinder_martyr`, `trip_mason`, `void_anchoret`
- **WEAKNESSES:** Back to open floor; Slow before they close; guardian body-block
- **PLAYER_COUNTERPLAY:** Stand with an exit behind you; Barrier behind yourself; Swap after the shove
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-shoulder-bash`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (cast path must call `applyPushback` by `effectCategory`, not name)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `snare_weaver`

- **NAME:** Snare Weaver
- **ROLE:** controller
- **BASE_ELIGIBILITY:** New family; preferred chassis `bishop`. Distinct from `coil_arbiter` (AP/MP tax) — this one **stops the walk**.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Slow (live). Peer: Root if the player can walk to safety or to a lancer. Above: Root only when an ally has a linear/trap payoff this or next turn.
- **STAT_SCALING_RULE:** hp 0.80, sp 1.00, sr 1.05, res 0.85, init 1.25, chc 0.75.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: will not Root a already-rooted target. ELITE: Root when player MP ≥ 2 and an ally is 1 turn from commit. CHAMPION: Root + Mark the tile they stand on (they can still cast; they cannot leave the Mark).
- **CORE_SPELL_POOL:** `proposed:spell-root-snare`, `starter-frost`
- **ADVANCED_SPELL_POOL:** `spell-slow`, `spell-mark`
- **RARE_SPELL_POOL:** `spell-drain-courage` (they can still nuke — tax the nuke)
- **ELITE_SPELL_POOL:** CHAMPION may hold Root if Inferno/Sacrifice is the only leftover player threat (visible AP)
- **SIGNATURE_MECHANICS:** `rootTurns` = walk lock, **spells remain legal**. That is the read. Distinct from frost/Slow stacking.
- **VARIANT_PROGRESSION:** BASE root → VETERAN no-refresh → ELITE combo-root → CHAMPION mark-the-rooted
- **RARITY_CURVE:** Standard
- **SYNERGIES:** `rank_lancer`, `trip_mason`, `stone_castellan`, `bell_sexton`, `ricochet_vicar` (`bounceOn:["root"]`)
- **WEAKNESSES:** Timestep (AP dump in place); Cleanse Rite when it exists; standing still on purpose
- **PLAYER_COUNTERPLAY:** Cast from the rooted tile; do not plan a 4-MP walk; kill the Weaver first in File & Wire
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-root-snare`, `starter-frost`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW–MED (effect flag + movement read)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `trip_mason`

- **NAME:** Trip Mason
- **ROLE:** hazard creator (trap)
- **BASE_ELIGIBILITY:** New family; preferred chassis `rook`. Distinct from `glyph_sower` (visible Mark) and `ember_knight` (body-fire). At most one per pack.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: place a tripwire on a choke. Peer: wire the melee ring around a backliner. Above: wire the **file** a lancer wants.
- **STAT_SCALING_RULE:** hp 0.90, sp 0.85, sr 1.00, res 1.05, init 0.95, chc 0.80.
- **AI_TIER_PROGRESSION:** Profile `generic` / setter. VETERAN: never wire a cell the player can see them stand on (place then step off). ELITE: prefer tiles the player must enter to reach a glass ally. CHAMPION: two wires if AP allows (cap 2 live traps per Mason).
- **CORE_SPELL_POOL:** `proposed:spell-tripwire`, `physical_attack`
- **ADVANCED_SPELL_POOL:** `spell-mark` (visible decoy vs hidden wire), `starter-shield`
- **RARE_SPELL_POOL:** `proposed:spell-cinder-tile` (visible hazard — teaching contrast)
- **ELITE_SPELL_POOL:** CHAMPION hidden wire + Mark on a **different** tile (information lie)
- **SIGNATURE_MECHANICS:** Real trap: enter (walk/push/pull) deals + roots; **teleport does not trip**. Today's `isTrap → placeBarrier` must be changed by metadata before this family ships. Distinct from Barrier (solid tile).
- **VARIANT_PROGRESSION:** BASE choke-wire → VETERAN hide-the-placer → ELITE protect-glass → CHAMPION decoy Mark
- **RARITY_CURVE:** Standard. +ELITE in `corridorMaze` / `fortress`. Weight 0 if pack already has a Mason.
- **SYNERGIES:** `bash_bruiser`, `void_anchoret`, `rank_lancer`, `snare_weaver`
- **WEAKNESSES:** Summon probe; Barrier-on-cell clears; Fog does not hide **your** knowledge if you watched the place
- **PLAYER_COUNTERPLAY:** Probe with a pet; step around; Swap the Mason onto their own wire once you know the cell
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-tripwire` (ELITE observe)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** HIGH (trap is currently a wall stub)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `void_anchoret`

- **NAME:** Void Anchoret
- **ROLE:** displacement specialist (pull) / controller
- **BASE_ELIGIBILITY:** New family; preferred chassis `bishop`. Distinct from `rift_hook` (swap) and Storm Caller CHAMPION `void_collapse` (12 AP nuke).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Frost if no linear ray. Peer: Hook Line when Chebyshev ≥ 2 and the ray is clear. Above: Hook into ally bash / wire / tax glyph.
- **STAT_SCALING_RULE:** hp 0.85, sp 1.00, sr 1.00, res 0.85, init 1.20, chc 0.80.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: skip hook if landing tile is safer for the player. ELITE: hook toward martyr / tax / wire. CHAMPION: `proposed:spell-void-anchor` only if ≥2 player-side bodies in radius 2 (still `NOT_PLAYER_LEARNABLE` — witness only).
- **CORE_SPELL_POOL:** `proposed:spell-hook-line`, `starter-frost`
- **ADVANCED_SPELL_POOL:** `spell-slow` (after they land adjacent), `spell-mark` on the landing tile
- **RARE_SPELL_POOL:** `proposed:spell-root-snare` (if Weaver is absent — do not double-root a pack)
- **ELITE_SPELL_POOL:** `spell-void-anchor` CHAMPION, witness-only
- **SIGNATURE_MECHANICS:** `applyAttract` along a **linear LoS** ray, minRange 2. Adjacent = immune to the hook. Identity is the pull, not the 8 damage.
- **VARIANT_PROGRESSION:** BASE hook → VETERAN value-check → ELITE combo-pull → CHAMPION group-anchor
- **RARITY_CURVE:** Standard. +ELITE if `gravity_well` announce is on (even while the modifier hook is a stub — family **is** the gravity until the stub is wired).
- **SYNERGIES:** `bash_bruiser`, `tax_scribe`, `cinder_martyr`, `trip_mason`
- **WEAKNESSES:** Stand adjacent; break LoS; diagonal-only stance
- **PLAYER_COUNTERPLAY:** Hug the Anchoret; Barrier the file; do not clump at radius 2
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-hook-line` (also the Wave 1 `rift_hook` amendment)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (`effectCategory === "attract"` wire-up)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `bell_sexton`

- **NAME:** Bell Sexton
- **ROLE:** status specialist (delayed execute)
- **BASE_ELIGIBILITY:** New family; preferred chassis `queen` **without** `starter-heal` (must stay caster). Reroll if pack size is 1 (clock needs a finisher).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: apply Grave Bell when player HP% ≤ 50. Peer: Bell then Cursed Wound. Above: Bell the Wisp if the Wisp is the execute target.
- **STAT_SCALING_RULE:** hp 0.75, sp 1.15, sr 1.10, res 0.80, init 1.05, chc 0.85. If it is topping the damage meter on cast turn, the kit leaked — Bell deals **0 on cast**.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: never recast Bell on the same `grave-bell-${casterId}` pair. ELITE: Bell only if a DoT or scribe shred is already on the target. CHAMPION: prefer the target that will be ≤ 30% in two turns (visible HP + public DoT ticks).
- **CORE_SPELL_POOL:** `proposed:spell-grave-bell`, `spell-weaken`
- **ADVANCED_SPELL_POOL:** `spell-cursed-wound`, `spell-expose`
- **RARE_SPELL_POOL:** `soul_rend`
- **ELITE_SPELL_POOL:** none — CHAMPION is lookahead, not a bigger bell
- **SIGNATURE_MECHANICS:** 2-turn clock: 10 or 36 at ≤30% HP. Killing the Sexton does **not** clear the bell (SPELL_PROPOSALS). Distinct from `plague_rat` (stack now) and `cinder_martyr` (self-pop).
- **VARIANT_PROGRESSION:** BASE clock → VETERAN no-double → ELITE setup-required → CHAMPION lookahead
- **RARITY_CURVE:** Standard. Never CHAMPION in a solo pack.
- **SYNERGIES:** `execute_jackal`, `bone_scribe`, `plague_rat`, `pale_cantor` is a **counter** (heal out of window)
- **WEAKNESSES:** Heal above 30%; Cleanse Rite; burst the jackal and ignore the 10
- **PLAYER_COUNTERPLAY:** Mend before the tick; kill the jackal; do not sit in Cursed Wound
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-grave-bell` (ELITE observe)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (turn-start delayed hook)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `execute_jackal`

- **NAME:** Execute Jackal
- **ROLE:** assassin (conditional)
- **BASE_ELIGIBILITY:** New family; preferred chassis `knight`. Distinct from `shadow_lurker` (flank/veil). This one **waits for the window**.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Strike if target HP% ≤ 40, else lurk at 3. Peer: only commit if Bell is ticking or HP% ≤ 30. Above: Sacrifice only if `ENEMY_WOUNDED_SACRIFICE_HP_PCT` and the execute is live.
- **STAT_SCALING_RULE:** hp 0.70, sp 1.10, sr 0.80, res 0.75, init 1.35, chc 1.25.
- **AI_TIER_PROGRESSION:** Profile `flanker` + hold (charger wait). VETERAN: skip frontal if HP% > 40. ELITE: path to the Bell target, not the nearest. CHAMPION: `shadow_strike` only as the execute hit.
- **CORE_SPELL_POOL:** `physical_attack`, `spell-mark`
- **ADVANCED_SPELL_POOL:** `spell-sacrifice` (wounded-only), `spell-shadow-veil`
- **RARE_SPELL_POOL:** `shadow_strike`
- **ELITE_SPELL_POOL:** none new
- **SIGNATURE_MECHANICS:** Damage identity is **the threshold**, not stealth. A full-HP player should feel ignored. Do not invent a new damage formula — use Mark × Strike / Sacrifice into the public HP%.
- **VARIANT_PROGRESSION:** BASE threshold-strike → VETERAN refuse-healthy → ELITE hunt-the-bell → CHAMPION no-LoS finish
- **RARITY_CURVE:** Standard. +VETERAN when a Sexton is already in the pack.
- **SYNERGIES:** `bell_sexton`, `bone_scribe`, `hex_chorister` (Haste the commit)
- **WEAKNESSES:** Stay above 40%; Shield; face it in a doorway
- **PLAYER_COUNTERPLAY:** Heal the band; body-block the last tile; do not dump AP on the Sexton while the Jackal is adjacent
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-mark`, `spell-sacrifice`, `shadow_strike`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** LOW–MED (hold + HP% gate; no new math)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `plate_warden`

- **NAME:** Plate Warden
- **ROLE:** tank (absorb)
- **BASE_ELIGIBILITY:** New family; preferred chassis `rook`. Distinct from `iron_golem` (RES + inertia) and `leash_warden` (peel).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Ward Plate self. Peer: Plate the highest-threat ally. Above: Plate then walk into the player's path (body-block while the buffer holds).
- **STAT_SCALING_RULE:** hp 1.15, sp 0.70, sr 1.05, res 1.15, init 0.80, chc 0.70. **Lower HP than golem** — the absorb is the extra life.
- **AI_TIER_PROGRESSION:** Profile `charger` with retreat disabled above 40% **effective** (HP+absorb). VETERAN: replace, do not stack, Ward Plate. ELITE: Plate the Cantor / Sexton, not self. CHAMPION: after absorb breaks, Iron Skin (second layer, not more absorb).
- **CORE_SPELL_POOL:** `proposed:spell-ward-plate`, `physical_attack`
- **ADVANCED_SPELL_POOL:** `spell-iron-skin`, `starter-shield`
- **RARE_SPELL_POOL:** `spell-enrage` (self, after plate)
- **ELITE_SPELL_POOL:** none — CHAMPION is layering, not a 36-absorb turtle (SPELL_PROPOSALS: replace same absorb)
- **SIGNATURE_MECHANICS:** Absorb first, then HP. Unused absorb expires. DoTs chew the plate. Cursed Wound does **not** reduce absorb. Distinct from heal.
- **VARIANT_PROGRESSION:** BASE self-plate → VETERAN no-stack → ELITE plate-the-carry → CHAMPION RES after break
- **RARITY_CURVE:** Standard. +VETERAN in Plate Choir.
- **SYNERGIES:** `pain_suture`, `pale_cantor`, `stone_castellan`
- **WEAKNESSES:** Wait 2 turns; Inferno ticks; ignore and kill the backline
- **PLAYER_COUNTERPLAY:** DoT the plate; do not dump Inferno into a fresh 18 absorb; kill the plated carry after expiry
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-ward-plate`
- **REWARD_EXPECTATION:** Standard. No extra Doka for “tankiness.”
- **IMPLEMENTATION_COMPLEXITY:** MED (absorb on the damage pipeline)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `pain_suture`

- **NAME:** Pain Suture
- **ROLE:** anti-melee / protector (redirect)
- **BASE_ELIGIBILITY:** New family; preferred chassis `king` or `rook`. Reroll if no ally (redirect needs a story — it redirects to **nearest hostile**, so a solo Suture is a “don't hit me” puzzle, still valid).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Pain Link when the player is adjacent. Peer: Link then step **next to the player** so nearest-hostile is you-as-threat… wait: redirect goes to nearest **hostile to the caster**, i.e. the player or their summon. The read is: “hit me and your pet dies” or “hit me and you eat your own swing.”
- **STAT_SCALING_RULE:** hp 0.95, sp 0.75, sr 1.00, res 1.10, init 1.00, chc 0.70.
- **AI_TIER_PROGRESSION:** Profile `generic` / holder. VETERAN: Link only if a player-side summon is closer than the player **or** the player is the only hostile (self-punish). ELITE: stand so the nearest hostile is the Wisp. CHAMPION: Ward Plate first (SPELL_PROPOSALS order: absorb then redirect leftover).
- **CORE_SPELL_POOL:** `proposed:spell-pain-link`, `physical_attack`
- **ADVANCED_SPELL_POOL:** `proposed:spell-ward-plate`, `spell-shadow-veil`
- **RARE_SPELL_POOL:** `spell-weaken` (so the redirected hit is smaller — actually skip Weaken on self; Weaken the player so their swing is small **before** they decide)
- **ELITE_SPELL_POOL:** CHAMPION Link + Plate
- **SIGNATURE_MECHANICS:** Next HP hit (melee / spell damage / DoT tick) goes to nearest hostile. **Not** Mirror. Distinct from `void_mirror` and `leash_warden`.
- **VARIANT_PROGRESSION:** BASE link-melee → VETERAN summon-eat → ELITE wisp-eat → CHAMPION plate-then-link
- **RARITY_CURVE:** Standard. +ELITE when the player last battle used a majority melee kit (optional history; skip if none).
- **SYNERGIES:** `plate_warden`, `leech_familiar` (you don't want to kill the familiar **or** hit the Suture)
- **WEAKNESSES:** Wait 2 turns; Weaken / anti-heal instead of a swing; attack a different enemy
- **PLAYER_COUNTERPLAY:** Don't swing the linked body; kill its ally; use expose/debuff
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-pain-link` (boss-gated in SPELL_PROPOSALS — family observe may be a **second** door; do not double-grant)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** HIGH (reactive beside Mirror; challenge HP must count what the **player** still takes)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `stone_castellan`

- **NAME:** Stone Castellan
- **ROLE:** summoner (stationary) / artillery
- **BASE_ELIGIBILITY:** New family; preferred chassis `rook`. Replaces random overlay on this body (`isSummoner` for the **turret** id only). Distinct from `brood_chanter` (mobile pets). At most one per pack. Do not also roll wolf/archer overlay.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: place turret on a choke facing the player. Peer: place then Shield the turret. Above: place off-axis so `spell-turret-shard` owns a file the player wants.
- **STAT_SCALING_RULE:** hp 1.00, sp 0.90, sr 1.00, res 1.10, init 0.75, chc 0.75. The turret uses existing `getSummonBaseStats`.
- **AI_TIER_PROGRESSION:** New summon AI `turret` (SPELL_PROPOSALS): `mp: 0`, **must not path**. VETERAN: skip summon if cap reached. ELITE: Iron Skin the turret. CHAMPION: Mark a tile on the turret's ray.
- **CORE_SPELL_POOL:** `proposed:spell-stone-turret`
- **ADVANCED_SPELL_POOL:** `starter-shield`, `spell-iron-skin` (on the turret)
- **RARE_SPELL_POOL:** `spell-mark`
- **ELITE_SPELL_POOL:** Do **not** unlock wolf/archer on this body.
- **SIGNATURE_MECHANICS:** Occupies a cell, linear shard, lifespan 4, cap shares `ENEMY_SUMMON_CAP`. Weak in open field, strong in corridors. Pets still do not grant extra XP.
- **VARIANT_PROGRESSION:** BASE turret → VETERAN respect-cap → ELITE skin-the-gun → CHAMPION mark-the-lane
- **RARITY_CURVE:** Standard. +ELITE on `fortress` / `corridorMaze` / `chessboard`. Weight 0 on cramped 1-tile closets (solvability).
- **SYNERGIES:** `snare_weaver`, `rank_lancer`, `ricochet_vicar`, `tax_scribe`
- **WEAKNESSES:** Kill the turret (glass); walk off-axis; Barrier the lane
- **PLAYER_COUNTERPLAY:** Side aisle; burst the gun; sit on the placement cell
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-stone-turret` (shard is `NOT_PLAYER_LEARNABLE`)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (new `SUMMON_KIT.turret`; do not reuse bomber)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `ricochet_vicar`

- **NAME:** Ricochet Vicar
- **ROLE:** artillery
- **BASE_ELIGIBILITY:** New family; preferred chassis `queen` **without** heal. Distinct from `storm_caller` (always-bounce) and `glass_sniper` (min-range).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Frost if no setup. Peer: Ricochet only if Mark / hazard / root is public on the primary. Above: refuse Ricochet without setup (Frost instead).
- **STAT_SCALING_RULE:** hp 0.80, sp 1.25, sr 0.90, res 0.75, init 1.00, chc 1.10.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: check `bounceOn` flags, never name. ELITE: Mark then Ricochet next turn if AP cannot do both honestly. CHAMPION: prefer a primary that also sits on a trap/cinder so the bounce is “free.”
- **CORE_SPELL_POOL:** `starter-frost`, `spell-mark`
- **ADVANCED_SPELL_POOL:** `proposed:spell-ricochet-mark`, `starter-blast` (only if two bodies already stacked — else skip)
- **RARE_SPELL_POOL:** `thunder_clap`
- **ELITE_SPELL_POOL:** none — honesty is the elite
- **SIGNATURE_MECHANICS:** 14 or 28. The player chooses whether the bounce exists. Distinct from Chain Lightning.
- **VARIANT_PROGRESSION:** BASE frost+mark → VETERAN predicate → ELITE two-turn combo → CHAMPION hazard-bounce
- **RARITY_CURVE:** Standard. +ELITE on `arcane_surge`.
- **SYNERGIES:** `glyph_sower`, `snare_weaver`, `trip_mason`, `stone_castellan`
- **WEAKNESSES:** Don't stand on the marked/hazard/root square; spread
- **PLAYER_COUNTERPLAY:** Step off Mark; split from your Wisp; LoS break
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-ricochet-mark`, `spell-mark`
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (Chain bounce + pre-bounce predicate)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `tax_scribe`

- **NAME:** Tax Scribe
- **ROLE:** controller (zone) / debuffer
- **BASE_ELIGIBILITY:** New family; preferred chassis `bishop`. Distinct from `bone_scribe` (unit shred) and `glyph_sower` (Mark → damage). This one taxes **casts from a tile**.
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Mark the player's tile. Peer: Glyph Tax if the player is clustered or about to Inferno. Above: place the zone on the only good LoS tile.
- **STAT_SCALING_RULE:** hp 0.70, sp 1.05, sr 1.15, res 0.80, init 1.10, chc 0.80. If it is killing you with raw damage, the kit is wrong.
- **AI_TIER_PROGRESSION:** Profile `caster`. VETERAN: will not overlap two taxes (max +1). ELITE: zone the tile the player must stand on to hit the Castellan. CHAMPION: Drain Courage **after** they pay the tax (visible leftover AP).
- **CORE_SPELL_POOL:** `spell-mark`, `starter-frost`
- **ADVANCED_SPELL_POOL:** `proposed:spell-glyph-tax`, `spell-drain-courage`
- **RARE_SPELL_POOL:** `spell-expose`
- **ELITE_SPELL_POOL:** CHAMPION tax + drain (readable two-step)
- **SIGNATURE_MECHANICS:** +1 AP to cast while in the 3×3, tiles Marked. 0 damage. Pale Archivist fantasy without being a boss.
- **VARIANT_PROGRESSION:** BASE mark → VETERAN no-stack-tax → ELITE zone-the-lane → CHAMPION tax-then-drain
- **RARITY_CURVE:** Standard. +ELITE in dungeons (depth already raises level).
- **SYNERGIES:** `stone_castellan`, `void_anchoret`, `coil_arbiter` (do **not** pair two AP engines in one pack unless COURT)
- **WEAKNESSES:** Leave the zone; Null Field if it already nulls marks; high AP
- **PLAYER_COUNTERPLAY:** Step out; cheap Strike from outside; do not Inferno from inside
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-glyph-tax` (boss-gated — family is a **witness** until a second door is opened)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** HIGH (zone registry + AP hook)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `mist_walker`

- **NAME:** Mist Walker
- **ROLE:** teleporter (self)
- **BASE_ELIGIBILITY:** New family; preferred chassis `knight`. Distinct from `wraith_bishop` (swap) and `blink_cutter` (ally-swap).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: Strike then want out. Peer: Mist Step to a rear/side tile then Strike next turn. Above: Step onto a tile that is **not** a tripwire enter (teleport does not trip — use that as identity vs Mason).
- **STAT_SCALING_RULE:** hp 0.80, sp 0.90, sr 0.85, res 0.80, init 1.40, chc 1.15.
- **AI_TIER_PROGRESSION:** Profile `flanker`. VETERAN: Step only if dest is free, non-void, and creates a flank. ELITE: never end adjacent if a Step exists (CD 2). CHAMPION: Step through `fog_of_war` (no LoS on the spell) to a tile the player last occupied (public history only if that module exists; else last player cell this battle).
- **CORE_SPELL_POOL:** `physical_attack`, `proposed:spell-mist-step` (**family flip** `usableByEnemy: true` for this id only — SPELL_PROPOSALS ships it player-first)
- **ADVANCED_SPELL_POOL:** `spell-shadow-veil`, `spell-haste`
- **RARE_SPELL_POOL:** `shadow_strike`
- **ELITE_SPELL_POOL:** CHAMPION Step + Veil
- **SIGNATURE_MECHANICS:** Self free-cell dash. CD 2. Does not trip wires. Does not swap the player. Fog is flavour until the stub is wired — the spell already ignores LoS.
- **VARIANT_PROGRESSION:** BASE stab → VETERAN valued-step → ELITE hit-and-leave → CHAMPION fog-reentry
- **RARITY_CURVE:** Standard. +ELITE when `fog_of_war` is announced.
- **SYNERGIES:** `shadow_lurker`, `leech_familiar`, `hex_chorister`
- **WEAKNESSES:** Root (cannot walk, **can** still Step — Root does not block spells); zone the landing ring; CD window
- **PLAYER_COUNTERPLAY:** Root then burst; occupy the ring; Slow is weaker than Root here
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-mist-step` (challenge-gated — family observe is a second door)
- **REWARD_EXPECTATION:** Standard
- **IMPLEMENTATION_COMPLEXITY:** MED (teleportMode branch; family flag flip)
- **STATUS:** PROPOSED

---

### ENEMY_ID: `leech_familiar`

- **NAME:** Leech Familiar
- **ROLE:** summoner (sacrificial) / buffer
- **BASE_ELIGIBILITY:** New family; preferred chassis `pawn`. At most one per pack. Replaces overlay on this body. Distinct from `brood_chanter` (combat pets) and `cinder_martyr` (self-bomb).
- **RELATIVE_LEVEL_BEHAVIOUR:** Below: spawn familiar as a chump-block. Peer: spawn on a tile the player wants to Strike. Above: spawn so killing it Marks the killer's tile for a Vicar / Sexton.
- **STAT_SCALING_RULE:** hp 0.85, sp 0.80, sr 0.85, res 0.90, init 1.00, chc 0.80. Familiar is hpScale 0.25, no kit.
- **AI_TIER_PROGRESSION:** Profile `summoner` with `summonAI: "sacrificial"`. VETERAN: skip if a familiar already lives. ELITE: Enrage **self** after the death-heal. CHAMPION: Cursed Wound the player **after** they take the heal (anti-heal on the window).
- **CORE_SPELL_POOL:** `proposed:spell-blood-familiar`
- **ADVANCED_SPELL_POOL:** `spell-enrage` (self), `physical_attack`
- **RARE_SPELL_POOL:** `spell-cursed-wound`
- **ELITE_SPELL_POOL:** CHAMPION death-heal + wound
- **SIGNATURE_MECHANICS:** You choose: kill the 1-hit body and heal the owner + Mark your tile, or ignore it and fight around a block. Lifespan fade **does** fire on-death. The heal **does** trip `healUsed` if a no-heal challenge keys off heal effects.
- **VARIANT_PROGRESSION:** BASE chump → VETERAN one-at-a-time → ELITE enrage-on-feed → CHAMPION punish-the-heal
- **RARITY_CURVE:** Standard. +VETERAN on `blood_moon` / `vampiric_ground`.
- **SYNERGIES:** `pain_suture` (don't hit either), `ricochet_vicar` (Mark on killer tile), `bell_sexton`
- **WEAKNESSES:** Ignore the familiar; kill the owner first; Cursed Wound does not stop the trigger
- **PLAYER_COUNTERPLAY:** Kite; kill the Leech; do not “tidy” the pet
- **SPELL_DISCOVERY_OPPORTUNITIES:** `spell-blood-familiar` (boss-gated — witness)
- **REWARD_EXPECTATION:** Standard. Familiar death is not a reward event.
- **IMPLEMENTATION_COMPLEXITY:** MED (lifespan hook + metadata heal/mark)
- **STATUS:** PROPOSED

---

## 5. Wave 1 amendments (not new ids)

| Family | Amendment | Why |
| :--- | :--- | :--- |
| `rift_hook` | ELITE/RARE may use official `spell-hook-line` | SPELL_PROPOSALS now owns that id; do not invent a second hook |
| `ember_knight` | Do **not** steal `spell-cinder-tile` as the wake | Cinder is one painted cell; wake is tiles **left**. `trip_mason` / queens may use Cinder |
| `glyph_sower` | Mark remains CORE; `spell-glyph-tax` belongs to `tax_scribe` | Category split: amp vs AP zone |
| `iron_golem` | Do **not** gain Ward Plate | Absorb is Plate Warden's identity |
| `void_mirror` | Do **not** gain Pain Link | Spell reflect ≠ HP redirect |
| `brood_chanter` | Do **not** gain turret or familiar | Three summon engines stay three families |
| All Wave 1 | Fifth `wRare` 2% skin per §1 | Mechanical identity, not a level bracket |

---

## 6. Identity matrix (Wave 2 — keep kits coherent)

| Family | Allowed categories / flags | Forbidden |
| :--- | :--- | :--- |
| rank_lancer | damage (linear/physical), buff(res/mp) | heal, isSummon, isTrap, absorb |
| bash_bruiser | pushback, damage (physical), buff(dmg/res) | heal, isSummon, linear-nukes |
| snare_weaver | cc (root), debuff(mp), isMark | heal, isSummon, isSacrifice |
| trip_mason | isTrap, isMark, hazard tile | heal, isSummon, inferno-as-identity |
| void_anchoret | attract, damage, debuff, void-anchor | heal, isSummon, swap (that is rift_hook) |
| bell_sexton | delayed execute, debuff, anti-heal | heal, isSummon, isSacrifice |
| execute_jackal | damage, isMark, isSacrifice (wounded) | heal, isSummon, long artillery |
| plate_warden | absorb, defense, damage (physical) | isSummon, teleport, inferno |
| pain_suture | redirect, absorb, defense | isSummon, inferno, heal |
| stone_castellan | isSummon (turret), defense, isMark | wolf/archer/bomber, heal |
| ricochet_vicar | damage, isMark, conditional bounce | heal, melee-only, isSummon |
| tax_scribe | zoneApTax, isMark, debuff(ap) | heal, isSummon, inferno |
| mist_walker | teleport (self_free_cell), damage | heal, isSummon, swap-as-primary |
| leech_familiar | isSummon (sacrificial), buff(dmg), anti-heal | turret, wolf, inferno |

Wave 1 matrix in the 2026-08-31 doc still applies to those 22 ids.

---

## 7. Role coverage after Wave 2

| Archetype | Wave 1 owner | Wave 2 extra (new verb) |
| :--- | :--- | :--- |
| bruiser | crimson_spawn | rank_lancer (file), bash_bruiser (push) |
| sniper | glass_sniper | — |
| kiter | tide_shade | — |
| assassin | shadow_lurker | execute_jackal (threshold) |
| healer | pale_cantor | — |
| buffer | hex_chorister | leech_familiar (death-heal is a trap buff) |
| debuffer | bone_scribe | tax_scribe (tile AP) |
| summoner | brood_chanter | stone_castellan (turret), leech_familiar |
| controller | coil_arbiter | snare_weaver (root), void_anchoret (pull) |
| tank | iron_golem | plate_warden (absorb) |
| protector | leash_warden | pain_suture (redirect) |
| artillery | storm_caller | ricochet_vicar, stone_castellan |
| kamikaze | cinder_martyr | — (familiar is not kamikaze) |
| teleporter | wraith_bishop, blink_cutter | mist_walker (dash) |
| displacement | rift_hook | bash_bruiser, void_anchoret |
| hazard creator | ember_knight, glyph_sower | trip_mason |
| status specialist | plague_rat | bell_sexton |
| anti-summon | null_censor | pain_suture (eat the pet) |
| anti-ranged | void_mirror, rust_reaver | rank_lancer (file punish) |
| anti-melee | leash_warden | pain_suture, trip_mason |

---

## 8. Implementation prerequisites (still not this change)

Order from Wave 1 §6, plus Wave 2 engine verbs:

1. Numeric kit band into `buildEnemyKit` (`WX` 12484).
2. Keep family HP through `calcEnemyMaxHp` (`WX` 12533–12538).
3. Stop writing `res`/`sp` as 0.05–0.75 (`WX` 6467–6523).
4. Explicit `aiProfile` / `familyKit`; stop healer inference and `family.includes("berserk")`.
5. Force preferred chassis.
6. Wave 1 kits first (live ids).
7. Then one verb at a time: `pushback` → `attract` → `rootTurns` → absorb → delayed execute → trap redefine → turret AI → redirect → zone AP.
8. Proposed spells are metadata rows. Wire `effectCategory`, never names.
9. Register text updates only when hooks land.

Do **not** retune `pickEnemyLevelFromTiers` percents. Do not treat 999 as endgame. Do not implement `instantKill`. Do not add a parallel reward writer.

---

## 9. What this run did not do

- No production TypeScript / Motoko.
- No re-proposal of the 22 Wave 1 ids as new families.
- No boss redesign.
- No player or enemy level cap.
- No RAF / mapGen / turn / damage-math edits.
- No reward writers outside `applyRewards`.
- No new persist stats (`wp` / `wr` / `scp` stay gone).
