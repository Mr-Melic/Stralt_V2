# Enemy synergy and formation catalog (drop 2)

**Author:** Enemy Synergy and Formation Designer  
**Date:** 2026-09-01  
**Status:** PROPOSED — design only. No production code, spawn tables, or AI changes in this drop.

The 2026-08-31 catalog already covers the seven teaching pairs (protector + artillery, controller + assassin, summoner + support, tank + healer, hazard + displacer, debuffer + finisher, kiter + mover). This drop **does not reuse those `FSN-*` ids**. It builds **new experiences from combinations**: proposed families from `docs/automation/ENEMY_ELITE_EVOLUTION_2026-08-31.md` standing on the same chess chassis, plus a few overlays that only flip kit and AI contract.

No new sprites. Higher progression unlocks more sophisticated **compositions**, not a last level band.

---

## Grounding (live, 2026-09-01)

Re-read this checkout. Line numbers moved since 2026-08-31.

| Fact | Where |
| :--- | :--- |
| Kits by piece | `enemyAI.ts` `ENEMY_KITS` 156–178 |
| `buildEnemyKit` | `enemyAI.ts` 187+ |
| Battle-start kit assignment still passes `currentMap.levelZone` (object) | `WorldExploration.tsx` 12484 |
| `inferArchetype` still heal-first (`spellType === "heal"` **or** `healAmount > 0`) | `enemyAI.ts` 420–449 |
| `decideEnemyAction` | `enemyAI.ts` 1648–1692 |
| `decideSummonerAction` still **skips** on missing spell / cap / cooldown (no frost fall-through) | `enemyAI.ts` 1818–1893 |
| Summoner overlay roll | `WorldExploration.tsx` 12502–12503 |
| Min start spacing | `WorldExploration.tsx` `MIN_CHEBYSHEV = 4` at 6340 |
| Families (live) | `gameTypes.ts` 12–20 — seven overlays + `default` |
| AI gates | `gameConstants.ts` 200–209 |
| Summon cap / cooldown | `gameConstants.ts` 298–301 |
| Kamikaze constants | `gameConstants.ts` 271–285 |
| Map archetypes | `mapGen.ts` 4–42 |
| Enemy-legal unique spells | `spellData.ts` 143–541 (`usableByEnemy: true`) |

### Still true (do not regress)

1. Intended kit band is 0 / 1 / 2. Live assignment is **band 0** until `buildEnemyKit` receives a number.
2. `inferArchetype` never returns `summoner`. Summoner slots need `isSummoner` + a usable summon id.
3. Any `healAmount` steals healer: `starter-heal`, `starter-drain`, `spell-drain-courage`, `spell-lifesteal-nova`, `spell-rallying-cry`. **Do not put drain or nova on a buffer, arbiter, storm, or assassin.**
4. `starter-heal` is **self-only** (`range: 0`, `targetType: "self"`). Ally mend on this drop is `starter-shield` / `spell-iron-skin` (both `targetType: "ally"`, range 3) until a ranged heal id exists.
5. `spell-rallying-cry` stays `usableByEnemy: false`. Buffers use Enrage / Haste / Iron Skin.
6. `summon-sentinel`, `summon-bomber`, `summon-wisp` stay enemy-false except as **late COURT flag-unlocks** already named in drop 1 (`ROLE-WARDEN` / `ROLE-FUSE` / `ROLE-CANTOR`).
7. `starter-blast` (Chain Lightning, 2 bounces) has **no** `usableByEnemy` flag. Treat as **proposed artillery only** after apply already bounces player-side units. Do not invent `thunder_clap` / `void_collapse` / `shadow_strike` — those ids are not in frontend `spellData.ts`.
8. **Banned:** `ENEMY_AI_TIER_GATES.instantKill` (9), `betrayal` (10), sealed pockets, lava on every approach, turn-1 surround, `spell-barrier` / `spell-mirror` / `spell-timestep` on enemies.

### Relative difficulty (same grades as drop 1)

| Grade | Kit band | AI sophistication | Pack size | Rare spells | Unlock (relative) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PAIR | 0–1 | 1–2 | 2 | none | After the matching drop-1 PAIR, or as a first composed fight if that pair is the teaching tool |
| CELL | 0–1 | 2–3 | 2–3 | none | After the player answers the related PAIR without a death |
| BRIGADE | 1 | 3–4 | 3 | at most one | After CELL tools (heal / armor / a DoT / a summon) |
| CADRE | 1–2 | 4–6 | 3–4 + optional summon | one, sometimes two non-stacking | After displacement **or** a player summon **and** the named prerequisite sheets |
| COURT | 2 | 6–8 | 4 + capped summons | one elite rare | After a leader-boost CADRE from **either** catalog |

Dungeon depth may amplify a grade (extra body, +tier step). It must not jump a PAIR sheet to COURT. No sheet is a final band.

Enemy levels inside a pack stay **relative to each other**:

- Frontliner (warden / tank / bruiser / closer): pack median + one step.
- Backliner (sniper / buffer / cantor / storm / glyph / censor): pack median.
- Glass (rat, martyr, lurker): pack median or −1.
- PAIR/CELL: at most **one** step between highest and lowest. BRIGADE+ may use two.

### Proposed role overlays (drop 2)

Drop 1 overlays (`ROLE-PROTECTOR`, `ROLE-ARTILLERY`, …) still apply. These are **additional jobs**. Each is a piece + optional **proposed** family + kit extras + AI contract. Not canister rows.

| Overlay id | Piece | Family | Extra kit (beyond `ENEMY_KITS`) | AI contract |
| :--- | :--- | :--- | :--- | :--- |
| `ROLE-BUFFER` | `king` | proposed `hex_chorister` (else default) | `spell-enrage`, `spell-haste`, `spell-iron-skin` — **no** heal, inferno, or drain | Ally-first buffer (`AI-ROL-05`). Until that profile exists, do **not** spawn this overlay on a heal kit |
| `ROLE-BRUISER` | `pawn` or `knight` | proposed `crimson_spawn` (else default / `ember_knight`) | `physical_attack`, `spell-enrage`; `spell-sacrifice` only if HP ≤ `ENEMY_WOUNDED_SACRIFICE_HP_PCT` | charger or flanker; `aiStrategy: "berserk"` only below 30% HP |
| `ROLE-SNIPER` | `bishop` | proposed `glass_sniper` (else `wraith_bishop`) | `starter-frost`, `spell-mark`; damage spells treat **minRange 3** | caster; refuse any dest Chebyshev ≤ 2 from the player |
| `ROLE-WARDEN` | `rook` | proposed `leash_warden` (else `iron_golem`) | `starter-shield`, `spell-iron-skin`; Swap peel only at BRIGADE+ | reuse summon **guardian** spacing (`AI_BACKLINE_GUARD_DISTANCE`) |
| `ROLE-CANTOR` | `queen` | proposed `pale_cantor` (else `bone_scribe`) | `starter-heal`, `starter-shield` — **no** Inferno | healer; ally tool is Shield (Blood Mend is self) |
| `ROLE-KAMIKAZE` | `pawn` | proposed `cinder_martyr` | `spell-inferno`; `spell-haste` at BRIGADE | reuse summon **bomber** (`AI_KAMIKAZE_MIN_TARGETS` 2, low-HP 0.3) |
| `ROLE-GLYPH` | `bishop` | proposed `glyph_sower` (else default) | `spell-mark`, `starter-poison` | caster; Mark only if the player can step off |
| `ROLE-ANTI-SUMMON` | `bishop` | proposed `null_censor` (else `bone_scribe`) | `spell-weaken`, `spell-expose`; `spell-cursed-wound` at CADRE — **no** drain | caster; raise summon threat to wisp-level **for this body only** |
| `ROLE-GAP-CLOSER` | `knight` | proposed `rust_reaver` (else default) | `physical_attack`, `spell-haste`; Swap-in only at CADRE when Chebyshev ≥ 3 | charger |
| `ROLE-PULLER` | `knight` | proposed `rift_hook` (else `void_mirror`) | `spell-swap`, `starter-frost` | cast-Swap-first; destination must be free, non-hazard, with a walk-off |
| `ROLE-BLINKER` | `knight` | proposed `blink_cutter` | `physical_attack`, `spell-swap` (ally), `spell-shadow-veil` | flanker; Swap is **self-out**, not player-in (that is `ROLE-PULLER`) |
| `ROLE-ARBITER` | `king` | proposed `coil_arbiter` (else default) | `spell-slow`, `starter-frost` — **no** `spell-drain-courage` until `aiProfile` exists | controller; second Slow refreshes, does not stack past −2 MP |
| `ROLE-STORM` | `queen` **without** heal | proposed `storm_caller` (else `wraith_bishop`) | `starter-frost`; optional `starter-blast` only if bounce apply is honest; Inferno at CADRE | artillery (`AI-ROL-08`); heal-less so inference stays caster |
| `ROLE-LURKER` | `knight` | proposed `shadow_lurker` (else default) | `physical_attack`, `spell-shadow-veil` | flanker; skip rather than take a frontal if soph ≥ 3 |

