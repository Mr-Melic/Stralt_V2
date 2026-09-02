# Player Experience Coherence Audit — 2026-09-01

**Auditor:** Player Experience Coherence Auditor  
**Automation:** `30118f7c-a49e-11f1-a7d1-d6b4613131ce` (cron `0 */48 * * *`)  
**HEAD inspected:** `dd275aa` (`Merge pull request #182` — Caffeine import gates)  
**Prior audit:** [`PX_COHERENCE_AUDIT_2026-08-31.md`](./PX_COHERENCE_AUDIT_2026-08-31.md) at `22503b5`  
**Gameplay / production code:** not modified.

Stralt is judged as **one tactical game**. There is **no level cap**. Flat numbers are judged by whether they still create a decision at high level, not by whether an “endgame” exists.

Protected:

- tactical clarity
- meaningful choice
- spell-discovery excitement
- progressive enemy sophistication
- comprehensible encounter rules

Every system was asked at least one of:

1. What tactical decision does this add?
2. What mastery does this reward?
3. What progression fantasy does this support?
4. What new counterplay does this create?

If the honest answer is “none,” the system is noise.

**Do not re-file** `PXA-2026-08-31-001` … `015`. They are still open.  
New records: [`ACTION_IDS_2026-09-01.md`](./ACTION_IDS_2026-09-01.md) (`PXA-2026-09-01-001` … `003`).

---

## Delta since 2026-08-31

Integrity work landed (persist races, death/heal/shop, recap click-through, applyRewards clamps, admin summon fields, vitals orbs, Sacrifice counted on challenges). That makes the **pipe** more trustworthy. It does **not** make the **loop** coherent.

What did **not** change for player identity:

| Claim from last audit | Still true? | Updated evidence |
| :--- | :--- | :--- |
| Full `starterSpells` gifted as innate | **Yes** | `WorldExploration.tsx` 2393–2398; `spellData.ts` 27–28 |
| `combinedMechanic` unused | **Yes** | Declared in `useBossRush.ts` 17–19 / 23–134; no WX/engine reader |
| Blood HUD never spent | **Yes** — bar **moved** | `WorldExploration.tsx` 1206–1218, 18103–18145. GameFlow top bar is now a spacer (`GameFlow.tsx` 280–288) |
| Covenant buff write-only | **Yes** | `covenantBuffMapsRef` set at 11905–11910; no combat reader |
| Slime Flood ≡ Frozen Terrain | **Yes** | `mapModifiers.ts` 154–172, both `onMpCost * 2` |
| Gravity Well / Fog of War empty | **Yes** | Registry 280–296; WX binds `_isGravityWell` / `_isFogOfWar` (2326–2328) and never uses them |
| Titan’s Vigor +1000 HP, 1–5× dmg | **Yes** | `mapModifiers.ts` 299–316 |
| Admin bosses still name `fireball` / `blood_nova` | **Yes** | `admin.mo` 358–541 |
| Random legendary challenge every fight | **Yes** | `WorldExploration.tsx` 12774–12782 |
| Buff shop vs canister catalog drift | **Yes** | `BuffShop.tsx` 29–77 vs `main.mo` 2400–2407 (`greater_potion` vs `greater_health_potion`; elixir 200 vs 80; fury 100 vs 150) |
| Kits stop at `levelZone` 2; knight is Strike-only | **Yes** | `enemyAI.ts` 156–178 |

What **did** change (and why it matters):

1. **`shouldIncludeBackendSpellInLibrary`** (`adminSafety.ts` 310–317) looks like an ownership gate. It is not. `usableByPlayer !== false` still unions the spell into the book (`WorldExploration.tsx` 2424–2435). Admin extras with `usableByPlayer = true` (`vampire_bite`, `void_collapse`, …) still dump. Covered by PXA-001; do not treat this as discovery.
2. **Three families grew secret melee hooks** that last audit did not have: Ember Knight burn, Tide Shade −1 MP, Void Mirror 25% reflect. The player-facing **Enemies** register still describes a different game (elemental types, evasion, magic immunity, wall-phase).
3. **A second world-event catalog** (`worldFeatures.ts` + `docs/WORLD_DYNAMICS.md`) is in-repo, unwired, and designed to **stack** on the existing 22 modifiers (max 3 extra features). Rune Bearer is a map-only attune path that would compete with observe→win→unlock.
4. **Paper Windstorm’s announce text is wrong.** Last audit listed it as “reach halved.” Live code is a 50% miss on `range > 1` (`WorldExploration.tsx` 16926–16930). The registry comment still claims targeting halves range (`mapModifiers.ts` 249–257). Targeting does not.

