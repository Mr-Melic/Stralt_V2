# Encounter Evolution Catalog — 2026-09-02

Status: **PROPOSED** (design only). Do not implement production code from this file unless a later human or orchestrator explicitly picks an `ENCOUNTER_ID`.

Author: Dungeon and Encounter Evolution Designer (cron automation).  
ACTION_ID: `EED-2026-09-02-001`.  
Parent catalogs: [`ENCOUNTER_EVOLUTION_2026-08-31.md`](./ENCOUNTER_EVOLUTION_2026-08-31.md) (`EED-2026-08-31-001`), [`ENCOUNTER_EVOLUTION_2026-09-01.md`](./ENCOUNTER_EVOLUTION_2026-09-01.md) (`EED-2026-09-01-001`). **Do not reuse those IDs.** This file only adds new rooms.

Grounding: `main` @ `58302bc` plus sibling design — `docs/design/ENEMY_FORMATIONS_2026-09-01.md` (drop-2 `FSN-*`), `docs/ENEMY_AI_EVOLUTION.md`, `docs/automation/ENEMY_ELITE_EVOLUTION_2026-09-01.md`, `docs/WORLD_DYNAMICS.md` wave 2 (`WF-*`), `docs/automation/SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md`. Live constants: 22 map modifiers in `EXISTING_MAP_MODIFIER_IDS` (`src/frontend/src/engine/worldFeatures.ts` 1409–1432), lava/ice/spikes, `MAX_HAZARD_TILES = 50`, `MAX_ENEMIES = 20`, `ENEMY_SUMMON_CAP = 2`, `AI_KAMIKAZE_MIN_TARGETS = 2`, 19 `BOSS_IDS`, 10 `BOSS_RUSH_ROOMS`, `ChallengeCondition` overlay, atomic `applyRewards`.

---

## 1. Why a third day

Day-1 taught the **Ash / Ice skeleton**. Day-2 taught the **Void primer** and spent `void_rift`, `slime_flood`, `glass_realm`, `iron_curse`, `time_warp`, `gravity_well`, `chaos_initiative`, plus drop-1 packs `FSN-IRON-BATTERY`, `FSN-FROST-KNIFE`, `FSN-MIRROR-SCRIPTORIUM`, `FSN-TRI-BASTION`, `FSN-CROWN-ESCORT`. Rush variants exist for rooms 0 / 1 / 2 / 3 / 4 / 5 / 8 / 9.

After those rooms exist, high-level play is still “the same shape.” Day-3 changes **the question** again by spending the **Blood / Glass / Paper / Null / Hex** verbs that already have formation sheets and leftover map / world-feature knobs.

Gaps this file fills (still unused as scripted rooms):

| Gap | Why it matters at high level |
| :--- | :--- |
| Drop-2 formations | `FSN-HEX-BLOOD`, `FSN-GLASS-WARD`, `FSN-PAPER-PLAGUE`, `FSN-NULL-WALL`, `FSN-HOOK-FUSE`, `FSN-VEIL-HEX`, `FSN-TIDE-STORM`, `FSN-ASH-COURT`, `FSN-QUIET-CHOIR`, `FSN-BROKEN-GLASS`, `FSN-KENNEL-LITANY`, `FSN-PACK-PINCER`, `FSN-CHORUS-THRONE` are PDFs, not rooms |
| Unused live modifiers | `paper_windstorm` (range ×0.5), `arcane_surge` (AP −1 min 1), `mending_mist` (5% regen), `swift_winds` (+2 MP), `arcane_overflow` (cheap AP + fizzle), `doka_fever` (opt-in 2× Doka, **not** a dungeon HP sponge) |
| Placeholder modifiers | `blood_moon` and `mirror_field` are announce-only in `mapModifiers.ts` (no WX hook). Rooms below use **live** `vampiric_ground` / `WF-TEL-MIRROR_STEP` / `glass_realm` and treat those ids as chrome until wired |
| World-feature wave 2 | `WF-HAZ-SALT_CRUST`, `WF-HAZ-CREEP_MIST`, `WF-HAZ-HUNT_LANTERN`, `WF-OBS-FALLEN_GATE`, `WF-OBS-TIDE_DOOR`, `WF-MOD-CROSSWIND`, `WF-ENV-GUTTER_STEAM`, `WF-ENV-ASH_RAIN`, `WF-ZON-WARD_CIRCLE`, `WF-ZON-SECOND_WIND`, `WF-TEL-SLIPSTREAM`, `WF-INV-DUELIST_CIRCLE`, `WF-ELT-TOLL_KEEPER`, `WF-TRS-SEALED_URN`, `WF-RSK-SCOURGE_COMPACT`, `WF-SPL-GRIMOIRE_STALKER` |
| Rush rooms 6 and 7 | `eternal_pawn_king` + `final_pawn` (decoy) and `midnight_bishop` + `twin_monarchs` (rage-on-half-death) have no taught dungeon verb |
| Family identity leftover | `hex_chorister` / `glass_sniper` / `cinder_martyr` / `null_censor` overlays from elite-evolution drop 2 |

Scaling never uses enemy level as the only lever. Preferred order stays: composition → variants → AI gates → kits → hazards / modifiers / world features → objectives → optional `ChallengeCondition`.

**Do not** use `titans_vigor` (`+1000` HP, 1–5× damage) as a dungeon scaler. That is a sponge. It stays out of this catalog.

Relative difficulty bands: `TEACH` / `LOW` / `MID` / `HIGH` / `PEAK`.

---

## 2. Live constraints (unchanged)

- Maps stay solvable: walk-reachable spawn, hostiles, and at least one exit; never spawn on an unlocked portal. Re-run `finalizePlayableLayout` / solvability after scripted hazards or `WF-*` overlays.
- Portals stay locked while hostiles remain. Wave / reinforcement / hold / duel rooms keep a living hostile **or** an explicit `holdPortalLocked` flag.
- Rewards go through `applyRewards` only. Death is 20% XP / 40% Doka via `saveBattleStats`. Dungeon depth multipliers already exist (`getDungeonMultiplier`, cap depth 5). Official client clamps `dokaDelta > 100_000` / `xpDelta > 500_000`.
- Spell targeting and encounter rules use **explicit metadata** (`encounterType`, `objectiveKind`, `failureKind`, kit ids, `formationId`). Never infer from display names.
- Do not touch RAF loop, map-generation algorithms, turn logic, or damage math when a later implementer picks an ID.
- Rest maps already expose `normal` / `dungeon` / `boss`. Snapshot dungeon-chain refs **before** `cleanupMap`. White sanctuary portal colocates with spawn.
- Optional challenges stay optional unless `FAILURE_CONDITION` says otherwise.
- CharacterStats stay the 12-field persisted set. No new wp/wr/scp.
- `instantKill` and `betrayal` AI gates stay off for every sheet.
- Enemy summons stay at cap 2. Hazard tiles stay ≤ 50. Living hostiles stay well under `MAX_ENEMIES`.
- Observation/unlock of spells follows the sibling pipeline: use → observe → win → grant. Possession is not observation. `upgradeSpell` remains the only level writer.
- `inferArchetype` still treats any `healAmount > 0` as healer. Buffers must **not** carry drain / nova / rallying-cry. `spell-rallying-cry` stays `usableByEnemy: false`. Ally mend on this drop is `starter-shield` / `spell-iron-skin` until a ranged heal id exists. `starter-heal` is self-only.
- `usableByEnemy` stays false for `spell-barrier`, `spell-mirror`, `spell-timestep`.
- World-feature % max-HP taxes use `recordChallengeDamageTaken` (explore) or `recordInBattleChallengeDamage` (in battle). Do not invent a second HP writer.
- Kamikaze never detonates on a single full-HP player (`AI_KAMIKAZE_MIN_TARGETS = 2`) unless the martyr is ≤ 30% HP.

---

## 3. Dungeon pacing (Hex primer + inserts)

Standard chain (maxDepth 4 or 5):

```
teach mechanic
  → reinforce
  → combine
  → pressure
  → choice / rest
  → mastery
  → boss
```

| Beat | Depth hint | Job | Day-3 IDs |
| :--- | :--- | :--- | :--- |
| Teach | 1 | One new verb (range tax, salt hop, buff window) | ENC-TEACH-03, ENC-SPELL-05, ENC-HAZ-05 |
| Reinforce | 1–2 | Same verb, tighter or a second role | ENC-WAVE-04, ENC-AMBUSH-03 |
| Combine | 2–3 | Two taught verbs | ENC-FUSE-01, ENC-NULL-01, ENC-HAZ-06, ENC-MOVE-04 |
| Pressure | 3 | Clock, contest, duel, or creeping ash | ENC-SURV-05, ENC-PROT-03, ENC-DUEL-01, ENC-PRIO-04 |
| Choice / rest | mid | Heal vs risk vs four-way branch | ENC-REST-03, ENC-BRANCH-03, ENC-TREAS-03, ENC-TOLL-01 |
| Mastery | 4 | Prove the verbs | ENC-ELITE-04, ENC-ELITE-05, ENC-RARE-03, ENC-MAST-03, ENC-PRIO-05 |
| Boss | maxDepth | Capstone using the taught verb + one `BossId` | ENC-MINI-04, ENC-BOSS-03, ENC-RUSH-09, ENC-RUSH-10 |

Day-1 Ash / Ice and day-2 Void chains remain valid. Day-3 **Hex primer** is the default for accounts that already cleared Ash, Ice, **and** Void once. Rare elite and treasure rooms **insert**; they do not replace a beat.

---

## 4. Encounter catalog

Every entry is `STATUS: PROPOSED`.

---

### ENC-TEACH-03

