# Player Experience Coherence Audit — 2026-09-02

**Auditor:** Player Experience Coherence Auditor  
**Automation:** `30118f7c-a49e-11f1-a7d1-d6b4613131ce` (cron `0 */48 * * *`)  
**HEAD inspected:** `58302bc` (`Merge pull request #258` — Doka GameKey shop)  
**Prior audit:** [`PX_COHERENCE_AUDIT_2026-09-01.md`](./PX_COHERENCE_AUDIT_2026-09-01.md) at `dd275aa`  
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

**Do not re-file** `PXA-2026-08-31-001` … `015` or `PXA-2026-09-01-001` … `003`. They are still open.  
New records: [`ACTION_IDS_PXA_2026-09-02.md`](./ACTION_IDS_PXA_2026-09-02.md) (`PXA-2026-09-02-001` … `003`).

Sibling IDs already own: kit-zone NaN (`EBA-013` / `SDE` / `PREREQ-A`), `computeAITier` 30% noise, LHIPS XP-wall / victory-grant shape. This run does not twin those. PX still agrees: **scale combat grants; do not add a level cap.**

---

## Delta since 2026-09-01

Integrity work continued (unpaid death cuts, BuffShop consume + no-heal, feat unlock after `applyRewards`, summon-control casts, leftover islands). The **pipe** is more trustworthy. The **loop** is not.

| Claim from last audit | Still true? | Updated evidence |
| :--- | :--- | :--- |
| Full `starterSpells` gifted as innate | **Yes** | `WorldExploration.tsx` 2356–2368; `spellData.ts` 27–28 (Strike + 31 starters, five summons) |
| `shouldIncludeBackendSpellInLibrary` is not discovery | **Yes** | `adminSafety.ts` 551–557: `usableByPlayer !== false` → include. Union at WX 2373–2394 |
| `combinedMechanic` unused | **Yes** | Declared in `useBossRush.ts` 17–19 / populated 23–134; no WX/engine reader |
| Blood HUD never spent | **Partial** — **bar gone** | No `BLOOD` / `_setBloodBalance` in `GameFlow.tsx` or WX. GameFlow 282–290 is a snap spacer. `bloodBalance` still on the character record (`main.mo` 134). PXA-006 HUD hide is done; session field remains |
| Covenant buff write-only | **Yes** | `covenantBuffMapsRef` init WX 1338–1348; write 11449; no combat reader |
| Slime Flood ≡ Frozen Terrain | **Yes** | `mapModifiers.ts` 155–172, both `onMpCost * 2` |
| Gravity Well / Fog of War empty | **Yes** | Registry 280–296; WX `_isGravityWell` / `_isFogOfWar` 2289–2291 unused |
| Titan’s Vigor +1000 HP, 1–5× dmg | **Yes** | `mapModifiers.ts` 300–316 |
| Admin bosses still name `fireball` / `blood_nova` | **Yes** | `admin.mo` 358–541 |
| Random legendary challenge every fight | **Yes** | WX 12325–12333 |
| Buff shop vs canister catalog drift | **Yes** | `BuffShop.tsx` 31–79 vs `main.mo` 2707–2714 (`greater_health_potion` vs `greater_potion`; elixir 80 vs 200; fury 150 vs 100) |
| Kits stop at `levelZone` 2 | **Worse** | Intended table still 0/1/2 (`enemyAI.ts` 156–178). Live call still passes the **object** (`WX` 12035). `Math.floor(object)` is `NaN` → **zone-0 kits forever**. Owned by EBA-013; PXA-013 is blocked until that adapter exists |
| Paper Windstorm = 50% miss, announce “reach halved” | **Split** | Announce still “reach halved” (`mapModifiers.ts` 249–257). **Player** `spellEngine` callback is **30% any hit** (WX 9603–9612). **Enemy** path is still **50% if `range > 1`** (WX 16579, 16817) |
| 15 IAP SKUs on the player shop | **Replaced** | Player modal is Mollie + 120-char GameKey (`DokaGameKeyShop.tsx`, `iapShopCopy.ts` 6–23). Canister still seeds `defaultShopPackages()` 15 SKUs (`admin.mo` 265–282). No player `getShopPackages` caller under `components/` |

