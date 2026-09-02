# Enemy synergy and formation catalog (drop 3)

**Author:** Enemy Synergy and Formation Designer  
**Date:** 2026-09-02  
**Status:** PROPOSED — design only. No production code, spawn tables, or AI changes in this drop.

Drops 1 and 2 already taught the seven pairing words and the Wave 1 proposed-family packs. This drop **does not reuse those `FSN-*` ids**. New experiences come from **who stands together**: live families in unused pairings, plus Wave 2 verbs (`docs/automation/ENEMY_ELITE_EVOLUTION_2026-09-01.md`) standing on the same chess chassis.

No new sprites. Higher progression unlocks more sophisticated **compositions**, not a last level band.

See also: [`ENEMY_FORMATIONS_2026-08-31.md`](./ENEMY_FORMATIONS_2026-08-31.md) (drop 1), [`ENEMY_FORMATIONS_2026-09-01.md`](./ENEMY_FORMATIONS_2026-09-01.md) (drop 2). Wave 3 families (`docs/automation/ENEMY_ELITE_EVOLUTION_2026-09-02.md`) are **deferred** — see the unlock graph.

---

## Grounding (live, 2026-09-02)

Re-read this checkout (`origin/main` `58302bc`). Line numbers moved since 2026-09-01.

| Fact | Where |
| :--- | :--- |
| Kits by piece | `enemyAI.ts` `ENEMY_KITS` 156–178 |
| `buildEnemyKit` | `enemyAI.ts` 187–193 (`Math.floor(levelZone)`) |
| Battle-start kit assignment still passes `currentMap.levelZone` (object) | `WorldExploration.tsx` 12035 |
| Summoner overlay roll still `0.12 + playerLevel * 0.02` (uncapped) | `WorldExploration.tsx` 12047–12058 |
| Family lottery 30%, seven live ids, `res`/`sp` written as 0.05–0.75 | `WorldExploration.tsx` 5862–5952 |
| Battle start still overwrites family HP | `WorldExploration.tsx` 12084–12089 `calcEnemyMaxHp(e.level)` |
| `inferArchetype` still heal-first (`spellType === "heal"` **or** `healAmount > 0`) | `enemyAI.ts` 421–449 |
| `decideEnemyAction` | `enemyAI.ts` 1649–1694 |
| `decideSummonerAction` still **skips** on missing spell / cap / cooldown | `enemyAI.ts` 1819–1893 |
| Min start spacing | `WorldExploration.tsx` `MIN_CHEBYSHEV = 4` at 5755 |
| Families (live) | `gameTypes.ts` 12–20 — seven overlays + `default` |
| AI gates | `gameConstants.ts` 200–209 |
| Summon cap / cooldown | `gameConstants.ts` 298–301 |
| Kamikaze constants | `gameConstants.ts` 266–285 |
| Map archetypes | `mapGen.ts` 4–42 |
| Ember melee-burn / tide melee-slow | `WorldExploration.tsx` 16877–16908 |
| Void Mirror 25% reflect | `castHelpers.ts` 328–337 |
| `applyPushback` / `applyAttract` exist; **no spell caller** | `occupancy.ts` 462 / 517 |
| Enemy-legal unique spells | `spellData.ts` 143–541 (`usableByEnemy: true`) |

### Still true (do not regress)

1. Intended kit band is 0 / 1 / 2. Live assignment is **band 0** until `buildEnemyKit` receives a number.
2. `inferArchetype` never returns `summoner`. Summoner slots need `isSummoner` + a usable summon id. Dedicated turret / familiar bodies **replace** the random overlay on that slot.
3. Any `healAmount` steals healer: `starter-heal`, `starter-drain`, `spell-drain-courage`, `spell-lifesteal-nova`, `spell-rallying-cry`. **Do not put drain or nova on a buffer, clock, storm, ricochet, tax, or assassin.**
4. `starter-heal` is **self-only** (`range: 0`, `targetType: "self"`). Ally mend on this drop is `starter-shield` / `spell-iron-skin` (both `targetType: "ally"`, range 3) until a ranged heal id exists. `FSN-MEND-KNIFE` is self-mend on purpose.
5. `spell-rallying-cry` stays `usableByEnemy: false`. `spell-enrage` is `targetType: "ally"` in data (274–291) even though the description says “own.” Ally `targetId` apply is still the honesty gap from drop 2. **This drop does not add a buffer+carry PAIR** so it can avoid that gate except where Plate / Cantor explicitly need it.
6. `summon-sentinel`, `summon-bomber`, `summon-wisp` stay enemy-false except as **late COURT flag-unlocks** already named in drop 1. Wave 2 turret / familiar are **different ids** (`spell-stone-turret`, `spell-blood-familiar`).
7. `starter-blast` (Chain Lightning, 2 bounces) has **no** `usableByEnemy` flag. Treat as proposed artillery only after bounce apply is honest. Do not invent `thunder_clap` / `void_collapse` / `shadow_strike` on a sheet unless that sheet names them as a COURT rare and the id is already in admin seed.
8. **Banned:** `ENEMY_AI_TIER_GATES.instantKill` (9), `betrayal` (10), sealed pockets, lava on every approach, turn-1 surround, `spell-barrier` / `spell-mirror` / `spell-timestep` on enemies. Root (`spell-root-snare`) **must leave spells legal** — it is a walk lock, not a stun lock.
9. Push dest and hook landing: free floor, not lava / spikes / void / portal, player keeps ≥ 1 escape tile. Teleport / Mist Step **does not** trip wires (Wave 2 trap identity).
10. Dual Slow / Frost / tide melee MP tax: cap applied MP debuff at **−2**. One Slow source per pack. Tide live melee (−1 MP) counts toward that cap.

### Relative difficulty (same grades as drops 1–2)

| Grade | Kit band | AI sophistication | Pack size | Rare spells | Unlock (relative) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PAIR | 0–1 | 1–2 | 2 | none | After the matching drop-1/2 PAIR, or as a first composed fight if that pair is the teaching tool |
| CELL | 0–1 | 2–3 | 2–3 | none | After the player answers the related PAIR without a death |
| BRIGADE | 1 | 3–4 | 3 | at most one | After CELL tools (heal / armor / a DoT / a displacement) |
| CADRE | 1–2 | 4–6 | 3–4 + optional summon | one, sometimes two non-stacking | After displacement **or** a player summon **and** the named prerequisite sheets |
| COURT | 2 | 6–8 | 4 + capped summons | one elite rare | After a leader-boost CADRE from **any** catalog |

Dungeon depth may amplify a grade (extra body, +tier step). It must not jump a PAIR sheet to COURT. No sheet is a final band.

Enemy levels inside a pack stay **relative to each other**:

- Frontliner (warden / tank / bruiser / closer / lancer / pusher): pack median + one step.
- Backliner (sniper / buffer / cantor / storm / glyph / censor / clock / tax / ricochet / turret-owner): pack median.
- Glass (rat, martyr, lurker, jackal, familiar-owner): pack median or −1.
- PAIR/CELL: at most **one** step between highest and lowest. BRIGADE+ may use two.

### Proposed role overlays (drop 3)

Drop 1 overlays (`ROLE-PROTECTOR`, `ROLE-ARTILLERY`, …) and drop 2 overlays (`ROLE-BUFFER`, `ROLE-SNIPER`, …) still apply. These are **additional jobs** for Wave 2 verbs. Each is a piece + optional **proposed** family + kit extras + AI contract. Not canister rows. No new pixel patterns.