ENCOUNTER_ID: ENC-TEACH-03  
TYPE: teach mechanic / hazard  
RELATIVE_DIFFICULTY: TEACH  
ENEMY_COMPOSITION: 1× bishop (`starter-frost` only) + 1× pawn (`physical_attack` only). No elites, no families.  
AI_REQUIREMENTS: Bishop kites at Chebyshev ≥ 3. Pawn is a greedy charger. No LoS puzzle, no group-tactics, no lethal lookahead.  
SPELL_DISCOVERY_OPPORTUNITIES: None. This is a range-tax lesson.  
MAP_REQUIREMENTS: Open court, one wide lane. Modifier `paper_windstorm` **on** (ranged spell reach halved — live targeting hook). No lava/ice/spikes. Player spawn opposite the bishop. One locked exit.  
SPECIAL_RULES: `scriptedHazardsOnly`. First frost that falls short of the player because of the 0.5 range multiplier logs a teach line. Do not also apply `WF-MOD-LOW_CEILING` (double range tax).  
OBJECTIVE: Defeat both. Optional: close to melee before spending a long-range spell.  
FAILURE_CONDITION: Player HP ≤ 0 (Death Realm). Challenge overlay does not fail the room.  
REWARD: Low-band victory XP (`level * 20` sum) + depth Doka via `applyRewards`. Easy overlay `under_15_turns`.  
TACTICAL_PURPOSE: Teach “the wind halves reach; walking closer is the answer, not a bigger nuke.” Prepares ENC-ELITE-05 / `FSN-GLASS-WARD` (min-range sniper).  
SOLVABILITY_REQUIREMENTS: Bishop reachable by walking; a 3-column aisle so the player can step off a frost line after closing. Wind does not block tiles.  
REPLAYABILITY: Bishop north vs east. Pawn can sit on knight chassis at mid (still melee only).  
SCALING_BEHAVIOUR: Do not raise levels. Mid: bishop gains `starter-poison`. High: replace the pawn with a `ROLE-WARDEN` rook that body-blocks the close (still no extra HP). Never add `titans_vigor`.  
STATUS: PROPOSED

---

### ENC-HAZ-05

ENCOUNTER_ID: ENC-HAZ-05  
TYPE: hazard / teach → reinforce  
RELATIVE_DIFFICULTY: LOW  
ENEMY_COMPOSITION: 2× pawn chargers + 1× `tide_shade` bishop (`starter-frost`).  
AI_REQUIREMENTS: Pawns start healthy so they may take **one** salt step; wounded pawns avoid a second salt tile (`ENEMY_HAZARD_AVOID_HP_PCT`). Bishop kites from dry floor.  
SPELL_DISCOVERY_OPPORTUNITIES: None required. Optional: winning without a second salt tax can later hint `spell-haste` at rest (reminder, not a grant).  
MAP_REQUIREMENTS: A salt ribbon of 4–6 `WF-HAZ-SALT_CRUST` tiles across the mid-band (first salt step free; extra salt steps in the same turn cost 3% max HP). A dry detour of ≥ 1 tile exists. Exit behind the bishop.  
SPECIAL_RULES: Scripted salt only. Do not mix ice (that is ENC-HAZ-01). Counts toward `MAX_HAZARD_TILES`. Tax via `recordInBattleChallengeDamage` while `inBattleRef`.  
OBJECTIVE: Clear all.  
FAILURE_CONDITION: Player death (frost + salt tax).  
REWARD: Standard. Overlay `under_50_damage` rewards hopping off after one salt tile.  
TACTICAL_PURPOSE: Teach “the first hop is free; a long dash across salt is a tax.” Distinct from ice (MP) and void (tick).  
SOLVABILITY_REQUIREMENTS: Dry detour reaches both pawns and the bishop. Salt never walls a corridor. Salt not on spawn±3 or the portal.  
REPLAYABILITY: Ribbon horizontal vs chevron.  
SCALING_BEHAVIOUR: Mid: add `swift_winds` (+2 MP) so the player *can* take the long salt path in one turn — the lesson is choosing not to. High: bishop gains `spell-slow`. Never thicken the ribbon into a wall.  
STATUS: PROPOSED

---

### ENC-HAZ-06

ENCOUNTER_ID: ENC-HAZ-06  
TYPE: hazard / combine  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: `FSN-PAPER-PLAGUE/SOLO-RAT` — 1× `plague_rat` pawn (`starter-poison` + `spell-venom-strike` at band 1) + 1× `bone_scribe` bishop (`spell-weaken` only).  
AI_REQUIREMENTS: Rat applies and leaves (do not camp the only exit). Scribe stays at range 3–4; skip recast of an already-active Weaken. No Inferno. No Glass Realm (DoT + double damage is a sponge).  
SPELL_DISCOVERY_OPPORTUNITIES: Observing `spell-weaken` or `spell-venom-strike` can drop that id if missing.  
MAP_REQUIREMENTS: Arena plus two `WF-ENV-GUTTER_STEAM` vents (jet on even rounds, 4% max-HP tax). A floor path around both vents. Optional leftover 2 salt tiles from ENC-HAZ-05 (`inheritHazardsFrom: ENC-HAZ-05`).  
SPECIAL_RULES: Scripted hazards only. Rats start ≥ Chebyshev 4 from the scribe. Vents never include spawn or exit.  
OBJECTIVE: Clear all. Intended line: kill the rat before a second venom stack, cross vents on odd rounds.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + poison/weaken discovery. Overlay `no_healing` is fair (DoT is the tax).  
TACTICAL_PURPOSE: Combine paper-plague stacking with an even/odd floor tax so “stand still and trade” is the wrong answer.  
SOLVABILITY_REQUIREMENTS: Path around vents; 2-unit occupancy leaves walk-offs; vents count as 2 toward the hazard cap.  
REPLAYABILITY: Vents N-S vs E-W. Full `FSN-PAPER-PLAGUE` (two rats) at high band.  
SCALING_BEHAVIOUR: High: scribe gains `spell-expose`. Peak: add a second rat (`FSN-PAPER-PLAGUE` CELL), still no Inferno, still no Glass Realm.  
STATUS: PROPOSED

---

### ENC-WAVE-04

ENCOUNTER_ID: ENC-WAVE-04  
TYPE: waves  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: Wave 1: `FSN-HEX-BLOOD` (buffer king `spell-enrage` + `spell-haste` on a bruiser pawn; **no** heal, drain, or rallying-cry). Wave 2: `FSN-GLASS-WARD` (warden rook + sniper bishop, frost at minRange-feel; warden `starter-shield` at band 1). Wave 3: leftover bruiser **or** leftover sniper, never both. Never more than 4 living hostiles. Band 0: do **not** spawn HEX-BLOOD (Enrage is not on default kits) — substitute 2× pawn + 1× rook.  
AI_REQUIREMENTS: Wave 1: buffer spends Enrage on the bruiser, not self (`AI-ROL-05` / ally-first). Until ally-buff apply is honest, wave 1 is 2× pawn + 1× rook camping a choke. Wave 2: warden interposes; sniper refuses dest Chebyshev ≤ 2. Wave 3 leftover is greedy.  
SPELL_DISCOVERY_OPPORTUNITIES: Wave 1 buffer may reveal `spell-enrage` or `spell-haste` if used and the player wins. Wave 2 sniper can complete frost observation.  
MAP_REQUIREMENTS: Fortress lane + **one side aisle** (`FSN-GLASS-WARD` contract). `waveSpawnCells` in the far lane. Optional `paper_windstorm` inherited from ENC-TEACH-03 (`inheritModifierFrom: ENC-TEACH-03`) so closing the sniper is the same verb.  
SPECIAL_RULES: Portal locked until wave 3 is clear. Next wave at the start of the enemy phase after the previous wave is dead. Occupied `waveSpawnCells` spill to nearest free reachable floor. If a wave cannot place any unit, skip and log — never soft-lock. Random 30% family lottery is **off**.  
OBJECTIVE: Survive and clear all three waves.  
FAILURE_CONDITION: Player death.  
REWARD: Victory XP counts all defeated levels + depth Doka. Overlay `under_10_turns` is tight on purpose.  
TACTICAL_PURPOSE: Named drop-2 pairs as wave verbs — buff window, then min-range gun — without a level ramp.  
SOLVABILITY_REQUIREMENTS: `waveSpawnCells` ⊆ reachable floor. Side aisle reaches the sniper. Cap 4 living so later summons are not starved.  
REPLAYABILITY: Wave 2 can swap to `FSN-WARD-MEND` if the player already answered GLASS-WARD this account.  
SCALING_BEHAVIOUR: High: wave 3 leftover is `FSN-HEX-BLOOD/E-RAGE` (elite bruiser, still no Sacrifice). Peak: wave 2 sniper is `FSN-GLASS-WARD/E-SHOT` (still no Mark on PAIR). No extra HP.  
STATUS: PROPOSED

---

### ENC-AMBUSH-03

ENCOUNTER_ID: ENC-AMBUSH-03  
TYPE: ambush  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: Visible bait: 1× `WF-HAZ-HUNT_LANTERN` orb (not a combatant — round-start 1-tile step toward the last unit that spent MP) + 1× wounded-looking pawn. Hidden until trigger: `FSN-VEIL-HEX` lite — 1× `ROLE-LURKER` knight (`physical_attack` + `spell-shadow-veil`) + 1× buffer king (`spell-enrage` only, no heal).  
AI_REQUIREMENTS: Bait pawn plays cowardly (retreats at 50% HP). Lurker prefers isolated player (no summon) and skips a frontal if soph ≥ 3. Buffer Enrages the lurker after the ambush fires. Lantern is not an AI actor.  
SPELL_DISCOVERY_OPPORTUNITIES: Observing `spell-shadow-veil` can later offer that id at rest if missing.  
MAP_REQUIREMENTS: Arena with a lantern start cell and a painted facing chevron. `ambushCells` behind a wall hook **or** `fog_of_war`. Trigger: player spends MP (lantern steps) **or** bait drops below 50% HP **or** the player crosses the midline.  
SPECIAL_RULES: Ambush units do not exist in the combatant store until trigger (portal locked because bait is alive). Lantern tax is 5% max HP via challenge HP; it never starts on spawn/portal. Soft: killing the bait with overkill still fires the ambush. Intent log: explicit `ambush: lantern`.  
OBJECTIVE: Defeat bait + ambushers. Lantern remaining after clear is floor (despawn).  
FAILURE_CONDITION: Player death.  
REWARD: Standard + bonus Doka if the player never spent MP before the midline (stood still so the lantern did not hunt). Credit through `applyRewards`.  
TACTICAL_PURPOSE: Punish panic-dashing; teach that MP spend can *call* a hunt. Distinct from ENC-AMBUSH-02’s glyph plate.  
SOLVABILITY_REQUIREMENTS: `ambushCells` reachable after spawn; lantern path around exists; bait cannot spawn on the portal.  
REPLAYABILITY: Hook left/right. Buffer can be omitted at low band (lurker only).  
SCALING_BEHAVIOUR: High: full `FSN-VEIL-HEX` (optional tide-shade). Peak: lantern + one `WF-HAZ-CREEP_MIST` tile on a **flank** lane, not the only path.  
STATUS: PROPOSED