Sibling design IDs already own `computeAITier` 30% noise, EnemyRegister-as-admin-catalog (EBA-024), and the XP-threshold wall (LHIPS-001). This run does not re-file those. PX still agrees: random AI tier fights progressive sophistication; linear `level * 20` victory XP vs `100 * 2^(N-1)` stops answering the no-cap fantasy in the mid-teens — **scale the combat grant**, do not invent a cap.

---

## Verdict

The **core identity is still sound**: AP spends actions, MP spends movement, explicit `SpellConfig` targeting, one Doka wallet, persist-locked `applyRewards` + root recap, percentage death, honest solo boss kits, five distinct summons, signature spells (Swap, Mark, Barrier, Mirror, Timestep, Sacrifice).

The game still does **not** play as one loop. The same three fractures dominate:

1. **Discovery is not a system.** The book is gifted. A helper named like a gate does not gate.
2. **Rules on the box are not rules in the engine.** Boss-rush pairs, several map events, admin modifier labels, and the Enemies register teach sentences combat does not run.
3. **Most secondary rewards are flat** on an unbounded `2^(N-1)` curve. LHIPS shows the *primary* grant has the same shape problem. That is not “missing endgame.”

**New this run:** the player can open **Enemies** from the world HUD and study a bestiary of elemental weaknesses, evasion, and Archbishop invulnerability that the engine does not implement — while three families silently apply different melee hooks. That is a direct hit on “comprehensible encounter rules.”

Until PXA-001 / 003 / 007 / 008 and the three new IDs are designed, adding World Dynamics tiles, more families, or more admin SKUs will make the identity *less* readable.

---

## Classification (all reviewed systems)

