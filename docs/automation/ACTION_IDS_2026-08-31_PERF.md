# ACTION_IDs — 2026-08-31 Performance Auditor

Implemented this run: PERF-2026-08-31-001, 002, 003, 004.
Reported only: PERF-2026-08-31-005 through 010.

---

ACTION_ID: PERF-2026-08-31-001
TITLE: Pause root starfield RAF while the world canvas is mounted
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/StarfieldBackground.tsx; src/frontend/src/engine/starfieldActivity.ts; src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: App-root starfield ran 250+ shadowBlur arcs every frame during world play even though the game canvas fills opaque #0a0c18.
DESIRED_BEHAVIOUR: Starfield RAF stops while WorldExploration is mounted and while the tab is hidden; resumes on character select / landing / tab visible.
EVIDENCE: StarfieldBackground.tsx draws ctx.shadowBlur per star at 60fps. WorldExploration render fills #0a0c18 then a second dark overlay. App.tsx always mounts StarfieldBackground under the game.
RECOMMENDED_ACTION: Keep the pause module; do not re-enable starfield under the world canvas unless the fill is made transparent on purpose.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Landing / character-select starfield must still animate. Portal skip-render frames keep the last opaque canvas frame.
VALIDATION_REQUIRED: Typecheck; starfieldActivity unit test; world mount pauses loop; leaving world resumes it.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-08-31-002
TITLE: Keep canvas hover on refs instead of React state
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: handleCanvasMouseMove called setHoveredTile / setHoveredEnemyId on every mousemove, re-running the ~19k-line WorldExploration hook tree.
DESIRED_BEHAVIOUR: Hover writes refs only; the existing RAF loop reads them. Mouse leave clears the refs.
EVIDENCE: setHoveredTile(gridPos) had no equality guard. hoveredTile was only consumed inside the canvas render callback. hoveredEnemyId already had a ref mirror used by render.
RECOMMENDED_ACTION: Do not reintroduce hover React state. Hover highlight and MP-cost label stay RAF-driven.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Hover diamond / walk MP label / attack damage preview must still track the pointer on the next frame.
VALIDATION_REQUIRED: Typecheck; pointer move across tiles does not React-render WorldExploration; highlight still follows the cursor.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-08-31-003
TITLE: Stop mirroring debug logs into ChatPanel React state unless Debug tab is open
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/ChatPanel.tsx; src/frontend/src/debug/debugLogger.ts
CURRENT_BEHAVIOUR: subscribeDebugLogs copied the buffer (cap 2000) into useState on every log line, including production, even when the Debug tab was hidden.
DESIRED_BEHAVIOUR: Live React mirror only while activeChannel === "debug". Opening the tab snapshots getDebugLogBuffer(). Export still reads the module buffer.
EVIDENCE: debugLogger notifies subscribers in prod. Battle/AI/spell paths call logDebugInfo frequently. ChatPanel setDebugEntries ran unconditionally.
RECOMMENDED_ACTION: Keep the channel guard. Do not drive ChatPanel render from the debug ring during play.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Debug tab must show full history when opened. Export report already uses getDebugLogBuffer().
VALIDATION_REQUIRED: Typecheck; Debug tab still lists logs after a battle; folded chat does not re-render per log line.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-08-31-004
TITLE: Memo WorldExploration and stabilize GameFlow callbacks
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/GameFlow.tsx; src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: Each battle-log line re-rendered GameFlow, which passed new inline onInBattleChange / onDebugLog / shop / feats closures into the unmemoized world tree.
DESIRED_BEHAVIOUR: WorldExploration is React.memo. GameFlow passes stable setters/callbacks. Battle-log updates re-render ChatPanel only.
EVIDENCE: GameFlow addBattleLogEntry updates state capped at 500. WorldExploration was a non-memo wrapper. Inline lambdas changed identity every parent render.
RECOMMENDED_ACTION: Keep callbacks stable. Do not memoize indiscriminately inside WorldExplorationInner.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Doka / shop / feats / in-battle flags are primitives or stable setters and still pass through. Battle-entry log clear still uses the isInBattle effect.
VALIDATION_REQUIRED: Typecheck; entering battle still clears the log; shop/feats buttons still close.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-08-31-005
TITLE: Cache static isometric tile / hazard pixel textures
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (drawIsometricTile, hazard overlay)
CURRENT_BEHAVIOUR: Every frame redraws 16×16 tiles. Wall faces emit ~40–65 fillRects each; hazard tiles emit 30–50 seeded pixels plus clip paths. Desktop camera is static.
DESIRED_BEHAVIOUR: Blit a cached static map layer; redraw only hover, entities, portals, vignette, and animated hazard pulses.
EVIDENCE: drawIsometricTile wall branch: two face loops of 40–65 pixels plus bottom-face loops of 18–30. Hazard overlay 30–50 pixels × up to 50 tiles. Row shimmer and lava pulse need a live pass.
RECOMMENDED_ACTION: Offscreen cache keyed by map id + tile size + DPR. Invalidate on map change / resize. Do not fold this into the RAF scheduling itself.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Hover tint, AO, shimmer, portal pulse, and hazard glow can desync if the cache includes animated layers. Mobile camera follow must still translate or rebuild.
VALIDATION_REQUIRED: Visual compare of wall texture, hover, lava pulse, and portal transition on desktop and a narrow viewport.
STATUS: NEW

---

