# Dynamic Spell Discovery & Enemy Spell Evolution

**Author:** Dynamic Spell Discovery and Enemy Spell Evolution Designer  
**Automation:** `c26e5a83-a492-11f1-a7d1-d6b4613131ce`  
**Date:** 2026-08-31  
**Status:** PROPOSED — design only. **No production code in this change.**  
**HEAD audited:** `22503b5` (`fix: keep generated maps solvable across seeds`)

Stralt has **no character level cap**. This document is the product contract for an indefinitely expandable spell-discovery ecosystem: enemies reveal techniques by **using** them, the player **wins** the fight, and the Spell Library grows. New spells keep arriving as **relative difficulty**, **family identity**, **AI sophistication**, and **encounter type** rise — never as a last tier.

ACTION_IDs: [`ACTION_IDS_SDE_2026-08-31.md`](./ACTION_IDS_SDE_2026-08-31.md).

---

## 0. Sibling designs (do not duplicate)

Same-day design PRs already own adjacent surfaces. This document **does not** re-sheet them. It is the **player-facing discovery pipeline + expandable catalog** those docs attach to.

| Sibling | PR / path | Owns |
| :--- | :--- | :--- |
| Spell, Discovery & Achievement Admin | #116 — `docs/automation/SPELL_ADMIN_DESIGN_2026-08-31.md` | Persist types, Admin Studio, soft-retire, `ownedSpellIds` / `observedSpellIds` maps |
| Spell and Tactical Mechanics | #120 — `docs/automation/SPELL_PROPOSALS_2026-08-31.md` | 16 gap-filling tactical ids (`spell-shoulder-bash` … `spell-void-anchor`) |
| Enemy and Elite Evolution | #136 — `docs/automation/ENEMY_ELITE_EVOLUTION_2026-08-31.md` | Family sheets, variant floors, pack recipes |
| Boss and Boss-Spell | #137 — `docs/design/BOSS_AND_SPELL_DISCOVERY.md` | 19 boss sheets + 8 bounded boss adaptations |
| Unbounded enemy AI | #133 | AI sophistication catalog |

**Id collision rule:** do not reuse ids from #120 or #137. Wave-1 ids in §11 are new. Family one-liners from #136 that lacked full cards (`spell-glass-shot`, `spell-ember-wake`, `spell-blood-benediction`, `spell-null-brand`, `spell-sever-tether`, `spell-ward-interpose`) are **formalized here** so they can enter the discovery pipeline.

Implementers pick **one** ACTION_ID. Do not land combat, kits, or actor code from this PR.

---

## 1. Why discovery is inert today (verified against `origin/main`)

There is nothing to discover on the live player path.

| Fact | Where | Effect |
| :--- | :--- | :--- |
| Every `starterSpells` row is forced `isBaseSpell: true` and unioned into `ownedSpells` | `WorldExploration.tsx` 2242–2272 | The 32-id frontend catalog is pre-owned |
| `ownedSpells` = starters ∪ filtered backend configs | same | Catalog membership **is** ownership |
| No `ownedSpellIds` / `observedSpellIds` | `ARCHITECTURE.md` persist table; `Character` has only `spellLevelKeys` / `spellBarOrder` | Observation cannot survive reload |
| Recap grants XP/Doka only | `PostBattleRecap.tsx` `BattleRecapData`; `rewardResolver.ts` | Victory cannot unlock a spell |
| Achievements grant Doka only | `admin.mo` `defaultAchievements()` 309–326 | Feats cannot grant a spell id |
| Challenges grant Doka / XP / badge | `challengeCompletion.ts` `DEFAULT_CHALLENGES` 38–103 | Challenges cannot grant a spell id |
| `upgradeSpell` levels a known id and **charges Doka** | `main.mo` 705–766 | Must never be the grant writer |
| `saveBattleStats` ignores spell-level arrays | `main.mo` 1299 comment; `ARCHITECTURE.md` | Correct — keep it |
| `ENEMY_KITS` reuses always-owned ids | `enemyAI.ts` 156–193 | Seeing a bishop cast Frost teaches nothing |
| `buildEnemyKit(pieceType, currentMap.levelZone)` gets a non-number | #136 verified | Zone growth is `NaN`; every kit stays zone 0 |
| `inferArchetype` treats any `healAmount > 0` as healer | `enemyAI.ts` 420–424 | Drain kits become healers; new support spells are unsafe to assign |
| Boss kits are AI pools, not grants | `bossKits.ts` | Watching Inferno on the Countess does not unlock it (and the player already owns it) |

Quality audit (`QUALITY_AUDIT_2026-08-30.md`) already marked spell-discovery pacing `NO_MEASURABLE_EFFECT`. This design is the product answer.

**Do not unlock because the encounter started.** An enemy may possess a learnable id for the entire fight and never reveal it.

**Do not require the player to be hit.** Observation is “the hostile used this spell id,” not “it connected.”

---

## 2. Design principles

1. **Id is identity.** `name` / `description` / toast copy are presentation. Observation, kits, AI, and grants key off `spell.id` only (`ARCHITECTURE.md` 356).
2. **Catalog ≠ ownership.** `getSpellConfigs` is public definition. Progress is caller-scoped `ownedSpellIds` + `observedSpellIds`.
3. **Use → observe → win → unlock** is the default learn path. Possession is not observation.
4. **Tactical patience is a real decision.** An unusual enemy may hold a rare technique. Ending the fight in two turns can be the correct kill **and** a missed observation.
5. **Not every enemy ability is player-learnable.** `ENEMY_ONLY` / `BOSS_ONLY` / `SYSTEM_ONLY` exist so identity stays readable.
6. **Never assign a spell an AI cannot use.** Every enemy-castable id declares `AI_REQUIREMENTS`. Missing `aiProfile` / `aiHint` = do not put it in a pool.
7. **Expand, do not replace.** New spells add a decision (position, AP, range, cooldown, condition). They do not clone Shield / Poison / Expose.
8. **No last tier.** Eligibility uses **relative** `R = enemy.level − player.level`, variant, rarity, AI sophistication, family, feats, encounter type, and mechanic complexity. Generation `G` is unbounded.
9. **Backend-authoritative, idempotent.** Duplicate victory callbacks, remounts, and reloads must not duplicate spells, reset upgrades, mint Doka/XP, or smash `updateCharacter`.
10. **Single recap.** Unlocks appear on the existing root `PostBattleRecap` (`App.tsx`). No second popup. No `localStorage` authority.
11. **Do not touch** RAF, map generation, turn logic, or damage math. Discovery is a persist + UX + kit-resolve layer. New effects land as explicit `SpellConfig` metadata in a later data PR.

---

## 3. Core mechanic (state machine)

Default discovery rule, in order. All five must hold for `ENEMY_DISCOVERY` (and for `MULTI_SOURCE` children that include it).

```
1. Hostile possesses an eligible player-learnable spell id
     (resolved kit / assignedSpells — not a name match)
2. Hostile ACTUALLY USES that id during battle
     (WX applied a kind === "cast" that spent AP; not AI consider, not preview)
3. Spell becomes OBSERVED for this (principal, slot, spellId)
4. Player successfully WINS that battle
     (existing victory persist — applyRewards enqueue — same encounter by default)
5. Spell becomes permanently unlocked in the Spell Library
     (ownedSpellIds append; recap card; no Doka/XP from the grant itself)
```

### 3.1 What is “used”

| Event | Observed? |
| :--- | :--- |
| Encounter start / kit assigned | **No** |
| `decideEnemyAction` selected the spell | **No** |
| Targeting preview / telegraph highlight | **No** |
| WX applied `kind: "cast"` and deducted AP | **Yes** |
| Cast fizzled after AP spend (`resolveSpellCast` fail roll, `spellEngine.ts` 427–431) | **Yes** — the technique was used |
| Cast missed / was mirrored / player evaded | **Yes** — hit is not required |
| Player-side summon cast the id | **No** |
| Hostile summon cast a learnable id | **Yes** — source enemy = the summon’s `ownerId` family for the recap “source” line |
| Debug / admin forced cast | Dev-only; must not write production owned sets |

### 3.2 Same-encounter victory (default)

`VICTORY_REQUIRED` is satisfied only if `commitSpellDiscoveries(slot, encounterId)` sees an observation whose `encounterId` equals this victory’s encounter.