| System | Class | One-line why |
| :--- | :--- | :--- |
| **Combat AP/MP split** | KEEP | AP = actions, MP = movement; book `mpCost` is ~0. The Dofus-like decision. |
| **Explicit spell targeting metadata** | KEEP | `targetType` / range / LoS — not name heuristics. Protect this. |
| **Atomic reward funnel + root recap** | KEEP | `applyRewards` / `saveBattleStats` + `PostBattleRecap` at app root. Integrity patches since last run stay. |
| **Death 20% XP / 40% Doka + Death Realm** | KEEP | Percentage cost stays meaningful with no cap. 1.5s guards are a real rule. |
| **Solo boss kits + `BossAbility` tags** | KEEP | Unique phase kits; real specials. Boss Guide is closer to truth than EnemyRegister. |
| **Enemy / summon AI engine** | KEEP | Archetypes, lethal lookahead, LoS step, backline guard. Do not add toggles. |
| **Summon five-pack** | KEEP | Hunter / guardian / archer / bomber / healer are distinct counterplay. |
| **Signature spells** | KEEP | Swap, Mark, Barrier, Mirror, Timestep, Sacrifice each ask a question the clones do not. |
| **JUICE** | KEEP | Shake / hitstop / numbers. Presentation only. |
| **Admin UI gated + backend `#admin`** | KEEP | Must stay off the player HUD. |
| **Ember / Tide / Void family melee hooks** | MERGE into kits | Real but name-heuristic (`family === "ember_knight"`). Fold into explicit kit metadata. |
| **Spell catalog (full `starterSpells`)** | MERGE | Shield ≡ Iron Skin; Poison ≡ Venom; two heals+CHC; Expose ≡ Shadow Veil; three drains. |
| **Enemy identity (piece + family + aiTier + Register lore)** | SIMPLIFY | Four posters for one unit. PXA-007 still owns the pick. |
| **Achievements / Feats** | SIMPLIFY | Mastery mixed with chores and RNG. Button says Feats; `title` says Achievements (`GameFlow.tsx` 326–333). |
| **Buff shop + IAP + Doka-heal + rename** | SIMPLIFY | Two shop buttons (GameFlow **Items**, WX **Buy Doka**). Catalog still disagrees with the canister. |
| **HUD Blood bar** | DEPRECATE | Still rendered every session; `_setBloodBalance` unused. |
| **`resilience` / `evasion` on persist** | DEPRECATE or EXPAND | Required on `CharacterStats`; unused in combat math. Register already claims “evasion passive.” |
| **`covenantBuff` / shrine 3-map write** | DEPRECATE or EXPAND | Shrine pays 300 Doka. The buff is still write-only. |
| **Spell discovery** | REWORK | Innate 32-id book. No observe → win → unlock. |
| **Battle challenges** | REWORK | Random pick among 9, including legendary 1000 XP, every fight. Flat. |
| **Boss-rush combined mechanics** | REWORK | Copy-only. Not shown in WX, not executed. |
| **Admin-enabled catalogs** | REWORK | Live book, `bossKits.ts`, `admin.mo` seeds are three truths. |
| **Map modifiers / world events** | SIMPLIFY + MERGE | 22 entries. Twins, placeholders, Titan lottery. Announce text can lie. |
| **World Dynamics catalog (`worldFeatures.ts`)** | MERGE or hold | Unwired. Designed to stack on the 22. Rune Bearer is a second discovery language. |
| **EnemyRegister / family lore** | REWORK | Player-facing rule card for a game that is not running. |
| **Dungeon chain** | EXPAND | Reward skin on the overworld. Needs a rule free roam does not have. |
| **Progression / rewards (flat + linear-vs-exp)** | EXPAND | Curve unbounded; grants are not. Do not add a cap. |
| **Terminology** | SIMPLIFY | Feats vs Achievements; Blood vs Doka vs Blood Moon vs Blood Altar; SR vs RES vs resilience. |

---

## System notes (evidence)

### Enemies — SIMPLIFY poster; REWORK the register

Overworld packs are still **chess pieces** with `buildEnemyKit` (`enemyAI.ts` 156–178). Knight never grows a second spell. Queen/King only swap frost→inferno at `levelZone >= 2`.

The **30% family overlay** (`WorldExploration.tsx` 6448–6537) still paints HP/dmg/RES and pixels. Three families now also apply **name-heuristic** melee extras:

| Family | Engine actually does | EnemyRegister teaches (`EnemyRegister.tsx`) |
| :--- | :--- | :--- |
| Ember Knight | 3 DoT / 3 turns on melee (17224–17238) | Burning **tiles**, AoE fire, weak to ice |
| Tide Shade | −1 MP / 2 turns on melee (17240–17255) | Adjacent slow, **HP regen**, weak to lightning |
| Void Mirror | 25% of pre-mitigation dmg reflected (`castHelpers.ts` 326–336) | Copies spells; **immune to magic until physical** |
| Wraith / Golem / Rat / Scribe | Stat mults + pixels only | Wall-phase, poison stacks, stagger, Weakened |
| Crimson Spawn / Shadow Lurker / Storm Caller | **Not in the 30% roll** (elite doc already noted) | Lifesteal, **evasion**, earth-weak, storm clouds |

`EnemyRegister` is a world-HUD button (`WorldExploration.tsx` 18211–18224). Archbishop tip (90): “invulnerable while any pawn lives” is the unused rush pair rule taught as a general boss fact.

**Keep** piece kits + the three real family hooks (as metadata, not `family ===` strings).  
**Do not** teach elemental types the combat math does not have.  
**Do not** implement EBA-024 (wire Register to admin lore) until the card matches the engine.

New ID: PXA-2026-09-01-001.

### AI — KEEP (kits: EXPAND; random tier: already filed)

