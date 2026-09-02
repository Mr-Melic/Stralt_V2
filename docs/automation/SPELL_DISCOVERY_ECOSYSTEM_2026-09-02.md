# Dynamic Spell Discovery & Enemy Spell Evolution — Wave 3

**Author:** Dynamic Spell Discovery and Enemy Spell Evolution Designer  
**Automation:** `c26e5a83-a492-11f1-a7d1-d6b4613131ce`  
**Date:** 2026-09-02  
**Status:** PROPOSED — design only. **No production code in this change.**  
**HEAD audited:** `58302bc` (`Merge pull request #258` — GameKey shop)

Stralt has **no character level cap**. Wave 1 ([`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md), PR #156) is the **product law** for observe → win → unlock. Wave 2 ([`SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md), PR #226) is the **generation stamp** (`generationMin`) and G≥2 catalog. This document does **not** replace either. It is Generation 3: deferred engine verbs, unused feat / challenge / boss / special doors, and `generationMin: 3` family attachments.

ACTION_IDs: [`ACTION_IDS_SDE_2026-09-02.md`](./ACTION_IDS_SDE_2026-09-02.md).

**Do not implement production code from this PR.**

---

## 0. Sibling designs (do not duplicate)

| Sibling | Path / PR | Owns |
| :--- | :--- | :--- |
| Wave-1 discovery contract | #156 — `SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md` | State machine, innate four, persist writers, UX copy, Wave-1 cards |
| Wave-2 discovery contract | #226 — `SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md` | `generationMin`, G≥2 verbs, W2 specials, unused-door stamps through 2026-09-01 |
| Wave-1 / Wave-2 ACTION_IDs | `ACTION_IDS_SDE-2026-08-31.md`, `ACTION_IDS_SDE_2026-09-01.md` | Ownership split, observe hook, victory commit, G≥2 slot — **still blocking, still NEW** |
| Spell admin | #116 / #187 | `ownedSpellIds` / `observedSpellIds`, soft-retire |
| Tactical gap-fillers W1 | #120 — `SPELL_PROPOSALS_2026-08-31.md` | `spell-shoulder-bash` … `spell-void-anchor` |
| Tactical gap-fillers W2 | #185 — `SPELL_PROPOSALS_2026-09-01.md` | `spell-file-lance` … `spell-life-tether` |
| Tactical gap-fillers W3 | #282 — `SPELL_PROPOSALS_2026-09-02.md` | Deferred-hole cards: Ley Toll, Fan Bolt, Pawn Trade, Back Step, Twin Gate, Sidestep Ward, Far Sting, plus Soul Sip … Board Tilt |
| Family sheets | #136 + 2026-09-01 elite pass | Variant floors, pack recipes, Wave-2 families |
| Boss adaptations | #137 / #197 — `docs/design/BOSS_AND_SPELL_DISCOVERY.md` | `spell-ember-step` … `spell-echo-cast`; Wave-3 bosses reuse #120 ids |
| Encounter rooms | `docs/encounters/ENCOUNTER_EVOLUTION_2026-09-01.md` | Room pacing; Wave-3 specials attach here |
| PX coherence | `PX_COHERENCE_AUDIT_2026-09-01.md` | MP is the **walk** resource; `CharacterStats.evasion` is persist-only |

**Id collision rule:** do not reuse any id in §0.1. Wave-3 ids in §11 are new.

### 0.1 Reserved tombstone (never re-propose)

**#120:** `spell-shoulder-bash`, `spell-hook-line`, `spell-mist-step`, `spell-grave-bell`, `spell-root-snare`, `spell-lens-shift`, `spell-ward-plate`, `spell-pain-link`, `spell-cleanse-rite`, `spell-cinder-tile`, `spell-tripwire`, `spell-glyph-tax`, `spell-stone-turret`, `spell-turret-shard`, `spell-blood-familiar`, `spell-ricochet-mark`, `spell-void-anchor`.

**#137:** `spell-ember-step`, `spell-caltrop`, `spell-shock-glyph`, `spell-exsanguinate`, `spell-glyph-snare`, `spell-vault`, `spell-brood-ward`, `spell-aftershock`, `spell-rot-brand`, `spell-echo-cast`.

**Wave 1 SDE:** `spell-quiet-hex`, `spell-chain-ward`, `spell-crosswind`, `spell-glass-shot`, `spell-ember-wake`, `spell-split-mark`, `spell-phase-slip`, `spell-sever-tether`, `spell-overcast`, `spell-second-wind`, `spell-choir-hymn`, `spell-oath-bind`, `spell-leech-tempo`, `spell-null-brand`, `spell-false-retreat`, `spell-blood-benediction`, `spell-ward-interpose`, `spell-martyr-fuse`, `spell-hex-of-silence`. Formal blink id remains `spell-phase-slip` (never add `spell-phase-step`).

**Wave 2 SDE:** `spell-load-bearing`, `spell-void-glyph`, `spell-paper-wind`, `spell-rear-cut`, `spell-hold-ground`, `spell-rime-sheet`, `spell-hex-theft`, `spell-still-brand`, `spell-grounded-lock`, `spell-file-lance`, `spell-loan-tempo`, `spell-dispel-thread`, `spell-taunt-oath`, `spell-convert-whelp`, `spell-last-ember`, `spell-blood-tithe`, `spell-search-dust`, `spell-fog-hood`, `spell-claim-ward`, `spell-self-anchor`, `spell-pack-howl`, `spell-reliquary-lock`.

**#185 tactical Wave 2 (also reserved, even where an id collides with SDE Wave 2):** `spell-fuse-tile`, `spell-coup-de-grace`, `spell-ignite-stacks`, `spell-short-sight`, `spell-tempo-gift`, `spell-absolve`, `spell-cross-cut`, `spell-rime-tile`, `spell-smoke-veil`, `spell-sinkhole`, `spell-leash-hook`, `spell-bastion-pylon`, `spell-goad`, `spell-life-tether`. (`spell-file-lance` and `spell-blood-tithe` already listed above.)

**#282 tactical Wave 3 (same-day; never re-propose):** `spell-ley-toll`, `spell-fan-bolt`, `spell-pawn-trade`, `spell-back-step`, `spell-twin-gate`, `spell-sidestep-ward`, `spell-far-sting`, `spell-soul-sip`, `spell-open-pit`, `spell-mercy-font`, `spell-font-pulse`, `spell-lens-share`, `spell-stride-brand`, `spell-hex-toll`, `spell-slide-tile`, `spell-rank-lock`, `spell-board-tilt`.

**Do not alias** `spell-rime-sheet` ↔ `spell-rime-tile`, `spell-paper-wind` ↔ `spell-short-sight`, `spell-loan-tempo` ↔ `spell-tempo-gift`, `spell-taunt-oath` ↔ `spell-goad`, `spell-load-bearing` ↔ `spell-life-tether`, `spell-quiet-hex` ↔ `spell-hex-toll`, `spell-still-brand` ↔ `spell-stride-brand`. Those are sibling-owned fantasies. Wave 3 SDE **stamps** #282 ids onto families and unused doors; it does not clone them.

### 0.2 Same-day #282 hole ownership (stamp, do not clone)

#282 shipped the seven Wave-2-deferred engine verbs. This document does **not** re-author them. Discovery attaches family / observe / unused-door metadata only:

| Hole | #282 id | SDE Wave-3 stamp |
| :--- | :--- | :--- |
| First `mpCost > 0` (self amp) | `spell-ley-toll` | World casters may demonstrate; Tide **also** gets Undertow (attract + 1 walk-MP — not an amp clone) |
| Cone `areaShape` | `spell-fan-bolt` | Ember / Cinder Martyr ELITE observe+win (`generationMin: 3`) |
| Two-other-body swap | `spell-pawn-trade` | Wraith / Rift G≥3 observe+win |
| Self knockback | `spell-back-step` | rust_reaver observe+win **or** `legendary_3`. **Do not** also grant on `easy_3` — Wave 1 Second Wind already owns that door |
| Portal-pair | `spell-twin-gate` | #282 BOSS `void_grandmaster` first-win. SDE adds Void Mirror observe+win as MULTI child. Pads stay off `map.portals` |
| Evade charge | `spell-sidestep-ward` | #282 ACHIEVEMENT `critical_striker`. SDE adds Lurker observe+win as MULTI child |
| Distance-scaled poke | `spell-far-sting` | Glass Sniper G≥3 observe+win |
| Steal 1 MP | `spell-soul-sip` | Tide / Coil G≥3 observe+win (do not add a second steal-MP id) |

Hex Toll (`spell-hex-toll`) is a Quiet Hex near-clone. **Do not** attach it in SDE pools; Quiet Hex remains the discovery tax.

---

## 1. Why discovery is still inert (re-audit `origin/main` @ `58302bc`)

Wave 1 and Wave 2 did not ship. The live player path still has nothing to discover. Line numbers moved with WX shrinkage (20,063 → **19,253**); the defects did not.

| Fact | Where (this HEAD) | Effect |
| :--- | :--- | :--- |
| Every `starterSpells` row is forced `isBaseSpell: true` and unioned into `ownedSpells` | `WorldExploration.tsx` 2356–2401 | The 32-id frontend catalog is pre-owned |
| Comment still says “ALL starter spells + physical attack” | `WorldExploration.tsx` 2356–2357 | Innate-four split (`SDE-2026-08-31-001`) not landed |
| Backend rows enter the library via `shouldIncludeBackendSpellInLibrary` | `adminSafety.ts` 551–558; WX 2387–2397 | Drops `usableByPlayer === false` unless already owned. **Does not** create a discovery path |
| No `ownedSpellIds` / `observedSpellIds` persist maps | `Character` still `spellLevelKeys` / `spellBarOrder` | Observation cannot survive reload |
| Recap grants XP/Doka/feats only | `PostBattleRecap.tsx` 6–34 `BattleRecapData` | No `discoveredSpells` field |
| Achievements grant Doka only | `admin.mo` `defaultAchievements()` 309–326 | Feats cannot grant a spell id |
| Challenges grant Doka / XP / badge | `challengeCompletion.ts` `DEFAULT_CHALLENGES` 38–103 | Challenges cannot grant a spell id |
| `upgradeSpell` levels a known id and **charges Doka** | `main.mo` (unchanged contract) | Must never be the grant writer |
| `ENEMY_KITS` is still piece-type + zone | `enemyAI.ts` 156–193 | Seeing a bishop cast Frost teaches nothing |
| `buildEnemyKit(pieceType, currentMap.levelZone)` still gets a `{ name, minLevel, maxLevel }` object | `WorldExploration.tsx` 12035; zone object built at 4680–4684 | `Math.floor(levelZone)` is `NaN`; every kit stays zone 0 |
| `inferArchetype` still treats any `healAmount > 0` as healer | `enemyAI.ts` 421–426 | Drain kits become healers |
| Summon archetype still falls back to **name** | `enemyAI.ts` 210–217 (`wolf` / `golem` / `wisp`) | Forbidden for new ids |
| `computeAITier` still plateaus at label 10 after level 900 + 30% noise | `combatMath.ts` 36–51 | Soft band, **not** a content cap |
| `pickEnemyLevelFromTiers` still clamps `maxTier = floor(999 / ts)` | `combatMath.ts` 54–58 | Spawn safety rail, **not** a last generation |
| Every frontend `mpCost` is `0` | `spellData.ts` (all rows) | Wave 3 adds **one** walk-MP spend; not a mana bar |
| `targetType: "line"` exists; `areaShape` is unread | `targeting.ts` 531–567; area expand is Chebyshev `areaRadius` 646–674 | Cone this wave uses `hitTiles`, not an `areaShape` rewrite |
| `CharacterStats.evasion` is unused in combat | persist field only; PX audit DEPRECATE-or-EXPAND | Sidestep Veil is a **spell charge**, not a `combatMath` miss % |
| Open PR queue | **#259** only (EOP GameKey migration; no spell docs) | This change does not overlap those files |

Quality audit still marks discovery pacing `NO_MEASURABLE_EFFECT`. Wave-1 P0 (`SDE-2026-08-31-001`…`003`, `006`) and Wave-2 P0 (`SDE-2026-09-01-001`, `003`) remain the prerequisite. **Do not land Wave-3 data before the ownership split and G resolve.**

**Do not unlock because the encounter started.**  
**Do not require the player to be hit.** Hostile **use** (WX-applied `kind === "cast"` that spent AP) is sufficient observation.

---

## 2. Design principles (unchanged law)

Wave 1 §2 and Wave 2 §2 still apply in full. Restated only where Wave 3 adds a clause:

1. **Id is identity.** Observation, kits, AI, and grants key off `spell.id` only.
2. **Catalog ≠ ownership.**
3. **Use → observe → win → unlock** is the default `ENEMY_DISCOVERY` path. Same-encounter victory. `allowLaterVictory` defaults **false**.
4. **Tactical patience** is a real decision. G≥3 rares make it sharper: a CHAMPION may hold the generation-3 verb until the player has already committed MP.
5. **Not every ability is player-learnable.** `ENEMY_ONLY` / `BOSS_ONLY` / `SYSTEM_ONLY` remain closed.
6. **Never assign a spell an AI cannot use.** Missing `aiProfile` / `aiHint` = drop from resolve.
7. **Expand, do not replace.** Wave 3 fills holes Wave 1, Wave 2, #120, and #185 left open (see §10). It does not clone Shield, Quiet Hex, Cinder Tile, Root, Lens, Phase Slip, Paper Wind, Rime Sheet, Hold Ground, File Lance, or Twin-body Swap-with-caster.
8. **No last tier.** `G = floor(max(0, R) / T)` is unbounded. Wave 3 stamps `generationMin: 3` on family verbs. When the next designer needs a verb, they stamp `generationMin = currentPublishedMax(family) + 1`.
9. **Backend-authoritative, idempotent.** Same writers as Wave 1 §8. No Doka/XP from the grant. No `upgradeSpell`. No `updateCharacter`.
10. **Single recap.** `NEW SPELL DISCOVERED` on root `PostBattleRecap` only.
11. **Do not touch** RAF, map generation, turn logic, or damage math (`combatMath.ts` RES/SR/CHC/dealDamage). Payload numbers are `SpellConfig.damage` / `effectParams` resolved **before** existing `dealDamage`.
12. **MP is the walk resource.** Catalog default stays `mpCost: 0`. Wave 3 adds **exactly one** id (`spell-undertow`) that spends 1 MP from that walk pool. This is a positioning tradeoff, not a second mana bar and not a new persist stat.
13. **Evasion persist field stays unread.** #282 `spell-sidestep-ward` writes `evadeNextHits` on an ActiveEffect. Do not teach Enemy Register “evasion %.” Do not add a miss roll to `combatMath.ts`.

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

Wave-3 additions to “what is used”:

| Event | Observed? |
| :--- | :--- |
| `spell-undertow` illegal because caster MP `< mpCost` (AI skip / cannot target) | **No** — no AP spend |
| `spell-undertow` player-forced fizzle after AP spend with MP `< mpCost` | **Yes** — AP was spent (Wave 2 fizzle rule) |
| #282 `spell-twin-gate` **paint** (AP spent, pads planted) | **Yes** — the technique was used |
| Later **step through** a twin-gate pad | **No** — do not double-observe |
| `spell-far-watch` **armed** (AP spent) | **Yes** — same as Hold Ground arm |
| `spell-far-watch` **snap** later | **No** |
| #282 `spell-back-step` self-push | **Yes** on the cast; landing on lava/spikes is not a second observe |
| #282 `spell-pawn-trade` fizzle (fewer than two other hostiles) | **Yes** if AP was spent |
| `spell-pack-tempo` aura ticking without a cast | **No** — no AP spend, and `ENEMY_ONLY` anyway |
| `spell-sovereign-fold` | **No persist** — `BOSS_ONLY`; optional dim `UNKNOWN TECHNIQUE` log |

Flee / death: observation **stays**. Unlock does **not** fire. A later win without re-observation does **not** unlock (default).

---

## 4. Acquisition sources (closed enums)

Same table as Wave 1 §4. Wave 3 stamps unused **doors**, not new enum members.

| Source | Wave-3 grants (this doc) |
| :--- | :--- |
| `ENEMY_DISCOVERY` | Unique G≥3 family verbs in §11 **plus** #282 stamps in §0.2 |
| `ELITE` | Last Ward, Kennel Lock, Far Watch, Summon Bane |
| `ACHIEVEMENT` | Mercy Hex ← `pacifist_run`. Sidestep Ward already ← `critical_striker` (#282) — do not restamp that feat |
| `CHALLENGE` | Bloodless Plate ← `easy_1` (`no_healing`) |
| `BOSS` | Crimson Pact ← `crimson_countess`. Twin Gate already ← `void_grandmaster` (#282) — SDE only adds the Void Mirror observe child |
| `SPECIAL_ENCOUNTER` | Gate Sight ← `gate_gallery` |
| `MULTI_SOURCE` | Back Step ← rust_reaver observe+win **or** `legendary_3`. **Do not** use #282’s `easy_3` child — Wave 1 Second Wind owns that door. Sidestep Ward ← lurker observe **or** `critical_striker` (first child wins) |
| `ENEMY_ONLY` | Pack Tempo (never owned) |
| `BOSS_ONLY` | Sovereign Fold (never owned) |
| `SYSTEM_ONLY` | unchanged innate four |

Do **not** gate a Wave-3 spell on `unstoppable` / `level_10`. That feat is a milestone, not a last tier.

`usableByPlayer` / `usableByEnemy` remain **cast gates**, not acquisition.

### 4.1 Doors already stamped (do not restamp)

| Door | Owner |
| :--- | :--- |
| `spell_scholar` | Wave 1 Overcast (`spell-overcast`); live Barrier also tagged scholar — do not add a third |
| `explorer` | Wave 2 Search Dust |
| `easy_3` / `hard_3` | Wave 1 Second Wind |
| `easy_2` | Wave 2 Self Anchor MULTI child |
| `hard_2` | Wave 2 Blood Tithe |
| `legendary_2` | Wave 1 live-catalog Timestep |
| Twin Monarchs | Wave 1 Choir Hymn |
| `chessboard_lich` | Wave 2 Claim Ward |
| `echo_dummies` | Wave 1 False Retreat |
| `mist_gallery` | Wave 2 Fog Hood |
| `rime_gallery` / `still_court` | Wave 2 teach rooms (observe+win, not extra grants) |

### 4.2 Leftover doors (Wave 4+, not this pass)

`first_blood`, `survivor`, `doka_hoarder`, `betrayal_witness`, `leader_slayer`, `jackpot`, `spell_master`, `rich_vampire`, `hard_1`, `legendary_1`. Economy feats stay Doka-only until a designer needs a non-damage identity. `unstoppable` stays unused forever as a spell gate. `loot_hunter`, `double_betrayal`, and `critical_striker` are #282 doors — do not restamp.

---

## 5. Spell pool evolution — Generation 3 (never a last tier)

Wave 1 §6 five pools and Wave 2 §5 generation stamp stay. Wave 3 adds the **G≥3 extra slot**.

```
G = floor(max(0, R) / T)     // 0, 1, 2, 3, … no maximum
R = enemy.level − player.level
T = current tierSize (default 10)
```

| G | Pool policy (additive) |
| :--- | :--- |
| 0 | CORE only (+ Strike if empty) |
| 1 | CORE + one ADVANCED (`generationMin ≤ 1`) |
| 2 | ADVANCED guaranteed; one slot may be `generationMin ≤ 2`; RARE eligible |
| 3 | RARE weight rises; one RARE may be `generationMin ≤ 3`; **one additional** ADVANCED ∪ RARE ∪ ELITE slot with `generationMin ≤ 3` |
| 4+ | Same recipe. Add a definition with `generationMin = currentPublishedMax(family) + 1`. **Still the same family.** |

There is **no** `G_max`. Do not delete Wave-1 CORE or Wave-2 G2 verbs to “make room.” Do not require `enemy.level >= N` as a last level.

`currentPublishedMax` after this document is **3** for families listed in §12. It remains a data query, not a constant in combat math.

### 5.1 Resolve order (later implementation — extends Wave 2 §5.1)

```
resolveEnemyKit(familyId, pieceType, R, variant, encounterTags, aiProfile) → SpellConfig[]
  1. CORE_POOL (always; generationMin 0)
  2. if G ≥ 1 or variant ≥ VETERAN: one ADVANCED with generationMin ≤ G
  3. if G ≥ 2: one additional slot from ADVANCED ∪ RARE with generationMin ≤ G
     (skip if no legal id)
  4. if rare roll hits: at most one RARE_POOL id with generationMin ≤ G
  5. if G ≥ 3: one additional slot from ADVANCED ∪ RARE ∪ ELITE with generationMin ≤ G
     (skip if no legal id; this is the Generation 3 verb)
  6. if elite/champion tag: ELITE_POOL / SIGNATURE the AI can use
  7. drop any id whose AI_REQUIREMENTS are unmet
  8. keep ENEMY_ONLY on enemies (they cast; they never grant)
  9. if empty: [physical_attack]
```

Kit growth must pass a **number** (`G` or `floor(enemy.level / T)`), not `currentMap.levelZone` (the NaN bug is still live at `WorldExploration.tsx` 12035).

---

## 6. New `aiHint` keys (metadata, not names)

Wave 1 §9.1 and Wave 2 §6 profiles still required. Until a profile exists, **do not** put its required spells in a live pool. Healer-inference lock unchanged: non-healer CORE must not include `healAmount > 0`.

| `aiHint` | Safe profiles | Predicate (intent) |
| :--- | :--- | :--- |
| `spend_walk_mp_to_cast` | kiter, caster, controller | Caster MP ≥ `mpCost` **and** remaining MP after spend still lets them not die on a hazard this turn; skip if they must walk ≥ 2 to threaten |
| `cone_if_two_in_wedge` | caster, bomber | ≥ 2 hostiles in the 90° wedge of length 3; else skip if Inferno / Frost Nova is in kit |
| `swap_two_other_hostiles` | caster, controller | ≥ 2 living hostiles-to-caster (player + player summons count) not including self; skip if swapping would un-threaten the caster |
| `melee_then_recoil` | flanker, berserker, charger | Adjacent target; landing tile behind caster is floor (not void/portal); skip if landing is lava while HP% < 40 |
| `paint_portal_pair` | caster | Two floor cells Chebyshev 2–4 apart, one adjacent to player walk path, one adjacent to caster; skip if a pair already lives |
| `evade_next_spell` | kiter, flanker | Caster is the likely next spell target; skip if charges already up |
| `prefer_max_chebyshev` | caster, kiter | Cast from max legal range; skip if Chebyshev ≤ 2 and Strike is better |
| `steal_one_mp` | caster, controller, kiter | Target MP ≥ 1; skip if target already at 0 (use Frost / Slow instead) |
| `self_buff_if_zero_mp_this_turn` | guardian, charger | Caster spent 0 MP so far this turn **and** intends to spend 0 more; skip if they still need to close |
| `slide_target_along_file` | caster, controller | Target shares rank **or** file; the 1-step toward a hazard / ally bash is free; skip if the step is blocked |
| `invert_leftover_ap_mp` | buffer, caster | Ally (or self) has leftover AP ≥ 2 and MP = 0, or leftover MP ≥ 2 and AP = 0; skip if both already comfortable |
| `tax_next_walk_ap` | caster, controller | Target walked last turn **or** has MP ≥ 2; skip if already debt-marked |
| `knight_leap_poke` | flanker | A (2,1) landing on the target is in bounds, not blocked, Chebyshev from caster matches knight jump; skip if adjacent (use Rear Cut / Strike) |
| `range_after_long_walk` | kiter, caster | Caster already walked ≥ 2 this turn **or** will before the cast; skip on turn 1 if they spawned in range |
| `self_buff_if_low_hp_next_spell_free` | guardian, charger, berserker | Caster HP% ≤ 30; skip if already armed |
| `kennel_summons` | summoner, guardian | ≥ 1 living allied summon; skip if none |
| `overwatch_enter_band_3_4` | kiter, caster | Player is outside 4 **or** likely to walk into 3–4; skip if already in 1–2 (use Strike / Glass Shot) |
| `pack_ap_aura` | buffer | CHAMPION only; skip if aura up |
| `fold_two_player_side` | **boss AI only** | Exactly two living player-side bodies; skip if 0–1 |

If no listed profile can satisfy the hint, the spell is `ENEMY_ONLY` **or** `usableByEnemy: false`.

---

## 7. Spell discovery UX (unchanged chrome)

Wave 1 §7 stands. No second visual system.

- In-battle: `TECHNIQUE OBSERVED` — top-centre toast + `logBattleEntry`, 2.4s, gold/crimson, name only, dedup `(encounterId, spellId)`. Existing toast family: achievement path `WorldExploration.tsx` 2144–2208.
- After victory: `NEW SPELL DISCOVERED` on root recap. Fields: **name, role, AP, range, target type, key effect, source enemy**.
- Twin-gate / Far Watch may add a **battle-log line** when the gate is used or the snap fires — combat feedback, not a second discovery toast.
- `ENEMY_ONLY` / `BOSS_ONLY`: optional dim `UNKNOWN TECHNIQUE` log. No observe persist.
- Undertow’s MP spend is **not** a second cue. One toast for the spell name.

---

## 8. Persistence (same writers)

Wave 1 §8 is the persist contract. Wave 3 adds **no** new canister methods.

| Writer | Wave-3 use |
| :--- | :--- |
| `recordSpellObservation` | All `OBSERVATION_REQUIRED` cards |
| `commitSpellDiscoveries` | Victory grants; empty if already owned |
| `unlockOwnedSpell` | `pacifist_run`, `easy_1`, `crimson_countess`, `gate_gallery`, `legendary_3` child, #282 MULTI children (Twin Gate / Sidestep Ward / Back Step) |

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
- Recoil into lava/spikes uses existing hazard helpers. Player-cast recoil onto lava: `recordInBattleChallengeDamage` only while `inBattleRef` if treated as environmental; if treated as part of the spell-hit, `recordChallengeDamageTaken`. **This card picks environmental** for the landing tile (the damage is the hazard, not the spell). Self-HP paid by Crimson Pact / Mercy Hex uses `recordChallengeSelfHpLoss` (floor at 1).

---

## 9. Special encounters (Wave 3)

Tagged world/dungeon rooms. Not level gates. Maps stay solvable (`finalizePlayableLayout`). Rewards still go through `applyRewards`; the **spell** grant is `unlockOwnedSpell` / observe+win, never a second wallet. **Do not** implement the `fog_of_war` stub. **Do not** edit `mapGen.ts` algorithms.

| `encounterId` | Composition (intent) | Discoverable |
| :--- | :--- | :--- |
| `undertow_channel` | Tide Shade on existing ice; AI prefers Undertow if it has MP ≥ 1 | `spell-undertow` via observe+win |
| `ember_fan` | Ember Knight + one pawn; open wedge | #282 `spell-fan-bolt` via observe+win |
| `rift_twins` | Wraith Bishop + Rift Hook; two player-side bodies | #282 `spell-pawn-trade` via observe+win |
| `long_gallery` | Glass Sniper at Chebyshev 4–6 down a file | #282 `spell-far-sting` via observe+win |
| `gate_gallery` | Void Mirror + visible floor pair markers (not world portals) | `spell-gate-sight` on **victory** (no observation — `SPECIAL_ENCOUNTER`) |

Wave-1 `echo_dummies` and Wave-2 `rime_gallery` / `still_court` / `mist_gallery` are not re-specified.

#282 Twin Gate stays BOSS `void_grandmaster` first-win plus Void Mirror observe+win (MULTI). `gate_gallery` grants **Gate Sight**, a weaker LoS peek, not a second Twin Gate copy.

---

## 10. Balance doctrine — holes this wave fills

Wave 1 + Wave 2 + #120 + #185 already cover: push, pull-to-caster, blink, root, range buff **and** cut, absorb, redirect, cleanse self **and** ally, burn tile, hidden trap, AP zone, turret, sacrificial pet, conditional bounce, next-spell AP tax, adjacent RES share, min-range sniper, walk-off fire, split mark, summon lock, init steal, decoy, ally heal, ally swap, damage share, anti-heal tile, flank gate, melee overwatch, ice **leave**-tax, steal buff, punish 0 MP, block swap/blink, linear file poke, AP loan, strip buff, taunt, steal dying pet, low-HP next physical, HP→AP, reveal traps, LoS range cut, anti-swap cell, ignore push/pull, delayed tile fuse, instant execute, DoT detonate, cross AoE, tile-gravity, ally rescue pull, ice tile (tactical), smoke, sinkhole, leash hook, bastion, goad, life tether.

**Still open (Wave 3 SDE unique ids).** The seven deferred engine holes are #282’s; this table is what Discovery **adds**.

| Hole | Wave-3 id | Why it is not a clone |
| :--- | :--- | :--- |
| Walk-MP spend + attract 1 | `spell-undertow` | #282 Ley Toll is next-cast **amp** at `mpCost: 2`. Undertow is attract + 1 walk-MP. Catalog default stays `mpCost: 0` except these two sibling ids |
| Enter MP tax tile | `spell-mire-sheet` | Rime Sheet is **leave**-tax. #282 Slide Tile is a conveyor |
| LoS origin from an ally | `spell-borrowed-eye` | Gate Sight ignores one barrier. Fog Hood cuts **their** range. #282 Lens Share is ally **range** |
| Bonus vs summons | `spell-summon-bane` | Convert steals. Null Brand lockouts. Kennel leashes **allied** pets |
| 0-MP-spent self RES | `spell-planted-stance` | Opposite of Still Brand. Not Iron Skin |
| Forced 1-step along file | `spell-file-slide` | #282 Slide Tile is ground conveyor. This slides a **unit** on a shared rank/file |
| Swap leftover AP↔MP | `spell-tempo-invert` | Not Haste / Loan Tempo / Second Wind (those grant) |
| Next **walk** costs +1 AP | `spell-debt-mark` | Quiet Hex taxes the next **spell**. #282 Hex Toll is a Quiet Hex near-clone — do not pool it |
| Knight-jump poke | `spell-knight-pierce` | Not Phase Slip. Not Rear Cut. (2,1) only |
| Range after a long walk | `spell-split-pace` | Lens / Overcast have no walk gate |
| Low-HP next **spell** free | `spell-last-ward` | Last Ember is next **physical** damage |
| Summons cannot stray | `spell-kennel-lock` | Null Brand is hostile lockout |
| Ranged overwatch band 3–4 | `spell-far-watch` | Hold Ground is melee enter-1 |
| Pacifist inversion | `spell-mercy-hex` | #282 Mercy Font is a heal totem on `loot_hunter`. This inverts **their** nuke. `pacifist_run` door |
| Absorb that is not a heal | `spell-bloodless-plate` | `easy_1` identity. Ward Plate is #120 |
| HP-pay next physical lifesteal | `spell-crimson-pact` | Sacrifice / Blood Tithe / Last Ember are different spends |
| Ignore one barrier for LoS | `spell-gate-sight` | Not Twin Gate pads. Not Fog Hood |
| Pack AP aura | `spell-pack-tempo` | Pack Howl is CHC. Never owned |
| Fold two player-side bodies | `spell-sovereign-fold` | #282 Pawn Trade is two hostiles-to-caster. Never owned |

Duplicates still forbidden: Shield ≈ Iron Skin; Blood Mend ≈ Rally; Poison ≈ Venom; Expose ≈ Veil; Mirror ≈ Reflect Barrier.

Power bands unchanged (Wave 1 §10). Signature 6 AP stays `ENEMY_ONLY` / `BOSS_ONLY` unless a card says otherwise.

**PX reconciliation:** `PX_COHERENCE_AUDIT` KEEP on “almost every spell `mpCost: 0`” stands as the **catalog default**. This document adds Undertow (`mpCost: 1`). #282 adds Ley Toll (`mpCost: 2`). Do not add a third. Do not invent a mana stat.

---

## 11. Proposed spells (Wave 3)

All rows: `STATUS: PROPOSED`. `isBaseSpell: false`. None of these ids exist in `spellData.ts`, `SPELL_ID_CATALOG`, Wave 1, Wave 2, #120, #137, #185, or **#282**.

`SCALING` follows existing `spellDmgGrowthPercent` / `upgradeSpell` unless marked fixed.

`mpCost: 0` unless the card names Undertow. #282 Ley Toll is the other `mpCost > 0` id — do not add a third.

### 11.1 New `effectParams` keys (Wave 3 only)

Parsers whitelist. Unknown keys ignored. Missing key → effect does not fire. Do **not** add name tables.

```text
coneHitTiles,             // Ash Fan: explicit wedge; do not read areaShape
swapTwoHostiles,          // true → two nearest other hostiles swap
selfPushDistance,         // Recoil Dash
portalPairDuration, portalPairMaxUses,
evadeCharges, evadeAgainst,   // "spell" — next incoming spell fizzles
distanceStepDamage, distanceMinDamage,
stealMp,
plantedRes, plantedDuration,
slideDistance, slideAxis,     // "file" | "rank"
invertApMp,
nextWalkApTax,
knightLeap,                   // true → (2,1) only
splitPaceMinWalk, splitPaceRangeDelta,
nextSpellApCostZero,
kennelRadius, kennelRes,
farWatchMin, farWatchMax, farWatchDamage,
mercyConvertNextDamageToAllyHeal,
absorbAmount, absorbDuration,
nextPhysicalHealPct, pactHpCost,
losIgnoreOneBarrier,
packApAura,
foldTwoPlayerSide
```

Reuse from earlier waves where the meaning is identical: `overwatchDuration`, `shareIncomingPct` is **not** reused (Load Bearing owns it).

---

### SPELL_ID: `spell-undertow`

NAME: Undertow  
ROLE: POSITION — walk-MP spend + 1-tile attract  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `tide_shade`; `G ≥ 3` or variant ≥ CHAMPION; `aiProfile` kiter/caster  
ENEMY_FAMILIES: `tide_shade`  
RELATIVE_DIFFICULTY_REQUIREMENT: RARE / G≥3. `generationMin: 3`  
RARITY: RARE  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: `mpCost: 1` on `SpellConfig` (the existing walk pool — **not** a new mana field). If caster current MP `< 1`, the cast is illegal (AI skip; player cannot confirm). On resolve: spend 1 MP, deal 8, `applyAttract` 1 tile toward the caster (`effectParams: {"attractDistance":1}`). Distinct from Hook Line (linear minRange 2, no MP spend) and from Haste (grants MP).  
SCALING: damage follows dmg%; attract and mpCost fixed  
AI_REQUIREMENTS: `aiHint: "spend_walk_mp_to_cast"`. Kiter / caster / controller. Skip if MP `< 1` or if they still need ≥ 2 MP to leave a hazard. **Do not** assign to chargers whose kit is “walk in and Strike.”  
PLAYER_COUNTERPLAY: Stand adjacent (attract 1 is a no-op); Force them to spend MP walking first; Barrier the landing  
SYNERGIES: Rime Sheet (they paid MP to cast, then pay again to leave); File Slide  
BALANCE_RISK: Attract + Frost −1 MP can brick a turn. 2 AP + 1 MP is the payment. Catalog default remains `mpCost: 0` on every other Wave-3 id.  
PERSISTENCE_REQUIREMENTS: Standard observe → same-encounter win. No Doka. Illegal (no AP) does not observe.  
STATUS: PROPOSED

---

Cone, two-body swap, evade, distance poke, and MP-steal are **#282 ids**. Do not add `spell-cinder-fan`, `spell-pawn-trade`, `spell-sidestep-veil`, `spell-long-arc`, or `spell-rip-current`. See §0.2 stamps.

---

### SPELL_ID: `spell-mire-sheet`

NAME: Mire Sheet  
ROLE: TERRAIN — enter MP tax  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `tide_shade` or `plague_rat`; `G ≥ 3`; `aiProfile` kiter/caster  
ENEMY_FAMILIES: `tide_shade`, `plague_rat`  
RELATIVE_DIFFICULTY_REQUIREMENT: RARE. `generationMin: 3`  
RARITY: RARE  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ground  
LOS: true  
COOLDOWN: 2  
EFFECT: `freeCells: true`. Paint one floor tile 3 turns. **Entering** the tile by walking costs +1 MP (min 1). Leaving is free. No damage. `effectParams: {"hazardType":"mire","enterMpTax":1,"hazardDuration":3}`. Distinct from Rime Sheet (leave-tax), Slow (unit), #282 Slide Tile (conveyor push). Teleport / Swap onto the cell does **not** pay. Last writer on `"x,y"` vs Cinder / void-glyph / rime.  
SCALING: tax fixed  
AI_REQUIREMENTS: `aiHint: "paint_ice_leave_tax"` reused as enter-tax: paint the cell the player **must enter** to reach the caster. Skip if target MP is already 0. New hint `paint_enter_mp_tax` if the reuse confuses implementers — prefer the new key.  
PLAYER_COUNTERPLAY: Don’t step on it; Haste; blink on (no enter tax)  
SYNERGIES: Undertow (they spent MP to cast, then pay to close); Far Watch covering the mire  
BALANCE_RISK: Mire + Rime + Slow is a brick. One cell, CD 2, G≥3. Challenge: MP tax is not HP.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-borrowed-eye`

NAME: Borrowed Eye  
ROLE: SUPPORT — LoS origin from an ally  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `pale_cantor` or `hex_chorister`; `G ≥ 3`; `aiProfile` buffer/caster  
ENEMY_FAMILIES: `pale_cantor`, `hex_chorister`  
RELATIVE_DIFFICULTY_REQUIREMENT: RARE. `generationMin: 3`  
RARITY: RARE  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 3  
EFFECT: 1 turn. The caster’s next LoS-requiring spell this turn treats **the chosen ally’s tile** as the Bresenham origin. Range is still measured from the **caster**. `effectParams: {"losOriginAlly":true,"losOriginDuration":1}`. Distinct from Gate Sight (ignore one barrier), Fog Hood (cut their range), Lens Share (#282, ally **range** buff). If the ally dies before the next cast, the buff expires and LoS is caster-origin again.  
SCALING: none  
AI_REQUIREMENTS: `aiHint: "range_buff_ally_with_modifiable"` is **wrong** (that is Lens Share). Use `los_from_ally_if_blocked`. Buffer / caster. Skip if no ally, or if caster already has LoS to the player.  
PLAYER_COUNTERPLAY: Kill the peek body; Barrier both origins; walk adjacent to the caster  
SYNERGIES: Glass Shot / File Lance / Far Sting through a peek; Kennel Lock keeps the ally parked  
BALANCE_RISK: Peek + Far Sting deletes cover. 1 turn + CD 3 + ally required. Do not also ignore walls.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-summon-bane`

NAME: Summon Bane  
ROLE: DAMAGE — bonus vs summons  
ACQUISITION_SOURCE: ELITE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `null_censor`; variant ≥ ELITE or `G ≥ 3`; `aiProfile` caster/controller  
ENEMY_FAMILIES: `null_censor`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL. `generationMin: 3`  
RARITY: RARE  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 1  
EFFECT: Deal 10. If the target `isSummon === true`, deal an extra 12 as a **second** existing `dealDamage` call (`effectParams: {"summonBonusDamage":12}`). Reads the summon flag, never `spell.name`. Distinct from Convert Whelp (steal), Null Brand (lockout), Kennel Lock (leash allied). If the target is not a summon, only the 10 lands.  
SCALING: both numbers follow dmg%  
AI_REQUIREMENTS: `aiHint: "prefer_max_chebyshev"` is wrong. Use `bonus_if_target_is_summon`. Caster / controller. Skip if no living hostile summon and Strike is better vs the player.  
PLAYER_COUNTERPLAY: Don’t bring a pet; Sever Tether; keep pets at 4+ behind Barrier  
SYNERGIES: Pawn Trade (#282) to put a pet in range; Null Brand after the bane  
BALANCE_RISK: 22 vs a wolf is Frost-adjacent on a 2-AP CD 1. Elite gate + flag check. Do not apply the bonus to bosses or leaders.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-planted-stance`

NAME: Planted Stance  
ROLE: DEFENSE — 0-walk RES  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Families `iron_golem` or `leash_warden`; `G ≥ 3`; `aiProfile` guardian  
ENEMY_FAMILIES: `iron_golem`, `leash_warden`  
RELATIVE_DIFFICULTY_REQUIREMENT: ADVANCED / G≥3. `generationMin: 3`  
RARITY: UNCOMMON  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 2  
EFFECT: If the caster has spent **0 MP this turn** at resolve, gain `buffStat: "res"`, `buffModifier: 1.20`, 2 turns (`effectParams: {"plantedRes":1.20,"plantedDuration":2}`). If they already walked this turn, fizzle (AP spent). Next walk **this turn** after the buff is still legal and does **not** strip the buff (they paid the 0-MP gate at cast time). Distinct from Iron Skin (no gate), Hold Ground (overwatch), Still Brand (punishes **target** 0 MP).  
SCALING: modifier fixed  
AI_REQUIREMENTS: `aiHint: "self_buff_if_zero_mp_this_turn"`. Guardian / charger. Skip if they still need to close or if Iron Skin is already up (last RES% writer wins — do not double-cast).  
PLAYER_COUNTERPLAY: Pull them (Swap / Hook) so they want to walk; Dispel; ignore and snipe  
SYNERGIES: Hold Ground (plant + overwatch); Load Bearing; Taunt Oath  
BALANCE_RISK: 1.20 + Chain Ward 1.15 + Iron Skin last-writer. Gate is 0 MP **this turn**, CD 2.  
PERSISTENCE_REQUIREMENTS: Standard observe → win. Fizzle still observes.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-file-slide`

NAME: File Slide  
ROLE: POSITION — forced 1-step along the file  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Families `storm_caller` or `coil_arbiter`; `G ≥ 3`; `aiProfile` caster/controller  
ENEMY_FAMILIES: `storm_caller`, `coil_arbiter`  
RELATIVE_DIFFICULTY_REQUIREMENT: RARE. `generationMin: 3`  
RARITY: RARE  
AP_COST: 3  
RANGE: 4  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: No damage. Target must share rank **or** file with the caster. Slide them 1 tile along that axis **away from the caster** if free, else **toward** if away is blocked (`effectParams: {"slideDistance":1,"slideAxis":"shared"}`). Occupancy / void / portal / barrier: fizzle that slide (AP spent, no move). Distinct from Shoulder Bash (orthogonal push + collision damage), Crosswind (diagonal), Hook (attract to caster), Sinkhole (tile gravity).  
SCALING: none  
AI_REQUIREMENTS: `aiHint: "slide_target_along_file"`. Caster / controller. Prefer a slide onto rime / cinder / void-glyph / ally overwatch. Skip if both axis steps are blocked.  
PLAYER_COUNTERPLAY: Stand off-axis; occupy the away-tile; Barrier  
SYNERGIES: File Lance after they line up; Rime Sheet on the away-cell; Far Watch band  
BALANCE_RISK: Slide onto lava is the combo. AI value-check; player copy can self-sabotage a summon.  
PERSISTENCE_REQUIREMENTS: Standard observe → win. Blocked slide still observes.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-tempo-invert`

NAME: Tempo Invert  
ROLE: SUPPORT — swap leftover AP and MP  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Families `hex_chorister` or `bone_scribe`; `G ≥ 3`; `aiProfile` buffer/caster  
ENEMY_FAMILIES: `hex_chorister`, `bone_scribe`  
RELATIVE_DIFFICULTY_REQUIREMENT: ADVANCED / G≥3. `generationMin: 3`  
RARITY: UNCOMMON  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 3  
EFFECT: No damage. Target may be self. Swap the target’s **current leftover** AP with leftover MP for the rest of this turn only (`effectParams: {"invertApMp":true}`). Caps at each pool’s max. At turn end, leftover values persist as whatever they are (no snap-back). Distinct from Haste (+2 MP), Loan Tempo (+AP to ally from caster), Second Wind (conditional MP grant), Drain Courage (AP debit).  
SCALING: none  
AI_REQUIREMENTS: `aiHint: "invert_leftover_ap_mp"`. Buffer / caster. Skip unless (AP ≥ 2 and MP = 0) or (MP ≥ 2 and AP = 0) on the intended ally. Do not assign until `buffer` exists (Wave 2 Loan Tempo gate).  
PLAYER_COUNTERPLAY: Force the invert on a unit that wanted the original split; Quiet Hex after they invert into a 3-AP spell  
SYNERGIES: Undertow (need MP); hard_3 (≤8 AP/turn — invert can dump AP into MP to stay legal)  
BALANCE_RISK: Inverting 6 AP into 6 MP is a full reposition. Ally-only + CD 3 + 2 AP. Enemy AI must not invert a berserker who needed the AP to Strike.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-debt-mark`

NAME: Debt Mark  
ROLE: CONTROL — next walk costs AP  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Families `glyph_sower` or `bone_scribe`; `G ≥ 3`; `aiProfile` caster/controller  
ENEMY_FAMILIES: `glyph_sower`, `bone_scribe`  
RELATIVE_DIFFICULTY_REQUIREMENT: RARE. `generationMin: 3`  
RARITY: RARE  
AP_COST: 2  
RANGE: 4  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: No damage. The target’s **next walk of ≥ 1 tile** this battle (or 2 turns, whichever first) also costs +1 AP (`effectParams: {"nextWalkApTax":1}`). Teleport / Swap / Phase Slip / Twin-gate step do **not** pay. Distinct from Quiet Hex (next **spell** +1 AP), Glyph Tax (tile AP zone), Slow (MP), Root (cannot walk).  
SCALING: tax fixed  
AI_REQUIREMENTS: `aiHint: "tax_next_walk_ap"`. Caster / controller. Skip if the target is already rooted or MP is 0 (they will not walk).  
PLAYER_COUNTERPLAY: Blink off; Strike in place; pay the 1 AP  
SYNERGIES: Paper Wind (they wanted to walk in); Far Watch (walking into 3–4 now costs AP **and** snaps)  
BALANCE_RISK: Debt + Quiet Hex + Drain Courage is three taxes. Different keys, all allowed, but AI should not stack all three on G=0. G≥3 gate.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-knight-pierce`

NAME: Knight Pierce  
ROLE: DAMAGE — (2,1) poke  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `blink_cutter`; `G ≥ 3`; `aiProfile` flanker  
ENEMY_FAMILIES: `blink_cutter`  
RELATIVE_DIFFICULTY_REQUIREMENT: RARE. `generationMin: 3`  
RARITY: RARE  
AP_COST: 2  
RANGE: 2  
TARGET_TYPE: enemy  
LOS: false  
COOLDOWN: 1  
EFFECT: Physical. Deal 14. Legal **only** if the target is exactly a chess knight-jump from the caster (`effectParams: {"knightLeap":true}` — Chebyshev is not enough; must be (2,1) or (1,2)). Jumps **walls** (same fantasy as `KNIGHT_JUMP_IGNORE_WALLS` but this is a spell, not a boss ability). Does not ignore barriers for occupancy — the **target tile** must contain the enemy. Distinct from Phase Slip (self teleport), Rear Cut (adjacent flank), Shadow Strike (diagonal 1–4). If illegal, fizzle.  
SCALING: damage follows dmg%; gate fixed  
AI_REQUIREMENTS: `aiHint: "knight_leap_poke"`. Flanker. If not on a (2,1), walk or Phase Slip / Swap first. **Do not** assign to chargers who only walk orthogonal.  
PLAYER_COUNTERPLAY: Stand where no (2,1) exists (map edge); occupy with a summon; face them for Rear Cut instead and force a different tool  
SYNERGIES: Phase Slip onto a (2,1); Pawn Trade to place the target on a jump  
BALANCE_RISK: 14 through walls is a sniper. 2 AP, CD 1, **strict** geometry. Fail closed (fizzle), never become Strike.  
PERSISTENCE_REQUIREMENTS: Standard observe → win. Fizzle still observes.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-split-pace`

NAME: Split Pace  
ROLE: CONTROL — range after a long walk  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `pale_cantor` or `hex_chorister`; `G ≥ 3`; `aiProfile` kiter/caster  
ENEMY_FAMILIES: `pale_cantor`, `hex_chorister`  
RELATIVE_DIFFICULTY_REQUIREMENT: ADVANCED / G≥3. `generationMin: 3`  
RARITY: UNCOMMON  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 2  
EFFECT: If the caster has already walked ≥ 2 tiles **this turn**, their `modifiableRange` spells get `rangeDelta: +1` for 1 turn (`effectParams: {"splitPaceMinWalk":2,"splitPaceRangeDelta":1}`). If they have not, fizzle (AP spent). Last rangeDelta writer wins vs Lens / Overcast / Paper Wind / Fog Hood. Distinct from Lens (no walk gate) and Haste (MP grant).  
SCALING: delta fixed  
AI_REQUIREMENTS: `aiHint: "range_after_long_walk"`. Kiter / caster. Walk first, then arm, then poke. Skip on a turn they cannot afford 2 MP.  
PLAYER_COUNTERPLAY: Root / Debt Mark before they walk; overwrite with Paper Wind  
SYNERGIES: Long Arc; Glass Shot; Rip Current (steal the MP they needed to arm)  
BALANCE_RISK: +1 after a 2-walk is Lens-lite. Walk gate + 2 AP + CD 2. Does not stack with Overcast (last writer).  
PERSISTENCE_REQUIREMENTS: Standard observe → win. Fizzle still observes.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-last-ward`

NAME: Last Ward  
ROLE: DEFENSE — low-HP next spell is free  
ACQUISITION_SOURCE: ELITE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Variant ≥ ELITE or `G ≥ 3`; families `iron_golem`, `leash_warden`; `aiProfile` guardian  
ENEMY_FAMILIES: `iron_golem`, `leash_warden`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL. `generationMin: 3`  
RARITY: RARE  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: If caster HP% ≤ 30, the **next spell** they cast this battle (or 2 turns) costs 0 AP (`effectParams: {"nextSpellApCostZero":true}`). Strike / `physical_attack` is **not** a spell for this key (still costs 2). If HP% > 30, fizzle. Distinct from Last Ember (next physical **damage**), Timestep (full AP/MP once/battle), Sacrifice (HP→damage).  
SCALING: threshold fixed  
AI_REQUIREMENTS: `aiHint: "self_buff_if_low_hp_next_spell_free"`. Guardian / charger / berserker. Skip above 30% or if already armed. Next cast should be a 3–4 AP tool (Hold Ground, Taunt, Load Bearing), not Strike.  
PLAYER_COUNTERPLAY: Keep them above 30%; Dispel the ward; force Strike with Silence-class (Hex of Silence is BOSS_ONLY — Quiet Hex still taxes if they spend the free spell… **explicit:** Quiet Hex applies to the next spell even if its AP cost is 0, so the free spell still pays +1 if hexed).  
SYNERGIES: Last Ember on a different family in the pack; Planted Stance  
BALANCE_RISK: Free Inferno is the nightmare. Elite/G≥3 + 30% gate + Strike exempt.  
PERSISTENCE_REQUIREMENTS: Standard observe → win. Fizzle still observes.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-kennel-lock`

NAME: Kennel Lock  
ROLE: SUMMONS — leash allied pets  
ACQUISITION_SOURCE: ELITE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `brood_chanter`; variant ≥ ELITE or `G ≥ 3`; `aiProfile` summoner/guardian  
ENEMY_FAMILIES: `brood_chanter`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL. `generationMin: 3`  
RARITY: RARE  
AP_COST: 3  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: 2 turns. Every living **allied** summon (same side as caster) that starts a walk ending at Chebyshev > 2 from the caster **stops at the last cell ≤ 2**. Those summons gain `buffStat: "res"` 1.10 while within 2 (`effectParams: {"kennelRadius":2,"kennelRes":1.10}`). Distinct from Null Brand (hostile summon lockout), Convert Whelp (steal one), Bastion Pylon (stationary post).  
SCALING: radius and RES fixed  
AI_REQUIREMENTS: `aiHint: "kennel_summons"`. Summoner / guardian. Skip if no allied summon. Do not assign until summoner profile is explicit (Wave 1 name-fallback still live — **drop this id** if `summonAI` is empty).  
PLAYER_COUNTERPLAY: Pull the caster off the pack (Pawn Trade / Swap); kill pets outside before the arm; Sever Tether  
SYNERGIES: Load Bearing inside the kennel; Choir Hymn  
BALANCE_RISK: Two pets at 1.10 RES + golem is a turtle ball. Radius 2 + CD 3 + elite gate. Player copy leashes **their** pets — a real downside when kiting.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-far-watch`

NAME: Far Watch  
ROLE: DEFENSE — visible ranged overwatch  
ACQUISITION_SOURCE: ELITE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `glass_sniper`; variant ≥ ELITE or `G ≥ 3`; `aiProfile` kiter/caster  
ENEMY_FAMILIES: `glass_sniper`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL. `generationMin: 3`  
RARITY: RARE  
AP_COST: 3  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: Stance, 2 turns, **visible**. The next hostile who **walks** into Chebyshev 3 or 4 of the caster takes 10 (spell, RES+SR) and the stance consumes (`effectParams: {"farWatchMin":3,"farWatchMax":4,"farWatchDamage":10,"overwatchDuration":2}`). Push/pull into the band **does** trigger. Teleport / Swap / Twin-gate **does not**. Distinct from Hold Ground (enter-1 melee stop) and Tripwire (hidden tile). Observation is the **arm**.  
SCALING: damage follows dmg%; band fixed  
AI_REQUIREMENTS: `aiHint: "overwatch_enter_band_3_4"`. Kiter / caster. Skip if the player is already in 1–2 (use Long Arc / Glass Shot).  
PLAYER_COUNTERPLAY: Stay at 5+ or at 1–2; blink in; send a summon into 3  
SYNERGIES: Debt Mark (walking into 3 costs AP **and** snaps); Paper Wind (they cannot poke from 6)  
BALANCE_RISK: Band 3–4 + Long Arc at 6 is a kiting prison. Consume-on-first-body, CD 3, elite.  
PERSISTENCE_REQUIREMENTS: Standard observe → win. Snap does not second-observe.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-mercy-hex`

NAME: Mercy Hex  
ROLE: CONTROL — their next nuke becomes a heal  
ACQUISITION_SOURCE: ACHIEVEMENT  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Claim feat `pacifist_run` (`Win a battle using only heal or buff spells`)  
ENEMY_FAMILIES: none (player grant). Pale Cantor may later receive an enemy-cast copy at `generationMin: 4` — **not this wave**  
RELATIVE_DIFFICULTY_REQUIREMENT: Feat is level-agnostic. Do not also require G.  
RARITY: RARE  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 3  
EFFECT: No damage. Target’s next **damaging** spell (`damage > 0` or `isPhysical`) this battle (or 2 turns) instead heals their lowest-HP **ally** (including self) for 10 and deals 0 (`effectParams: {"mercyConvertNextDamageToAllyHeal":true,"mercyHeal":10}`). Strike counts. Distinct from Hex of Silence (fizzle, BOSS_ONLY) and Quiet Hex (AP tax). `usableByEnemy: false` until a generation-4 copy is specified.  
SCALING: heal fixed  
AI_REQUIREMENTS: none this wave (`usableByEnemy: false`).  
PLAYER_COUNTERPLAY: N/A for enemies this wave. For the player’s victim: wait out 2 turns; cast a non-damaging tool first (Slow, Mark) to keep the nuke.  
SYNERGIES: Pacifist Run identity; Absolve / Blood Benediction on the player side  
BALANCE_RISK: Turning Inferno into a 10-heal is a blowout. 3 AP / CD 3 / 2-turn window. Feat is rare (`pacifist_run`). Failed pacifist grants neither Doka nor this spell.  
PERSISTENCE_REQUIREMENTS: `unlockOwnedSpell` on `markAchievementUnlocked("pacifist_run")`. Idempotent. Doka claim stays on `claimAchievementReward` on the persist lock. No `upgradeSpell`.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-bloodless-plate`

NAME: Bloodless Plate  
ROLE: DEFENSE — short absorb, not a heal  
ACQUISITION_SOURCE: CHALLENGE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Complete `easy_1` (`no_healing`)  
ENEMY_FAMILIES: none. `usableByEnemy: false`  
RELATIVE_DIFFICULTY_REQUIREMENT: Challenge is level-agnostic  
RARITY: UNCOMMON  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 2  
EFFECT: Gain 8 absorb for 1 turn (`effectParams: {"absorbAmount":8,"absorbDuration":1}`). Absorb is not HP and is not a heal (`healUsed` stays false). Distinct from Ward Plate (#120, larger), Shield (RES%), Blood Mend (heal).  
SCALING: absorb follows a later absorb table if one exists; until then fixed 8  
AI_REQUIREMENTS: none (`usableByEnemy: false`).  
PLAYER_COUNTERPLAY: N/A  
SYNERGIES: `easy_1` identity; Cursed Wound does not reduce absorb (absorb is not healRecv)  
BALANCE_RISK: 8 for 1 turn is Strike-sized. Challenge fail (any heal, including BuffShop potion — already wired `healUsed`) grants neither Doka nor this spell.  
PERSISTENCE_REQUIREMENTS: `unlockOwnedSpell` on successful `easy_1` persist. Idempotent. Remount does not double-grant.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-crimson-pact`

NAME: Crimson Pact  
ROLE: DAMAGE — pay HP, next physical heals you  
ACQUISITION_SOURCE: BOSS  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: First victory vs `crimson_countess`  
ENEMY_FAMILIES: none for the grant. Countess kit may **use** it in a later data PR; observation is not required for the grant  
RELATIVE_DIFFICULTY_REQUIREMENT: Boss first-win is level-agnostic. Not room-0 farm: bind to `bossDefeated === "crimson_countess"` on the recap persist, same pattern as Choir Hymn / Claim Ward  
RARITY: RARE  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: Pay 10 HP (floor at 1; `recordChallengeSelfHpLoss` for the HP actually lost). Next **physical** you deal this turn heals you for 50% of damage dealt after RES (`effectParams: {"pactHpCost":10,"nextPhysicalHealPct":0.50}`). Distinct from Sacrifice (HP→triple damage, no heal), Blood Tithe (HP→AP), Lifesteal Nova (AoE drain), Last Ember (no HP pay). If you do not land a physical this turn, the pact expires unused (HP still paid).  
SCALING: cost fixed; heal % fixed; the physical’s damage follows dmg%  
AI_REQUIREMENTS: If later assigned to Countess: `aiHint` reuse `self_buff_if_low_hp` is **wrong** (this is not Last Ember). New hint not required this wave because the **grant** is victory-only. Do not put this id in world packs until a Countess kit PR names the hint.  
PLAYER_COUNTERPLAY: Keep her from landing the physical; Cursed Wound / void-glyph zeros the heal if they stand on it (tile lock wins while on the cell — same as Wave 2 Void Glyph vs Wound)  
SYNERGIES: Strike / Rear Cut / Knight Pierce / Recoil Dash as the physical  
BALANCE_RISK: 50% of a 34 execute is a hospital. Pact is **this turn only** + 10 HP + CD 3. Do not also apply Lifesteal Nova on the same hit (one lifesteal writer: pact wins if both would apply — document).  
PERSISTENCE_REQUIREMENTS: `unlockOwnedSpell` on Countess victory persist. Idempotent. No extra Doka. Defeat does not grant.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-gate-sight`

NAME: Gate Sight  
ROLE: SUPPORT — ignore one barrier for LoS  
ACQUISITION_SOURCE: SPECIAL_ENCOUNTER  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Victory on tagged encounter `gate_gallery`  
ENEMY_FAMILIES: none for the grant. Void Mirror world packs do **not** get this id (they get Twin Gate via observe)  
RELATIVE_DIFFICULTY_REQUIREMENT: Special is not a level gate  
RARITY: UNCOMMON  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: 2 turns. The caster’s spells that require LoS may ignore **one** barrier tile along the Bresenham (walls still block) (`effectParams: {"losIgnoreOneBarrier":true}`). Distinct from Fog Hood (cuts **their** LoS range), Barrier (places a wall), Twin Gate (walkable pair).  
SCALING: none  
AI_REQUIREMENTS: none this wave (`usableByEnemy: false`). A later G≥4 enemy copy needs `aiHint` before assign.  
PLAYER_COUNTERPLAY: N/A on `gate_gallery` (they do not cast it). Defeat does not grant.  
SYNERGIES: Glass Shot / Long Arc / File Lance through a peek; Search Dust to know the other side  
BALANCE_RISK: Ignoring every barrier would delete Barrier as a tool. **One** tile, 2 turns, CD 3.  
PERSISTENCE_REQUIREMENTS: `unlockOwnedSpell` on `gate_gallery` victory. Observation not required. Duplicate visit empty grant.  
STATUS: PROPOSED

---

Self knockback and portal-pair are **#282 ids** (`spell-back-step`, `spell-twin-gate`). Do not add `spell-recoil-dash` or a second Twin Gate card. Stamps: rust_reaver / `legendary_3` → Back Step (not `easy_3`); Void Mirror observe+win is a MULTI child of Twin Gate beside #282’s `void_grandmaster` first-win. Observation is paint/push-cast, not pad transit.

---

### SPELL_ID: `spell-pack-tempo`

NAME: Pack Tempo  
ROLE: SUPPORT — allied AP aura  
ACQUISITION_SOURCE: ENEMY_ONLY  
PLAYER_LEARNABLE: false  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Family `hex_chorister`; variant CHAMPION; `G ≥ 3`  
ENEMY_FAMILIES: `hex_chorister`  
RELATIVE_DIFFICULTY_REQUIREMENT: SIGNATURE. `generationMin: 3`  
RARITY: RARE  
AP_COST: 4  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 4  
EFFECT: 2 turns. Living allies at Chebyshev ≤ 2 gain +1 AP at the **start** of their turn (`effectParams: {"packApAura":1,"auraRadius":2,"auraDuration":2}`). Does not grant the caster extra AP the turn it is cast. Distinct from Pack Howl (CHC), Loan Tempo (one ally, one loan), Rallying Cry (heal + CHC).  
SCALING: amount fixed  
AI_REQUIREMENTS: `aiHint: "pack_ap_aura"`. Buffer. CHAMPION only. Skip if aura up or no ally in 2.  
PLAYER_COUNTERPLAY: Kill the Chorister; pull allies out of 2; Quiet Hex the extra AP  
SYNERGIES: Pack Howl (CHC + AP is the CHAMPION ball — **do not** put both on a BASE kit; CHAMPION may have Howl **or** Tempo, not both in CORE)  
BALANCE_RISK: +1 AP on two bodies is a second turn. ENEMY_ONLY + CHAMPION + CD 4. **Never** write `ownedSpellIds`.  
PERSISTENCE_REQUIREMENTS: None. Optional `UNKNOWN TECHNIQUE` log. Aura tick without a new cast does not observe (and would not grant anyway).  
STATUS: PROPOSED

---

### SPELL_ID: `spell-sovereign-fold`

NAME: Sovereign Fold  
ROLE: POSITION — swap two player-side bodies  
ACQUISITION_SOURCE: BOSS_ONLY  
PLAYER_LEARNABLE: false  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: `mirror_sovereign` kit / phase 2. Not a world pack  
ENEMY_FAMILIES: none (boss id `mirror_sovereign`)  
RELATIVE_DIFFICULTY_REQUIREMENT: Boss signature. Not a G table  
RARITY: UNIQUE  
AP_COST: 4  
RANGE: 6  
TARGET_TYPE: enemy  
LOS: false  
COOLDOWN: 3  
EFFECT: Swap the two living **player-side** bodies (player + a summon). If fewer than two, fizzle. Then deal 6 (spell) to each (`effectParams: {"foldTwoPlayerSide":true,"foldDamage":6}`). Distinct from Pawn Trade (two hostiles-to-caster), `MIRROR_INVERT` boss ability (board-wide — this is a **spell** the kit can spend AP on so it can be telegraphed). Never owned. Player already has Swap and Pawn Trade as learnables.  
SCALING: damage follows dmg%  
AI_REQUIREMENTS: `aiHint: "fold_two_player_side"`. **Boss AI only.** Skip if 0–1 player-side bodies.  
PLAYER_COUNTERPLAY: Fight without a summon; False Retreat decoy as the second body; stand so the swap puts the summon on a safe cell  
SYNERGIES: Mirror Sovereign identity; Claim Ward (anti-swap **cell** does not block this — fold is unit swap, not cell claim; **explicit** so implementers do not merge the keys)  
BALANCE_RISK: Forced player/summon swap + 6 is a mechanic, not a farmable spell. BOSS_ONLY. **Never** `ownedSpellIds`.  
PERSISTENCE_REQUIREMENTS: None. Dim `UNKNOWN TECHNIQUE` log optional.  
STATUS: PROPOSED

---

## 12. Family pool attachments (Wave 3 only)

Add these ids to the **named** family pools in a later data PR. Do not grab random `usableByEnemy` rows. Do not retire Wave-1 / Wave-2 attachments.

| Family | Pool | Id |
| :--- | :--- | :--- |
| `tide_shade` | RARE / G≥3 | `spell-undertow`, `spell-mire-sheet`, #282 `spell-soul-sip` |
| `plague_rat` | RARE / G≥3 | `spell-mire-sheet` |
| `ember_knight` | RARE / G≥3 | #282 `spell-fan-bolt` |
| `cinder_martyr` | RARE / G≥3 | #282 `spell-fan-bolt` |
| `wraith_bishop` | RARE / G≥3 | #282 `spell-pawn-trade` |
| `rift_hook` | RARE / G≥3 | #282 `spell-pawn-trade` |
| `shadow_lurker` | RARE / G≥3 | #282 `spell-sidestep-ward` (MULTI with `critical_striker`) |
| `glass_sniper` | RARE / G≥3 | #282 `spell-far-sting` |
| `glass_sniper` | ELITE / SIGNATURE | `spell-far-watch` |
| `storm_caller` | RARE / G≥3 | `spell-file-slide` |
| `coil_arbiter` | RARE / G≥3 | `spell-file-slide`, #282 `spell-soul-sip` |
| `iron_golem` | ADVANCED / G≥3 | `spell-planted-stance` |
| `iron_golem` | ELITE | `spell-last-ward` |
| `leash_warden` | ADVANCED / G≥3 | `spell-planted-stance` |
| `leash_warden` | ELITE | `spell-last-ward` |
| `hex_chorister` | ADVANCED / G≥3 | `spell-tempo-invert`, `spell-split-pace`, `spell-borrowed-eye` |
| `hex_chorister` | SIGNATURE | `spell-pack-tempo` (ENEMY_ONLY; not with Pack Howl on the same BASE kit) |
| `bone_scribe` | RARE / G≥3 | `spell-tempo-invert`, `spell-debt-mark` |
| `glyph_sower` | RARE / G≥3 | `spell-debt-mark` |
| `blink_cutter` | RARE / G≥3 | `spell-knight-pierce` |
| `pale_cantor` | ADVANCED / G≥3 | `spell-split-pace`, `spell-borrowed-eye` |
| `brood_chanter` | ELITE | `spell-kennel-lock` |
| `null_censor` | ELITE | `spell-summon-bane` |
| `rust_reaver` | ADVANCED / G≥3 | #282 `spell-back-step` (MULTI with `legendary_3`; **not** `easy_3`) |
| `void_mirror` | RARE / SIGNATURE | #282 `spell-twin-gate` (observe child; #282 already BOSS `void_grandmaster`) |

Empty slot → skip. Empty kit → `[physical_attack]`.

Wave-2 elite families (`rank_lancer` … `leech_familiar`) already consume #120 / #185 ids. Do not force a G3 onto a family whose AI cannot use it. Do not pool #282 `spell-hex-toll` (Quiet Hex owns that tax).

---

## 13. How to add Generation 4 forever

Same recipe as Wave 2 §13:

1. Pick a hole that is not in §10 or the tombstone.
2. Stamp `generationMin = currentPublishedMax(family) + 1` (will be 4 after this wave ships for families in §12).
3. Default `ENEMY_DISCOVERY` + observe + same-encounter win.
4. Write `AI_REQUIREMENTS`. If no profile can satisfy them, `usableByEnemy: false` or `ENEMY_ONLY`.
5. Explicit `SpellConfig` metadata. No `if (spell.name === …)`.
6. Add the id to the family pool **and** `SPELL_ID_CATALOG` **and** `spellData.ts` in the **same** implementation PR.
7. Persist only through Wave 1 §8 writers.
8. UX: `TECHNIQUE OBSERVED` / `NEW SPELL DISCOVERED`.
9. `STATUS: PROPOSED` until a human/orchestrator picks the ACTION_ID.
10. Do not restamp `pacifist_run`, `easy_1`, `crimson_countess`, `gate_gallery`, `legendary_3`. Leftover doors are §4.2.

Suggested Wave-4 holes (do not fill today): `legendary_1` Untouchable identity; `survivor` last-stand; two-ally swap; portal-pair **three**-gate; a third `mpCost > 0` id; pooling Hex Toll (keep Quiet Hex).

---

## 14. Implementation slices (later PRs — not this change)

Wave-1 slices A–D (ownership, observe, commit, toast) **before** any Wave-2 data. Wave-2 slices W2-A–E (`generationMin`, hints, W2 data, specials, feat stamps) **before** any Wave-3 data. Coordinate #282 data PRs so Fan Bolt / Twin Gate / Ley Toll land **once**.

| Slice | Touches | Must not touch |
| :--- | :--- | :--- |
| W3-A. G≥3 extra slot | Kit resolver | `pickEnemyLevelFromTiers` percents; `combatMath.ts` |
| W3-B. New `aiHint` predicates | `decide*` helpers | Name fallbacks; RAF |
| W3-C. Wave-3 **unique** data | `spellData.ts` + kits + catalog | Name heuristics; cloning #282 ids |
| W3-D. Special rooms | Encounter tag table | `mapGen.ts` algorithms; `fog_of_war` stub |
| W3-E. Feat/challenge/boss stamps | `spellRewardIds` / `rewards.spellIds` | Doka formula; `unstoppable`; `easy_3` |
| W3-F. Twin-gate tile table | #282 `gatePads` table, not `map.portals` | Portal lock-while-hostile rules |

Extract helpers. Do not grow `WorldExploration.tsx` (already 19,253 lines).

This document adds **one** new `mpCost > 0` id (Undertow). #282 Ley Toll is the other. Do not add a third.

Sidestep Ward (#282) must not add an evasion roll to `dealDamage`. Far Sting must not edit RES/SR/CHC math. Fan Bolt’s `areaShape` wire is #282’s job, not a second cone card.

---

## 15. QA matrix (additive to Wave 1 §14 and Wave 2 §15)

| # | Check | Pass |
| :--- | :--- | :--- |
| W3-1 | Encounter start | Possessed-but-unused G3 id does not observe |
| W3-2 | Undertow no MP | AI skip; no observe |
| W3-3 | Undertow fizzle after AP | Observes; no grant until win |
| W3-4 | Twin-gate paint | Observe on paint; transit does not second-observe |
| W3-5 | Twin-gate vs world portal | World portals still impassable; pair is a different table |
| W3-6 | Pawn Trade one body | Fizzle observes; no swap |
| W3-7 | Recoil into lava | One observe; hazard uses existing tick; challenge lava path |
| W3-8 | Far Watch arm vs snap | Arm observes; snap does not |
| W3-9 | Pack Tempo | Never in `ownedSpellIds` |
| W3-10 | Sovereign Fold | Never in `ownedSpellIds` |
| W3-11 | Gate Sight | `gate_gallery` win grants once; defeat does not |
| W3-12 | Bloodless Plate | Heal (including BuffShop) fails `easy_1` — neither Doka nor spell |
| W3-13 | Mercy Hex | Failed `pacifist_run` grants neither Doka nor spell |
| W3-14 | Crimson Pact | Non-Countess boss win does not grant |
| W3-15 | Back Step MULTI | First child (reaver observe **or** `legendary_3`) wins; **not** `easy_3` |
| W3-16 | G=2 Tide | No Undertow (`generationMin: 3`) |
| W3-17 | Sidestep Ward vs Mirror | Mirror wins; Ward does not consume |
| W3-18 | Far Sting vs Glass Shot | Both legal; minRange 2 on Sting |
| W3-19 | Quiet Hex + Last Ward | Free spell still pays the hex tax |
| W3-20 | Duplicate victory | One owned row; levels untouched; no Doka |
| W3-21 | Typecheck | `pnpm typecheck` / `pnpm check` clean when code lands |
| W3-22 | Pack Howl + Pack Tempo | Not both on a BASE hex kit |
| W3-23 | No cloned ids | `spell-pawn-trade` / `spell-twin-gate` exist only as #282 rows |

---

## 16. Out of scope

- Production TypeScript / Motoko / Candid in this PR
- RAF, map generation, turn logic, or damage math
- Re-authoring Wave 1, Wave 2, #120, #137, #185, or **#282** cards
- Gating on `unstoppable` / `level_10`
- Implementing the `fog_of_war` map-modifier stub
- Reading `CharacterStats.evasion` in `combatMath.ts`
- Spreading `mpCost > 0` beyond Undertow **and** #282 Ley Toll
- A second cone id beside Fan Bolt
- Restamping Twin Monarchs, Chessboard Lich, Explorer, Spell Scholar, `easy_3`, `critical_striker`

---

## 17. Wave-3 index

**Unique SDE ids (19):** undertow, mire-sheet, borrowed-eye, planted-stance, file-slide, tempo-invert, debt-mark, knight-pierce, split-pace, summon-bane, last-ward, kennel-lock, far-watch, mercy-hex, bloodless-plate, crimson-pact, gate-sight, pack-tempo, sovereign-fold.

**#282 stamps (not new ids):** Fan Bolt, Pawn Trade, Far Sting, Soul Sip, Back Step, Twin Gate, Sidestep Ward.

| SPELL_ID | Source | Learnable | Family / gate | Hole |
| :--- | :--- | :--- | :--- | :--- |
| `spell-undertow` | ENEMY_DISCOVERY | yes | tide_shade G≥3 | Walk-MP spend + attract 1 |
| `spell-mire-sheet` | ENEMY_DISCOVERY | yes | tide / plague_rat | Enter MP tax tile |
| `spell-borrowed-eye` | ENEMY_DISCOVERY | yes | cantor / hex | LoS origin from ally |
| `spell-planted-stance` | ENEMY_DISCOVERY | yes | golem / warden | 0-walk RES |
| `spell-file-slide` | ENEMY_DISCOVERY | yes | storm / coil | Forced 1-step on file |
| `spell-tempo-invert` | ENEMY_DISCOVERY | yes | hex / scribe | Swap leftover AP↔MP |
| `spell-debt-mark` | ENEMY_DISCOVERY | yes | glyph / scribe | Next walk +1 AP |
| `spell-knight-pierce` | ENEMY_DISCOVERY | yes | blink_cutter | (2,1) poke |
| `spell-split-pace` | ENEMY_DISCOVERY | yes | cantor / hex | +range after 2-walk |
| `spell-summon-bane` | ELITE | yes | null_censor | Bonus vs summons |
| `spell-last-ward` | ELITE | yes | golem / warden | Low-HP next spell 0 AP |
| `spell-kennel-lock` | ELITE | yes | brood_chanter | Leash allied summons |
| `spell-far-watch` | ELITE | yes | glass_sniper | Overwatch band 3–4 |
| `spell-mercy-hex` | ACHIEVEMENT | yes | `pacifist_run` | Nuke → ally heal |
| `spell-bloodless-plate` | CHALLENGE | yes | `easy_1` | Short absorb, not a heal |
| `spell-crimson-pact` | BOSS | yes | Crimson Countess | Pay HP, next physical heals |
| `spell-gate-sight` | SPECIAL_ENCOUNTER | yes | `gate_gallery` | Ignore one barrier LoS |
| `spell-pack-tempo` | ENEMY_ONLY | no | hex CHAMPION | Pack +1 AP aura |
| `spell-sovereign-fold` | BOSS_ONLY | no | Mirror Sovereign | Fold two player-side bodies |

All unique rows STATUS: **PROPOSED**.

---

**Document status:** PROPOSED. Safe to review and to implement in sliced PRs after Wave-1 P0, Wave-2 data, and after a human or orchestrator picks an ACTION_ID. Coordinate with #282 so Fan Bolt / Twin Gate / Ley Toll land once. Not a license to land combat code in the same change as this spec.
