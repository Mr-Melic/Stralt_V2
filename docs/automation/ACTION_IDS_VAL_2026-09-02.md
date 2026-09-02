# ACTION_IDs — 2026-09-02 Visual Asset Library & Assignment Designer

Durable ledger for implementers.  
Source of every record: Visual Asset Library & Assignment Designer (cron `0 */48 * * *`).  
Design contract: [`VISUAL_ASSET_LIBRARY_DESIGN_2026-09-02.md`](./VISUAL_ASSET_LIBRARY_DESIGN_2026-09-02.md).  
HEAD inspected: `58302bc`. Gameplay / production code was not modified.

Prior IDs:

- `VAL-2026-08-31-001` … `019` in [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md) (merged design PR #121). **None implemented** except as noted below.
- `VAL-2026-09-01-001` … `011` in [`ACTION_IDS_VAL_2026-09-01.md`](./ACTION_IDS_VAL_2026-09-01.md). **001 IMPLEMENTED (copy only).** 002–011 still NEW.

This run does **not** re-issue those IDs. Do not implement from this file unless a later human or orchestrator explicitly picks an ID.

---

## Prior IDs — status 2026-09-02

| ID | Title (short) | Status 2026-09-02 |
| :--- | :--- | :--- |
| VAL-2026-08-31-001 | Empty-library fallback | NEW — `resolveRuntimeVisual` absent; no `drawImage` in `src/` |
| VAL-2026-08-31-002 | Owner-only canister metadata | NEW |
| VAL-2026-08-31-003 | Upload specs before file pick | NEW — admin still pastes URLs |
| VAL-2026-08-31-004 | Freeze render profiles from live renderer | NEW — pixel boxes unchanged; citations in 09-02 design |
| VAL-2026-08-31-005 | Bind at spawn, never in render | NEW — no `visualAssetId`, no encounter seed |
| VAL-2026-08-31-006 | Weighted pools, else builtin | NEW |
| VAL-2026-08-31-007 | Boss profile is not a stretched enemy | NEW — 8×12 × 1.4 at `enemyPixelPatterns.ts` 10–24 / WX 6620–6621 |
| VAL-2026-08-31-008 | Visual size ≠ gameplay footprint | NEW — occupancy still one tile; `drawSize` still tile-derived |
| VAL-2026-08-31-009 | Iso-tile preview | NEW — admin is still 72×72 `object-fit:contain` |
| VAL-2026-08-31-010 | Admin CRUD / assign / revert / inspect | NEW |
| VAL-2026-08-31-011 | Optional drawImage in drawCombatant | NEW — player still a second call site (WX 8368) |
| VAL-2026-08-31-012 | Do not treat spriteUrl as the library | NEW — copy is honest; combat still unused |
| VAL-2026-08-31-013 | Family pixels are ghost/minion-only | NEW — grids now in `enemyPixelPatterns.ts` 434–498; still unused for 30% family roll |
| VAL-2026-08-31-014 | Bytes in object storage | NEW |
| VAL-2026-08-31-015 | Versioned replace + safe delete | NEW |
| VAL-2026-08-31-016 | Future categories ineligible | NEW |
| VAL-2026-08-31-017 | Extract to engine/, do not grow WX | NEW — WX is **19253** lines; pixel tables already extracted; resolver must follow |
| VAL-2026-08-31-018 | Four stills only; no walk cycles | NEW — Walk Animation Frames UI still present |
| VAL-2026-08-31-019 | Elite metadata-only until a real flag | NEW — still no `isElite` |
| VAL-2026-09-01-001 | Stop admin copy claiming unused spriteUrl is live | **IMPLEMENTED** (`adminVisualStatus.ts`; EnemyEditor 809–836; chip 2140–2202) |
| VAL-2026-09-01-002 | Do not attach world-pack assignment only to spriteUrl | NEW — WX still never calls `getEnemyConfigs` |
| VAL-2026-09-01-003 | Keep spriteRects drawSize tile-derived | NEW — WX 8139–8156 / 8388–8406 |
| VAL-2026-09-01-004 | Preview clip math uses summon badge (x+18, y−48) | NEW — WX 8199–8200 |
| VAL-2026-09-01-005 | adminGuard URL checks are not image validation | NEW — `adminGuard.mo` 115–120 |
| VAL-2026-09-01-006 | Reaffirm empty-library identity | NEW — still zero `drawImage` |
| VAL-2026-09-01-007 | Player is not drawCombatant | NEW — WX 8368–8379 |
| VAL-2026-09-01-008 | Keep ELITE_ONLY ineligible | NEW — `elite_patrol` still catalog-only |
| VAL-2026-09-01-009 | Do not bind custom death/juice sprites in v1 | NEW — `effects.ts` 282–292 |
| VAL-2026-09-01-010 | Preserve empty-spriteUrl-is-not-custom test | NEW — `adminContract.test.ts` 191–197 + `adminVisualStatus.test.ts` 47–54 |
| VAL-2026-09-01-011 | Freeze 09-01 RENDER_PROFILES | NEW — boxes unchanged; 09-02 refreshes citations |

---

ACTION_ID: VAL-2026-09-02-001  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Treat phones as a live combat path — SmallScreenGuard is Continue, not a hard block  
CATEGORY: render-contract  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: 09-01 design §2.7 said phones &lt;768 are blocked. Live `App.tsx` 43, 107–119, 390–406: overlay “Best on Larger Screens” with **Continue anyway**; bypass in `sessionStorage` `pbv_small_screen_continue`. After bypass, `useIsMobile` (`hooks/use-mobile.tsx` 17–26) applies WX `MOBILE_ZOOM = 1.75` (923–925) → tiles 140×70 while `drawPixelPattern` keeps `pixelSize = 3` (3816). Builtin 24×24 art is relatively smaller on zoomed tiles.  
SYSTEMS_AFFECTED: `engine/visualPreview.ts` (new), `RENDER_PROFILES`, VAL-009 preview  
RECOMMENDED_ACTION: Iso preview must include a mobile-zoom pane (140×70 diamond, 24×24 art at scale 1, same +9 anchor). Do not apply `MOBILE_ZOOM` to bitmaps by default (match builtin). Do not skip phone clipping/overlap warnings.  
AUTONOMY: IMPLEMENT_WITH VAL-2026-08-31-009  
DEPENDENCIES: VAL-2026-08-31-003; VAL-2026-08-31-004; VAL-2026-08-31-009  
REGRESSION_RISK: MEDIUM if implementers scale custom art with tile zoom and leave builtin pixels at 3px — mixed sizes on one map.  
VALIDATION_REQUIRED: Continue on a 390px-wide viewport; custom 24×24 and chess 24×24 share screen size; preview warned about relative smallness vs 140×70 tiles.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-02-002  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Put the resolver in engine/ next to enemyPixelPatterns — do not re-inline tables into WorldExploration  
CATEGORY: architecture  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Boss/family grids were hoisted to `src/frontend/src/engine/enemyPixelPatterns.ts` so RAF does not allocate literals (`getBossPixelPattern` 430–432, family 434–498). WX is 19253 lines (was 20064 on 09-01). `drawCombatant` already injects those tables via `DrawCombatantOptions` (WX 8116–8127). `engine/visualAssets.ts` is still absent.  
SYSTEMS_AFFECTED: `engine/visualAssets.ts` (new), `pieceArt.ts` `DrawCombatantOptions`, WX wiring only  
RECOMMENDED_ACTION: Follow the pixel-table extraction. New module + tests. WX passes `visualAssetId` / resolved bitmap through options. Do not paste boss grids back into WX. Do not grow the rAF body.  
AUTONOMY: IMPLEMENT_WITH_TESTS — helper first; no RAF / mapGen / combat math.  
DEPENDENCIES: VAL-2026-08-31-017; VAL-2026-08-31-001; VAL-2026-08-31-011  
REGRESSION_RISK: HIGH if a hunter inlines `drawImage` in the 19k-line rAF path.  
VALIDATION_REQUIRED: `pnpm typecheck` + `pnpm check`. Empty library: pixels identical. WX line count must not absorb the validator/preview.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-02-003  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Add an optional custom-visual hook on DrawCombatantOptions — do not drawImage inside drawPixelPattern  
CATEGORY: renderer  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `DrawCombatantOptions` (`pieceArt.ts` 702–732) only has pattern resolvers + `drawPattern` + `characterYOffset`. `drawPixelPattern` / `drawPatternInline` only `fillRect` cells (WX 3835–3841; `pieceArt.ts` 763–768). Putting a bitmap through `drawPattern` would interpret PNG bytes as a cell grid.  
SYSTEMS_AFFECTED: `pieceArt.ts` `drawCombatant`, WX player site 8368–8379  
RECOMMENDED_ACTION: Optional top branch: if `resolveRuntimeVisual` returns a decoded bitmap + profile, `drawImage` centered on the same draw point; else branches 1–4 unchanged. Omitted option ≡ today. Player site is a second one-line wire.  
AUTONOMY: IMPLEMENT_AFTER VAL-2026-08-31-011  
DEPENDENCIES: VAL-2026-08-31-001; VAL-2026-08-31-011; VAL-2026-09-01-007; VAL-2026-09-02-002  
REGRESSION_RISK: HIGH if `drawPattern` is overloaded to accept ImageBitmap.  
VALIDATION_REQUIRED: No option / empty library → fillRect path only. Custom revoke → next frame builtin.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-02-004  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Bind weighted pools from instance id + pool config — do not wait for a missing encounter seed  
CATEGORY: assignment-architecture  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: No encounter seed exists. Map gen uses `seededRng` (WX 4050+). Enemy spawn ids embed `Date.now()` (5809, 6609). `getEnemyBaseStats` already hashes `seedKey` via charCode sum then `seededRng` (`progression.ts` 163–170). Summon id is `summon-${Math.random()…}` (`summonSpawn.ts` 149) but stable on the live object.  
SYSTEMS_AFFECTED: spawn bind, `engine/visualAssets.ts` pick helper  
RECOMMENDED_ACTION: `visualAssetId = pickWeighted(seededRng(hash(instanceId, poolId, poolVersion)), eligible)`. Write once at spawn / summon / boss portal. If the bound id later fails validation, fall back to builtin — **do not re-roll in render**. Do not invent a map encounter seed as a prerequisite.  
AUTONOMY: IMPLEMENT_WITH_TESTS  
DEPENDENCIES: VAL-2026-08-31-005; VAL-2026-08-31-006  
REGRESSION_RISK: HIGH if `Math.random()` is called from `drawCombatant` or a React render.  
VALIDATION_REQUIRED: 100 fake rAF ticks same instance → same `visualAssetId`. Empty eligible set → unset id → builtin. `turnsRemaining` decrement does not re-pick.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-02-005  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Walk Animation Frames UI must not imply live combat cycles  
CATEGORY: admin-honesty  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Enemy/player still URLs were corrected (`adminVisualStatus.ts`). Walk section (`AdminDashboard.tsx` 1580–1609) still titled “Walk Animation Frames” with a frame count chip and URL inputs. `adminGuard.mo` 282–284 caps 16 **strings**. WX never reads `walkFrames*`. `playerView` is four stills (11601–11604).  
SYSTEMS_AFFECTED: Admin sprite editor WalkFrameSection  
RECOMMENDED_ACTION: Same honesty pattern as VAL-2026-09-01-001: stored, not rendered. Do not add a walk atlas to make the heading true (VAL-018). v1 library is four stills.  
AUTONOMY: IMPLEMENT_WITH_COPY_ONLY  
DEPENDENCIES: VAL-2026-08-31-018; VAL-2026-09-01-001  
REGRESSION_RISK: LOW for copy. HIGH if a hunter wires GIF/frame arrays into rAF.  
VALIDATION_REQUIRED: Paste walk URLs, enter world: chess stills only. Copy does not say “animation active.”  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-02-006  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Do not “fix” landing ad Custom Visual copy as if it were unused combat art  
CATEGORY: scope  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Ad box status (`AdminDashboard.tsx` 7975–7977) reads “Custom Visual — override URLs set”. Landing actually paints `<img src={imageUrl}>` (`LandingPage.tsx` 721) after `unsafeUrl` reject. That is not `EnemyConfig.spriteUrl`. VAL-001 combat honesty does not apply.  
SYSTEMS_AFFECTED: landing ads (leave as-is for this library)  
RECOMMENDED_ACTION: Scope guard. v1 library is combatant stills. Ads stay a separate URL+img path. Do not route ad bytes through `resolveRuntimeVisual`.  
AUTONOMY: SCOPE_GUARD  
DEPENDENCIES: VAL-2026-08-31-016  
REGRESSION_RISK: MEDIUM if an orchestrator blindly replaces all “Custom Visual” strings and hides working ads.  
VALIDATION_REQUIRED: Filled ad box still shows on landing; combat pixels unchanged.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-02-007  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Keep drop-shadow tile-foot sized — do not derive it from custom bitmap bounds  
CATEGORY: invariant  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Enemy/player shadows are ellipses at `(tileTopX, tileTopY + effectiveTileH/2 + 4)` with radius `min(tileW*0.35, tileH*0.3)` (WX 8087–8107, 8344–8365). Independent of pattern 24×24 / boss 34×50. Custom tall art will look detached from the blob.  
SYSTEMS_AFFECTED: WX shadow blocks, `visualPreview.ts` warnings  
RECOMMENDED_ACTION: Leave shadow math tile-derived. Preview warns when art height exceeds ~36px (boss builtin) or when the sprite visually misses the foot blob. Do not scale the ellipse from `image.height`.  
AUTONOMY: GUARDRAIL + preview warning  
DEPENDENCIES: VAL-2026-08-31-008; VAL-2026-08-31-009; VAL-2026-09-01-003  
REGRESSION_RISK: MEDIUM if “shadow doesn’t match sprite” is “fixed” by occupancy or hit-box growth.  
VALIDATION_REQUIRED: 64×72 boss PNG: shadow unchanged vs builtin; occupancy one cell; `drawSize` 80×60 desktop.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-02-008  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Freeze 09-02 measured RENDER_PROFILES — pixel boxes unchanged; citations moved  
CATEGORY: render-contract  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Re-measured 2026-09-02: tile 80×40 (`gameConstants.ts` 6–7); offset −9 (line 17); cell 3px (WX 3816); standard 8×8 → 24×24 (`pieceArt.ts` 85–93); boss 8×12 (`enemyPixelPatterns.ts` 10–24) × 1.4 (WX 6620–6621) → 33.6×50.4; hit `drawSize` 80×60 (8156); Continue-on-phone + zoom 1.75 tiles only. Creation 80×80 on 320×280 (`CharacterCreation.tsx` 146, 462) is not a combat box. Admin 72×72 `<img>` (1478) is not a combat box.  
SYSTEMS_AFFECTED: `engine/visualAssets.ts` profile constants, admin spec UI  
RECOMMENDED_ACTION: Check in typed `RENDER_PROFILES` (`player_standard`, `enemy_standard`, `enemy_elite`, `boss_large`, `summon_standard`) using only these numbers. Custom default scale = 1. Do not invent 64×64 / 128×128.  
AUTONOMY: IMPLEMENT_WITH_TESTS  
DEPENDENCIES: VAL-2026-08-31-004; VAL-2026-09-01-011 (citation refresh, not a second box)  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Unit test: recommended boxes equal 8×3, 12×3×1.4 (ceil 34×50).  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-02-009  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Custom art must not inherit generateEnemyScaleFactors squash  
CATEGORY: render-contract  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `generateEnemyScaleFactors` (WX 4545–4571) stores 0.6–1.4 (including non-uniform tall/wide) on every pack enemy. Builtin `fillRect` uses that scale. Applying it to a painted PNG is arbitrary stretch (forbidden for bosses in VAL-007; same for standard enemies). Bosses use a **fixed** 1.4 on 8×12 cells, not this random function.  
SYSTEMS_AFFECTED: spawn bind, `drawCombatant` custom branch  
RECOMMENDED_ACTION: Custom default scale = 1. Do not multiply bitmaps by instance `scaleX`/`scaleY`. Builtin pixels may keep squash. Boss custom: if upload is already 34×50, do not also ×1.4.  
AUTONOMY: IMPLEMENT_WITH VAL-2026-08-31-007  
DEPENDENCIES: VAL-2026-08-31-007; VAL-2026-09-02-003  
REGRESSION_RISK: MEDIUM — mixed custom/builtin packs would show squash only on pixels, which is intended.  
VALIDATION_REQUIRED: Two pawns, one custom 24×24: custom stays 24×24; builtin neighbor may be 0.6–1.4.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-02-010  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Portrait, creation, and selection stay generated pixels in v1  
CATEGORY: scope  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Portrait 60×60, 6px cells, `chessPiecePatterns[pieceType].front` (WX 3680–3685, 18126–18128). Creation 8×10 scale on 320×280 (`CharacterCreation.tsx` 146–148, 462–465). Selection `pixelSize = floor(internalSize/10)` (`CharacterSelection.tsx` 333). `Character.pixelPattern` is saved (creation 283) and unused in WX.  
SYSTEMS_AFFECTED: HUD portrait, CharacterCreation, CharacterSelection  
RECOMMENDED_ACTION: First combat wiring is world draw only (drawCombatant + player site). Missing custom direction → front still → builtin. Do not replace HUD/creation with uploads in v1.  
AUTONOMY: SCOPE_GUARD  
DEPENDENCIES: VAL-2026-09-01-007; VAL-2026-08-31-011  
REGRESSION_RISK: LOW if scoped. MEDIUM if portrait `drawImage` uses a different anchor than world.  
VALIDATION_REQUIRED: Custom player in world; portrait still chess 60×60.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-02-011  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Do not treat admin characterPieceType "custom" as a combat visual category  
CATEGORY: category-model  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Sprite editor piece-type list includes `"custom"` (`AdminDashboard.tsx` 1244–1250). Live `ChessPieceType` (`gameTypes.ts` 5–11) has no `custom`. World player uses `character?.pieceType || "king"` (WX 3655). Unknown `pieceType` in `drawCombatant` falls back to `king.front` (`pieceArt.ts` 994–1007).  
SYSTEMS_AFFECTED: assignment keys, PlayerSpriteConfig import  
RECOMMENDED_ACTION: Library categories are the five measured profiles. Import of a sprite row with `characterPieceType === "custom"` is inactive + `#invalid` until the owner picks `player_standard` and a chess/summon id. Never name-heuristic.  
AUTONOMY: GUARDRAIL  
DEPENDENCIES: VAL-2026-08-31-012; VAL-2026-08-31-016  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Saving a sprite with piece type custom does not change world pixels and does not auto-activate a library row.  
STATUS: NEW  

---

ACTION_ID: VAL-2026-09-02-012  
SOURCE_AUTOMATION: Visual Asset Library & Assignment Designer  
TITLE: Reaffirm empty-library identity on 58302bc — still no drawImage anywhere in src/  
CATEGORY: invariant  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Grep of `src/` for `ctx.drawImage` and `createImageBitmap` returns no matches (only a comment in `adminVisualStatus.ts`). `engine/visualAssets.ts` is absent. `drawCombatant` (`pieceArt.ts` 825–1011) still only `fillRect`. New bosses still `BOSS_PIXEL_PATTERNS[bossId] ?? boss_12` (`enemyPixelPatterns.ts` 430–432). New summons still `creaturePatterns`. VAL-2026-09-01-001 copy change did not wire combat.  
SYSTEMS_AFFECTED: `engine/visualAssets.ts` (new), `drawCombatant`, spawn sites  
RECOMMENDED_ACTION: First implementer PR must ship `resolveRuntimeVisual` + tests that library `[]` / inactive / corrupt → `{ kind: "builtin" }` with no draw path change. New enemies/bosses/summons require no uploads. This ID is the 09-02 evidence refresh of VAL-2026-08-31-001 / VAL-2026-09-01-006, not a second implementation.  
AUTONOMY: IMPLEMENT_WITH_TESTS — helper only  
DEPENDENCIES: VAL-2026-08-31-001  
REGRESSION_RISK: LOW if identity on empty input. HIGH if anyone wires raw `spriteUrl`.  
VALIDATION_REQUIRED: Tests: library `[]`, inactive id, corrupt id → builtin. Manual: new boss portal with empty library matches current pixels.  
STATUS: NEW  
