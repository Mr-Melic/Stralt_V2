# ACTION_ID catalog — 2026-09-02 UX audit

Stable IDs for the daily player-journey auditor. STATUS values: NEW | OPEN | IMPLEMENTED_THIS_RUN | SUPERSEDED.

## Implemented this run (display-only)

```
ACTION_ID: UX-SPELL-OVERWORLD-MUTED
TITLE: Mute spell bar outside combat
CATEGORY: spells
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/components/BattleUIPanel.tsx
CURRENT_BEHAVIOUR: Spell slots and Attack Nearest stay fully enabled on the overworld.
DESIRED_BEHAVIOUR: Disabled until inBattle; hover copy explains waiting for a fight.
EVIDENCE: handleCastSpell returns early when !inBattle; slots had no disabled styling.
RECOMMENDED_ACTION: Disable buttons and add “usable once a fight starts” hover.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Overworld hover; battle still clickable.
STATUS: IMPLEMENTED_THIS_RUN
```

```
ACTION_ID: UX-CHALLENGE-FAIL-COPY
TITLE: Challenge fail copy explains which rule broke
CATEGORY: invalid-action
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/utils/challengeCompletion.ts; src/frontend/src/components/ChallengePanel.tsx
CURRENT_BEHAVIOUR: Fail line is “Failed: {rule}” without the broken condition.
DESIRED_BEHAVIOUR: One sentence per rule (Untouchable, Pacifist, Striker, etc.).
EVIDENCE: ChallengePanel.tsx ~203–206.
RECOMMENDED_ACTION: challengeFailCopy() lookup.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: challengeCompletion.test.ts
STATUS: IMPLEMENTED_THIS_RUN
```

```
ACTION_ID: UX-CHANGELOG-ACCURACY
TITLE: What’s New matches leftover XP, GameKey, two shops
CATEGORY: launch
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/App.tsx CHANGELOG_ITEMS
CURRENT_BEHAVIOUR: Changelog still described a dummy XP bar, leftover-XP curve, Blood spend.
DESIRED_BEHAVIOUR: Copy matches 2026-09-01 product (GameKey, leftover XP, Death Realm).
EVIDENCE: App.tsx CHANGELOG_ITEMS vs GameFlow/HUD.
RECOMMENDED_ACTION: Rewrite bullets. Did not bump APP_VERSION.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: What’s New overlay copy.
STATUS: IMPLEMENTED_THIS_RUN
```

```
ACTION_ID: UX-PROFILE-NAME-HINT
TITLE: Character name length on the form
CATEGORY: character-creation
PRIORITY: P2
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/components/ProfileSetup.tsx
CURRENT_BEHAVIOUR: maxLength 32; copy 2–24.
DESIRED_BEHAVIOUR: maxLength 50 + copy 2–50 (backend UserProfile.name).
EVIDENCE: ProfileSetup.tsx vs main.mo name <= 50.
RECOMMENDED_ACTION: Align maxLength and helper.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Type 50 chars; 51 blocked.
STATUS: IMPLEMENTED_THIS_RUN
```

## Open (not implemented — stack-compat with GameKey PRs)

Do not edit `DokaGameKeyShop.tsx` / `dokaGameKey.ts` / `iapShopCopy.test.ts` in this PR. Oldest-first queue already has #261, #279, #284, #286, #290 on those files.

```
ACTION_ID: UX-GAMEKEY-PASTE-WHITESPACE
TITLE: Trim GameKey on paste and validate
CATEGORY: shop
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: src/frontend/src/utils/dokaGameKey.ts; DokaGameKeyShop.tsx; iapShopCopy.test.ts
CURRENT_BEHAVIOUR: Trailing newline / spaces fail or look like a 16-char key.
DESIRED_BEHAVIOUR: Trim then validate 16 alphanumeric.
EVIDENCE: parseGameKeyFromIapPayload vs paste.
RECOMMENDED_ACTION: HUMAN — union with #261/#279/#290.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: MEDIUM
VALIDATION_REQUIRED: Paste with newline.
STATUS: OPEN
```

```
ACTION_ID: UX-GAMEKEY-STEP-ORDER
TITLE: Numbered How-to matches redeem-first
CATEGORY: shop
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: iapShopCopy.ts IAP_SHOP_STEPS; DokaGameKeyShop.tsx
CURRENT_BEHAVIOUR: IAP_SHOP_STEPS constants exist this run; shop UI still uses older IAP_SHOP_HOW_TO / IAP_SHOP_REDEEM_HINT.
DESIRED_BEHAVIOUR: Numbered steps in the GameKey panel.
EVIDENCE: DokaGameKeyShop.tsx How to use.
RECOMMENDED_ACTION: HUMAN — wire IAP_SHOP_STEPS in DokaGameKeyShop after GameKey PRs land.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: How-to list.
STATUS: OPEN
```

