# ACTION_IDs — 2026-09-02 Performance Auditor

React/subscriptions (earlier on this branch): PERF-2026-09-02-050, 051, 052, 053, 056 implemented; 054, 055, 057 reported.
Canvas/RAF (this increment): PERF-2026-09-02-049, 058, 059 implemented; 037–048, 041, 060 reported.
Already ledgered (do not re-file): PERF-2026-08-31-001..010, PERF-2026-09-01-011..036.

---

ACTION_ID: PERF-2026-09-02-050
TITLE: Stop playerAchievements staleTime:0 focus refetch from re-rendering WorldExploration
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/hooks/useAdminQueries.ts (useGetPlayerAchievements); src/frontend/src/components/WorldExploration.tsx (~L2132)
CURRENT_BEHAVIOUR: `useGetPlayerAchievements` used `staleTime: 0` and default `refetchOnWindowFocus`. WorldExploration subscribes to it, so every tab focus hit the canister, logged `[FEATS] LIST` with a mapped claimed[] array, and re-rendered the ~19k-line world tree.
DESIRED_BEHAVIOUR: Reasonable staleTime; no focus refetch while mutations already invalidate the key; DEV-only list logging.
EVIDENCE: useAdminQueries.ts queryKey `["playerAchievements"]` had staleTime 0 + unconditional console.log; WorldExploration.tsx calls useGetPlayerAchievements(). Distinct from PERF-009 (callerDokaBalance).
RECOMMENDED_ACTION: Keep staleTime 30s + refetchOnWindowFocus false + DEV-gated log. Do not weaken unlock/claim invalidate paths.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Achievements unlocked in another tab may lag until invalidate/refetch. Mutations still invalidate.
VALIDATION_REQUIRED: Typecheck; unlock/claim a feat in-session; list updates; alt-tab during exploration does not hitch the canvas.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-02-051
TITLE: Memoize enriched battle turnOrder passed into BattleUIPanel
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (BattleUIPanel turnOrder prop)
CURRENT_BEHAVIOUR: Every WorldExploration render (including the 1 Hz turn timer from PERF-007) allocated `turnOrder.map(...)` with per-combatant spreads and `enemies.find`, forcing BattleUIPanel to rebuild unitStats/effects from new object identities.
DESIRED_BEHAVIOUR: useMemo keyed on turnOrder, AP/MP, character combat stats, enemies, and enraged set.
EVIDENCE: Inline `turnOrder={turnOrder.map(...)}` at the BattleUIPanel mount. Complements PERF-007 (timer island) and PERF-026 (panel-local unitStats memo) without changing combat math.
RECOMMENDED_ACTION: Keep `battleTurnOrderForUi` useMemo. Do not fold combat resolution into the memo.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Stale AP/MP or enraged flag on the strip if a dep is omitted.
VALIDATION_REQUIRED: Enter battle; spend AP/MP; enrage an enemy; strip HP/AP labels match canvas.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-02-052
TITLE: Memo MapModifiersPanel / SettingsPanel and stabilize modifier list prop
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/MapModifiersPanel.tsx; src/frontend/src/components/SettingsPanel.tsx; src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: Both panels mount for the whole world session. Parent passed `mapModifiers.filter(...)` (new array every render). Timer/HP/doka setStates reconciled Settings (userId-only) and MapModifiers every time.
DESIRED_BEHAVIOUR: `visibleMapModifiers` useMemo + `React.memo` on both panels. Incremental step toward PERF-027 island split.
EVIDENCE: Always-mounted `<MapModifiersPanel>` / `<SettingsPanel userId={userId} />`; neither was memoized.
RECOMMENDED_ACTION: Keep memo wrappers. Pair with stable callbacks before memoizing BattleUIPanel itself (inline onSetWalk still changes each render).
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Active-modifier list must still update when modifier types change.
VALIDATION_REQUIRED: Typecheck; open Settings volume; trigger a map modifier; panels still drag/fold.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-02-053
TITLE: Pause BloodParticles canvas work while the document is hidden
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/BloodParticles.tsx; src/frontend/src/components/CharacterSelection.tsx
CURRENT_BEHAVIOUR: CharacterSelection mounts BloodParticles (rAF + save/ellipse/restore up to ~30 particles) under the app Starfield. Hidden tabs still paid particle draw cost whenever the browser delivered rAF.
DESIRED_BEHAVIOUR: Early-return particle simulation/draw when `document.hidden` (rAF may still schedule; no canvas work).
EVIDENCE: BloodParticles.tsx animate loop; CharacterSelection.tsx mounts `<BloodParticles />`. Distinct from Starfield PERF-001/008.
RECOMMENDED_ACTION: Keep the hidden guard. Optional follow-up: stop dual RAF entirely on character select (HUMAN).
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Returning to the tab must resume drips on the next frame.
VALIDATION_REQUIRED: Character select animates; background the tab; return; particles resume; no leaked rAF after leaving select.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-02-054
TITLE: Replace LandingPage logo per-cube canvas shadowBlur
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/LandingPage.tsx (animated logo canvas)
CURRENT_BEHAVIOUR: Landing logo rAF sets `ctx.shadowBlur = cube.size * 1.5` for bright cubes every frame while Starfield also runs. Same class of cost as PERF-008 but a second surface.
DESIRED_BEHAVIOUR: Cheap glow (second low-alpha fill) or sprite; keep brand look.
EVIDENCE: LandingPage.tsx logo animate loop shadowBlur per cube.
RECOMMENDED_ACTION: Visual-approved substitute. Do not change Starfield in the same PR.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Landing brand mood lighting changes.
VALIDATION_REQUIRED: Side-by-side landing screenshot on desktop and mobile width.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-055
TITLE: Isolate dokaBalance HUD from WorldExploration React tree
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/GameFlow.tsx; src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: Live doka uses refs for wallet math, but each `onDokaBalanceChange` updates GameFlow state and passes `dokaBalance` back into WorldExploration. Coin vacuums and shop credits re-render the full world tree to update one HUD chip.
DESIRED_BEHAVIOUR: Doka chip island (or ref-fed subscriber). WorldExploration memo must not see balance churn. Persist lock / applyRewards paths unchanged.
EVIDENCE: GameFlow.tsx `dokaBalance={dokaBalance}` / `onDokaBalanceChange={setDokaBalance}`; WorldExploration credits call onDokaBalanceChange frequently. Overlaps PERF-027 structurally; this is the specific prop churn.
RECOMMENDED_ACTION: Extract DokaChip display. Do not change persist-lock or hydrate guards in a perf-only PR.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: HUD can desync from persist lock if the island reads a stale snapshot after credit.
VALIDATION_REQUIRED: Pickup coins, heal/shop spend, death penalty, idle hydrate; chip matches canister after settle.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-056
TITLE: Derive summon battle-log rows once for unread + Summons channel
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/ChatPanel.tsx
CURRENT_BEHAVIOUR: Summon unread effect depended on full `battleLogEntries` and filtered the array; Summons channel filtered again during render (up to 500 lines).
DESIRED_BEHAVIOUR: Single `summonLogEntries` useMemo shared by unread tracking and the channel list.
EVIDENCE: ChatPanel.tsx filtered `e.isSummon === true` in an effect and again in JSX. Distinct from PERF-019 (virtualize full battle log).
RECOMMENDED_ACTION: Keep the shared memo. Virtualize Summons with the battle-log virtualizer when 019 lands.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Unread badge must still increment when folded; Clear log must reset.
VALIDATION_REQUIRED: Summon actions while folded; open Summons tab; unread clears; list matches.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-02-057
TITLE: BuffShop stays mounted (hooks run) while closed during world play
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: medium
FILES_OR_SYSTEMS: src/frontend/src/components/BuffShop.tsx; src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: WorldExploration always mounts BuffShop. Closed state returns `null` after hooks (inventory state, several effects, purchase callbacks). Every world setState still re-executes that hook tree.
DESIRED_BEHAVIOUR: Mount shop body only while open, or memo a shell that skips children when closed without breaking inventory persistence.
EVIDENCE: BuffShop early-return after hooks; WorldExploration always renders `<BuffShop ... isOpen={...} />`.
RECOMMENDED_ACTION: Split BuffShopShell / BuffShopBody. Preserve principal-keyed inventory reload.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Inventory can fail to persist or reload on principal change if effects move.
VALIDATION_REQUIRED: Buy potion, close shop, reopen; stacks persist; battle-only items still gated.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-037
TITLE: Floor row shimmer builds a diamond path per floor tile every frame
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (drawIsometricTile row loop ~7441, ~7592-7608)
CURRENT_BEHAVIOUR: Each row computes a sine shimmer. When alpha > 0, every floor tile in that row builds a diamond path and save/fill/restore. On a 16×16 map that is hundreds of path fills during explore and battle.
DESIRED_BEHAVIOUR: Bake shimmer into a cached static layer (pairs with PERF-005) or one strip blit per row.
EVIDENCE: render() row loop shimmerAlpha = sin(now); per-tile beginPath diamond fill.
RECOMMENDED_ACTION: Do not land without a visual compare. Do not fold into RAF scheduling.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Row-wave timing and tile tint can drift from the carved-stone look.
VALIDATION_REQUIRED: Desktop and mobile screenshot of floor shimmer in explore and battle.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-038
TITLE: Ambient occlusion creates linear gradients per wall-adjacent floor tile every frame
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (~7611-7667)
CURRENT_BEHAVIOUR: AO bitmask is cached per map id, but each RAF still createLinearGradient + diamond fill for wall-adjacent floors.
DESIRED_BEHAVIOUR: Bake AO into the static tile cache from PERF-005.
EVIDENCE: aoMaskRef used as bits; live createLinearGradient in the floor pass.
RECOMMENDED_ACTION: Visual-approved bake. Distinct from vignette/portal cache (036).
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Corridor edge darkening can look wrong if the cache includes hover.
VALIDATION_REQUIRED: Room vs corridor screenshots after map change.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-039
TITLE: Depth-sort allocates mapped copies of walls and portals every frame
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (~8033-8037)
CURRENT_BEHAVIOUR: wallDepthItems.map + portalDepthItems.map + spread + sort every RAF. Separate from PERF-022 Set/Map rebuilds.
DESIRED_BEHAVIOUR: Reuse a typed buffer; sort in place.
EVIDENCE: allRenderItems = [...wallDepthItems.map, ...portalDepthItems.map, ...drawQueue].sort
RECOMMENDED_ACTION: Extract a small helper. Do not change painter's-algorithm depth.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Wrong draw order hides units behind walls or portals in front of sprites.
VALIDATION_REQUIRED: Walk behind a wall; portal occludes correctly; barrier towers still depth-sort.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-040
TITLE: Dust motes use save/arc/restore per mote every overworld (and battle) frame
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (~7363-7385 seed, ~8457-8505 draw)
CURRENT_BEHAVIOUR: 18–40 motes; each live mote save + globalAlpha + arc + fill + restore. No inBattle skip. Capped at 40 and cleared in cleanupMap.
DESIRED_BEHAVIOUR: Skip save/restore; optional skip while inBattle (visual).
EVIDENCE: dustMotesRef update/draw block after the unified entity pass.
RECOMMENDED_ACTION: Cheap fill without save. Skipping in battle needs art sign-off.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Mote fade/wrap and battle atmosphere change if skipped in combat.
VALIDATION_REQUIRED: Overworld motes still drift; portal cleanup does not leak past 40.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-041
TITLE: Character select mounts BloodParticles per filled slot under the root Starfield
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/CharacterSelection.tsx (FilledSlot ~654); src/frontend/src/components/BloodParticles.tsx; src/frontend/src/components/StarfieldBackground.tsx
CURRENT_BEHAVIOUR: Each filled slot card mounts its own BloodParticles RAF (ellipse drips) while App Starfield also runs. Three slots → four decorative RAFs before Play.
DESIRED_BEHAVIOUR: One shared drip overlay for the select screen, or disable per-card canvases.
EVIDENCE: FilledSlot stats grid renders <BloodParticles intensity="subtle" />. CharacterSelection is also touched by older a11y PR #286 — do not overwrite that delta here.
RECOMMENDED_ACTION: Move a single instance to the page shell. Hidden-tab RAF stop is PERF-059.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Drips currently clip inside each card well; a page overlay changes the look.
VALIDATION_REQUIRED: 1- and 3-slot select screens; drips still visible; no leaked RAF after Play.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-042
TITLE: Landing title cubes use per-cube canvas shadowBlur (see also PERF-054)
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/LandingPage.tsx (SkateStyleTitle)
CURRENT_BEHAVIOUR: Same finding as PERF-2026-09-02-054. Bright cubes draw twice with shadowBlur = size * 1.5 while Starfield also runs.
DESIRED_BEHAVIOUR: Cheap glow substitute. Tab-hidden pause is PERF-058 and does not replace blur.
EVIDENCE: LandingPage.tsx cube loop shadowBlur.
RECOMMENDED_ACTION: Treat as duplicate of 054. Do not implement a second visual change.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Landing brand lighting.
VALIDATION_REQUIRED: Side-by-side landing screenshot.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-043
TITLE: Ground Doka loot rebuilds a radial glow per coin every frame
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (~8507-8558)
CURRENT_BEHAVIOUR: Each uncollected coin createRadialGradient + arcs + text every RAF.
DESIRED_BEHAVIOUR: Cached glow sprite or a cheaper fill; bob can stay live.
EVIDENCE: dokaLootRef loop in render(). Distinct from entity foot shadows (035).
RECOMMENDED_ACTION: Visual-approved sprite. Do not change pickup/claim ids.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Coin bob/glow look; click hit-test is tile-based and should be unchanged.
VALIDATION_REQUIRED: Multi-kill loot pile; pickup still claims one-shot id.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-044
TITLE: World canvas looks up getContext("2d") twice per frame
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: medium
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (render ~7272, animate ~8800)
CURRENT_BEHAVIOUR: animate() and render() each call getContext. Null path in animate dispatches contextlost.
DESIRED_BEHAVIOUR: Cache the context on mount/resize; keep the null recovery path.
EVIDENCE: canvas.getContext("2d") in both callbacks. Micro vs tile fill work.
RECOMMENDED_ACTION: Cache with the existing M-1 reset. Do not change the RAF scheduler.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Stale context after GPU reset could stay black if the cache is not cleared.
VALIDATION_REQUIRED: Resize and a forced context reset still recover the canvas.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-045
TITLE: EffectsManager keeps dual typed arrays and filters four of them per tick
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: medium
FILES_OR_SYSTEMS: src/frontend/src/engine/effects.ts
CURRENT_BEHAVIOUR: Effects live in activeEffects and typed mirrors; tick filters four mirrors. N is capped at 100.
DESIRED_BEHAVIOUR: Single store or in-place compaction. Draw already iterates activeEffects.
EVIDENCE: effects.ts tick() filter passes; MAX_LIVE_EFFECTS = 100. Not a large-N leak.
RECOMMENDED_ACTION: Optional cleanup. Do not change juice timing or spawnDamageNumber stacking.
AUTONOMY:
- REPORT_ONLY
REGRESSION_RISK: Missing float text if a mirror and activeEffects diverge.
VALIDATION_REQUIRED: Damage numbers, doka floats, death fragments still appear and expire.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-046
TITLE: Enemy name/level labels stroke+fill every frame
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (~8160-8226)
CURRENT_BEHAVIOUR: Every living combatant rebuilds name strings and strokeText+fillText (four text ops); summons also measureText for the lifespan badge.
DESIRED_BEHAVIOUR: Cache label strings/metrics until name/level/turnsRemaining change.
EVIDENCE: enemyName template + strokeText/fillText in the entity pass.
RECOMMENDED_ACTION: Ref cache keyed by id+name+level. Do not change leader crown or level colors.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Stale name after rename or level-up if the key is incomplete.
VALIDATION_REQUIRED: Leader crown, level color vs player, summon timer badge after a turn.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-047
TITLE: EffectsManager.tick(16) ignores real frame delta
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (~8817)
CURRENT_BEHAVIOUR: Juice always advances 16ms per RAF. Under load, floaters run in slow motion relative to wall clock.
DESIRED_BEHAVIOUR: Product call on timebase. Prompt forbids RAF-loop timing changes for optimization.
EVIDENCE: effectsManagerRef.current.tick(16) inside animate().
RECOMMENDED_ACTION: Report only. Do not change the 16ms argument in a perf PR.
AUTONOMY:
- REPORT_ONLY
REGRESSION_RISK: Hit-stop and floater travel distance would change if dt becomes wall-clock.
VALIDATION_REQUIRED: If ever changed: 30fps vs 60fps floater distance and hit-stop length.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-048
TITLE: Leader-death particles filter+save/restore per particle
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (spawn ~17136; draw ~8615-8635)
CURRENT_BEHAVIOUR: ~36 particles for ~1.2s; each frame filter() reallocates and save/arc/restore per live particle. cleanupMap bumps generation.
DESIRED_BEHAVIOUR: In-place compact; skip save (set/reset globalAlpha). Do not change 1.2s/1.5s timings.
EVIDENCE: leaderDeathParticlesRef.filter in render(). Short spike, not a leak.
RECOMMENDED_ACTION: Same compact pattern as BloodParticles 059.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Overlay text and particle gravity must still last 1.2–1.5s.
VALIDATION_REQUIRED: Kill a leader; burst + LEADER DEFEATED text; map change cancels leftovers.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-02-049
TITLE: Release starfield GPU buffer while the world canvas is mounted
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/StarfieldBackground.tsx; src/frontend/src/engine/starfieldActivity.ts
CURRENT_BEHAVIOUR: PERF-001 already stopped RAF in-world, but resize and ResizeObserver still assigned canvas.width (clears/allocates a full-size 2D buffer) and createStars() (~250+ objects) during play.
DESIRED_BEHAVIOUR: While worldPaused, stop RAF, shrink backing store to 1×1, drop the star list. Hidden tab on landing keeps the buffer. Resume rebuilds stars once.
EVIDENCE: handleResize always createStars; RO assigned clientWidth/Height with no pause guard.
RECOMMENDED_ACTION: Keep planStarfieldLoop. Do not change per-star shadowBlur (PERF-008).
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Leaving the world must show stars on the next frame. Landing rotate while visible still rebuilds.
VALIDATION_REQUIRED: node --test starfieldActivity.test.ts; enter world, rotate, leave world; landing starfield resumes.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-02-058
TITLE: Pause LandingPage logo RAF while the document is hidden
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/LandingPage.tsx (SkateStyleTitle); src/frontend/src/engine/canvasLoopActivity.ts
CURRENT_BEHAVIOUR: Logo canvas rAF (including per-cube shadowBlur) kept running when the landing tab was backgrounded.
DESIRED_BEHAVIOUR: Cancel the logo loop on hidden; restart on visible. Do not change cube glow look.
EVIDENCE: SkateStyleTitle animate() had no visibility guard.
RECOMMENDED_ACTION: Keep shouldRunDecorativeCanvasLoop. Distinct from 054/042 (blur substitute).
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Returning to the tab must resume cube flicker without a stuck frame.
VALIDATION_REQUIRED: Typecheck; background landing tab; return; title still animates.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-02-059
TITLE: Stop BloodParticles RAF while hidden; compact in place
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/BloodParticles.tsx; src/frontend/src/engine/canvasLoopActivity.ts
CURRENT_BEHAVIOUR: PERF-053 skipped draw when hidden but still chained requestAnimationFrame. Each frame filter() + save/ellipse/restore. getContext every frame.
DESIRED_BEHAVIOUR: Visibility start/stop like Starfield. Cache 2d context. Compact the particle array in place. Keep ellipse drips.
EVIDENCE: Previous animate scheduled the next RAF before the hidden return.
RECOMMENDED_ACTION: Keep the stop/start loop. Per-slot instance count is 041.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Burst intensity and teardrop ellipses must match. Unmount must not leak RAF (generation counter).
VALIDATION_REQUIRED: Character select drips; background tab; return; leave select for world (no leftover RAF).
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-02-060
TITLE: AchievementsPanel stays mounted and re-subscribes feats while closed
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: medium
FILES_OR_SYSTEMS: src/frontend/src/components/AchievementsPanel.tsx; src/frontend/src/components/WorldExploration.tsx (~17955)
CURRENT_BEHAVIOUR: Always mounted next to BuffShop. Hooks run useGetAchievementConfigs + useGetPlayerAchievements (same query as WorldExploration) and rebuild progressMap on every parent render while closed.
DESIRED_BEHAVIOUR: Mount body while open, or React.memo a shell. Persist-claim path unchanged.
EVIDENCE: WorldExploration always renders <AchievementsPanel isOpen={achievementsOpen} />. Same class as PERF-057.
RECOMMENDED_ACTION: Memo or split shell/body. Do not drop persistClaim.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Claim rollback/optimistic cache can break if hooks unmount mid-claim.
VALIDATION_REQUIRED: Unlock toast, open panel, claim Doka; closed panel does not hitch the canvas on 1 Hz timer.
STATUS: NEW