---

### ENC-REINF-03

ENCOUNTER_ID: ENC-REINF-03  
TYPE: reinforcements  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: `FSN-KENNEL-LITANY` lite — 1× summoner king (`isSummoner`, `summon-dire-wolf` **or** `summon-archer`, not both) + 1× support with `starter-shield` only (not `starter-heal` if that would steal healer inference from a buffer you still need — this support **is** a shield bot). On each successful summon, no extra trash. If the summoner is marked/exposed, a 1-pawn reinforcement spawns on `reinfCells` (cap 1 extra, hard-cap 4 living including summons). Summon cap 2.  
AI_REQUIREMENTS: Summoner on cooldown 2; skip summon if cap or no free floor (`decideSummonerAction` already skips — do not invent frost fall-through). Shield bot keeps the summoner up. Pawns screen. Enemies snipe player wisps (`ENEMY_THREAT_VALUES.wisp`). If the summoner dies, living enemy summons despawn at end of turn (explicit).  
SPELL_DISCOVERY_OPPORTUNITIES: `summon-dire-wolf` / `summon-archer` if missing. Sibling `spell-sever-tether` (if that catalog lands) is the intended drop for accounts that already own both summons.  
MAP_REQUIREMENTS: Two-depth backline + screen line. No void on summon spawn cells. `reinfCells` adjacent to the king, reachable floor.  
SPECIAL_RULES: Reinforcement trigger is `onSummonerExposed` (explicit), not on-death (that is ENC-REINF-02). If living + pending would exceed 4, skip further spawns. Portal locked until the board is empty.  
OBJECTIVE: Clear all. Implicit priority: summoner.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + priority bonus if no pawn reinforcement ever spawned.  
TACTICAL_PURPOSE: Kennel as a room — cap-2 pets plus a visible extra pawn only if you let the king get marked. Distinct from ENC-REINF-01 (rally) and ENC-REINF-02 (larva death).  
SOLVABILITY_REQUIREMENTS: Backline reachable; summons spawn on free reachable floor only; `reinfCells` never on the portal.  
REPLAYABILITY: Wolf vs archer kit. High band may use `FSN-PACK-PINCER` lite (summoner + assassin knight + tank) still capped.  
SCALING_BEHAVIOUR: Support gains `spell-iron-skin` (on the wolves) before the summoner gains a third spell. Cap stays 2.  
STATUS: PROPOSED

---

### ENC-SURV-05

ENCOUNTER_ID: ENC-SURV-05  
TYPE: survival / hazard  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: Start: 2× pawn + 1× `tide_shade` bishop. Every 3 enemy-team turns, spawn 1 from {pawn, knight lurker, paper-rat} until the clock ends. Max 4 living.  
AI_REQUIREMENTS: Casters hold LoS. Lurkers prefer the **next** ash cell so the player is punished for chasing. Group tactics if soph ≥ 4.  
SPELL_DISCOVERY_OPPORTUNITIES: Survive 8 turns without `spell-timestep` → rest shrine may offer timestep (reminder, not a free grant).  
MAP_REQUIREMENTS: Arena. Safe core of 5 tiles. A 3-tile `WF-HAZ-CREEP_MIST` lane on one painted edge (advances one tile at round start; ending a turn inside costs 6% max HP). Optional `swift_winds` so kiting is possible. Parallel floor path remains.  
SPECIAL_RULES: Clock `surviveTurns: 10` player-turns. When it hits 0, remnants flee to the edge and despawn (not player kills). Portal unlocks only after the board is empty. Ash never covers the core, spawn, or exit; if a step would fail solvability, skip that advance and log.  
OBJECTIVE: Be alive after 10 player turns, then clear or let remnants flee.  
FAILURE_CONDITION: Player death before clock + cleanup.  
REWARD: Survival table (depth × 50 Doka + 100 XP) plus kill XP only for units actually defeated. Prefer overlay `no_healing` over `no_damage_taken`.  
TACTICAL_PURPOSE: Pressure beat — a **moving** tax lane, not a shrinking void (ENC-SURV-03) and not a static hazard ring (ENC-SURV-01).  
SOLVABILITY_REQUIREMENTS: Core always reachable; flee-edge tiles exist; hazard count ≤ 50; never convert the exit cell to ash.  
REPLAYABILITY: Lane N vs E. Opener caster tide-shade vs bone_scribe.  
SCALING_BEHAVIOUR: Mid uses only pawns in the pool and a slower ash (every 2 rounds). High unlocks the lurker. Peak unlocks the paper-rat. Never shorten the clock below 8.  
STATUS: PROPOSED

---

### ENC-ELITE-04

ENCOUNTER_ID: ENC-ELITE-04  
TYPE: elite / formation  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: Named pack `FSN-HEX-BLOOD/E-RAGE` — elite `ROLE-BRUISER` (`variant: elite`, Strike + Enrage received) + junior `ROLE-BUFFER` king (Enrage + Haste only). Elite is not a boss: no phase table, no `BossAbility`. `spell-sacrifice` off. `aiStrategy: "berserk"` only below 30% HP.  
AI_REQUIREMENTS: Buffer ally-first. Bruiser charger (pawn) or flanker (`/KNIGHT`). Soph 1–3. No group-tactics required. Until ally-buff apply is honest, do **not** ship this id — fall back to ENC-ELITE-01.  
SPELL_DISCOVERY_OPPORTUNITIES: Buffer death after it used `spell-enrage` can drop that id (once per character).  
MAP_REQUIREMENTS: `openField` or `arena`. Buffer needs a tile at range 3 from the bruiser that is **not** the player’s only exit. Reject a 1-tile tunnel.  
SPECIAL_RULES: Random 30% family lottery is **off**. Only one elite. Do not inflate elite HP beyond band pawn/knight + one Enrage cycle.  
OBJECTIVE: Defeat the elite. Buffer optional but intended.  
FAILURE_CONDITION: Player death.  
REWARD: 2× victory XP for the elite only + depth Doka. Overlay `under_8_ap_per_turn` (don’t dump into the Enrage window).  
TACTICAL_PURPOSE: Mastery of “kill the glass buffer; the bruiser without Enrage is a fat Strike.” Consumes a real drop-2 PAIR.  
SOLVABILITY_REQUIREMENTS: Engagement pocket ≥ 2 walk-off tiles. Hostiles start ≥ Chebyshev 4 from the player.  
REPLAYABILITY: `/KNIGHT` vs pawn bruiser.  
SCALING_BEHAVIOUR: Add Haste uptime on the bruiser before any HP bump. Peak: bruiser may berserk below 30% — still no Sacrifice on PAIR.  
STATUS: PROPOSED

---

### ENC-ELITE-05

ENCOUNTER_ID: ENC-ELITE-05  
TYPE: elite / formation  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: Named pack `FSN-GLASS-WARD/E-SHOT` — elite sniper bishop (`variant: elite`, frost; Mark stays **off** this PAIR) + junior warden rook (`starter-shield` at band 1).  
AI_REQUIREMENTS: Warden interposes (`AI_BACKLINE_GUARD_DISTANCE` 1). Sniper holds Chebyshev ≥ 3 and never Nova. If the player enters 2, sniper steps away. Soph 1–3.  
SPELL_DISCOVERY_OPPORTUNITIES: Sniper death after it used frost can complete frost observation. Sibling `spell-glass-shot` (if that catalog lands) is the intended **next** drop — not a live `spellData.ts` id until then.  
MAP_REQUIREMENTS: Fortress or openField with **main lane plus one side aisle**. Reject a single-tile tunnel. No lava on the only approach. Optional inherited `paper_windstorm` (closing is still the answer).  
SPECIAL_RULES: Random 30% lottery off. Only one elite. If pack size would be 1, reroll (sniper must not spawn solo).  
OBJECTIVE: Defeat both. Intended line: aisle → sniper first.  
FAILURE_CONDITION: Player death.  
REWARD: Elite multiplier on the sniper only + standard rook XP. Overlay `under_15_turns` (not `direct_hit` — this is a lane fight).  
TACTICAL_PURPOSE: Min-range gun behind a door. Distinct from ENC-ELITE-03 (`FSN-IRON-BATTERY` fat artillery).  
SOLVABILITY_REQUIREMENTS: Side aisle reaches the sniper. Two walk-offs in the engagement pocket.  
REPLAYABILITY: `/GOLEM` warden (live `iron_golem`) vs leash_warden presentation.  
SCALING_BEHAVIOUR: Promote Mark only by converting to ENC-RARE-03 (`FSN-BROKEN-GLASS`), never on this PAIR.  
STATUS: PROPOSED

---

### ENC-PROT-03