`decideEnemyAction` is still the best expression of identity. `computeAITier` still has a 30% full-random 1–10 (`combatMath.ts` 34–51). That fights “progressive sophistication.” Already owned by MTD / ENEMY docs / ACTION_IDS_2026-08-31. PX: do not rewrite `enemyAI.ts` to add verbs; teach the existing ones through kits (PXA-013).

### Spells — MERGE clones, KEEP signatures

`starterSpells` is still the same 32-id book including Strike (`spellData.ts` 9–28). Clone pairs from last audit still stand. `spellType: "damage"` on Shield (40) still leaks into admin.

Almost every spell has `mpCost: 0`. **Keep that.**

### Spell discovery — REWORK (unchanged class)

```2393:2398:src/frontend/src/components/WorldExploration.tsx
  // Base spells = the always-owned innate spells (ALL starter spells + physical attack)
  // Every spell in starterSpells is a base/innate spell — always shown, never removable.
  const baseSpells = useMemo(() => {
    const base = starterSpells.map((s) => ({
      ...s,
      isBaseSpell: true as const,
```

`shouldIncludeBackendSpellInLibrary` only hides `usableByPlayer === false` unless already owned. Catalog membership is still ownership for every player-usable admin row. No `ownedSpellIds` / `observedSpellIds`. Recap still cannot grant a spell.

Design docs from 2026-08-31 (`SPELL_DISCOVERY_ECOSYSTEM`, SDE ACTION_IDs) describe observe→win→unlock. They are not live. Do not ship Rune Bearer attune as a substitute.

### Achievements (Feats) — SIMPLIFY

Same 15 seeds (`admin.mo` 309–326). GameFlow button label is **Feats**; `title` is Achievements (326–333). Flat Doka 50–1000. Spectator feats (betrayal, jackpot) still fire from world RNG.

### Challenges — REWORK

Same 9 contracts (`challengeCompletion.ts` 38–103). Same random offer (`WorldExploration.tsx` 12774–12782). Integrity of predicates improved (Sacrifice, walk hazards, overworld heal). The **offer** is still unshaped and flat.

### Bosses — KEEP kits; REWORK rush pairs

19 frontend ids + `bossKits.ts` still honest. `combinedMechanic` still only in `useBossRush.ts`. WX never even **renders** the sentence — so the live lie is quieter than last audit implied, but the table still documents a rule the fight does not run. Room rewards still flat.

### Dungeons — EXPAND

Chain is still depth + Doka multiplier + white portal. Same generator, AI, modifiers as free roam. Admin editor is still a second “dungeon” word.

### World events — SIMPLIFY + MERGE; announce must match

22 registry entries. Two-roll trigger. New honesty table:

| Id | Player / admin is told | Engine does |
| :--- | :--- | :--- |
| Paper Windstorm | Announce: “reach halved” (`mapModifiers.ts` 251). Admin: “50% miss on ranged” | 50% miss when `range > 1` (WX 16926). Targeting has **no** half-range |
| Blood Moon | Announce: flavor only. Admin: “+25% dmg, −25% heal” | +25% non-heal damage (`spellEngine.ts` 895). **No** heal cut. Registry hook still says “placeholder” (265–267) |
| Gravity Well | Admin: “Push/pull double range” | Empty hook; unused `_isGravityWell` |
| Fog of War | Admin: “Enemies hidden beyond 3 tiles” | Empty hook; unused `_isFogOfWar` |
| Frozen Terrain | Admin: “Double MP + LoS +1” | MP ×2 only — same as Slime Flood |
| Titan’s Vigor | Announce: +1000 HP, 1–5× | Exactly that. Arbitrary at every level |

AFDA-016 already owns **id-list** drift (admin `lava_fields` vs engine `titans_vigor`). This audit owns **rule-card drift** on ids that *do* exist.

New ID: PXA-2026-09-01-002.

### World Dynamics catalog — MERGE or hold (new)

`worldFeatures.ts` 1–18: design-only, does not generate maps. `WORLD_DYNAMICS.md` 43: “the existing 22 still roll… this catalog does not replace them.” `MAX_ROLLED_FEATURES = 3`. WDD-001 invites a later overlay.