```
ACTION_ID: UX-GAMEKEY-STATUS-STALE
TITLE: GameKey status after redeem
CATEGORY: shop
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: dokaGameKey.ts; DokaGameKeyShop.tsx
CURRENT_BEHAVIOUR: getGameKeyStatus() can stay pending after a successful redeem.
DESIRED_BEHAVIOUR: Parse payload then #ok; DokaGameKeyShop refresh after processPendingPurchases.
EVIDENCE: getGameKeyStatus vs payload #ok.
RECOMMENDED_ACTION: HUMAN — already in older PRs #279/#284; do not duplicate.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: MEDIUM
VALIDATION_REQUIRED: Redeem then status.
STATUS: OPEN
```

## Highest remaining (report / human)

```
ACTION_ID: UX-DEATH-DUAL-MODAL
TITLE: Two overlapping death UIs
CATEGORY: death
PRIORITY: P0
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: WorldExploration.tsx; GameOverModal.tsx; PostBattleRecap; persistDeathPenalty
CURRENT_BEHAVIOUR: Combat death: Game Over modal (“Enter the Death Realm”). Lava/spikes: root recap then 1.5s auto Death Realm.
DESIRED_BEHAVIOUR: One carved death path: −20% leftover XP / −40% Doka, then Death Realm, walk to a portal.
EVIDENCE: _handlePlayerDeath setShowGameOver(true); HP-watch onShowBattleSummary + setTimeout 1500ms.
RECOMMENDED_ACTION: Human-approved unify. Do not rewire deathGuards in an unattended run.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: HIGH
VALIDATION_REQUIRED: Combat death; lava death; portal exit; penalty amounts.
STATUS: OPEN
```

```
ACTION_ID: UX-ONBOARD-FIRST-MAP
TITLE: First realm visit has no teaching beat
CATEGORY: action-discoverability
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: WorldExploration.tsx; LandingPage.tsx; CharacterCreation.tsx
CURRENT_BEHAVIOUR: After Play: isometric map, unlabeled whirlpools, no “click a tile to walk,” no “step onto an enemy to fight.”
DESIRED_BEHAVIOUR: One dismissible carved-stone coach on first world enter. Never a SaaS tooltip tour.
EVIDENCE: No firstVisit/tutorial strings in WorldExploration.
RECOMMENDED_ACTION: Human-written 3-line coach, once per slot (localStorage cache only).
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: MEDIUM
VALIDATION_REQUIRED: First Play shows coach; second does not; never blocks portals or combat.
STATUS: OPEN
```

```
ACTION_ID: UX-PORTAL-LEGEND
TITLE: Only dungeon portals explain themselves
CATEGORY: portal-clarity
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: WorldExploration.tsx portal draw (~7968)
CURRENT_BEHAVIOUR: Nearby dungeon / chain draw “Enter Dungeon Chain” / “Continue Chain (d/max)”. Rest, boss, colored, white sanctuary, Death Realm exits have no label.
DESIRED_BEHAVIOUR: Within 3 tiles, short carved labels: Explore / Rest / Boss / Dungeon / Sanctuary / Death Realm exit.
EVIDENCE: Label gated on p.color === "dungeon" || dungeonChainActive.
RECOMMENDED_ACTION: Extend nearby-label path. Do not change spawn rules.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: MEDIUM
VALIDATION_REQUIRED: Each kind shows a distinct label; dungeon copy still shows depth.
STATUS: OPEN
```

```
ACTION_ID: UX-CAST-FAIL-FEEDBACK
TITLE: Illegal casts still mostly write the battle log
CATEGORY: invalid-action-explanation
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: WorldExploration.tsx; BattleUIPanel.tsx; ChatPanel.tsx
CURRENT_BEHAVIOUR: Button titles cover some “Not enough AP” cases. Tile clicks still logBattleEntry. Players who never open chat get no reason.
DESIRED_BEHAVIOUR: A 1.5s stone whisper or toast: Not enough AP, out of range, not your turn, summon is acting.
EVIDENCE: logBattleEntry reject sites in WorldExploration cast paths.
RECOMMENDED_ACTION: Shared explainRejectedCast(reason) for click and touch. Do not change targeting math.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: MEDIUM
VALIDATION_REQUIRED: AP-starved, out-of-range, and enemy-turn clicks each show a reason once.
STATUS: OPEN
```