ENCOUNTER_ID: ENC-PROT-03  
TYPE: protection objective  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: 2× charger pawn + 1× bishop focusing the **ward circle**.  
AI_REQUIREMENTS: All enemies prefer occupying `WF-ZON-WARD_CIRCLE` (`objectiveCell` / `protectTargetId` override) so they gain the +20% RES standing-zone. Lethal lookahead against a player standing on the ring. They do not retreat from the ring.  
SPELL_DISCOVERY_OPPORTUNITIES: If the player held the ring for ≥ 4 player-turns and used `starter-shield` or `summon-sentinel`, rest may offer `summon-sentinel` if missing.  
MAP_REQUIREMENTS: Central gold ring inlay (`WF-ZON-WARD_CIRCLE`, one walkable cell). Player spawns adjacent. Enemies from the far end + one side alley. No hazard on the ring.  
SPECIAL_RULES: The ring is a tile, not an allied token (distinct from ENC-PROT-01 walking ward and ENC-PROT-02 shrine HP). Portal unlocks when hostiles are dead. The player does **not** fail if they never stand on the ring — holding it is the intended line (RES while contesting). Optional fail-if-enemy-held-4-turns is **off** unless a later human asks (that would clone ENC-HOLD-01).  
OBJECTIVE: Clear hostiles. Intended: occupy the ring so melee hits you through RES, or pull the fight off it and deny the bishop the tile.  
FAILURE_CONDITION: Player death only.  
REWARD: Protection-adjacent grant (band table) + kill XP. Overlay `direct_hit` (stay on the ring).  
TACTICAL_PURPOSE: Contest a **buff tile**, not an escort HP pool. Makes body-blocks and summons matter as occupancy.  
SOLVABILITY_REQUIREMENTS: Alley does not spawn on the ring. Ring not on spawn±3 or portal. If any hazard exists, it is not adjacent to the ring.  
REPLAYABILITY: Alley left/right. Bishop frost vs weaken.  
SCALING_BEHAVIOUR: Add a second alley flanker before raising ATK. Peak: `mending_mist` on so whoever holds the ring also regen-races (still not a fail if you refuse the tile).  
STATUS: PROPOSED

---

### ENC-PRIO-04

ENCOUNTER_ID: ENC-PRIO-04  
TYPE: priority-target / decoy  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: 1× “visible king” (`eternal_pawn_king` **presentation only** — chess king chassis, kit `starter-frost` + `spell-iron-skin`, **not** in `BOSS_IDS` this room) + 1× “quiet pawn” (`final_pawn` presentation, pawn chassis, kit `physical_attack` + `starter-heal` self). 1× rook screen. Explicit metadata `decoyId` / `realId` — never name checks.  
AI_REQUIREMENTS: Visible king plays leader (backline, frost). Quiet pawn plays cowardly until the king drops below 50% HP, then becomes a charger. Screen guards the **pawn** (`AI_BACKLINE_PROTECT` on `realId`), not the king.  
SPELL_DISCOVERY_OPPORTUNITIES: Killing the quiet pawn first (the real threat) can drop `spell-expose` if missing.  
MAP_REQUIREMENTS: Throne dais (king) + side stall (pawn) + screen line. Stall must be reachable without walking the dais.  
SPECIAL_RULES: If the king dies first, the pawn gains `spell-enrage` (one cycle) — telegraph in the intent log (`decoyFallen`). If the pawn dies first, the king flees to the edge and despawns (cleanup). Portal locked until the **real** id is dead and remnants are gone. This is **not** `BOSS_RUSH_ROOMS[6]`.  
OBJECTIVE: Defeat the real target (the quiet pawn). The king is a legal kill but the wrong line.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + priority bonus if the pawn died before the king. Overlay `under_15_turns` rewards reading the screen.  
TACTICAL_PURPOSE: Teach Rush room 6’s decoy verb (“the loud king is the fake”) without a dual-boss state machine.  
SOLVABILITY_REQUIREMENTS: Stall reachable; pawn cannot spawn on the portal; screen does not seal the stall.  
REPLAYABILITY: Stall west vs east. Screen can be two pawns at high band (still cap 4).  
SCALING_BEHAVIOUR: High: pawn also has `spell-shadow-veil`. Peak: king gains one frost-nova **only if** a tile outside radius 2 exists. No HP inflation.  
STATUS: PROPOSED

---

### ENC-PRIO-05

ENCOUNTER_ID: ENC-PRIO-05  
TYPE: priority-target / formation  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: `FSN-QUIET-CHOIR` — `ROLE-CANTOR` queen (`starter-heal` self + `starter-shield` ally, **no** Inferno) + `ROLE-BUFFER` king (Enrage / Haste / Iron Skin, **no** healAmount) + `ROLE-WARDEN` rook.  
AI_REQUIREMENTS: Cantor self-heals at 50%. Buffer spends Enrage on the warden. Warden camps a wide choke if a side aisle exists. If the cantor dies, buffer **holds** (no invented nuke). Soph 4–6. `groupTactics` on.  
SPELL_DISCOVERY_OPPORTUNITIES: `starter-shield` / `spell-iron-skin` / sibling `spell-choir-hymn` if that catalog lands.  
MAP_REQUIREMENTS: Chapel nave + two stalls. Side aisle required. No lava. Optional `mending_mist` **off** (would hide Blood Mend).  
SPECIAL_RULES: Unlock after ENC-ELITE-04 **or** ENC-WAVE-04 so the player has seen a buffer pair. At most one cantor. Leader boost (10% per fallen non-leader) from CADRE — the player can cut the cantor first.  
OBJECTIVE: Clear all. Intended order: cantor, then buffer, then warden.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + “silence the choir” Doka if cantor dies first.  
TACTICAL_PURPOSE: Combine taught HEX-BLOOD (buffer) with a self-heal cantor so the question is “who is the sustain.” Prepares ENC-RUSH-10’s rage-on-half-death (killing one support enrages the rest — here the remaining kit does **not** rage; the Rush variant will).  
SOLVABILITY_REQUIREMENTS: Stalls connected; warden cannot seal the nave; 3-unit occupancy leaves walk-offs.  
REPLAYABILITY: Warden live `iron_golem` vs leash_warden.  
SCALING_BEHAVIOUR: Peak: convert to `FSN-CHORUS-THRONE` (add sniper) only if ENC-ELITE-05 was answered this account. Still one cantor.  
STATUS: PROPOSED

---

### ENC-MOVE-04

ENCOUNTER_ID: ENC-MOVE-04  
TYPE: movement objective / timing  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: 1× kiting bishop (`starter-frost`) on the **short** path behind a `WF-OBS-FALLEN_GATE` + 1× pawn on the long path.  
AI_REQUIREMENTS: Bishop holds the short path and does not walk through the portcullis while it is up. Pawn is a charger on the long path.  
SPELL_DISCOVERY_OPPORTUNITIES: Reaching the far banner **before** the gate opens (took the long path) can offer `spell-haste`. Waiting and walking the short path can offer `starter-shield` (patience). One per character, not both.  
MAP_REQUIREMENTS: Dual route. Short corridor has `WF-OBS-FALLEN_GATE` (blocks 2 rounds, then floor, painted 2→1 timer). Long route already exists (placement contract: never the only exit). Far `objectiveCell` banner. Exit locked until the player occupies the banner **and** hostiles are dead.  
SPECIAL_RULES: Gate is a wall while up (LoS + walk). Timer ticks at round end. Enemies may wait. `holdPortalLocked` until cleanup.  
OBJECTIVE: Touch the banner and clear hostiles.  
FAILURE_CONDITION: Player death only.  
REWARD: Standard + path bonus Doka if the player never stood adjacent to the gate while it was up (committed to a line).  
TACTICAL_PURPOSE: Teach “wait two rounds vs spend MP now.” Distinct from ENC-MOVE-01 lava stones and ENC-MOVE-03 dual-lane race.  
SOLVABILITY_REQUIREMENTS: Long path reachable from spawn to banner **without** the gate. Gate is not a cut-vertex. Banner not on a portal.  
REPLAYABILITY: Gate north vs east. High: replace gate with `WF-OBS-TIDE_DOOR` (odd shut / even open) as ENC-MOVE-05.  
SCALING_BEHAVIOUR: High: bishop also has slow. Peak: one `WF-MOD-CROSSWIND` chevron on the long path (slide tax, not a wall).  
STATUS: PROPOSED

---

### ENC-MOVE-05

ENCOUNTER_ID: ENC-MOVE-05  
TYPE: movement objective / hazard  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: 2× kiting `tide_shade` bishops (`starter-frost` + `spell-slow` at band 1). 0 melee on entry.  
AI_REQUIREMENTS: Bishops hold the far third. They do not cross the tide door while it is shut.  
SPELL_DISCOVERY_OPPORTUNITIES: Using `WF-TEL-SLIPSTREAM` at least once and winning can offer `spell-swap` if missing (the pad is the teacher).  
MAP_REQUIREMENTS: `WF-OBS-TIDE_DOOR` on the short corridor (wall on odd rounds, floor on even). Always-open long path. One-way `WF-TEL-SLIPSTREAM` A→B that skips the door if dest is legal. Far banner `objectiveCell`.  
SPECIAL_RULES: Player must occupy the banner at least once (`touchedObjective`). Slipstream dest must be free, non-hazard, non-portal, with two walk-offs. Illegal dest = no swap, spend nothing.  
OBJECTIVE: Tag the banner and clear the bishops.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + discovery. Overlay `under_50_damage`.  
TACTICAL_PURPOSE: Combine timing door with a one-way skip so MP is a third option (wait / walk long / slip).  
SOLVABILITY_REQUIREMENTS: Long path works with the door permanently shut. A and B reachable floor, not spawn/portals. Bishops reachable by frost from the banner.  
REPLAYABILITY: Door H vs V. Slipstream A on spawn-side vs mid.  
SCALING_BEHAVIOUR: Add a third bishop or poison, not a second door. Peak: B sits adjacent to a `WF-ENV-GUTTER_STEAM` vent (choice of pain on even).  
STATUS: PROPOSED

---

### ENC-FUSE-01