ACTION_ID: PERF-2026-08-31-006
TITLE: Cache MP-reachable tiles; stop applyMpCost(Math.random) in the render path
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (getMpReachableTiles, hover MP label)
CURRENT_BEHAVIOUR: Walk-mode render runs a BFS every frame and calls mapModifierRegistry.applyMpCost(..., { rng: Math.random }). Hover MP label does the same.
DESIRED_BEHAVIOUR: Cache the reachable set until MP, origin, barriers, or modifiers change. MP cost must use a stable/seeded rng, not Math.random, so the highlight cannot flicker.
EVIDENCE: render() calls getMpReachableTiles() when battleActionModeRef === "walk". applyMpCost is invoked from BFS and again for the hover cost label with rng: Math.random.
RECOMMENDED_ACTION: Version-key like spellRangeCacheRef. Do not change movement rules or modifier math without a fixture.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Stale cache could show illegal walk tiles or hide legal ones. Random rng in render can already flicker costs if a modifier reads it.
VALIDATION_REQUIRED: Walk highlight matches clickable tiles after AP/MP spend, barriers, slime/ice modifiers, and summon control.
STATUS: NEW

---

ACTION_ID: PERF-2026-08-31-007
TITLE: Isolate the 1 Hz turn timer from WorldExploration state
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: medium
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/components/BattleUIPanel.tsx; src/frontend/src/components/InitiativeStrip.tsx
CURRENT_BEHAVIOUR: setTurnTimeLeft every second re-renders the full world tree to update a timer label.
DESIRED_BEHAVIOUR: A tiny timer island (or ref + isolated subscriber) owns the display. advanceTurn on expiry stays the same.
EVIDENCE: setInterval 1000 ms in the currentTurnIndex effect calls setTurnTimeLeft. BattleUIPanel and InitiativeStrip receive turnTimeLeft as props from WorldExplorationInner.
RECOMMENDED_ACTION: Extract a TurnTimerDisplay that subscribes to a ref/store. Do not change 15s/30s Time Warp timing.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Timer expiry must still call advanceTurnRef. Time Warp 15s and cleanup on battle exit must stay exact.
VALIDATION_REQUIRED: 30s and Time Warp 15s still expire and advance; unmount clears the interval.
STATUS: NEW

---

ACTION_ID: PERF-2026-08-31-008
TITLE: Replace per-star canvas shadowBlur on the landing starfield
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/StarfieldBackground.tsx
CURRENT_BEHAVIOUR: Each star uses ctx.save + shadowBlur + arc + restore. shadowBlur is a known expensive 2D operation (~250–350 stars).
DESIRED_BEHAVIOUR: Draw a cheap glow (second low-alpha circle) or a sprite atlas. Keep landing/character-select look close.
EVIDENCE: StarfieldBackground animate loop sets ctx.shadowBlur = star.size * 2 per star. Landing and character select still run this after 001 pauses it in-world.
RECOMMENDED_ACTION: Visual-approved glow substitute. Optional density cap on large displays.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Landing mood lighting changes. Milky-way tinted clusters must remain visible.
VALIDATION_REQUIRED: Side-by-side landing screenshot; no extra RAF after world entry (covered by 001).
STATUS: NEW

---

ACTION_ID: PERF-2026-08-31-009
TITLE: Default QueryClient refetchOnWindowFocus is true; Doka query staleTime is 0
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: medium
FILES_OR_SYSTEMS: src/frontend/src/main.tsx; src/frontend/src/hooks/useAdminQueries.ts (useGetCallerDokaBalance)
CURRENT_BEHAVIOUR: Default QueryClient refetches stale queries on focus. callerDokaBalance has staleTime 0, so every focus hits the canister and re-renders GameFlow even when hydrate is ignored.
DESIRED_BEHAVIOUR: refetchOnWindowFocus false for callerDokaBalance (and consider a conservative QueryClient default). Idle hydrate must not replace a seeded wallet.
EVIDENCE: main.tsx `new QueryClient()` with no defaults. useGetCallerDokaBalance staleTime 0. AGENTS.md: window-focus refetch can restore a pre-heal balance; GameFlow already guards apply via shouldApplyCallerDokaHydrate.
RECOMMENDED_ACTION: Set refetchOnWindowFocus: false on callerDokaBalance. Do not change persist math in a perf PR.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Players who expect focus to refresh Doka from another tab would not. Persist-lock claims already skip this key.
VALIDATION_REQUIRED: Focus during a heal/spend does not change the HUD; first world hydrate still seeds from the canister.
STATUS: NEW

---

ACTION_ID: PERF-2026-08-31-010
TITLE: Background-tab RAF watchdog can restart the game loop
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: medium
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (watchdogIntervalRef)
CURRENT_BEHAVIOUR: Browsers pause rAF when hidden. A 1s interval restarts the loop after 2s of stale lastFrameTime. Hidden tabs can wake the canvas.
DESIRED_BEHAVIOUR: Watchdog ignores document.hidden (or pauses with visibility). Do not change in-foreground frame timing.
EVIDENCE: Watchdog setInterval 1000 ms; restart if performance.now() - lastFrameTime > 2000. No visibility guard. Prompt forbids RAF-loop timing changes for optimization.
RECOMMENDED_ACTION: Add a hidden-tab early return in the watchdog only. Report-only until a human accepts a loop-adjacent change.
AUTONOMY:
- REPORT_ONLY
REGRESSION_RISK: A genuine hung loop while the tab is visible must still restart. Visibility resume must not skip a frame of combat state.
VALIDATION_REQUIRED: Background the tab for 10s, return, canvas is not black and turns still advance correctly.
STATUS: NEW
