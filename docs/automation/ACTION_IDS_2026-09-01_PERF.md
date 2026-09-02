# ACTION_IDs — 2026-09-01 Performance Auditor

Implemented this run: PERF-2026-09-01-011, 012, 014, 015, 017, 021, 031.
Reported only: PERF-2026-09-01-013, 016, 018–020, 022–023, 026–028, 032–036.
Already ledgered 2026-08-31 (do not re-file): PERF-2026-08-31-001 through 010.

---

ACTION_ID: PERF-2026-09-01-011
TITLE: Attach DraggablePanel window pointer listeners only while dragging
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/DraggablePanel.tsx
CURRENT_BEHAVIOUR: Every mounted panel (chat, battle UI, stats, modifiers, spells, settings) kept window mousemove/mouseup/touchmove/touchend listeners for the panel lifetime. Canvas pointer motion invoked 6+ no-op handlers.
DESIRED_BEHAVIOUR: Listeners attach on drag start and detach on release or unmount.
EVIDENCE: Prior effect at DraggablePanel.tsx added four window listeners whenever clampPosition/scheduleSave identity changed. ChallengePanel already used attach-on-start.
RECOMMENDED_ACTION: Keep attach/detach on beginDrag / onEnd. Do not reintroduce always-on window move listeners.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Mouse-up outside the panel must still snap and save. Unmount mid-drag must not leak listeners.
VALIDATION_REQUIRED: Typecheck; drag chat and battle panels, snap ghost still appears, layout persists after release.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-01-012
TITLE: Coalesce DraggablePanel drag setState to one update per animation frame
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/DraggablePanel.tsx
CURRENT_BEHAVIOUR: Every pointermove called setPosition, setSnapPreview, and setPanelSize, reconciling the panel and its children at input rate.
DESIRED_BEHAVIOUR: Queue the latest pose and flush once per animation frame; commit the last pose then magnetic snap on release.
EVIDENCE: onMove wrote three React states per event. BattleUIPanel is a heavy child of a DraggablePanel.
RECOMMENDED_ACTION: Keep the pending-drag rAF flush. This is panel-local rAF, not the world game loop.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Snap preview lerp and release snap must still match prior feel.
VALIDATION_REQUIRED: Drag a panel quickly; ghost preview tracks; release snaps to edges; no leftover listeners.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-01-013
TITLE: Drive overworld walk position from refs instead of WorldExploration setState
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (movePlayer, render deps)
CURRENT_BEHAVIOUR: Each path step calls setCurrentStepIndex and setPlayerPositionSynced, re-rendering the ~19k-line world tree while a second RAF already paints the canvas.
DESIRED_BEHAVIOUR: Animate position on refs (same pattern as camera). Commit React state at path end or tile arrival that gameplay must observe.
EVIDENCE: movePlayer around former L11861; render() depends on playerPosition.
RECOMMENDED_ACTION: Do not land this without a movement fixture. Touches portal/encounter triggers and spell-range cache.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Portal entry, enemy collision, camera follow, and in-battle walk MP spend can desync if React state lags the ref.
VALIDATION_REQUIRED: Walk a path into a portal and an encounter; MP label and camera follow stay correct on desktop and mobile.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-014
TITLE: Skip overworld enemy wander map() when nobody is moving or due
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/engine/enemyWander.ts; src/frontend/src/components/WorldExploration.tsx (updateEnemyMovement)
CURRENT_BEHAVIOUR: RAF called updateEnemyMovement every frame; it allocated enemies.map() even when all wanderers were idle.
DESIRED_BEHAVIOUR: Early-return unless an enemy isMoving or a wanderer has reached nextMoveTime.
EVIDENCE: updateEnemyMovement was invoked from animate() every frame; H3 already skipped setState when unchanged but still mapped the array.
RECOMMENDED_ACTION: Keep shouldTickEnemyWander. Do not change wander intervals or pathfinding.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Enemies with missing nextMoveTime must not start walking. Mid-path steps must still advance.
VALIDATION_REQUIRED: node --test enemyWander.test.ts; watch overworld wander start and finish; shop/battle still freeze wander.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-01-015
TITLE: Keep debug export context on a ref instead of GameFlow state
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/GameFlow.tsx; src/frontend/src/components/ChatPanel.tsx; src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: Every turn-order / turn-index change built a debug snapshot and setState in GameFlow, re-rendering ChatPanel during battle.
DESIRED_BEHAVIOUR: WorldExploration writes the snapshot to a ref. ChatPanel reads it only when Export is clicked.
EVIDENCE: WorldExploration debug-context effect depends on currentTurnIndex and turnOrder. ChatPanel export already invokes getters at click time.
RECOMMENDED_ACTION: Keep debugContextRef. Do not lift a new object into React state each turn.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Debug Export / PDF must still include live map, turn, combatants, and geometry snapshot.
VALIDATION_REQUIRED: Typecheck; open Debug tab, Export after a turn change; report is not stale empty.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-01-016
TITLE: Stop lifting activeEffects into GameFlow on every buff/DoT mutation
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/components/GameFlow.tsx; src/frontend/src/components/ChatPanel.tsx
CURRENT_BEHAVIOUR: onActiveEffectsChange(activeEffects) runs after every effect apply/tick and re-renders GameFlow + ChatPanel. Status unread only needs length.
DESIRED_BEHAVIOUR: Mirror the debug-log gate: push React state only while the Status tab is open, or give ChatPanel a ref/store snapshot.
EVIDENCE: WorldExploration useEffect syncs activeEffects to the parent. ChatPanel Status tab and unread badge consume the array.
RECOMMENDED_ACTION: Same pattern as PERF-003. Do not change effect ticking or combat math.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Status tab grouping and unread counts can miss applies if the gate is wrong.
VALIDATION_REQUIRED: Apply a DoT and a player buff with Status closed then open; unread increments; list matches live effects.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-017
TITLE: Memo ChatPanel so sibling GameFlow updates skip the chat tree
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/ChatPanel.tsx
CURRENT_BEHAVIOUR: ChatPanel was a plain function component. Shop, leaderboard, Doka, and debug-context updates re-rendered the full chat chrome even when folded.
DESIRED_BEHAVIOUR: React.memo around the default export. Battle-log props still update the panel when the log changes.
EVIDENCE: GameFlow renders WorldExploration and ChatPanel as siblings. WorldExploration is already memo'd (PERF-004).
RECOMMENDED_ACTION: Keep memo. Pair with 015 so turn snapshots are not a changing prop.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Folded unread badges and channel switches must still update.
VALIDATION_REQUIRED: Typecheck; new battle-log line still appears; folded unread increments.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-01-018
TITLE: Cap or merge DoT stacks in activeEffects
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: medium
FILES_OR_SYSTEMS: src/frontend/src/engine/dotStacks.ts; WorldExploration applyActiveEffect
CURRENT_BEHAVIOUR: appendDotStack always concatenates. Long plague/lava fights grow the array without a per-target cap.
DESIRED_BEHAVIOUR: Merge or cap stacks per (targetId, effectName) with an explicit design rule.
EVIDENCE: appendDotStack returns [...effects, stack] with no max.
RECOMMENDED_ACTION: Needs combat-design sign-off. Do not cap blindly.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Changing stack rules changes DoT DPS and Status tab counts.
VALIDATION_REQUIRED: Plague / multi-burn fixture vs current stack damage.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-019
TITLE: Virtualize the battle-log DOM list
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/GameFlow.tsx; src/frontend/src/components/ChatPanel.tsx
CURRENT_BEHAVIOUR: Up to 500 BattleLogText nodes mount when the Battle Log tab is open. Each new line re-parses colored tokens for the whole list.
DESIRED_BEHAVIOUR: Windowed list (fixed-height virtual scroll) or render only the visible slice.
EVIDENCE: addBattleLogEntry caps at 500; ChatPanel maps the full array.
RECOMMENDED_ACTION: Add a virtualizer. Keep the 500-entry buffer for export.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Scroll-to-bottom, unread, and summon filter tabs can break.
VALIDATION_REQUIRED: Long fight, jump to top/bottom, summons filter, clear log.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-020
TITLE: Cap or virtualize general chat messages on the client
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: medium
FILES_OR_SYSTEMS: src/frontend/src/components/ChatPanel.tsx (getMessages poll)
CURRENT_BEHAVIOUR: getMessages() replaces the full array every 2s while not in battle. The General tab maps every message.
DESIRED_BEHAVIOUR: Client cap (e.g. last 200) and/or virtualization. Poll already pauses in battle and when the tab is hidden.
EVIDENCE: fetchMessages setMessages(raw); messages.map in the General channel.
RECOMMENDED_ACTION: Cap after fetch. Confirm backend already paginates before shrinking further.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Players lose older realm history in-session.
VALIDATION_REQUIRED: Idle general chat with a large history; scroll and send still work.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-021
TITLE: Coalesce ChallengePanel drag setState to one update per animation frame
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/ChallengePanel.tsx
CURRENT_BEHAVIOUR: document mousemove called setPos at pointer rate during the pre-first-action challenge overlay.
DESIRED_BEHAVIOUR: rAF-coalesce position; persist the last pose on mouseup.
EVIDENCE: ChallengePanel onMove setPos({x,y}) per event while combat canvas is live underneath.
RECOMMENDED_ACTION: Keep the pending-pos rAF. Listeners already attach only during drag.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Overlay must stay inside the clamp box; layout localStorage must save the released position.
VALIDATION_REQUIRED: Drag the challenge card before the first action; accept/decline still work.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-01-022
TITLE: Reuse per-frame Sets/Maps in the canvas render path
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (render)
CURRENT_BEHAVIOUR: Each frame allocates a new empty MP Set (when not walking), copies barrierTiles into a new Map, and rebuilds portalMap from currentMap.portals.
DESIRED_BEHAVIOUR: Reuse ref-backed collections; invalidate on map / barrier / portal change.
EVIDENCE: render() constructs `new Set()`, `new Map(barrierTilesRef.current)`, and a portal Map every RAF.
RECOMMENDED_ACTION: Pair with PERF-006 if walk-mode MP tiles are cached. Do not change occupancy rules.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Stale portal/barrier maps after map generate or barrier spawn.
VALIDATION_REQUIRED: Portal click and barrier block after map change; walk highlight still matches clicks.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-023
TITLE: Memoize summon-control kit spell resolution
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: medium
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (SummonControlPanel JSX)
CURRENT_BEHAVIOUR: Inline IIFEs find the summon and map kit spell ids on every WorldExploration render during a controlled-summon turn.
DESIRED_BEHAVIOUR: useMemo keyed on activeControlledSummonId + pieceType/level.
EVIDENCE: JSX around former L19335 builds kitSpells with nested IIFEs.
RECOMMENDED_ACTION: Extract a small helper. Do not change summon kit contents.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Wrong kit after level-up or control swap.
VALIDATION_REQUIRED: Control a summon, cast a kit spell, switch back to the player.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-026
TITLE: Memoize BattleUIPanel unitStats / unitEffects records
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: medium
FILES_OR_SYSTEMS: src/frontend/src/components/BattleUIPanel.tsx
CURRENT_BEHAVIOUR: Every parent render rebuilds unitStats and unitEffects objects for the whole turn order.
DESIRED_BEHAVIOUR: useMemo on turnOrder (and effect version), or read from a ref when a popup opens.
EVIDENCE: BattleUIPanel loops turnOrder and allocates fresh records each render.
RECOMMENDED_ACTION: Memoize. Do not change stat popup contents.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Inspect popup could show stale HP if memo keys miss updates.
VALIDATION_REQUIRED: Open unit inspect after a hit; HP and effects match the canvas.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-027
TITLE: Split WorldExplorationInner into memoized canvas / chrome islands
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: One function component owns 100+ useState hooks and returns canvas, stats, battle UI, shop, achievements, challenge, and modals. Any setState reconciles the full subtree.
DESIRED_BEHAVIOUR: Canvas shell, battle chrome, and overlays as memoized boundaries with ref-fed live data.
EVIDENCE: WorldExplorationInner spans ~19k lines after the pattern extract. setTurnTimeLeft, movement, and HP regen all re-render the tree.
RECOMMENDED_ACTION: Incremental extract. Do not fold into a single mega-PR with gameplay changes.
AUTONOMY:
- REPORT_ONLY
REGRESSION_RISK: High. Shared refs/state are easy to desync.
VALIDATION_REQUIRED: Full playthrough: walk, fight, shop, death realm, rest-exit.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-028
TITLE: Keep overworld HP regen off the WorldExploration React tree
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: medium
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (10s HP regen interval)
CURRENT_BEHAVIOUR: Injured overworld regen calls setCharacterStats every 10s and re-renders the world tree for a +1 HP tick.
DESIRED_BEHAVIOUR: Update a HUD island or ref; persist through the existing authoritative path.
EVIDENCE: setInterval 10000 ms; setCharacterStats when hp < maxHp and not in battle.
RECOMMENDED_ACTION: Isolated HP display. Do not change regen rate or persist math.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: HUD and persist could diverge if only the ref updates.
VALIDATION_REQUIRED: Regen while exploring; enter battle with the new HP; death persist unchanged.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-031
TITLE: Hoist boss and family pixel-art tables out of the per-draw path
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/engine/enemyPixelPatterns.ts; src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: getBossPixelPattern / getEnemyFamilyPixelPattern / getEnemyFamilyColors rebuilt full lookup objects on every invocation. drawCombatant called them per entity per frame.
DESIRED_BEHAVIOUR: Module-scope tables; lookups return stable object references.
EVIDENCE: Former WorldExploration functions allocated ~12 boss grids plus family maps on each call. 8–16 entities × 60 fps is megabytes/sec of short-lived arrays.
RECOMMENDED_ACTION: Keep the extracted tables. Do not rebuild them inside render or drawCombatant.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
REGRESSION_RISK: Visual mismatch if a table row was transcribed wrong (tables were extracted verbatim).
VALIDATION_REQUIRED: node --test enemyPixelPatterns.test.ts; typecheck; boss and family sprites match prior art.
STATUS: IMPLEMENTED