Rune Bearer (`worldFeatures.ts` 499–516): kill → attune one enemy spell **this map only**. That is a second discovery language beside the designed observe→win→unlock and the live gifted book.

Blood Altar (528–541) adds a fourth meaning of “Blood” (HUD bar, Blood Moon, Blood Mend, altar).

**Do not implement this catalog as a stacked layer.** Slim the live 22 first (PXA-008), pick one discovery path (PXA-001), then add at most a short list of *new* decisions.

New ID: PXA-2026-09-01-003.

### Progression — EXPAND grants; KEEP no-cap; do not flatten death

`xpForNextLevel` = `100 * 2^(N-1)` (`xpCurve.ts` 10–12). Victory XP = `sum(enemy.level * 20)` (`rewardResolver.ts` 89–98). Boss `1.08^diff` still scales. Spell upgrade `10 * 2^level` still grows.

LHIPS-001 already measured the practical wall (synthetic). PX reading: the **combat** grant must stay a noticeable leftover-XP slice at any level, or “no cap” is copy. Express that as threat-scaled victory XP (same family as PXA-004), not a level cap, not a third currency.

### Shops — SIMPLIFY

| Sink | Where | Role |
| :--- | :--- | :--- |
| Buff items | `BuffShop.tsx`; GameFlow **Items** | Combat shortcuts; `localStorage` inventory |
| Canister `BUFF_CATALOG` | `main.mo` 2400–2407 | Different ids/costs; no `purchaseBuff` callers under `components/` |
| IAP packages | `admin.mo` 265–282 | 15 SKUs, 10 Doka → 1.6M Doka |
| WX **Buy Doka** | World top bar 18146–18158 | Second shop chrome |
| Rename | 100 Doka | Cosmetic |
| Spell upgrade | `upgradeSpell` | The real mastery sink |

### Death — KEEP

`DEATH_XP_PENALTY_RATE = 0.2`, `DEATH_DOKA_PENALTY_RATE = 0.4`. Realm + guards. Do not flatten.

### Rewards — REWORK the menu, KEEP the pipe

Same faucets. Recap should remain one threat-scaled combat grant plus optional named challenge/feat lines.

### Visual feedback — KEEP juice; SIMPLIFY chrome

JUICE stays. Simultaneous languages: challenge panel, Map Effects, initiative, spell bar, orbs, Feats, Items, Buy Doka, Bosses, Enemies, Blood, chat, debug. GameFlow realm-tool row (`GameFlow.tsx` 289–344) plus WX 44px bar. Blood is the one that answers **no** question.

### Admin-enabled content — REWORK

CRUD still public-read. Default bosses still retired ids. Admin modifier labels can schedule a rule the engine does not run (PXA-2026-09-01-002). Admin spells without targeting metadata still save (PXA-015).

---

## What already fits (do not “fix”)

- AP for spells / MP for walk.
- Eight-slot bar as a **commitment** (once the book is earned).
- Summon archetypes and lifespan-on-own-turn.
- Persist lock + recap at root (stronger than last run).
- Death Realm as a place.
- Boss phase 2 as kit + ability escalation.
- No level cap + percentage death + compounding boss level-diff.
- Ember burn / Tide slow / Void 25% reflect — *if* they become explicit kit lines the Register repeats.

---

## Recommended sequence (human, not this automation)

1. **Honesty of rules the player can read today** — Register, modifier announce, rush pair copy. (PXA-2026-09-01-001, PXA-2026-09-01-002, PXA-003)
2. **Discovery contract** — innate 2–4, find the rest. Do not ship Rune Bearer first. (PXA-001, PXA-2026-09-01-003)
3. **One enemy poster + kits past zone 2.** (PXA-007, PXA-013)
4. **Unbounded grants** including victory XP. (PXA-004, LHIPS-001)
5. **HUD / shop / words.** (PXA-006, PXA-011, PXA-012)

Do not implement these from this file unless a human or the Report Action Orchestrator picks an ID and it is still unique versus open PRs.