ENCOUNTER_ID: ENC-FUSE-01  
TYPE: hazard / displacement / elite-adjacent  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: `FSN-HOOK-FUSE` — `ROLE-PULLER` knight (`spell-swap` + `starter-frost` if Swap apply is live; else frost + slow only) + `ROLE-KAMIKAZE` pawn (`spell-inferno`, bomber profile) + optional third pawn so the martyr can legally see 2 targets.  
AI_REQUIREMENTS: Puller Swap dest must be free, non-lava, non-void, non-portal, with a walk-off, preferably Chebyshev 2–3 from the martyr. Martyr holds Inferno until `AI_KAMIKAZE_MIN_TARGETS` **or** HP ≤ 30%. **Do not** set `aiStrategy: "berserk"` on the martyr. Soph 3–4. Until Swap apply is honest, puller uses frost only and the room still teaches fuse spacing.  
SPELL_DISCOVERY_OPPORTUNITIES: Observing Inferno detonate **or** a legal Swap can drop `spell-inferno` (if missing and enemy-legal) or `spell-swap`. Sibling `spell-martyr-fuse` / `spell-hook-line` if those catalogs land — not live ids.  
MAP_REQUIREMENTS: `arena` or `openField` with ≥ 8 free floor cells. Reject `corridorMaze`. One optional lava tile on a **flank**, never on both approaches.  
SPECIAL_RULES: At most one martyr. If the optional pawn is absent, the martyr must not detonate on the player alone unless low HP. Friendly-fire weight should cancel a detonate that also hits the puller.  
OBJECTIVE: Clear all. Intended line: snipe the glass martyr first.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + displacement / fuse discovery. Overlay `under_8_ap_per_turn`.  
TACTICAL_PURPOSE: Patient bomber + pull. Prepares `FSN-ASH-COURT` and teaches kamikaze honesty.  
SOLVABILITY_REQUIREMENTS: Walk-off after every legal Swap dest. Martyr cannot spawn adjacent to the player (`MIN_CHEBYSHEV`). 3-unit occupancy leaves an exit.  
REPLAYABILITY: `/SOLO` (no extra pawn) vs `/EMBER` (hazard knight, no detonate) if bomber-on-enemy is not ready.  
SCALING_BEHAVIOUR: Unlock real Swap on the puller only after apply exists. Peak: convert to `FSN-ASH-COURT/NO-FUSE` (ember + glyph) if the chain already taught fuse.  
STATUS: PROPOSED

---

### ENC-NULL-01

ENCOUNTER_ID: ENC-NULL-01  
TYPE: priority-target / anti-summon  
RELATIVE_DIFFICULTY: MID  
ENEMY_COMPOSITION: `FSN-NULL-WALL` — `ROLE-ANTI-SUMMON` bishop (`spell-weaken` + `spell-expose`; cursed-wound is CADRE only) + `ROLE-TANK` rook (`physical_attack` + `spell-iron-skin`).  
AI_REQUIREMENTS: Censor focuses the highest-threat player-side summon if one exists (`isSummon`), else the player. Golem walks up; `chokepointCamp` only if soph ≥ 3 **and** a side aisle exists. Soph 2–3.  
SPELL_DISCOVERY_OPPORTUNITIES: `spell-weaken` / `spell-expose`. Sibling `spell-null-brand` / `spell-sever-tether` if those catalogs land. Weight this room ×2 if the player has a summon **equipped** (build, not level) — still valid without pets.  
MAP_REQUIREMENTS: `openField` or fortress courtyard. Censor needs LoS to the backline **and** a retreat tile. No sealed alcove. Optional modifier `null_field` **off** on CELL (would suppress Weaken/Expose and erase the lesson).  
SPECIAL_RULES: Random 30% lottery off. No drain on the censor. No Inferno. If the player brought no pets, this is a softer iron-battery (debuff bishop + golem) — that is fine.  
OBJECTIVE: Clear. Intended: delete the censor if a pet is down; walk around the golem.  
FAILURE_CONDITION: Player death.  
REWARD: Standard + anti-summon discovery. Overlay `under_15_turns`.  
TACTICAL_PURPOSE: Anti-pet exam. Distinct from ENC-PRIO-03 (kill the summoner so wolves despawn) — here the censor **hunts the pet** while a tank ignores chips.  
SOLVABILITY_REQUIREMENTS: Courtyard walk-offs; censor not trapped; golem not on the portal.  
REPLAYABILITY: `/SCRIBE` live `bone_scribe` vs proposed `null_censor`.  
SCALING_BEHAVIOUR: High: golem is elite (`variant: elite`) still without Inferno. Peak: convert to `FSN-NULL-BROOD` only after ENC-REINF-03 (brood + censor + golem, summon cap 2).  
STATUS: PROPOSED

---

### ENC-DUEL-01

ENCOUNTER_ID: ENC-DUEL-01  
TYPE: elite / optional challenge / duel  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: `WF-INV-DUELIST_CIRCLE` as a **scripted dungeon room** — 2× same-band elites (hard threat presentation): one `FSN-HEX-BLOOD` bruiser elite + one `FSN-GLASS-WARD` sniper elite. They do **not** world-attrition inside a run (the overworld 8% wander drain is exploration-only). Both stand on a painted ring.  
AI_REQUIREMENTS: Bruiser charger; sniper min-range kite. They do **not** heal each other. If one dies, the survivor gains one Enrage cycle (`onAllyDeath: enrage`, explicit — teach ENC-RUSH-10’s half-death rage without Twin Monarchs).  
SPELL_DISCOVERY_OPPORTUNITIES: Winner-of-two can drop `spell-enrage` or frost, whichever the survivor used.  
MAP_REQUIREMENTS: Painted ring, 6–8 floor tiles. Exit reachable without entering the ring **in exploration**; in a dungeon-chain both count as hostiles for map-clear (must fight). Ring not on spawn/portal.  
SPECIAL_RULES: In a run, contact is immediate combat at full HP (no wait-for-attrition cheese). Victory pays hard-band Doka. Cap 2 living elites + 0 trash. Portal locked until both are dead.  
OBJECTIVE: Defeat both elites.  
FAILURE_CONDITION: Player death.  
REWARD: Hard-band depth Doka + elite XP on both. Overlay `under_8_ap_per_turn`.  
TACTICAL_PURPOSE: Two different taught elites at once — buff melee vs min-range gun — and a readable rage-on-death. Pressure beat that is not a clock.  
SOLVABILITY_REQUIREMENTS: Ring floor; 2 elites start ≥ Chebyshev 4 from the player and from each other; walk-offs exist.  
REPLAYABILITY: Bruiser/sniper vs lurker/censor pair for Null-branch accounts.  
SCALING_BEHAVIOUR: Do not add a third elite. Peak: survivor also gains Haste (one turn), not HP.  
STATUS: PROPOSED

---

### ENC-RARE-03

ENCOUNTER_ID: ENC-RARE-03  
TYPE: rare elite room  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Full `FSN-BROKEN-GLASS` (sniper + void_mirror holder + rust_reaver closer) **or**, if the account has not answered ENC-ELITE-05, `FSN-CHORUS-THRONE` lite (cantor + sniper + warden). Rare elite tag on the sniper only (`variant: rare_elite`).  
AI_REQUIREMENTS: CADRE/COURT contracts. `escapeRoute` on the rare elite. `instantKill` / `betrayal` off. Lethal lookahead on. Reaver Swap-in only if Chebyshev ≥ 3 and dest is legal (player lands on the reaver’s origin — that tile must be safe). Mirror has **no** Swap.  
SPELL_DISCOVERY_OPPORTUNITIES: Guaranteed one rare drop from {`spell-mark`, `spell-shadow-veil`, `spell-haste`, `spell-enrage`} not yet owned. Sibling `spell-glass-shot` if that catalog lands.  
MAP_REQUIREMENTS: Fortress courtyard + gallery, or chessboard with two files. Insertion chance: 8% on mastery beats, never on teach. At most once per dungeon-chain.  
SPECIAL_RULES: Death is a normal death (full penalty). Do not pair with ENC-TREAS-03 by default. Purple portal chrome only after clear. No Inferno on this sheet.  
OBJECTIVE: Defeat the rare elite (supports recommended).  
FAILURE_CONDITION: Player death.  
REWARD: Rare Doka band (≈ 2.5× depth victory) + the spell drop.  
TACTICAL_PURPOSE: Optional peak that consumes Broken Glass / Chorus the primer already taught.  
SOLVABILITY_REQUIREMENTS: Two files; elite cannot spawn in a pocket; Swap-in dest legal if used.  
REPLAYABILITY: BROKEN-GLASS vs CHORUS-THRONE by which PAIR the account answered.  
SCALING_BEHAVIOUR: Do not add a second rare elite. Scale closer Haste uptime and sniper Mark, not HP.  
STATUS: PROPOSED

---

### ENC-TREAS-03

ENCOUNTER_ID: ENC-TREAS-03  
TYPE: treasure / risk  
RELATIVE_DIFFICULTY: HIGH (opt-in)  
ENEMY_COMPOSITION: Empty on entry. Three **devices**, not three chests (distinct from ENC-TREAS-02):

| Device | Commit | Previewed reward |
| :--- | :--- | :--- |
| `WF-TRS-SEALED_URN` | 1 AP: 70% medium Doka, 30% 6% max-HP tax and no grant. No fight. | Medium `applyRewards` **or** tax |
| `WF-RSK-SCOURGE_COMPACT` | Flag: +10% incoming (post-formula) this map, next credit uses hard multiplier | Hard victory purse if you then take a fight |
| Fever seal | Turns on live `doka_fever` (enemies +25% HP, Doka ×2) and spawns `FSN-HEX-BLOOD` | Depth Doka ×2 (still clamped) + Enrage observation |

AI_REQUIREMENTS: Fever-seal pack uses HEX-BLOOD contracts.  
SPELL_DISCOVERY_OPPORTUNITIES: Fever-seal preview is always shown before combat.  
MAP_REQUIREMENTS: Three device tiles + a white coward exit near spawn (unlocked immediately). Progress portal locked until coward-leave **or** the committed fight is won **or** urn-only leave after the urn resolves.  
SPECIAL_RULES: Touching Fever seal locks the coward exit and the other devices. Urn can be used without locking the coward exit. Compact can be used without combat. Losing Fever is a normal death. Jackpot numbers stay inside `applyRewards`. `doka_fever` is the **opt-in sponge**; it is not applied to teach/reinforce rooms.  
OBJECTIVE: Resolve zero or more devices **or** take the coward exit. Fever commit must be won.  
FAILURE_CONDITION: Player death after Fever commit. Coward / urn-miss is success-with-less.  
REWARD: Per table. Coward: 0 extra.  
TACTICAL_PURPOSE: Choice/rest beat with **three different prices** (coin, incoming-tax, HP-sponge-for-Doka). Distinct from ENC-TREAS-01 binary vault and ENC-TREAS-02 three chests.  
SOLVABILITY_REQUIREMENTS: All devices and the coward exit reachable on entry. After Fever commit, spawn the pack on reachable cells not on the progress portal.  
REPLAYABILITY: Device positions rotate. Fever pack HEX-BLOOD vs GLASS-WARD.  
SCALING_BEHAVIOUR: Raise information (show kits) rather than HP. Never stack Fever with `titans_vigor`.  
STATUS: PROPOSED