| Overlay id | Piece | Family | Extra kit (beyond `ENEMY_KITS`) | AI contract |
| :--- | :--- | :--- | :--- | :--- |
| `ROLE-LANCER` | `rook` | proposed `rank_lancer` (else `iron_golem` on a **file**, not a fat Strike) | clone `physical_attack` as `wave2:spell-file-thrust` (`linear: true`, range 1–4). Do not mutate global Strike | charger; approach only along shared x or y (`AI-SYS-06`) |
| `ROLE-PUSHER` | `pawn` or `knight` | proposed `bash_bruiser` | `physical_attack`, `proposed:spell-shoulder-bash` | charger; VETERAN skip bash into open floor; dest must leave a walk-off |
| `ROLE-ROOTER` | `bishop` | proposed `snare_weaver` | `proposed:spell-root-snare`, `starter-frost` — **no** heal, drain, or Inferno | caster; will not refresh an already-rooted target; spells remain legal on the rooted tile |
| `ROLE-TRAPPER` | `rook` | proposed `trip_mason` | `proposed:spell-tripwire`; Mark is a **visible decoy**, never the only wire | setter; place then step off (VETERAN); cap 2 live traps; teleport does not trip |
| `ROLE-ANCHOR` | `bishop` | proposed `void_anchoret` | `proposed:spell-hook-line`, `starter-frost` — **no** Swap (that is `ROLE-PULLER` / `rift_hook`) | caster; skip hook if landing is safer for the player; adjacent = immune |
| `ROLE-CLOCK` | `queen` **without** heal | proposed `bell_sexton` | `proposed:spell-grave-bell`, `spell-weaken` — **no** Inferno, no `starter-heal` | caster; Bell deals 0 on cast; never recast the same `grave-bell-${casterId}` pair |
| `ROLE-EXECUTE` | `knight` | proposed `execute_jackal` | `physical_attack`, `spell-mark`; Sacrifice only if `ENEMY_WOUNDED_SACRIFICE_HP_PCT` **and** the execute window is live | flanker + hold; refuse frontal if target HP% > 40 |
| `ROLE-PLATE` | `rook` | proposed `plate_warden` (else `iron_golem` **without** absorb — teaching fallback is `FSN-WARD-MEND`) | `proposed:spell-ward-plate`, `physical_attack` | charger; retreat disabled above 40% **effective** (HP+absorb); replace, do not stack, plate |
| `ROLE-REDIRECT` | `king` or `rook` | proposed `pain_suture` | `proposed:spell-pain-link` — **no** `spell-mirror` | holder; Link only if a player-side summon is nearer **or** the player is the only hostile (self-punish is readable) |
| `ROLE-TURRET` | `rook` | proposed `stone_castellan` | `proposed:spell-stone-turret`; Shield / Iron Skin on the **turret** | `isSummoner` for the turret id only; pet `mp: 0` and **must not path**; no wolf/archer overlay on this body |
| `ROLE-RICOCHET` | `queen` **without** heal | proposed `ricochet_vicar` (else `wraith_bishop`) | `starter-frost`, `spell-mark`; `proposed:spell-ricochet-mark` only if Mark / hazard / root is public | artillery; skip bounce without setup (`AI-TEM-05`) |
| `ROLE-TAX` | `bishop` | proposed `tax_scribe` (else `bone_scribe` with Mark only) | `spell-mark`, `proposed:spell-glyph-tax` — **no** drain until CADRE | caster; will not overlap two taxes; 0 damage identity |
| `ROLE-MIST` | `knight` | proposed `mist_walker` | `physical_attack`, `proposed:spell-mist-step` (family flip `usableByEnemy` for this id only) | flanker; Step dest free, non-void, creates a flank; does not swap the player |
| `ROLE-LEECH` | `pawn` | proposed `leech_familiar` | `proposed:spell-blood-familiar` | summoner `summonAI: "sacrificial"`; skip if a familiar already lives; lifespan fade **does** fire on-death |

Drop-1 `ROLE-TANK` / `ROLE-KITER` / `ROLE-HEALER` / `ROLE-ASSASSIN` / `ROLE-HAZARD` / `ROLE-GLYPH` / `ROLE-KAMIKAZE` / `ROLE-CANTOR` / `ROLE-LURKER` are reused below. Do not also roll the random 12% summoner overlay onto Clock, Ricochet, Tax, Plate, or Cantor.

### Fair-fight rules (every sheet)

Same as drops 1–2, plus Wave 2:

- Engagement pocket: **≥ 2 walk-off tiles** that are not hazard, void, portal, or barrier.
- Hostiles start ≥ Chebyshev 4 from each other and from the player.
- Kamikaze never detonates on a single full-HP player. `AI_KAMIKAZE_MIN_TARGETS` stays 2 unless the martyr is ≤ 30% HP.
- Swap / pull / **push** dest: free floor, not lava / spikes / void / portal, player keeps ≥ 1 escape tile. Push into a wall is allowed (collision bonus) if a side step remains.
- Hook Line: linear LoS, minRange 2. Standing adjacent is the designed immune. Diagonal-only stance is a full answer.
- Root: walk MP = 0, **casts still legal**. Never pair Root with Time Warp. Never Root + two DoTs + Inferno on the same AP bar.
- Tripwire: hidden enter-damage + root. Must not be the only tile that reaches the backliner. Probe with a summon must be possible. Today's `isTrap → placeBarrier` **must be redefined** before any Trapper sheet ships.
- Grave Bell: 2-turn clock, 10 or 36 at ≤30% HP. Killing the Sexton does not clear the Bell (SPELL_PROPOSALS). The player must be able to **heal above 30%** or kill the Jackal. Do not also attach Glass Realm.
- Absorb: unused plate expires. DoTs chew it. Cursed Wound does not reduce absorb. Do not dump two Infernos into a fresh plate on the same round.
- Pain Link: next HP hit redirects to nearest hostile. Not Mirror. Player can wait 2 turns or hit a different body.
- Turret: occupies, linear shard, lifespan 4, shares `ENEMY_SUMMON_CAP`. Weak in open field. Pets do not grant extra XP.
- Glyph Tax: +1 AP to cast from a 3×3, 0 damage. Leave-the-zone is the answer. Do not pair two AP engines (`coil_arbiter` Drain Courage + Tax) except COURT, and even then only as a two-step (tax then drain), never same AP bar.
- One Inferno cadence per pack unless a variant explicitly splits targets.
- `starter-blast` / Ricochet may bounce player + one summon. Not paired with a second `hitsMultiple` source on the same sheet.
- No Glass Realm on stacked-DoT or Bell sheets. No Time Warp on Mark / Root / Bell windows.
- Summons stay at cap 2. One dedicated summoner **engine** per pack (wolf **or** turret **or** familiar — never two engines).
- Leader boost (default 10% per fallen non-leader) from CADRE up. The player can cut the leader first.

---

## Index (all three catalogs)

| Id | Grade | Combo | Catalog |
| :--- | :--- | :--- | :--- |
| `FSN-IRON-BATTERY` | PAIR | protector + artillery | 2026-08-31 |
| `FSN-WARD-MEND` | PAIR | tank + healer | 2026-08-31 |
| `FSN-HEX-BLOOD` | PAIR | buffer + bruiser | 2026-09-01 |
| `FSN-GLASS-WARD` | PAIR | warden + sniper | 2026-09-01 |
| `FSN-IRON-TIDE` | PAIR | tank + kiter | this drop |
| `FSN-FILE-GUARD` | PAIR | lancer + protector | this drop |
| `FSN-MEND-KNIFE` | PAIR | healer + assassin | this drop |
| `FSN-FROST-KNIFE` | CELL | controller + assassin | 2026-08-31 |
| `FSN-ROT-CUT` | CELL | debuffer + finisher | 2026-08-31 |
| `FSN-TIDE-LOCK` | CELL | kiter + mover | 2026-08-31 |
| `FSN-MIRROR-REAVE` | CELL | reflect + gap-closer | 2026-09-01 |
| `FSN-PAPER-PLAGUE` | CELL | dual applicator + scribe | 2026-09-01 |
| `FSN-NULL-WALL` | CELL | anti-summon + tank | 2026-09-01 |
| `FSN-HOOK-SLAM` | CELL | pull + push | this drop |
| `FSN-BELL-CUT` | CELL | clock + execute | this drop |
| `FSN-WIRE-ROOT` | CELL | trap + root | this drop |
| `FSN-KENNEL-LITANY` | BRIGADE | summoner + support | 2026-08-31 |
| `FSN-EMBER-RIFT` | BRIGADE | hazard + displacer | 2026-08-31 |
| `FSN-HOOK-FUSE` | BRIGADE | puller + kamikaze | 2026-09-01 |
| `FSN-TIDE-STORM` | BRIGADE | kiter + storm artillery | 2026-09-01 |
| `FSN-VEIL-HEX` | BRIGADE | lurker + buffer | 2026-09-01 |
| `FSN-EMBER-MEND` | BRIGADE | hazard + healer | this drop |
| `FSN-GRAVITY-TAX` | BRIGADE | pull + slam + zone tax | this drop |
| `FSN-TRI-BASTION` | CADRE | tank + healer + artillery | 2026-08-31 |
| `FSN-MARK-CONFLAGRATION` | CADRE | mark + inferno + finisher | 2026-08-31 |
| `FSN-PACK-PINCER` | CADRE | summoner + assassin + tank | 2026-08-31 |
| `FSN-MIRROR-SCRIPTORIUM` | CADRE | displacer + support + assassin | 2026-08-31 |
| `FSN-ASH-COURT` | CADRE | ember + martyr + glyph | 2026-09-01 |
| `FSN-QUIET-CHOIR` | CADRE | cantor + chorister + warden | 2026-09-01 |
| `FSN-BROKEN-GLASS` | CADRE | sniper + mirror + reaver | 2026-09-01 |
| `FSN-RIFT-KNOT` | CADRE | puller + blinker + arbiter | 2026-09-01 |
| `FSN-NULL-BROOD` | CADRE | brood + censor + golem | 2026-09-01 |
| `FSN-FILE-WIRE` | CADRE | lancer + trap + root | this drop |
| `FSN-BELL-COURT` | CADRE | clock + execute + scribe | this drop |
| `FSN-PLATE-LINK` | CADRE | absorb + redirect + cantor | this drop |
| `FSN-MIST-HUNT` | CADRE | dash + lurker + bait familiar | this drop |
| `FSN-CROWN-ESCORT` | COURT | dual golem + king + controller | 2026-08-31 |
| `FSN-CHORUS-THRONE` | COURT | choir + sniper, leader | 2026-09-01 |
| `FSN-SHARD-BATTERY` | COURT | turret + ricochet + glyph | this drop |