What **did** change (and why it matters):

1. **Blood left the player chrome.** PXA-006’s display half is done. Do not re-hide a bar that is gone. The unused session field is leftover, not a HUD lie.
2. **Buy Doka is now a GameKey ritual** (email, consent, Mollie QR, admin wait, 120-char redeem) on the world HUD next to leftover XP. Package SKU overload is gone from the player; a new word and a long off-combat procedure sat down in its place.
3. **SummonControlPanel is live.** Player-side summons are a second AP/MP bar with kit buttons (`SummonControlPanel.tsx`; WX 18997–19020). That **is** a tactical decision. Keep it. Do not treat it as bloat.
4. **Admin modifier dropdown now prints `announceText`** (`listAdminModifierTypeOptions`, `mapModifiers.ts` 505–513). Admin and announce **agree with each other**. They still disagree with the engine (Windstorm, Blood Moon, Gravity/Fog). AFDA-016’s hardcoded admin sentences are no longer the extra liar.
5. **Challenge panel is an accept window, then it vanishes.** `markFirstAction` (WX 17174–17181) correctly drops an **unaccepted** offer. `visible={… && !firstActionTakenRef.current}` (19219) also hides an **accepted** contract, including the turns/damage tracker (`ChallengePanel.tsx` 282–296).

Open PR older than this docs branch: **#259** (draft, GameKey EOP migration). No overlapping files.

---

## Verdict

The **core identity is still sound**: AP spends actions, MP spends movement, explicit `SpellConfig` targeting, one Doka wallet, persist-locked `applyRewards` + root recap, percentage death, honest solo boss kits, five distinct summons **plus player control**, signature spells (Swap, Mark, Barrier, Mirror, Timestep, Sacrifice).

The game still does **not** play as one loop. The same three fractures dominate:

1. **Discovery is not a system.** The book is gifted. A helper named like a gate does not gate.
2. **Rules on the box are not rules in the engine.** Register, rush pairs, several map events. **New:** one named event (`paper_windstorm`) now has **two live rates**.
3. **Most secondary rewards are flat** on an unbounded `2^(N-1)` curve. Live enemy kits never leave band 0, so “progressive sophistication” is a data table the player cannot meet.

**New this run:** (a) GameKey is a player-facing object that answers none of the four questions; (b) accepted challenges lose their HUD; (c) Windstorm is internally inconsistent.

Until PXA-001 / 003 / 007 / 008 / 013 and the three new IDs are designed, adding World Dynamics tiles, more families, or more admin SKUs will make the identity *less* readable.

---

## Classification (all reviewed systems)

