# Enemy synergy and formation catalog

**Author:** Enemy Synergy and Formation Designer  
**Date:** 2026-08-31  
**Status:** PROPOSED — design only. No production code, spawn tables, or AI changes in this drop.

**See also:** `docs/design/ENEMY_FORMATIONS_2026-09-01.md` — second catalog (buffer + bruiser, sniper + ward, proposed-family packs). Do not reuse these `FSN-*` ids.

This catalog builds **tactically coherent packs** from pieces, families, kits, and summons that already exist. New experiences come from **who stands together**, not from new sprites.

Relative difficulty uses **kit band**, **AI sophistication**, and **pack role count**. It does not pin encounters to a final player-level range. Higher progression unlocks more sophisticated compositions after the player has already answered simpler pairs.

---

## Grounding (live, 2026-08-31)

Read from `src/frontend/src/engine/enemyAI.ts` (`ENEMY_KITS`, `inferArchetype`, `decideSummonerAction`), `src/frontend/src/data/spellData.ts`, `src/frontend/src/data/gameConstants.ts`, `src/frontend/src/types/gameTypes.ts`, `src/frontend/src/engine/mapGen.ts`, and `WorldExploration.tsx` spawn / battle-start assignment.

### Existing combatants (assets already in play)

| Token | Role today | Kit band 0 | Kit band 1 | Kit band 2 |
| :--- | :--- | :--- | :--- | :--- |
| `pawn` | Charger / generic melee | `physical_attack` | + `spell-venom-strike` | same |
| `knight` | Flanker (`inferArchetype` on piece) | `physical_attack` | same | same |
| `rook` | Charger / tank | `physical_attack` | + `spell-iron-skin` | same |
| `bishop` | Caster / kiter | `starter-frost` | + `starter-poison` | same |
| `queen` | Caster, then **healer** once `starter-heal` is on the kit | frost or inferno | + `starter-heal` | inferno replaces frost |
| `king` | Caster / intended leader | frost or inferno | + `spell-rallying-cry` | inferno replaces frost |
| Family `iron_golem` | High HP / RES, low MP | stat overlay only | | |
| Family `wraith_bishop` | Low HP, high damage | stat overlay only | | |
| Family `plague_rat` | Glass HP, low damage | stat overlay only | | |
| Family `ember_knight` | Modest HP, fire-leaning | stat overlay only | | |
| Family `tide_shade` | Mid HP, high MP | stat overlay only | | |
| Family `bone_scribe` | Low damage, high SR | stat overlay only | | |
| Family `void_mirror` | Mid HP, high SR | stat overlay only | | |
| Enemy summons | Wolf (`summon-dire-wolf`, hunter) or Archer (`summon-archer`, kiter) | cap 2, cooldown 2 turns | | |

Player-only summons (`summon-sentinel`, `summon-wisp`, `summon-bomber`) already have art and AI. Formations may **propose flipping `usableByEnemy`** as a late unlock. That is a flag, not a new asset.

### Live constraints formations must respect

1. World packs today roll a **random piece per slot** and a **30% random family**. These sheets assume a future pack composer that places named roles instead of that lottery.
2. `buildEnemyKit(pieceType, currentMap.levelZone)` is called with a `{ name, minLevel, maxLevel }` object. `Math.floor(levelZone)` is `NaN`, so **every live kit collapses to band 0**. Formations name an intended **kit band** (0 / 1 / 2). They are not describing current battle-start assignment.
3. `inferArchetype` returns `healer` if **any** assigned spell heals. A band-1 queen with `starter-heal` will not act as artillery. Dedicated artillery is a **bishop** (no heal on the kit). Dedicated healers are queens (or a proposed enemy-side wisp).
4. `inferArchetype` never returns `summoner`. WorldExploration already branches on `enemy.isSummoner` → `decideSummonerAction`. Summoner slots must set that flag and carry a usable summon spell.
5. `spell-rallying-cry` is on the king kit but `usableByEnemy: false`. Court support must not depend on it until that flag is reviewed. Use `starter-heal`, `spell-haste`, or `spell-iron-skin` instead.
6. **Banned from every sheet:** `ENEMY_AI_TIER_GATES.instantKill` (9) and `betrayal` (10). No formation may require unavoidable damage or a hardlock (sealed pocket, lava on every approach, swap onto isolated void, turn-1 surround).

### Relative difficulty (not level bands)

| Grade | Kit band | AI sophistication | Pack size | Rare spells | Unlock (relative) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PAIR | 0 | 1–2 | 2 | none | Default first composed fight |
| CELL | 0–1 | 2–3 | 2–3 | none | After the player can break a PAIR without a death |
| BRIGADE | 1 | 3–4 (`chokepointCamp`, `defensiveRetreat`, `groupTactics` at 4) | 3 | at most one | After the player answers CELL with mid-kit tools (heal / armor / a DoT) |
| CADRE | 1–2 | 4–6 | 3–4 + optional summon | one, sometimes two non-stacking | After the player has displacement **or** a player summon |
| COURT | 2 | 6–8 (`escapeRoute`, `bottleneckControl`) | 4 + capped summons | one elite rare | After the player has survived a leader-boost CADRE |

Dungeon depth may **amplify** a grade (extra body, +tier step) without changing the formation id. It must not jump a PAIR sheet straight to COURT.

Enemy levels inside a pack are **relative to each other**, not to a global cap:

- Frontliner (protector / tank / charger): pack median + one tier step.
- Backliner (artillery / healer / summoner / kiter): pack median.
- Glass (rat, assassin, finisher): pack median or one step below.
- Never more than **one** step between the highest and lowest member of a PAIR/CELL. BRIGADE+ may use two steps so the backline is clearly junior.

### Proposed role overlays (no new sprites)

These are named jobs. Each is a piece + optional family + kit extras + AI contract. They are PROPOSED templates, not canister `EnemyConfig` rows.

