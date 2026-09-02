import assert from "node:assert/strict";
import {
  achievementUnlockRejected,
  chatCooldownActive,
  clampDungeonDepth,
  clampPersistedHpWrite,
  gameConfigNeedsSeed,
  incomingSpellLevelsWouldMint,
  isBanReasonKey,
  isBuiltInSpellId,
  knownAchievementCondition,
  maxPersistedAp,
  maxPersistedHp,
  maxPersistedMp,
  persistApWriteCap,
  persistHpWriteCap,
  persistMpWriteCap,
  proofDataMimeAllowed,
  purchaseCreditRejected,
  rejectSecondPendingPurchase,
  resolveAppearanceSpellLevels,
  safeExternalHref,
  safeProofHref,
  shouldCountBossRushRun,
  shouldDeferAchievementUnlockUntilRewardsPersist,
  shouldIncludeBackendSpellInLibrary,
  shouldRejectInactiveAchievementUnlock,
  shouldRejectRetiredSpellUpgrade,
  shouldWipeAchievementsOnBan,
  thresholdAchievementConditionsFromPersist,
  unsafeUrl,
  validateAchievementConfig,
  validateAdBox,
  validateAssignRole,
  validateBossPortalAssignment,
  validateChangelog,
  validateDokaGrant,
  validateEnemyName,
  validateGameConfig,
  validateJsonBlob,
  validateLevelUpConfig,
  validateMapModifierChance,
  validateOptionalUrl,
  validateProofFileUrl,
  validateSpellConfig,
  validateTierSpawnConfig,
  validateWalkFrameUrls,
  wouldSelfDemote,
} from "./adminSafety.ts";

const validLevelUp = {
  statGrowthPercent: 5,
  apMpLevelThreshold: 25,
  spellLevelingBaseCost: 10,
  spellLevelingCostMultiplier: 2,
  spellDmgGrowthPercent: 3,
  maxSpellRange: 5,
  spellRangeGrowthLevels: 10,
  spellFailBaseChance: 20,
  spellFailReductionPerLevel: 0.1,
};

// Failure: statGrowthPercent=0 is the seed sentinel and would look uninitialized.
assert.equal(
  validateLevelUpConfig({ ...validLevelUp, statGrowthPercent: 0 }),
  "statGrowthPercent must be between 1 and 50",
);
// Failure: apMpLevelThreshold=0 is used as a divisor on clients.
assert.equal(
  validateLevelUpConfig({ ...validLevelUp, apMpLevelThreshold: 0 }),
  "apMpLevelThreshold must be between 1 and 100",
);
// Failure: base cost 0 makes every spell upgrade free.
assert.equal(
  validateLevelUpConfig({ ...validLevelUp, spellLevelingBaseCost: 0 }),
  "spellLevelingBaseCost must be between 1 and 1000000",
);
assert.equal(validateLevelUpConfig(validLevelUp), null);

// Failure: NaN / negative spawn weights invert or break tier rolls.
assert.ok(
  validateTierSpawnConfig({
    tierSize: 0,
    sameTierPercent: 60,
    adjacentTierPercent: 20,
    twoAwayPercent: 10,
    threeOrMorePercent: 5,
  }),
);
assert.ok(
  validateTierSpawnConfig({
    tierSize: 10,
    sameTierPercent: -1,
    adjacentTierPercent: 20,
    twoAwayPercent: 10,
    threeOrMorePercent: 5,
  }),
);
assert.equal(
  validateTierSpawnConfig({
    tierSize: 10,
    sameTierPercent: 60,
    adjacentTierPercent: 20,
    twoAwayPercent: 10,
    threeOrMorePercent: 5,
  }),
  null,
);

assert.ok(
  validateGameConfig({
    dokaSpawnChance: 40,
    leaderBoostPercent: 250,
    dokaSpawnBaseValue: 5,
  }),
);
assert.equal(
  validateGameConfig({
    dokaSpawnChance: 0,
    leaderBoostPercent: 10,
    dokaSpawnBaseValue: 5,
  }),
  null,
);
// Failure: dokaSpawnChance=0 is legal (no ground Doka) but was the actor
// init sentinel, so a valid admin singleton was rewritten to defaults.
assert.equal(gameConfigNeedsSeed({ dokaSpawnBaseValue: 5 }), false);
assert.equal(gameConfigNeedsSeed({ dokaSpawnBaseValue: 0 }), true);