| System | Class | One-line why |
| :--- | :--- | :--- |
| **Combat AP/MP split** | KEEP | AP = actions, MP = movement; book `mpCost` is ~0. The Dofus-like decision. |
| **Explicit spell targeting metadata** | KEEP | `targetType` / range / LoS — not name heuristics. Protect this. |
| **Atomic reward funnel + root recap** | KEEP | `applyRewards` / `saveBattleStats` + `PostBattleRecap` at app root. |
| **Death 20% XP / 40% Doka + Death Realm** | KEEP | Percentage cost stays meaningful with no cap. 1.5s guards are a real rule. |
| **Solo boss kits + `BossAbility` tags** | KEEP | Unique phase kits; real specials. Boss Guide is closer to truth than EnemyRegister. |
| **Enemy / summon AI engine** | KEEP | Archetypes, lethal lookahead, LoS step, backline guard. Do not add toggles. |
| **Summon five-pack + player control panel** | KEEP | Hunter / guardian / archer / bomber / healer are distinct; the panel is the mastery surface. |
| **Signature spells** | KEEP | Swap, Mark, Barrier, Mirror, Timestep, Sacrifice each ask a question the clones do not. |
| **JUICE** | KEEP | Shake / hitstop / numbers. Presentation only. |
| **Admin UI gated + backend `#admin`** | KEEP | Must stay off the player HUD. |
| **GameKey / Mollie IAP** | KEEP off-loop; SIMPLIFY chrome | Real-money faucet. Not a tactic. Must not read as a third currency. |
| **Ember / Tide / Void family melee hooks** | MERGE into kits | Real but name-heuristic (`family === "ember_knight"`). Fold into explicit kit metadata. |
| **Spell catalog (full `starterSpells`)** | MERGE | Shield ≡ Iron Skin; Poison ≡ Venom; two heals+CHC; Expose ≡ Shadow Veil; three drains. |
| **Enemy identity (piece + family + aiTier + Register lore)** | SIMPLIFY | Four posters for one unit. Live kit is always zone 0. PXA-007 still owns the pick. |
| **Achievements / Feats** | SIMPLIFY | Mastery mixed with chores and RNG. Button **Feats**; `title` / `aria-label` Achievements (`GameFlow.tsx` 330–335; `AchievementsPanel.tsx` 216–233). |
| **Buff shop + GameKey + leftover packages** | SIMPLIFY | GameFlow **Items** vs WX **Buy Doka** (two carts). Catalog still disagrees. 15 SKUs still seeded, unused by the player UI. |
| **HUD Blood bar** | DEPRECATE leftover field | Chrome is gone. Keep canister inert. Do not invent a spend. |
| **`resilience` / `evasion` on persist** | DEPRECATE or EXPAND | Required on `CharacterStats`; unused in combat math. Register already claims “evasion passive.” |
| **`covenantBuff` / shrine 3-map write** | DEPRECATE or EXPAND | Shrine pays 300 Doka. The buff is still write-only. |
| **Canister `defaultShopPackages` 15 SKUs** | DEPRECATE from player truth | GameKey replaced the picker. Public `getShopPackages` is a second shop language. |
| **Spell discovery** | REWORK | Innate 32-id book. No observe → win → unlock. |
| **Battle challenges** | REWORK offer; SIMPLIFY HUD | Random pick among 9, including legendary 1000 XP, every fight. Accepted HUD then hides. |
| **Boss-rush combined mechanics** | REWORK | Copy-only. Not shown in WX, not executed. |
| **Admin-enabled catalogs** | REWORK | Live book, `bossKits.ts`, `admin.mo` seeds are three truths. |
| **Map modifiers / world events** | SIMPLIFY + MERGE | 22 entries. Twins, placeholders, Titan lottery. Windstorm now has two live numbers. |
| **World Dynamics catalog (`worldFeatures.ts`)** | MERGE or hold | Unwired. Designed to stack on the 22. Rune Bearer is a second discovery language. |
| **EnemyRegister / family lore** | REWORK | Player-facing rule card for a game that is not running. |
| **Dungeon chain** | EXPAND | Reward skin on the overworld. Needs a rule free roam does not have. |
| **Progression / rewards (flat + linear-vs-exp)** | EXPAND | Curve unbounded; grants are not. Do not add a cap. |
| **Terminology** | SIMPLIFY | Feats vs Achievements; GameKey vs Doka; Blood Moon vs Blood Mend; SR vs RES vs resilience. |

---

## System notes (evidence)

### Enemies — SIMPLIFY poster; REWORK the register

Overworld packs are still **chess pieces**. `buildEnemyKit` (`enemyAI.ts` 156–192) would grow at zone 1 / 2 **if** it received a number. Battle start still calls `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` (`WorldExploration.tsx` 12030–12038) where `levelZone` is `{ name, minLevel, maxLevel }` (4680–4684). Comment at 12030 still says “10 random spells.” Live kits are zone 0: pawn Strike only, knight Strike only, bishop Frost only, queen/king Frost only. **Progressive sophistication is designed and dead.** Do not re-file the NaN adapter (EBA-013). Do not expand the kit table (PXA-013) until the call site passes a number.

