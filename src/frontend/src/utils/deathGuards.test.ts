import assert from "node:assert/strict";
import {
  armDeathGuards,
  deathGuardsAreArmed,
  isDeathRealmTransitionPending,
  shouldBlockPortalDuringPendingDeathRealm,
} from "./deathGuards.ts";

const spent = {
  deathTriggered: { current: true },
  deathPenaltyApplied: { current: true },
};
assert.equal(
  deathGuardsAreArmed(spent),
  false,
  "in-battle death used to leave both guards set",
);

armDeathGuards(spent);
assert.equal(spent.deathTriggered.current, false);
assert.equal(spent.deathPenaltyApplied.current, false);
assert.equal(
  deathGuardsAreArmed(spent),
  true,
  "Death Realm / Respawn must re-arm so the next 0 HP can run",
);

const armed = {
  deathTriggered: { current: false },
  deathPenaltyApplied: { current: false },
};
assert.equal(deathGuardsAreArmed(armed), true);
armDeathGuards(armed);
assert.equal(deathGuardsAreArmed(armed), true);

// persistDeathPenalty restores HP before the player can reach a portal.
// The guard must not depend on hp<=0 — only deathTriggered + pending timer.
assert.equal(
  shouldBlockPortalDuringPendingDeathRealm(true, true),
  true,
  "pending Death Realm + deathTriggered must block portals after HP restore",
);
assert.equal(
  shouldBlockPortalDuringPendingDeathRealm(true, false),
  false,
  "Death Realm already loaded (timer cleared) must allow the exit portal",
);
assert.equal(
  shouldBlockPortalDuringPendingDeathRealm(false, true),
  false,
  "a stray timer without deathTriggered must not lock exploration",
);
assert.equal(shouldBlockPortalDuringPendingDeathRealm(false, false), false);

assert.equal(
  isDeathRealmTransitionPending(true, true),
  true,
  "pending Death Realm must also block world encounters",
);
assert.equal(isDeathRealmTransitionPending(true, false), false);
assert.equal(isDeathRealmTransitionPending(false, true), false);

console.log("deathGuards.test: ok");