// Failure: minRange > maxRange is a stale targeting payload.
assert.equal(
  validateSpellConfig({
    id: "void_bolt",
    name: "Void Bolt",
    apCost: 3,
    minRange: 5,
    maxRange: 2,
    spellType: "damage",
    effectType: "damage",
    effectCategory: "damage",
  }),
  "minRange cannot exceed maxRange",
);
assert.ok(
  validateSpellConfig({
    id: "void_bolt",
    name: "Void Bolt",
    apCost: 3,
    minRange: 1,
    maxRange: 3,
    spellType: "explode",
    effectType: "damage",
    effectCategory: "damage",
  }),
);

assert.equal(
  validateSpellConfig({
    id: "summon-dire-wolf",
    name: "Summon Dire Wolf",
    apCost: 3,
    minRange: 1,
    maxRange: 2,
    spellType: "summon",
    effectType: "summon",
    effectCategory: "damage",
    isSummon: true,
    summonAI: "not-an-archetype",
    summonLifespan: 4,
    summonUnitDef: { pieceType: "wolf", hpScale: 1, damageScale: 1 },
  }),
  "summonAI must be a known archetype",
);
assert.equal(
  validateSpellConfig({
    id: "summon-dire-wolf",
    name: "Summon Dire Wolf",
    apCost: 3,
    minRange: 1,
    maxRange: 2,
    spellType: "summon",
    effectType: "summon",
    effectCategory: "damage",
    isSummon: true,
    summonAI: "hunter",
    summonLifespan: 4,
    summonUnitDef: {
      pieceType: "wolf",
      hpScale: Number.POSITIVE_INFINITY,
      damageScale: 1,
    },
  }),
  "summonUnitDef.hpScale must be a finite number",
);
assert.equal(
  validateSpellConfig({
    id: "fake_summon",
    name: "Fake Summon",
    apCost: 3,
    minRange: 1,
    maxRange: 2,
    spellType: "summon",
    effectType: "damage",
    effectCategory: "damage",
    isSummon: false,
  }),
  "spellType summon requires isSummon",
);
assert.equal(
  validateSpellConfig({
    id: "summon-dire-wolf",
    name: "Summon Dire Wolf",
    apCost: 3,
    minRange: 1,
    maxRange: 2,
    spellType: "summon",
    effectType: "summon",
    effectCategory: "damage",
    isSummon: true,
    summonAI: "hunter",
    summonLifespan: 4,
    summonUnitDef: { pieceType: "wolf", hpScale: 1, damageScale: 1 },
  }),
  null,
);
// Failure: empty summonAI + isSummon used to pass the canister; spawnSummonUnit
// then does `spell.summonAI || "hunter"` and silently rewrites the unit.
assert.equal(
  validateSpellConfig({
    id: "summon-dire-wolf",
    name: "Summon Dire Wolf",
    apCost: 3,
    minRange: 1,
    maxRange: 2,
    spellType: "summon",
    effectType: "summon",
    effectCategory: "damage",
    isSummon: true,
    summonAI: "",
    summonLifespan: 4,
    summonUnitDef: { pieceType: "wolf", hpScale: 1, damageScale: 1 },
  }),
  "summonAI must be a known archetype",
);
assert.equal(
  validateSpellConfig({
    id: "summon-dire-wolf",
    name: "Summon Dire Wolf",
    apCost: 3,
    minRange: 1,
    maxRange: 2,
    spellType: "summon",
    effectType: "summon",
    effectCategory: "damage",
    isSummon: true,
    summonAI: "hunter",
    summonLifespan: 4,
    summonUnitDef: { pieceType: "", hpScale: 1, damageScale: 1 },
  }),
  "summonUnitDef.pieceType is not a recognized value",
);
assert.equal(
  validateSpellConfig({
    id: "shadow_strike",
    name: "Shadow Strike",
    apCost: 3,
    minRange: 1,
    maxRange: 4,
    spellType: "damage",
    effectType: "damage",
    effectCategory: "damage",
    isSummon: false,
    summonAI: "hunter",
  }),
  "summonAI must be empty when isSummon is false",
);
assert.ok(validateBossPortalAssignment("", "ashen_crown"));
assert.ok(validateBossPortalAssignment("x".repeat(65), "ashen_crown"));
assert.equal(validateBossPortalAssignment("portal_a", "ashen_crown"), null);