The **30% family overlay** (`WorldExploration.tsx` 5862–5952) still paints HP/dmg/RES and pixels. Three families still apply **name-heuristic** melee extras:

| Family | Engine actually does | EnemyRegister teaches (`EnemyRegister.tsx`) |
| :--- | :--- | :--- |
| Ember Knight | 3 DoT / 3 turns on melee (16877–16891) | Burning **tiles**, AoE fire, weak to ice |
| Tide Shade | −1 MP / 2 turns on melee (16893–16908) | Adjacent slow, **HP regen**, weak to lightning |
| Void Mirror | 25% of pre-mitigation dmg reflected (`castHelpers.ts` 326–336) | Copies spells; **immune to magic until physical** |
| Wraith / Golem / Rat / Scribe | Stat mults + pixels only | Wall-phase, poison stacks, stagger, Weakened |
| Crimson Spawn / Shadow Lurker / Storm Caller | **Not in the 30% roll** | Lifesteal, **evasion**, earth-weak, storm clouds |

`EnemyRegister` is still a world-HUD button (`WorldExploration.tsx` 17854–17866). Archbishop tip (90): “invulnerable while any pawn lives” is unused rush-pair copy. GameFlow **Bosses** (`GameFlow.tsx` 337–346) opens a second bestiary that is closer to `BossAbility`. Two guides, one of them false.

**Keep** piece kits + the three real family hooks (as metadata, not `family ===` strings).  
**Do not** teach elemental types the combat math does not have.  
**Do not** implement EBA-024 until the card matches the engine.

Still PXA-2026-09-01-001.

### AI — KEEP (kits: EXPAND after adapter; random tier: already filed)

`decideEnemyAction` is still the best expression of identity. `computeAITier` still has a 30% full-random 1–10 (`combatMath.ts` 34–51). That fights “progressive sophistication.” Already owned. PX: do not rewrite `enemyAI.ts` to add verbs; teach the existing ones through kits **after** the NaN call site is fixed.

### Spells — MERGE clones, KEEP signatures

`starterSpells` is still the 32-id book including Strike (`spellData.ts` 9–28, 547–663). Clone pairs from 08-31 still stand. `spellType: "damage"` on Shield (40) still leaks into admin.

Almost every spell has `mpCost: 0`. **Keep that.**

### Spell discovery — REWORK (unchanged class)

```2356:2368:src/frontend/src/components/WorldExploration.tsx
  // Base spells = the always-owned innate spells (ALL starter spells + physical attack)
  // Every spell in starterSpells is a base/innate spell — always shown, never removable.
  const baseSpells = useMemo(() => {
    const base = starterSpells.map((s) => ({
      ...s,
      isBaseSpell: true as const,
    }));
```

`shouldIncludeBackendSpellInLibrary` only hides `usableByPlayer === false` unless already owned. Catalog membership is still ownership for every player-usable admin row (`vampire_bite`, `void_collapse` at `minLevel = 30`, …). No `ownedSpellIds` / `observedSpellIds`. Recap still cannot grant a spell.

Design docs (`SPELL_DISCOVERY_ECOSYSTEM`) describe observe→win→unlock. They are not live. Do not ship Rune Bearer attune as a substitute.

### Achievements (Feats) — SIMPLIFY

Same 15 seeds (`admin.mo` 311–325). GameFlow button label is **Feats**; `title` is Achievements (330–335). Panel header Feats, `aria-label` Achievements (216, 233). Flat Doka 50–1000. Spectator feats (betrayal, jackpot) still fire from world RNG.

### Challenges — REWORK offer; SIMPLIFY HUD (new)