Drop-1 `ROLE-SUMMONER` + proposed `brood_chanter` (always `isSummoner`, no random overlay on that body) is reused in `FSN-NULL-BROOD`.

### Fair-fight rules (every sheet)

Same as drop 1, plus:

- Engagement pocket: **≥ 2 walk-off tiles** that are not hazard, void, portal, or barrier.
- Hostiles start ≥ Chebyshev 4 from each other and from the player.
- Kamikaze never detonates on a single full-HP player. `AI_KAMIKAZE_MIN_TARGETS` stays 2 unless the martyr is ≤ 30% HP.
- Swap / pull dest: free floor, not lava / spikes / void / portal, player keeps ≥ 1 escape tile.
- Dual Slow / Frost MP tax: cap applied MP debuff at **−2**. If live stacking is additive, only **one** member carries Slow.
- One Inferno cadence per pack unless a variant explicitly splits targets. Never two Infernos into the same body on the same turn.
- `starter-blast` may bounce player + one summon. It must not be paired with a second `hitsMultiple` source on the same sheet.
- No Glass Realm on stacked-DoT sheets. No Time Warp on Mark windows.
- Summons stay at cap 2. One dedicated summoner per pack.
- Leader boost (default 10% per fallen non-leader) from CADRE up. The player can cut the leader first.

---

## Index (both catalogs)

| Id | Grade | Combo | Catalog |
| :--- | :--- | :--- | :--- |
| `FSN-IRON-BATTERY` | PAIR | protector + artillery | 2026-08-31 |
| `FSN-WARD-MEND` | PAIR | tank + healer | 2026-08-31 |
| `FSN-HEX-BLOOD` | PAIR | buffer + bruiser | this drop |
| `FSN-GLASS-WARD` | PAIR | warden + sniper | this drop |
| `FSN-FROST-KNIFE` | CELL | controller + assassin | 2026-08-31 |
| `FSN-ROT-CUT` | CELL | debuffer + finisher | 2026-08-31 |
| `FSN-TIDE-LOCK` | CELL | kiter + mover | 2026-08-31 |
| `FSN-MIRROR-REAVE` | CELL | reflect + gap-closer | this drop |
| `FSN-PAPER-PLAGUE` | CELL | dual applicator + scribe | this drop |
| `FSN-NULL-WALL` | CELL | anti-summon + tank | this drop |
| `FSN-KENNEL-LITANY` | BRIGADE | summoner + support | 2026-08-31 |
| `FSN-EMBER-RIFT` | BRIGADE | hazard + displacer | 2026-08-31 |
| `FSN-HOOK-FUSE` | BRIGADE | puller + kamikaze | this drop |
| `FSN-TIDE-STORM` | BRIGADE | kiter + storm artillery | this drop |
| `FSN-VEIL-HEX` | BRIGADE | lurker + buffer | this drop |
| `FSN-TRI-BASTION` | CADRE | tank + healer + artillery | 2026-08-31 |
| `FSN-MARK-CONFLAGRATION` | CADRE | mark + inferno + finisher | 2026-08-31 |
| `FSN-PACK-PINCER` | CADRE | summoner + assassin + tank | 2026-08-31 |
| `FSN-MIRROR-SCRIPTORIUM` | CADRE | displacer + support + assassin | 2026-08-31 |
| `FSN-ASH-COURT` | CADRE | ember + martyr + glyph | this drop |
| `FSN-QUIET-CHOIR` | CADRE | cantor + chorister + warden | this drop |
| `FSN-BROKEN-GLASS` | CADRE | sniper + mirror + reaver | this drop |
| `FSN-RIFT-KNOT` | CADRE | puller + blinker + arbiter | this drop |
| `FSN-NULL-BROOD` | CADRE | brood + censor + golem | this drop |
| `FSN-CROWN-ESCORT` | COURT | dual golem + king + controller | 2026-08-31 |
| `FSN-CHORUS-THRONE` | COURT | choir + sniper, leader | this drop |

---

## Formations

### FSN-HEX-BLOOD

FORMATION_ID: `FSN-HEX-BLOOD`  
RELATIVE_DIFFICULTY: PAIR (kit band 1)  
ENEMIES:

- `ROLE-BUFFER` — `king` / proposed `hex_chorister` — pack median — mid-back
- `ROLE-BRUISER` — `pawn` / proposed `crimson_spawn` — pack median + 1 — front

VARIANT_RULES:

- Band 0: **do not spawn this id** (Enrage is not on default kits). Show `FSN-IRON-BATTERY` band 0 instead.
- Band 1: Buffer has Enrage + Haste. Bruiser has Strike only until Enrage lands, then swings.
- Elite: Bruiser only. Buffer never gets Inferno (would spike and steal the “other people’s turns” identity).
- `spell-sacrifice` is off on PAIR. `aiStrategy: "berserk"` is off until the Bruiser is actually below 30% HP.
- Random 30% family lottery is **off**.

SPELL_POOL_INTERACTIONS:

- Enrage is `targetType: "ally"`, range 3, +40% DMG for 2 turns. The Buffer must spend it on the Bruiser, not on itself.
- Haste (+2 MP, 1 turn) on the Bruiser is the “he reaches you” beat, not a second damage buff.
- No drain / nova (healAmount → healer inference; the Buffer would stop buffing).

TACTICAL_PLAN:

- Turn 1: Buffer Enrages the Bruiser if in range; otherwise steps into range 3 and holds.
- Bruiser walks a **front** lane and Strikes only when it can reach this turn (`decideCharger` hold beyond `ENEMY_REACHABLE_STEP_BUDGET`).
- If the Bruiser is healthy, the Buffer Hastes it. If the Bruiser is dead, the Buffer **holds** (no invented nuke).

SYNERGY:

- Buffer + bruiser. The pawn’s Strike is ordinary until the king pays for it. Combination, not a new sprite.

PLAYER_THREAT:

- One readable buff window. Misplay is ignoring the king and trading into an Enraged melee.

COUNTERPLAY:

- Kill or Slow the Buffer first (glass HP family). The Bruiser without Enrage is a fat Strike.
- Weaken on the Bruiser cancels the fantasy of the +40%.
- Do not leave the Bruiser at 25% “to finish later” once berserk can attach.

MAP_REQUIREMENTS:

- `openField` or `arena`. Buffer needs a tile at range 3 from the Bruiser that is **not** the player’s only exit.
- Reject a 1-tile tunnel (Enrage + forced melee reads as a lock).

AI_REQUIREMENTS:

- Buffer: proposed ally-first (`AI-ROL-05`). Until apply actually buffs `targetId`, this sheet must not ship.
- Bruiser: charger (pawn) or flanker (knight variant).
- Soph 1–2. `groupTactics` not required.

VARIANTS:

- `FSN-HEX-BLOOD/KNIGHT` — Bruiser chassis `knight` / `ember_knight` (same kit, flank path).
- `FSN-HEX-BLOOD/E-RAGE` — elite Bruiser, still no Sacrifice on PAIR.

STATUS: PROPOSED

---

### FSN-GLASS-WARD

FORMATION_ID: `FSN-GLASS-WARD`  
RELATIVE_DIFFICULTY: PAIR (kit band 0–1)  
ENEMIES:

- `ROLE-WARDEN` — `rook` / proposed `leash_warden` or live `iron_golem` — pack median + 1 — on the sniper’s threat axis
- `ROLE-SNIPER` — `bishop` / proposed `glass_sniper` or live `wraith_bishop` — pack median — back, LoS down a **wide** lane

VARIANT_RULES:

- Band 0: Strike + Frost only. Warden is a body-block, not a Shield bot.
- Band 1: Warden gains `starter-shield` on the Sniper. Sniper gains `spell-mark` only at CELL+ (see `FSN-BROKEN-GLASS`).
- Elite: Warden **or** Sniper, never both at PAIR.
- Unlock after the player has answered `FSN-IRON-BATTERY` **or** as a parallel first PAIR if that sheet is skipped — same grade, different puzzle (min-range vs fat artillery).
- If pack size would be 1, **reroll this id** (sniper must not spawn solo).

SPELL_POOL_INTERACTIONS:

- Frost Bolt (−1 MP) from minRange 3. Closing is the correct play; the Warden is why it costs a turn.
- Shield is RES, not reflect. Player physical still works.
- Mark stays off this PAIR so it does not clone `FSN-MARK-CONFLAGRATION`.

TACTICAL_PLAN:

- Warden stands on the line between player and Sniper (`AI_BACKLINE_GUARD_DISTANCE` 1).
- Sniper holds Chebyshev ≥ 3 and spends AP on Frost. If the player enters 2, the Sniper steps away (`AI-POS-01` / archer keep-range), never Nova.

SYNERGY:

- Protector + artillery, **re-keyed** as min-range sniper + peel. Same chassis as `FSN-IRON-BATTERY`, different contract: the bishop **dies if caught**, the rook **exists to prevent that**.

PLAYER_THREAT:

- Slow poke while the doorway is occupied. Not a one-shot.

COUNTERPLAY:

- Walk a side aisle and collapse the Sniper (hpMult ~0.6). The Warden without a gun is `FSN-WARD-MEND` minus the heal.
- Swap / Attract yanks the Sniper into Strike range — that is the intended punish.

MAP_REQUIREMENTS:

- `fortress` or `openField` with a **main lane plus one side aisle**. Reject a single-tile tunnel.
- No lava on the only approach to the Sniper.

AI_REQUIREMENTS:

- Warden: guardian-style interpose. Fallback: charger that body-blocks, not a suicide walk.
- Sniper: caster + proposed minRange 3 + refuse dest ≤ 2.
- Soph 1–2.

VARIANTS:

- `FSN-GLASS-WARD/GOLEM` — Warden family stays live `iron_golem` (no proposed leash).
- `FSN-GLASS-WARD/E-SHOT` — elite Sniper, still no Mark on PAIR.

STATUS: PROPOSED

---

### FSN-MIRROR-REAVE

FORMATION_ID: `FSN-MIRROR-REAVE`  
RELATIVE_DIFFICULTY: CELL (kit band 1)  
ENEMIES:

- `ROLE-DISPLACER` **without Swap** — `queen` or `king` / live `void_mirror` — pack median — camps a 3–4 reflect corridor
- `ROLE-GAP-CLOSER` — `knight` / proposed `rust_reaver` — pack median — starts wide

VARIANT_RULES:

- Mirror kit: `physical_attack` + `spell-shadow-veil` only. **No Swap** (that is `FSN-EMBER-RIFT` / `FSN-HOOK-FUSE`). Reflect is the live 25% pre-crit hook.
- Closer kit: Strike + Haste. Swap-in is CADRE (`FSN-BROKEN-GLASS`), not this sheet.
- Elite: Closer only. Mirror never gets `spell-mirror` (flag false; full reflect is a hardlock).
- Unlock after `FSN-TIDE-LOCK` **or** when the player’s last fight used a majority range > 2 — relative, not a level gate.
- Drain / nova stay off (healAmount).

SPELL_POOL_INTERACTIONS:

- Veil (−15% RES/SP) makes the Closer’s Strike land harder. It does not make spells free.
- Haste on the Closer is self/ally +2 MP — one close, not a teleport.
- Live reflect punishes Inferno / Frost on the Mirror. Physical is the open window.

TACTICAL_PLAN:

- Mirror **does not chase**. It holds a corridor so the player’s spells graze it.
- Closer Hastes if Chebyshev ≥ 3, then walks in. It does not path through the Mirror’s tile.

SYNERGY:

- Anti-ranged (reflect) + anti-ranged (gap-close). You cannot shoot the camp **and** you cannot stay at 4 forever.

PLAYER_THREAT:

- Positional. Failure is dumping a nuke into the Mirror then getting Haste-closed. Recoverable: physical the Mirror, Slow the knight.

COUNTERPLAY:

- Open physical on the Mirror. Slow / Frost the Reaver. Fight in the open, not the corridor.
- Player Barrier (enemy cannot use it) cuts the reflect lane.

MAP_REQUIREMENTS:

- `fortress` corridor **plus gallery**, or `chessboard` with a file the Mirror can camp and a **second file** the player can take.
- Reject `corridorMaze` with one file (reflect + forced melee is a lock).

AI_REQUIREMENTS:

- Mirror: generic / holder (`AI-ROL` anti-ranged). VETERAN: no chase.
- Closer: charger with Haste-if-OOR.
- Soph 2–3.

VARIANTS:

- `FSN-MIRROR-REAVE/E-HASTE` — elite Closer, still no Swap-in.

STATUS: PROPOSED

---

### FSN-PAPER-PLAGUE

FORMATION_ID: `FSN-PAPER-PLAGUE`  
RELATIVE_DIFFICULTY: CELL (kit band 1)  
ENEMIES:

- `ROLE-DEBUFFER` ×2 — `pawn` / live `plague_rat` — pack median − 1 — wide start, not stacked
- `ROLE-DEBUFFER` (scribe) — `bishop` / live `bone_scribe` — pack median — back

VARIANT_RULES:

- Distinct from `FSN-ROT-CUT` (rat + **finisher**). There is **no** Sacrifice pawn. Pressure is stacked DoT + Weaken, then the player walks away or kills glass.
- CELL: rats have `spell-venom-strike` + `starter-poison`. Scribe has `spell-weaken` only.
- BRIGADE upgrade (same id, deeper run): Scribe adds `spell-expose`. Still no Inferno.
- Elite: Scribe only. Never two elite rats (double CHAMPION puddles would paint the pocket).
- Unlock after `FSN-ROT-CUT` so the player has already seen one applicator + a closer.
- Iron Golem DoT-immunity (proposed family hook) is a **counter**, not a member of this pack.

SPELL_POOL_INTERACTIONS:

- Poison + Venom stack (`appendDotStack`). Two rats can double-paint. That is the weapon. It is avoidable: each rat is `hpMult` ~0.4–0.55.
- Weaken (−30% dmg, 2 turns) on the player makes a panic trade worse; it does not stop walking.
- Scribe does **not** carry drain (healAmount).

TACTICAL_PLAN:

