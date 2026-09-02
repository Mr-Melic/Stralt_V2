import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_ENEMIES, MAX_HAZARD_TILES } from "../data/gameConstants.ts";
import {
  EXISTING_MAP_MODIFIER_IDS,
  MAX_ROLLED_FEATURES,
  REWARD_MULT,
  SPAWN_SAFE_RADIUS,
  THREAT_MULT,
  WORLD_FEATURES,
  canAddEnemies,
  canAddHazardTiles,
  extraEnemyRoll,
  extraHazardRoll,
  featureHasLevelCutoff,
  getWorldFeature,
  hpTaxFromMax,
  isFeatureAllowedInContext,
  isTileReservedForSpawnOrPortal,
  mustRevalidateSolvability,
  pickWeightedFeatures,
  relativeRewardMultiplier,
  relativeThreatMultiplier,
  scaleReward,
  scaleSameTierStat,
} from "./worldFeatures.ts";

const REQUIRED_CATEGORIES = [
  "hazard",
  "moving_hazard",
  "trap",
  "destructible_terrain",
  "temporary_obstacle",
  "heal_buff_zone",
  "teleport_tile",
  "unstable_portal",
  "rare_invasion",
  "elite_patrol",
  "treasure_encounter",
  "spell_bearing_enemy",
  "risk_reward",
  "map_modifier",
  "world_event",
  "environmental_combat",
] as const;

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

describe("world feature catalog contract", () => {
  it("covers every requested category with unique WF- ids", () => {
    const ids = WORLD_FEATURES.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) {
      assert.match(id, /^WF-[A-Z]+-[A-Z0-9_]+$/);
    }
    const cats = new Set(WORLD_FEATURES.map((f) => f.category));
    for (const cat of REQUIRED_CATEGORIES) {
      assert.equal(cats.has(cat), true, `missing category ${cat}`);
    }
  });

  it("every feature has a decision, visual, solvability, rules, and counterplay", () => {
    for (const f of WORLD_FEATURES) {
      assert.ok(f.name.length > 0, f.id);
      assert.ok(f.mechanic.length > 20, f.id);
      assert.ok(f.playerDecision.length > 10, f.id);
      assert.ok(f.visual.glyph.length > 0, f.id);
      assert.match(f.visual.tileTint, /^#[0-9a-fA-F]{6}$/, f.id);
      assert.ok(f.visual.tooltip.length > 0, f.id);
      assert.ok(f.solvability.length > 10, f.id);
      assert.ok(f.combatRules.length > 10, f.id);
      assert.ok(f.counterplay.length > 10, f.id);
      assert.ok(
        f.rewardPath === "applyRewards" ||
          f.rewardPath === "saveBattleStats" ||
          f.rewardPath === "none",
        f.id,
      );
    }
  });

  it("does not use player-level cutoffs", () => {
    for (const f of WORLD_FEATURES) {
      assert.equal(featureHasLevelCutoff(f), false, f.id);
      const blob = `${f.mechanic} ${f.combatRules} ${f.solvability}`;
      assert.equal(
        /min(?:imum)?\s*level|level\s*[≥>=]{1,2}\s*\d+|only above level/i.test(
          blob,
        ),
        false,
        f.id,
      );
    }
  });

  it("does not reuse live map-modifier ids", () => {
    const ids = new Set(WORLD_FEATURES.map((f) => f.id));
    for (const live of EXISTING_MAP_MODIFIER_IDS) {
      assert.equal(ids.has(live), false, live);
    }
  });

  it("blocking features require a bypass and solvability re-check", () => {
    const blockers = WORLD_FEATURES.filter((f) => f.blocksWalk);
    assert.ok(blockers.length >= 2);
    for (const f of blockers) {
      assert.equal(f.requiresBypass, true, f.id);
      assert.equal(mustRevalidateSolvability(f), true, f.id);
    }
  });

  it("spell extras declare the enemy-usable catalog, never names", () => {
    const casters = WORLD_FEATURES.filter((f) => f.spellSource);
    assert.ok(casters.length >= 1);
    for (const f of casters) {
      assert.equal(f.spellSource, "enemyUsableCatalog", f.id);
      assert.equal(/named spell|if name includes/i.test(f.combatRules), false);
    }
  });

  it("looks up features by id", () => {
    assert.equal(getWorldFeature("WF-HAZ-EMBER_VEIN")?.name, "Ember Vein");
    assert.equal(getWorldFeature("missing"), undefined);
  });
});