Same 9 contracts (`challengeCompletion.ts` 38–103). Same random offer (`WorldExploration.tsx` 12325–12333). Integrity of predicates improved (Sacrifice, walk hazards, BuffShop heal, Striker on summon kits). The **offer** is still unshaped and flat.

**New:** the panel that would teach mastery during the fight is gated off after the first AP/MP spend:

```17174:17181:src/frontend/src/components/WorldExploration.tsx
  // Marks the player's first MP/AP-spending action. If a challenge was offered
  // but not yet accepted, dismiss the offer (accept window has elapsed).
  const markFirstAction = useCallback(() => {
    firstActionTakenRef.current = true;
    if (!challengeAcceptedRef.current) {
      currentChallengeRef.current = null;
      setCurrentChallenge(null);
    }
  }, []);
```

```19218:19221:src/frontend/src/components/WorldExploration.tsx
      <ChallengePanel
        visible={inBattle && !!currentChallenge && !firstActionTakenRef.current}
```

Accept-window dismiss for **unaccepted** offers is a real decision. Hiding **accepted** turns/damage (`ChallengePanel.tsx` 282–296) answers none of the four questions. New ID: PXA-2026-09-02-002.

### Bosses — KEEP kits; REWORK rush pairs

19 frontend ids + `bossKits.ts` still honest. `combinedMechanic` still only in `useBossRush.ts`. WX never renders the sentence. Room rewards still flat.

### Dungeons — EXPAND

Chain is still depth + Doka multiplier + white portal. Same generator, AI, modifiers as free roam. Admin editor is still a second “dungeon” word.

### World events — SIMPLIFY + MERGE; announce must match; Windstorm now disagrees with itself

22 registry entries. Two-roll trigger. Admin dropdown now echoes `announceText` (`mapModifiers.ts` 505–513) — so admin is no longer a third sentence. Honesty table:

| Id | Player / admin is told | Engine does |
| :--- | :--- | :--- |
| Paper Windstorm | Announce + admin: “ranged spell reach halved” (`mapModifiers.ts` 251) | Player `spellEngine`: 30% miss, no range gate (WX 9603–9612). Enemy: 50% miss when `range > 1` (16579, 16817). Targeting has **no** half-range |
| Blood Moon | Announce: flavor only | +25% non-heal damage (`spellEngine.ts` 895). **No** heal cut. Registry hook still says “placeholder” (265–267) |
| Mirror Field | Announce: flavor | 20% single-target reflect (`spellEngine.ts` 901–907; WX 9588–9598). Registry comment still “placeholder” (276–277) |
| Gravity Well | Announce: “heavy pull” | Empty hook; unused `_isGravityWell` |
| Fog of War | Announce: “vision is shrouded” | Empty hook; unused `_isFogOfWar` |
| Frozen Terrain | Announce: MP doubled (honest vs Slime) | MP ×2 only — same as Slime Flood |
| Titan’s Vigor | Announce: +1000 HP, 1–5× | Exactly that. Arbitrary at every level |

PXA-2026-09-01-002 still owns announce-vs-engine as a class. **Two live Windstorm rates** is new. New ID: PXA-2026-09-02-003.

### World Dynamics catalog — MERGE or hold

`worldFeatures.ts` 1–18: design-only, does not generate maps. `pickWeightedFeatures` callers: tests only. Rune Bearer is still a second discovery language. Blood Altar is still a fourth “Blood.” Do not stack. Still PXA-2026-09-01-003.

### Progression — EXPAND grants; KEEP no-cap; do not flatten death

`xpForNextLevel` = `100 * 2^(N-1)` (`xpCurve.ts` 10–12). Victory XP = `sum(enemy.level * 20)` (`rewardResolver.ts` 89–98). Boss `1.08^diff` still scales (`progression.ts` 290–324). Spell upgrade `10 * 2^level` still grows.

LHIPS-001 already measured the practical wall. PX: the **combat** grant must stay a noticeable leftover-XP slice at any level. Express that as threat-scaled victory XP (PXA-004), not a level cap, not a third currency.