- Rats apply and **leave** (proposed VETERAN: refuse melee on a target that already has this rat’s venom).
- Scribe stays at 3–4 and Weakens first, Expose later (BRIGADE).
- Hostiles start ≥ 4 apart so turn-1 is not a triple stack on one tile.

SYNERGY:

- Dual status specialist + debuffer. `docs/automation/ENEMY_ELITE_EVOLUTION_2026-08-31.md` “Paper Plague” pack, written as a formation.

PLAYER_THREAT:

- Bleed-out if both rats live. Spike is low. A player who never looks at the scribe still dies slowly, not suddenly.

COUNTERPLAY:

- Kill one rat immediately. Burst the scribe (low HP). Shield / Iron Skin. Do not stand still.
- AoE (`starter-blast` on the **player** bar) is fair here — the pack is three glass bodies.

MAP_REQUIREMENTS:

- `openField` or `arena`. Rats need space to apply-and-leave. Scribe needs range 3.
- No Glass Realm. No Thorned Ground on every approach (DoT + walk tax).

AI_REQUIREMENTS:

- Rats: flanker profile even on pawn (proposed). Fallback: charger that does not camp the player’s only exit.
- Scribe: caster; skip recast of an already-active Weaken (`AI-TEM-04`).
- Soph 2–3. At 4, `groupTactics` lets them share **one** focus, not three focuses.

VARIANTS:

- `FSN-PAPER-PLAGUE/EXPOSE` — BRIGADE: Scribe + Expose.
- `FSN-PAPER-PLAGUE/SOLO-RAT` — teaching CELL with one rat + scribe (if the player has not seen `FSN-ROT-CUT`).

STATUS: PROPOSED

---

### FSN-NULL-WALL

FORMATION_ID: `FSN-NULL-WALL`  
RELATIVE_DIFFICULTY: CELL (kit band 1)  
ENEMIES:

- `ROLE-ANTI-SUMMON` — `bishop` / proposed `null_censor` or live `bone_scribe` — pack median
- `ROLE-TANK` — `rook` / live `iron_golem` — pack median + 1

VARIANT_RULES:

- Censor kit: Weaken + Expose. Cursed Wound is CADRE (`FSN-NULL-BROOD`).
- Tank: Strike + Iron Skin. No Inferno, no Swap.
- Weight ×2 if the player has a summon spell **equipped** (build, not level). Still valid if they do not — the Censor Weakens the player and the Golem walks up.
- Elite: Tank only. Censor stays junior so the puzzle is “who do I shoot,” not two elites.
- Unlock after the player has summoned once this run **or** after `FSN-WARD-MEND` (same grade, anti-pet flavor).

SPELL_POOL_INTERACTIONS:

- Weaken / Expose on a Wisp or hunter is the identity. Existing `ENEMY_THREAT_VALUES.wisp` 1.0 already hunts it; this body may treat **any** `isSummon` as wisp-level.
- Iron Skin on the Golem. Censor does not heal the Golem (that is `FSN-WARD-MEND`).
- No drain on the Censor.

TACTICAL_PLAN:

- Censor focuses the highest-threat player-side summon if one exists; else the player.
- Golem walks to the player and camps a **wide** choke only if a side aisle exists (`chokepointCamp` soph ≥ 3).
- If the player brought no pets, this is a softer `FSN-IRON-BATTERY` (debuff bishop + golem). That is fine.

SYNERGY:

- Anti-summon + tank. The Golem ignores leftover chips while the Censor deletes the pet economy.

PLAYER_THREAT:

- Pets die first. The player still acts. No summon lockout spell on CELL (proposed `null-brand` is COURT-only and still must not hardlock for 2+ turns without a cleanse window).

COUNTERPLAY:

- Desummon / let lifespan expire; fight the Censor (glass). Walk around the Golem (family MP is low).
- Do not feed a bomber into the Golem’s face (kamikaze min-targets may include the Golem — that is the player’s choice).

MAP_REQUIREMENTS:

- `openField` or `fortress` courtyard. Censor needs LoS to the backline **and** a retreat tile.
- No sealed alcove for the Censor (that would force the correct play through thorns).

AI_REQUIREMENTS:

- Censor: caster + summon-first (`AI-TGT-04` raised).
- Tank: charger.
- Soph 2–3.

VARIANTS:

- `FSN-NULL-WALL/SCRIBE` — live `bone_scribe` only (no proposed censor family).

STATUS: PROPOSED

---

### FSN-HOOK-FUSE

FORMATION_ID: `FSN-HOOK-FUSE`  
RELATIVE_DIFFICULTY: BRIGADE (kit band 1–2)  
ENEMIES:

- `ROLE-PULLER` — `knight` / proposed `rift_hook` — pack median
- `ROLE-KAMIKAZE` — `pawn` / proposed `cinder_martyr` — pack median − 1
- Optional third: a `pawn` charger with **no** extra spells (body so the martyr can legally see 2 targets **without** the player being the only legal blast)

VARIANT_RULES:

- Unlock after `FSN-EMBER-RIFT` (player has seen Swap legality).
- Inferno on the martyr is the **detonate kit**, cooldown 3. Puller has Swap + Frost, **no** Inferno.
- Elite: Puller only. Martyr stays BASE so a CHAMPION corpse-burn does not paint the pocket.
- Swap dest must **not** be lava. Prefer a tile 2 from the martyr, not adjacent-on-hazard.
- At most one martyr per pack (already a family rule).
- If the optional pawn is absent, the martyr **must not** detonate on the player alone unless HP ≤ 30%.

SPELL_POOL_INTERACTIONS:

- Swap relocates the player toward a cluster the martyr can score (`AI_KAMIKAZE_MIN_TARGETS`). Frost after Swap is a tax.
- Martyr Haste (BRIGADE) is self close, not a second pull.
- Bomber blast radius is Chebyshev 2 (`AI_KAMIKAZE_BLAST_RADIUS`). The optional pawn exists so the AI can wait for 2 bodies without cheating.

TACTICAL_PLAN:

- Puller Swaps only after the player has committed MP toward the martyr, and only onto a legal walk-off tile 2–3 from the fuse.
- Martyr walks a flank and **holds** Inferno until 2 targets are in radius **or** it is ≤ 30% HP.
- Optional pawn stays near the martyr, not on the player’s last exit.

SYNERGY:

- Hazard / fuse + displacement. Same pairing family as `FSN-EMBER-RIFT`, different payload: a **patient bomber** instead of a burn knight.

PLAYER_THREAT:

- Positional. Fail state is “I dumped MP, got swapped next to a fuse and a body.” Recoverable if a walk-off exists and the martyr still needs a second target.

COUNTERPLAY:

- Keep 2 MP. Kill the martyr at range (glass). Stand on the only legal Swap dest (occupancy).
- Swap the martyr into its own Puller (friendly-fire weight should cancel a detonate that hits the hook).

MAP_REQUIREMENTS:

- `arena` or `openField` with ≥ 8 free floor cells. Reject `corridorMaze` (fuse in a hallway is a hardlock).
- One optional lava tile on a **flank**, never on both approaches.
- No Blood Moon required; if it is up, do **not** also give the martyr lifesteal-on-burn (stacked sustain + fuse).

AI_REQUIREMENTS:

- Puller: Swap legality (proposed, same as drop 1 Displacer).
- Martyr: bomber profile — do **not** set `aiStrategy: "berserk"` (berserk + fuse suicides through the player).
- Soph 3–4.

VARIANTS:

- `FSN-HOOK-FUSE/SOLO` — drop the optional pawn; martyr patience is mandatory.
- `FSN-HOOK-FUSE/EMBER` — replace martyr with drop-1 `ROLE-HAZARD` (Inferno knight, no detonate). Softer BRIGADE if bomber apply is not ready.

STATUS: PROPOSED

---

### FSN-TIDE-STORM

