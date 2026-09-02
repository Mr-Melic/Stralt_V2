import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectPreservedLocalStorage,
  shouldPreserveVersionGateKey,
} from "./versionGate.ts";

describe("versionGate", () => {
  it("keeps paid buff inventory and admin spawn caches across a version wipe", () => {
    assert.equal(shouldPreserveVersionGateKey("pbv_tier_spawn_config"), true);
    assert.equal(shouldPreserveVersionGateKey("pbv_levelup_config"), true);
    assert.equal(shouldPreserveVersionGateKey("aaaaa-aa_inventory"), true);
    assert.equal(shouldPreserveVersionGateKey("pbv_app_version"), false);
    assert.equal(shouldPreserveVersionGateKey("pbv_show_changelog"), false);

    const store: Record<string, string> = {
      pbv_tier_spawn_config: "{}",
      "aaaaa-aa_inventory": '{"health_potion":2}',
      pbv_app_version: "v162",
      other: "drop",
    };
    assert.deepEqual(
      collectPreservedLocalStorage(
        Object.keys(store),
        (key) => store[key] ?? null,
      ),
      {
        pbv_tier_spawn_config: "{}",
        "aaaaa-aa_inventory": '{"health_potion":2}',
      },
    );
  });
});