- Flee / death / Death Realm: observation **stays**. Unlock does **not** fire.
- A later win **without** re-observation does **not** unlock (default).
- Per-definition opt-in `allowLaterVictory` (Admin, #116 §5.3) may grant on any later win while the observation exists. Wave-1 cards default this **false**.

### 3.3 The tactical discovery decision

This is the intended player-facing tension, not flavor text.

- Fast lethal (Inferno, Sacrifice, Attack Nearest) can delete an elite before it spends the rare id.
- Holding a turn, leaving a glass caster at 20% HP, or walking into a range the AI will use, is a **real** trade: HP/challenge risk vs a new library entry.
- UX must make observation **visible** (`TECHNIQUE OBSERVED`) so the player knows the window opened — and still not pause the fight.
- Recap must make the win-grant **visible** (`NEW SPELL DISCOVERED`) so the patience paid off on the same funnel as XP/Doka.

Do **not** add a “wait N turns” or “see it 3 times” tax on the default rule. Count-gates belong on **boss adaptations** (#137) only, and they still require victory.

### 3.4 Eligibility (all must hold)

1. Definition `lifecycle = active` (after #116 lifecycle exists; until then: id is in the live catalog and not on the id-tombstone list).
2. `PLAYER_LEARNABLE = true`.
3. Route is `ENEMY_DISCOVERY` **or** `MULTI_SOURCE` that lists it.
4. Id is **not** already in `ownedSpellIds`.
5. Caster is hostile (`side === "enemy"`), including hostile summons.
6. Id was on that combatant’s **resolved kit** (`assignedSpells`), never inferred from `spell.name`.
7. Minimum eligibility for this encounter is met (§6): relative band, variant, rarity, `aiTier` / `aiProfile`, family, achievement state, encounter type, mechanic complexity.

---

## 4. Acquisition sources and learnability

Closed enums. The engine never infers route from `usableByPlayer && usableByEnemy` or from the spell’s name.

### 4.1 `ACQUISITION_SOURCE`

| Source | Grant writer | Observation? | Victory? |
| :--- | :--- | :--- | :--- |
| `ENEMY_DISCOVERY` | `commitSpellDiscoveries` | Required | Required (same encounter) |
| `ACHIEVEMENT` | `markAchievementUnlocked` extension (`spellRewardIds`) | Default false | Feat unlock is the gate |
| `CHALLENGE` | Same persist lock as `liveBattleChallengePersistEntries` | Default false | Challenge predicate + victory |
| `BOSS` | Existing boss-clear persist (not room-0 farm) | Default false unless hybrid | That boss defeat |
| `ELITE` | Discovery persist with elite/champion encounter tag | Required if flagged | Elite/champion pack victory |
| `SPECIAL_ENCOUNTER` | Encounter-complete writer keyed by encounter id | Per definition | That encounter win |
| `MULTI_SOURCE` | First completed child wins | Union of children | Union of children |

`usableByPlayer` / `usableByEnemy` remain **cast gates**, not acquisition.

### 4.2 Learnability class (`PLAYER_LEARNABLE` + route)

| Class | `PLAYER_LEARNABLE` | May enter `ownedSpellIds` | Typical use |
| :--- | :--- | :--- | :--- |
| `PLAYER_LEARNABLE` | true | Yes, via a grant writer | Default new content |
| `ENEMY_ONLY` | false | Never | Kamikaze fuse, pack auras, AI-only detonators |
| `BOSS_ONLY` | false | Never | Arena mutation, silence lanes, illusion split |
| `SYSTEM_ONLY` | true if `isBaseSpell` | Seeded at create only | Strike, Attack Nearest, debug |

Validator rejects `PLAYER_LEARNABLE = true` on `ENEMY_ONLY` / `BOSS_ONLY`.

### 4.3 Flags on every definition

| Flag | `ENEMY_DISCOVERY` default | Meaning |
| :--- | :--- | :--- |
| `OBSERVATION_REQUIRED` | true | Unlock illegal until a persisted observation of **this id** being cast by a hostile |
| `VICTORY_REQUIRED` | true | Observation alone never unlocks |
| `PLAYER_LEARNABLE` | true | If false, never owned |
| `allowLaterVictory` | false | Opt-in: a later win can complete an old observation |

`SYSTEM_ONLY` + `isBaseSpell`: learnable true, both observation flags false.  
`ACHIEVEMENT` / `CHALLENGE` / `BOSS` / `SPECIAL_ENCOUNTER`: observation flags default false (the named source is the gate). `ELITE` defaults **true/true** so elite signatures stay a fight, not a loot table.

---

## 5. Existing catalog remap (so discovery has empty slots)

`WorldExploration.tsx` 2242–2272 must stop treating the full `starterSpells` array as innate. That split is **this** ecosystem’s prerequisite; #120 already asked for it.

### 5.1 Innate seed (`SYSTEM_ONLY`, `isBaseSpell`, observation flags false)

Keep a **tiny** always-owned kit so a new character can fight and so Attack Nearest / Strike stay legal (`physical_attack` is the melee baseline).

| SPELL_ID | NAME | Why innate |
| :--- | :--- | :--- |
| `physical_attack` | Strike | Only true melee baseline; `isBaseSpell` already |
| `starter-shield` | Shield | One defense so early packs are readable |
| `starter-poison` | Poison Arrow | One ranged DoT |
| `starter-heal` | Blood Mend | One self-heal |

Do **not** seed summons, Swap, Mark, Mirror, Timestep, Inferno, or the unique kit as innate.

### 5.2 Remap table (existing ids → discovery)

Migration for **current** characters: `ownedSpellIds` = innate four ∪ ids already in `spellLevelKeys` ∪ ids already on `spellBarOrder` that still resolve. **Do not** grant the full catalog. **Do not** grant `getSpellConfigs()`.

| SPELL_ID | New source | Learnable | Observation | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `starter-blast` | `ENEMY_DISCOVERY` | yes | yes | Storm Caller / queen kits |
| `starter-drain` | `ENEMY_DISCOVERY` | yes | yes | Do not assign until `aiProfile` exists (healer trap) |
| `starter-frost` | `ENEMY_DISCOVERY` | yes | yes | Bishop / Tide Shade CORE |
| `spell-swap` | `ENEMY_DISCOVERY` | yes | yes | Wraith / Rift Hook identity |
| `spell-mark` | `ENEMY_DISCOVERY` | yes | yes | Glyph Sower / sniper |
| `spell-barrier` | `ACHIEVEMENT` | yes | no | `spell_scholar` — player-only today (`usableByEnemy: false`) |
| `spell-mirror` | `BOSS` | yes | no | First Mirror Sovereign **or** Pale Archbishop win; still player-cast |
| `spell-timestep` | `CHALLENGE` | yes | no | `legendary_2` (Blitz) — once/battle is a reward for speed |
| `spell-sacrifice` | `ENEMY_DISCOVERY` | yes | yes | Crimson Spawn ELITE |
| `spell-lifesteal-nova` | `ELITE` | yes | yes | Champion drain; gated on `aiProfile` |
| `spell-enrage` | `ENEMY_DISCOVERY` | yes | yes | Hex Chorister / Ember |
| `spell-iron-skin` | `ENEMY_DISCOVERY` | yes | yes | Rook / Golem. Near-duplicate of Shield — keep as the **enemy-taught** RES% so Shield can stay innate |
| `spell-haste` | `ENEMY_DISCOVERY` | yes | yes | Tide / Reaver |
| `spell-weaken` | `ENEMY_DISCOVERY` | yes | yes | Bone Scribe CORE |
| `spell-slow` | `ENEMY_DISCOVERY` | yes | yes | Tide / Coil |
| `spell-expose` | `ENEMY_DISCOVERY` | yes | yes | Scribe / Rat |
| `spell-venom-strike` | `ENEMY_DISCOVERY` | yes | yes | Near-duplicate of Poison Arrow — teach as **melee DoT** |
| `spell-rallying-cry` | `ENEMY_ONLY` until flipped | no* | — | `usableByEnemy: false` today. Pale Cantor / Hex CHAMPION may flip **per family**. Player already has Blood Mend |
| `spell-drain-courage` | `ENEMY_DISCOVERY` | yes | yes | Coil Arbiter |
| `spell-cursed-wound` | `ENEMY_DISCOVERY` | yes | yes | Scribe / Fetid kits |
| `spell-shadow-veil` | `ENEMY_DISCOVERY` | yes | yes | Lurker / Mirror |
| `spell-inferno` | `ENEMY_DISCOVERY` | yes | yes | Ember / Queen zone ≥ 2 |
| `spell-frost-nova` | `ENEMY_DISCOVERY` | yes | yes | Tide ELITE |
| `summon-dire-wolf` | `ENEMY_DISCOVERY` | yes | yes | Brood Chanter |
| `summon-archer` | `ENEMY_DISCOVERY` | yes | yes | Brood Chanter |
| `summon-sentinel` | `ACHIEVEMENT` | yes | no | `spell_master` — player-only guardian |
| `summon-bomber` | `CHALLENGE` | yes | no | `hard_2` — player-only kamikaze |
| `summon-wisp` | `ACHIEVEMENT` | yes | no | `survivor` — player-only healer pet |
| `shadow_strike` | `ENEMY_DISCOVERY` | yes | yes | Backend id; Lurker RARE. Must be seeded in `spellConfigs` (#116 SDA-007) |
| `soul_rend` | `ELITE` | yes | yes | Rat / Glyph RARE |
| `vampire_bite` | `ELITE` | yes | yes | Gated on `aiProfile` (healAmount trap) |
| `reflect_barrier` | `ENEMY_ONLY` | no | — | Mirror clone. Do not teach a second reflect |
| `thunder_clap` | `ENEMY_DISCOVERY` | yes | yes | Storm Caller ADVANCED |
| `void_collapse` | `BOSS_ONLY` | no | — | 12 AP attract-all. Player learns Hook + Root separately (#120) |

\*If a later family flip makes Rallying Cry enemy-castable, it stays `ENEMY_ONLY` for players (Blood Mend + Choir Hymn cover the fantasy).

Boss adaptations from #137 (`spell-ember-step`, `spell-caltrop`, `spell-shock-glyph`, `spell-exsanguinate`, `spell-glyph-snare`, `spell-vault`, `spell-brood-ward`, `spell-aftershock`, `spell-rot-brand`, `spell-echo-cast`) keep **that** document’s gates. They are not re-specified here.

Tactical gap-fillers from #120 keep **that** document’s acquisition stamps.

---

## 6. Spell pool evolution (never a last tier)

Enemy families may hold five pools. Pools are **id lists**, not piece-name heuristics. Chess chassis remains art + `getEnemyBaseStats` key (#136).

| Pool | Intent | Typical gate |
| :--- | :--- | :--- |
| `CORE_POOL` | Bread-and-butter, teaches the family | Always, any `R` |
| `ADVANCED_POOL` | Extra verb, same identity | `R ≥ 0` or variant ≥ VETERAN |
| `RARE_POOL` | Low-weight extra slot, max 1 | `R ≥ T` **or** weighted roll |
| `ELITE_POOL` | Elite / champion packs | Encounter tag elite/champion |
| `SIGNATURE_POOL` | One id unique to the family | Explicit `signatureId`; never randomly borrowed |

`T` = current `tierSize` (default 10). `R = enemy.level − player.level`.

### 6.1 Generation index (unbounded)

```
G = floor(max(0, R) / T)     // 0, 1, 2, … no maximum
```

| G | Player-relative meaning | Pool policy |
| :--- | :--- | :--- |
| 0 | At or below the player | CORE only (plus innate Strike if kit empty) |
| 1 | About one tier above | CORE + one ADVANCED |
| 2 | Two tiers above | ADVANCED guaranteed; RARE eligible |
| 3+ | Far above | RARE weight rises; ELITE/SIGNATURE weights follow #136 §2.4. **Still the same family.** |

There is **no** `G_max`. When content needs a new verb at high relative difficulty, add a definition with `generationMin = currentPublishedMax + 1`. Old generations stay legal. Do not retire CORE to “make room.”

`computeAITier` (`combatMath.ts` 36–51) already has a 30% 1–10 noise roll and a soft band that continues past level 900 (`baseTier = 10` is a **floor label**, not a content cap). Variant floors from #136 sit **on top** of that noise. New spells may require `aiTierMin` and/or an explicit `aiProfile`. They must not require `enemy.level >= N` as a last level.

### 6.2 Eligibility dimensions (all may apply; none is a cap)

| Dimension | How it gates a pool slot |
| :--- | :--- |
| Enemy relative level | `G` / `R` as above |
| Enemy variant | BASE / VETERAN / ELITE / CHAMPION floors (#136 §2.2–2.3) |
| Rarity | Second roll after `pickEnemyLevelFromTiers` — do not retune those percents |
| AI sophistication | `aiTier` minimum + required `aiProfile` / `aiHint` |
| Enemy family | Pool membership is per `EnemyKit.enemyId` / family id |
| Achievement state | e.g. `null_censor` weight ×2 if the player owns a summon id (build, not level) |
| Encounter type | World pack / dungeon / elite pack / special encounter / boss |
| Mechanic complexity | `complexity: LOW \| MED \| HIGH`. HIGH ids require `aiHint` **and** `G ≥ 1` unless SIGNATURE |

`pickEnemyLevelFromTiers` already raises the chance of near/above-player enemies as the player grows (`combatMath.ts` 54+). Discovery frequency therefore scales **with the existing spawn math**. Do not add a “max rarity at level N.”

### 6.3 Resolve order (later implementation)

```
resolveEnemyKit(familyId, pieceType, R, variant, encounterTags, aiProfile) → SpellConfig[]
  1. CORE_POOL (always)
  2. if G ≥ 1 or variant ≥ VETERAN: one id from ADVANCED_POOL matching aiHint
  3. if rare roll hits: at most one RARE_POOL id
  4. if elite/champion tag: ELITE_POOL ids the AI can use
  5. if signature present and G ≥ signature.generationMin: SIGNATURE_POOL
  6. drop any id whose AI_REQUIREMENTS are unmet
  7. drop ENEMY_ONLY? keep — enemies may cast them; they just never grant
  8. if empty: [physical_attack]
```

Never grab a random `usableByEnemy` id to fill a hole. Empty slot → skip.

Kit growth must pass a **number** (`G` or `floor(enemy.level / T)`), not `currentMap.levelZone` (the NaN bug).

---

## 7. Spell discovery UX

Carved-stone, dark slate, crimson accent. Match `DESIGN.md` + existing recap gold trim. Do not invent a second visual system. Do not ship this chrome on a non-admin second HUD.

### 7.1 In-battle: `TECHNIQUE OBSERVED`

When an unknown eligible id is **used** (§3.1):

- **Placement:** top-centre toast (same family as achievement toasts, `WorldExploration.tsx` 2093) **plus** one battle-log line via `logBattleEntry`.
- **Copy:** `TECHNIQUE OBSERVED` (11px uppercase, letter-spacing 0.08em, gold). Second line: spell **name** only (12px). Do **not** dump AP/range here.
- **Chrome:** slate panel `oklch(0.10 0 0)`, gold-dim 1px border, 2px crimson left edge, inset gold glow. Icon: the spell’s `iconEmoji`.
- **Duration:** 2.4s. Does **not** pause turns, block targeting, or steal canvas focus.
- **Dedup:** once per `(encounterId, spellId)` this battle. Repeat casts of an already-observed id stay silent (log line optional at debug).
- **Already owned:** no toast.
- `ENEMY_ONLY` / `BOSS_ONLY`: optional dim log `UNKNOWN TECHNIQUE` — **no** observe persist, no toast that implies a future unlock.

Do not use a blocking modal. Do not use `window.alert`.

### 7.2 After victory: `NEW SPELL DISCOVERED`

On the **existing** root `PostBattleRecap` (`App.tsx` → `PostBattleRecap`). Extend `BattleRecapData` with:

```
discoveredSpells?: Array<{
  spellId: string;
  name: string;
  role: string;
  apCost: number;
  range: number;
  targetType: string;
  keyEffect: string;      // one line from description
  sourceEnemyName: string;
  sourceFamily?: string;
  acquisitionSource: string;
}>
```

- Header chip: `NEW SPELL DISCOVERED` (crimson on victory gold, same weight as `BOSS DEFEATED` at `PostBattleRecap.tsx` 127–157).
- One carved card per grant. Fields shown: **name, role, AP, range, target type, key effect, source enemy**.
- Multiple grants stack (max 4 cards visible; overflow `+N more` — bar is still 8).
- Defeat recap (`isDefeat`) **never** shows this block even if observations exist.
- Opening Spellbook from the recap is **not** required. The grant is already persisted before the popup is interactable (same rule as XP/Doka: enqueue, `commit` after canister write).

### 7.3 Spell Library

`SpellbookModal` `allSpells` becomes **owned ids only** (not the full catalog).

- New unlocks get a one-session `NEW` seal (crimson). After the next world hydrate, the seal is gone; the spell remains.
- Optional later Codex (not this design): silhouettes for observed-but-not-owned and never-seen. Codex is presentation; it does not equip.
- `setSpellBarOrder` must accept owned-but-never-upgraded ids (#116 SDA-013). Today it drops anything not in `spellLevelKeys` (`main.mo` 1233–1242).

---

## 8. Persistence

Discovery is a **progress write**, not a reward credit. It still **enqueues on `createProgressPersist`** so it cannot race `applyRewards` / `saveBattleStats` / `upgradeSpell`.

### 8.1 Stores (names indicative; #116 §10 is the admin sketch)

| Store | Key | Value |
| :--- | :--- | :--- |
| `ownedSpells` | `principal#slot` | `[Text]` owned ids |
| `observedSpells` | `principal#slot#spellId` | `{ observedAt; encounterId; sourceCombatantId }` |

`upgradeSpell` remains the **sole** writer of `spellLevelKeys` / `spellLevelValues`. Discovery **must not** call it (it would charge `spellLevelingBaseCost * 2^level` and bump level).

`saveBattleStats` continues to ignore spell-level arrays.

Do **not** write owned ids through `updateCharacter`.

### 8.2 Canister methods (later)

```
recordSpellObservation(slot, spellId, encounterId, sourceCombatantId)
  → #ok | #err Text
  - reject unknown / not PLAYER_LEARNABLE / ENEMY_ONLY / BOSS_ONLY
  - idempotent on (principal, slot, spellId): second call updates encounterId only
  - does not append ownedSpellIds

commitSpellDiscoveries(slot, encounterId)
  → #ok [Text]   // newly granted ids, possibly empty
  - grants observed eligible ids whose VICTORY_REQUIRED is met by this encounter
  - skips already-owned (duplicate-safe)
  - does not grant Doka or XP
  - does not mutate spellLevelKeys

unlockOwnedSpell(slot, spellId, reason)
  → #ok | #err
  - ACHIEVEMENT / CHALLENGE / BOSS / SPECIAL_ENCOUNTER / admin-dev
  - same idempotent owned append
  - reason is an enum, not a name string
```

`localStorage` may cache `{userId}_slot{N}_pbv_owned_spells` the same way spell levels are cached. **Backend wins** on hydrate.

### 8.3 Idempotency and duplicate-callback safety

| Failure mode | Required behaviour |
| :--- | :--- |
| Observation fired twice (React remount, double WX apply) | Second `recordSpellObservation` is `#ok` no-op / encounter refresh. One row. |
| Victory persist retried | `commitSpellDiscoveries` returns empty if already owned. No second recap grant. |
| Recap remount | Cards read the committed list for this encounter, not a client “just unlocked” flag that can double. |
| Reload mid-observe, before victory | Observation present; owned unchanged. |
| Reload after victory, before recap paint | Owned contains the id; recap may show it if `encounterId` matches, else no `NEW` chip (spell is simply in the library). |
| Already-owned re-observation | No toast, no grant, no level reset. |
| `upgradeSpell` after discover | Levels start at 0 (key absent). First upgrade costs base 10. Never reset an existing level. |
| Discovery must not mint Doka/XP | No `applyRewards` delta from the grant. Optional later feat that *also* pays Doka uses `claimAchievementReward` on the lock — separate writer. |
| Death penalty | `saveBattleStats` 20/40; owned/observed untouched. |
| Character create | Seed only the four innate ids. `uiLayout: ""`. |

### 8.4 Hostile summons and sources

Recap `sourceEnemyName` is the **caster’s display name** if it is a full enemy, or `"{family} brood"` if a hostile summon used the id. `sourceCombatantId` is stored for debug; the player-facing line is the name/family.

---

## 9. AI compatibility

**Never assign a spell to an enemy whose AI cannot understand how to use it.**

Today `inferArchetype` (`enemyAI.ts` 420–449) is metadata-hostile: any `healAmount` → healer; majority ranged → caster; knight → flanker; `family.includes("berserk")` is a **name** hint. New assignments require an explicit `aiProfile` on the enemy and an `aiHint` on the spell.

### 9.1 Required `aiProfile` values (closed)

Existing: `caster | healer | charger | flanker | berserker | summoner | generic`.

Needed before the matching spells ship (see #136 / #133): `kiter`, `buffer`, `bomber` (reuse summon bomber, do not clone), `guardian` (reuse summon guardian), `turret`.

Until a profile exists, **do not** put its required spells in a live pool.

### 9.2 `aiHint` is metadata, not a name

Each enemy-castable definition declares `aiHint` (stable key) plus a one-line predicate the decide\* function can test. Examples used in §11:

| `aiHint` | Safe profiles | Predicate (intent) |
| :--- | :--- | :--- |
| `ap_tax_before_enemy_cast` | caster, controller | Cast if target likely to spend ≥ 4 AP next turn |
| `buff_adjacent_ally` | buffer, healer, guardian | Living ally within 1; skip if buff already up |
| `diagonal_push_to_hazard` | flanker, charger | 1-step diagonal ray hits hazard / barrier / void |
| `min_range_sniper` | caster | Chebyshev ≥ `minRange`; flee if closer |
| `leave_hazard_on_walk` | charger, flanker, berserker | After a move of ≥ 1 tile |
| `mark_two_setup` | caster | Two hostiles in range; else skip |
| `blink_through_blocker` | flanker, caster | Destination free; one occupied cell on the line |
| `punish_summon_death` | caster | A player summon died this or last turn |
| `init_steal_if_losing_init` | caster, controller | Caster init < target init |
| `self_detonate_cluster` | bomber | ≥ `AI_KAMIKAZE_MIN_TARGETS` in radius |
| `ally_swap_peel` | guardian | Player adjacent to ward; swap legal |
| `ally_heal_lowest` | healer | Ally HP% below heal threshold |
| `silence_next_spell` | **boss AI only** | Pending player nuke — not for world packs |
| `no_cast` | — | Kit must not include this id |

If no listed profile can satisfy the hint, the spell is `ENEMY_ONLY` **or** player-only (`usableByEnemy: false`).

### 9.3 Healer-inference lock

Until `aiProfile` is explicit, CORE pools for non-healers **must not** include `healAmount > 0` (`starter-drain`, `vampire_bite`, `spell-lifesteal-nova`, `spell-blood-benediction`). This is a hard assign rule, not a name check.

---

## 10. Balance doctrine

New spells expand **tactical possibility**. They do not replace old spells with a bigger number.

Prefer:

- Situational advantages (min-range, diagonal-only, “if you took no damage”)
- Synergies that resolve via **flags / tiles / effect keys** (Mark, hazard, root, absorb) — never `spell.name === "…"`
- Positioning requirements
- AP tradeoffs (cheap now, expensive later; Overcast)
- Range tradeoffs
- Cooldowns
- Conditional power (execute windows live in #120 Grave Bell — do not clone)

Power bands (relative to live anchors; do not touch damage formulas):

| Band | AP | Payload | Anchor |
| :--- | ---: | :--- | :--- |
| Cheap tool | 2 | 8–12 **or** strong position/control | Strike 10 / Slow |
| Standard | 3 | ~18–22 **or** 12 + movement **or** clean utility | Frost 20 / Swap |
| Heavy | 4–5 | AoE / delayed / summon, CD 2–3 | Chain / Inferno |
| Signature | 6 + CD 4+ | Multi-axis; usually `ENEMY_ONLY` / `BOSS_ONLY` | Do not copy Void Collapse 12/80 |

Duplicates to stop cloning: Shield ≈ Iron Skin (keep both only because one is innate and one is taught); Blood Mend ≈ Rallying Cry; Poison ≈ Venom; Expose ≈ Shadow Veil; Mirror ≈ Reflect Barrier.

---

## 11. Proposed spells (Wave 1)

All rows: `STATUS: PROPOSED`. `mpCost: 0`. `isBaseSpell: false` unless noted. None of these ids exist in `spellData.ts` or in #120 / #137.

Every card uses the required field list. `SCALING` follows existing `spellDmgGrowthPercent` / `upgradeSpell` unless a field is marked fixed.

---

### SPELL_ID: `spell-quiet-hex`

NAME: Quiet Hex  
ROLE: CONTROL — tax the next spell  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: `G ≥ 0`, family `bone_scribe` or `coil_arbiter`, `aiProfile` caster/controller  
ENEMY_FAMILIES: `bone_scribe`, `coil_arbiter`  
RELATIVE_DIFFICULTY_REQUIREMENT: CORE at peer; ADVANCED when `R < 0`  
RARITY: COMMON  
AP_COST: 2  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: No damage. Next **spell** the target casts costs +1 AP (min 1). Strike / melee is exempt. Duration: until that cast or 2 turns. `effectCategory: "cc"`. `effectParams: {"nextSpellApTax":1,"exemptPhysical":true}`.  
SCALING: tax fixed; duration +1 only if a later duration table exists  
AI_REQUIREMENTS: `aiHint: "ap_tax_before_enemy_cast"`. Profiles: caster, controller. Skip if the target already has this hex.  
PLAYER_COUNTERPLAY: Strike through the window; Timestep; spend the tax on a cheap 2-AP tool  
SYNERGIES: `hard_3` (≤8 AP/turn); Drain Courage; Glyph Tax (#120)  
BALANCE_RISK: Stacking with Drain Courage (−1 AP next turn) + tax can brick a 3-AP bar. **Hex does not stack** with itself; tax + Drain is allowed (two different keys).  
PERSISTENCE_REQUIREMENTS: Standard observe → win. No Doka.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-chain-ward`

NAME: Chain Ward  
ROLE: DEFENSE — adjacent RES share  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: `G ≥ 1` or VETERAN; `aiProfile` guardian/buffer  
ENEMY_FAMILIES: `leash_warden`, `pale_cantor`, `iron_golem`  
RELATIVE_DIFFICULTY_REQUIREMENT: ADVANCED  
RARITY: UNCOMMON  
AP_COST: 3  
RANGE: 1  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 2  
EFFECT: While caster and target remain **Chebyshev ≤ 1**, both gain `buffStat: "res"`, `buffModifier: 1.15`, 2 turns. Breaks if they separate. Weaker than Shield 1.3 / Iron Skin 1.3 because it covers two bodies.  
SCALING: modifier fixed; duration follows buffDuration  
AI_REQUIREMENTS: `aiHint: "buff_adjacent_ally"`. Guardian / buffer / healer. Skip if already chained to that ally.  
PLAYER_COUNTERPLAY: Pull one body with Swap; snipe from 2; Cursed Wound  
SYNERGIES: Leash Warden peel; Ward Interpose; Sentinel  
BALANCE_RISK: Two 1.15 RES bodies + Iron Skin. **Do not** let Chain Ward stack with Iron Skin on the same stat key — last RES% buff wins (existing replace-or-refresh).  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-crosswind`

NAME: Crosswind  
ROLE: POSITION — diagonal push  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: `G ≥ 0`; `aiHint` satisfiable (hazard or barrier on the diagonal)  
ENEMY_FAMILIES: `rift_hook`, `wraith_bishop`, `tide_shade`  
RELATIVE_DIFFICULTY_REQUIREMENT: CORE when a hazard tile exists on the map; otherwise ADVANCED  
RARITY: UNCOMMON  
AP_COST: 2  
RANGE: 1  
TARGET_TYPE: enemy  
LOS: false  
COOLDOWN: 1  
EFFECT: `diagonal: true`. `effectCategory: "pushback"`. `effectParams: {"pushDistance":1,"collisionBonusDamage":6}`. Deal 6 (spell). Push 1 along the caster→target diagonal. Distinct from #120 Shoulder Bash (orthogonal 2-step physical).  
SCALING: damage + collision follow dmg%; distance fixed  
AI_REQUIREMENTS: `aiHint: "diagonal_push_to_hazard"`. Flanker / charger / caster. Skip if the 1-step diagonal is open floor and Strike is in kit.  
PLAYER_COUNTERPLAY: Stand off-diagonal; occupy the landing tile; Barrier  
SYNERGIES: Ember Wake / Cinder Tile (#120) / lava; Mark on landing  
BALANCE_RISK: Cheap + collision can outpace Strike if AI always has a wall. AI skip rule is mandatory.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-glass-shot`

NAME: Glass Shot  
ROLE: DAMAGE — min-range sniper  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `glass_sniper`; `minRange` metadata; `aiProfile` caster  
ENEMY_FAMILIES: `glass_sniper`  
RELATIVE_DIFFICULTY_REQUIREMENT: RARE at `G ≥ 1`; ELITE_POOL on CHAMPION  
RARITY: RARE  
AP_COST: 3  
RANGE: 6 (`minRange: 3`, `maxRange: 6`)  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 1  
EFFECT: Deal 16. `linear: true`. `modifiableRange: true`. Cannot target Chebyshev ≤ 2. This is the family gun — not a Frost Bolt with more range.  
SCALING: damage follows dmg%; minRange fixed; maxRange may grow with existing range-growth, still capped by `maxSpellRange`  
AI_REQUIREMENTS: `aiHint: "min_range_sniper"`. Must flee (Haste / walk) if player enters 2. **Do not** assign to kits without this hint wired.  
PLAYER_COUNTERPLAY: Close to 2; Barrier the file; Fog; Swap  
SYNERGIES: Lens Shift (#120); Mark; Quiet Hex (they waste the shot)  
BALANCE_RISK: Range 6 on a 16×16 board is long. LoS + linear + minRange are the payment. Do not also give this to queens as a generic nuke.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-ember-wake`

NAME: Ember Wake  
ROLE: TERRAIN — leave fire  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `ember_knight`, variant ≥ ELITE, `G ≥ 1`  
ENEMY_FAMILIES: `ember_knight`, `cinder_martyr`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL  
RARITY: RARE  
AP_COST: 3  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: For 2 turns, each tile the caster **leaves** by walking (not Swap / blink) becomes a 3-damage burn hazard for 2 turns (`hazardType: "burn"`). Cap 3 painted tiles per cast. Distinct from #137 `spell-ember-step` (player paints a 2-tile trail on purpose) and from #120 `spell-cinder-tile` (one targeted cell).  
SCALING: hazardDamage follows dmg%; tile cap fixed  
AI_REQUIREMENTS: `aiHint: "leave_hazard_on_walk"`. Charger / flanker / berserker. Do not retreat through own wake if HP% < `ENEMY_HAZARD_AVOID_HP_PCT`.  
PLAYER_COUNTERPLAY: Do not stand on last-walk tiles; frost MP; fight from 4+  
SYNERGIES: Crosswind / Shoulder Bash onto the wake; Blood Moon modifier  
BALANCE_RISK: Wake + map lava double-ticks. Prefer a `spellHazards` map keyed by `"x,y"` so one cell one tick. Challenge lava debit uses `recordInBattleChallengeDamage` only while `inBattleRef`.  
PERSISTENCE_REQUIREMENTS: Standard observe → win. Observation counts **their** wake, not player Ember Step.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-split-mark`

NAME: Split Mark  
ROLE: SETUP — two half-marks  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: `G ≥ 1`; caster kit already contains `spell-mark` **or** this replaces Mark in ADVANCED  
ENEMY_FAMILIES: `glyph_sower`, `storm_caller`, `glass_sniper`  
RELATIVE_DIFFICULTY_REQUIREMENT: ADVANCED  
RARITY: UNCOMMON  
AP_COST: 3  
RANGE: 4  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: Mark the primary tile **and** the nearest other hostile’s tile. Amp is ×1.5 (not Mark’s ×2). Both consume on next hit. `isMark: true` plus `effectParams: {"markCount":2,"markAmp":1.5}`. Engine must read amp from params, not from the name “Mark”.  
SCALING: amp fixed  
AI_REQUIREMENTS: `aiHint: "mark_two_setup"`. Caster. If only one hostile, cast is a single ×1.5 mark — AI may still prefer classic Mark if present.  
PLAYER_COUNTERPLAY: Stack both bodies so only one tile matters; step off; Null Field  
SYNERGIES: Ricochet Shard (#120); Chain Lightning; Inferno  
BALANCE_RISK: Two ×1.5 marks can outpace one ×2 if AoE hits both. Amp 1.5 is mandatory.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-phase-slip`

NAME: Phase Slip  
ROLE: POSITION — blink through one body  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: `G ≥ 1`; families `wraith_bishop` / `blink_cutter`  
ENEMY_FAMILIES: `wraith_bishop`, `blink_cutter`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL (CHAMPION in #136 called this `spell-phase-step` — **this** is the formal id; do not also add `spell-phase-step`)  
RARITY: RARE  
AP_COST: 3  
RANGE: 2  
TARGET_TYPE: ground  
LOS: false  
COOLDOWN: 2  
EFFECT: `freeCells: true`. `effectCategory: "teleport"`. `effectParams: {"teleportMode":"self_free_cell","phaseThroughOccupied":1}`. Destination must be exactly 2 Chebyshev from caster and free. The one cell between **may** be occupied (the slip). Distinct from #120 Mist Step (any free cell in 3, no pierce) and from Swap.  
SCALING: range fixed  
AI_REQUIREMENTS: `aiHint: "blink_through_blocker"`. Wraith: escape LoS. Cutter: enter rear. Same id, **different** profile predicates — do not share destination scoring.  
PLAYER_COUNTERPLAY: Stand in corners; Slow before the slip; occupy both 2-range landings  
SYNERGIES: Shadow Veil after slip; Crosswind  
BALANCE_RISK: Pierce + Swap in one kit deletes walls. Cooldown 2 and range 2 are the payment.  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-sever-tether`

NAME: Sever Tether  
ROLE: ANTI-SUMMON — punish a death  
ACQUISITION_SOURCE: ENEMY_DISCOVERY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `null_censor`; a player summon has died this battle **or** `G ≥ 1`  
ENEMY_FAMILIES: `null_censor`  
RELATIVE_DIFFICULTY_REQUIREMENT: ADVANCED; ELITE when a summon died this or last turn  
RARITY: UNCOMMON  
AP_COST: 3  
RANGE: 4  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 2  
EFFECT: Deal 10. If the target (player) has lost a summon this or last turn, also `debuffStat: "ap"`, `debuffModifier: -1`, 1 turn. `effectParams: {"requireRecentSummonDeath":true}`.  
SCALING: damage only; AP tax fixed  
AI_REQUIREMENTS: `aiHint: "punish_summon_death"`. Caster. If no recent summon death, AI may still cast for the 10 damage only when Frost is unavailable.  
PLAYER_COUNTERPLAY: Let lifespan expire on your turn (still a death — **documented**: lifespan fade counts). Or don’t summon.  
SYNERGIES: Null Brand; Cursed Wound on the pet first  
BALANCE_RISK: Double-tax with Drain Courage. Cap: Sever’s AP debit **does not apply** if Drain Courage is already active on the target (one AP shred at a time).  
PERSISTENCE_REQUIREMENTS: Standard observe → win.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-overcast`

NAME: Overcast  
ROLE: SUPPORT — range for AP  
ACQUISITION_SOURCE: ACHIEVEMENT  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Feat `spell_scholar` (`spell_level_5`) unlocked  
ENEMY_FAMILIES: none (`usableByEnemy: false`)  
RELATIVE_DIFFICULTY_REQUIREMENT: n/a  
RARITY: FEAT  
AP_COST: 2  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: Next spell with `modifiableRange: true` gains +2 range **and** +1 AP cost. 2 turns or until that cast. Distinct from #120 Lens Shift (+2 range, no AP tax, 2-turn aura). `effectParams: {"rangeDelta":2,"nextSpellApSurcharge":1,"rangeBuffDuration":2}`.  
SCALING: deltas fixed  
AI_REQUIREMENTS: Player-only. If later given to queens: `aiHint: "prebuff_before_linear_poke"`.  
PLAYER_COUNTERPLAY: Walk into minRange holes; LoS still applies  
SYNERGIES: Glass Shot, Hook Line (#120), Shadow Strike  
BALANCE_RISK: Lens + Overcast must **not** stack range (max one rangeDelta writer). Last writer wins.  
PERSISTENCE_REQUIREMENTS: Grant on `markAchievementUnlocked("spell_scholar")` via `spellRewardIds`. Idempotent. Doka claim stays on `claimAchievementReward`.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-second-wind`

NAME: Second Wind  
ROLE: SUPPORT — conditional MP  
ACQUISITION_SOURCE: CHALLENGE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Complete `easy_3` (`under_50_damage`) **or** `hard_3` (`under_8_ap_per_turn`)  
ENEMY_FAMILIES: none (`usableByEnemy: false`)  
RELATIVE_DIFFICULTY_REQUIREMENT: n/a  
RARITY: CHALLENGE  
AP_COST: 1  
RANGE: 0  
TARGET_TYPE: self  
LOS: false  
COOLDOWN: 3  
EFFECT: If the caster took **0 HP damage** since the start of their previous turn, restore 2 MP (current, not max). Else fizzle (AP still spent). Not a heal (`spellType` must not be `"heal"`). `effectParams: {"restoreMp":2,"requireNoDamageSincePrevTurnStart":true}`.  
SCALING: restore fixed  
AI_REQUIREMENTS: Player-only.  
PLAYER_COUNTERPLAY: Chip them so the condition fails  
SYNERGIES: Untouchable / under-damage challenges; Tide-style kiting  
BALANCE_RISK: Free MP every other turn if you never get hit. CD 3 + condition is the payment. Do not also restore AP.  
PERSISTENCE_REQUIREMENTS: Grant on challenge persist (`rewards.spellIds`) only when `isChallengeCompleted` is true. Same lock as XP/Doka. Failed challenge grants nothing.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-choir-hymn`

NAME: Choir Hymn  
ROLE: SUPPORT — ally CHC  
ACQUISITION_SOURCE: BOSS  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Defeat `twin_monarchs` (both bodies). Not room-0 farm.  
ENEMY_FAMILIES: none as world-pack; Twin Dawn may **cast** a boss-only stronger hymn  
RELATIVE_DIFFICULTY_REQUIREMENT: Boss clear  
RARITY: BOSS  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 3  
EFFECT: Ally (including self) `buffStat: "chc"`, `buffModifier: 0.10`, 2 turns. Weaker than Blood Mend / Rally +15% because it is **ally-target** and has no heal. `DAWN_BUFF` on the Twins stays `BOSS_ONLY` (#137).  
SCALING: modifier fixed  
AI_REQUIREMENTS: If a world buffer ever gets this: `aiHint: "buff_adjacent_ally"` on the highest-damage ally. Twins keep their director.  
PLAYER_COUNTERPLAY: Kill the buffer; Null Field  
SYNERGIES: Crit Striker feat; Mark  
BALANCE_RISK: Ally CHC + Enrage + player CHC stacking. 10% and CD 3 keep it a spice, not a stance.  
PERSISTENCE_REQUIREMENTS: Grant on Twin Monarchs victory persist. Idempotent. No extra Doka.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-oath-bind`

NAME: Oath Bind  
ROLE: CONTROL — mutual summon lock  
ACQUISITION_SOURCE: ELITE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Elite/champion pack; family `null_censor` or `brood_chanter`  
ENEMY_FAMILIES: `null_censor`, `brood_chanter`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL, `G ≥ 1`  
RARITY: RARE  
AP_COST: 4  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 4  
EFFECT: For 2 turns, **both** caster and target cannot spawn summons (`effectParams: {"summonLock":true,"bindsBoth":true}`). Existing summons remain. Distinct from Null Brand (one-sided).  
SCALING: duration fixed  
AI_REQUIREMENTS: `aiHint: "no_cast"` unless the caster is **not** a summoner this fight (Censor). Brood Chanter must **not** receive this id.  
PLAYER_COUNTERPLAY: Already have pets out; wait 2; kill the binder  
SYNERGIES: Sever Tether after a pre-bind kill; Brood Ward (#137) becomes unkeepable if your last pet dies  
BALANCE_RISK: Binding a player who never summons is a 4-AP waste — correct.  
PERSISTENCE_REQUIREMENTS: Observe + elite/champion victory.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-leech-tempo`

NAME: Leech Tempo  
ROLE: CONTROL — steal initiative  
ACQUISITION_SOURCE: ELITE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Elite/champion; `aiProfile` controller/caster  
ENEMY_FAMILIES: `coil_arbiter`, `shadow_lurker`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL, `G ≥ 1`  
RARITY: RARE  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 3  
EFFECT: No damage. For 1 round of turns, treat caster `init` as `max(caster.init, target.init + 1)` and target as `min(target.init, casterBaseInit − 1)` for **queue order only**. Does not write persisted `init` / `CharacterStats`. `effectParams: {"swapInitOrder":true,"durationTurns":1}`.  
SCALING: none  
AI_REQUIREMENTS: `aiHint: "init_steal_if_losing_init"`. Skip if already acting first.  
PLAYER_COUNTERPLAY: Haste after; accept the stolen turn and burst  
SYNERGIES: Drain Courage on the stolen turn; Quiet Hex  
BALANCE_RISK: Initiative code is sensitive. Implementation must be a **battle-queue overlay**, not a `saveBattleStats` init write.  
PERSISTENCE_REQUIREMENTS: Observe + elite victory.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-null-brand`

NAME: Null Brand  
ROLE: ANTI-SUMMON — lockout  
ACQUISITION_SOURCE: ELITE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true  
MINIMUM_ELIGIBILITY: Family `null_censor`, CHAMPION or `G ≥ 2`  
ENEMY_FAMILIES: `null_censor`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL / SIGNATURE  
RARITY: RARE  
AP_COST: 4  
RANGE: 3  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 3  
EFFECT: Target cannot cast `isSummon` spells for 2 turns. One-sided (caster may still summon). `effectParams: {"summonLock":true,"bindsBoth":false}`.  
SCALING: duration fixed  
AI_REQUIREMENTS: Caster. Prefer when the player has a summon id equipped (encounter weight already ×2 in #136).  
PLAYER_COUNTERPLAY: Pets already out; fight without them; Cleanse Rite (#120) if it lists this as a debuff  
SYNERGIES: Sever Tether; Oath Bind is the mutual version — **do not** put both on one BASE kit  
BALANCE_RISK: 2-turn lock vs 4–5 lifespan pets is strong. CD 3 + 4 AP is the payment.  
PERSISTENCE_REQUIREMENTS: Observe + elite/champion victory.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-false-retreat`

NAME: False Retreat  
ROLE: DEFENSE — decoy body  
ACQUISITION_SOURCE: SPECIAL_ENCOUNTER  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Tagged encounter `echo_dummies` (new special — one dummy pack on a rest-adjacent map, not a level gate)  
ENEMY_FAMILIES: encounter script may use `void_mirror` art  
RELATIVE_DIFFICULTY_REQUIREMENT: Special encounter only  
RARITY: SPECIAL  
AP_COST: 3  
RANGE: 1  
TARGET_TYPE: ground  
LOS: false  
COOLDOWN: 3  
EFFECT: `freeCells: true`. Place a **decoy** occupier (not a summon, not a combatant for victory XP) that soaks the **next** hostile damaging hit, then fades. Lifespan 2 turns. `effectParams: {"decoyHpHits":1,"decoyLifespan":2}`. Does not attack. Does not count as `isSummon` for Null Censor.  
SCALING: none  
AI_REQUIREMENTS: Encounter script may cast it. World packs: `aiHint: "no_cast"` until a decoy profile exists.  
PLAYER_COUNTERPLAY: Ignore the decoy; AoE that hits the real body  
SYNERGIES: Untouchable (the soak is not you); Pain Link (#120) is a different fantasy  
BALANCE_RISK: Decoy + Mirror + Ward Plate can stall. CD 3 + one hit only. **0 XP** for killing the decoy.  
PERSISTENCE_REQUIREMENTS: Grant on special-encounter victory writer (`encounterId = echo_dummies`). Idempotent.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-blood-benediction`

NAME: Blood Benediction  
ROLE: SUPPORT — ally heal  
ACQUISITION_SOURCE: MULTI_SOURCE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true if learned via enemy; false if via `pacifist_run`  
MINIMUM_ELIGIBILITY: Pale Cantor used it **or** feat `pacifist_run`  
ENEMY_FAMILIES: `pale_cantor`  
RELATIVE_DIFFICULTY_REQUIREMENT: RARE / CHAMPION for the family; feat is level-agnostic  
RARITY: UNCOMMON  
AP_COST: 4  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 2  
EFFECT: Heal ally 16. `spellType: "heal"`. `healAmount: 16`. **No** CHC rider (that is Blood Mend / Rally). This is the missing ally-target heal.  
SCALING: healAmount follows heal growth  
AI_REQUIREMENTS: `aiHint: "ally_heal_lowest"`. **Requires** `aiProfile: healer`. Do not put on a kit that would trip heal-inference onto a bruiser.  
PLAYER_COUNTERPLAY: Cursed Wound; focus the Cantor; challenge `no_healing` still keys `spellType === "heal"` — using this fails those challenges  
SYNERGIES: Chain Ward; Load Bearing; Wisp is the pet version  
BALANCE_RISK: Ally 16 + self Blood Mend is a hospital. CD 2 + 4 AP + one target.  
PERSISTENCE_REQUIREMENTS: First completed child wins. Observe+win **or** `markAchievementUnlocked("pacifist_run")`. No double copy.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-ward-interpose`

NAME: Ward Interpose  
ROLE: POSITION — forced ally swap  
ACQUISITION_SOURCE: MULTI_SOURCE  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: true if via Leash Warden; false if via `leader_slayer`  
MINIMUM_ELIGIBILITY: Leash Warden CHAMPION used it **or** feat `leader_slayer`  
ENEMY_FAMILIES: `leash_warden`  
RELATIVE_DIFFICULTY_REQUIREMENT: ELITE_POOL / SIGNATURE  
RARITY: RARE  
AP_COST: 3  
RANGE: 3  
TARGET_TYPE: ally  
LOS: false  
COOLDOWN: 3  
EFFECT: Swap caster with allied target (`isSwap` vs ally, not enemy). `effectParams: {"swapMode":"ally"}`. Existing Swap is enemy-only.  
SCALING: none  
AI_REQUIREMENTS: `aiHint: "ally_swap_peel"`. Guardian. Cast when the player is adjacent to the ward and the Warden is not.  
PLAYER_COUNTERPLAY: Attack the Warden; occupy both tiles; Slow  
SYNERGIES: Chain Ward; Shield the body that lands in melee  
BALANCE_RISK: Free reposition every 3 turns. Ally-only keeps it from being Swap 2.  
PERSISTENCE_REQUIREMENTS: First child wins. Observe+win **or** leader-slayer grant.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-martyr-fuse`

NAME: Martyr Fuse  
ROLE: DAMAGE — self-detonate  
ACQUISITION_SOURCE: ENEMY_ONLY  
PLAYER_LEARNABLE: false  
OBSERVATION_REQUIRED: n/a  
MINIMUM_ELIGIBILITY: Family `cinder_martyr`; bomber profile; `AI_KAMIKAZE_*` constants  
ENEMY_FAMILIES: `cinder_martyr`  
RELATIVE_DIFFICULTY_REQUIREMENT: CORE for that family  
RARITY: FAMILY SIGNATURE  
AP_COST: 2  
RANGE: 1  
TARGET_TYPE: area  
LOS: false  
COOLDOWN: 0  
EFFECT: `areaShape: "circle"`, `areaRadius: 2`. Deal 18 to hostiles. Remove caster. `effectParams: {"removeCaster":true}`. Player already has `summon-bomber` + Inferno — they do **not** learn a self-kill button.  
SCALING: damage follows enemy SP, not player upgrades  
AI_REQUIREMENTS: `aiHint: "self_detonate_cluster"`. **Bomber profile only.** Respect `AI_KAMIKAZE_LOW_HP_PCT` / `AI_KAMIKAZE_MIN_TARGETS`.  
PLAYER_COUNTERPLAY: Spread; Slow; Swap it into its allies  
SYNERGIES: Rift Hook stacks bodies; Ember Wake leftover  
BALANCE_RISK: Suicide XP farm — minion/martyr death must **not** grant extra `level * 20` beyond the body already in the defeated list (follow current recap). No bonus Doka for suicide.  
PERSISTENCE_REQUIREMENTS: Never written to `ownedSpellIds`. Optional dim `UNKNOWN TECHNIQUE` log only.  
STATUS: PROPOSED

---

### SPELL_ID: `spell-hex-of-silence`

NAME: Hex of Silence  
ROLE: CONTROL — next spell fizzles  
ACQUISITION_SOURCE: BOSS_ONLY  
PLAYER_LEARNABLE: false  
OBSERVATION_REQUIRED: n/a  
MINIMUM_ELIGIBILITY: `silent_conductor` (Wave-2 boss, #137) and no one else  
ENEMY_FAMILIES: none (boss id only)  
RELATIVE_DIFFICULTY_REQUIREMENT: Boss phase 2  
RARITY: BOSS SIGNATURE  
AP_COST: 4  
RANGE: 4  
TARGET_TYPE: enemy  
LOS: true  
COOLDOWN: 3  
EFFECT: Target’s next non-`isPhysical` spell **fizzles** (AP still spent — `castResultSpendsAp` includes `"fizzled"`). Strike still works. Arena silence **lanes** stay a director, not this spell.  
SCALING: none  
AI_REQUIREMENTS: Boss AI only (`useBossAI` priority: finish telegraph → mechanic → kit). `aiHint: "silence_next_spell"`. **Do not** put in world `ENEMY_KITS`.  
PLAYER_COUNTERPLAY: Strike; spend a cheap buff into the hex; step off a silence file  
SYNERGIES: Conductor lanes; `hard_3`  
BALANCE_RISK: A player-owned version would brick the bar on the overworld. That is why it is `BOSS_ONLY`.  
PERSISTENCE_REQUIREMENTS: Never owned.  
STATUS: PROPOSED

---

### SPELL_ID: `physical_attack` (existing — remap card)

NAME: Strike  
ROLE: DAMAGE — physical melee  
ACQUISITION_SOURCE: SYSTEM_ONLY  
PLAYER_LEARNABLE: true  
OBSERVATION_REQUIRED: false  
MINIMUM_ELIGIBILITY: Character create  
ENEMY_FAMILIES: all kits as empty-resolve fallback  
RELATIVE_DIFFICULTY_REQUIREMENT: none  
RARITY: INNATE  
AP_COST: 2  
RANGE: 1  
TARGET_TYPE: enemy  
LOS: false  
COOLDOWN: 0  
EFFECT: Existing: 10 physical. Only RES applies (not SP). `isBaseSpell: true`. `isPhysical: true`.  
SCALING: existing  
AI_REQUIREMENTS: Every profile may melee. Fallback if kit empty.  
PLAYER_COUNTERPLAY: Walk out of 1  
SYNERGIES: Enrage, Mark, Expose  
BALANCE_RISK: Must remain the empty-kit fallback so enemies are never unarmed  
PERSISTENCE_REQUIREMENTS: Seeded at create into `ownedSpellIds`. Never removed. Remove `physical_attack` from the canister **purge** list (`main.mo` 478–483) so `upgradeSpell("physical_attack")` can resolve (#116 SDA-007).  
STATUS: PROPOSED (remap only — do not re-author the combat row)

---

## 12. How to add the next generation forever

This is the expandable recipe. Future designers attach a card; they do not raise a level cap.

1. **Pick a hole** that is not a clone (see #120 gap map + §10 duplicates).
2. **Assign identity:** one family vocabulary (#136 §5) or one boss adaptation class (#137 §5) or one feat/challenge id.
3. **Stamp acquisition** from §4. Default `ENEMY_DISCOVERY` + observe + same-encounter win.
4. **Stamp `generationMin = currentPublishedMax(family) + 1`** if it is a new high-relative verb. Do not delete CORE.
5. **Write `AI_REQUIREMENTS`.** If no profile can satisfy them, `usableByEnemy: false` or `ENEMY_ONLY`.
6. **Explicit metadata** on `SpellConfig` (`targetType`, costs, flags, `effectParams` whitelist). No `if (spell.name === …)`.
7. **Add the id** to the family `EnemyKit` pool **and** `SPELL_ID_CATALOG` **and** `spellData.ts` in the **same** implementation PR.
8. **Persist** only through the grant writers in §8. No `updateCharacter`. No `upgradeSpell` as unlock.
9. **UX:** unknown + used → `TECHNIQUE OBSERVED`; win → recap card.
10. **STATUS: PROPOSED` until a human/orchestrator picks the ACTION_ID.

`currentPublishedMax` is a data query, not a constant in combat math. It may grow without shipping a “Tier 11.”

---

## 13. Implementation slices (later PRs — not this change)

| Slice | Touches | Must not touch |
| :--- | :--- | :--- |
| A. Ownership split + innate four | `ownedSpells` hydrate; create seed | RAF, damage math |
| B. Observation hook | Enemy/summon cast apply site → `recordSpellObservation` on the persist lock | Turn order |
| C. Victory commit + recap cards | `commitSpellDiscoveries` + `BattleRecapData` | Second recap popup |
| D. TECHNIQUE OBSERVED toast | Battle log + sonner/top-centre | Blocking modal |
| E. Kit resolver uses `G` | `buildEnemyKit` argument is a number | `pickEnemyLevelFromTiers` percents |
| F. `aiProfile` + `aiHint` | `inferArchetype` replacement | Name fallbacks |
| G. Wave-1 data | `spellData.ts` + kits + `SPELL_ID_CATALOG` | Name heuristics |
| H. Feat/challenge/boss grant fields | `spellRewardIds` / `rewards.spellIds` | Doka formula |

Dependencies: A before B–D. F before G. #116 SDA-001/002/003/007 before canister-shaped grants.

Extract helpers. Do not grow `WorldExploration.tsx`.

---

## 14. QA matrix (when a later PR implements)

| # | Check | Pass |
| :--- | :--- | :--- |
| 1 | Encounter start | Possessed-but-unused id does not observe |
| 2 | Use without hit | Cast + miss / mirror / evade still observes |
| 3 | Flee / death | Observation kept; owned unchanged; defeat recap has no `NEW SPELL` |
| 4 | Win without observe | No grant |
| 5 | Win after observe | Grant once; recap shows name, role, AP, range, target, effect, source |
| 6 | Duplicate victory callback | Still one owned row; levels untouched |
| 7 | Already owned | No toast, no grant, no upgrade reset, no Doka |
| 8 | `ENEMY_ONLY` / `BOSS_ONLY` | Never in `ownedSpellIds` |
| 9 | Player summon cast | No observation |
| 10 | Hostile summon cast | Observation; recap source is owner family |
| 11 | Reload | Backend owned/observed win over localStorage |
| 12 | `upgradeSpell` after grant | First upgrade costs base 10; existing levels unchanged |
| 13 | Innate four | New character owns only those four (+ Attack Nearest if it is a system action, not a library id) |
| 14 | Admin catalog add | Other accounts do not gain the id |
| 15 | Kit empty | Fallback `physical_attack` |
| 16 | AI missing hint | Id dropped from resolve, logged once |
| 17 | Challenges | Hazard/reflect still use `recordChallenge*` helpers |
| 18 | Typecheck | `pnpm typecheck` / `pnpm fix` / `pnpm build` clean when code lands |

---

## 15. Out of scope

- Production TypeScript / Motoko / Candid in this PR
- RAF, map generation, turn logic, damage math
- Retuning `pickEnemyLevelFromTiers` percents
- New `CharacterStats` fields (`wp` / `wr` / `scp` stay gone)
- Re-authoring #120’s 16 spells or #137’s 8 boss adaptations
- Player-facing Codex beyond recap + `NEW` seal
- Shop-bought spells
- A level cap, a last generation, or a last spell tier

---

## 16. Wave-1 index

| SPELL_ID | Source | Learnable | Family / gate | Hole |
| :--- | :--- | :--- | :--- | :--- |
| `spell-quiet-hex` | ENEMY_DISCOVERY | yes | scribe / coil | Next-spell AP tax |
| `spell-chain-ward` | ENEMY_DISCOVERY | yes | warden / cantor / golem | Adjacent RES share |
| `spell-crosswind` | ENEMY_DISCOVERY | yes | rift / wraith / tide | Diagonal push |
| `spell-glass-shot` | ENEMY_DISCOVERY | yes | glass_sniper | Min-range linear poke |
| `spell-ember-wake` | ENEMY_DISCOVERY | yes | ember / martyr | Walk-off fire |
| `spell-split-mark` | ENEMY_DISCOVERY | yes | glyph / storm / sniper | Two ×1.5 marks |
| `spell-phase-slip` | ENEMY_DISCOVERY | yes | wraith / cutter | Blink through one body |
| `spell-sever-tether` | ENEMY_DISCOVERY | yes | null_censor | Punish pet death |
| `spell-overcast` | ACHIEVEMENT | yes | `spell_scholar` | Range for AP |
| `spell-second-wind` | CHALLENGE | yes | `easy_3` / `hard_3` | Conditional MP |
| `spell-choir-hymn` | BOSS | yes | Twin Monarchs | Ally CHC, no heal |
| `spell-oath-bind` | ELITE | yes | censor (not brood) | Mutual summon lock |
| `spell-leech-tempo` | ELITE | yes | coil / lurker | Init overlay |
| `spell-null-brand` | ELITE | yes | censor signature | One-sided summon lock |
| `spell-false-retreat` | SPECIAL_ENCOUNTER | yes | `echo_dummies` | One-hit decoy |
| `spell-blood-benediction` | MULTI_SOURCE | yes | cantor **or** `pacifist_run` | Ally heal |
| `spell-ward-interpose` | MULTI_SOURCE | yes | warden **or** `leader_slayer` | Ally swap peel |
| `spell-martyr-fuse` | ENEMY_ONLY | no | cinder_martyr | Self-detonate |
| `spell-hex-of-silence` | BOSS_ONLY | no | Silent Conductor | Next spell fizzles |
| `physical_attack` | SYSTEM_ONLY | yes (innate) | all | Melee fallback |

All STATUS: **PROPOSED**.

---

**Document status:** PROPOSED. Safe to review and to implement in sliced PRs after a human or orchestrator picks an ACTION_ID. Not a license to land combat code in the same change as this spec.