```
ACTION_ID: UX-SHOP-TWO-STORES
TITLE: Items and Buy Doka still feel like one shop
CATEGORY: action-discoverability
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: GameFlow.tsx Items; WorldExploration.tsx cart (~17795)
CURRENT_BEHAVIOUR: Items opens BuffShop (Doka potions). Cart next to the Doka chip is icon-only (title/aria “Buy Doka”) and opens GameKey IAP.
DESIRED_BEHAVIOUR: Visible “Items” vs “Buy Doka” labels. Never both read as Shop.
EVIDENCE: ShoppingCart-only button; GameFlow Items cluster.
RECOMMENDED_ACTION: Human layout/copy. Do not change purchase APIs.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: LOW for copy
VALIDATION_REQUIRED: Items still buys buffs; cart still opens GameKey.
STATUS: OPEN
```

```
ACTION_ID: UX-ENEMY-REGISTER-LORE
TITLE: Enemies button opens lore the combat engine does not run
CATEGORY: enemy-information
PRIORITY: P1
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: EnemyRegister.tsx; WorldExploration Enemies button
CURRENT_BEHAVIOUR: Hard-coded Wraith Bishop / Iron Golem / Plague Rat lore. Live fights use admin spawn templates.
DESIRED_BEHAVIOUR: Register either matches live EnemyConfig or is labeled as flavor, not a bestiary of the current build.
EVIDENCE: EnemyRegister MONSTERS array vs engine spawn.
RECOMMENDED_ACTION: Honesty label or bind to live configs. Do not treat the register as truth.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: MEDIUM
VALIDATION_REQUIRED: Enemies panel never contradicts an inspect chip.
STATUS: OPEN
```

```
ACTION_ID: UX-HUD-TOOL-CLUSTER
TITLE: Realm tools float over the map instead of living in one bar
CATEGORY: hud-crowding
PRIORITY: P2
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: GameFlow.tsx z-9001; WorldExploration header z-100
CURRENT_BEHAVIOUR: Live HUD is name, level, Map #, leftover XP, Doka, cart, region. GameFlow pins Items / Board / Feats / Bosses under a 44px spacer. Collision on mid-width tablets.
DESIRED_BEHAVIOUR: One carved-stone header. Overflow (⋯) or a second row that does not cover XP/Doka.
EVIDENCE: GameFlow tool cluster; WorldExploration 44px header.
RECOMMENDED_ACTION: Human layout. Do not restore the dummy 0/100 overlay bar.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: MEDIUM
VALIDATION_REQUIRED: Tools still open; leftover XP visible at 768 and 1280.
STATUS: OPEN
```

```
ACTION_ID: UX-CREATE-NO-STATS
TITLE: Champion forge never shows starting combat stats
CATEGORY: action-discoverability
PRIORITY: P2
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: CharacterCreation.tsx
CURRENT_BEHAVIOUR: Piece Details lists Type / Pixel Art / 4 Views. Starting 100 HP, 10 AP, 5 MP apply only on save.
DESIRED_BEHAVIOUR: Compact stone row of starting HP/AP/MP/INIT.
EVIDENCE: generateDefaultStats; Piece Details block.
RECOMMENDED_ACTION: Display-only row. Do not let the player edit persisted stats here.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Create still writes 12-field CharacterStats including killCount.
STATUS: OPEN
```

```
ACTION_ID: UX-VERSION-FORCE-RELOGIN
TITLE: App version bump wipes local cache and forces re-login
CATEGORY: feedback
PRIORITY: P2
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: App.tsx APP_VERSION / versionGate
CURRENT_BEHAVIOUR: Mismatch clears localStorage (preserve list), reloads, changelog after II. This run refreshed CHANGELOG_ITEMS without bumping v163.
DESIRED_BEHAVIOUR: Show changelog on landing, then ask to sign in. Do not imply a wipe of canister progress.
EVIDENCE: App.tsx APP_VERSION path.
RECOMMENDED_ACTION: Human: stop forcing II re-auth or add landing copy. Do not bump APP_VERSION from a copy pass.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: HIGH if bump ships unattended
VALIDATION_REQUIRED: Staging bump; canister characters still load.
STATUS: OPEN
```

```
ACTION_ID: UX-SMALL-SCREEN-HARD-BLOCK
TITLE: Narrow viewports still have no stacked HUD
CATEGORY: responsive-behaviour
PRIORITY: P2
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: App.tsx SmallScreenGuard; DESIGN.md
CURRENT_BEHAVIOUR: Guard offers Continue anyway. DESIGN.md wants ≥44px targets and a sticky bottom menu. 390px still overlaps the desktop HUD.
DESIRED_BEHAVIOUR: Product call: tablet floor, or stacked HUD for 768 landscape first.
EVIDENCE: SmallScreenGuard; no mobile HUD reflow in WorldExploration.
RECOMMENDED_ACTION: Report-only until a human picks a mobile scope.
AUTONOMY:
- REPORT_ONLY
REGRESSION_RISK: HIGH if the guard is removed without a HUD reflow.
VALIDATION_REQUIRED: 768 and 390-wide viewports after any policy change.
STATUS: OPEN
```