| Overlay id | Piece | Family | Extra kit (beyond `ENEMY_KITS`) | AI contract |
| :--- | :--- | :--- | :--- | :--- |
| `ROLE-PROTECTOR` | `rook` | `iron_golem` | `spell-iron-skin`, `starter-shield` | charger that body-blocks; Iron Skin / Shield on self or the backliner, not a suicide walk |
| `ROLE-ARTILLERY` | `bishop` | `wraith_bishop` | kit frost; band 2 may add `spell-inferno` | caster; keep range ≥ 3; LoS reposition (`AI_LOS_REPOSITION_STEP_BUDGET`) |
| `ROLE-CONTROLLER` | `bishop` | `tide_shade` or default | `starter-frost`, `spell-slow`, optional `spell-mark` | caster; frost/slow first, damage second |
| `ROLE-ASSASSIN` | `knight` | `ember_knight` or default | `spell-venom-strike`, `spell-shadow-veil`; wounded-only `spell-sacrifice` | flanker; rear/side tiles; no turn-1 Sacrifice |
| `ROLE-SUMMONER` | `king` or `queen` **without** heal on the kit | `bone_scribe` | `summon-dire-wolf` **or** `summon-archer` (not both on one body) | `isSummoner`; `decideSummonerAction`; skip when cap/cooldown hit, then fall through to caster — **proposed** fall-through (today the summoner skips) |
| `ROLE-SUPPORT` | `queen` | `bone_scribe` | `starter-heal`, `spell-haste`, `spell-iron-skin` | healer; mend the lowest-HP ally under `ENEMY_HEAL_ALLY_THRESHOLD_PCT` |
| `ROLE-TANK` | `rook` | `iron_golem` | `physical_attack`, `spell-iron-skin` | charger; hold, do not kite |
| `ROLE-HEALER` | `queen` | default or `bone_scribe` | `starter-heal` only (no inferno) | healer; must not also carry a majority-ranged nuke if we want her to stay a healer — heal already wins inference |
| `ROLE-HAZARD` | `knight` | `ember_knight` | `spell-inferno`, `spell-enrage` | charger / berserker-lite; Inferno on a **chosen** tile, never a full-floor paint |
| `ROLE-DISPLACER` | `bishop` or `queen` | `void_mirror` | `spell-swap`, `spell-frost-nova` | caster; Swap only if the destination is a free, non-void, non-hazard floor with a walk-off |
| `ROLE-DEBUFFER` | `bishop` or `pawn` | `plague_rat` | `starter-poison`, `spell-weaken`, `spell-expose` | caster if ranged kit, else charger; apply DoT/debuff before any finisher swings |
| `ROLE-FINISHER` | `pawn` | default | `spell-venom-strike`, `spell-drain-courage`; wounded-only `spell-sacrifice` | charger; prefers a target already DoT'd or Expose'd |
| `ROLE-KITER` | `bishop` | `tide_shade` | `starter-frost`, `starter-poison`, `spell-slow` | caster; keep Chebyshev ≥ 3 |
| `ROLE-MOVER` | `king` | default | `starter-frost`, `spell-slow`, `spell-haste` (on the kiter) | caster; Haste the kiter, Slow the player; no Swap on this body |

**Late flag-unlocks (still existing assets):**

- `ROLE-WARDEN` — enemy `summon-sentinel` (`usableByEnemy` flip). Guardian AI already exists.
- `ROLE-CANTOR` — enemy `summon-wisp`. Healer summon AI already exists. COURT only, still under `ENEMY_SUMMON_CAP`.
- `ROLE-FUSE` — enemy `summon-bomber`. Only CADRE+ **and** maps with ≥ 3 open cluster tiles. Kamikaze already refuses to detonate below `AI_KAMIKAZE_MIN_TARGETS` (2) unless ≤ 30% HP. Never on a one-tile corridor.

### Rare spells (enemy-legal, not on default kits)

Safe to attach **one** per pack at BRIGADE+, two at CADRE+ only when they do not stack into a lock:

`spell-mark`, `spell-enrage`, `spell-haste`, `spell-weaken`, `spell-expose`, `spell-shadow-veil`, `spell-cursed-wound`, `spell-drain-courage`, `spell-frost-nova` (adjacent, walkable out), `spell-inferno` (3-turn cooldown), `spell-lifesteal-nova` (adjacent circle — kiteable).

Use **sparingly:** `spell-swap` (destination must be legal and escapable), `spell-sacrifice` (only `ENEMY_WOUNDED_SACRIFICE_HP_PCT`).

Do not attach `spell-barrier`, `spell-mirror`, or `spell-timestep` to enemies (already `usableByEnemy: false`; they create hardlocks or free extra turns).

### Fair-fight rules (every sheet)

- Engagement pocket has **at least two walk-off tiles** that are not hazard, void, portal, or barrier.
- Hostiles start at least Chebyshev 4 from each other and from the player (matches live `MIN_CHEBYSHEV`).
- No lava / spikes / thorns on every approach. Optional hazards sit on **flanking** tiles so the player can take a longer clean path.
- No turn-1 focus-fire that can 100–0 a full-HP player from current band-0 kits. Kill pressure comes from **roles stacking over turns**.
- Summons stay at cap 2. A dead summoner does not leave orphaned extra caps.
- Leader boost (default 10% per fallen non-leader) is allowed from BRIGADE up. The player can break the leader first.

---

## Formations

### FSN-IRON-BATTERY

FORMATION_ID: `FSN-IRON-BATTERY`  
RELATIVE_DIFFICULTY: PAIR (kit band 0–1)  
ENEMIES:

- `ROLE-PROTECTOR` — `rook` / `iron_golem` — pack median + 1 step — front
- `ROLE-ARTILLERY` — `bishop` / `wraith_bishop` — pack median — back, LoS down a lane

VARIANT_RULES:

- Band 0: Strike + Frost Bolt only. Protector is a fat body, not a buffer.
- Band 1: Protector gains `spell-iron-skin`. Artillery gains `starter-poison` (DoT, not burst).
- Elite: only **one** member. Elite Protector (thicker golem) **or** elite Artillery (`spell-inferno` if kit band 2 is already unlocked for the run). Never both at PAIR.
- Random 30% family lottery is **off** for this pack.

SPELL_POOL_INTERACTIONS:

- Frost Bolt (−1 MP, 1 turn) plus a body-block makes closing expensive but not impossible.
- Iron Skin is self/ally RES, not a reflect. Player physical still works; it just lasts longer.
- Poison Arrow is a 4/turn DoT. It must not share a turn with Inferno on the same target at PAIR.

TACTICAL_PLAN:

- Protector steps into the lane and holds. Artillery stands 4 tiles back and spends AP on Frost / Poison, repositioning 1–2 steps if LoS dies (`AI_LOS_REPOSITION_ENABLED`).
- If the Protector drops below 30% HP it retreats **behind** the Artillery, not through the player (`ENEMY_RETREAT_HP_PCT`, `defensiveRetreat` once AI soph ≥ 3).

SYNERGY:

- Protector buys the glass cannon turns. Artillery punishes the player for ignoring the tank. Classic protector + artillery.

PLAYER_THREAT:

- Slow, readable pressure. The scary turn is “I walked into Frost while the golem is still in the doorway,” not a one-shot.

COUNTERPLAY:

- Pull the Artillery with range or a side aisle. Do not stand in the lane. Burn the wraith first; the golem without a caster is a slow Strike.
- Push / walk around. Player Barrier (enemy cannot use it) can cut LoS.

MAP_REQUIREMENTS:

- Prefer `fortress` or `corridorMaze` with a **main lane plus one side aisle**. Reject a single-tile tunnel with no detour.
- No lava on the only approach.

AI_REQUIREMENTS:

- Protector: charger, `chokepointCamp` only if soph ≥ 3 **and** a side aisle exists.
- Artillery: caster, LoS reposition budget 2.
- No group-tactics focus required.

VARIANTS:

- `FSN-IRON-BATTERY/E-IRON` — elite Protector, Artillery stays junior.
- `FSN-IRON-BATTERY/E-SHOT` — elite Artillery, kit band 2 Inferno, 3-turn cooldown, still one target.

STATUS: PROPOSED

---

### FSN-FROST-KNIFE

FORMATION_ID: `FSN-FROST-KNIFE`  
RELATIVE_DIFFICULTY: CELL (kit band 1)  
ENEMIES:

- `ROLE-CONTROLLER` — `bishop` / `tide_shade` — pack median — mid-back
- `ROLE-ASSASSIN` — `knight` / default — pack median or −1 — starts wide, not adjacent

VARIANT_RULES:

- Controller kit: `starter-frost` + `spell-slow`. Mark is BRIGADE+ only (see `FSN-MARK-CONFLAGRATION`).
- Assassin kit: `physical_attack` + `spell-venom-strike`. `spell-sacrifice` only if HP ≤ 20% and the player is already DoT'd.
- Elite: Assassin may take `spell-shadow-veil` (−15% RES/SP). Controller stays non-elite so Slow does not also become a nuke.

SPELL_POOL_INTERACTIONS:

- Frost (−1 MP) then Slow (−2 MP, 2 turns) is the lock **setup**, not the lock. The player still has AP and a walk-off.
- Assassin Venom is 4/turn × 3. Combined with Slow it threatens a bleed-out, not a stun-lock.

TACTICAL_PLAN:

- Controller stays at range 3–4 and spends the first two turns on MP taxes.
- Assassin paths to a side or rear tile (flanker). It does not walk the Frost lane. It commits only when it can reach this turn (`decideFlanker` / charger hold beyond `ENEMY_REACHABLE_STEP_BUDGET`).

SYNERGY:

- Controller + assassin. The knife arrives after the player’s MP is taxed, so the dodge window is smaller — still present.

PLAYER_THREAT:

- Getting Slowed and then flanked. Misplay is standing still to trade with the bishop.

COUNTERPLAY:

- Spend MP early to create space, then face the knight in a doorway you choose. Kill the Controller; the Assassin is a melee with no ranged kit.
- Haste / extra MP (player `spell-haste`, Swift Winds maps) blunt the tax.

MAP_REQUIREMENTS:

- `asymmetric` or `ruinsIslands` with two approach vectors. The Assassin must have a **flank path** that is not the only player exit.
- No ice sheet on both paths (ice is already avoided by wounded AI; a full ice floor is a hardlock).

AI_REQUIREMENTS:

- Controller: caster.
- Assassin: flanker (`pieceType === "knight"`).
- Soph 2–3. `groupTactics` not required.

VARIANTS:

- `FSN-FROST-KNIFE/E-VEIL` — Assassin + Shadow Veil. Still no turn-1 Sacrifice.

STATUS: PROPOSED

---

### FSN-KENNEL-LITANY

FORMATION_ID: `FSN-KENNEL-LITANY`  
RELATIVE_DIFFICULTY: BRIGADE (kit band 1)  
ENEMIES:

- `ROLE-SUMMONER` — `king` / `bone_scribe` — pack median — back, `isSummoner`, `summon-dire-wolf`
- `ROLE-SUPPORT` — `queen` / `bone_scribe` — pack median — mid, heal/haste/iron-skin
- One **living** wolf is expected by turn 3, not on turn 1 spawn

VARIANT_RULES:

- Summoner does **not** carry `starter-heal` (would steal healer inference if fall-through is added).
- Support does **not** carry Inferno.
- Wolf uses existing hunter kit (`physical_attack`, `spell-venom-strike`), lifespan 4.
- Elite: Support may gain `starter-shield` on the wolf. Summoner stays at cap 1 active summon for this sheet (below the global cap of 2).
- Proposed fall-through: when summon is on cooldown or cap, Summoner casts Frost, never skip-locks the turn into a wasted action that feels like a bug.