describe("rarity and relative difficulty", () => {
  it("keeps threat and reward ordered by difficulty, not level", () => {
    assert.ok(THREAT_MULT.soft < THREAT_MULT.medium);
    assert.ok(THREAT_MULT.medium < THREAT_MULT.hard);
    assert.ok(THREAT_MULT.hard < THREAT_MULT.extreme);
    assert.ok(REWARD_MULT.soft <= REWARD_MULT.medium);
    assert.ok(REWARD_MULT.medium < REWARD_MULT.hard);
    assert.ok(REWARD_MULT.hard < REWARD_MULT.extreme);
    assert.equal(relativeThreatMultiplier("hard"), 1.35);
    assert.equal(relativeRewardMultiplier("extreme"), 2.5);
  });

  it("scales same-tier stats and rewards without a level argument", () => {
    assert.equal(scaleSameTierStat(100, "soft"), 60);
    assert.equal(scaleSameTierStat(100, "extreme"), 175);
    assert.equal(scaleReward(20, "medium"), 25);
    assert.equal(scaleReward(20, "extreme"), 50);
  });

  it("keeps % max-HP taxes relevant at high HP", () => {
    assert.equal(hpTaxFromMax(100, 0.04), 4);
    assert.equal(hpTaxFromMax(1000, 0.04), 40);
    assert.equal(hpTaxFromMax(10, 0.04), 1);
    assert.equal(hpTaxFromMax(100, -0.08), -8);
    assert.equal(hpTaxFromMax(0, 0.04), 0);
  });
});

describe("run-mode and placement guards", () => {
  it("suppresses every feature in Death Realm", () => {
    for (const f of WORLD_FEATURES) {
      assert.equal(
        isFeatureAllowedInContext(f, { runMode: "deathRealm" }),
        false,
        f.id,
      );
    }
    assert.deepEqual(
      pickWeightedFeatures(() => 0, { runMode: "deathRealm" }),
      [],
    );
  });

  it("keeps flicker gates and gambit chests out of runs", () => {
    const flicker = getWorldFeature("WF-PRT-FLICKER_GATE");
    const gambit = getWorldFeature("WF-RSK-GAMBIT_CHEST");
    assert.ok(flicker && gambit);
    assert.equal(
      isFeatureAllowedInContext(flicker, { runMode: "dungeon" }),
      false,
    );
    assert.equal(
      isFeatureAllowedInContext(flicker, { runMode: "bossRush" }),
      false,
    );
    assert.equal(isFeatureAllowedInContext(flicker, { runMode: "none" }), true);
    assert.equal(
      isFeatureAllowedInContext(gambit, { runMode: "dungeon" }),
      false,
    );
  });

  it("reserves spawn radius and portal cells", () => {
    const spawn = { x: 8, y: 8 };
    const portals = [{ x: 2, y: 2 }];
    assert.equal(
      isTileReservedForSpawnOrPortal({ x: 8, y: 8 }, spawn, portals),
      true,
    );
    assert.equal(
      isTileReservedForSpawnOrPortal(
        { x: spawn.x + SPAWN_SAFE_RADIUS, y: spawn.y },
        spawn,
        portals,
      ),
      true,
    );
    assert.equal(
      isTileReservedForSpawnOrPortal({ x: 2, y: 2 }, spawn, portals),
      true,
    );
    assert.equal(
      isTileReservedForSpawnOrPortal({ x: 0, y: 0 }, spawn, portals),
      false,
    );
  });

  it("honors MAX_HAZARD_TILES and MAX_ENEMIES", () => {
    assert.equal(canAddHazardTiles(48, 3), false);
    assert.equal(canAddHazardTiles(47, 3), true);
    assert.equal(canAddHazardTiles(MAX_HAZARD_TILES, 0), true);
    assert.equal(canAddEnemies(19, 2), false);
    assert.equal(canAddEnemies(15, 5), true);
    assert.equal(canAddEnemies(MAX_ENEMIES, 1), false);
  });

  it("rolls extra enemy/hazard counts inside the feature band", () => {
    const warband = getWorldFeature("WF-INV-WARBAND");
    assert.ok(warband);
    const n = extraEnemyRoll(warband, () => 0);
    assert.ok(n >= 3 && n <= 5);
    const ember = getWorldFeature("WF-HAZ-EMBER_VEIN");
    assert.ok(ember);
    const h = extraHazardRoll(ember, () => 0.99);
    assert.ok(h >= 3 && h <= 6);
  });
});

describe("pickWeightedFeatures", () => {
  it("never exceeds the readability cap and stays deterministic", () => {
    const a = pickWeightedFeatures(mulberry32(7), { runMode: "none" });
    const b = pickWeightedFeatures(mulberry32(7), { runMode: "none" });
    assert.deepEqual(
      a.map((f) => f.id),
      b.map((f) => f.id),
    );
    assert.ok(a.length <= MAX_ROLLED_FEATURES);
  });

  it("can still surface rare ids across many rarity-weighted rolls", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 400; seed++) {
      for (const f of pickWeightedFeatures(mulberry32(seed), {
        runMode: "none",
      })) {
        seen.add(f.id);
      }
    }
    assert.ok(seen.size >= 8, `only saw ${seen.size} ids`);
    assert.ok(
      [...seen].some((id) => {
        const f = getWorldFeature(id);
        return f?.rarity === "rare" || f?.rarity === "epic";
      }),
      "rarity weights never produced a rare/epic feature",
    );
  });

  it("does not emit run-illegal features inside a dungeon", () => {
    for (let seed = 1; seed <= 80; seed++) {
      const picked = pickWeightedFeatures(mulberry32(seed), {
        runMode: "dungeon",
      });
      for (const f of picked) {
        assert.equal(
          isFeatureAllowedInContext(f, { runMode: "dungeon" }),
          true,
          f.id,
        );
      }
    }
  });
});