---

## Formations

### FSN-IRON-TIDE

FORMATION_ID: `FSN-IRON-TIDE`  
RELATIVE_DIFFICULTY: PAIR (kit band 0–1)  
ENEMIES:

- `ROLE-TANK` — `rook` / live `iron_golem` — pack median + 1 — front
- `ROLE-KITER` — `bishop` / live `tide_shade` — pack median — back, Chebyshev ≥ 3

VARIANT_RULES:

- Band 0: Strike + Frost only. Tank is a fat body. Shade Frost is the kite tax. Live tide melee −1 MP is a **punish for catching the shade**, not a primary attack — the shade must still refuse to walk in at PAIR.
- Band 1: Tank gains `spell-iron-skin`. Shade gains `starter-poison` **or** `spell-slow`, never both (MP cap + DoT is CELL). If Slow is chosen, Frost refreshes, does not stack past −2 with the melee hook.
- Elite: Tank **or** Shade, never both at PAIR.
- Unlock after `FSN-IRON-BATTERY` **or** as a parallel first PAIR (same grade, different puzzle: you cannot snipe the gun if the gun **leaves**).
- Random 30% family lottery is **off**.
- No Swap, no Inferno, no healer on this sheet (that is `FSN-WARD-MEND` / `FSN-TIDE-STORM`).

SPELL_POOL_INTERACTIONS:

- Frost Bolt (−1 MP) plus a doorway golem makes closing expensive. The shade’s job is to still be at 3 after you spend that MP.
- Iron Skin is RES, not reflect. Player physical still works.
- Poison Arrow (band 1 option) is 4/turn. It must not share a turn with a second DoT.

TACTICAL_PLAN:

- Tank steps into a **wide** lane and holds. Shade keeps range and spends AP on Frost, repositioning 1–2 steps if LoS dies (`AI_LOS_REPOSITION_STEP_BUDGET`).
- If the Tank drops below 30% it retreats **behind** the Shade, not through the player (`defensiveRetreat` once soph ≥ 3).

SYNERGY:

- Tank + kiter. Live families only. The golem buys the shade turns; the shade punishes a player who treats this as `FSN-IRON-BATTERY` and walks the lane.

PLAYER_THREAT:

- Slow, readable. The scary turn is “I spent MP on the doorway and the bishop is gone,” not a one-shot.

COUNTERPLAY:

- Cut a side aisle and collapse the shade (`hpMult` ~0.8, glass RES). The golem without a kite is a slow Strike (`mp: 1` on the family table).
- Attract / Swap (player) yanks the shade into Strike range.
- Do not chase through the Tank’s tile.

MAP_REQUIREMENTS:

- `openField`, `arena`, or `chessboard` with **wide** files. Reject `corridorMaze` (a kiter in a hallway is either helpless or a lock).
- No lava on the only approach. Paper Windstorm is a **fair** modifier (also hits the kiter).

AI_REQUIREMENTS:

- Tank: charger. `chokepointCamp` only if soph ≥ 3 **and** a side aisle exists.
- Kiter: caster + proposed keep-range 3 (reuse `decideSummonArcher` distance on a full enemy).
- Soph 1–2. `groupTactics` not required.

VARIANTS:

- `FSN-IRON-TIDE/SLOW` — band 1 Slow instead of Poison.
- `FSN-IRON-TIDE/E-IRON` — elite Tank, Shade stays junior.

STATUS: PROPOSED

---

### FSN-FILE-GUARD

FORMATION_ID: `FSN-FILE-GUARD`  
RELATIVE_DIFFICULTY: PAIR (kit band 0–1)  
ENEMIES:

- `ROLE-LANCER` — `rook` / proposed `rank_lancer` — pack median + 1 — owns one open file
- `ROLE-PROTECTOR` — `rook` / live `iron_golem` — pack median — stands **off** the file, peels the side aisle

VARIANT_RULES:

- Two rooks, two jobs. Combination, not a new sprite. Lancer is geometry; Protector is HP.
- Band 0: Lancer uses ordinary Strike but **only commits on a shared file** (AI contract even before the linear kit clone exists). Protector is a body-block on the gallery.
- Band 1: Protector gains Iron Skin. Lancer may hold `spell-iron-skin` **or** `spell-haste` (re-align), never Inferno.
- Elite: Lancer only. Protector stays junior so the puzzle is “leave the file,” not two elites.
- If the map has no 4-tile open file or rank, **reroll this id** (tiny `ruinsIslands` pockets).
- Unlock after `FSN-IRON-BATTERY` **or** parallel first PAIR (anti-ranged via **file**, not via a bishop gun).
- `proposed:spell-shoulder-bash` stays off PAIR (that is `FSN-HOOK-SLAM`).

SPELL_POOL_INTERACTIONS:

- File-thrust is physical along the rank. Off-axis you are safe. `paper_windstorm` does not matter.
- Protector Iron Skin is RES. Do not give the Lancer a ranged nuke or the identity leaks.

TACTICAL_PLAN:

- Lancer walks or holds the file and only charges when the player shares x or y with a clear ray.
- Protector occupies the **gallery** so walking off-file still costs a body. It does not also stand on the file (that would close the designed answer).

SYNERGY:

- Lancer + protector. Wave 2 `rank_lancer` standing on drop-1’s golem. The file is the weapon; the golem is why you cannot ignore the side step.

PLAYER_THREAT:

- Readable geometry. Misplay is sharing the rank “for one Frost.” Recoverable: step off.

COUNTERPLAY:

- Never share a rank. Occupy the neck with a summon. Swap off-axis. Kill the Lancer (it is not a 2.5× HP golem — `hp` ~1.05).
- If only the Protector lives, this is `FSN-IRON-BATTERY` minus the gun.

MAP_REQUIREMENTS:

- `chessboard` or `fortress` with **one 4-tile file plus a gallery**. Reject a single-tile tunnel (file + forced melee is a lock).
- No Barrier already occupying the file at spawn (player Barrier during the fight is the intended cut).

AI_REQUIREMENTS:

- Lancer: charger + linear-only approach (`AI-SYS-06`). Fallback if the clone id is missing: charger that **skips** unless `player.x === lancer.x || player.y === lancer.y`.
- Protector: charger that body-blocks the gallery, not a suicide walk down the file.
- Soph 1–2.

VARIANTS:

- `FSN-FILE-GUARD/SOLO-FILE` — teaching PAIR with Lancer + no Protector **only** if the player has already answered a tank PAIR (otherwise the Lancer is a sitting duck).
- `FSN-FILE-GUARD/E-RANK` — elite Lancer, Haste to re-align, still no bash.

STATUS: PROPOSED

---

### FSN-MEND-KNIFE

FORMATION_ID: `FSN-MEND-KNIFE`  
RELATIVE_DIFFICULTY: PAIR (kit band 1)  
ENEMIES:

- `ROLE-HEALER` — `queen` / default or `bone_scribe` — pack median — `starter-heal` only (self)
- `ROLE-ASSASSIN` — `knight` / default or `ember_knight` — pack median or −1 — starts wide

VARIANT_RULES:

- Band 0: **do not spawn this id** (heal is band 1). Show `FSN-FROST-KNIFE` or `FSN-IRON-TIDE` instead.
- Healer kit: Blood Mend only. **No** Inferno, no Enrage, no Shield required (self-mend does not need ally `targetId` apply — this PAIR can ship when kit band is numeric).
- Assassin kit: Strike + `spell-venom-strike`. `spell-sacrifice` only if HP ≤ 20% and the player is already DoT’d. No Shadow Veil on PAIR (that is `FSN-FROST-KNIFE/E-VEIL` / `FSN-VEIL-HEX`).
- Elite: Assassin only. Healer never gets Lifesteal Nova (healAmount + AoE is a lock adjacent).
- Unlock after `FSN-WARD-MEND` **or** `FSN-FROST-KNIFE` (player has seen a heal body **or** a knife; this sheet combines them).
- Ember live melee-burn is **off** on the assassin unless the variant says so (double DoT + mend is CELL+).

SPELL_POOL_INTERACTIONS:

- Blood Mend (12 HP, self) keeps the queen in the back. It does not refill the knight — kill order is still “knife first if it committed, else queen.”
- Venom 4/turn × 3 is the bleed. Combined with a surviving healer it threatens attrition, not a stun.

TACTICAL_PLAN:

- Healer stays ≥ 3 back and self-mends when under 50%. If healthy, it **holds** (no invented nuke).
- Assassin paths to a side or rear tile and commits only when reachable this turn.

SYNERGY:

- Healer + assassin. Drop-1 split those jobs across `FSN-WARD-MEND` and `FSN-FROST-KNIFE`. Same chassis, new question: the refill is **self**, so focusing the knife does not turn the queen off.

PLAYER_THREAT:

- A knife that comes back if you chip the queen first. Spike is low. Misplay is ignoring the queen forever.

COUNTERPLAY:

- Burst the queen (glass RES 0.75 / scribe 0.7). Or finish the knight in one commit so Sacrifice never arms.
- Cursed Wound on the queen halves the mend. Face the knight in a doorway you choose.

MAP_REQUIREMENTS:

- `asymmetric` or `ruinsIslands` with two approach vectors. The Assassin’s flank must not be the only player exit.
- No Thorned Ground on the only path to the queen.

AI_REQUIREMENTS:

- Healer: healer inference (heal on kit — honest here).
- Assassin: flanker (`pieceType === "knight"`).
- Soph 1–2.

VARIANTS:

- `FSN-MEND-KNIFE/EMBER` — CELL: assassin family `ember_knight` (live melee burn). Still no Inferno on the queen.
- `FSN-MEND-KNIFE/E-VENOM` — elite Assassin, still no turn-1 Sacrifice.

STATUS: PROPOSED

---

### FSN-HOOK-SLAM

FORMATION_ID: `FSN-HOOK-SLAM`  
RELATIVE_DIFFICULTY: CELL (kit band 1)  
ENEMIES:

- `ROLE-ANCHOR` — `bishop` / proposed `void_anchoret` — pack median — linear pull
- `ROLE-PUSHER` — `pawn` or `knight` / proposed `bash_bruiser` — pack median — Shoulder Bash

VARIANT_RULES:

- Distinct from `FSN-EMBER-RIFT` (Swap + Inferno) and `FSN-HOOK-FUSE` (Swap + martyr). This sheet is **attract then push**. No Swap on either body. No Inferno. No martyr.
- Elite: Pusher only. Anchor stays junior so two displacement elites cannot pin.
- Unlock after `FSN-EMBER-RIFT` **or** when the player has used Swap themselves (relative, not a level gate) — they already know “the board moves.”
- Hook dest and bash dest must each leave a walk-off. Bash into open floor is skipped (VETERAN). Bash into a **wall** is allowed if a side step remains. Bash onto lava is **banned** on CELL (that is BRIGADE `FSN-GRAVITY-TAX/ASH` caution, still no lava dest even there unless a clean bridge exists).
- Do not ship until `applyAttract` / `applyPushback` have a spell caller (`effectCategory`, never name).

SPELL_POOL_INTERACTIONS:

- Hook Line: linear LoS, minRange 2, small damage. Identity is the pull. Adjacent = immune.
- Shoulder Bash: 2-step ray. Collision bonus vs wall. If implemented as “more Strike damage,” the family is wrong — **do not ship**.
- Frost after a hook is a tax, not a root.

TACTICAL_PLAN:

- Anchor Hooks only when Chebyshev ≥ 2, ray clear, landing is **not** safer for the player, and a walk-off remains.
- Pusher walks a flank and Bashes after the player lands, aiming at a wall **beside** the engagement, never the last exit.
- Never turn-1 double displace onto one tile.

SYNERGY:

- Pull + push. Wave 2 Gravity Choir minus the tax (tax is BRIGADE). The board slams you toward a wall; you can still step off.

PLAYER_THREAT:

- Positional. Fail state is “I stood on a file, got hooked, then banged into a pillar.” Recoverable: hug the Anchor (immune), keep a tile behind you.

COUNTERPLAY:

- Stand adjacent to the Anchor. Break LoS. Diagonal-only stance. Guardian body-block the bash ray. Slow the Pusher before it closes.
- Occupy the only legal landing.

MAP_REQUIREMENTS:

- `arena` or `asymmetric` with **pillars / a wall 2 tiles from typical stand**, plus open floor the other way. Reject `corridorMaze` (hook + bash in a hallway is a lock).
- No Void Rift tile as a legal landing. No lava dest.

AI_REQUIREMENTS:

- Anchor: caster + hook legality (landing walkable, not hazard, player retains ≥ 1 escape, skip if landing is safer).
- Pusher: charger; skip bash into open floor; dest scoring must not use lava.
- Soph 2–3.

VARIANTS:

- `FSN-HOOK-SLAM/KNIGHT` — Pusher chassis `knight` (flank path).
- `FSN-HOOK-SLAM/E-BASH` — elite Pusher, still no lava dest.

STATUS: PROPOSED

---

### FSN-BELL-CUT

FORMATION_ID: `FSN-BELL-CUT`  
RELATIVE_DIFFICULTY: CELL (kit band 1)  
ENEMIES:

- `ROLE-CLOCK` — `queen` **without heal** / proposed `bell_sexton` — pack median
- `ROLE-EXECUTE` — `knight` / proposed `execute_jackal` — pack median − 1 — starts wide

VARIANT_RULES:

- Distinct from `FSN-ROT-CUT` (DoT now + Sacrifice pawn). Pressure is a **2-turn clock**, then a threshold Strike. Bell deals 0 on cast.
- CELL: Sexton has Grave Bell + Weaken. Jackal has Strike + Mark. Sacrifice is off until the player is ≤ 30% **and** Bell is ticking.
- Elite: Sexton only. Jackal stays junior so two elites cannot 100–0 from full HP.
- Unlock after `FSN-ROT-CUT` (player has seen a setup → finish) **or** after they have healed out of a DoT window this run.
- If pack size would be 1, **reroll** (clock needs a finisher).
- No Inferno, no drain (healAmount), no Glass Realm, no Time Warp.

SPELL_POOL_INTERACTIONS:

- Grave Bell: 10, or 36 if HP% ≤ 30 at tick. Killing the Sexton does **not** clear it — that is the read. The Jackal is the body you can delete to make 10 survivable.
- Weaken (−30% dmg, 2 turns) makes a panic trade worse; it does not stop mending above 30%.
- Mark on the Jackal is the execute amp. Player can step off the marked tile.

TACTICAL_PLAN:

- Turn 1: Sexton Bells if player HP% ≤ 50 (peer) or always shows the icon at CELL if already wounded from the map — never Bell a full-HP player on turn 1.
- Jackal lurks at 3 and **ignores** a healthy player. It commits when Bell is ticking **or** HP% ≤ 40.
- Hostiles start ≥ 4 apart.

SYNERGY:

- Clock + execute. Wave 2 Bell Court minus the scribe. You see the timer; the knife waits for it.

PLAYER_THREAT:

- High if you sit under 30% and trade the Jackal. Low if you mend before the tick. Not unavoidable: heal, or kill the Jackal and eat the 10.

COUNTERPLAY:

- Blood Mend / Shield before the tick. Burst the Jackal (hp ~0.70). Do not dump AP on the Sexton while the Jackal is adjacent.
- Step off Mark. Player Timestep (enemy cannot have it) is a fair panic if AP remains.

MAP_REQUIREMENTS:

- `openField` or `arena`. Jackal needs a flank path that is not the only exit. Sexton needs a retreat tile.
- No Thorned Ground on the only path to the Sexton (taxes the correct “kill the clock” play if you choose it).

AI_REQUIREMENTS:

- Clock: caster; never recast the same bell pair; heal-less so inference stays caster.
- Execute: flanker + HP% hold (`ROLE-EXECUTE`).
- Soph 2–3.

VARIANTS:

- `FSN-BELL-CUT/WOUND` — BRIGADE: Sexton adds `spell-cursed-wound` (anti-heal on the window). Still no Glass Realm.
- `FSN-BELL-CUT/E-BELL` — elite Sexton, lookahead to the target that will be ≤ 30% in two public DoT ticks.

STATUS: PROPOSED

---

### FSN-WIRE-ROOT

FORMATION_ID: `FSN-WIRE-ROOT`  
RELATIVE_DIFFICULTY: CELL (kit band 1)  
ENEMIES:

- `ROLE-TRAPPER` — `rook` / proposed `trip_mason` — pack median
- `ROLE-ROOTER` — `bishop` / proposed `snare_weaver` — pack median

VARIANT_RULES:

- Distinct from `FSN-TIDE-LOCK` (MP tax kite) and drop-2 glyph Mark. Root **stops the walk**; trap is hidden enter-damage. Spells stay legal.
- CELL: one wire, one Root. Mason cap 1 live trap. Weaver will not refresh Root.
- Elite: Weaver only. Mason stays junior so two hidden wires + Root is not a CELL.
- Unlock after `FSN-FILE-GUARD` **or** `FSN-TIDE-LOCK` (player has seen geometry or MP tax).
- Do not ship until trap is **not** `placeBarrier` (a fake wall plus Root is a hardlock).
- Mark as decoy is BRIGADE (`FSN-FILE-WIRE`). Inferno stays off.

SPELL_POOL_INTERACTIONS:

- Tripwire: enter (walk/push/pull) deals + roots; **teleport does not trip**. Probe with a pet.
- Root Snare: walk lock, casts legal. Frost (−1 MP) after Root is a tax on the **nuke**, not a second walk lock.
- Do not also attach Slow (that is a third MP story).

TACTICAL_PLAN:

- Mason places a wire on a **flank choke**, then steps off (VETERAN). Never wire both approaches. Never wire the only tile that reaches the Weaver.
- Weaver Roots when the player can still cast from that tile **or** walk to safety after the Root expires. It does not Root a full-HP player on turn 1 in a dead-end.

SYNERGY:

- Trap + root. Teaching pair for File & Wire without the Lancer yet. Information (where is the wire?) plus a walk lock.

PLAYER_THREAT:

- Frustration and a chip if you step on the wire. Not a lock: spells work, second approach exists, Root expires.

COUNTERPLAY:

- Probe with a summon. Step around. Cast from the rooted tile (Timestep / Inferno / Frost). Kill the Weaver (hp ~0.80). Swap the Mason onto their own wire once you know the cell.

MAP_REQUIREMENTS:

- `fortress` courtyard + gallery, or `corridorMaze` **with a detour**. Reject a 1-tile tunnel (wire + Root on the only tile is a hardlock).
- No Time Warp. No slime on both approaches.

AI_REQUIREMENTS:

- Trapper: setter; place then step off; never wire the only backliner approach.
- Rooter: caster; no refresh; Root only if a walk-off **after expiry** or a legal cast from the tile exists.
- Soph 2–3.

VARIANTS:

- `FSN-WIRE-ROOT/DECOY` — BRIGADE: Mason Mark on a **different** tile from the wire.
- `FSN-WIRE-ROOT/LIVE-FROST` — if Root id is not ready, Weaver Frost-only (softer CELL; still two bodies). Do not fake Root with Slow.

STATUS: PROPOSED

---

### FSN-EMBER-MEND

FORMATION_ID: `FSN-EMBER-MEND`  
RELATIVE_DIFFICULTY: BRIGADE (kit band 1–2)  
ENEMIES:

- `ROLE-HAZARD` — `knight` / live `ember_knight` — pack median — live melee burn; `spell-inferno` only if kit band 2
- `ROLE-HEALER` — `queen` / `bone_scribe` — pack median — `starter-heal` only
- Optional third: `pawn` charger with **no** extra spells (body, not a third verb)

VARIANT_RULES:

- Distinct from `FSN-EMBER-RIFT` (burn + **Swap**) and `FSN-WARD-MEND` (golem + heal). This is hazard + healer: the refill is on the **burn knight**, not a wall.
- Unlock after `FSN-WARD-MEND` **and** the player has seen ember melee-burn or Inferno (relative mastery).
- Elite: Ember only. Healer stays junior. Inferno stays 3-turn cooldown, one target. Optional pawn never gets Inferno.
- No Swap, no martyr, no Mark (those are `FSN-ASH-COURT` / `FSN-EMBER-RIFT`).
- If kit band is still 0, **do not spawn this id**.
- Blood Moon / vampiric_ground: do **not** also give the ember lifesteal-on-burn.

SPELL_POOL_INTERACTIONS:

- Live ember melee 3/turn × 3 plus optional Inferno 8/turn × 3. They may both exist **on different cadences**. Do not Inferno the same turn as a melee apply if that hides the cooldown window.
- Blood Mend is self. The queen does **not** refill the knight until a ranged heal exists — BRIGADE honesty: she Shields / Iron Skins the knight (`targetType: "ally"`) and self-mends. If ally Shield apply is missing, she **only** self-mends and the sheet is a softer burn + glass healer (still valid). **Do not** put `starter-heal` on the knight (heal-first would steal charger).

TACTICAL_PLAN:

- Ember flanks and holds Inferno until LoS and the player is not already on a walk-hazard.
- Healer stays at 4, opposite corner. Optional pawn walks the front so the ember is not the only body.
- If the ember dies, remaining pair is a weak healer + pawn — intended.

SYNERGY:

- Hazard creator + healer. Live families. Drop-1 never stacked those two without a displacer.

PLAYER_THREAT:

- Long burn if the queen lives. Spike only if Inferno is up **and** you stand in melee. Interruptible: kill the scribe, wait the cooldown.

COUNTERPLAY:

- Focus the Healer. Cursed Wound. Frost the ember’s MP. Do not stand still in melee.
- Walk around; do not clump with a wisp (melee burn + optional Inferno).

MAP_REQUIREMENTS:

- `asymmetric` or `ruinsIslands` with two approaches. One may be warm flavor; one must be clean. Reject lava-painted engagement + Inferno (double hazard).
- Healer needs a retreat tile that is not the ember’s choke.

AI_REQUIREMENTS:

- Ember: flanker; **not** berserk (berserk + healer is a suicide dive that also deletes the player).
- Healer: healer. `AI_BACKLINE_PROTECT` at soph 4.
- Soph 3–4. `groupTactics` at 4: one focus.

VARIANTS:

- `FSN-EMBER-MEND/NO-PAWN` — drop the optional body.
- `FSN-EMBER-MEND/NO-INFERNO` — melee burn only (if band 2 is not the run’s band).
- `FSN-GRAVITY-TAX/ASH` remains the push-onto-burn BRIGADE; do not merge.

STATUS: PROPOSED

---

### FSN-GRAVITY-TAX

FORMATION_ID: `FSN-GRAVITY-TAX`  
RELATIVE_DIFFICULTY: BRIGADE (kit band 1)  
ENEMIES:

- `ROLE-ANCHOR` — `bishop` / proposed `void_anchoret` — pack median
- `ROLE-PUSHER` — `pawn` / proposed `bash_bruiser` — pack median
- `ROLE-TAX` — `bishop` / proposed `tax_scribe` — pack median — zone AP tax

VARIANT_RULES:

- Unlock after `FSN-HOOK-SLAM`. Wave 2 “Gravity Choir.”
- Elite: Anchor only. Pusher and Tax stay junior so two displacement elites cannot pin.
- Tax is the **one** rare. Drain Courage is CADRE/COURT, not this sheet (two AP engines).
- Hook / bash dest still banned from lava / void. Prefer landing **inside** the tax 3×3 if a walk-off **out of the zone** remains — that is the identity, not a lock.
- No Root on this sheet (that is `FSN-WIRE-ROOT` / `FSN-FILE-WIRE`). No Inferno. No Swap.
- Variant `FSN-GRAVITY-TAX/ASH` may replace Tax with `ROLE-HAZARD` (`ember_knight`) — push onto burn. Still no lava dest; the ember **body** is the hazard. At most one Inferno cadence.

SPELL_POOL_INTERACTIONS:

- Hook into bash into a marked/taxed tile. Glyph Tax is +1 AP to **cast** while in the 3×3, 0 damage. Leaving the zone is the answer. Cheap Strike from outside is legal.
- Tax will not overlap two zones. Frost from Anchor after landing is a tax, not a root.
- Pusher Enrage is off (buffer honesty). Expose on the Pusher is the optional rare **instead of** Tax, never both.

TACTICAL_PLAN:

- Tax paints a 3×3 on the good LoS tile / landing pocket. Anchor Hooks toward it only if an exit from the zone exists. Pusher Bashes toward a wall **inside** the zone if a side step out remains.
- If the player never enters the zone, this is a softer `FSN-HOOK-SLAM` plus a Mark bishop — fine.

SYNERGY:

- Pull + slam + zone tax. Displacement sets up an AP price, not a stun.

PLAYER_THREAT:

- Positional and tempo. Failure is Inferno-from-inside after a hook. Recoverable: step out, hug the Anchor, kill the glass Tax (`hp` ~0.70).

COUNTERPLAY:

- Hug the Anchor. Leave the zone. Strike from outside. Occupy the landing. Kill the Tax first if you plan a 5-AP turn.

MAP_REQUIREMENTS:

- `arena` or `openField` with ≥ 8 free floor cells and at least one pillar. Reject `corridorMaze`.
- Tax 3×3 must not cover **all** walk-offs from the landing.

AI_REQUIREMENTS:

- Same hook/bash legality as `FSN-HOOK-SLAM`.
- Tax: caster; zone the landing **only** if an exit exists; skip recast of an active tax (`AI-TEM-04`).
- Soph 3–4. Blackboard: `plannedLanding` so Tax and Anchor agree.

VARIANTS:

- `FSN-GRAVITY-TAX/ASH` — replace Tax with ember Hazard (Wave 2 “Ash Slam” minus martyr). Softer if zone-AP is not ready.
- `FSN-GRAVITY-TAX/FUSE` — COURT caution: do **not** add martyr on this id (that is drop-2 `FSN-HOOK-FUSE`). Extra fuse + pull + bash is a lock in a pocket.

STATUS: PROPOSED

---

### FSN-FILE-WIRE

FORMATION_ID: `FSN-FILE-WIRE`  
RELATIVE_DIFFICULTY: CADRE (kit band 1)  
ENEMIES:

- `ROLE-LANCER` — `rook` / proposed `rank_lancer` — pack median + 1 — `isLeader` optional (see variants)
- `ROLE-TRAPPER` — `rook` / proposed `trip_mason` — pack median — wires **the file**
- `ROLE-ROOTER` — `bishop` / proposed `snare_weaver` — pack median