SPELL_POOL_INTERACTIONS:

- Blood Mend (12 HP + CHC) on the wolf or the summoner keeps the hunter in the lane.
- Haste (+2 MP, 1 turn) on the wolf is the “support the summon” beat.
- Iron Skin on the summoner if the player dives the backline.
- `spell-rallying-cry` is **not** used (enemy flag false).

TACTICAL_PLAN:

- Turn 1–2: Support buffs; Summoner waits until a **midpoint tile** between player and Support is free, non-hazard, and not the player’s only exit (`decideSummonerAction` already aims at the midpoint — reject the tile if it is illegal and pick a ring cell instead; **proposed** safety on the existing midpoint).
- Wolf hunts nearest / lowest HP (existing hunter). Support heals whoever is under 50% HP.

SYNERGY:

- Summoner + support. The extra body is temporary. The Support makes that body last its full lifespan.

PLAYER_THREAT:

- Two-front pressure plus a heal. Still 3 AP-cost summons and a 2-turn cadence. The board cannot fill.

COUNTERPLAY:

- Kill the wolf (80-scale hunter, 4 turns) or the Support first. A summoner at cap with no healer is a Frost king.
- Stand on the midpoint so the summon has to ring-scan farther (occupancy already forbids stacking).

MAP_REQUIREMENTS:

- `openField` or `arena` with ≥ 6 free floor cells near the midpoint. Reject cramped `corridorMaze` for this id (summon-in-a-closet is a hardlock).
- No void on the midpoint ring.

AI_REQUIREMENTS:

- Summoner branch + proposed cooldown fall-through.
- Support: healer (`starter-heal` on the kit).
- `AI_BACKLINE_PROTECT` may keep the Support off the front if soph ≥ 4.
- Soph 3–4. `groupTactics` at 4 lets them share the wolf’s target, not the player’s wisp only.

VARIANTS:

- `FSN-KENNEL-LITANY/ARCHER` — `summon-archer` instead of wolf (kiter pup). Same cap.
- `FSN-KENNEL-LITANY/WARDEN` — CADRE unlock: flip `summon-sentinel` instead of wolf. Guardian blocks for the Support.

STATUS: PROPOSED

---

### FSN-WARD-MEND

FORMATION_ID: `FSN-WARD-MEND`  
RELATIVE_DIFFICULTY: PAIR (kit band 1)  
ENEMIES:

- `ROLE-TANK` — `rook` / `iron_golem` — pack median + 1
- `ROLE-HEALER` — `queen` / default — pack median — `starter-heal` only

VARIANT_RULES:

- This is the teaching tank + healer. No Inferno, no Sacrifice, no Swap.
- Elite: Tank only (`iron_golem` already thick). Healer never gets Lifesteal Nova on PAIR.
- If kit band is still 0 in a run, **do not spawn this id** (heal is band 1). Show `FSN-IRON-BATTERY` band 0 instead.

SPELL_POOL_INTERACTIONS:

- Iron Skin (RES +30%, 3 turns) + Blood Mend (12 HP) is sustain, not a lock. Player DoTs (`starter-poison`, `spell-inferno`) still tick through RES; `cursed-wound` (player-side) halves the mend.

TACTICAL_PLAN:

- Tank walks up and Strikes. Healer stays ≥ 3 tiles back and mends the tank when the tank is under 50% HP. If the tank is healthy, the Healer **holds** (no invented nuke).

SYNERGY:

- Tank + healer. The golem is the health pool; the queen is the refill. Kill order is the puzzle.

PLAYER_THREAT:

- Long fight. Low spike. A player who never looks at the queen loses to attrition, not to a combo.

COUNTERPLAY:

- Focus the Healer (glass RES 0.75). Or apply healRecv down (`spell-cursed-wound`) and ignore her. Walk around the golem; it is MP 1 on the family table.

MAP_REQUIREMENTS:

- `openField` or `arena`. The Healer must have a retreat tile that is not behind a one-cell choke the Tank also occupies.
- No Thorned Ground on the only path to the Healer (that would tax the correct play).

AI_REQUIREMENTS:

- Tank: charger.
- Healer: healer. `AI_BACKLINE_PROTECT` optional at soph 3.
- Soph 2–3.

VARIANTS:

- `FSN-WARD-MEND/SCRIBE` — Healer family `bone_scribe` (higher SR, still no nuke).

STATUS: PROPOSED

---

### FSN-EMBER-RIFT

FORMATION_ID: `FSN-EMBER-RIFT`  
RELATIVE_DIFFICULTY: BRIGADE (kit band 2 for Inferno, else skip this id)  
ENEMIES:

- `ROLE-HAZARD` — `knight` / `ember_knight` — pack median — carries `spell-inferno` (cooldown 3)
- `ROLE-DISPLACER` — `bishop` / `void_mirror` — pack median — `spell-swap` + `starter-frost`
- Optional third: a `pawn` charger with **no** extra spells (body, not a third threat)

VARIANT_RULES:

- Inferno is a **single-target burn** (8/turn × 3), not a floor rewrite. Do not pair with a map that already paints the engagement in lava.
- Swap is legal only onto a free floor that is not lava, spikes, void, or portal, and from which the player has a walk-off.
- Elite: Hazard may add `spell-enrage` on itself. Displacer never gets Inferno (heal-less bishop stays caster).
- `spell-frost-nova` is a CADRE variant, not the base sheet (AoE + Slow around the mirror).

SPELL_POOL_INTERACTIONS:

- Swap relocates the player; Inferno is then in range **if** the player was moved toward the knight — the Displacer must aim Swap so the player is 2–3 tiles from the knight, not adjacent-on-lava.
- Frost after Swap is a tax, not a root.

TACTICAL_PLAN:

- Hazard walks a **flanking** route and holds Inferno until it has LoS and the player is not already standing on a walk-hazard.
- Displacer stays at range 3 and Swaps only after the player has committed MP toward the knight, so the player can still walk back.

SYNERGY:

- Hazard creator + displacement specialist. The burn is avoidable if the player keeps a tile of slack after the swap.

PLAYER_THREAT:

- Positional. The fail state is “I spent all MP to close, then got swapped next to a burn.” Recoverable if a walk-off exists.

COUNTERPLAY:

- Keep 2 MP in reserve. Kill the mirror first (mid HP, not a golem). Inferno’s 3-turn cooldown is the punish window.
- Do not stand on the only legal Swap destination (occupancy).

MAP_REQUIREMENTS:

- `ruinsIslands` or `asymmetric` with **two islands connected by two bridges**. One bridge may be lava; the other must be clean.
- Reject `corridorMaze` single-file plus lava. That is a hardlock.

AI_REQUIREMENTS:

- Hazard: flanker (knight) or charger if family inference ever overrides — **do not** set `aiStrategy: "berserk"` on the base sheet (berserker never retreats; too easy to force a lava suicide that also deletes the player).
- Displacer: caster. Needs an explicit **Swap legality** check (proposed): destination walkable, not hazard, player retains ≥ 1 escape tile.
- Soph 3–4.

VARIANTS:

- `FSN-EMBER-RIFT/NOVA` — CADRE: replace Frost with `spell-frost-nova` (radius 2). Player must still have a tile outside the circle.
- `FSN-EMBER-RIFT/SOLO` — drop the optional pawn.

STATUS: PROPOSED

---

### FSN-ROT-CUT

FORMATION_ID: `FSN-ROT-CUT`  
RELATIVE_DIFFICULTY: CELL → BRIGADE (kit band 1)  
ENEMIES:

- `ROLE-DEBUFFER` — `bishop` / `plague_rat` — pack median − 1 (glass) — poison / weaken / expose
- `ROLE-FINISHER` — `pawn` / default — pack median — venom + drain-courage; Sacrifice only when wounded

VARIANT_RULES:

- CELL: Debuffer has `starter-poison` + `spell-weaken` only.
- BRIGADE: add `spell-expose` (15 + RES/SP −20%).
- Elite: Finisher may hold `spell-cursed-wound` **or** Sacrifice, never both.
- Do not attach Inferno. This sheet is a bleed, not a burst.

SPELL_POOL_INTERACTIONS:

- Poison (4/turn) + Venom (4/turn) stack additively (`appendDotStack`). That is the intended pressure. It is not unavoidable: the player can kill the rat in one or two hits (`hpMult` 0.4).
- Weaken (−30% dmg, 2 turns) makes a panicked trade worse; it does not stop walking.
- Drain Courage (−1 AP, 1 turn) is the finisher’s “lock-adjacent” tool. The player still acts.

TACTICAL_PLAN:

- Debuffer kites and applies DoT/Weaken first. Finisher holds outside `ENEMY_REACHABLE_STEP_BUDGET` until a DoT is on the player, then walks in.
- If the Finisher is ≤ 20% HP it may Sacrifice. The player can prevent that by finishing it first.

SYNERGY:

- Debuffer + finisher. The pawn’s Strike is ordinary until the rat has painted the target.

PLAYER_THREAT:

- Stacked DoTs plus a late Sacrifice. All of it is telegraphed and interruptible.

COUNTERPLAY:

- Kill the rat immediately (glass). Cleanse is not required if the source is dead and durations are short (2–3 turns).
- Do not stand adjacent to a wounded pawn.

MAP_REQUIREMENTS:

- `openField` or `arena`. Finisher needs a straight walk; Debuffer needs space to stay at range 3–4.
- No Glass Realm modifier on this id (double damage + stacked DoTs reads as unavoidable). Iron Curse (heal cut) is acceptable.

AI_REQUIREMENTS:

- Debuffer: caster.
- Finisher: charger with **hold** when out of budget (already tested in `enemyAI.charger.test.ts`).
- Soph 2–4. At 4, `groupTactics` lets the pawn inherit the rat’s target.

VARIANTS:

- `FSN-ROT-CUT/KNIFE` — Finisher is `ROLE-ASSASSIN` instead of pawn (CELL+). Same DoT gate before commit.

STATUS: PROPOSED

---

### FSN-TIDE-LOCK

FORMATION_ID: `FSN-TIDE-LOCK`  
RELATIVE_DIFFICULTY: CELL (kit band 1)  
ENEMIES:

- `ROLE-KITER` — `bishop` / `tide_shade` — pack median — frost + poison + slow
- `ROLE-MOVER` — `king` / default — pack median — frost + slow + haste (on the kiter)

VARIANT_RULES:

- No Swap on either body (that is `FSN-EMBER-RIFT`).
- Elite: Kiter only, extra `spell-mark` at BRIGADE. Mover never gets Inferno on this sheet (band 2 king would spike; keep band 1).
- If kit band 2 is the run’s current band, **still strip Inferno** from this id. Movement control should stay a positioning exam.

SPELL_POOL_INTERACTIONS:

- Dual Slow is allowed only if durations do not permanently pin MP at 0. Cap applied Slow at **−2 MP** on the player (second Slow refreshes, does not stack past −2). **Proposed** stacking rule; if live stacking is additive, attach Slow to **one** member only.
- Haste on the kiter (+2 MP, 1 turn) is the “they get away again” beat.

TACTICAL_PLAN:

- Kiter keeps Chebyshev ≥ 3, shoots Frost/Poison, Slow if the player closed last turn.
- Mover stands behind the kiter, Hastes it, Frosts if the player ignores them.

SYNERGY:

- Kiter + movement controller. The player is chasing a high-MP shade while a king pays for that mobility.

PLAYER_THREAT:

- Frustration and chip, not a lock. A player who corners the shade wins; a player who sprints the first gap gets kited.