### Shops — SIMPLIFY (GameKey is new)

| Sink | Where | Role |
| :--- | :--- | :--- |
| Buff items | `BuffShop.tsx`; GameFlow **Items** (`GameFlow.tsx` 307–316 → `itemShopOpen`) | Combat shortcuts; `localStorage` inventory |
| Canister `BUFF_CATALOG` | `main.mo` 2707–2714 | Different ids/costs; no `purchaseBuff` callers under `components/` |
| GameKey / Mollie | WX cart **Buy Doka** (17790–17821) → `DokaGameKeyShop` (19202–19210) | Email + consent + QR + admin approve + 120-char redeem. Copy: 1000 Doka = 10€ |
| Canister `defaultShopPackages` | `admin.mo` 265–282 | 15 SKUs to 1.6M Doka. Player UI does not list them. `getShopPackages` is still public |
| Rename | 100 Doka | Cosmetic |
| Spell upgrade | `upgradeSpell` | The real mastery sink |

GameKey answers **no** tactical question. It is allowed as a real-money faucet **off** the combat language. Sitting on the world HUD as a second cart, introducing “GameKey” next to Doka, and leaving 15 unused SKUs in the actor is feature bloat + terminology. New ID: PXA-2026-09-02-001.

### Death — KEEP

`DEATH_XP_PENALTY_RATE = 0.2`, `DEATH_DOKA_PENALTY_RATE = 0.4`. Realm + guards. Unpaid-cut persistence improved since last run. Do not flatten.

### Rewards — REWORK the menu, KEEP the pipe

Same faucets. Recap should remain one threat-scaled combat grant plus optional named challenge/feat lines.

### Visual feedback — KEEP juice; SIMPLIFY chrome

JUICE stays. Blood bar is gone (good). Remaining simultaneous languages: challenge panel (briefly), Map Effects, initiative, spell bar, SummonControlPanel, orbs, Feats, Items, Buy Doka, Bosses, Enemies, chat, debug. GameFlow realm-tool row (289–346) plus WX 44px bar. Two carts and two bestiaries are the leftover overload.

### Admin-enabled content — REWORK

CRUD still public-read. Default bosses still retired ids. Admin modifier **type** list now matches registry ids (plus honest legacy `lava_fields`). Announce text can still schedule a rule the engine does not run, and Windstorm’s engine does not even agree with itself. Admin spells without targeting metadata still save (PXA-015).

---

## What already fits (do not “fix”)

- AP for spells / MP for walk.
- Eight-slot bar as a **commitment** (once the book is earned).
- Summon archetypes, lifespan-on-own-turn, and the control panel.
- Persist lock + recap at root.
- Death Realm as a place.
- Boss phase 2 as kit + ability escalation.
- No level cap + percentage death + compounding boss level-diff.
- Ember burn / Tide slow / Void 25% reflect — *if* they become explicit kit lines the Register repeats.
- Blood gone from the HUD.

---

## Recommended sequence (human, not this automation)

1. **Honesty of rules the player can read today** — Register, modifier announce, Windstorm single rate, rush pair copy. (PXA-2026-09-01-001, PXA-2026-09-01-002, PXA-2026-09-02-003, PXA-003)
2. **Keep accepted challenge HUD visible.** (PXA-2026-09-02-002) then reshape the offer (PXA-009).
3. **Discovery contract** — innate 2–4, find the rest. Do not ship Rune Bearer first. (PXA-001, PXA-2026-09-01-003)
4. **NaN kit adapter, then one enemy poster + kits past zone 2.** (EBA-013, PXA-007, PXA-013)
5. **Unbounded grants** including victory XP. (PXA-004, LHIPS-001)
6. **HUD / shop / words.** GameKey off the tactical bar; retire unused packages. (PXA-2026-09-02-001, PXA-011, PXA-012)

Do not implement these from this file unless a human or the Report Action Orchestrator picks an ID and it is still unique versus open PRs.