---

### ENC-REST-03

ENCOUNTER_ID: ENC-REST-03  
TYPE: rest choice  
RELATIVE_DIFFICULTY: none (safe) — optional compact / fever shrine is HIGH  
ENEMY_COMPOSITION: None on the rest floor. `isRestMap: true`.  
AI_REQUIREMENTS: None.  
SPELL_DISCOVERY_OPPORTUNITIES: Shrine pedestals up to one owned spell and previews `upgradeSpell` cost (`spellLevelingBaseCost * 2^level`). Debit must stay `spellUpgradeUiSpend` if they buy. No free upgrades. If ENC-WAVE-04 / ENC-ELITE-04 observed Enrage/Haste, the shrine **names** the missing id (still not a grant). Optional `WF-SPL-GRIMOIRE_STALKER` is **not** spawned on rest (would start combat).  
MAP_REQUIREMENTS: Existing rest layout: open floor, exits `normal` / `dungeon` / `boss`. Optional fourth **risk** exit to ENC-TREAS-03. Optional `WF-RSK-SCOURGE_COMPACT` tile (flag next room only). Optional `WF-ZON-SECOND_WIND` (first unit to end a turn here recovers 1 AP already spent — flavor on rest is “one extra shrine tap,” still not a combat). Optional `WF-EVT-PILGRIM_BANNERS` chrome if this rest is reached from overworld (run maps still require a clear).  
SPECIAL_RULES: No encounters until a rest-exit is taken. `armDeathGuards` still applies if the player arrived from Death Realm. Compact does not start combat. `uiLayout` unchanged. After one full Rush clear, shrine can enable day-3 `rushVariant` flags (`decoy_reveal`, `half_death_rage`).  
OBJECTIVE: Choose an exit. Optional: shrine, compact, or risk door.  
FAILURE_CONDITION: None on this map.  
REWARD: None on the rest map. Compact is a modifier flag, not a Doka mint.  
TACTICAL_PURPOSE: Choice/rest beat that lets high-level players **opt into** Hex-primer risk instead of a bigger number.  
SOLVABILITY_REQUIREMENTS: All rest-exits reachable. New risk exit and compact pass punch-roster / portal reachability. Compact not on spawn or a portal.  
REPLAYABILITY: Shrine spell rotates among under-leveled bar spells. Second-wind on/off.  
SCALING_BEHAVIOUR: Rest does not scale. After depth 3, hide `normal` behind an abandon confirm.  
STATUS: PROPOSED

---

### ENC-TOLL-01

ENCOUNTER_ID: ENC-TOLL-01  
TYPE: treasure / risk / elite  
RELATIVE_DIFFICULTY: HIGH (opt-in in exploration; required in a run)  
ENEMY_COMPOSITION: 1× `WF-ELT-TOLL_KEEPER` elite rook (`spell-iron-skin` + Strike). In exploration a long path bypasses them. In dungeon / boss rush the toll HP-pay is **disabled** — they are a normal elite required for map-clear (world-dynamics contract).  
AI_REQUIREMENTS: Stationary until touched. Then charger / chokepointCamp on the short path.  
SPELL_DISCOVERY_OPPORTUNITIES: Victory can drop `spell-iron-skin` if missing.  
MAP_REQUIREMENTS: Short path with the keeper on a painted cell. Long path already exists. Place only when a second spawn→portal route exists.  
SPECIAL_RULES: Exploration: touch to fight, or pay 10% max HP once adjacent to pass without combat (challenge HP), or walk long. Dungeon-chain: must fight. Portal locked while the keeper lives in a run.  
OBJECTIVE: In a run: defeat the keeper. In exploration: pass by fight, toll, or long path.  
FAILURE_CONDITION: Player death after committing to the fight. Toll / long path is success-with-less.  
REWARD: Hard-band Doka on a fight win. Toll / long: 0 extra.  
TACTICAL_PURPOSE: “Pay, walk, or fight” as a room, not a random overworld overlay.  
SOLVABILITY_REQUIREMENTS: Long path works with the keeper treated as a wall. Keeper not on the only portal.  
REPLAYABILITY: Keeper chassis rook vs knight.  
SCALING_BEHAVIOUR: Peak: keeper is `FSN-GLASS-WARD` warden (sniper sits behind on the short path) — still one elite tag.  
STATUS: PROPOSED

---

### ENC-BRANCH-03

ENCOUNTER_ID: ENC-BRANCH-03  
TYPE: branching paths  
RELATIVE_DIFFICULTY: LOW (the choice is the content)  
ENEMY_COMPOSITION: None on the foyer.  
AI_REQUIREMENTS: None in-foyer.  
SPELL_DISCOVERY_OPPORTUNITIES: Door inscriptions preview the taught verb and one spell id the next room may drop.  
MAP_REQUIREMENTS: Foyer with four portals: Blood (vampiric / HEX-BLOOD → ENC-ELITE-04 or ENC-SPELL-05), Glass (paper_windstorm / GLASS-WARD → ENC-TEACH-03 or ENC-ELITE-05), Paper (plague / salt / PAPER-PLAGUE → ENC-HAZ-05 or ENC-HAZ-06), Null (anti-summon / fuse → ENC-NULL-01 or ENC-FUSE-01). A sealed fifth door to ENC-RARE-03 opens only if the account has cleared all four branches at least once (long-term, not this run).  
SPECIAL_RULES: Taking a door marks `branch: blood | glass | paper | null` on the dungeon snapshot (**before** `cleanupMap`). Other doors are gone for this chain. Mastery/boss later read the flag (ENC-MAST-03 / ENC-BOSS-03). Day-1 `ENC-BRANCH-01` stays two-door; day-2 `ENC-BRANCH-02` stays Ash/Ice/Void. This is the account-upgrade foyer after those three are known.  
OBJECTIVE: Pick a door.  
FAILURE_CONDITION: None in-foyer.  
REWARD: None. The chosen room pays.  
TACTICAL_PURPOSE: Four-way memory so capstones are not always Countess / Archbishop / Grandmaster.  
SOLVABILITY_REQUIREMENTS: All four doors reachable; none on spawn.  
REPLAYABILITY: Door order shuffles. Duelist door (ENC-DUEL-01) can replace Glass for accounts that already finished Glass this week.  
SCALING_BEHAVIOUR: Branches do not get harder; **destinations** scale with band.  
STATUS: PROPOSED

---

### ENC-MINI-04

ENCOUNTER_ID: ENC-MINI-04  
TYPE: mini-boss  
RELATIVE_DIFFICULTY: HIGH  
ENEMY_COMPOSITION: Hex Lieutenant — king chassis, kit from `ROLE-BUFFER` **plus** one Strike (so it is not a pure glass bot): `spell-enrage` + `spell-haste` + `physical_attack`. 1× bruiser pawn choir. Not in `BOSS_IDS`. No phase-2 table.  
AI_REQUIREMENTS: Lieutenant Enrages the choir first, then Hastes it, then Strikes only if the choir is dead. Choir is a charger. If the lieutenant would die, it tries one Enrage on self **only if** ally-buff apply allows self; otherwise it Strikes.  
SPELL_DISCOVERY_OPPORTUNITIES: `spell-enrage` drop (once) if used.  
MAP_REQUIREMENTS: Small nave + one stall. No lava. No `blood_moon` until that modifier has a real WX hook — if chrome is desired, use `vampiric_ground` **or** nothing, never both with a fuse.  
SPECIAL_RULES: At 30% HP the lieutenant gains **one** extra Haste cycle only if the chain taught HEX-BLOOD (ENC-WAVE-04 / ENC-ELITE-04). Otherwise it only Enrages the choir once. Honest to pacing.  
OBJECTIVE: Defeat the lieutenant (choir flees on death).  
FAILURE_CONDITION: Player death.  
REWARD: Mini-boss 2× XP on the lieutenant + depth Doka. Not a Boss Rush room.  
TACTICAL_PURPOSE: Blood-branch capstone-adjacent without `starved_vampire_pawn`’s feed state machine.  
SOLVABILITY_REQUIREMENTS: Stall connected to the nave.  
REPLAYABILITY: Choir sniper (frost) if Glass was taken; rat if Paper; censor if Null.  
SCALING_BEHAVIOUR: Add a second choir body before any HP bump. Peak: lieutenant kit adds `spell-iron-skin` (still no Inferno).  
STATUS: PROPOSED

---

### ENC-BOSS-03

