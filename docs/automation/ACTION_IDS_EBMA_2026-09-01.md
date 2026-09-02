# ACTION_IDs — 2026-09-01 Emergent Build & Meta Analyzer

Durable ledger for implementers and the Report Action Orchestrator.  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
HEAD inspected: `dd275aa` (`ci: require Caffeine import gates on all automations` / #182)  
Gameplay code: not modified. Do not implement balance from this file unless a later human or orchestrator explicitly picks an ID.

Analysis: [`EMERGENT_META_2026-09-01.md`](./EMERGENT_META_2026-09-01.md).  
Continues `EBMA-2026-08-31-001` … `010` (memories only; no prior docs PR).

---

ACTION_ID: EBMA-2026-09-01-001  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Cap or refresh same-source player DoT stacks  
CATEGORY: status-stacking  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `appendDotStack` (`engine/dotStacks.ts` 31–37) always appends. `WX` `applyActiveEffect` 1835–1845 routes every `type === "dot"` through it. Poison Arrow and Venom Strike have no `cooldown` (`spellData.ts` 49–67, 394–415). Inferno has CD 3 (518–519) but Poison does not. `resolvePlayerCast` 777–814 writes `dotDamagePerTurn`. Arcane Surge (`mapModifiers.ts` 210–217) drops Poison to 1 AP (min 1) via `applyApCost` (`WX` 17536). An 8-AP turn is 4 Poison stacks (8 under Surge), each 4 dmg × 3 independent turns. Long fights (boss / dungeon / rush) have no ceiling.  
SYSTEMS_AFFECTED: `engine/dotStacks.ts`; `WX` `applyActiveEffect`; player DoT branch in `spellEngine.ts`; optional map-modifier AP discount  
RECOMMENDED_ACTION: Same-name + same-caster refresh (reset duration, keep one stack) **or** a small per-target cap (e.g. 2 stacks per `effectName`). Keep Poison, Venom, and Inferno as three types that can coexist. Do not change per-tick numbers. Do not flatten DoT identity into one “poison.”  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None. `EBMA-2026-09-01-006` must not land first.  
REGRESSION_RISK: MEDIUM — last-hostile DoT death tests (`#81–#89`) assume stacks still tick. Refresh must still kill.  
VALIDATION_REQUIRED: Helper tests: two Poison casts → one stack, duration refreshed (or cap 2). Poison + Inferno still both tick. `pnpm typecheck` + `pnpm check`. Play a 10-turn boss and confirm the integral is bounded.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-01-002  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Player summon alive-cap and summon-spell cooldown  
CATEGORY: summon-abuse  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `ENEMY_SUMMON_CAP = 2` (`gameConstants.ts` 300) and `ENEMY_SUMMON_COOLDOWN_TURNS = 2` (301). Player `spawnPlayerSummon` (`WX` 10195–10247) calls `addCombatant` with no count check. All five summon rows omit `cooldown` (`spellData.ts` 547–690). Comment at `enemyAI.ts` 1816 (“player-side summonCount gate”) is false. Summon AP is now charged (`castResultSpendsAp` includes `"summon"`, `challengeCompletion.ts` 283–285) — the 2026-08-31 free-place hole is closed — but an 8-AP turn still buys Wolf + Archer + Wisp. Each unit gets its own turn.  
SYSTEMS_AFFECTED: `WX` `spawnPlayerSummon`; summon spell defs; `gameConstants.ts`; optional `summonSpawn.ts`  
RECOMMENDED_ACTION: Cap alive player-side summons (2 or 3) at spawn. Add a short cooldown (1–2 turns) on each summon spell. Keep five kit identities and current lifespan / upgrade formulas. Do not copy the enemy 2-turn summoner cadence onto the player if a per-spell CD already exists.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None. Pair with `010` if Bomber Inferno remains a kit id that already has `cooldown: 3`.  
REGRESSION_RISK: MEDIUM — occupancy / reserved-cell fallback (`summonSpawn.ts` 109–120) and portal unseal must still run. Do not change enemy cap.  
VALIDATION_REQUIRED: Tests: fourth player summon is rejected (if cap is 3); recasting Wolf during CD is `on_cooldown`. A 2-summon board still plays. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-01-003  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Pacifist Run counts player-side summon damage  
CATEGORY: achievement-spell  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Feat copy is “Win a battle using only heal or buff spells” (`admin.mo` 324, 500 Doka). `applyHealBuffSideEffect` (`targeting.ts` 54–74) flips only on enemy/area/line/drain/physical/listed categories — summon is `targetType: "ground"` + `effectType: "summon"`. `recordPlayerSpellType` (`WX` 17449–17467) treats `"summon"` as non-offensive. Summon damage does not flip `battleOnlyHealBuffSpellsRef`. `checkAndFireAchievement("pacifist_run")` (`WX` 13063) then pays.  
SYSTEMS_AFFECTED: `targeting.ts`; `WX` `recordPlayerSpellType` / achievement fire; summon spawn/cast  
RECOMMENDED_ACTION: Flip the pacifist flag when the player casts a summon spell **or** when a player-side summon deals damage / applies an offensive kit spell. Leave a legal path for heals + buffs + Timestep + Barrier + Mirror with no kits. Do not change the Doka amount.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None  
REGRESSION_RISK: LOW — feat is once-per-account. Worst case a previously “legal” summon pacifist becomes locked (correct).  
VALIDATION_REQUIRED: Tests: Shield-only win still unlocks; Wolf kill does not. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-01-004  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Apply player `debuffStat` and cap stacked AP/MP denial  
CATEGORY: ap-mp-denial  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `resolvePlayerCast` damage loop (`spellEngine.ts` 876–1028) never calls `applyEffect` for `debuffStat`. Slow, Frost Bolt, Weaken, Expose, Shadow Veil, Drain Courage, Cursed Wound, Life Drain therefore deal (or skip) damage and drop the advertised half. Enemy / boss casts apply the same fields (`WX` 17029–17042, 17106–17122). `getStatModifier` (`WX` 3304–3305) **adds** every `ap`/`mp` modifier from different `effectName`s. Wiring the player path without a cap, then later fixing `buildEnemyKit` zone (`009`), would let Frost + Slow + Drain Courage approach 0 AP/MP. Same-name still replaces (`WX` 1847–1857).  
SYSTEMS_AFFECTED: `spellEngine.ts` `resolvePlayerCast`; `WX` `getStatModifier` / `applyActiveEffect`; enemy debuff path  
RECOMMENDED_ACTION: After a successful player hit (or on a pure-debuff spell), apply `debuffStat` the same way the enemy path does. Cap combined AP/MP additives per target (e.g. cannot reduce the victim below 1 AP and 1 MP from debuffs). Do not change Slow/−2 or Frost/−1 numbers. This is a restore plus a safety rail, not a nerf of an existing player combo.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: `009` makes the enemy-side cap load-bearing. Ship the cap in the same change as the player wire, or immediately after.  
REGRESSION_RISK: MEDIUM — Haste is `buffStat: "mp"` modifier `+2` (additive). The floor must not clamp buffs.  
VALIDATION_REQUIRED: Tests: player Slow writes `stat: "mp"` on the target; two different MP debuffs cannot sum past the floor; Haste +2 still applies. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-01-005  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: No-heal challenges count drain heals and Wisp-to-player heals  
CATEGORY: challenge-economy  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `easy_1` / `hard_1` (`challengeCompletion.ts` 38–65) persist 50 Doka and 200 Doka + 500 XP from `!healUsed`. The flag is set only when `targetType === "self" && effectType === "heal"` (`WX` 17584–17589, 11047–11048). Life Drain / Lifesteal Nova / Drain Courage are `effectType: "drain"`. Summon ctx `heal` (`WX` 15466–15481) writes player HP and never touches `challengeHealUsedRef`. Overworld Doka-to-HP must stay excluded (`recordInBattleChallengeHealUsed` 207–213). Vampire Bite’s heal is inert (`effectType: "heal"` without self target) — do not treat the current Bite as a heal source until metadata is fixed.  
SYSTEMS_AFFECTED: `WX` `executeCastAttempt` / summon `heal`; `challengeCompletion.ts`; drain apply helper  
RECOMMENDED_ACTION: Set the flag when a drain spell heals the player and when a summon `heal` targets the player. Keep out-of-battle heals from failing the next fight. Do not change reward amounts.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None  
REGRESSION_RISK: LOW — challenges become harder in the advertised way.  
VALIDATION_REQUIRED: Existing `challengeCompletion.test.ts` plus: Life Drain in battle sets `healUsed`; Wisp heal on player sets it; overworld Doka heal does not. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-01-006  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Write `dotDamagePerTurn` on summon-AI DoT applyEffect  
CATEGORY: summon-ai  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Live summon path is `decideSummonAction` + `executeSummonAction` (`WX` 15652, 15735). `applyCast` (`summonExecutor.ts` 212–224) applies DoTs without `dotDamagePerTurn`. `tickDotStacks` (`dotStacks.ts` 105–108) ignores those rows. Player-controlled summons use `resolveSpellCast` (`WX` 10462) and **do** tick. AI Archer Poison and AI Bomber Inferno are cosmetic. Bomber kamikaze also only runs on the `damage > 0` branch (198–201); Inferno `damage` is 0, so AI Bombers neither tick nor explode.  
SYSTEMS_AFFECTED: `engine/summonExecutor.ts`; DoT tick; bomber lifespan  
RECOMMENDED_ACTION: Copy `dotDamagePerTurn` from the kit spell onto the effect. Restore bomber detonation on Inferno cast even when upfront damage is 0. **Do not ship this before 001** — AI + player-controlled stacks would double the unbounded integral.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: EBMA-2026-09-01-001  
REGRESSION_RISK: HIGH if 001 is missing. MEDIUM after 001 (extra ticks on enemy-facing AI summons too).  
VALIDATION_REQUIRED: Tests: AI Poison effect has `dotDamagePerTurn === 4` and `sumDotTicks` > 0; bomber Inferno sets hp 0. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-01-007  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Keep catalog ≠ ownership; do not treat backend seed as discovery  
CATEGORY: discovery-progression  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `shouldIncludeBackendSpellInLibrary` (`adminSafety.ts` 311–317) returns true whenever `usableByPlayer !== false`. `ownedSpells` (`WX` 2410–2438) unions starters with that filter. `defaultSpells()` (`admin.mo` 168–191) therefore grants Shadow Strike / Thunder Clap / Void Collapse / inert Soul Rend / Bite / Reflect to every seeded account. Achievements and challenges still grant Doka only. No `ownedSpellIds` / `observedSpellIds`. Sibling design already owns the pipeline: `SDA-2026-08-31-002` … `004`, `SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`.  
SYSTEMS_AFFECTED: `WX` `ownedSpells`; `adminSafety.ts`; `admin.mo` `defaultSpells`; future grant writers  
RECOMMENDED_ACTION: Do **not** implement observe-to-unlock from this automation. When SDA-002 lands, migrate existing characters from starters + `spellLevelKeys` ∪ `spellBarOrder`, not from the full catalog. Leave Shadow Strike numbers alone — it is STRONG_BUT_HEALTHY, not a dump-to-nerf.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-002 / 003 / 004  
REGRESSION_RISK: HIGH if migrate under-seeds the bar.  
VALIDATION_REQUIRED: Owned by the SDA tickets. This ID is a meta constraint, not a second implementation.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-01-008  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Monitor Titan’s Vigor × Glass Realm × Sacrifice; do not nerf yet  
CATEGORY: map-modifier-lottery  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: `applyDamageDealt` is called only from `enemyTakesDamage` (`WX` 3520–3537). The main player damage loop uses `calculatePlayerDamage` / `applyDamageToEnemy` and skips the hook. Sacrifice (`spellEngine.ts` 749–763) uses `dealDamage` → `enemyTakesDamage`, so it **does** get Titan 1–5× (`mapModifiers.ts` 311–314) and Glass ×2 (345–346). Sacrifice HP cost reads `characterStats.hp` (750), not necessarily Titan’s `applyBattleStart` +1000 on `combatantsRef` (12640–12642). Mark and crit do not apply.  
SYSTEMS_AFFECTED: `mapModifiers.ts`; `WX` `enemyTakesDamage`; Sacrifice  
RECOMMENDED_ACTION: No number change. If play data shows Glass+Titan maps are Sacrifice-or-skip, then either route all player damage through one modifier hook **or** exclude Sacrifice from `onDamageDealt`. Do not flatten Titan’s identity.  
AUTONOMY: MONITOR  
DEPENDENCIES: None  
REGRESSION_RISK: N/A until a number change is chosen.  
VALIDATION_REQUIRED: If a later ID changes the hook, add a test that Strike does or does not take Titan/Glass consistently with Sacrifice.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-01-009  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Pass a numeric zone into `buildEnemyKit`  
CATEGORY: relative-progression  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Call site `WX` 12484: `buildEnemyKit(enemy.pieceType, currentMap.levelZone)`. `levelZone` is `{ name, minLevel, maxLevel }` (`WX` 5265–5269). `buildEnemyKit` (`enemyAI.ts` 187–192) does `Math.floor(levelZone)` → `NaN`; `z >= 1` is false. Every piece stays on the zone-0 kit (pawn Strike only, bishop Frost only, no queen Inferno/heal). Intended mid/late kits never appear, so player DoT/summon packages face a weaker field than the data file describes. `longHorizonSim.ts` 45–47 already documents the `NaN`.  
SYSTEMS_AFFECTED: `WX` battle-start kit assign; `enemyAI.ts` `buildEnemyKit`; enemy threat  
RECOMMENDED_ACTION: Pass `playerTier`, `minLevel`, or `floor((minLevel-1)/tierSize)` — a number. Do not change kit contents in the same PR. After this ships, re-evaluate enemy Frost+Slow stacking (`004` cap). This restores counterplay; it is not a player nerf.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None. Makes `004`’s enemy-side cap relevant.  
REGRESSION_RISK: MEDIUM — zone 1+ bishops/queens gain Poison/Inferno/heal. Encounter length will change.  
VALIDATION_REQUIRED: Unit test: `buildEnemyKit("bishop", 0)` vs `buildEnemyKit("bishop", 1)`. Integration: `assignEnemySpells` with a real `LevelZone` object must not pass the object through. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-01-010  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Honor kit-spell cooldowns on controlled and AI summons  
CATEGORY: cooldown-circumvention  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Player Inferno CD is enforced on the bar (`executeCastAttempt` 17544–17545, 17594–17597; Attack Nearest 17624). `planSummonControlCast` (`summonControlCast.ts` 109–169) gates AP, range, and live geometry — not cooldown. Bomber `summonKit` is `["spell-inferno"]` (`spellData.ts` 650). Controlled Bomber goes through `resolveSpellCast` (`WX` 10462) and applies a ticking 8/turn Inferno every summon turn. The 2026-08-31 Attack Nearest Inferno skip is closed; this is the remaining launder.  
SYSTEMS_AFFECTED: `summonControlCast.ts`; `WX` `castControlledSummonSpell`; `executeSummonAction`; player `spellCooldownsRef`  
RECOMMENDED_ACTION: Per-summon cooldown map keyed by kit spell id. If the kit spell declares `cooldown`, start it on that unit after a successful kit cast. Do not share the player Inferno lock with the Bomber (a spawned Bomber may still cast once) — just stop every-turn recast.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: Works alone. Stronger if `002` also CDs the summon **spell**.  
REGRESSION_RISK: LOW — Wolf Strike / Archer Poison have no CD and stay spam-limited by summon AP (2).  
VALIDATION_REQUIRED: Tests: Bomber Inferno twice in two turns is `on_cooldown` after the first. Archer Poison still recasts if AP remains (or once per 2-AP turn). Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-01-011  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Retarget enemy summoner chance to pack/zone, not per-enemy × player level  
CATEGORY: summon-density  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `WX` 12496–12506: `0.12 + characterStats.level * 0.02` rolled **per enemy**. Level 44+ is 100% summoner on every trash mob. Comment in `gameConstants.ts` 295–297 still says “~12% of packs get one summoner; chance scales with levelZone.” `ENEMY_SUMMON_CAP = 2` keeps this from going infinite.  
SYSTEMS_AFFECTED: `WX` battle-start summoner flag; `gameConstants.ts`  
RECOMMENDED_ACTION: One roll per pack (or per non-summon enemy **using levelZone**, capped) so the comment matches the code. Keep the alive cap at 2. Do not remove enemy Wolf/Archer kits.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None  
REGRESSION_RISK: LOW — late-game boards get quieter; cap already bounded the abuse.  
VALIDATION_REQUIRED: Test the chance helper with level 1 vs 50 vs a zone number. Import gate.  
STATUS: NEW  

---

ACTION_ID: EBMA-2026-09-01-012  
SOURCE_AUTOMATION: Emergent Build & Meta Analyzer  
TITLE: Apply Blood Mend / Rally CHC buffs to the crit roll  
CATEGORY: underpowered-restore  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: Both spells set `buffStat: "chc"`, `buffModifier: 0.15` (`spellData.ts` 96–98, 428–430). Crit uses `ctx.chc` from raw `characterStats.chc` (`WX` 9785; `spellEngine.ts` 891). `getStatModifier` never sees `chc` on that path. If someone later multiplies `chc` by 0.15, that would **cut** crit chance — the literal is a +15 percentage-point intent, not a 0.15× multiplier.  
SYSTEMS_AFFECTED: `WX` `playerSpellContext`; heal/buff apply; `getStatModifier`  
RECOMMENDED_ACTION: Feed crit chance through effects as **additive percentage points** (Blood Mend +15), not a 0.15 multiplier. Do not change heal amounts. This is a restore.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None  
REGRESSION_RISK: LOW — slightly more crits when the buff is up.  
VALIDATION_REQUIRED: Test: after Blood Mend, `chc` used by `resolvePlayerCast` is base+15. Import gate.  
STATUS: NEW  