assert.equal(validateDokaGrant(0), "Grant amount must be greater than 0");
assert.ok(validateDokaGrant(10_000_001));
assert.equal(validateDokaGrant(100), null);
assert.equal(
  purchaseCreditRejected({
    recordOwner: "aaaaa-aa",
    creditedPrincipal: "bbbbb-bb",
    status: "pending",
  }),
  "purchaseId does not belong to the credited principal",
);
assert.equal(
  purchaseCreditRejected({
    recordOwner: "aaaaa-aa",
    creditedPrincipal: "aaaaa-aa",
    status: "completed",
  }),
  "purchase is not pending",
);
assert.equal(
  purchaseCreditRejected({
    recordOwner: "aaaaa-aa",
    creditedPrincipal: "aaaaa-aa",
    status: "pending",
  }),
  null,
);
assert.ok(validateMapModifierChance("", 20));
assert.ok(validateMapModifierChance("slime_flood", 101));
assert.equal(validateMapModifierChance("slime_flood", 20), null);

assert.equal(validateAssignRole("admn"), 'role must be "admin" or "user"');
// Failure: MixinAuthorization.assignCallerUserRole accepted #guest and
// self-demotion. adminAssigned stays true, so initialize() cannot repair
// a last-admin lockout.
assert.equal(validateAssignRole("guest"), 'role must be "admin" or "user"');
assert.equal(validateAssignRole("admin"), null);
assert.equal(wouldSelfDemote("aaaa", "aaaa", "user"), true);
assert.equal(wouldSelfDemote("aaaa", "aaaa", "guest"), true);
assert.equal(wouldSelfDemote("aaaa", "bbbb", "user"), false);

assert.equal(shouldWipeAchievementsOnBan(), false);

assert.equal(unsafeUrl("javascript:alert(1)"), true);
assert.equal(unsafeUrl("JavaScript:alert(1)"), true);
assert.equal(unsafeUrl(" javascript:alert(1)"), true);
assert.equal(unsafeUrl("  DATA:text/html,x"), true);
assert.equal(unsafeUrl("file:///etc/passwd"), true);
assert.equal(unsafeUrl("\u00A0javascript:alert(1)"), true);
assert.ok(validateOptionalUrl("linkUrl", "javascript:alert(1)"));
assert.ok(validateOptionalUrl("linkUrl", "JavaScript:alert(1)"));
assert.ok(validateOptionalUrl("linkUrl", "  DATA:text/html,x"));
assert.equal(validateOptionalUrl("linkUrl", "https://example.com"), null);
assert.equal(
  safeExternalHref("https://example.com/ad"),
  "https://example.com/ad",
);
assert.equal(safeExternalHref("https://example.com"), "https://example.com");
assert.equal(safeExternalHref("javascript:alert(1)"), "#");
assert.equal(safeExternalHref("  JavaScript:alert(1)"), "#");

assert.equal(validateProofFileUrl(""), "proofFileUrl is required");
assert.ok(validateProofFileUrl("https://evil.example/proof.jpg"));
assert.ok(validateProofFileUrl("data:text/html,<script>alert(1)</script>"));
assert.ok(validateProofFileUrl("javascript:alert(1)"));
assert.equal(validateProofFileUrl("data:image/png;base64,abc"), null);
assert.equal(validateProofFileUrl("data:application/pdf;base64,abc"), null);
assert.equal(proofDataMimeAllowed("data:image/jpeg;base64,xx"), true);
assert.equal(proofDataMimeAllowed("data:text/html,x"), false);
assert.equal(safeProofHref("data:text/html,<script>x</script>"), "#");
assert.equal(safeProofHref("javascript:alert(1)"), "#");
assert.equal(
  safeProofHref("data:image/png;base64,abc"),
  "data:image/png;base64,abc",
);
assert.equal(
  rejectSecondPendingPurchase(true),
  "A purchase is already pending",
);
assert.equal(rejectSecondPendingPurchase(false), null);
assert.equal(chatCooldownActive(0, 1_000_000_000, 2_000_000_000), true);
assert.equal(chatCooldownActive(0, 3_000_000_000, 2_000_000_000), false);
assert.ok(validateWalkFrameUrls(["javascript:alert(1)"]));
assert.equal(validateWalkFrameUrls(["https://cdn.example/f.png"]), null);
assert.ok(validateAdBox(0, "javascript:x", "https://ok.example"));
assert.ok(validateAdBox(0, "http://cdn.example/a.png", "https://ok.example"));
assert.ok(validateAdBox(0, "https://cdn.example/a.png", "http://ok.example"));
assert.equal(
  validateAdBox(0, "https://cdn.example/a.png", "https://ok.example"),
  null,
);

// Failure: banPlayer wrote reasons to public getChangelog("ban#<principal>").
assert.equal(isBanReasonKey("ban#aaaaa-aa"), true);
assert.equal(isBanReasonKey("v163"), false);
assert.ok(validateChangelog("ban#aaaaa-aa", "non-payment"));
assert.equal(validateChangelog("v164", "notes"), null);