ENCOUNTER_ID: ENC-BOSS-03  
TYPE: dungeon capstone boss  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: One real `BossId` by `branch` flag: Blood → `starved_vampire_pawn`; Glass → `mirror_sovereign`; Paper → `fetid_rook`; Null → `broodmother_rook`. If the chain taught decoy (ENC-PRIO-04) **and** Blood was not taken, Ice/Void-mixed accounts may use `eternal_pawn_king` **alone** (not the Rush pair). No dual-boss unless this is a Rush injection.  
AI_REQUIREMENTS: Existing `useBossAI` / `useBossSystem` for that id. Adds **one** pack of 2 trash in phase 1 only if the chain taught waves (ENC-WAVE-04) or fuse (ENC-FUSE-01) — trash does not receive boss heals / reflect / larva bursts.  
SPELL_DISCOVERY_OPPORTUNITIES: None new; boss kits already use catalog spells. Observation still follows the sibling pipeline if catalog ≠ ownership ever lands.  
MAP_REQUIREMENTS: Existing boss map color / portal color from `DEFAULT_BOSS_CONFIGS`. Hazard tiles from the boss ability stay capped at 50. Must remain solvable. Branch skins: Blood may add 2 `vampiric_ground` flavor tiles off the only path; Glass may inherit `paper_windstorm`; Paper may inherit 2 salt tiles; Null may inherit a wide courtyard (no sealed larva pocket).  
SPECIAL_RULES: Depth must be maxDepth. `decideDungeonChainPortal` complete + white portal after win. Do not write rewards via `updateCharacter`. Enrage overlay, if a later boss PR lands, is a turn clock — not HP.  
OBJECTIVE: Defeat the boss.  
FAILURE_CONDITION: Player death (Death Realm, chain reset via `resetRunState`).  
REWARD: Boss Doka/XP multipliers already on the config, then dungeon completion bonus `maxDepth * 50`. Recap at app root.  
TACTICAL_PURPOSE: Mastery exam: the taught verb is the boss’s main ability (feed / reflect / rot / brood).  
SOLVABILITY_REQUIREMENTS: Same as current boss rooms (preferred cells reachable).  
REPLAYABILITY: Four capstones from one four-way foyer.  
SCALING_BEHAVIOUR: Use existing phase 2 (`statMultiplier` in 1.15–1.60 per boss design bible — do not add a third phase). Trash pack size is the only dungeon-specific scaler.  
STATUS: PROPOSED

---

### ENC-SPELL-05

ENCOUNTER_ID: ENC-SPELL-05  
TYPE: spell-discovery  
RELATIVE_DIFFICULTY: TEACH  
ENEMY_COMPOSITION: 1× “chorister pawn” that only Strikes + 1× dummy king that **only** casts `spell-enrage` on the pawn (ally-first). If ally-buff apply is not live, the king camps a glyph (`discoverSpellId: spell-enrage`) and casts frost instead — the glyph is the teacher.  
AI_REQUIREMENTS: King never Enrages itself on TEACH. Pawn is generic.  
SPELL_DISCOVERY_OPPORTUNITIES: Primary: `spell-enrage`. If already owned, glyph is `spell-haste`.  
MAP_REQUIREMENTS: Single room, two pillars, optional glyph tile. No extra modifiers.  
SPECIAL_RULES: If the player already owns Enrage and Haste, convert to ENC-ELITE-04. Discovery does not auto-upgrade and does not auto-bar-insert (max 8).  
OBJECTIVE: Defeat hostiles; observing the Enrage window (or stepping the glyph) is the intended lesson.  
FAILURE_CONDITION: Player death.  
REWARD: The spell id into the owned set + tiny Doka.  
TACTICAL_PURPOSE: Teach “the king is the damage; the pawn is the fist.”  
SOLVABILITY_REQUIREMENTS: Glyph (if any) is free floor, not a portal. Two walk-offs.  
REPLAYABILITY: Which buff is missing drives the room.  
SCALING_BEHAVIOUR: Does not scale; it retires when both buffs are owned (becomes ENC-ELITE-04).  
STATUS: PROPOSED

---

### ENC-SPELL-06

ENCOUNTER_ID: ENC-SPELL-06  
TYPE: spell-discovery / teach mechanic  
RELATIVE_DIFFICULTY: LOW  
ENEMY_COMPOSITION: 1× sniper bishop that telegraphs frost down a **wide** lane (paper_windstorm on, so the first shot is short) + 1× pawn. After the first frost resolves, a **mark glyph** appears on a side tile (`discoverSpellId: spell-mark`).  
AI_REQUIREMENTS: Bishop prefers the lane. Does not walk onto the glyph. Does not recast Mark on TEACH (the glyph is the teacher).  
SPELL_DISCOVERY_OPPORTUNITIES: `spell-mark` (primary). If the player already owns Mark, glyph is `spell-expose` instead.  
MAP_REQUIREMENTS: Straight aisle + one side alcove for the glyph. `paper_windstorm` on.  
SPECIAL_RULES: First frost is the wind lesson (range halved). Glyph despawns if unused when the last enemy dies (player still wins). `usableByEnemy` stays true for Mark (live).  
OBJECTIVE: Clear. Optional: pick up the glyph and Mark the bishop before closing.  
FAILURE_CONDITION: Player death.  
REWARD: Discovery + standard.  
TACTICAL_PURPOSE: Teach Mark as a found verb on the same aisle that taught “walk closer.”  
SOLVABILITY_REQUIREMENTS: Alcove reachable; glyph not on the aisle’s only walk column.  
REPLAYABILITY: Alcove left/right.  
SCALING_BEHAVIOUR: After Mark is owned, convert to ENC-ELITE-05 (exam).  
STATUS: PROPOSED

---

### ENC-MAST-03

ENCOUNTER_ID: ENC-MAST-03  
TYPE: mastery / waves / hazard / priority  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Wave 1: 2× pawn on salt (`WF-HAZ-SALT_CRUST`). Wave 2: `FSN-HEX-BLOOD` **or** `FSN-GLASS-WARD` by `branch`. Wave 3: elite leftover (Enraged bruiser **or** E-SHOT sniper) + leftover.  
AI_REQUIREMENTS: Full sophistication allowed (lethal lookahead, overkill spill, LoS reposition, backline guard). Wave 3 elite camps the safest dry, non-vent tile.  
SPELL_DISCOVERY_OPPORTUNITIES: None — this is the exam.  
MAP_REQUIREMENTS: Combines wind aisle (TEACH-03), salt ribbon (HAZ-05), and a central ward circle (PROT-03) that is **optional** — occupying it at end of player turn grants the live +20% RES for the next enemy phase (standing-zone, not a new stat). Scripted hazards only. Branch skins: Blood adds `vampiric_ground` on a **flank** (not the only path); Glass keeps `paper_windstorm`; Paper keeps vents (HAZ-06); Null swaps salt for a wide courtyard and wave 2 becomes `FSN-NULL-WALL`.  
SPECIAL_RULES: Portal locked until wave 3 clear.  
OBJECTIVE: Clear all waves.  
FAILURE_CONDITION: Player death.  
REWARD: Mastery Doka band + standard XP. Overlay `under_8_ap_per_turn` or `direct_hit`. Avoid `under_5_turns`.  
TACTICAL_PURPOSE: Prove the player can refuse salt, close into wind, and optionally spend occupancy on the ring.  
SOLVABILITY_REQUIREMENTS: All wave-cell sets reachable; one dry path; ring not on a portal.  
REPLAYABILITY: Branch-skinned wave 2.  
SCALING_BEHAVIOUR: Change wave 3 elite’s **role** (bruiser vs sniper vs censor), not its level.  
STATUS: PROPOSED

---

### ENC-RUSH-09

ENCOUNTER_ID: ENC-RUSH-09  
TYPE: escalating Boss Rush variant  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Room 6 remix: `eternal_pawn_king` + `final_pawn` as `BOSS_RUSH_ROOMS[6]`, plus ENC-PRIO-04’s **stall chrome** (one side stall highlighted, not a new boss). Combined mechanic remains: “Final Pawn death reveals it was the real Pawn King. The visible Pawn King was the decoy all along.”  
AI_REQUIREMENTS: Existing combined mechanic. Screen trash (cap 1 pawn) guards the **Final Pawn** stall, not the visible king — only if the account learned ENC-PRIO-04 (`rushVariant: decoy_reveal`). Trash does not receive king heals.  
SPELL_DISCOVERY_OPPORTUNITIES: None (Rush is a mastery product).  
MAP_REQUIREMENTS: Current Rush preferred-cell solvability. Stall ⊆ reachable floor, not a preferred boss cell.  
SPECIAL_RULES: `rushVariant: decoy_reveal`. Persist still goes through `persistBossRushRoomClear` / `completeBossRushRoom` (client `dokaReward`/`xpReward` ignored). First Rush clear: no stall chrome (must commit to the live pair). Later clears: stall highlight.  
OBJECTIVE: Defeat both bosses.  
FAILURE_CONDITION: Player death → abort rush (`resetRunState`).  
REWARD: Existing room 6 table (2500 Doka / 1000 XP) + tiny bonus if Final Pawn died first (skill, via `applyRewards`).  
TACTICAL_PURPOSE: Escalate room 6 by teaching the decoy verb in the dungeon, then lighting the stall — not more HP.  
SOLVABILITY_REQUIREMENTS: Preferred cells + stall reachable. Hazard total ≤ 50.  
REPLAYABILITY: Stall W vs E.  
SCALING_BEHAVIOUR: Do not add a third boss. Later “endless rush” at ENC-REST-03 may add the ENC-PRIO-04 screen pawn (cap 1), never a third boss.  
STATUS: PROPOSED

---

### ENC-RUSH-10

ENCOUNTER_ID: ENC-RUSH-10  
TYPE: escalating Boss Rush variant  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Room 7 remix: `midnight_bishop` + `twin_monarchs` as `BOSS_RUSH_ROOMS[7]`. Combined mechanic remains: “White Bishop syncs with Dawn Monarch, Black Bishop with Dusk. Killing one half of either pair triggers a rage burst from the survivor.”  
AI_REQUIREMENTS: Existing combined mechanic. If the account learned ENC-DUEL-01 / ENC-PRIO-05, a **painted pair-link** (visual only) shows which half rages — no new damage formula. Optional 1× choir pawn from ENC-MINI-04 despawns when Midnight dies.  
SPELL_DISCOVERY_OPPORTUNITIES: None.  
MAP_REQUIREMENTS: Preferred cells. Pair-link overlays must not sit on portals. Choir spawn in the reachable set.  
SPECIAL_RULES: `rushVariant: half_death_rage`. Choir is not a boss and does not count toward `completeBossRushRoom` (prefer despawn).  
OBJECTIVE: Defeat both bosses; choir optional.  
FAILURE_CONDITION: Player death.  
REWARD: Existing room 7 table (3000 / 1200) + tiny bonus if the choir died before Midnight (skill).  
TACTICAL_PURPOSE: Add the rage-on-half-death readability the Hex primer taught in ENC-DUEL-01, without a third boss.  
SOLVABILITY_REQUIREMENTS: Preferred cells + choir cell reachable.  
REPLAYABILITY: Choir pawn vs warden (iron-skin) for accounts that already beat room 7 once.  
SCALING_BEHAVIOUR: Do not add a third boss. Tighten by choir iron-skin, not HP.  
STATUS: PROPOSED

