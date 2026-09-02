# ACTION_IDs — 2026-09-01 Visual Asset Library & Assignment Designer

Durable ledger for implementers.  
Source of every record: Visual Asset Library & Assignment Designer (cron `0 */48 * * *`).  
Design contract: [`VISUAL_ASSET_LIBRARY_DESIGN_2026-09-01.md`](./VISUAL_ASSET_LIBRARY_DESIGN_2026-09-01.md).  
Prior open IDs: `VAL-2026-08-31-001` … `019` in [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md) (merged design PR #121). **None implemented.** This run does **not** re-issue those IDs.

Gameplay / production code was not modified. Do not implement from this file unless a later human or orchestrator explicitly picks an ID.

---

## Prior IDs — still NEW

| ID | Title (short) | Status 2026-09-01 |
| :--- | :--- | :--- |
| VAL-2026-08-31-001 | Empty-library fallback | NEW — `resolveRuntimeVisual` absent; no `drawImage` in `src/` |
| VAL-2026-08-31-002 | Owner-only canister metadata | NEW |
| VAL-2026-08-31-003 | Upload specs before file pick | NEW — admin still pastes URLs |
| VAL-2026-08-31-004 | Freeze render profiles from live renderer | NEW — numbers unchanged; line citations updated in 09-01 design |
| VAL-2026-08-31-005 | Bind at spawn, never in render | NEW — no `visualAssetId`, no encounter seed |
| VAL-2026-08-31-006 | Weighted pools, else builtin | NEW |
| VAL-2026-08-31-007 | Boss profile is not a stretched enemy | NEW — still 8×12 × 1.4 at WX 3929–3942 / 7200–7201 |
| VAL-2026-08-31-008 | Visual size ≠ gameplay footprint | NEW — occupancy still one tile; `drawSize` now stored on sprite rects |
| VAL-2026-08-31-009 | Iso-tile preview | NEW — admin is still 72×72 `object-fit:contain` |
| VAL-2026-08-31-010 | Admin CRUD / assign / revert / inspect | NEW |
| VAL-2026-08-31-011 | Optional drawImage in drawCombatant | NEW — player still a second call site (WX 8951) |
| VAL-2026-08-31-012 | Do not treat spriteUrl as the library | NEW — **stronger**: admin copy now claims the URL is live |
| VAL-2026-08-31-013 | Family pixels are ghost/minion-only | NEW — family grids 4349–4415 still unused for 30% family roll |
| VAL-2026-08-31-014 | Bytes in object storage | NEW |
| VAL-2026-08-31-015 | Versioned replace + safe delete | NEW |
| VAL-2026-08-31-016 | Future categories ineligible | NEW |
| VAL-2026-08-31-017 | Extract to engine/, do not grow WX | NEW — WX is now 20064 lines |
| VAL-2026-08-31-018 | Four stills only; no walk cycles | NEW |
| VAL-2026-08-31-019 | Elite metadata-only until a real flag | NEW — still no `isElite` |

---

ACTION_ID: VAL-2026-09-01-001  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Stop admin copy from claiming unused spriteUrl is a live custom visual  
CATEGORY: admin-honesty  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Enemy editor (`AdminDashboard.tsx` 731–763) labels the unused URL “Custom Visual Override” and, when filled, “Custom Visual — 1 override URL”. List chip (`2066`) shows “Custom visual” if `spriteUrl[0]` is set. Sprite panel empty state says “Default Pixel Visual — Active fallback” (`1421–1429`). WorldExploration has **zero** `getEnemyConfigs` / `spriteUrl` / `frontUrl` matches. `src/` has zero `ctx.drawImage`. AUX-VIS-NO-DEFAULT-DISTINCTION (`ADMIN_UX_AUDIT_2026-08-31.md`) correctly taught empty = default, then over-claimed filled = custom.  
SYSTEMS_AFFECTED: `AdminDashboard.tsx` enemy editor, enemy list chip, player sprite preview copy  
RECOMMENDED_ACTION: Until VAL-001/011 resolver exists, filled URL status must read **stored, not rendered** (or equivalent). Keep empty = Default Pixel Visual. Do not add `drawImage(spriteUrl)` to “make the copy true.” Import stubs later as inactive library rows (VAL-012).  
AUTONOMY: IMPLEMENT_WITH_COPY_ONLY — docs/admin strings; no combat wiring.  
DEPENDENCIES: VAL-2026-08-31-012  
REGRESSION_RISK: LOW for copy. HIGH if a hunter “fixes” the lie by binding the raw URL.  
VALIDATION_REQUIRED: Paste a URL, save, enter world: pixels unchanged. Chip/status no longer imply a live override.  
STATUS: IMPLEMENTED (copy only, 2026-09-01 18:00 orchestrator — `adminVisualStatus.ts`; no combat wiring)  

---

ACTION_ID: VAL-2026-09-01-002  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Do not attach world-pack assignment only to EnemyConfig.spriteUrl  
CATEGORY: assignment-architecture  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `generateEnemies` (`WorldExploration.tsx` 6393–6426) builds chess `pieceType` + later 30% `family` (`6447–6538`). WX never calls `getEnemyConfigs`. Admin `EnemyConfig` is an orphaned spawn-template store, not the live pack roster. Even a correct `drawImage(config.spriteUrl)` would not run for world enemies.  
SYSTEMS_AFFECTED: spawn bind, assignment maps, EBA-2026-08-31-017 `visualMode`  
RECOMMENDED_ACTION: Key binds off instance fields spawn already writes: `pieceType`, `family`, `id` prefix `boss_`, `isSummon` / `pieceType` for summons, future elite flag. `EnemyConfig` / `BossConfig` may hold `visualMode: none|asset|pool` **only after** those templates actually drive spawn (EBA). Default `none`.  
AUTONOMY: HUMAN_REVIEW — assignment model.  
DEPENDENCIES: VAL-2026-08-31-005; VAL-2026-08-31-002; EBA-2026-08-31-017  
REGRESSION_RISK: HIGH if implementers only persist a URL on unused templates and believe packs are covered.  
VALIDATION_REQUIRED: Empty library + existing admin enemy rows: world pack still chess pixels. Assignment to `pieceType=pawn` or `family=iron_golem` is the documented path, not `spriteUrl` alone.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-01-003  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Keep spriteRects drawSize/drawAnchor tile-derived when custom art exists  
CATEGORY: invariant  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Sprite-first hit-testing now stores `drawAnchor` and `drawSize` (`WorldExploration.tsx` 8722–8739, 8970–8988). `drawSize` is `effectiveTileW × effectiveTileH*1.5` (desktop 80×60), not pattern 24×24. `occupancy.ts` 84–96 still ignores pixels. VAL-008 already forbids occupancy/range from image size; the new fields are a second place a hunter could “fix” click-miss by growing the box from bitmap dimensions.  
SYSTEMS_AFFECTED: `spriteRectsRef`, click hit-test, `occupancy.ts`, `targeting.ts`  
RECOMMENDED_ACTION: Custom `drawImage` must not write bitmap width/height into `drawSize` or occupancy. Preview may warn when art exceeds 80×60 (missed clicks). Hit box stays tile-derived.  
AUTONOMY: GUARDRAIL — comment + test that resolver output is unused by occupancy and sprite `drawSize`.  
DEPENDENCIES: VAL-2026-08-31-008; VAL-2026-08-31-001  
REGRESSION_RISK: HIGH if click-miss is “fixed” by expanding occupancy or the stored rect from image size.  
VALIDATION_REQUIRED: 64×72 boss image: one occupied cell; `drawSize` remains 80×60 desktop; neighbors remain legal targets.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-01-004  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Preview clip math must use summon badge (x+18, y−48)  
CATEGORY: admin-ui  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: 2026-08-31 design warned on `screenPos.y − 48`. Live badge is (`WorldExploration.tsx` 8780–8783) `badgeX = screenPos.x + 18`, `badgeY = screenPos.y - 48`. Name/level still `y − 34` / +14 (8758–8759). Status icons at draw point − 30 (8998).  
SYSTEMS_AFFECTED: `engine/visualPreview.ts` (new), VAL-009 warning table  
RECOMMENDED_ACTION: When implementing preview warnings, use the 09-01 coordinates. Tall summon art warns on both vertical clip vs y−48 and horizontal overlap with x+18.  
AUTONOMY: IMPLEMENT_AFTER VAL-2026-08-31-009  
DEPENDENCIES: VAL-2026-08-31-009; VAL-2026-08-31-003  
REGRESSION_RISK: LOW — preview-only.  
VALIDATION_REQUIRED: A 48-tall summon PNG triggers the badge warning; a 24×24 does not.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-01-005  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: adminGuard URL checks are not image validation  
CATEGORY: upload-validation  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `validateOptionalUrl` (`src/backend/lib/adminGuard.mo` 92–96) only enforces `MAX_URL = 2048` and `unsafeUrl` (`javascript:` / `data:` / `vbscript:`). `validateEnemyConfig` (223–230) and `validatePlayerSpriteConfig` (253–286) apply that to sprite URLs. No MIME, decode, width/height, aspect, pixel count, alpha, or render-safe bounds. Walk-frame cap is 16 **strings**, not frames drawn.  
SYSTEMS_AFFECTED: future `engine/visualAssets.ts` validator; must not be replaced by `validateOptionalUrl`  
RECOMMENDED_ACTION: Implement the design §4.3 gates client-side before activate, and persist `VALIDATION_STATUS`. Passing `adminSetEnemyConfig` with a URL must not set `#ok` on a library record. Keep `data:` rejected for combat URL stubs.  
AUTONOMY: IMPLEMENT_AFTER VAL-2026-08-31-003  
DEPENDENCIES: VAL-2026-08-31-003; VAL-2026-08-31-014  
REGRESSION_RISK: MEDIUM if implementers skip decode because the URL “already validated.”  
VALIDATION_REQUIRED: A 2048-char https URL to a 4096² JPEG is rejected by the library validator even if `adminSetEnemyConfig` accepts the string.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-01-006  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Reaffirm empty-library identity — still no drawImage anywhere in src/  
CATEGORY: invariant  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Grep of `src/` for `ctx.drawImage` and `createImageBitmap` returns no matches. `engine/visualAssets.ts` is absent. `drawCombatant` (`pieceArt.ts` 825–1011) still only `fillRect` via `draw` / `drawPatternInline`. New bosses still `P[bossId] ?? P.boss_12` (WX 4347). New summons still `creaturePatterns`.  
SYSTEMS_AFFECTED: `engine/visualAssets.ts` (new), `drawCombatant`, spawn sites  
RECOMMENDED_ACTION: First implementer PR must ship `resolveRuntimeVisual` + tests that library `[]` / inactive / corrupt → `{ kind: "builtin" }` with no draw path change. New enemies/bosses/summons require no uploads.  
AUTONOMY: IMPLEMENT_WITH_TESTS — helper only; no RAF / mapGen / combat math.  
DEPENDENCIES: VAL-2026-08-31-001 (same work; this ID is the 09-01 evidence refresh, not a second implementation)  
REGRESSION_RISK: LOW if identity on empty input. HIGH if anyone wires raw `spriteUrl`.  
VALIDATION_REQUIRED: Tests: library `[]`, inactive id, corrupt id → builtin. Manual: new boss portal with empty library matches current pixels.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-01-007  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Player custom visual needs a second wiring site — player is not drawCombatant  
CATEGORY: renderer  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Enemies/summons/bosses go through `drawCombatant` (WX 8695–8711). Player is a separate `drawPixelPattern` (8951–8962) using `chessPiecePatterns[pieceType][playerView]`. `Character.pixelPattern` is saved (`CharacterCreation.tsx` 283) and unused in WX. VAL-011 mentioned this; 09-01 confirms the split remains.  
SYSTEMS_AFFECTED: WX player draw, `drawCombatant` optional `getCustomVisual`, portrait 60×60 (18473)  
RECOMMENDED_ACTION: Resolver is shared. Wire player after enemy. Portrait/creation/selection stay generated pixels until a later ID. Missing direction → front still → builtin.  
AUTONOMY: IMPLEMENT_AFTER VAL-2026-08-31-011; WX player site is wiring only.  
DEPENDENCIES: VAL-2026-08-31-011; VAL-2026-08-31-018  
REGRESSION_RISK: MEDIUM — wrong player anchor would desync spriteRects (`8970–8988`).  
VALIDATION_REQUIRED: Custom player on, blob revoked → next frame chess pixels. Enemy custom does not change the player site.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-01-008  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Keep ELITE_ONLY ineligible — elite_patrol is not an elite combatant flag  
CATEGORY: category-model  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `Enemy` (`gameTypes.ts` 280–341) has `isBoss` / `isBossMinion`, no `isElite`. `generateEnemyScaleFactors` (5130–5156) is visual squash. `iron_golem` is family HP paper (6476–6483). `worldFeatures.ts` 42 / 441 `elite_patrol` is a **feature catalog category**, not written onto enemies. `ENEMY_ELITE_EVOLUTION_2026-08-31.md` is design-only and does not add a live flag.  
SYSTEMS_AFFECTED: `ELITE_ONLY`, `enemy_elite` profile, future elite evolution  
RECOMMENDED_ACTION: Keep VAL-019. Do not infer elite from `scaleY`, HP, `iron_golem`, or `elite_patrol`. When a real flag ships, then `ELITE_ONLY` may enter pools. Occupancy stays one tile.  
AUTONOMY: DOCUMENT_THEN_IMPLEMENT  
DEPENDENCIES: VAL-2026-08-31-019; VAL-2026-08-31-006; VAL-2026-08-31-008  
REGRESSION_RISK: MEDIUM if scale 1.4 or `elite_patrol` is treated as elite gameplay/art.  
VALIDATION_REQUIRED: `ELITE_ONLY` asset never appears on a default-family pawn while no elite flag exists.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-01-009  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Do not bind custom death or juice sprites in v1  
CATEGORY: scope  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Death presentation is `fillRect` fragments (`engine/effects.ts` 290, 376; `JUICE.death` in `gameConstants.ts` 140–146). No image atlas. Portals/walls/loot are separate procedural passes. VAL-016 already parks `#future` categories.  
SYSTEMS_AFFECTED: `engine/effects.ts`, future category registry  
RECOMMENDED_ACTION: v1 library is combatant stills only (player / enemy / elite-future / boss / summon). Juice, portals, walls, ads stay current art. Adding a category requires a measured profile.  
AUTONOMY: SCOPE_GUARD  
DEPENDENCIES: VAL-2026-08-31-016  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Upload UI has no death-sprite slot. Death shatter still fragments with a custom combatant bound.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-01-010  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Preserve adminContract empty-spriteUrl-is-not-custom test  
CATEGORY: contract  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `src/frontend/src/utils/adminContract.test.ts` 139–145: `toBackendEnemySpriteUrl([])` is `undefined`; a one-element tuple maps to the string. This is the only automated statement that an empty URL is not a custom asset.  
SYSTEMS_AFFECTED: `utils/adminContract.ts`, enemy save payload  
RECOMMENDED_ACTION: Keep the test. New library records must not be created from `[]`. Optional later import only when a non-empty validated URL exists, and import as **inactive**.  
AUTONOMY: GUARDRAIL  
DEPENDENCIES: VAL-2026-08-31-012; VAL-2026-09-01-001  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Existing test stays green. Saving an enemy with empty spriteUrl does not insert a library row.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-01-011  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Freeze 09-01 measured RENDER_PROFILES — do not invent 64×64 / 128×128  
CATEGORY: render-contract  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Re-measured 2026-09-01: tile 80×40 (`gameConstants.ts` 6–7); offset −9 (line 17); cell 3px (WX 3873); standard 8×8 → 24×24; boss 8×12 (`3929–3942`) × 1.4 (`7200–7201`) → 33.6×50.4; hit `drawSize` 80×60 (8739); phones &lt;768 blocked; `MOBILE_ZOOM` 1.75 scales **tiles only** (893–895). Creation preview is 80×80 on a 320×280 canvas (`CharacterCreation.tsx` 146, 464) — not a combat box.  
SYSTEMS_AFFECTED: `engine/visualAssets.ts` profile constants, admin spec UI  
RECOMMENDED_ACTION: Check in typed `RENDER_PROFILES` using only these numbers (`player_standard`, `enemy_standard`, `enemy_elite`, `boss_large`, `summon_standard`). Custom default scale = 1. Do not apply `MOBILE_ZOOM` to bitmaps by default. Do not use the 320×280 creation canvas or 72×72 admin `<img>` as recommended upload size.  
AUTONOMY: IMPLEMENT_WITH_TESTS  
DEPENDENCIES: VAL-2026-08-31-004 (same constants; this ID updates citations)  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Unit test: recommended boxes equal 8×3, 12×3×1.4 (ceil 34×50).  
STATUS: NEW  