VARIANT_RULES:

- Unlock after `FSN-FILE-GUARD` **and** `FSN-WIRE-ROOT`. Wave 2 “File & Wire.”
- Elite: Lancer-leader only. Mason and Weaver stay junior. Leader-boost is the escalation, not three elites.
- Mason wires the file the Lancer wants, **not** both galleries. Weaver Roots when the player is on-file **or** one tile off (ELITE Weaver) — base sheet Roots only on-file so stepping off is still complete.
- No Tax, no Hook, no Inferno, no second trapper.
- COURT variant `FSN-FILE-WIRE/VICAR` may add `ROLE-RICOCHET` **or** a Turret, not both, and only after this CADRE is answered (`bounceOn: ["root"]` / file shard).

SPELL_POOL_INTERACTIONS:

- Linear charge into a hidden wire + Root. Teleport / Mist Step does not trip — that is a legal skip of the wire if the player brought it.
- Haste on the Lancer (band 1 extra) is re-align, not a gap-close off-file.
- Frost from Weaver after Root taxes the cast, does not add a walk lock.

TACTICAL_PLAN:

- Lancer holds until the player shares the file. Mason places then steps off. Weaver Roots the on-file player if a cast-from-tile exists.
- If the Lancer dies, boost lands on glass — intended. Remaining pair is `FSN-WIRE-ROOT`.

SYNERGY:

- Lancer + trap + root. Three Wave 2 verbs, one file. Combination, not a new monster.

PLAYER_THREAT:

- High if you share the rank. Low if you never do. The fail is greed on the file after you already learned PAIR.

COUNTERPLAY:

- Step off the file. Probe the wire with a pet. Cast from Root. Barrier the ray. Burst the Weaver. Peel the Lancer-leader early if boost is on.

MAP_REQUIREMENTS:

- `chessboard` or `fortress` with a 4-tile file **and** two galleries. Reject maps with no 4-tile file (reroll).
- Wire must not be the only cell that leaves the file.

AI_REQUIREMENTS:

- Lancer: linear-only + optional `isLeader`.
- Trapper: file-prefer at CADRE (ELITE mason in Wave 2 sheet); base: flank choke that **feeds** the file, not both exits.
- Rooter: on-file Root only on the base sheet.
- Soph 4–6. `groupTactics` on. Blackboard: `ownedFile`.
- `chokepointCamp` only with a gallery.

VARIANTS:

- `FSN-FILE-WIRE/NO-LEADER` — teaching CADRE without boost.
- `FSN-FILE-WIRE/VICAR` — COURT: add Ricochet; still one `hitsMultiple`; bounce only if Root/Mark/hazard is public.
- `FSN-FILE-WIRE/TURRET` — COURT: add Castellan instead of Vicar; cap 1 turret; turret faces the same file.

STATUS: PROPOSED

---

### FSN-BELL-COURT

FORMATION_ID: `FSN-BELL-COURT`  
RELATIVE_DIFFICULTY: CADRE (kit band 1)  
ENEMIES:

- `ROLE-CLOCK` — `queen` **without heal** / proposed `bell_sexton` — pack median — `isLeader` optional
- `ROLE-EXECUTE` — `knight` / proposed `execute_jackal` — pack median − 1
- `ROLE-DEBUFFER` — `bishop` / live `bone_scribe` — pack median — Weaken / Expose; **no** drain

VARIANT_RULES:

- Unlock after `FSN-BELL-CUT`. Wave 2 “Bell Court.”
- Elite: Sexton-leader only. Jackal and Scribe stay junior.
- Scribe does not also Poison (Jackal Mark + Bell is enough). Cursed Wound is the **one** rare, on the Sexton, after `FSN-BELL-CUT/WOUND` has been seen **or** as this CADRE’s rare — not both Wound **and** Expose on the same AP bar.
- Pale Cantor is a **counter** (heal out of window), not a member.
- No Inferno. No Sacrifice on the Jackal unless HP ≤ 20% **and** Bell tick is the next turn **and** player is ≤ 30%.

SPELL_POOL_INTERACTIONS:

- Bell → Scribe shred (Weaken / Expose) → Jackal Mark × Strike under 30%. Readable three-step. Confirm live Mark × Strike before shipping (same caveat as `FSN-MARK-CONFLAGRATION`).
- Expose’s 15 upfront is the safe Mark consumer if Mark does not amp DoT/Bell (Bell is delayed, not a tile spell).

TACTICAL_PLAN:

- Turn 1: Scribe Weakens if the player is already wounded; else holds. Sexton Bells only if HP% ≤ 50 **or** a public DoT is already on the player.
- Jackal paths to the Bell target, not the nearest (`ELITE` jackal — on BASE it may still lurk at 3 until HP% ≤ 40).
- One of the three peels a wisp (`focusAlreadySet`); the others stay on the player.

SYNERGY:

- Clock + execute + scribe. Setup, shred, threshold. Live `bone_scribe` so the pack is not three proposed sprites.

PLAYER_THREAT:

- High under 30% with Wound up. Still a heal-out. Failure is trading the Jackal at 25%.

COUNTERPLAY:

- Mend above 30% before the tick. Kill the Jackal. Ignore the Scribe if you are bursting. Cursed Wound on **you** is the rare — Shield / wait.

MAP_REQUIREMENTS:

- `openField` or `arena` with two approaches. No Time Warp. No Glass Realm.
- ≥ 2 walk-offs from wherever Bell can land.

AI_REQUIREMENTS:

- Clock: no recast; heal-less; optional `escapeRoute` at soph 6 on the leader variant (walks to a gallery, not through the player).
- Execute: threshold hold + Bell-target at soph 4.
- Scribe: caster; skip recast Weaken.
- Soph 4–6. `groupTactics` on.

VARIANTS:

- `FSN-BELL-COURT/NO-LEADER` — teaching CADRE.
- `FSN-BELL-COURT/NO-SCRIBE` — fallback to `FSN-BELL-CUT` if the run cannot support three backliners.

STATUS: PROPOSED

---

### FSN-PLATE-LINK

FORMATION_ID: `FSN-PLATE-LINK`  
RELATIVE_DIFFICULTY: CADRE (kit band 1)  
ENEMIES:

- `ROLE-PLATE` — `rook` / proposed `plate_warden` — pack median + 1
- `ROLE-REDIRECT` — `king` / proposed `pain_suture` — pack median
- `ROLE-CANTOR` — `queen` / proposed `pale_cantor` or live default with `starter-heal` — pack median — self-heal + Shield

VARIANT_RULES:

- Unlock after `FSN-WARD-MEND` **and** `FSN-NULL-WALL` (or any fight where the player brought a summon — Pain Link eats pets). Wave 2 “Plate Choir.”
- Elite: Plate only. Suture and Cantor stay junior.
- Absorb is the extra life — Plate HP is **lower** than golem. Do not also spawn `iron_golem` on this sheet.
- Pain Link is not Mirror. Suture never gets `spell-mirror`.
- Cantor: Blood Mend (self) + Shield (ally). **No** Inferno. At most one Cantor. **Do not ship this id until ally `targetId` apply exists** (Shield on the Plate, Ward Plate on the Cantor).
- Do not also roll random summoner overlay onto any body.

SPELL_POOL_INTERACTIONS:

- Ward Plate absorb then HP. Unused absorb expires (2 turns in SPELL_PROPOSALS). DoTs chew the plate. Cursed Wound does not reduce absorb; it does halve Cantor mend.
- Pain Link: next HP hit → nearest hostile to the Suture. ELITE Suture stands so nearest hostile is the Wisp. BASE: Link when the player is adjacent (self-punish) **or** a summon is nearer.
- Shield + Plate is two defense layers, not a lock. Player can wait expiry.

TACTICAL_PLAN:

- Plate walks into the path and Plates the Cantor (ELITE) or self (BASE). Suture Links and holds. Cantor Shields the Plate when the Plate is under 50% effective, else self-mends.
- If the Plate dies, remaining pair is redirect + glass healer — intended.

SYNERGY:

- Absorb + redirect + healer. Hit the plate and your pet dies, or you eat the swing; wait and the absorb expires; ignore and the Cantor refills.

PLAYER_THREAT:

- Long, structured. Spike is low. Fail is dumping Inferno into a fresh 18 absorb **and** a Link.

COUNTERPLAY:

- Wait 2 turns. DoT the plate. Hit a different enemy (Jackal is not here — hit the Suture after Link expires, or the Cantor with a DoT). Desummon so Link has only the player (then don’t melee).
- Cursed Wound the Cantor. Walk around the Plate (init 0.80 / MP-poor).

MAP_REQUIREMENTS:

- `fortress` courtyard + gallery, or `arena` with pillars. Cantor needs two walk-offs. Never a closed ring.
- No Thorned Ground on the only path to the Cantor.

AI_REQUIREMENTS:

- Plate: charger; no retreat above 40% effective; replace-don’t-stack plate.
- Redirect: holder; VETERAN summon-eat.
- Cantor: healer + ally Shield. Same apply gate as `FSN-QUIET-CHOIR`.
- Soph 4–6. `AI_BACKLINE_PROTECT` on. `groupTactics` on.

VARIANTS:

- `FSN-PLATE-LINK/NO-CANTOR` — BRIGADE-shaped CADRE: Plate + Suture only (if ally heal/shield apply is missing).
- `FSN-PLATE-LINK/GOLEM` — fallback: live `iron_golem` instead of Plate if absorb is not ready. Then this is `FSN-WARD-MEND` + Link — still distinct, but **do not** call it absorb.

STATUS: PROPOSED

---

### FSN-MIST-HUNT

FORMATION_ID: `FSN-MIST-HUNT`  
RELATIVE_DIFFICULTY: CADRE (kit band 1)  
ENEMIES:

- `ROLE-MIST` — `knight` / proposed `mist_walker` — pack median — self dash
- `ROLE-LURKER` — `knight` / proposed `shadow_lurker` — pack median — Veil + flank
- `ROLE-LEECH` — `pawn` / proposed `leech_familiar` — pack median − 1 — sacrificial familiar

VARIANT_RULES:

- Unlock after `FSN-FROST-KNIFE` **and** `FSN-VEIL-HEX` (or `FSN-MEND-KNIFE`). Wave 2 “Mist Hunt.”
- Two knights, two jobs: Mist is **self-teleport**; Lurker is flank/veil. Distinct from `FSN-RIFT-KNOT` (Swap in/out). No Swap on this sheet.
- Elite: Mist only. Lurker and Leech stay junior so two dash elites cannot surround.
- Familiar cap 1. Shares `ENEMY_SUMMON_CAP`. Lifespan fade **does** fire on-death (heal owner + Mark killer tile). Ignore-the-pet is the designed answer.
- Fog of War is **not** required. If it is up, do not also give CHAMPION fog-reentry on this sheet (too much hidden information).
- No Inferno. No Root (Mist can still Step through Root — pairing them hides the dash identity). No Pain Link (that is `FSN-PLATE-LINK`).

SPELL_POOL_INTERACTIONS:

- Mist Step: self free-cell dash, CD 2, ignores LoS. Does not trip wires. Dest must be free, non-void, not the player’s last exit.
- Veil on the Lurker shreds RES/SP. Enrage on the Leech **self** after a familiar death is ELITE leech — off the base sheet (no buffer apply gate).
- Familiar is hpScale 0.25, no kit. Killing it heals the Leech and Marks **your** tile — Ricochet is not on this pack, so Mark is a warning, not a bounce.

TACTICAL_PLAN:

- Leech spawns the familiar on a tile the player wants to Strike (body-block / bait). Mist Steps to a rear/side tile then Strikes next turn. Lurker takes the **other** flank and refuses frontals at soph ≥ 3.
- Never turn-1 surround. Start ≥ 4 apart. Familiar is not a fourth hostile for spacing vs the player until it exists — place it ≥ 2 from the player’s last exit.

SYNERGY:

- Dash + lurker + bait. Three angles, one skippable pet. Combination of Wave 1 lurker with Wave 2 dash and familiar.

PLAYER_THREAT:

- Getting Veiled and stabbed from a tile that was empty. The Leech is the off-switch if you refuse to feed it. Spike is a flank Strike, not a nuke.

COUNTERPLAY:

- Ignore the familiar. Kill the Leech. Occupy the landing ring. Face the Lurker in a doorway. Root does not stop Mist Step — zone the ring or Barrier the dest instead.
- Guardian body-block. Frost Nova (player) when they appear.

MAP_REQUIREMENTS:

- `asymmetric` or `ruinsIslands` with **two** flanks plus a rear tile that is not the only exit. Reject cramped `corridorMaze` (dash in a closet is a lock **or** useless).
- No Fog required. No sealed alcove.

AI_REQUIREMENTS:

- Mist: flanker + valued Step (VETERAN).
- Lurker: flanker + frontal-refuse at soph 3.
- Leech: summoner sacrificial + skip if familiar lives; proposed cooldown fall-through to Strike (today summoner skip-locks — must not ship as a wasted-turn bug).
- Soph 4–6. `groupTactics`: one focus. Do not enable all three to peel the wisp.
- Blackboard: `plannedStepDest` so Mist and Lurker do not stack on the same rear tile.

VARIANTS:

- `FSN-MIST-HUNT/NO-LEECH` — BRIGADE-shaped CADRE if familiar id is not ready.
- `FSN-MIST-HUNT/E-STEP` — elite Mist, never end adjacent if a Step exists.

STATUS: PROPOSED

---

### FSN-SHARD-BATTERY

FORMATION_ID: `FSN-SHARD-BATTERY`  
RELATIVE_DIFFICULTY: COURT (kit band 2, AI soph 6–8)  
ENEMIES:

- `ROLE-TURRET` — `rook` / proposed `stone_castellan` — pack median + 1 — `isLeader` — stationary summon
- `ROLE-RICOCHET` — `queen` **without heal** / proposed `ricochet_vicar` — pack median — conditional bounce
- `ROLE-GLYPH` — `bishop` / proposed `glyph_sower` — pack median — Mark + Poison
- Optional fourth: `ROLE-LANCER` junior **or** omit — if present, owns the **same** file as the turret, not a second file

VARIANT_RULES:

- Unlock after `FSN-FILE-WIRE` **or** `FSN-MARK-CONFLAGRATION` **and** a leader-boost CADRE. Wave 2 “Shard Battery.”
- One elite only: the Castellan-leader. Others stay junior so boost is the late scare, not four elites.
- Turret cap 1, lifespan 4, `mp: 0`, must not path. Do not also roll wolf/archer. Global summon cap still 2 — this sheet uses 1.
- Ricochet is the **one** elite rare. It fires only if Mark / hazard / root is **public** on the primary. Solo unmarked player → Frost, not bounce. No `starter-blast` on this sheet (second `hitsMultiple`).
- Glyph Marks a tile the player can step off. Poison is the DoT; do not also Inferno (turret shard is the gun).
- InstantKill / betrayal stay off. `bottleneckControl` (8) only if a gallery exists. `escapeRoute` (6) on: wounded Castellan walks to the gallery, not through the player.
- Dungeon depth may not add a fifth hostile to this id. Extra dungeon bodies spawn elsewhere, outside Chebyshev 4, as a separate PAIR.
- Teaching BRIGADE `FSN-SHARD-BATTERY/LANE` (variant): drop Ricochet and optional Lancer — Castellan + Glyph only.

SPELL_POOL_INTERACTIONS:

- Turret linear shard owns a file. Glyph Mark on a cell of that ray ×2 the **next** spell (confirm Mark × shard; if Mark is tile-next-spell, the shard must be a real spell apply, not a hidden tick).
- Ricochet 14 or 28. The player chooses whether the bounce exists (stand on Mark/hazard/root next to a wisp, or don’t).
- Iron Skin / Shield on the turret, not a second turret.
- `spell-rallying-cry` stays false.

TACTICAL_PLAN:

- Turn 1–2: Castellan places the turret on a choke facing the player, then Shields it. Glyph Marks a step-off cell on the ray, then Poison. Ricochet waits for public setup.
- Optional Lancer holds the same file. If the turret dies, the lane opens; Castellan may retreat (`escapeRoute`) rather than suddenly one-shot.
- Leader boost 10% × fallen escort. Four bodies means a late Castellan can become stout — cut the leader early or accept a longer finish.

SYNERGY:

- Stationary gun + conditional bounce + Mark. Court-scale geometry. Sophistication and a fourth body are the unlock, not a new monster.

PLAYER_THREAT:

- Highest geometry-structured threat in this drop. Still turn-based. Failure is standing on the marked file with a wisp clumped. Bounce is optional.

COUNTERPLAY:

- Walk off-axis. Burst the turret (glass gun). Step off Mark. Spread from your wisp. Sit on the placement cell. Barrier the lane. Kill the Castellan down a gallery.
- Player Chain Lightning into the clump is fair — the pack’s own bounce is predicate-gated.

MAP_REQUIREMENTS:

- `fortress` courtyard + gallery, or `chessboard` with a 4-tile file **plus** a file the player can take. Never a closed ring. Weight 0 on cramped 1-tile closets.
- Turret placement ring: ≥ 3 free cells, none void. Player must have a tile off the shard ray.

AI_REQUIREMENTS:

- Turret owner: summoner + proposed cap/cooldown fall-through (Frost or Shield, never skip-lock). New summon AI `turret` — do not reuse bomber.
- Ricochet: artillery; skip bounce without `bounceOn` flags (`AI-TEM-05`). Heal-less.
- Glyph: caster + “do not recast Mark on a vacated tile.”
- Optional Lancer: linear-only, same `ownedFile` as turret.
- Soph 6–8. `groupTactics` on. `erratic` (5) may apply to **one** escort, not the Castellan.
- Proposed: escorts do not path a closed box.