FORMATION_ID: `FSN-TIDE-STORM`  
RELATIVE_DIFFICULTY: BRIGADE (kit band 1)  
ENEMIES:

- `ROLE-KITER` — `bishop` / live `tide_shade` — pack median — frost + slow
- `ROLE-STORM` — `queen` **without heal** / proposed `storm_caller` or live `wraith_bishop` — pack median — frost; `starter-blast` only if bounce apply is honest

VARIANT_RULES:

- Distinct from `FSN-TIDE-LOCK` (kiter + **mover king**). The second body is artillery that punishes **clumps** (player + summon), not a Haste bot.
- Storm must not receive `starter-heal` or inference makes two healers / a healer-artillery.
- Elite: Storm only. Kiter stays band 1; strip Inferno from the shade even if the run is band 2.
- `starter-blast` is the rare slot. If bounce apply is missing, Storm uses Frost only (still a pair).
- Unlock after `FSN-TIDE-LOCK`.
- No Swap on either body. No second `hitsMultiple`.

SPELL_POOL_INTERACTIONS:

- Tide Slow (−2 MP) + Frost (−1 MP) from **one** Slow source (the shade). Storm Frost refreshes, does not add a third MP tax past −2 (proposed cap).
- Chain Lightning (20, 2 bounces) is aimed at player + wisp / hunter. Solo player → Storm should Frost, not blast (`AI-TEM-05` / VETERAN: prefer `hitsMultiple` only when ≥2 player-side bodies).
- Live tide melee −1 MP is a **punish for catching the shade**, not a primary attack.

TACTICAL_PLAN:

- Shade keeps Chebyshev ≥ 3 (reuse `decideSummonArcher` distance on a full enemy — still proposed).
- Storm stands 4 back, opposite corner from the shade so one Linear does not delete both.
- If the player clumps with a summon, Storm spends the rare blast. Otherwise both poke.

SYNERGY:

- Kiter + artillery. Elite-evolution “Tide Mirror” minus the warden (warden is `FSN-QUIET-CHOIR` / `FSN-GLASS-WARD`). Chip + clump punish.

PLAYER_THREAT:

- Frustration and a periodic bounce, not a lock. Cornering the shade still wins.

COUNTERPLAY:

- Spread (desummon or stand 3+ from the wisp). Cut between them; the Storm is glass (`hpMult` ~0.80).
- Paper Windstorm is a **fair** modifier (also hits the kiter).
- Attract / Swap yanks the shade into Strike range.

MAP_REQUIREMENTS:

- `openField`, `arena`, or `chessboard` with wide files. Reject `corridorMaze`.
- No Time Warp (panic + Slow).

AI_REQUIREMENTS:

- Both: caster. Storm: artillery weights (`AI-ROL-08`).
- Proposed: Storm skips blast when only one player-side body is in bounce range.
- Soph 3–4.

VARIANTS:

- `FSN-TIDE-STORM/WARD` — CADRE: add `ROLE-WARDEN` on the Storm (Quiet-adjacent). Still one Slow source.
- `FSN-TIDE-STORM/FROST-ONLY` — no blast; ship if bounce apply is not ready.

STATUS: PROPOSED

---

### FSN-VEIL-HEX

FORMATION_ID: `FSN-VEIL-HEX`  
RELATIVE_DIFFICULTY: BRIGADE (kit band 1)  
ENEMIES:

- `ROLE-LURKER` — `knight` / proposed `shadow_lurker` — pack median — side start
- `ROLE-BUFFER` — `king` / proposed `hex_chorister` — pack median — opposite corner
- Optional third: `ROLE-KITER` junior (`bishop` / `tide_shade`) **or** omit — if present, Buffer Hastes the Lurker, not the shade

VARIANT_RULES:

- Unlock after `FSN-HEX-BLOOD` **and** `FSN-FROST-KNIFE`.
- Lurker: Strike + Shadow Veil. No Mark (that is CADRE / `FSN-MARK-CONFLAGRATION`). No Sacrifice on the base sheet.
- Buffer: Enrage + Haste on the Lurker. No Inferno, no heal.
- Elite: Lurker only (`spell-shadow-veil` already on kit; elite means it **refuses frontals**).
- Optional shade is a BRIGADE body, not a second elite. If the shade is present, Slow is on the shade only.

SPELL_POOL_INTERACTIONS:

- Veil shreds RES/SP; Enrage pumps the Lurker’s Strike. Readable two-step.
- Haste lets the Lurker take a side tile this turn. It still needs a legal flank path (`decideFlanker`).
- No drain on either body.

TACTICAL_PLAN:

- Buffer Enrages, then Hastes, then holds.
- Lurker paths to a rear/side tile and commits only when reachable. Frontal hold if soph ≥ 3 and no side tile.
- Optional shade kites; it does not share the Lurker’s tile (cluster penalty).

SYNERGY:

- Assassin + buffer. Drop-1 `FSN-FROST-KNIFE` used a controller tax; this sheet uses a **buff** tax. Same knife, different setup.

PLAYER_THREAT:

- Getting Veiled and then flanked by an Enraged knight. The Buffer is the off-switch.

COUNTERPLAY:

- Kill the Buffer (same as `FSN-HEX-BLOOD`). Keep a wall at your back. Guardian summon body-blocks the flank path.
- Frost Nova when the Lurker steps in (player-side).

MAP_REQUIREMENTS:

- `asymmetric` or `ruinsIslands` with **two** approach vectors. The Lurker’s flank must not be the only player exit.
- No Fog of War required; if it is up, do not also give the Lurker a skip-turn re-flank (CHAMPION hook) on this sheet.

AI_REQUIREMENTS:

- Lurker: flanker + proposed frontal-refuse at soph 3.
- Buffer: ally-first on the Lurker (`AI-ROL-05`).
- Soph 3–4. `groupTactics` at 4: Buffer does not need to share focus; Lurker does.

VARIANTS:

- `FSN-VEIL-HEX/SOLO` — drop the optional shade.
- `FSN-VEIL-HEX/E-VEIL` — Lurker refuses frontals.

STATUS: PROPOSED

---

### FSN-ASH-COURT

FORMATION_ID: `FSN-ASH-COURT`  
RELATIVE_DIFFICULTY: CADRE (kit band 2 for Inferno, else skip this id)  
ENEMIES:

- `ROLE-HAZARD` — `knight` / live `ember_knight` — pack median — `spell-inferno` (cooldown 3), live melee burn
- `ROLE-KAMIKAZE` — `pawn` / proposed `cinder_martyr` — pack median − 1
- `ROLE-GLYPH` — `bishop` / proposed `glyph_sower` — pack median — Mark + Poison

VARIANT_RULES:

- Unlock after `FSN-EMBER-RIFT` **and** `FSN-HOOK-FUSE` (player has seen burn + fuse + Swap legality; this sheet adds Mark, not a fourth displacement).
- Elite: Ember only. Martyr and Glyph stay junior.
- Inferno lives on the **ember**, not the martyr’s every turn. Martyr detonates by bomber rules, not a second Inferno paint on the same target the same turn.
- Glyph Marks a tile the player can step off (ELITE glyph rule: Mark only if player MP ≤ 1 is **too** mean for the base sheet — Mark if ≥ 1 walk-off exists).
- No Swap on this sheet (displacement exam already passed).
- COURT variant `FSN-ASH-COURT/SYNOD` may add `ROLE-STORM` **or** a Warden, not both, and only after this CADRE is answered.

SPELL_POOL_INTERACTIONS:

- Ember Inferno (8/turn × 3) + Glyph Poison (4/turn) may both exist **on different cadences**. Do not Inferno a target the Glyph just Poisoned on the same AP bar if that hides the Mark window.
- Mark ×2 on the **next** spell on that tile. Confirm live Mark × DoT before shipping (same caveat as `FSN-MARK-CONFLAGRATION`). Safe reading: Mark then Poison (DoT) **or** Mark then Ember Inferno, never Mark + both DoTs the same turn.
- Martyr blast is occupancy/radius, not Mark.