assert.ok(validateEnemyName(""));
assert.ok(validateEnemyName("x".repeat(101)));
assert.equal(validateEnemyName("Malachar"), null);

// Failure: upgradeSpell appended a retired catalog id the player never owned.
assert.equal(
  shouldRejectRetiredSpellUpgrade({
    usableByPlayer: false,
    alreadyOwned: false,
  }),
  true,
);
assert.equal(
  shouldRejectRetiredSpellUpgrade({
    usableByPlayer: false,
    alreadyOwned: true,
  }),
  false,
);

// Failure: markAchievementUnlocked ignored active=false, so a retired
// achievement could still be unlocked and then claimed.
assert.equal(shouldRejectInactiveAchievementUnlock(false), true);
assert.equal(shouldRejectInactiveAchievementUnlock(true), false);

assert.equal(clampDungeonDepth(100), 16);
assert.equal(clampDungeonDepth(4), 4);

// Failure: saveBattleStats used level*200+100 (300 HP at level 1).
assert.equal(maxPersistedHp(1, 5), 100);
assert.equal(maxPersistedHp(10, 5), 145);
assert.equal(maxPersistedHp(20, 50), 1050);
assert.equal(persistHpWriteCap(300, 1, 5), 300);
assert.equal(persistHpWriteCap(80, 1, 5), 100);
assert.equal(clampPersistedHpWrite(300, 300, 1, 5), 300);
assert.equal(clampPersistedHpWrite(300, 50, 1, 5), 50);
assert.equal(clampPersistedHpWrite(80, 500, 1, 5), 100);
// First victory write of 150 at L10 (victory floor) still clips to 145.
assert.equal(clampPersistedHpWrite(100, 150, 10, 5), 145);

// Failure: saveBattleStats accepted maxAp/maxMp=20 at level 1.
assert.equal(maxPersistedAp(1, 25), 8);
assert.equal(maxPersistedAp(25, 25), 9);
assert.equal(persistApWriteCap(10, 1, 25), 10);
assert.equal(persistApWriteCap(6, 1, 25), 8);
assert.equal(Math.min(20, persistApWriteCap(10, 1, 25)), 10);
assert.equal(maxPersistedMp(1, 25), 4);
assert.equal(persistMpWriteCap(5, 1, 25), 5);
assert.equal(persistMpWriteCap(3, 1, 25), 4);

// Failure: markAchievementUnlocked trusted client for wallet/level/spell feats.
assert.equal(achievementUnlockRejected("level_10", 9, 0, 0), "Level below 10");
assert.equal(achievementUnlockRejected("level_10", 10, 0, 0), null);
assert.equal(
  achievementUnlockRejected("doka_1000", 1, 999, 0),
  "Doka balance below 1000",
);
assert.equal(achievementUnlockRejected("doka_1000", 1, 1000, 0), null);
assert.equal(
  achievementUnlockRejected("doka_10000", 1, 9999, 0),
  "Doka balance below 10000",
);
assert.equal(
  achievementUnlockRejected("spell_level_5", 20, 0, 4),
  "No spell at level 5",
);
assert.equal(achievementUnlockRejected("spell_level_5", 20, 0, 5), null);
assert.equal(achievementUnlockRejected("first_battle_win", 1, 0, 0), null);
assert.equal(
  achievementUnlockRejected("instant_win", 1, 0, 0),
  "condition is not a recognized value",
);
assert.equal(knownAchievementCondition("first_battle_win"), true);
assert.equal(knownAchievementCondition("instant_win"), false);
assert.equal(
  validateAchievementConfig({
    id: "first_blood",
    name: "First Blood",
    condition: "first_battle_win",
    dokaReward: 50,
    description: "Win your first battle.",
  }),
  null,
);
assert.equal(
  validateAchievementConfig({
    id: "free_doka",
    name: "Free Doka",
    condition: "instant_win",
    dokaReward: 1_000_000,
  }),
  "condition is not a recognized value",
);