---

### ENC-SURV-06

ENCOUNTER_ID: ENC-SURV-06  
TYPE: survival / optional challenge / hazard  
RELATIVE_DIFFICULTY: PEAK  
ENEMY_COMPOSITION: Clock 8. Wave A: HEX-BLOOD bruiser only (no buffer — the clock is the buffer). Wave B overlaps at turn 3: GLASS-WARD sniper (no warden). Wave C at turn 6: one elite golem. Overlap allowed; hard-cap 4 living.  
AI_REQUIREMENTS: Full gates except instantKill / betrayal. Sniper holds ≥ 3. Golem camps the last dry tile.  
SPELL_DISCOVERY_OPPORTUNITIES: Hold to last turn without Timestep → shrine reminder only.  
MAP_REQUIREMENTS: Arena + `WF-ENV-ASH_RAIN` (3% max HP if not wall-adjacent at end of turn). Skip this id on maps with no wall-adjacent floor (open arena with no shelter — world-dynamics contract). Optional one `arcane_surge` **or** `arcane_overflow` (pick one: cheaper AP vs cheaper AP + fizzle). Never both. Never `titans_vigor`.  
SPECIAL_RULES: Overlap + ash-rain shelter is the escalation vs ENC-SURV-05. Flee remnants when the clock ends.  
OBJECTIVE: Survive the clock, then clean or let flee.  
FAILURE_CONDITION: Player death.  
REWARD: Higher survival table than ENC-SURV-05.  
TACTICAL_PURPOSE: Peak pressure that spends leftover modifiers (`arcane_surge` / overflow) and ash-rain so late-game maps are not “void again” or “creep mist again.”  
SOLVABILITY_REQUIREMENTS: Shelter cells exist; 4-unit occupancy leaves a walkable ring; ash-rain never seals spawn or exit.  
REPLAYABILITY: surge vs overflow. Wave C golem vs void-mirror elite for Void-mixed accounts.  
SCALING_BEHAVIOUR: Overlap timing (wave B at 3 vs 4) is the scaler.  
STATUS: PROPOSED

---

## 5. Sample chains (composition, not code)

### Chain E — “Hex Primer” (maxDepth 5)

| Depth | Beat | ID |
| ---: | :--- | :--- |
| 1 | Teach | ENC-TEACH-03 then ENC-SPELL-05 (or ENC-SPELL-06 if Enrage already owned) |
| 2 | Reinforce | ENC-WAVE-04 |
| 3 | Combine | ENC-HAZ-05 then ENC-FUSE-01 **or** ENC-NULL-01 |
| 3 insert | Choice | ENC-BRANCH-03 → Blood/Glass/Paper/Null destinations |
| 4 | Pressure | ENC-SURV-05 **or** ENC-PROT-03 **or** ENC-DUEL-01 **or** skip via ENC-REST-03 |
| 4 | Mastery | ENC-MAST-03 (branch skin) |
| 5 | Boss | ENC-BOSS-03 |

Rare: 8% on depth 4 to **insert** ENC-RARE-03 before mastery.  
Treasure: rest may offer ENC-TREAS-03 instead of PROT-03.  
Decoy side-story: replace combine with ENC-PRIO-04 and mini-boss ENC-MINI-04; capstone may become `eternal_pawn_king` if Blood was not the door.

### Chain F — “Gate Primer” (maxDepth 4)

ENC-MOVE-04 → ENC-MOVE-05 → ENC-TOLL-01 → ENC-REST-03 → ENC-BOSS-03 (`mirror_sovereign` only if Glass was the remembered branch; default still reads `branch` from a prior foyer). Prefer inserting ENC-MOVE-04 as teach on accounts that already know salt/wind.

### Rush injection (day-3)

After one full Rush clear, ENC-REST-03 shrine can enable: room 6 → ENC-RUSH-09, room 7 → ENC-RUSH-10. Day-1 flags for rooms 0 / 3 / 9 and day-2 flags for rooms 1 / 2 / 4 / 5 / 8 remain.

---

## 6. Optional challenge overlay

Existing `ChallengeCondition` values only. Do not invent predicates until a human asks.

| Encounter | Suggested overlay |
| :--- | :--- |
| ENC-TEACH-03, ENC-SPELL-05, ENC-SPELL-06 | `under_15_turns` / `under_50_damage` |
| ENC-HAZ-05 | `under_50_damage` |
| ENC-HAZ-06 | `no_healing` |
| ENC-WAVE-04 | `under_10_turns` |
| ENC-PROT-03, ENC-MAST-03 | `direct_hit` |
| ENC-ELITE-04, ENC-ELITE-05, ENC-FUSE-01, ENC-DUEL-01 | `under_8_ap_per_turn` |
| ENC-SURV-05, ENC-SURV-06 | `no_healing` (not `no_damage_taken`) |
| ENC-MOVE-04, ENC-MOVE-05 | `under_50_damage` |
| ENC-TREAS-03 / ENC-REST-03 compact / ENC-TOLL-01 | no overlay (the risk *is* the challenge) |

All overlay Doka/XP still go through `liveBattleChallengePersistEntries` → `applyRewards`.

---

## 7. Scaling tables (no level-only ramps)

| Band | Composition | AI | Kits / families | Hazards / modifiers | Objectives |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TEACH | 2 roles, one verb | no lookahead | zone 0, no family | `paper_windstorm` or 4 salt tiles | kill |
| LOW | +1 family role | LoS reposition | zone 0–1 | salt **or** vents | kill + optional glyph |
| MID | named drop-2 `FSN-*` or waves | backline guard | zone 1 + Enrage/Shield | one `WF-*` | clock / tags / gate |
| HIGH | elite or duel | lethal lookahead | zone 1–2 + elite tag | two taxes | protect / fuse / decoy |
| PEAK | overlap or boss | full gates except 9/10 | CADRE / rare | branch-skinned | mastery / rush 6–7 |

If a live player is over-levelled for a band, **promote the band’s verb** (add a role, enable a kit spell, inherit wind, open a second aisle) rather than multiplying enemy HP. Do not attach `titans_vigor`. `doka_fever` stays opt-in treasure.

---

## 8. Explicit metadata sketch (for a later implementer)

Not production code. Compose day-1/day-2 fields plus:

```
encounterId
encounterType        // + duel | fuse | anti_summon | decoy | toll
formationId?         // FSN-HEX-BLOOD | FSN-GLASS-WARD | FSN-PAPER-PLAGUE |
                     // FSN-NULL-WALL | FSN-HOOK-FUSE | FSN-VEIL-HEX |
                     // FSN-QUIET-CHOIR | FSN-BROKEN-GLASS | FSN-KENNEL-LITANY
familyLock[]         // disable 30% lottery
worldFeatureIds[]    // WF-* placed after finalize
inheritHazardsFrom?
inheritModifierFrom?
branchFlag?          // blood | glass | paper | null
decoyId? / realId?   // ENC-PRIO-04
holdPortalLocked?
objectiveKind        // + occupy_ward_circle | wait_gate | pay_toll | choose_device
failureKind
deviceTable[]        // ENC-TREAS-03
rushVariant?         // decoy_reveal | half_death_rage
rewardPolicy         // applyRewards only
```

---

## 9. Out of scope

- Implementing any of the above in `WorldExploration.tsx`, `mapGen.ts`, or AI.
- New damage formulas, new CharacterStats fields, new persist writers.
- Name-based targeting or “if they are called Lieutenant / Final Pawn” logic — use `decoyId` / `realId` / `formationId`.
- Shipping admin tools to configure these rooms for normal players.
- Rewriting or renumbering 2026-08-31 or 2026-09-01 IDs.
- Enabling `usableByEnemy` on barrier / mirror / timestep / rallying-cry without the AI honesty work in `docs/ENEMY_AI_EVOLUTION.md`.
- Using `titans_vigor` as a room scaler.
- Pretending `blood_moon` / `mirror_field` / `gravity_well` / `fog_of_war` have WX combat hooks they do not (those four are announce-only or incomplete in `mapModifiers.ts` as of `58302bc`). `fog_of_war` may still be used as a **wall-hook substitute** for ambush concealment, matching day-1/2 language.
- Dual-boss dungeon capstones (Rush only).
- Wiring `applyPushback` / `applyAttract` / Wave-2 families (`rank_lancer`, `trip_mason`, …) — those wait on SPELL_PROPOSALS apply. This catalog consumes drop-2 **formations** that can stand on live kits.

---

## 10. Pick order (day-3, after day-1 and day-2 verbs exist)

Day-1 pick order still wins if nothing from 2026-08-31 is live: ENC-TEACH-01 + ENC-HAZ-01 → ENC-WAVE-01 → ENC-REST-01 / ENC-BRANCH-01.

Day-2 pick order still wins if Void verbs are missing: ENC-TEACH-02 + ENC-SPELL-03 → ENC-WAVE-03 → ENC-HOLD-01 or ENC-SURV-03 → ENC-BRANCH-02.

Once those exist, implementers should pick:

1. ENC-TEACH-03 + ENC-SPELL-05 (wind / Enrage verbs)  
2. ENC-WAVE-04 (`formationId` HEX-BLOOD → GLASS-WARD)  
3. ENC-FUSE-01 or ENC-NULL-01 (new pressure objects)  
4. ENC-BRANCH-03 (`branch: blood|glass|paper|null` snapshot-before-cleanup)  
5. ENC-BOSS-03 branch read  
6. Rush variants 09–10 one room at a time (after the account has one full Rush clear)

Uniqueness: this file is the **third** dated catalog. Later designers add `ENCOUNTER_EVOLUTION_YYYY-MM-DD.md` or append IDs. Do not silently rewrite these sheets.