---

ACTION_ID: PERF-2026-09-01-032
TITLE: Fix mobile tile screen-position caches that ignore camera motion
CATEGORY: runtime-performance
PRIORITY: high
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (gridToScreen, tileScreenCacheRef, tileCornerCacheRef)
CURRENT_BEHAVIOUR: Caches key only "gx,gy" but store camera-adjusted pixels. Camera interpolates every mobile frame; invalidation is resize-only. Hit-test mixes live camera with stale centers.
DESIRED_BEHAVIOUR: Include quantized camera in the key, or disable these caches when the camera is moving.
EVIDENCE: gridToScreen writes camX/camY into a gx,gy cache. updateCameraToFollowPlayer runs after render on mobile. rebuildTileCornerCache is resize-only.
RECOMMENDED_ACTION: This is a correctness bug with a perf cost. Do not land without mobile click tests.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Wrong click-to-tile and entity draw positions while the camera follows the player.
VALIDATION_REQUIRED: Narrow viewport: walk, click a distant tile and an enemy; hover diamond matches the pointer.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-033
TITLE: Cache hover attack damage instead of computeDamage every frame
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (attack-mode hover label)
CURRENT_BEHAVIOUR: While attack mode is on and an enemy is hovered, every RAF runs computeDamage (scaling, RES/SR, effect scan).
DESIRED_BEHAVIOUR: Cache by enemyId + spellId + effectsVersion; invalidate on those inputs.
EVIDENCE: render() hover branch calls computeDamage(..., activeEffectsRef.current).finalDamage.
RECOMMENDED_ACTION: Ref cache. Do not change damage math.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Stale preview after a buff/debuff if the version key is incomplete.
VALIDATION_REQUIRED: Hover an enemy, apply a player ATK buff, confirm the preview updates next frame.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-034
TITLE: Index activeEffects by targetId for the canvas status pass
CATEGORY: runtime-performance
PRIORITY: low
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (entity effect icons)
CURRENT_BEHAVIOUR: Each combatant filters activeEffectsRef every frame.
DESIRED_BEHAVIOUR: Maintain Map<targetId, ActiveEffect[]> at apply/remove sites.
EVIDENCE: enemyEffects = activeEffectsRef.current.filter(e => e.targetId === enemy.id) in render.
RECOMMENDED_ACTION: Build the index at mutation time. Do not change icon rules.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Missing icon after a stack apply if the index is not updated.
VALIDATION_REQUIRED: Apply DoT to two enemies; both icons show; expiry removes them.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-035
TITLE: Replace combatant drop-shadow radial gradients and moving-unit shadowBlur
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (entity shadows); src/frontend/src/engine/barrierRender.ts
CURRENT_BEHAVIOUR: Each entity creates a radial gradient ellipse every frame. Moving units also use ctx.shadowBlur. Barriers draw 6 layers × 3 faces live.
DESIRED_BEHAVIOUR: Shared ellipse or cached sprite; cheaper moving-unit glow; cached barrier tower per tile size.
EVIDENCE: createRadialGradient per enemy and player; shadowBlur 8 when isMoving; drawBarrierTower nested loops.
RECOMMENDED_ACTION: Visual-approved substitutes. Distinct from starfield shadowBlur (PERF-008).
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Foot-shadow and barrier look change.
VALIDATION_REQUIRED: Side-by-side battle screenshot; moving enemy still reads as moving.
STATUS: NEW

---

ACTION_ID: PERF-2026-09-01-036
TITLE: Reuse battle vignette gradient and reduce portal/hazard live pixel work
CATEGORY: runtime-performance
PRIORITY: medium
CONFIDENCE: high
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx (vignette, portals, hazards)
CURRENT_BEHAVIOUR: Battle vignette createRadialGradient every frame. Portals allocate draw closures and 27 fillRects. Hazards emit 30–50 seeded pixels plus lava pulse (overlaps PERF-005).
DESIRED_BEHAVIOUR: Cache vignette by canvas size and pulse via globalAlpha. Static portal/hazard blit with a thin animated overlay.
EVIDENCE: render() vignette block; portalDepthItems.draw closures; hazard overlay pixel loops.
RECOMMENDED_ACTION: Visual sign-off. Do not fold into RAF scheduling.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: Pulse timing and portal colors can drift.
VALIDATION_REQUIRED: Desktop and mobile battle vignette; dungeon/boss/rest portals; lava pulse.
STATUS: NEW