VARIANTS:

- `FSN-SHARD-BATTERY/LANE` — BRIGADE: Castellan + Glyph only (ship if Ricochet predicate is not ready).
- `FSN-SHARD-BATTERY/NO-LANCER` — COURT of three.
- `FSN-SHARD-BATTERY/NO-MARK` — Glyph Poison only; Ricochet then needs a public hazard/root — if neither exists, Ricochet Frosts forever (still a court of poke).
- `FSN-FILE-WIRE/TURRET` remains the file COURT; do not merge ids.

STATUS: PROPOSED

---

## Progression (relative unlock graph)

Drops 1–2 still stand. This drop **meshes**; it does not replace.

```
PAIR:    IRON-TIDE          FILE-GUARD          MEND-KNIFE
              \                 |                    /
CELL:     HOOK-SLAM        WIRE-ROOT            BELL-CUT
              \                 |                    /
BRIGADE:  GRAVITY-TAX      EMBER-MEND           (WIRE-ROOT/DECOY)
              \                 |                    /
CADRE:    FILE-WIRE        PLATE-LINK     BELL-COURT     MIST-HUNT
              \                 |                    /
COURT:                    SHARD-BATTERY     FILE-WIRE/VICAR
```

Cross-catalog prereqs (relative mastery, not XP):

| This id | Also requires from earlier catalogs |
| :--- | :--- |
| `FSN-IRON-TIDE` | `FSN-IRON-BATTERY` (or parallel first PAIR) |
| `FSN-FILE-GUARD` | `FSN-IRON-BATTERY` (or parallel first PAIR) |
| `FSN-MEND-KNIFE` | `FSN-WARD-MEND` **or** `FSN-FROST-KNIFE` |
| `FSN-HOOK-SLAM` | `FSN-EMBER-RIFT` (or player-used Swap) |
| `FSN-BELL-CUT` | `FSN-ROT-CUT` |
| `FSN-WIRE-ROOT` | `FSN-FILE-GUARD` **or** `FSN-TIDE-LOCK` |
| `FSN-EMBER-MEND` | `FSN-WARD-MEND` + seen ember/Inferno |
| `FSN-GRAVITY-TAX` | `FSN-HOOK-SLAM` |
| `FSN-FILE-WIRE` | `FSN-FILE-GUARD` + `FSN-WIRE-ROOT` |
| `FSN-BELL-COURT` | `FSN-BELL-CUT` |
| `FSN-PLATE-LINK` | `FSN-WARD-MEND` + (`FSN-NULL-WALL` or a summon this run) |
| `FSN-MIST-HUNT` | `FSN-FROST-KNIFE` + (`FSN-VEIL-HEX` or `FSN-MEND-KNIFE`) |
| `FSN-SHARD-BATTERY` | (`FSN-FILE-WIRE` or `FSN-MARK-CONFLAGRATION`) + a leader CADRE |

A run may skip a **branch**. It must not skip a **grade**.

### Deferred — Wave 3 packs (not this drop)

Sibling [`docs/automation/ENEMY_ELITE_EVOLUTION_2026-09-02.md`](../automation/ENEMY_ELITE_EVOLUTION_2026-09-02.md) (open as of this run) names **new** families and packs that consume SPELL_PROPOSALS Wave 2 verbs. This catalog does **not** mint `FSN-*` ids for them. The next formation drop should write those combinations rather than cloning Wave 2 sheets.

| Wave 3 pack | Members (do not FSN this drop) |
| :--- | :--- |
| Wick Court | `fuse_binder` + `sink_chanter` + `bash_bruiser` |
| Ice File | `rime_mason` + `rank_lancer` + `snare_weaver` |
| Smoke Hunt | `smoke_thurifer` + `glass_sniper` + `dim_optic` |
| Plus Battery | `plus_cutter` + `sink_chanter` + `glyph_sower` |
| Tempo Choir | `tempo_precentor` + `ignite_alchemist` + `plague_rat` |
| Absolve Race | `ash_absolver` + `plate_warden` + `ignite_alchemist` |
| Rescue Line | `hook_chaplain` + `leash_warden` + `glass_sniper` |
| Bastion Gate | `pylon_prelate` + `goad_herald` + `glass_sniper` |
| Twin Plate | `twin_tether` + `plate_warden` + `pale_cantor` |
| Finish Line | `coup_duelist` + `ignite_alchemist` + `plague_rat` |
| Fog Fuse | `smoke_thurifer` + `fuse_binder` + `mist_walker` |

Do **not** pack `coup_duelist` with `bell_sexton` as a teaching pair (Wave 3 rule). `FSN-BELL-CUT` stays the delayed-clock lesson.

---

## Implementation notes (for a later engineer — not this drop)

These sheets need the same pack composer as drops 1–2, plus Wave 2 verbs in this order (from elite-evolution §8):

1. Numeric kit band into `buildEnemyKit` (`WX` 12035). **`FSN-IRON-TIDE` band 0 can ship first.** `FSN-MEND-KNIFE` needs band 1 heal.
2. Keep family HP through `calcEnemyMaxHp` (`WX` 12084–12089).
3. Explicit `enemy.role` / `aiProfile` so healAmount and Enrage kits do not collapse (`docs/ENEMY_AI_EVOLUTION.md` AI-SYS-04).
4. Ally buff apply (`targetId` on Shield / Iron Skin / Ward Plate). **`FSN-PLATE-LINK` and `FSN-EMBER-MEND`’s ally Shield must not ship before that apply exists.** `FSN-MEND-KNIFE` is self-mend and does **not** wait on it.
5. Linear kit clone + `AI-SYS-06` for `ROLE-LANCER`.
6. `effectCategory` callers for `applyPushback` / `applyAttract`.
7. `rootTurns` (walk lock, spells legal).
8. Trap redefine (not `placeBarrier`).
9. Absorb pipeline; delayed execute (Grave Bell); turret summon AI; Pain Link redirect; Glyph Tax zone AP; Mist Step `teleportMode`.
10. Summoner cooldown fall-through (turret and familiar skip-lock today).
11. Cap the summoner overlay (`WX` 12047–12050) — not a formation task, but COURT turret sheets assume the lottery does not add a second engine.

They do **not** need new pixel patterns, RAF edits, map-generation rewrites, turn-order changes, or damage-formula edits. Map **selection** is a filter on already generated maps.

Do not implement those hooks in the same change as this catalog.

### Do not ship before (honesty)

| Sheet | Gate |
| :--- | :--- |
| `FSN-HOOK-SLAM`, `FSN-GRAVITY-TAX` | attract + push callers + dest legality |
| `FSN-BELL-CUT`, `FSN-BELL-COURT` | Grave Bell delayed hook; heal-out remains possible |
| `FSN-WIRE-ROOT`, `FSN-FILE-WIRE` | real trap + rootTurns |
| `FSN-PLATE-LINK` | absorb + Pain Link + ally `targetId` |
| `FSN-MIST-HUNT` | Mist Step + sacrificial on-death + summoner fall-through |
| `FSN-SHARD-BATTERY` | turret AI (`mp: 0`, no path) + Ricochet `bounceOn` predicate |
| `FSN-FILE-GUARD` | linear-only approach (kit clone optional if AI already refuses off-file) |

---

## Sources (line-accurate, 2026-09-02)

- Kits / inference / decide / summoner skip: `src/frontend/src/engine/enemyAI.ts` 156–178, 421–449, 1649–1694, 1819–1893
- Kit assignment + summoner roll: `src/frontend/src/components/WorldExploration.tsx` 12035, 12047–12058
- Family lottery + HP overwrite: `WorldExploration.tsx` 5755, 5862–5952, 12084–12089
- Ember / tide melee hooks: `WorldExploration.tsx` 16877–16908
- Void reflect: `src/frontend/src/engine/castHelpers.ts` 328–337
- Push / attract (no caller): `src/frontend/src/engine/occupancy.ts` 462, 517
- Gates, summon cap, kamikaze: `src/frontend/src/data/gameConstants.ts` 153–210, 266–301
- Families: `src/frontend/src/types/gameTypes.ts` 12–20
- Spells: `src/frontend/src/data/spellData.ts` (`starter-heal` 85–101 self-only; Enrage ally 274–291; unique flags 143–686)
- Map archetypes: `src/frontend/src/engine/mapGen.ts` 4–42
- Wave 2 families / packs: `docs/automation/ENEMY_ELITE_EVOLUTION_2026-09-01.md` §3–§4
- Proposed spells: `docs/automation/SPELL_PROPOSALS_2026-08-31.md` (Wave 1 verbs this drop consumes)
- AI modules referenced: `docs/ENEMY_AI_EVOLUTION.md` / `docs/ENEMY_AI_EVOLUTION_2026-09-01.md` AI-SYS-06, AI-ROL-05, AI-TEM-04, AI-TEM-05
- Drop 1: `docs/design/ENEMY_FORMATIONS_2026-08-31.md`
- Drop 2: `docs/design/ENEMY_FORMATIONS_2026-09-01.md`
