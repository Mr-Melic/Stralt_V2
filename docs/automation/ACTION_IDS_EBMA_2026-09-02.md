# ACTION_IDs — 2026-09-02 Emergent Build & Meta Analyzer

Durable ledger for implementers and the Report Action Orchestrator.  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
HEAD inspected: `58302bc` (`Merge pull request #258` / GameKey shop)  
Gameplay code: not modified. Do not implement balance from this file unless a later human or orchestrator explicitly picks an ID.

Analysis: [`EMERGENT_META_2026-09-02.md`](./EMERGENT_META_2026-09-02.md).  
Reissues `EBMA-2026-09-01-001` … `012` (still unimplemented). Adds `013`.

---

ACTION_ID: EBMA-2026-09-02-001  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Cap or refresh same-source player DoT stacks  
CATEGORY: status-stacking  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `appendDotStack` (`engine/dotStacks.ts` 31–37) always appends. `mergeIncomingEffect` (`engine/statusEffects.ts` 92–99) routes every `type === "dot"` through it. `WX` `applyActiveEffect` 1836–1858 does not cap. Poison Arrow and Venom Strike have no `cooldown` (`spellData.ts` 49–67, 394–415). Inferno has CD 3 (518–519) but Poison does not. `resolvePlayerCast` 777–814 writes `dotDamagePerTurn`. Arcane Surge (`mapModifiers.ts` 210–217) drops Poison to 1 AP (min 1) via `applyApCost` (`WX` 17200–17207). An 8-AP turn is 4 Poison stacks (8 under Surge), each 4 dmg × 3 independent turns. `hard_3` pays 150 Doka / 450 XP when `maxApUsedInTurn <= 8` (`challengeCompletion.ts` 75–79, 120–121) — a full Poison dump is a legal challenge clear. Null Field does not suppress DoTs (`mapModifiers.ts` 419–431).  
SYSTEMS_AFFECTED: `engine/dotStacks.ts`; `engine/statusEffects.ts` `mergeIncomingEffect`; `WX` `applyActiveEffect`; player DoT branch in `spellEngine.ts`; optional map-modifier AP discount  
RECOMMENDED_ACTION: Same-name + same-caster refresh (reset duration, keep one stack) **or** a small per-target cap (e.g. 2 stacks per `effectName`). Keep Poison, Venom, and Inferno as three types that can coexist. Do not change per-tick numbers. Do not flatten DoT identity into one “poison.” Do not nerf Timestep because it amplifies one extra dump.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None. `EBMA-2026-09-02-006` must not land first.  
REGRESSION_RISK: MEDIUM — last-hostile DoT death tests assume stacks still tick. Refresh must still kill.  
VALIDATION_REQUIRED: Helper tests: two Poison casts → one stack, duration refreshed (or cap 2). Poison + Inferno still both tick. `pnpm typecheck` + `pnpm check`. Play a 10-turn boss and confirm the integral is bounded.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-02-002  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Player summon alive-cap and summon-spell cooldown  
CATEGORY: summon-abuse  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `ENEMY_SUMMON_CAP = 2` (`gameConstants.ts` 300) and `ENEMY_SUMMON_COOLDOWN_TURNS = 2` (301). Player `spawnPlayerSummon` (`WX` 9622–9675) calls `addCombatant` with no count check. All five summon rows omit `cooldown` (`spellData.ts` 547–688). Comment at `enemyAI.ts` 1816–1817 (“player-side summonCount gate”) is still false. Summon AP is charged (`castResultSpendsAp` includes `"summon"`, `challengeCompletion.ts` 300–302) — the 2026-08-31 free-place hole stays closed — but an 8-AP turn still buys Wolf + Archer + Wisp. Each unit gets its own turn. Occupancy unseal and Void Rift ticks are closed; they are not a cap.  
SYSTEMS_AFFECTED: `WX` `spawnPlayerSummon`; summon spell defs; `gameConstants.ts`; optional `summonSpawn.ts`  
RECOMMENDED_ACTION: Cap alive player-side summons (2 or 3) at spawn. Add a short cooldown (1–2 turns) on each summon spell. Keep five kit identities and current lifespan / upgrade formulas. Do not copy the enemy 2-turn summoner cadence onto the player if a per-spell CD already exists. Do not close ally-buff targeting (`resolvePlayerCast` 676–718) as a substitute for a cap.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None. Pair with `010` if Bomber Inferno remains a kit id that already has `cooldown: 3`.  
REGRESSION_RISK: MEDIUM — occupancy / reserved-cell fallback (`summonSpawn.ts`) and portal unseal must still run. Do not change enemy cap.  
VALIDATION_REQUIRED: Tests: fourth player summon is rejected (if cap is 3); recasting Wolf during CD is `on_cooldown`. A 2-summon board still plays. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-02-003  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Pacifist Run matches advertised heal/buff-only; count Bite, Mark, and summon damage  
CATEGORY: achievement-spell  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Feat copy is “Win a battle using only heal or buff spells” (`admin.mo` 324, 500 Doka). Execute path is only `recordPlayerSpellType` (`WX` 17103–17122): `"summon"`, `"heal"`, `"debuff"`, `"defense"` do not flip. Vampire Bite (`admin.mo` 179) is `effectType: "heal"` with 20 damage and enters the damage loop (`resolvePlayerCast` 876+). Mark is `effectType: "debuff"` (`spellData.ts` 160–176). `applyHealBuffSideEffect` (`targeting.ts` 54–74) would have caught Bite/Mark via `targetType === "enemy"` but has **no WorldExploration caller** after `44adf79` (preview must stay off — `shouldApplyHealBuffSideEffectOnRangePreview` 83–85 is correct). Summon damage still never flips `battleOnlyHealBuffSpellsRef`. `checkAndFireAchievement("pacifist_run")` (`WX` 12613–12614) then pays.  
SYSTEMS_AFFECTED: `WX` `recordPlayerSpellType` / achievement fire; summon spawn/cast; Bite/Mark execute  
RECOMMENDED_ACTION: Fail the feat unless every resolved player spell is heal, buff, Timestep, or (optionally) Mirror. Flip when the player casts a summon spell **or** when a player-side summon deals damage / applies an offensive kit spell. Vampire Bite must fail it even while heal metadata is still wrong. **Do not** call `applyHealBuffSideEffect` from `getSpellRangeTiles`. Do not change the Doka amount.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None. Complements `013` (Bite metadata) but must not wait on it.  
REGRESSION_RISK: LOW — feat is once-per-account. Preview tests in `targeting.test.ts` must stay green.  
VALIDATION_REQUIRED: Tests: Shield-only win still unlocks; Wolf kill does not; Bite kill does not; selecting Strike for range preview still does not fail. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-02-004  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Apply player `debuffStat` and cap stacked AP/MP denial  
CATEGORY: ap-mp-denial  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `resolvePlayerCast` damage loop (`spellEngine.ts` 876–1028) never calls `applyEffect` for `debuffStat`. Slow, Frost Bolt, Weaken, Expose, Shadow Veil, Drain Courage, Cursed Wound, Life Drain therefore deal (or skip) damage and drop the advertised half. `resolveSpellCast` 529–548 **does** apply the same fields — a player-controlled Archer Slow is live. Enemy / boss casts apply them on the inline path. `getStatModifier` (`statusEffects.ts` 45–63) **adds** every `ap`/`mp` modifier from different `effectName`s. Wiring the player path without a cap, then later fixing `buildEnemyKit` zone (`009`), would let Frost + Slow + Drain Courage approach 0 AP/MP. Same-name still replaces (`applyOrRefreshNonDotEffect` 71–84).  
SYSTEMS_AFFECTED: `spellEngine.ts` `resolvePlayerCast`; `statusEffects.ts` `getStatModifier`; enemy debuff path  
RECOMMENDED_ACTION: After a successful player hit (or on a pure-debuff spell), apply `debuffStat` the same way `resolveSpellCast` does. Cap combined AP/MP additives per target (e.g. cannot reduce the victim below 1 AP and 1 MP from debuffs). Do not change Slow/−2 or Frost/−1 numbers. Do not strip Archer kit Slow. This is a restore plus a safety rail, not a nerf of an existing player-bar combo.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: `009` makes the enemy-side cap load-bearing. Ship the cap in the same change as the player wire, or immediately after.  
REGRESSION_RISK: MEDIUM — Haste is `buffStat: "mp"` modifier `+2` (additive). The floor must not clamp buffs.  
VALIDATION_REQUIRED: Tests: player Slow writes `stat: "mp"` on the target; two different MP debuffs cannot sum past the floor; Haste +2 still applies; controlled Archer Slow still applies. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-02-005  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: No-heal challenges count drain heals and Wisp-to-player heals  
CATEGORY: challenge-economy  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `easy_1` / `hard_1` (`challengeCompletion.ts` 38–65) persist 50 Doka and 200 Doka + 500 XP from `!healUsed`. The flag is set for self-heal spells (`WX` 17248–17254) and, as of `2f5b493`, BuffShop potions (`recordChallengeItemHealUsed` 225–229). Life Drain / Lifesteal Nova / Drain Courage are `effectType: "drain"`; heal is `drainPercent` of first-target damage (`castHelpers.ts` 466–480) and never touches the flag. Summon ctx `heal` (`WX` 9238–9253, 15104–15119) writes player HP and never touches `challengeHealUsedRef`. Overworld Doka-to-HP must stay excluded (`recordInBattleChallengeHealUsed` 207–213). Vampire Bite’s heal is inert — do not treat the current Bite as a heal source until metadata is fixed (`013`).  
SYSTEMS_AFFECTED: `WX` `executeCastAttempt` / summon `heal`; `challengeCompletion.ts`; `castHelpers.ts` drain apply  
RECOMMENDED_ACTION: Set the flag when a drain spell heals the player and when a summon `heal` targets the player. Keep potion wiring. Keep out-of-battle heals from failing the next fight. Do not change reward amounts.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None  
REGRESSION_RISK: LOW — challenges become harder in the advertised way.  
VALIDATION_REQUIRED: Existing `challengeCompletion.test.ts` plus: Life Drain in battle sets `healUsed`; Wisp heal on player sets it; overworld Doka heal does not; potion still sets it. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-02-006  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Write `dotDamagePerTurn` (and Slow stat) on summon-AI applyEffect  
CATEGORY: summon-ai  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Live AI summon path is `decideSummonAction` + `executeSummonAction`. `applyCast` (`summonExecutor.ts` 191–203) applies DoTs without `dotDamagePerTurn` and debuffs without `stat`/`modifier`. `tickDotStacks` (`dotStacks.ts` 105–108) ignores those rows. Player-controlled summons use `resolveSpellCast` (`WX` `castControlledSummonSpell`) and **do** tick / apply Slow. AI Archer Poison and AI Bomber Inferno are cosmetic. Bomber kamikaze also only runs on the `damage > 0` branch; Inferno `damage` is 0, so AI Bombers neither tick nor explode.  
SYSTEMS_AFFECTED: `engine/summonExecutor.ts`; DoT tick; bomber lifespan  
RECOMMENDED_ACTION: Copy `dotDamagePerTurn` from the kit spell onto the effect. Copy `debuffStat` / `debuffModifier` for Slow. Restore bomber detonation on Inferno cast even when upfront damage is 0. **Do not ship DoT ticks before 001** — AI + player-controlled stacks would double the unbounded integral. Slow-stat restore may ship with 004.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: EBMA-2026-09-02-001 for DoT ticks  
REGRESSION_RISK: HIGH if 001 is missing. MEDIUM after 001 (extra ticks on enemy-facing AI summons too).  
VALIDATION_REQUIRED: Tests: AI Poison effect has `dotDamagePerTurn === 4` and `sumDotTicks` > 0; bomber Inferno sets hp 0; AI Slow writes `stat: "mp"`. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-02-007  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Keep catalog ≠ ownership; do not treat backend seed as discovery  
CATEGORY: discovery-progression  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `shouldIncludeBackendSpellInLibrary` (`adminSafety.ts` 551–558) returns true whenever `usableByPlayer !== false`. `ownedSpells` (`WX` 2373–2400) unions starters with that filter. `defaultSpells()` (`admin.mo` 168–191) therefore grants Shadow Strike / Thunder Clap / Void Collapse / inert Soul Rend / Bite / Reflect to every seeded account. Achievements and challenges still grant Doka only. No `ownedSpellIds` / `observedSpellIds`. Sibling design already owns the pipeline: `SDA-2026-08-31-002` … `004`, `SDE-2026-08-31-001` … `003`, `SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md`. GameKey shop does not grant spells.  
SYSTEMS_AFFECTED: `WX` `ownedSpells`; `adminSafety.ts`; `admin.mo` `defaultSpells`; future grant writers  
RECOMMENDED_ACTION: Do **not** implement observe-to-unlock from this automation. When SDA-002 lands, migrate existing characters from starters + `spellLevelKeys` ∪ `spellBarOrder`, not from the full catalog. Leave Shadow Strike numbers alone — it is STRONG_BUT_HEALTHY, not a dump-to-nerf.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-002 / 003 / 004  
REGRESSION_RISK: HIGH if migrate under-seeds the bar.  
VALIDATION_REQUIRED: Owned by the SDA tickets. This ID is a meta constraint, not a second implementation.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-02-008  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Monitor Titan’s Vigor × Glass Realm × Sacrifice; do not nerf yet  
CATEGORY: map-modifier-lottery  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: `applyDamageDealt` is called from `enemyTakesDamage` (`WX` 3460). The main player damage loop uses `calculatePlayerDamage` / `applyDamageToEnemy` and skips the hook. Sacrifice (`spellEngine.ts` 749–763) uses `dealDamage` → `enemyTakesDamage`, so it **does** get Titan 1–5× (`mapModifiers.ts` 311–314) and Glass ×2 (337–345). Sacrifice HP cost reads `characterStats.hp` (750), not necessarily Titan’s `onBattleStart` +1000. Mark and crit do not apply. Vampiric Ground is on the same hook and also misses the main bar.  
SYSTEMS_AFFECTED: `mapModifiers.ts`; `WX` `enemyTakesDamage`; Sacrifice  
RECOMMENDED_ACTION: No number change. If play data shows Glass+Titan maps are Sacrifice-or-skip, then either route all player damage through one modifier hook **or** exclude Sacrifice from `onDamageDealt`. Do not flatten Titan’s identity.  
AUTONOMY: MONITOR  
DEPENDENCIES: None  
REGRESSION_RISK: N/A until a number change is chosen.  
VALIDATION_REQUIRED: If a later ID changes the hook, add a test that Strike does or does not take Titan/Glass consistently with Sacrifice.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-02-009  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Pass a numeric zone into `buildEnemyKit`  
CATEGORY: relative-progression  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Call site `WX` 12035: `buildEnemyKit(enemy.pieceType, currentMap.levelZone)`. `levelZone` is `{ name, minLevel, maxLevel }` (`WX` 4680, 5231). `buildEnemyKit` (`enemyAI.ts` 187–192) does `Math.floor(levelZone)` → `NaN`; `z >= 1` is false. Every piece stays on the zone-0 kit (pawn Strike only, bishop Frost only, no queen Inferno/heal). Intended mid/late kits never appear, so player DoT/summon packages face a weaker field than the data file describes. `longHorizonSim.ts` 50–53 still documents the `NaN`.  
SYSTEMS_AFFECTED: `WX` battle-start kit assign; `enemyAI.ts` `buildEnemyKit`; enemy threat  
RECOMMENDED_ACTION: Pass `playerTier`, `minLevel`, or `floor((minLevel-1)/tierSize)` — a number. Do not change kit contents in the same PR. After this ships, re-evaluate enemy Frost+Slow stacking (`004` cap). This restores counterplay; it is not a player nerf.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None. Makes `004`’s enemy-side cap relevant.  
REGRESSION_RISK: MEDIUM — zone 1+ bishops/queens gain Poison/Inferno/heal. Encounter length will change.  
VALIDATION_REQUIRED: Unit test: `buildEnemyKit("bishop", 0)` vs `buildEnemyKit("bishop", 1)`. Integration: `assignEnemySpells` with a real `LevelZone` object must not pass the object through. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-02-010  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Honor kit-spell cooldowns on controlled and AI summons  
CATEGORY: cooldown-circumvention  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Player Inferno CD is enforced on the bar (`executeCastAttempt` `WX` 17208–17210, 17258–17261; Attack Nearest still gates CD). `planSummonControlCast` (`summonControlCast.ts` 221–258) gates AP, range, and live geometry — not cooldown. Bomber `summonKit` is `["spell-inferno"]` (`spellData.ts` 650). Controlled Bomber goes through `resolveSpellCast` and applies a ticking 8/turn Inferno every summon turn. The 2026-08-31 Attack Nearest Inferno skip stays closed; this is the remaining launder.  
SYSTEMS_AFFECTED: `summonControlCast.ts`; `WX` `castControlledSummonSpell`; `executeSummonAction`; player `spellCooldownsRef`  
RECOMMENDED_ACTION: Per-summon cooldown map keyed by kit spell id. If the kit spell declares `cooldown`, start it on that unit after a successful kit cast. Do not share the player Inferno lock with the Bomber (a spawned Bomber may still cast once) — just stop every-turn recast.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: Works alone. Stronger if `002` also CDs the summon **spell**.  
REGRESSION_RISK: LOW — Wolf Strike / Archer Poison have no CD and stay spam-limited by summon AP (2).  
VALIDATION_REQUIRED: Tests: Bomber Inferno twice in two turns is `on_cooldown` after the first. Archer Poison still recasts if AP remains (or once per 2-AP turn). Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-02-011  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Retarget enemy summoner chance to pack/zone, not per-enemy × player level  
CATEGORY: summon-density  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `WX` 12047–12057: `0.12 + characterStats.level * 0.02` rolled **per enemy**. Level 44+ is 100% summoner on every trash mob. Comment in `gameConstants.ts` 295–297 still says “~12% of packs get one summoner; chance scales with levelZone.” `ENEMY_SUMMON_CAP = 2` keeps this from going infinite.  
SYSTEMS_AFFECTED: `WX` battle-start summoner flag; `gameConstants.ts`  
RECOMMENDED_ACTION: One roll per pack (or per non-summon enemy **using levelZone**, capped) so the comment matches the code. Keep the alive cap at 2. Do not remove enemy Wolf/Archer kits.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None  
REGRESSION_RISK: LOW — late-game boards get quieter; cap already bounded the abuse.  
VALIDATION_REQUIRED: Test the chance helper with level 1 vs 50 vs a zone number. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-02-012  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Apply Blood Mend / Rally CHC buffs to the crit roll  
CATEGORY: underpowered-restore  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: Both spells set `buffStat: "chc"`, `buffModifier: 0.15` (`spellData.ts` 96–98, 428–430). Crit uses `ctx.chc` from raw `characterStats.chc` (`WX` 9211; `spellEngine.ts` 891). `getStatModifier` never sees `chc` on that path. If someone later multiplies `chc` by 0.15, that would **cut** crit chance — the literal is a +15 percentage-point intent, not a 0.15× multiplier.  
SYSTEMS_AFFECTED: `WX` `playerSpellContext`; heal/buff apply; `getStatModifier`  
RECOMMENDED_ACTION: Feed crit chance through effects as **additive percentage points** (Blood Mend +15), not a 0.15 multiplier. Do not change heal amounts. This is a restore.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None  
REGRESSION_RISK: LOW — slightly more crits when the buff is up.  
VALIDATION_REQUIRED: Test: after Blood Mend, `chc` used by `resolvePlayerCast` is base+15. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-02-013  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Restore Vampire Bite / Soul Rend / Reflect Barrier metadata so catalog seeds fire  
CATEGORY: underpowered-restore  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `defaultSpells()` (`admin.mo` 168–191) dumps three ids that `resolvePlayerCast` cannot execute as advertised. Vampire Bite: `effectType = "heal"` + `spellType = "drain"` + `targetType` implied enemy → 20 damage, no heal, Pacifist-legal (`003`). Soul Rend: `effectType = "dot"` without `dotDamagePerTurn` → DoT branch, 0 tick, 25 upfront lost. Reflect Barrier: `effectType = "buff"` without `buffStat` / `isMirror` / self target → no-op (player Mirror uses `isMirror` + `activatePlayerMirror`). Shadow Strike / Thunder Clap / Void Collapse on the same seed **do** fire.  
SYSTEMS_AFFECTED: `admin.mo` `defaultSpells`; optional frontend mapping of backend configs; Pacifist (`003`)  
RECOMMENDED_ACTION: Bite → `effectType: "drain"` (keep healAmount 20). Soul Rend → set `dotDamagePerTurn` (and keep or split the 25 upfront via `damage` on a non-dot `effectType`). Reflect Barrier → `isMirror: true` and `targetType: "self"`, or retire it as duplicate of starter Mirror. Do **not** change Shadow Strike 35/3. Ship Pacifist `003` even if Bite stays mis-typed.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: `003` must not wait on this. If Bite becomes `drain`, Pacifist flips via `offCats` even without a broader 003 — still ship 003 for summons/Mark.  
REGRESSION_RISK: MEDIUM — live characters already “own” these ids. Changing Bite to drain makes it fail no-heal (`005`) and Pacifist. That is the advertised spell.  
VALIDATION_REQUIRED: Tests: Bite heals the caster and is `effectType === "drain"`; Soul Rend ticks; Reflect Barrier activates the same mirror consume as starter Mirror. Import gate. Motoko/bindgen if the seed rows change.  
STATUS: NEW  