COUNTERPLAY:

- Cut between them and kill the king (no family tank). Linear / diagonal spells on `chessboard` maps punish the pair if they share a file.
- Attract / Swap (player) yanks the kiter into Strike range.

MAP_REQUIREMENTS:

- `openField`, `arena`, or `chessboard` with **wide** files. Reject `corridorMaze` (a kiter in a hallway is either helpless or a hardlock depending on who owns the door).
- Paper Windstorm (ranged miss) is a **fair** modifier here — it also hits the kiter.

AI_REQUIREMENTS:

- Both: caster. Kiter uses the same keep-range habit as `decideSummonArcher` (3+ tiles) — **proposed** reuse of that distance rule on a full enemy, not only the archer summon.
- Soph 2–3.

VARIANTS:

- `FSN-TIDE-LOCK/PUP` — BRIGADE: Mover is `ROLE-SUMMONER` with `summon-archer` instead of Haste. Cap 1.

STATUS: PROPOSED

---

### FSN-TRI-BASTION

FORMATION_ID: `FSN-TRI-BASTION`  
RELATIVE_DIFFICULTY: CADRE (kit band 1–2)  
ENEMIES:

- `ROLE-TANK` — `rook` / `iron_golem` — median + 1 — leader (`isLeader`)
- `ROLE-HEALER` — `queen` / `bone_scribe` — median
- `ROLE-ARTILLERY` — `bishop` / `wraith_bishop` — median — frost; Inferno only if kit band 2

VARIANT_RULES:

- Unlock only after the player has cleared `FSN-WARD-MEND` **and** `FSN-IRON-BATTERY` in the same run (relative mastery, not a level gate).
- Elite: Tank-leader only. Healer and Artillery stay junior so leader-boost (10% per death) is the escalation, not three elites.
- If the Tank dies first, boost lands on nobody new — the remaining pair is a weaker `FSN-WARD-MEND` or `FSN-IRON-BATTERY`. That is intended.

SPELL_POOL_INTERACTIONS:

- Iron Skin on the Tank, Blood Mend on the Tank, Frost/Inferno from the back. Three roles, one focus-fire story.
- Inferno cooldown 3 keeps artillery from deleting the player while the golem is still up.

TACTICAL_PLAN:

- Tank leads and camps a **wide** choke (soph ≥ 3 only if a side aisle exists).
- Healer mends the Tank, then the Artillery if the Tank is healthy.
- Artillery never walks past the Tank.

SYNERGY:

- Pair compositions stacked: tank + healer **and** protector + artillery. CADRE because the player must pick a kill order under leader-boost.

PLAYER_THREAT:

- Long, structured fight. Spike only if Inferno is up **and** the player is already DoT'd from a previous sheet — this pack itself should not also carry Poison.

COUNTERPLAY:

- Kill the Healer (scribe is fragile), then the Artillery, leave the golem. Or burst the leader and accept the 10% boost on two glass pieces you then delete.
- Cursed Wound on the Tank turns the Healer off.

MAP_REQUIREMENTS:

- `fortress` with a courtyard: choke **plus** a gallery the player can take.
- Dungeon depth may add **one** extra `pawn` (body), not a second artillery.

AI_REQUIREMENTS:

- Tank charger + optional `chokepointCamp` (soph ≥ 3).
- Healer healer.
- Artillery caster + LoS reposition.
- Soph 4–6 so `groupTactics` can focus the player’s wisp **or** the player, not both on one turn via invented extra actions.

VARIANTS:

- `FSN-TRI-BASTION/NO-LEADER` — teaching CADRE without boost.
- `FSN-TRI-BASTION/CANTOR` — COURT unlock: Healer replaced by `ROLE-CANTOR` (enemy wisp summon on a `ROLE-SUMMONER` king). Cap 1 wisp + the two pieces.

STATUS: PROPOSED

---

### FSN-MARK-CONFLAGRATION

FORMATION_ID: `FSN-MARK-CONFLAGRATION`  
RELATIVE_DIFFICULTY: CADRE (kit band 2)  
ENEMIES:

- `ROLE-CONTROLLER` — `bishop` / default — median — `spell-mark` + `spell-expose`
- `ROLE-ARTILLERY` — `bishop` / `wraith_bishop` — median — `spell-inferno`
- `ROLE-FINISHER` — `pawn` / default — median − 1 — Strike only (no Sacrifice)

VARIANT_RULES:

- Unlock after the player has seen Inferno **and** a Mark (from their own book or a prior elite variant).
- Elite: Controller only. Artillery stays on the 3-turn Inferno cadence.
- Never add Swap or Frost Nova. This sheet is a damage-amp exam, not a displacement exam.

SPELL_POOL_INTERACTIONS:

- Mark = next spell on that tile ×2. Inferno is a DoT with 0 upfront — **confirm live Mark × DoT behavior before shipping.** If Mark only doubles an upfront hit, pair Mark with Expose’s 15 damage or with the pawn’s Strike, **not** with Inferno.
- Proposed safe reading: Controller Marks, Expose (15, RES down), Artillery Inferno **after** Expose, pawn walks in next turn. If Mark does not apply to Inferno’s ticks, the ×2 lands on Expose or Strike.
- Two bishops both being `inferArchetype` casters is fine (no heal on either kit).

TACTICAL_PLAN:

- Turn 1: Mark. Turn 2: Expose or Inferno, never both on the same AP bar if that would exceed a readable combo.
- Pawn holds until Mark is consumed, then walks in. No wounded Sacrifice (keeps the spike countable).

SYNERGY:

- Rare-spell combo: mark + artillery + a cheap finisher. The player can see the Mark icon and step off the tile.

PLAYER_THREAT:

- One big readable burst window every few turns. Not every turn.

COUNTERPLAY:

- Leave the marked tile. Kill the Controller (no family). Inferno without Mark is a standard burn.
- LoS break (player Barrier, corners).