// Failure: victory fired doka_1000 / level_10 from projected recap totals
// (900 + 150, level 9 + XP) before applyRewards. Canister still had the
// pre-credit snapshot, so markAchievementUnlocked #err'd and the shown-set
// blocked the overworld retry after the credit landed.
assert.equal(
  shouldDeferAchievementUnlockUntilRewardsPersist("doka_1000"),
  true,
);
assert.equal(
  shouldDeferAchievementUnlockUntilRewardsPersist("doka_10000"),
  true,
);
assert.equal(shouldDeferAchievementUnlockUntilRewardsPersist("level_10"), true);
assert.equal(
  shouldDeferAchievementUnlockUntilRewardsPersist("first_battle_win"),
  false,
);
assert.equal(
  shouldDeferAchievementUnlockUntilRewardsPersist("spell_level_5"),
  false,
);
assert.deepEqual(
  thresholdAchievementConditionsFromPersist({ level: 9, doka: 900 }),
  [],
);
assert.deepEqual(
  thresholdAchievementConditionsFromPersist({ level: 9, doka: 1050 }),
  ["doka_1000"],
);
assert.deepEqual(
  thresholdAchievementConditionsFromPersist({ level: 10, doka: 1050 }),
  ["level_10", "doka_1000"],
);
assert.deepEqual(
  thresholdAchievementConditionsFromPersist({ level: 10, doka: 10000 }),
  ["level_10", "doka_1000", "doka_10000"],
);
assert.equal(
  achievementUnlockRejected("doka_1000", 1, 900, 0),
  "Doka balance below 1000",
);
assert.equal(achievementUnlockRejected("doka_1000", 1, 1050, 0), null);
assert.equal(
  achievementUnlockRejected("level_10", 9, 1050, 0),
  "Level below 10",
);
assert.equal(achievementUnlockRejected("level_10", 10, 1050, 0), null);

// Failure: completeBossRushRoom(9) while currentRoom stayed 9 incremented runs.
assert.equal(shouldCountBossRushRun(9, 9), true);
assert.equal(shouldCountBossRushRun(0, 9), false);
assert.equal(shouldCountBossRushRun(9, 8), false);
assert.ok(validateJsonBlob("bossRushConfig", "not-json"));
assert.equal(
  validateJsonBlob("bossRushConfig", '{"rewardMultiplier":1}'),
  null,
);
assert.equal(validateJsonBlob("colorPalette", ""), null);

assert.equal(isBuiltInSpellId("void_collapse"), true);
assert.equal(isBuiltInSpellId("custom_bolt"), false);

const owned = new Set(["void_collapse"]);
assert.equal(
  shouldIncludeBackendSpellInLibrary({
    usableByPlayer: false,
    spellId: "void_collapse",
    ownedSpellIds: owned,
  }),
  true,
);
assert.equal(
  shouldIncludeBackendSpellInLibrary({
    usableByPlayer: false,
    spellId: "new_bolt",
    ownedSpellIds: owned,
  }),
  false,
);
assert.equal(
  shouldIncludeBackendSpellInLibrary({
    usableByPlayer: true,
    spellId: "new_bolt",
    ownedSpellIds: owned,
  }),
  true,
);

// Failure: updateCharacter union+max added incoming-only ids and raised
// paid levels, so a raw appearance edit minted ownership / skipped retirement.
assert.equal(
  incomingSpellLevelsWouldMint({
    storedKeys: ["shadow_strike"],
    incomingKeys: ["shadow_strike", "void_collapse"],
    storedLevel: 1,
    incomingLevel: 1,
  }),
  true,
);
assert.equal(
  incomingSpellLevelsWouldMint({
    storedKeys: ["shadow_strike"],
    incomingKeys: ["shadow_strike"],
    storedLevel: 1,
    incomingLevel: 99,
  }),
  true,
);
const kept = resolveAppearanceSpellLevels({
  storedKeys: ["shadow_strike"],
  storedValues: [2],
  incomingKeys: ["shadow_strike", "retired_bolt"],
  incomingValues: [99, 99],
});
assert.deepEqual(kept.keys, ["shadow_strike"]);
assert.deepEqual(kept.values, [2]);

assert.ok(
  validateSpellConfig({
    id: "wolf_call",
    name: "Wolf Call",
    apCost: 3,
    minRange: 1,
    maxRange: 2,
    spellType: "damage",
    effectType: "damage",
    effectCategory: "damage",
    summonAI: "godmode",
    hpScale: 1e9,
  }),
);
assert.ok(
  validateSpellConfig({
    id: "wolf_call",
    name: "Wolf Call",
    apCost: 3,
    minRange: 1,
    maxRange: 2,
    spellType: "damage",
    effectType: "damage",
    effectCategory: "damage",
    summonAI: "hunter",
    hpScale: Number.POSITIVE_INFINITY,
  }),
);
assert.equal(
  validateSpellConfig({
    id: "wolf_call",
    name: "Wolf Call",
    apCost: 3,
    minRange: 1,
    maxRange: 2,
    spellType: "damage",
    effectType: "damage",
    effectCategory: "damage",
    summonAI: "hunter",
    hpScale: 1,
    damageScale: 1,
  }),
  null,
);