TACTICAL_PLAN:

- Ember flanks and holds Inferno until LoS and the player is not already on a walk-hazard.
- Glyph stays at 4, Marks, then Poison.
- Martyr approaches a **cluster** (ember + player, or player + summon), never the player’s last exit.

SYNERGY:

- Hazard creator + fuse + glyph. Elite-evolution “Ash Court.” Three fire-adjacent jobs, three readable windows.

PLAYER_THREAT:

- High if the player stands still on a Mark. Still interruptible: step off, spread, snipe the martyr.

COUNTERPLAY:

- Step off Mark. Kill the martyr (glass). Frost the ember’s MP. Glyph is a bishop — walk in.
- Do not clump with a wisp on this id.

MAP_REQUIREMENTS:

- `ruinsIslands` or `asymmetric` with two bridges / two approaches. One may be warm flavor; one must be clean.
- Reject lava-painted engagement + this pack (double hazard).
- ≥ 3 open cluster tiles so the martyr can wait for 2 targets without a corridor lock.

AI_REQUIREMENTS:

- Ember: flanker; **not** berserk.
- Martyr: bomber constants.
- Glyph: caster + “do not recast Mark on a vacated tile” (proposed, same as drop 1 Mark sheet).
- Soph 4–6. `groupTactics` on. `focusAlreadySet` stays one target per turn.
- Pack blackboard (proposed): only one Inferno **cast** this round unless a kill (`AI-FUT-02`).

VARIANTS:

- `FSN-ASH-COURT/SYNOD` — COURT: add Storm **or** Warden; soph 6–8; still one Inferno cadence.
- `FSN-ASH-COURT/NO-FUSE` — drop martyr if bomber-on-enemy is not ready; keep ember + glyph (softer CADRE).

STATUS: PROPOSED

---

### FSN-QUIET-CHOIR

FORMATION_ID: `FSN-QUIET-CHOIR`  
RELATIVE_DIFFICULTY: CADRE (kit band 1)  
ENEMIES:

- `ROLE-CANTOR` — `queen` / proposed `pale_cantor` — pack median — self-heal + Shield
- `ROLE-BUFFER` — `king` / proposed `hex_chorister` — pack median
- `ROLE-WARDEN` — `rook` / proposed `leash_warden` or live `iron_golem` — pack median + 1 — `isLeader` optional (see variants)

VARIANT_RULES:

- Unlock after `FSN-WARD-MEND` **and** `FSN-HEX-BLOOD` (heal pair + buff pair seen separately).
- Cantor: Blood Mend (self) + Shield (ally). **No** Inferno. At most one Cantor.
- Buffer: Enrage / Haste / Iron Skin. **No** heal (two healers would collapse inference and the sheet).
- Warden: Shield / Iron Skin / body-block. Swap peel is the **one** rare (legal dest only).
- Elite: Warden-leader only. Cantor and Buffer stay junior so leader-boost is the escalation.
- Do not also roll the random summoner overlay onto the Cantor or Buffer.

SPELL_POOL_INTERACTIONS:

- Shield + Iron Skin is sustain, not a lock. Player DoTs still tick; `spell-cursed-wound` halves the Cantor’s self-mend.
- Enrage on the Warden is allowed; Enrage on the Cantor is a waste — Buffer must prefer the Warden (`AI-ROL-05`).
- Haste on the Warden is peel tempo, not a sniper haste (no sniper on this sheet).

TACTICAL_PLAN:

- Warden interposes on the Cantor axis. Cantor Shields the Warden when the Warden is under 50% (`ENEMY_HEAL_ALLY_THRESHOLD_PCT`), else self-mends if itself is under 50%, else holds.
- Buffer spends the first two turns on Enrage / Iron Skin, then Haste if the player is diving the Cantor.
- If the Warden dies, boost lands on glass — intended. Remaining pair is a weaker `FSN-HEX-BLOOD` or a Shield queen.

SYNERGY:

- Healer + buffer + protector. Elite-evolution “Quiet Choir.” Three support verbs, one frontliner.

PLAYER_THREAT:

- Long fight. Spike is low. The fail is never looking at the Cantor.

COUNTERPLAY:

- Cursed Wound the Warden; focus the Cantor (healer threat 0.8). Or ignore mends and burst the Buffer so Enrage never lands.
- Walk around; the Warden is MP-poor.

MAP_REQUIREMENTS:

- `fortress` courtyard + gallery, or `arena` with pillars. Cantor must have a retreat tile that is not the Warden’s choke.
- No Thorned Ground on the only path to the Cantor (taxes the correct play).

AI_REQUIREMENTS:

- Cantor: healer. Apply must honor ally Shield at range 3 (drop-1 honesty gap: ally buff apply is incomplete — **do not ship this id until ally `targetId` apply exists**).
- Buffer: ally-first.
- Warden: guardian interpose + optional Swap peel.
- Soph 4–6. `AI_BACKLINE_PROTECT` on. `groupTactics` on.

VARIANTS:

- `FSN-QUIET-CHOIR/NO-LEADER` — teaching CADRE without boost.
- `FSN-QUIET-CHOIR/CANTOR-FLAG` — COURT unlock from drop 1: replace Cantor piece with enemy wisp (`ROLE-CANTOR` flag). Still cap 1 summon.

STATUS: PROPOSED

---

### FSN-BROKEN-GLASS

FORMATION_ID: `FSN-BROKEN-GLASS`  
RELATIVE_DIFFICULTY: CADRE (kit band 1–2)  
ENEMIES:

- `ROLE-SNIPER` — `bishop` / proposed `glass_sniper` — pack median — Mark + Frost, minRange 3
- `ROLE-DISPLACER` **without Swap** — `queen` / live `void_mirror` — pack median — Veil + hold corridor
- `ROLE-GAP-CLOSER` — `knight` / proposed `rust_reaver` — pack median + 1 — Haste; Swap-in only if Chebyshev ≥ 3 **and** dest is legal

VARIANT_RULES:

- Unlock after `FSN-GLASS-WARD` **and** `FSN-MIRROR-REAVE`.
- Elite: Sniper only. Mirror and Reaver stay junior.
- Swap-in is the **one** rare. Mirror still has no Swap (two Swaps is a lock).
- No Inferno on this sheet (reflect + burn + close is too many verbs). No Sacrifice.
- Never CHAMPION Sniper in a pack that lost its frontliners (if Reaver and Mirror are dead, remaining Sniper is a PAIR leftover — intended).

SPELL_POOL_INTERACTIONS:

- Sniper Marks, then Frost. Player can step off. Confirm Mark × Frost (Frost has upfront 20 — Mark should double that if live Mark is “next spell on tile”).
- Mirror Veil + 25% reflect. Reaver Haste / Swap-in is physical — the open into the Mirror.
- Reaver Swap-in dest is the **player’s tile** only if the player is ≥ 3 away and the Reaver’s origin is a free walk-off for the player after the swap (player lands where the Reaver was — that tile must be safe).

TACTICAL_PLAN:

- Sniper holds ≥ 3. Mirror camps. Reaver closes the kite.
- One of the three peels a wisp (`focusAlreadySet`); the others stay on the player. **Proposed** split (today any non-healer may pile the wisp).

SYNERGY:

- Sniper + reflect + gap-closer. Elite-evolution “Broken Glass.” Long shot, punish shot, end the kite.

PLAYER_THREAT:

- High if the player tries to snipe from a corridor. Low if they walk the gallery and physical the Mirror first.

COUNTERPLAY:

- Close the Sniper (it dies). Physical the Mirror. Slow the Reaver before Swap-in.
- Stand on the Reaver’s origin tile so Swap-in has no legal dest.