MAP_REQUIREMENTS:

- `chessboard` or `openField` with **room to step off** the marked cell in every direction the player can be marked.
- No Time Warp (15s) on this id — a short timer plus a Mark window is a panic hardlock.

AI_REQUIREMENTS:

- Both bishops: caster. Pawn: charger with hold.
- Needs a **proposed** “do not recast Mark on a tile the player already left” and “do not Inferno the same turn as Expose if AP would allow an unreadable double.”
- Soph 4–6. Lethal lookahead may pick the pawn’s Strike into a marked low-HP player — that is fair if the Mark was visible.

VARIANTS:

- `FSN-MARK-CONFLAGRATION/VEIL` — Expose replaced by `spell-shadow-veil` (softer amp).

STATUS: PROPOSED

---

### FSN-PACK-PINCER

FORMATION_ID: `FSN-PACK-PINCER`  
RELATIVE_DIFFICULTY: CADRE (kit band 1, AI soph ≥ 4)  
ENEMIES:

- `ROLE-SUMMONER` — `king` / default — median — `summon-dire-wolf`
- `ROLE-ASSASSIN` — `knight` / `ember_knight` — median
- `ROLE-TANK` — `rook` / default (not golem — keep one frontliner) — median + 1

VARIANT_RULES:

- Unlock when `groupTactics` (AI soph 4) is in the run’s sophistication band.
- Summoner cap 1 wolf. The pincer is Tank + Knight + Wolf, not two wolves.
- Elite: Knight may take Venom + Shadow Veil. Tank stays band-1 Iron Skin.
- No Healer on this sheet (that is `FSN-KENNEL-LITANY` / `FSN-TRI-BASTION`).

SPELL_POOL_INTERACTIONS:

- Wolf Venom + Knight Venom can double-stack. Limit to **one** venom source if the player has not yet seen `FSN-ROT-CUT`.
- Iron Skin on the rook only.

TACTICAL_PLAN:

- Tank approaches the front. Knight takes the side path. Wolf is summoned toward the midpoint **behind** the player if a legal cell exists, else beside the Tank (never on the player’s last exit).
- `groupTactics` + existing wisp harassment: if the player brought a wisp, **one** of the three (not all three) peels it. The others stay on the player. **Proposed** split; today any non-healer may prioritize the wisp.

SYNERGY:

- Summoner + assassin + tank. Three angles, one cap. This is the first sheet that needs coordination, not just adjacent roles.

PLAYER_THREAT:

- Surrounded **feeling** with two exits still open. If the wolf lands on an exit, the other exit must remain.

COUNTERPLAY:

- Collapse the knight first (flanker dies if you face it). Ignore the wolf’s remaining turns. Dive the summoner when the wolf is dead / on cooldown (2 turns).

MAP_REQUIREMENTS:

- `asymmetric` or `fortress` courtyard with **two** flanks. Reject maps where the side path is a dead-end (the knight would bounce and stack on the tank — messy, not tactical).
- Occupancy and `punchRosterReachability` still apply; this sheet must not isolate a hostile behind void.

AI_REQUIREMENTS:

- Summoner + proposed fall-through Frost.
- Knight: flanker.
- Rook: charger.
- Soph 4–6. `focusAlreadySet` already limits pack focus to one target per turn — keep that.
- Do not enable `bottleneckControl` (8) on this id unless the courtyard has a gallery.

VARIANTS:

- `FSN-PACK-PINCER/ARCHER` — wolf → archer (back-line pincer).
- `FSN-PACK-PINCER/FUSE` — COURT / rare: replace knight with enemy bomber **only** on `arena` / `openField`, `AI_KAMIKAZE_MIN_TARGETS` respected, never solo-detonate on the player.

STATUS: PROPOSED

---

### FSN-MIRROR-SCRIPTORIUM

FORMATION_ID: `FSN-MIRROR-SCRIPTORIUM`  
RELATIVE_DIFFICULTY: CADRE (kit band 1–2)  
ENEMIES:

- `ROLE-DISPLACER` — `queen` **without heal** / `void_mirror` — median — Swap + Frost (no Blood Mend, so she stays caster)
- `ROLE-SUPPORT` — `queen` / `bone_scribe` — median − 1 — heal + haste (the only healer)
- `ROLE-ASSASSIN` — `knight` / default — median

VARIANT_RULES:

- Two queens are the same piece asset with **different kits**. That is the point: combination, not a new model.
- Displacer queen must not receive `starter-heal` or `inferArchetype` will make two healers and the sheet collapses.
- Elite: Mirror only, may add `spell-frost-nova` if a tile outside radius 2 exists.
- Unlock after `FSN-FROST-KNIFE` and `FSN-EMBER-RIFT` have been answered.

SPELL_POOL_INTERACTIONS:

- Swap the player toward the knight; Support Hastes the knight that turn. Same legality rules as `FSN-EMBER-RIFT`.
- Scribe heals the knight, not the mirror (mirror is mid HP; knight is the threat).

TACTICAL_PLAN:

- Mirror stays at 3. Scribe stays at 4, opposite corner. Knight uses the swapped displacement as its “flank appeared under me” moment — it still needs a reachable step, not a teleport of its own.

SYNERGY:

- Displacement + support + assassin. The scribe is why the knife survives the first punish.

PLAYER_THREAT:

- High if the player dumps everything into the knight and gets swapped again. Still no hard CC.

COUNTERPLAY:

- Kill the scribe (low damage family). Then the sheet is a softer `FSN-FROST-KNIFE`.
- Force the mirror to Swap a **summon** (if the player brought one) — wasted action, legal.

MAP_REQUIREMENTS:

- `ruinsIslands` with two bridges, or `arena` with pillars (`asymmetric`). Always two walk-offs after a Swap.
- No Void Rift tile as a legal Swap dest.

AI_REQUIREMENTS:

- Displacer: caster + Swap legality.
- Support: healer.
- Knight: flanker.
- Soph 4–6. Backline protect on the scribe.

VARIANTS:

- `FSN-MIRROR-SCRIPTORIUM/NOVA` — Frost Nova on the mirror, player-outside-circle required.

STATUS: PROPOSED

---

### FSN-CROWN-ESCORT

FORMATION_ID: `FSN-CROWN-ESCORT`  
RELATIVE_DIFFICULTY: COURT (kit band 2, AI soph 6–8)  
ENEMIES:

- `ROLE-MOVER` leader — `king` / default — median + 1 — `isLeader` — frost + slow + haste. **No Inferno** even at band 2 (court control, not a nuke throne)
- `ROLE-PROTECTOR` ×2 — `rook` / `iron_golem` — median — Iron Skin
- `ROLE-CONTROLLER` — `bishop` / `tide_shade` — median — frost + slow + optional Mark

VARIANT_RULES:

- Unlock after a leader-boost CADRE (`FSN-TRI-BASTION` or `FSN-PACK-PINCER`).
- One elite only: the king. Golems stay symmetric so the player can read them.
- Optional COURT flag: king is `ROLE-SUMMONER` **instead of** Haste, one archer, still no Inferno.
- `bottleneckControl` (8) only if the map has a gallery. `escapeRoute` (6) is on: wounded king walks to the gallery, not through the player.
- InstantKill / betrayal stay off.

SPELL_POOL_INTERACTIONS:

- Dual golem Iron Skin + one Slow source (king **or** bishop, not both stacking past −2 MP — same proposed cap as `FSN-TIDE-LOCK`).
- Mark is optional and never combined with Inferno on this sheet.
- Leader boost 10% × fallen escort. Four bodies means a late king can become stout — the player is expected to **cut the king early** or accept a longer finish. Boost is RES/damage, not a new mechanic.

TACTICAL_PLAN:

- Golems form a moving wall with a **gap** (never a closed box). Controller and king sit in the pocket behind the gap.
- If a golem dies, the wall opens; the king may retreat (`escapeRoute`) rather than suddenly one-shot.

SYNERGY:

- Court-scale protector + controller + movement. Sophistication is the unlock, not a new monster.

PLAYER_THREAT:

- Highest structured threat in this catalog. Still turn-based and interruptible. The failure mode is ignoring the king until three boosts land — a skill issue, not a lock.

COUNTERPLAY:

- Snipe the king down a gallery (wraith-less king, RES 1.0). Or peel one golem to open the gap and collapse the backline.
- Player Inferno / Chain Lightning (bounces 2) is aimed at this clump — that is fair counter-synergy.

MAP_REQUIREMENTS:

- `fortress` courtyard + gallery, or `openField` with **cover pillars**. Never a closed ring of walls around the player.
- Dungeon depth may not add a fifth hostile to this id (`MAX_ENEMIES` is 20, but the sheet is a court of four). Extra dungeon bodies spawn **elsewhere on the map**, outside Chebyshev 4, as a separate PAIR, not as a fifth escort.

AI_REQUIREMENTS:

- King: caster (or summoner variant) + `escapeRoute` at soph 6.
- Golems: charger, `chokepointCamp` only with a gap.
- Bishop: caster.
- Soph 6–8. `groupTactics` on. `erratic` (5) may apply to **one** golem, not the king (readable throne).
- Proposed: escorts do not stack on the same tile if the gap would close (occupancy already prevents stacking; pathing must not **plan** a box-in).

VARIANTS:

- `FSN-CROWN-ESCORT/KENNEL` — king summoner + one archer, drop Haste.
- `FSN-CROWN-ESCORT/CANTOR` — replace Controller with enemy wisp (`ROLE-CANTOR`). Still cap 1 summon. Healer-summon AI already hunts the most-wounded escort.

STATUS: PROPOSED

---

## Progression (relative unlock graph)

```
PAIR:   IRON-BATTERY (band 0–1)     WARD-MEND (band 1)
                 \                     /
CELL:        FROST-KNIFE          ROT-CUT          TIDE-LOCK
                 \                  |                 /
BRIGADE:     KENNEL-LITANY      EMBER-RIFT      ROT-CUT+expose
                 \                  |                 /
CADRE:    TRI-BASTION     PACK-PINCER     MARK-CONFLAGRATION     MIRROR-SCRIPTORIUM
                 \                  |                 /
COURT:                      CROWN-ESCORT
```

A run may skip a branch it has not earned. It must not skip a **grade** (no COURT as the first composed fight). Dungeon depth and tier-adjacent rolls change **numbers**, not the graph.

---

## Implementation notes (for a later engineer — not this drop)

These sheets need a pack composer, intended kit-band input to `buildEnemyKit`, family assignment by role (not 30% noise), `isSummoner` + cooldown fall-through, Swap/Slow legality, and (for kiter kings/shades) the archer keep-range rule on full enemies.

They do **not** need new pixel patterns. They do **not** need RAF, map-generation, turn-order, or damage-formula edits to be designed. Map **selection** (prefer `fortress` with a gallery; reject sealed pockets) can be a filter on already generated maps.

Do not implement those hooks in the same change as this catalog.

---

## Sources (line-accurate)

- Kits and archetypes: `src/frontend/src/engine/enemyAI.ts` 79–86, 156–178, 420–449, 1648–1692, 1818–1893
- AI gates and summon caps: `src/frontend/src/data/gameConstants.ts` 153–210, 294–301
- Families and spawn lottery: `src/frontend/src/types/gameTypes.ts` 12–20; `WorldExploration.tsx` 6084–6326, 12180–12209
- Enemy-legal spells: `src/frontend/src/data/spellData.ts` (usableByEnemy flags)
- Map archetypes: `src/frontend/src/engine/mapGen.ts` 4–42
- Leader boost: admin `leaderBoostPercent` default 10
