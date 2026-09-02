# Enemy & Boss Admin Content Designer

**Author:** Enemy & Boss Admin Content Designer  
**Automation:** `299b70f5-a498-11f1-a7d1-d6b4613131ce`  
**Date:** 2026-08-31  
**Scope:** Owner tooling for creating, editing, cloning, inspecting, and managing enemies and bosses **without routine source changes**.  
**This PR ships documentation only.** Do not implement production, RAF, map generation, turn, or damage-math code from this file.

ACTION_IDs: [`ACTION_IDS_ENEMY_BOSS_ADMIN_2026-08-31.md`](./ACTION_IDS_ENEMY_BOSS_ADMIN_2026-08-31.md)

Sibling contracts (do not re-specify):

| Contract | PR | Consume for |
| :--- | :--- | :--- |
| Spell / discovery / CORE–SIGNATURE pools | [#116](https://github.com/Mr-Melic/stralt/pull/116) `SDA-*` | Kits, `PLAYER_LEARNABLE`, observation, SpellConfig activate gate |
| Custom visual library | [#121](https://github.com/Mr-Melic/stralt/pull/121) `VAL-*` | Asset / pool bind, render profiles, fallback invariant |
| Expansion catalog | [#118](https://github.com/Mr-Melic/stralt/pull/118) | Family-role kits, 999-cap note, zone-NaN kit bug |

---

## 0. Non-negotiable product rules

1. **Stralt has no character level cap.** Admin, spawn, preview, and validation must never assume a final maximum level. Finite `levelMin`/`levelMax` ranges and hidden caps (`floor(999 / tierSize)` in `pickEnemyLevelFromTiers`) are design defects, not features.
2. Prefer **relative offsets**, **probability curves**, **eligibility thresholds**, and **scalable formulas** over closed level tables.
3. **Backend-authoritative.** `localStorage` is a cache. `pbv_boss_configs` must not remain the live boss source.
4. **Admin is owner-only.** Same `#admin` + lazy `AdminDashboard` gate. Never ship the studio to players.
5. **Visuals never invalidate gameplay.** Occupancy, movement, range, and targeting stay tile-based (`VAL-008`).
6. **Explicit metadata only.** No name-based AI, kit, family, or variant inference (`AGENTS.md`).
7. **Do not touch** RAF, map generation, turn logic, or damage math. New behaviour lives in `engine/*` / `utils/*`. WorldExploration gets one-line call sites.
8. Rewards still go through the **single `applyRewards` funnel** and the root recap popup.
9. Default custom visual is **NONE** → built-in pixel art (`VAL-001`).

---

## 1. Current state (verified against `origin/main` @ `22503b5`)

The owner can already *type* enemy and boss numbers into Admin. Those numbers **do not drive live encounters**.

### 1.1 Two incompatible `EnemyConfig` types — neither is the spawn source

| Layer | Path | Fields | Used by spawn? |
| :--- | :--- | :--- | :--- |
| Admin / frontend template | `src/frontend/src/types/gameTypes.ts` 108–119; `src/backend/types/admin.mo` 15–26; `main.mo` 386–397 | `id`, `name`, `hp`, `ap`, `mp`, `initStat`, **`levelMin`/`levelMax`**, `regions[]`, `spriteUrl?` | **No** |
| Runtime Motoko combat | `src/backend/types/common.mo` 97–112 | `pieceType`, `level`, `damage`, `res`, `sp`, `chc`, `init`, `sr`, `xpReward`, `dokaReward`, `side` | **No** (helper `computeEnemyStats` 116–153 unused on the client path) |
| Live combatant | `gameTypes.ts` `Enemy` 259–331 | Piece, family, `aiTier`, spells, boss flags, movement | Built procedurally in `WorldExploration.tsx` |

Documented as a footgun in `docs/TROUBLESHOOTING.md` 164–171 and `docs/ARCHITECTURE.md` 29.

CRUD exists (`adminSetEnemyConfig` / `adminDeleteEnemyConfig` / `getEnemyConfigs`, `main.mo` 523–541) and the Enemies tab can add/edit/delete (`AdminDashboard.tsx` 5051–5096). **`generateEnemies` (`WorldExploration.tsx` 6073–6330) never calls `getEnemyConfigs`.** Saving an enemy in Admin has zero gameplay effect.

`newEnemy()` (`AdminDashboard.tsx` 101–112) defaults `levelMax: BigInt(5)` — an implicit early-game cap baked into every new draft.

`adminDeleteEnemyConfig` is a hard `Map.remove` (`main.mo` 531–536) with no lifecycle, dependents, or rollback.

Presets (`EnemyPresets`, `AdminDashboard.tsx` 357–513) are **browser `localStorage`**, max 10, not canister.

### 1.2 What actually spawns

`generateEnemies` (`WorldExploration.tsx` 6073–6330):

- Count: `1–8` plus dungeon extras `[0,2,3,4,4,5]` by depth (6082–6085).
- Piece: uniform random among six chess types (6087–6140).
- Level: `pickEnemyLevelFromTiers(playerLevel)` plus dungeon tier boost (6145–6155).
- Stats: placeholder `level*8+20` HP at spawn (6204–6206); battle start reseeds via `getEnemyBaseStats` / `calcEnemyMaxHp`.
- Name: admin name pool or `DEFAULT_ANCIENT_NAMES` (6119–6181).
- Family: **30%** roll among seven lore families with hardcoded stat multipliers (6236–6327). Not veteran/elite/champion.
- Formation: quadrant coverage + Chebyshev ≥ 4 (6128–6235). Not named formations.
- Visual: `family` stored; regular enemies still paint as chess pieces (`VAL-013`). `spriteUrl` is never read by the world renderer.

Battle start (`WorldExploration.tsx` 12181–12208):

- Comment still says “10 random spells”; code calls `buildEnemyKit(pieceType, currentMap.levelZone)`.
- `currentMap.levelZone` is an **object** `{ name, minLevel, maxLevel }` (`WorldExploration.tsx` 456, 5064, 5613). `buildEnemyKit` does `Math.floor(levelZone)` (`enemyAI.ts` 192) → **NaN** → kits stay on the zone-0 branch. Expansion catalog already recorded this.
- Summoner: `0.12 + playerLevel * 0.02` (`gameConstants.ts` 298–301), then hardcoded `summon-dire-wolf` / `summon-archer` ids.

### 1.3 Hidden “max level” assumptions (forbidden)

| Site | Assumption |
| :--- | :--- |
| Admin `EnemyConfig.levelMin` / `levelMax` | Closed spawn band. New drafts cap at 5. |
| `RegionConfig.levelMin` / `levelMax` | Same closed-band pattern (`gameTypes.ts` 124–125). |
| `pickEnemyLevelFromTiers` | `maxTier = Math.floor(999 / ts)` (`combatMath.ts` 58). Three-or-more band is clamped to that cap (94–97). |
| `computeAITier` | Bands up to 900 then a flat tier 10 (`combatMath.ts` 36–47). Sophistication may plateau; **player/enemy level must not**. |
| Death Realm HUD | `maxLevel: 5` in some snippets (`WorldExploration.tsx` 13567, 13699) vs `9999` elsewhere (5818, 5889) — display only, still a false cap. |
| Boss spawn | Hard `characterStats.level + 5` (`WorldExploration.tsx` 6990). Not admin-editable. |
| `setBossConfig` | Rejects `baseStats.ap > 20` (`main.mo` 2072–2074). That is a **combat AP budget** (same class as `updateCharacter` AP cap 20), not a character-level cap. Keep AP as a combat clamp; do not invent a level max beside it. |
| `getBossEffectiveStats` | Formula `1.08^(bossLevel - playerLevel)` (`progression.ts` 290–339) is **unbounded** and correct in spirit — but it is **UI-only** (Boss Guide). Combat does not call it. |

There is **no** character level cap in `xpCurve.ts`. Do not add one in admin.

### 1.4 Boss split-brain

| Layer | Reality |
| :--- | :--- |
| Frontend catalogue | 19 ids in `BOSS_IDS` (`bossTypes.ts` 390–410) |
| Frontend defaults | 19 full `BossConfig`s in `bossDefaults.ts`; storage key `pbv_boss_configs` |
| Runtime read | `useBossQueries.ts` 1–4, 11–20 — **localStorage only**. Comment: “no backend endpoint yet” (false: endpoints exist). |
| Runtime write | `useSetBossConfig` (`useAdminQueries.ts` 488–503) writes localStorage. Bosses tab copy (`AdminDashboard.tsx` 6925–6927): “Changes save to localStorage and take effect on the next boss encounter.” |
| Canister | `setBossConfig` / `getAllBossConfigs` / `deleteBossConfig` (`main.mo` 2062–2096). Seeded **12** bosses (`admin.mo` `defaultBossConfigs` ~350–568) with **purged spell ids** (`fireball`, …). |
| Schema drift | Frontend has `iconEmoji`, `loreText`, `chc`. Backend has `defeated`, `adminNotes`, no `chc`. Ability strings disagree in casing. |
| AI | One function per boss in `useBossAI.ts` `DECISION_MAP` (~1520–1540). New boss = source change. |
| Abilities | `BossAbility` enum (`bossTypes.ts` 10–59) + `applyBossAbility` switch in `useBossSystem.ts`. Tags in config; behaviour in code. |
| Portals | World picks a **random** `BOSS_IDS` entry. `setBossPortalAssignment` exists (`main.mo` 2104–2116); frontend hook is a no-op invalidate (`useAdminQueries.ts` 519–534). |
| Combat scaling | Spawn uses raw `baseStats.hp` and `level + 5`. `getBossEffectiveStats` unused. RES/SP clamped to 50 at spawn (7012–7013). |
| Create | **No “new boss”.** Editor iterates `BOSS_IDS` only (`AdminDashboard.tsx` 6931). |

### 1.5 Boss Rush is flavour, not data

`BOSS_RUSH_ROOMS` (`useBossRush.ts` 23–134) hardcodes 10 pairs, flavour `combinedMechanic` strings, and unused `dokaReward`/`xpReward`. Room 10 uses `weeping_pawn_2` (line 126) — **not in `BOSS_IDS`**.

Admin Boss Rush tab persists `room_N_enabled` / `room_N_reward` to localStorage **and** `adminSetBossRushConfig`. Gameplay spawn (`spawnBossRushRoom`) uses placeholder 100-HP enemies and does not load `BossConfig` / boss AI. Room-clear persist hardcodes `roomMultiplier = 1`.

### 1.6 AI is inferred, not authored

- Archetypes: `caster | healer | charger | flanker | berserker | summoner | generic` (`enemyAI.ts` 79–86).
- `inferArchetype` (`enemyAI.ts` 420–450) keys off heal flags, range, `pieceType === "knight"`, and **`family.includes("berserk")`** — a string heuristic.
- Tactical modules are **global** constants (`gameConstants.ts` 148–301): lethal lookahead, overkill spill, LoS reposition, backline protect, kamikaze, summoner chance. Not per-enemy.
- `aiTier` 1–10 from level bands (`combatMath.ts` 36–52) plus 30% random reroll. Gates erratic (≥5 + leader death) and betrayal (≥10) in WorldExploration.

### 1.7 Variants, pools, discovery, mastery, visuals

| Need | Exists? |
| :--- | :--- |
| base / veteran / elite / champion / rare | **No.** Closest: 30% family roll, leader, summoner flag. |
| CORE / ADVANCED / RARE / ELITE / SIGNATURE pools | **No** on enemies. Specified in SDA-008. Bosses have phase `spellPoolIds`. |
| Player learnable / observation / acquisition | **No.** Specified in SDA-003/004. Admin enemy form cannot show them. |
| Boss mastery objectives | **No** `mastery` field. Battle challenges are generic (`challengeCompletion.ts`). |
| Custom visual NONE / asset / pool | **No.** `spriteUrl` text box only (`AdminDashboard.tsx` 602–616). VAL designs the library. |
| Draft → validate → preview → activate | **No.** Enemy save is immediate canister write. Boss save is immediate localStorage. |
| Clone / compare / rollback | **No** (local presets are not clones of live definitions). |
| Encounter preview at player level N | **No.** |

### 1.8 What already works and must be reused

- Admin gate: `#admin` writes, lazy dashboard, `isAdmin` in `App.tsx`.
- Tier **probability weights** (`TierSpawnConfig`, `adminSetTierSpawnConfig`) — relative, not a level cap. Keep the *shape*; delete the 999 clamp.
- Leader boost % and ground Doka spawn in game config.
- Enemy **display-name** pool on canister.
- `usableByEnemy` as a **cast** flag (not acquisition).
- `BossAbility` tag dispatch and `validateBossKits()` for default kits (`bossKits.ts` 703–753).
- `getBossEffectiveStats` formula (unbounded). Wire it; do not replace it with a table.
- Carved-stone / gold / crimson Admin language (`DESIGN.md`).

---

## 2. Design principles

1. **Definition ≠ instance.** `EnemyDefinition` / `BossDefinition` are owner documents. Spawned `Enemy` objects are instances with a resolved level, variant, kit, and visual bind.
2. **Active definitions drive spawn.** If the active set is empty, keep today’s procedural fallback so the world does not go silent. Empty-catalog fallback must be explicit and logged once per map.
3. **Relative to the player, forever.** Eligibility is “playerLevel + offset ≥ threshold”, never “level ≤ 40”.
4. **Curves over tables.** Rarity, elite chance, and variant mix are weights / functions of relative offset, dungeon depth, and encounter tags.
5. **Lifecycle before live.** `draft → validate → preview → activate`. Combat reads `activeRevision` only.
6. **Clone is a first-class write.** New id, copied definition, lifecycle `draft`, no live spawn until activate.
7. **Visual mode defaults to NONE.** Built-in pixel art. Custom bind cannot change stats, AI, occupancy, or rewards (`VAL-001`, `VAL-008`).
8. **Spell authorship stays in SDA.** This studio *selects* kits and *displays* discovery flags. It does not invent a second SpellConfig.
9. **New boss without a TS file.** Ability tags and AI profiles are registries. Unknown tag = validation error, not a silent no-op.
10. **Soft-retire.** Same class as SDA-005. Hard delete only unpublished drafts with zero dependents.

---

## 3. Canonical `EnemyDefinition`

Replace the admin spawn template. Do **not** overload `types/common.mo` combat `EnemyConfig` — keep that name for instance/combat snapshots or rename it to `EnemyCombatant` in a later bindgen pass (out of scope here). New persist record (names indicative):

### 3.1 Identity

| Field | Rule |
| :--- | :--- |
| `id` | Immutable after first activate. `^[a-z][a-z0-9_-]{1,47}$`. |
| `name` | Presentation / log only. Never used as a spawn or AI key. |
| `family` | Closed enum *plus* owner-extensible family ids stored as data (not a TS union that requires a deploy). Seed the current seven + `default`. |
| `role` | Closed enum: `bruiser` \| `skirmisher` \| `caster` \| `support` \| `controller` \| `leader` \| `summoner`. Distinct from family (look) and from AI profile (behaviour). |
| `lifecycle` | `draft` \| `active` \| `inactive` \| `retired`. |
| `pieceType` | Visual / movement baseline (`ChessPieceType`). Not the identity key. |

`EnemyFamily` in `gameTypes.ts` 12–20 stays as the seed list. Admin may add family ids; renderer falls back to `default` pixels until VAL / family art exists (`VAL-013`).

### 3.2 Gameplay — base stats and scaling

Store **base stats at relative offset 0** (even with the player) plus **formulas**, not a level table.

| Field | Meaning |
| :--- | :--- |
| `baseStats` | `hp`, `ap`, `mp`, `atk`, `res`, `sp`, `sr`, `chc`, `init` at offset 0. AP/MP remain combat-budget clamped (today’s 20) — that is not a level cap. |
| `statGrowth` | Per-stat: `kind: linear \| exponential`, `perRelativeLevel` (e.g. HP `50 * (1 + (resolvedLevel-1) * growthPct/100)` already exists as `calcEnemyMaxHp`). Default inherits `LevelUpConfig.statGrowthPercent`. |
| `pieceMultipliers` | Optional override of `ENEMY_PIECE_MULTIPLIERS` (`progression.ts`). Default = inherit. |

Resolved instance stats = `f(baseStats, statGrowth, variant.statMult, family.statMult, resolvedLevel)` in `engine/enemyDefinition.ts`. WorldExploration only calls the helper.

### 3.3 Relative-level behaviour (replaces `levelMin` / `levelMax`)

```
RelativeEligibility {
  minOffset: Int        // eligible when enemyResolvedLevel >= playerLevel + minOffset
  maxOffset: ?Int       // NONE by default — never a hard cap
  weightCurve: Curve    // weight as a function of (resolvedLevel - playerLevel)
  dungeonMinDepth: Nat  // 0 = overworld + all depths
  encounterTags: [Text] // e.g. "overworld", "dungeon", "boss_rush", "elite_pack"
}
```

Rules:

- Omit `maxOffset` unless the owner explicitly wants a *relative* ceiling (“never more than +8 vs the player”). That is not a world level cap.
- Preview and validate must accept **any** player level the tester types (1, 50, 500, 5000).
- `pickEnemyLevelFromTiers` remains the default **curve** when a definition’s `weightCurve` is `inherit-tier-config`. Delete `maxTier = floor(999/ts)`.
- Region linkage uses `encounterTags` / region **ids**, not region `levelMax`.

### 3.4 Rewards

Per definition, formulas, paid only through `applyRewards`:

| Field | Default (matches today) |
| :--- | :--- |
| `xpPerResolvedLevel` | 20 (`computeVictoryExp`) |
| `dokaPerResolvedLevel` | 1 × existing rarity curve (do not move jackpot math in this project) |
| `xpCurveId` / `dokaCurveId` | `inherit-global` \| custom curve id |
| `bossMultipliers` | N/A on trash; bosses use `rewardXpMultiplier` / `rewardDokaMultiplier` |

`common.mo` `xpReward` / `dokaReward` fixed Nats are **retired** as the live path — they cannot scale without a cap table.

### 3.5 AI

| Field | Rule |
| :--- | :--- |
| `aiProfile` | Required enum matching `EnemyArchetype` plus owner-registered profile ids. **Do not infer** from spells or `pieceType`. |
| `sophistication` | `{ mode: inherit-tier \| fixed; tier?: Nat; relativeBand?: Curve }`. `inherit-tier` uses `computeAITier` **without** inventing a max player level; bands may saturate at 10. |
| `tacticalModules` | Explicit allow-list of module ids that already exist as constants: `lethal_lookahead`, `overkill_spill`, `los_reposition`, `backline_protect`, `kamikaze`, `summoner`, `erratic_on_leader_death`, `betrayal`. Unknown id → validate fail. |
| `summoner` | Optional `{ bonusSummonSpellIds; weight; cap }` — replaces hardcoded wolf/archer (SDA-008). |

Retire `inferArchetype` name/family heuristics (`family.includes("berserk")`, `pieceType === "knight"` as the only flanker path). Knight may be the **template default** when cloning a new enemy, then stored.

### 3.6 Spell pools (consume SDA-008)

Do not invent a second kit document. `EnemyDefinition.kitRef` → `EnemyKit` from SDA:

```
core / advanced / rare / elite / signature
```

Enemy Admin **must show**, read-only from SpellDefinition (SDA-003):

| Chip | Source |
| :--- | :--- |
| Player learnable? | `PLAYER_LEARNABLE` |
| Observation required? | `OBSERVATION_REQUIRED` |
| Acquisition sources? | `acquisition.route` (+ `MULTI_SOURCE` children) |
| Enemy-castable? | `usableByEnemy` (cast gate, not learn) |
| Resolves? | id exists, `lifecycle = active`, kit-legal |

Broken chips are crimson; activate is blocked (SDA-009 pattern).

Until SDA-008 lands, `resolveEnemyKit` may wrap today’s `ENEMY_KITS` **and** must pass a **numeric** zone (fix the object→NaN bug). That fix is EBA-013 and is allowed as a tiny `engine/enemyAI.ts` / call-site helper — not a WorldExploration rewrite.

### 3.7 Variants

Closed seed set, owner-extensible via data (future variants do not require a deploy if they only change multipliers / pool gates):

| Variant | Intent | Default relative rules |
| :--- | :--- | :--- |
| `base` | Common | Weight 1 on the inherit-tier curve |
| `veteran` | Same definition, higher offset / stats | Weight rises with `max(0, relativeOffset)` |
| `elite` | Elite pool + elite visual flag (`VAL-019`) | `eliteChance` curve × dungeon depth |
| `champion` | Pack leader or named rare | At most one per encounter unless owner says otherwise |
| `rare` | Low-weight cosmetic + kit signature | Independent of elite |
| `#future(Text)` | Stored; ineligible until a variant record exists | Resolver skips |

Each variant record: `statMult`, `rewardMult`, `kitGate` (`core`…`signature`), `aiSophisticationBias`, `visualMode` inherit/override, `spawnWeightCurve`.

Do **not** infer elite from `iron_golem` HP or `scaleY` (`VAL-019`).

### 3.8 Spawning

Attached `SpawnRules`:

| Rule | Model |
| :--- | :--- |
| Relative-level eligibility | §3.3 |
| Rarity | Weight among eligible active definitions (not a 1–N level list) |
| Probability weighting | `weight * variantCurve(offset) * tagMult[environment]` |
| Environment | Region / biome **ids** (today’s unused `regions[]` becomes this) |
| Dungeon | `depthWeight: Nat -> Float` (replace the hardcoded extra-count / tier-boost arrays with owner curves; default those arrays) |
| Boss Rush | Eligible only if tagged; room table references definition ids |
| Formations | Named templates: `scatter` (today’s quadrant+Chebyshev 4), `pair`, `frontline`, `backline_caster`, `boss_minion_ring`. Geometry lives in `engine/spawnFormations.ts`, not mapGen. |
| Elite chance | `eliteChance = clamp01(base + k * max(0, relativeOffset) + dungeonDepthTerm)` — no level cap. |

`generateEnemies` becomes: load active definitions → filter eligibility → weighted pick → roll variant → resolve level from curve → bind kit / visual / AI → place via formation helper.

If zero definitions are `active`, use the current procedural path (chess + tier + 30% family) so existing maps keep working.

---

## 4. Canonical `BossDefinition`

Where applicable, bosses reuse EnemyDefinition sections (identity, scaling formulas, AI profile, kit/discovery inspector, visual mode, lifecycle). Additional fields:

### 4.1 Identity and catalogue

- `id` is data. `BOSS_IDS` becomes the **seed list**, not the compile-time ceiling.
- `create` / `clone` allocate a new id. Activate requires a resolved `aiProfile` and every `specialAbilities` tag present in the **ability registry**.
- Frontend/backend schema unify: include `iconEmoji`, `loreText`, `chc`, `adminNotes`. Drop unused `defeated` from the definition (progress belongs on the player).

### 4.2 Scaling

| Field | Default |
| :--- | :--- |
| `levelOffset` | `+5` (today’s spawn) — **relative**, not a cap |
| `levelDiffStep` | `1.08` (`BOSS_LEVEL_DIFF_STEP`) |
| `useLevelDiffScaling` | `true` — combat **must** call `getBossEffectiveStats` |
| `phase2.statMultiplier` | Existing; composes with level-diff (already documented at `progression.ts` 270–272) |

Preview table: owner-typed player level + offsets, **no 999/5000 clamp**. `BOSS_LEVEL_DIFF_OFFSETS` stays a UI convenience, not the only legal diffs.

Remove spawn `Math.min(50, res/sp)` or make the clamp an explicit definition field. Silent 50 is a hidden cap on those stats.

### 4.3 Phases, spells, summons, arena

Keep `BossPhaseConfig` (`phaseNumber`, `hpThreshold`, `statMultiplier`, `spellPoolIds`, `specialAbilities`, `summonCount`).

Activate requires:

- Every `spellPoolIds` id is active + `usableByEnemy` (SDA-009).
- Every ability tag ∈ registry; `SPAWN_MINIONS` / `SCROLL_SUMMON` / `GHOST_SUMMON` have `summonCount` or `summonDefinitionIds`.
- Summon definition ids resolve to active `EnemyDefinition`s (or a dedicated minion def), not anonymous 20-HP pawns unless that is the stored def.
- Arena mechanics are an **id list** (`board_shrink`, `lava_trail`, `void_tiles`, …) that maps 1:1 to existing `BossAbility` handlers. Unknown id → fail validate. Flavour strings (`combinedMechanic` today) are **not** executable.

New bosses without a custom `useBossAI` function use a **generic profile** (`pickBossKitSpell` + tagged abilities). Per-boss decision functions remain optional overrides registered by id — they are not required to add a stat-and-kit boss.

### 4.4 Discoverable spells

Inspector only (SDA). Boss `BOSS` / `BOSS_ONLY` routes display on each chip. This studio does not grant spells.

### 4.5 Mastery objectives

New optional list on the definition (not the generic battle-challenge catalog, though an objective may *reference* a challenge id):

```
BossMasteryObjective {
  id: Text
  title: Text
  predicateId: Text     // existing challenge predicate or a new registered id
  spellRewardIds: [Text] // SDA-010
  dokaReward: Nat
  xpReward: Nat
}
```

Rewards enqueue on the same persist lock as `applyRewards` / challenge grants. No `updateCharacter` smash. Recap at app root.

### 4.6 Portal assignment

`setBossPortalAssignment` becomes live: world boss portals consume canister assignments first, then weighted eligible bosses, then seed `BOSS_IDS`. Frontend no-op hook is deleted.

### 4.7 Boss Rush

`BossRushRoom` becomes a canister document:

- `boss1Id` / `boss2Id` must be active `BossDefinition`s.
- `combinedMechanic` stays flavour **or** is replaced by `mechanicIds: [Text]` that validate against the registry.
- `dokaReward` / `xpReward` / `rewardMultiplier` are read by `handleBossRushRoomClear` (today unused).
- `enabled` is honoured.
- Spawn loads real `BossDefinition`s and boss AI — no 100-HP placeholders.
- Ban unknown ids (`weeping_pawn_2`).

---

## 5. Visual configuration (every entity)

Shown on both Enemy and Boss editors. **Default: CUSTOM VISUAL = NONE.**

| Control | Behaviour |
| :--- | :--- |
| **Use Default Pixel Visual** | `visualMode = none`. Built-in / generated pixel design (chess piece, family pattern, or `getBossPixelPattern`). |
| **Select Uploaded Visual** | `visualMode = asset` + `visualAssetId`. Consumes VAL library. |
| **Select Visual Pool** | `visualMode = pool` + `visualPoolId`. Weighted bind at spawn (`VAL-005`, `VAL-006`). |
| **Preview** | VAL iso-tile preview (`VAL-009`). Bosses use `boss_large` (`VAL-007`). |
| **Manage Assets** | Link to VAL library panel (`VAL-010`). Do not re-implement upload here. |

Beside the controls, show the **category-specific upload specification** from `RENDER_PROFILES` (`VAL-003`, `VAL-004`):

- Enemy standard: measured 24×24 (8×8 × 3).
- Boss large: measured ~34×50 (8×12 × 3 × 1.4) — **not** a stretched enemy.
- Formats, transparency, anchor, max safe footprint.

Invariants:

- Missing / inactive / invalid asset → builtin the next frame (`VAL-001`).
- Visual bind stored on the **instance** at spawn; never chosen in rAF (`VAL-005`).
- Visual size must not change occupancy, pathing, range, or hitboxes (`VAL-008`).
- Do not wire today’s unused `spriteUrl` / `PlayerSpriteConfig` as a shortcut (`VAL-012`).

Bosses may use larger **safe render profiles**. That is presentation only.

---

## 6. Lifecycle and owner operations

```
DRAFT → VALIDATE → PREVIEW → ACTIVATE
              ↘ deactivate
                 retired (soft)
rollback = prior revision → new draft → validate → activate
```

| Action | Rule |
| :--- | :--- |
| **Create** | New id, `lifecycle = draft`, visual NONE, kit empty or piece template, eligibility inherit-tier. |
| **Clone** | New id, copy definition, `draft`, clear portal assignments and rush room refs, visual binds copied as ids (still NONE if source was NONE). |
| **Compare** | Side-by-side field diff, two revisions or two ids. Highlight eligibility, kit, AI, visual mode, rewards. |
| **Validate** | Pure shared function (§7). Activate disabled on hard errors. |
| **Preview** | Simulated encounter card: resolved level at owner-typed player level, stats, variant roll (seeded), kit chips, AI profile, visual (builtin or custom), formation slot. **No live RAF.** |
| **Activate** | Validate + bump revision (keep last 20). Combat / spawn read `activeRevision` only. |
| **Deactivate** | Hidden from new spawn. In-flight instances finish. |
| **Rollback** | Never silent overwrite. |
| **Retire** | Soft. Dependents listed. Hard delete only drafts with zero revisions and zero rush/portal/kit refs. |

Enemy presets in localStorage are superseded by canister revisions. Do not add a third store.

---

## 7. Validation matrix (activate gate)

| Check | Fail if |
| :--- | :--- |
| Required fields | Missing id, name, family, role, `aiProfile`, `baseStats`, eligibility, visual mode |
| AI / spell compatibility | Kit empty and no melee id; `summoner` module without summon ids; profile `healer` with zero heal-effect ids; unknown tactical module |
| SpellConfig | Any kit / phase id missing, retired, or `usableByEnemy = false` (SDA) |
| Spawn rules | All weights 0; `maxOffset` used as an absolute world cap; tags reference unknown environments |
| Rewards | Negative formulas; credits not routed to `applyRewards` |
| Visual fallback | `asset`/`pool` mode with empty/invalid id and no documented NONE fallback |
| Render profile | Boss bound to `enemy_standard` without owner ack; asset fails VAL category check |
| References | Portal / rush / summon / mastery ids dangling |
| Encounter compatibility | Formation requires N units but definition cannot spawn N; rush room boss inactive; `weeping_pawn_2`-class unknown id |

Preview is **not** a substitute for validate. Preview uses the same resolver the spawn path will call.

---

## 8. Owner UI (dev-gated)

One Admin cluster, same Ankama/Dofus carved-stone language. Do not restyle.

| Surface | Job |
| :--- | :--- |
| **Enemies · Library** | Filter lifecycle, family, role, variant, tag. Cards: name, role, eligibility summary (relative), visual mode chip. |
| **Enemies · Editor** | Sections: Identity, Gameplay (base + formulas), Relative level, Rewards, AI, Spell pools + discovery chips, Variants, Spawning, Visual, Validation. |
| **Bosses · Library** | All definitions, not a hardcoded 19. Create / clone. |
| **Bosses · Editor** | Identity, scaling (offset + 1.08^diff), phases, spells + discovery, summons, arena mechanic ids, mastery, rewards, visual (`boss_large` spec), validation. |
| **Boss Rush** | Room table bound to live boss ids, enabled, formula rewards, mechanic ids. |
| **Compare** | Two ids or two revisions. |
| **Preview** | Player level input (unbounded), seed, encounter tags. |
| **Versions** | Activate / deactivate / rollback. |

Footer validation strip: green / amber / crimson. Primary button on a draft is **Validate**, then **Preview**, then **Activate**. Immediate “Save Enemy” that writes the live spawn map is retired.

Keep `data-ocid` prefixes (`admin.enemy.*`, `admin.bosses.*`).

---

## 9. Persistence sketch (implementers; not this PR)

| Store | Key | Value |
| :--- | :--- | :--- |
| `enemyDefinitions` | enemy id | definition + lifecycle + `activeRevision` |
| `enemyRevisions` | `id#rev` | snapshot |
| `bossDefinitions` | boss id | definition + lifecycle + `activeRevision` |
| `bossRevisions` | `id#rev` | snapshot |
| `bossRushRooms` | room index | room document |
| `bossPortalAssignments` | portal id | boss id (already exists; **use it**) |
| `enemyKits` | enemy id | SDA `EnemyKit` |
| visual stores | asset / pool id | VAL |

`getEnemyConfigs` / `getAllBossConfigs` stay readable. Gameplay hydrates **active** revisions only. Admin queries can return drafts.

Migration:

1. Do not treat the empty `enemyConfigs` map as “no enemies” — empty active set = today’s procedural fallback.
2. Import 19 frontend `DEFAULT_BOSS_CONFIGS` as active revisions; do not let the 12 stale Motoko seeds overwrite them.
3. Retarget boss `spellPoolIds` (SDA-009) before activate-on-migrate.
4. Leave `pbv_boss_configs` as a one-time import cache, then stop reading it.
5. Canonical actor remains `src/backend/main.mo`. Do not deploy `backend_extended/`.
6. Live actor may lag source — ship frontend + canister together (CharacterStats 12-vs-15 lesson).

---

## 10. Engine extraction (sensitive code)

| New helper | Owns |
| :--- | :--- |
| `engine/enemyDefinition.ts` | Resolve stats, eligibility, variant, rewards |
| `engine/enemyKitResolve.ts` | Wrap / replace `buildEnemyKit` (numeric zone; then SDA kit) |
| `engine/spawnFormations.ts` | Placement given a tile list (does **not** edit `mapGen.ts`) |
| `engine/bossDefinition.ts` | Level offset, `getBossEffectiveStats`, phase preview |
| `engine/encounterPreview.ts` | Admin preview (no RAF) |
| `engine/contentValidate.ts` | Shared activate gate |

WorldExploration: replace the body of `generateEnemies` / boss portal enemy build / rush spawn with helper calls. Reject implementer PRs whose primary hunk is another WX branch.

---

## 11. Out of scope for this design

- Implementing Motoko/TS in this PR
- Changing damage formulas, XP curve algebra, or persist-lock ordering
- Player-facing bestiary UX beyond “read the same active definitions” (EBA-024)
- Re-specifying SpellDefinition, ownership, or the visual byte pipeline
- Walk-cycle animation (`VAL-018`)

---

## 12. ACTION_ID index

All items `STATUS: NEW`. Full records: [`ACTION_IDS_ENEMY_BOSS_ADMIN_2026-08-31.md`](./ACTION_IDS_ENEMY_BOSS_ADMIN_2026-08-31.md).

| ID | Title | Priority |
| :--- | :--- | :--- |
| EBA-2026-08-31-001 | Unify EnemyDefinition and drive spawn from active canister docs | P0 |
| EBA-2026-08-31-002 | Replace levelMin/levelMax with relative-level eligibility (no cap) | P0 |
| EBA-2026-08-31-003 | Remove the hidden 999 tier cap in pickEnemyLevelFromTiers | P0 |
| EBA-2026-08-31-004 | Make boss configs backend-authoritative | P0 |
| EBA-2026-08-31-005 | Draft → validate → preview → activate for enemies and bosses | P0 |
| EBA-2026-08-31-006 | Persist identity: name, family, role, lifecycle | P1 |
| EBA-2026-08-31-007 | Variant records: base / veteran / elite / champion / rare | P1 |
| EBA-2026-08-31-008 | Data-driven spawn weights, tags, formations, elite chance | P1 |
| EBA-2026-08-31-009 | Author AI profile, sophistication, and tactical modules | P1 |
| EBA-2026-08-31-010 | Formula stats and rewards; retire fixed Nat reward fields | P1 |
| EBA-2026-08-31-011 | Admin boss levelOffset + apply getBossEffectiveStats in combat | P0 |
| EBA-2026-08-31-012 | Enemy/boss editors consume SDA kits and discovery chips | P1 |
| EBA-2026-08-31-013 | Pass a numeric kit zone (fix object → NaN) | P0 |
| EBA-2026-08-31-014 | Create/clone bosses without editing BOSS_IDS; ability registry | P1 |
| EBA-2026-08-31-015 | Boss Rush rooms as live documents | P1 |
| EBA-2026-08-31-016 | Boss mastery objectives with explicit reward ids | P2 |
| EBA-2026-08-31-017 | Visual mode NONE / asset / pool (default NONE) | P1 |
| EBA-2026-08-31-018 | Clone, compare, deactivate, rollback | P1 |
| EBA-2026-08-31-019 | Unbounded encounter preview + activate validation suite | P1 |
| EBA-2026-08-31-020 | Owner studio UI (dev-gated, carved-stone) | P1 |
| EBA-2026-08-31-021 | Soft-retire; block hard delete of published content | P0 |
| EBA-2026-08-31-022 | Extract helpers; do not grow WorldExploration | P0 |
| EBA-2026-08-31-023 | Honour boss portal assignments | P1 |
| EBA-2026-08-31-024 | Point EnemyRegister / Boss Guide at active definitions | P2 |