```
ACTION_ID: UX-BOSS-RUSH-PINK
TITLE: Boss Rush room chip uses arcade pink
CATEGORY: visual-hierarchy
PRIORITY: P2
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: WorldExploration.tsx ~17595
CURRENT_BEHAVIOUR: “Boss Rush — Room n / 10” is #FF69B4 on magenta. Dungeon chain uses carved crimson.
DESIRED_BEHAVIOUR: Same stone + gold/crimson family as the dungeon depth pill. Keep room n/10.
EVIDENCE: bossRushState.active overlay border #FF69B4.
RECOMMENDED_ACTION: Restyle only. Do not change room indexing or completeBossRushRoom.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Room counter still matches currentRoom + 1 / 10.
STATUS: OPEN
```

```
ACTION_ID: UX-IDENTITY-FONT-DRIFT
TITLE: Live type and color tokens still drift from DESIGN.md
CATEGORY: visual-hierarchy
PRIORITY: P3
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: DESIGN.md; index.css; LandingPage.tsx
CURRENT_BEHAVIOUR: Brief specifies Space Grotesk / Inter / OKLCH-only. CSS uses Baloo 2 / Saira; launch title measures Arial.
DESIRED_BEHAVIOUR: New chrome uses DESIGN.md tokens. Do not run a repo-wide hex rewrite. Never generic SaaS UI.
EVIDENCE: DESIGN.md Typography; index.css --font-display; LandingPage Arial.
RECOMMENDED_ACTION: Next new screen only. Forbid shadcn gray/purple on player-facing dialogs.
AUTONOMY:
- REPORT_ONLY
REGRESSION_RISK: HIGH for a global color sweep.
VALIDATION_REQUIRED: Side-by-side with DESIGN.md; gold-on-navy ≥ 4.5:1.
STATUS: OPEN
```

```
ACTION_ID: UX-FEATS-VS-ACHIEVEMENTS
TITLE: Feats button vs Achievements chrome
CATEGORY: action-discoverability
PRIORITY: P3
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: GameFlow.tsx; AchievementsPanel.tsx; PostBattleRecap.tsx
CURRENT_BEHAVIOUR: Tool cluster label is “Feats”; title is “Achievements”; recap says “Achievements Unlocked.”
DESIRED_BEHAVIOUR: One player-facing word. Prefer Feats in chrome if that is the fantasy name.
EVIDENCE: GameFlow span Feats + title Achievements; RecapSection title Achievements Unlocked.
RECOMMENDED_ACTION: Copy pass. Do not change claimAchievementReward.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Panel still claims rewards; recap still lists unlocks.
STATUS: OPEN
```

```
ACTION_ID: UX-LANDING-VERSION
TITLE: Landing footer still prints v1.0 while APP_VERSION is v163
CATEGORY: launch
PRIORITY: P3
CONFIDENCE: HIGH
FILES_OR_SYSTEMS: LandingPage.tsx ~752; App.tsx APP_VERSION
CURRENT_BEHAVIOUR: Barely-visible v1.0 is the admin triple-click easter egg. Players who notice it think the build is 1.0.
DESIRED_BEHAVIOUR: Keep the hidden admin trigger; do not print a fake product version. Optional: show APP_VERSION elsewhere after login.
EVIDENCE: aria-label v1.0 vs const APP_VERSION = "v163".
RECOMMENDED_ACTION: Human: keep easter egg, change visible string or leave as camouflage.
AUTONOMY:
- REPORT_ONLY
REGRESSION_RISK: MEDIUM if the triple-click target is removed.
VALIDATION_REQUIRED: Triple-click still opens admin prompt.
STATUS: OPEN
```

## Closed / do not reopen this run

- `UX-HUD-DUPLICATE-TOPBAR` — keep GameFlow spacer; do not restore dummy XP bar.
- `UX-RECAP-XP-CURVE` — leftover XP is correct; do not recolor Dofus purple fill to gold.
- `UX-BLOOD-DEAD-BAR` — inert Blood chip stays gone.
- `UX-IAP-KYC-SURPRISE` — GameKey email + consent replaced proof-of-address (product of #258).
- `UX-VITALS-ORB-MAX` — side-panel jewels use vitalsOrbCaps.