MAP_REQUIREMENTS:

- `fortress` courtyard + gallery, or `chessboard` with two files. Sniper must have a tile to step off **and** the player must have a file that is not the reflect corridor.
- Reject single-file maze.

AI_REQUIREMENTS:

- Sniper: minRange 3 + Mark hygiene.
- Mirror: holder, no chase.
- Reaver: charger + Swap-in only at ≥ 3 with dest legality.
- Soph 4–6.

VARIANTS:

- `FSN-BROKEN-GLASS/NO-SWAP` — Reaver Haste only (if Swap-in scoring is not ready).
- `FSN-BROKEN-GLASS/E-GLASS` — elite Sniper, Mark + Frost.

STATUS: PROPOSED

---

### FSN-RIFT-KNOT

FORMATION_ID: `FSN-RIFT-KNOT`  
RELATIVE_DIFFICULTY: CADRE (kit band 1)  
ENEMIES:

- `ROLE-PULLER` — `knight` / proposed `rift_hook` — pack median — Swap + Frost
- `ROLE-BLINKER` — `knight` / proposed `blink_cutter` — pack median — Strike + ally-Swap **out** + Veil
- `ROLE-ARBITER` — `king` / proposed `coil_arbiter` — pack median — Slow + Frost — **no drain**

VARIANT_RULES:

- Unlock after `FSN-HOOK-FUSE` **and** `FSN-FROST-KNIFE`.
- Two knights are the **same piece asset** with opposite Swap jobs: Puller moves the **player in**; Blinker moves **itself out** (ally Swap). If both would target the same dest, Puller wins and Blinker Strikes or Veils (`AI-TEM` blackboard).
- Elite: Arbiter only (init tax). Knights stay junior so two elites cannot Swap-lock.
- `spell-frost-nova` is a COURT variant, not the base (AoE + Slow around the Arbiter; player must have a tile outside radius 2).
- `void_collapse` is **not** attached (not in frontend `spellData.ts`; attract_multi is a set-piece, not a pack tool).
- Cap Slow at −2 MP. Arbiter is the only Slow source.

SPELL_POOL_INTERACTIONS:

- Puller Swap legality: same as drop 1 — no lava, walk-off remains.
- Blinker ally-Swap: only with the Arbiter or Puller if the origin is safer **and** does not close the player’s last exit.
- Veil on the Blinker is the hit-and-leave shred. Frost from Puller / Arbiter is chip + MP tax.

TACTICAL_PLAN:

- Arbiter Slow first (high init family). Puller Swaps after the player spends MP. Blinker takes a rear tile, Veils, ally-Swaps out if still adjacent at end of turn (ELITE blinker — on BASE it may stay and Strike once).
- Never turn-1 triple on one tile.

SYNERGY:

- Displacement + self-teleport + controller. Elite-evolution “Rift Knot.” The board moves; damage is incidental.

PLAYER_THREAT:

- Positional and tempo. Failure is dumping a 5-AP turn into a Slow then landing next to a Veiled knight. Still no hard CC.

COUNTERPLAY:

- Kill the Arbiter (no family tank). Occupy the tile the Puller wants. Isolate the Blinker (no ally to Swap).
- Player Timestep (enemy cannot have it) is the designed panic button.

MAP_REQUIREMENTS:

- `ruinsIslands` with two bridges, or `asymmetric` pillars. Always two walk-offs after a player Swap.
- No Void Rift tile as a legal Swap dest.
- Reject cramped `corridorMaze`.

AI_REQUIREMENTS:

- Puller: Swap-first + dest scoring (hazard for the player is allowed only if a walk-off remains — **no** lava toss on this sheet; that is HOOK-FUSE’s caution, and even there lava dest is banned).
- Blinker: flanker + ally-Swap-out.
- Arbiter: controller (`AI-ROL-07`) + `AI-TEM-04` (no second Slow).
- Soph 4–6. Blackboard: `plannedSwapDest` so the two knights do not swap the player onto the Blinker’s landing.

VARIANTS:

- `FSN-RIFT-KNOT/NOVA` — COURT: Arbiter Frost Nova; tile outside the circle required.
- `FSN-RIFT-KNOT/NO-BLINK` — Puller + Arbiter only (BRIGADE-shaped CADRE if ally-Swap apply is missing).

STATUS: PROPOSED

---

### FSN-NULL-BROOD

FORMATION_ID: `FSN-NULL-BROOD`  
RELATIVE_DIFFICULTY: CADRE (kit band 1)  
ENEMIES:

- `ROLE-SUMMONER` — `king` / proposed `brood_chanter` — pack median — `isSummoner`, `summon-dire-wolf` **or** `summon-archer` (not both on BASE)
- `ROLE-ANTI-SUMMON` — `bishop` / proposed `null_censor` — pack median — Weaken / Expose / Cursed Wound
- `ROLE-TANK` — `rook` / live `iron_golem` — pack median + 1

VARIANT_RULES:

- Unlock after `FSN-NULL-WALL` **and** `FSN-KENNEL-LITANY`.
- Chanter **replaces** the random overlay on that body. Cap 1 living pet on this sheet (below global cap 2) so the board is Chanter + pet + Censor + Golem, not two wolves.
- Elite: Chanter only (Haste the pet — ELITE brood). Golem and Censor stay junior.
- Censor Cursed Wound targets the **player’s** summon, not the Chanter’s (enemy summons are allies).
- Proposed fall-through: Chanter Frosts when cap/cooldown hits (today it skips — must not ship as a wasted-turn bug).
- No Healer (that is `FSN-KENNEL-LITANY` / `FSN-QUIET-CHOIR`).

SPELL_POOL_INTERACTIONS:

- Wolf Venom is the only pack DoT. Censor does not also Poison.
- Cursed Wound on a player wisp makes Blood Mend sad; that is the anti-summon verb.
- Iron Skin on the Golem. Chanter Haste (elite) on the wolf, not on the Golem.

TACTICAL_PLAN:

- Turn 1–2: Golem walks up. Censor hunts the player’s pet if any, else Weakens the player. Chanter waits for a **legal midpoint** (free, non-hazard, not the player’s only exit); else ring-scan (proposed safety on the existing midpoint).
- Wolf hunts nearest / lowest HP. Golem holds the player.
- If the player brought no pets, Censor Weakens / Exposes the player and the sheet is a Kennel with a debuff bishop.

SYNERGY:

- Their summons vs your summons, plus a wall. Elite-evolution “Null Brood.”

PLAYER_THREAT:

- Two-front pressure + pet sniping. Board cannot fill (cap 1 on this sheet).

COUNTERPLAY:

- Kill the wolf (4-turn lifespan) or the Chanter. Ignore the Golem. Censor is glass if you are not summoning.
- Stand on the midpoint. AoE the clump (Golem + wolf).

MAP_REQUIREMENTS:

- `openField` or `arena` with ≥ 6 free cells near the midpoint. Reject cramped maze (summon-in-a-closet).
- No void on the midpoint ring.

AI_REQUIREMENTS:

- Summoner + proposed cooldown fall-through.
- Censor: summon-first on **player-side** only.
- Golem: charger.
- Soph 4–6. `groupTactics`: one focus. Do not enable all three to peel the wisp.

VARIANTS:

- `FSN-NULL-BROOD/ARCHER` — archer pup (kiter) instead of wolf.
- `FSN-NULL-BROOD/WARDEN` — COURT: flip `summon-sentinel` on the Chanter instead of wolf. Cap 1. Guardian blocks for the Censor.

STATUS: PROPOSED

---

### FSN-CHORUS-THRONE

FORMATION_ID: `FSN-CHORUS-THRONE`  
RELATIVE_DIFFICULTY: COURT (kit band 2, AI soph 6–8)  
ENEMIES:

- `ROLE-CANTOR` — `queen` / proposed `pale_cantor` — pack median — `isLeader`
- `ROLE-BUFFER` — `king` / proposed `hex_chorister` — pack median
- `ROLE-WARDEN` — `rook` / proposed `leash_warden` or `iron_golem` — pack median + 1
- `ROLE-SNIPER` — `bishop` / proposed `glass_sniper` — pack median — Frost; Mark is the **one** elite rare

VARIANT_RULES:

- Unlock after `FSN-QUIET-CHOIR` **and** a leader-boost CADRE (`FSN-TRI-BASTION` or `FSN-QUIET-CHOIR` with leader).
- One elite only: the Cantor-leader. Others stay junior so boost is the late scare, not four elites.
- Cantor still has no Inferno. Band 2 does **not** put Inferno on this queen.
- Sniper Mark is optional and never combined with Inferno or `starter-blast` on this sheet.
- `bottleneckControl` (8) only if the map has a gallery. `escapeRoute` (6) is on: wounded Cantor walks to the gallery, not through the player.
- InstantKill / betrayal stay off.
- Dungeon depth may not add a fifth hostile to this id. Extra dungeon bodies spawn elsewhere, outside Chebyshev 4, as a separate PAIR.

SPELL_POOL_INTERACTIONS:

- Choir verbs (Shield, Iron Skin, Enrage, Haste) + one Frost/Mark gun. Dual Slow is **off** (no Arbiter, no shade).
- Leader boost 10% × fallen escort. Four bodies means a late Cantor can become stout — the player is expected to **cut the Cantor early** or accept a longer finish. Boost is RES/damage, not a new mechanic.
- `spell-rallying-cry` stays false.

TACTICAL_PLAN:

- Warden + Buffer form a moving wall with a **gap** (never a closed box). Cantor and Sniper sit in the pocket behind the gap.
- Sniper holds minRange 3. If a Warden dies, the wall opens; the Cantor may retreat (`escapeRoute`) rather than suddenly one-shot.
- Buffer Enrages the Warden, Hastes the Sniper if the player dives the pocket.

SYNERGY:

- Court-scale Quiet Choir + the Glass Ward gun. Sophistication and a fourth body are the unlock, not a new monster.

PLAYER_THREAT:

- Highest support-structured threat in this drop. Still turn-based. Failure is ignoring the Cantor until three boosts land.

COUNTERPLAY:

- Snipe the Cantor down a gallery (glass RES). Peel the Warden to open the gap. Cursed Wound the leader.
- Player Chain Lightning (bounces 2) into the clump is fair counter-synergy — the pack itself has no bounce.

MAP_REQUIREMENTS:

- `fortress` courtyard + gallery, or `openField` with cover pillars. Never a closed ring of walls around the player.
- Sniper needs a step-off. Cantor needs two walk-offs.

AI_REQUIREMENTS:

- Cantor: healer + `escapeRoute` at soph 6.
- Buffer: ally-first.
- Warden: guardian, `chokepointCamp` only with a gap.
- Sniper: minRange 3 + Mark hygiene.
- Soph 6–8. `groupTactics` on. `erratic` (5) may apply to **one** escort, not the Cantor.
- Proposed: escorts do not path a closed box (occupancy already forbids stacking).

VARIANTS:

- `FSN-CHORUS-THRONE/NO-MARK` — Sniper Frost only.
- `FSN-CHORUS-THRONE/KENNEL` — replace Sniper with `ROLE-SUMMONER` + one archer, still no Inferno, cap 1.
- `FSN-ASH-COURT/SYNOD` remains the fire COURT; do not merge it into this id.

STATUS: PROPOSED

---

## Progression (relative unlock graph)

Drop-1 graph still stands. This drop **meshes**; it does not replace.

```
PAIR:    HEX-BLOOD              GLASS-WARD
              \                    /
CELL:     VEIL-HEX←──          MIRROR-REAVE     PAPER-PLAGUE     NULL-WALL
              \                    |                 |
BRIGADE:  VEIL-HEX           TIDE-STORM         HOOK-FUSE
              \                    |                 |
CADRE:   QUIET-CHOIR     BROKEN-GLASS      ASH-COURT     RIFT-KNOT     NULL-BROOD
              \                    |                 /
COURT:                    CHORUS-THRONE          ASH-COURT/SYNOD
```

Cross-catalog prereqs (relative mastery, not XP):

| This id | Also requires from drop 1 |
| :--- | :--- |
| `FSN-GLASS-WARD` | `FSN-IRON-BATTERY` (or parallel first PAIR) |
| `FSN-PAPER-PLAGUE` | `FSN-ROT-CUT` |
| `FSN-TIDE-STORM` | `FSN-TIDE-LOCK` |
| `FSN-HOOK-FUSE` | `FSN-EMBER-RIFT` |
| `FSN-VEIL-HEX` | `FSN-FROST-KNIFE` + `FSN-HEX-BLOOD` |
| `FSN-ASH-COURT` | `FSN-EMBER-RIFT` + `FSN-HOOK-FUSE` |
| `FSN-QUIET-CHOIR` | `FSN-WARD-MEND` + `FSN-HEX-BLOOD` |
| `FSN-NULL-BROOD` | `FSN-KENNEL-LITANY` + `FSN-NULL-WALL` |
| `FSN-CHORUS-THRONE` | `FSN-TRI-BASTION` or leader `FSN-QUIET-CHOIR` |

A run may skip a **branch**. It must not skip a **grade**.

---

## Implementation notes (for a later engineer — not this drop)

These sheets need the same pack composer as drop 1, plus:

- Explicit `enemy.role` / `aiProfile` so healAmount and Enrage kits do not collapse (`docs/ENEMY_AI_EVOLUTION.md` AI-SYS-04, AI-ROL-05).
- Ally buff apply (`targetId` on Enrage / Haste / Shield / Iron Skin). **`FSN-HEX-BLOOD`, `FSN-VEIL-HEX`, `FSN-QUIET-CHOIR`, `FSN-CHORUS-THRONE` must not ship before that apply exists.**
- Swap legality + `plannedSwapDest` blackboard for `FSN-RIFT-KNOT`.
- Bomber profile on a family flag for `ROLE-KAMIKAZE`.
- Summoner cooldown fall-through.
- `buildEnemyKit` numeric band (still broken at WX 12484).
- Family HP kept at battle start (elite-evolution §6.2).

They do **not** need new pixel patterns, RAF edits, map-generation rewrites, turn-order changes, or damage-formula edits. Map **selection** is a filter on already generated maps.

Do not implement those hooks in the same change as this catalog.

---

## Sources (line-accurate, 2026-09-01)

- Kits / inference / decide / summoner skip: `src/frontend/src/engine/enemyAI.ts` 156–178, 420–449, 1648–1692, 1818–1893
- Kit assignment + summoner roll + spacing: `src/frontend/src/components/WorldExploration.tsx` 6340, 12484, 12502–12503
- Gates, summon cap, kamikaze: `src/frontend/src/data/gameConstants.ts` 153–210, 271–301
- Families: `src/frontend/src/types/gameTypes.ts` 12–20
- Spells: `src/frontend/src/data/spellData.ts` (`starter-heal` 85–101 self-only; unique flags 143–686)
- Map archetypes: `src/frontend/src/engine/mapGen.ts` 4–42
- Proposed families / packs: `docs/automation/ENEMY_ELITE_EVOLUTION_2026-08-31.md` §3–§4
- AI modules referenced: `docs/ENEMY_AI_EVOLUTION.md` AI-ROL-05, AI-ROL-07, AI-ROL-08, AI-TEM-04, AI-TEM-05, AI-FUT-02
- Drop 1 formations: `docs/design/ENEMY_FORMATIONS_2026-08-31.md`
