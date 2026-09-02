# Custom Visual Asset Library & Assignment — 2026-09-01 re-inspection

**Designer:** Visual Asset Library & Assignment Designer  
**Date:** 2026-09-01  
**Source automation:** cron `0 */48 * * *`  
**Gameplay / production code:** not modified.  
**Prior design (merged PR #121):** [`VISUAL_ASSET_LIBRARY_DESIGN_2026-08-31.md`](./VISUAL_ASSET_LIBRARY_DESIGN_2026-08-31.md)  
**Prior ACTION_IDs:** `VAL-2026-08-31-001` … `019` in [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md) — still **NEW / unimplemented**.  
**This run ACTION_IDs:** [`ACTION_IDS_VAL_2026-09-01.md`](./ACTION_IDS_VAL_2026-09-01.md)

**Invariant:** custom visuals are optional. The current built-in / generated pixel visual remains default and fallback. An empty library must be indistinguishable from today. New enemies and bosses must work with generated pixels and no uploads.

This document re-derives every size from the **live** renderer on `main` (`dd275aa`). Invented sprite sizes are not used. Line citations from 2026-08-31 are stale (WorldExploration grew; admin copy changed). **Recommended pixel boxes did not change.**

---

## 0. Verdict

| Question | 2026-09-01 answer |
| :--- | :--- |
| Does a custom visual library exist? | **No.** `engine/visualAssets.ts` / `visualPreview.ts` are absent. `src/` has **zero** `ctx.drawImage` and **zero** `createImageBitmap`. |
| Empty library == today’s look? | **Yes, by default** — combat never reads custom bytes. |
| Can owners upload and assign art that appears in combat? | **No.** Admin URL stubs persist; WorldExploration never reads them. |
| Did recommended dimensions change? | **No.** Tile 80×40, cell 3px, standard 24×24, boss ~34×50. |
| What is new since 08-31? | Admin **copy now claims** “Custom Visual Override” / “Active fallback” / list chip “Custom visual” after AUX-VIS-NO-DEFAULT-DISTINCTION. That is **label-only**. Combat is unchanged. |

Do **not** implement by wiring `EnemyConfig.spriteUrl` or `PlayerSpriteConfig.frontUrl` into `drawCombatant`. That path has no decode, no size contract, no spawn-stable bind, and WorldExploration does not even load `getEnemyConfigs`.

---

## 1. Delta vs 2026-08-31

| Topic | 2026-08-31 | 2026-09-01 (this tree) |
| :--- | :--- | :--- |
| `drawPixelPattern` | WX ~3658–3701 | WX **3859–3904**, `pixelSize = 3`, center `x − w/2` |
| `generateEnemyScaleFactors` | ~4928–4954 | **5130–5156**, still `Math.random` squash 0.6–1.4 stored on instance |
| Enemy spawn id | ~6183 | **6394** `enemy-${n}-${currentTime}` |
| Family 30% roll | ~6236–6326 | **6447–6538** — still **stats only**; draw still chess for regular family |
| Boss spawn | ~6977 / scale 6988 | **7189–7201** `boss_${id}_${Date.now()}`, `scaleX/Y = 1.4` |
| Battle `isBoss` | ~12224 | **12522–12547** `id.startsWith("boss_")` |
| Player facing | ~11690 | **12058–12061** `setPlayerView` on step |
| Sprite hit box | ~8479 | **8722–8739** now also stores `drawAnchor` + `drawSize` |
| Name / level labels | ~8516 | **8758–8759** `screenPos.y − 34` / +14 |
| Summon lifespan badge | `y − 48` | **8783** `(screenPos.x + 18, screenPos.y − 48)` |
| Player draw | separate `drawPixelPattern` | still **8951–8962**, not `drawCombatant` |
| Portrait | ~18080 | **18469–18473** canvas **60×60**, cells 6px (**3727–3742**) |
| `ctx.scale(dpr)` | ~7591 | **7896** |
| Admin deny | ~4760 | **5040** `if (!isAdmin)` |
| `App.tsx` `isAdmin` | ~224 | **260** `userRole === "admin"` |
| Admin sprite preview | 72×72 `<img object-fit:contain>` | still **1391–1414**, plus “Default Pixel Visual — Active fallback” when empty |
| Enemy editor URL | optional text | **731–763** titled **Custom Visual Override**; status pretends URL is live |
| Enemy list chip | n/a / weaker | **2066** `"Custom visual"` if `spriteUrl[0]` |
| `getEnemyConfigs` in WX | unused | still **zero** matches |
| `engine/visualAssets.ts` | proposed | still **absent** |
| `isElite` | absent | still **absent**. `worldFeatures.ts` `elite_patrol` is a **catalog string**, not a combatant flag |
| Encounter seed | absent | still **absent** |
| PR #121 | opened this day | **merged** 2026-08-31 — docs only |

Sibling designs that must not fork this library:

- `EBA-2026-08-31-017` — per-entity `visualMode: none|asset|pool`, default **none**. Implement **after** VAL resolver, not as `drawImage(spriteUrl)`.
- `ENEMY_ELITE_EVOLUTION_2026-08-31.md` — no `isElite` field proposed as live. `ELITE_ONLY` assets stay ineligible until an explicit flag exists (`VAL-2026-08-31-019`).

---

## 2. Inspection — what actually paints

### 2.1 Combat is generated `fillRect` grids

| Path | Role | Evidence |
| :--- | :--- | :--- |
| `src/frontend/src/data/gameConstants.ts` | Tile + offset | `TILE_WIDTH = 80`, `TILE_HEIGHT = 40`, `CHARACTER_Y_OFFSET = -9` (lines 6–7, 17) |
| WX `drawPixelPattern` | World paint | `pixelSize = 3`; pattern **centered** on `(x, y)` (3859–3904) |
| `data/pieceArt.ts` `drawPatternInline` | Standalone fallback | same 3px + center (741–770) |
| `data/pieceArt.ts` `drawCombatant` | Single dispatch: boss → summon → ghost/minion → default | 825–1011 |
| WX player | `chessPiecePatterns[pieceType][playerView]` | 8925, 8951–8962 |
| Portrait HUD | 8×8 × `pixelSize = 6` on **60×60** | 3738–3742, 18469–18473 |
| Character creation | 8×8 × `scale = 10` → **80×80** art on a **320×280** canvas | `CharacterCreation.tsx` 146–148, 464–465 |
| Character selection | `pixelSize = floor(internalSize / 10)` | `CharacterSelection.tsx` 333–348 |
| Death juice | `fillRect` fragments | `engine/effects.ts` 290, 376 |

`Character.pixelPattern` is persisted (`CharacterCreation.tsx` 283) but WorldExploration **never reads it**. The world player always uses `chessPiecePatterns[pieceType][playerView]`.

Repo-wide: no `ctx.drawImage`, no `createImageBitmap`. There is **no** SOURCE / NORMALIZED / RENDER_PROFILE pipeline. Until one is added, source === runtime.

### 2.2 Unused URL stubs — still not a library

| Stub | Stored | Consumed by combat? |
| :--- | :--- | :--- |
| `EnemyConfig.spriteUrl : ?Text` | Canister + admin text (`AdminDashboard.tsx` 731–763) | **No.** WX has zero `getEnemyConfigs` / `spriteUrl`. Spawn picks chess `pieceType` + optional `EnemyFamily`. |
| `PlayerSpriteConfig` direction + walk-frame URL arrays | Canister + Sprite panel | **No.** WX has zero `getPlayerSpriteConfigs` / `frontUrl`. Preview is 72×72 `<img object-fit:contain>` (1405–1414). |
| Login ad boxes | `adminSetAdBox` URL strings | Landing `<img>`, not combat. |

`adminGuard.validateOptionalUrl` (`src/backend/lib/adminGuard.mo` 92–96, 223–230) checks **length ≤ 2048** and rejects `javascript:` / `data:` / `vbscript:`. It does **not** decode images, check MIME, or enforce pixel boxes. Empty URL is valid.

`adminContract.test.ts` 139–145: empty `spriteUrl` tuple is **not** a custom asset (`toBackendEnemySpriteUrl([]) === undefined`). Keep that.

Caffeine `ExternalBlob` is bindgen plumbing (`backend.ts` 54–55). No visual-asset blob type exists.

**Admin copy drift (new, P0 communication risk):** after AUX-VIS-NO-DEFAULT-DISTINCTION, empty fields correctly say “Default Pixel Visual”. **Filled** fields say “Custom Visual — 1 override URL” and the list chip “Custom visual”. Owners will believe the URL is live. It is not.

### 2.3 Entity categories as the game classifies them

| Requested category | Current identity | Visual today |
| :--- | :--- | :--- |
| **PLAYER CHARACTER** | `id: "player"`, `pieceType` chess, 4-way `playerView` | 8×8 `chessPiecePatterns` + character colors. Not `drawCombatant`. |
| **STANDARD ENEMY** | `id: \`enemy-${n}-${currentTime}\``, random chess `pieceType`, `family` starts `"default"` | `drawCombatant` branch 4. **Family is not used for regular enemies.** |
| **ELITE / LARGE ENEMY** | **No type.** `generateEnemyScaleFactors` stores visual squash 0.6–1.4. `iron_golem` is family HP paper, not elite. `elite_patrol` is a world-feature catalog key only. | Same chess path × instance scale |
| **BOSS** | `id: \`boss_${bossConf.id}_${Date.now()}\``, `scaleX/Y = 1.4`, `family: "boss"`. `isBoss` / `bossId` set at **battle start** if `id.startsWith("boss_")` | `getBossPixelPattern` — **8×12** (e.g. `boss_1` 3929–3942), fallback `P.boss_12` (4347) |
| **SUMMON** | `id: \`summon-${Math.random()…}\`` (`summonSpawn.ts` 149); enemy summons use spell id `enemy-summon-${pieceType}` (267) then the same random summon id | 8×8 `creaturePatterns` + `strokeOwnerTint` |
| **Ghost / boss minion** | `assignedName === "Ghost"` or `isBossMinion` | **Only these** use `getEnemyFamilyPixelPattern` (`pieceArt.ts` 920–946) |
| **Future** | Portals (whirlpool), hazards, loot, walls (`wallHeight = 28` at 4631), ads | Not `drawCombatant` |

`EnemyFamily` (`gameTypes.ts` 12–20): `wraith_bishop`, `iron_golem`, `plague_rat`, `ember_knight`, `tide_shade`, `bone_scribe`, `void_mirror`, `default`. Assigned with 30% chance (6447–6538). Changes **stats** (and three combat hooks), not the default draw path.

Family grids exist (4349–4415) but are unused for those 30% units:

| Family | Cells (cols × rows) | Drawn @ scale 1 (×3) |
| :--- | ---: | ---: |
| wraith_bishop | 3 × 8 | 9 × 24 |
| iron_golem | 6 × 5 | 18 × 15 |
| plague_rat | 6 × 5 | 18 × 15 |
| ember_knight | 5 × 8 | 15 × 24 |
| tide_shade | 7 × 4 | 21 × 12 |
| bone_scribe | 5 × 8 | 15 × 24 |
| void_mirror | 6 × 6 | 18 × 18 |
| default | 3 × 3 | 9 × 9 |

Custom **family** assignment is a new presentation bind, not a repair of this gap (`VAL-2026-08-31-013`).

### 2.4 Gameplay footprint is tile-based

`engine/occupancy.ts` 6–15, 84–96: one combatant per logical tile. No width/height.

Targeting is tile Chebyshev / Manhattan. Sprite rects are a **fixed tile-derived box**, not the painted pattern (`WorldExploration.tsx` 8722–8739, 8970–8988):

```
drawSize = { w: effectiveTileW, h: effectiveTileH * 1.5 }
  desktop: 80 × 60
  mobile-zoom: 140 × 105
registered h = effectiveTileH/2 + CHARACTER_Y_OFFSET + (effectiveTileH*1.5)/2
  desktop: 20 + (−9) + 30 = 41
drawAnchor = (tileTopX, tileTopY − CHARACTER_Y_OFFSET) = (tileTopX, tileTopY + 9)
```

Custom art must never change occupancy, movement, range, targeting, or combat hitboxes. Do not rewrite `drawSize` from bitmap width/height.

### 2.5 Randomness — bind at spawn, never in render

| What | When | Stability |
| :--- | :--- | :--- |
| Enemy `scaleX`/`scaleY` | Spawn `Math.random` | Stored on instance |
| Enemy `id` | `enemy-${n}-${currentTime}` | Instance lifetime |
| Boss `id` | `boss_${id}_${Date.now()}` | Instance lifetime |
| Summon `id` | `summon-${Math.random().toString(36).slice(2)}` | Instance lifetime |
| Family roll | 30% `Math.random` | Stored on `enemy.family` |
| Combat stats | `seededRng` (`combatMath.ts` 122–128) | Deterministic for a key |
| Tile wall tint | `seededRng(gridX * 397 + …)` | Per tile |
| **Encounter seed** | **Does not exist** | — |

`seededRng` is the correct primitive for weighted pool picks. There is still **no** encounter seed. Visual selection must be **written onto the instance at spawn** (`visualAssetId`) so React rerenders and rAF cannot change appearance.

**Never call `Math.random()` or pick a pool member inside `drawCombatant` / the rAF loop.**

### 2.6 Owner gate

- `App.tsx` 260: `isAdmin = userRole === "admin"`.
- `AdminDashboard.tsx` 5040: hard deny if `!isAdmin`.
- Backend `adminSet*` / `adminDelete*` require `#admin`.
- `AGENTS.md`: admin/debug must be gated; never ship to normal players.

Library UI is **admin-only**. Players never upload or choose combat art.

### 2.7 Mobile / tablet

- `SmallScreenGuard` blocks **&lt; 768px** (`App.tsx` 44–129, 310).
- `useIsMobile()` same 768 (`hooks/use-mobile.tsx` 3–11).
- When `isMobile`: `MOBILE_ZOOM = 1.75` → tiles **140×70** (WX 893–895).
- **Pixel patterns do not multiply by `MOBILE_ZOOM`.** A 24×24 character is relatively smaller on zoomed tiles.

Custom assets follow the same rule unless a render profile explicitly opts into tile-relative scale (not the default).

---

## 3. Visual fallback invariant

Resolution order for every combatant, every frame:

1. **Bound instance assignment** — `entity.visualAssetId` points at a library record that is `ACTIVE`, `VALIDATION_STATUS = ok`, bytes decode, and category/eligibility still match.
2. **Bound pool assignment** — `entity.visualPoolId` was resolved **at spawn** into a stored `visualAssetId`. If that id is now invalid, **do not re-roll in render.** Fall through.
3. **Built-in / generated pixel visual** — current `drawCombatant` / `drawPixelPattern` path.

Hard rules:

- Missing, inactive, corrupt, undecodable, oversized, or ineligible custom assets **immediately** use step 3.
- Empty library ⇒ every entity is step 3. No upload required to ship a new enemy or boss.
- New `BossConfig` / `EnemyConfig` / summon `pieceType` automatically works with generated pixels.
- Failures log once (reuse `logPatternLookupFailed` throttle, `pieceArt.ts` 37–55), never throw, never block combat.

```ts
// src/frontend/src/engine/visualAssets.ts  (not implemented)
function resolveRuntimeVisual(entity, library): RuntimeVisual
  // "custom" | { kind: "builtin" }
```

`drawCombatant` may grow **one optional branch at the top**: if resolve returns a decoded bitmap + profile, `drawImage` at the same anchor as `drawPixelPattern`; otherwise branches 1–4 run unchanged. Player needs a **second** one-line site (8951).

---

## 4. Derived render measurements (do not invent)

All sizes are **logical CSS pixels** after `ctx.scale(dpr)` (WX 7896). Source bitmaps may be integer multiples for sharpness.

### 4.1 Tile, anchor, scale

| Quantity | Desktop | Mobile-zoom (`isMobile`) | Source |
| :--- | ---: | ---: | :--- |
| Iso diamond | 80 × 40 | 140 × 70 | `TILE_*` × `MOBILE_ZOOM` 1.75 |
| `gridToScreen` | **top vertex** of the diamond | same | WX 3805–3810, comments 3822–3835 |
| Tile visual center | top + `th/2` → +20 / +35 | | `tileCenter` 3824–3828 |
| Character draw point | `(tileTopX, tileTopY − CHARACTER_Y_OFFSET)` = `(tileTopX, tileTopY + 9)` | same offset | `drawCombatant` 838–840; player 8954–8955 |
| Pattern **anchor** | **center of the pattern** on the draw point | same | `startX = x − patternWidth/2` (3878–3879, `pieceArt.ts` 752–753) |
| Drop-shadow foot | `(tileTopX, tileTopY + th/2 + 4)` | | player 8929–8930 |
| World cell size | **3×3** logical px × `scaleX`/`scaleY` | **not** × 1.75 | 3873 |
| Default pattern | **8×8 cells** | | `chessPiecePatterns`, `creaturePatterns` |
| Default drawn size @ scale 1 | **24 × 24** | 24 × 24 | 8 × 3 |
| Enemy instance scale | 0.6–1.4 (stored) | same | `generateEnemyScaleFactors` 5130–5156 |
| Max standard drawn @ 1.4 | **33.6 × 33.6** | 33.6 × 33.6 | 24 × 1.4 |
| Boss pattern | **8×12 cells** (all inspected `boss_*`) | | `boss_1` 3929–3942; fallback `P.boss_12` 4347 |
| Boss drawn @ 1.0 | **24 × 36** | | 8×3 × 12×3 |
| Boss spawn scale | **1.4 × 1.4** (not random) | | 7200–7201 |
| Boss drawn @ 1.4 | **33.6 × 50.4** | | |
| Portrait | 60×60 canvas, 6px cells → 48×48 art | | 3738–3742, 18473 |
| Creation preview | 80×80 pattern on 320×280 canvas | | `CharacterCreation.tsx` 146, 464 |
| Name label | `screenPos.y − 34` | | 8758 |
| Level label | name + 14 | | 8759 |
| Status icons | draw point − 30 | | 8998 |
| Summon lifespan badge | `(x + 18, y − 48)` | | 8783 |
| Sprite hit `drawSize` | 80 × 60 | 140 × 105 | 8739, 8988 |
| Wall extrusion | 28 px | | 4631 |
| Viewport floor | phones &lt; 768 blocked | tablet uses zoom | `SmallScreenGuard` |

**Anchor for custom bitmaps must match the pixel path:** center the image on `(tileTopX, tileTopY + 9)`, not on tile center and not on a foot bone, unless a future render profile adds an explicit `anchor: "foot"` (not in the current renderer).

### 4.2 Per-category upload specification

Show this table **before** the file picker. Reject or warn — **never silently scale, crop, or stretch**.

Shared:

| Field | Value | Why |
| :--- | :--- | :--- |
| `SUPPORTED_FORMATS` | `image/png` required; `image/webp` accepted if `createImageBitmap` succeeds | Pixel path is transparent (`cell === 0` skipped). JPEG has no alpha. SVG/GIF not used in combat. |
| `TRANSPARENCY_REQUIREMENT` | At least one pixel with alpha &lt; 255 | Opaque rectangles sit as boxes on the diamond. |
| `ANIMATION_SUPPORT` | **Four stills** (`front` / `right` / `left` / `back`) matching `ViewDirection` | `playerView` updates on step (12058–12061). Walk-frame arrays exist on `PlayerSpriteConfig` but are **never drawn**. Do not implement walk cycles in v1. |
| `MAX_FILE_SIZE` | **Not measured in-repo.** `adminGuard.MAX_URL = 2048` is URL text, not bytes. `ExternalBlob` has no documented visual cap. | Starting reject: **256 KiB per still** after encode until IC ingress / object-store limits are measured. Do not store raw base64 in Motoko `Text`. Do not use `data:` URLs (`unsafeUrl` already forbids them on stubs). |

#### PLAYER CHARACTER — profile `player_standard`

| Spec | Value | Derivation |
| :--- | :--- | :--- |
| `RECOMMENDED_WIDTH` | **24** (or **48** @2× source) | 8×8 × 3 |
| `RECOMMENDED_HEIGHT` | **24** (or **48** @2×) | same |
| `MAX_WIDTH` | **80** | `TILE_WIDTH`; wider overlaps neighbor diamonds (half-width 40) |
| `MAX_HEIGHT` | **60** | sprite `drawSize.h` desktop |
| `ANCHOR` | center on draw point (tile top + 9) | `drawPixelPattern` |
| `DEFAULT_SCALE` | **1** | player draw omits scale (defaults `{1,1}`) |
| `MAX_SAFE_VISUAL_FOOTPRINT` | 48 × 48 | 2× default; still inside 80×60 hit box; labels at y−34 stay clear of a 24-tall sprite |

#### STANDARD ENEMY — profile `enemy_standard`

| Spec | Value | Derivation |
| :--- | :--- | :--- |
| `RECOMMENDED_WIDTH` / `HEIGHT` | **24** (48 @2×) | same 8×8 × 3 |
| `MAX_WIDTH` / `MAX_HEIGHT` | **80** / **60** | tile + hit box |
| `ANCHOR` | center / draw point | `drawCombatant` |
| `DEFAULT_SCALE` | **1** | Custom art must **not** inherit random 0.6–1.4 squash. That squash is a pixel-art variety trick; stretching a painted illustration with it is forbidden. |
| `MAX_SAFE_VISUAL_FOOTPRINT` | 48 × 48 | |

#### ELITE / LARGE ENEMY — profile `enemy_elite` (future category)

No elite type exists. Do **not** invent gameplay size. If metadata `ELITE_ONLY` is used:

| Spec | Value | Derivation |
| :--- | :--- | :--- |
| `RECOMMENDED_WIDTH` / `HEIGHT` | **34** | ceil(24 × 1.4) — current max instance scale |
| `MAX_WIDTH` / `MAX_HEIGHT` | **80** / **60** | same tile/hit box as standard — **visual only** |
| `DEFAULT_SCALE` | **1** on a 34×34 recommended asset | Do not also multiply by 1.4 |
| `MAX_SAFE_VISUAL_FOOTPRINT` | 56 × 56 | under tile width; warn if &gt; 48 |

Occupancy stays **one tile**. Until an explicit elite flag exists, `ELITE_ONLY` assets are **ineligible** for random pools.

#### BOSS — profile `boss_large`

Bosses already render larger via a **dedicated 8×12 pattern + fixed 1.4 scale**, not a stretched 8×8 enemy.

| Spec | Value | Derivation |
| :--- | :--- | :--- |
| `RECOMMENDED_WIDTH` | **34** | ceil(8 × 3 × 1.4) |
| `RECOMMENDED_HEIGHT` | **50** | ceil(12 × 3 × 1.4) |
| `MAX_WIDTH` | **80** | tile width; do not span two columns |
| `MAX_HEIGHT` | **72** | above current 50.4; labels/icons will clip — preview must warn |
| `ANCHOR` | center / draw point (same as now) | `drawCombatant` boss branch |
| `DEFAULT_SCALE` | **1** on the recommended bitmap | Do **not** apply 1.4 on top of a 34×50 upload. If the owner uploads a 24×36 “pixel-match” sheet, the boss profile may apply 1.4 to match today’s look. |
| `MAX_SAFE_VISUAL_FOOTPRINT` | 64 × 72 | still one tile occupancy |
| `ANIMATION_SUPPORT` | 4 stills optional; v1 may be a single `front` | Bosses spawn `currentView: "front"` (7193) |

Never assign `enemy_standard` art to a boss and scale it up.

#### SUMMON — profile `summon_standard`

| Spec | Value | Derivation |
| :--- | :--- | :--- |
| Same box as player/standard | 24 recommended, 80×60 max | 8×8 `creaturePatterns` |
| Extra | Keep `strokeOwnerTint` (green/red) around the **runtime** footprint | `pieceArt.ts` 779–798, 912–914 |
| `MAX_SAFE_VISUAL_FOOTPRINT` | 48 × 48 | lifespan badge at `(x+18, y−48)` will collide with tall art — warn |

### 4.3 Aspect ratio and pixel-count gates

| Check | Rule |
| :--- | :--- |
| Aspect vs recommended | Warn if `|w/h − recW/recH| > 0.15`. Reject only if the owner did not confirm. |
| Pixel count | Reject if `w * h > MAX_WIDTH * MAX_HEIGHT` **after** intended scale (prevents 4096² uploads). |
| Decode | `createImageBitmap` / decode must succeed; on failure → reject, builtin fallback if already assigned. |
| MIME | Trust decoded type, not the extension. |
| Distortion | If the owner insists on a non-matching size, draw **unscaled** (or integer nearest-neighbor) inside the profile box with **transparent pad**. Never `drawImage` stretch to fill. |
| URL stubs | `adminGuard` URL checks are **not** this gate. Do not treat a passing URL as a valid asset. |

### 4.4 SOURCE / NORMALIZED / RENDER_PROFILE (proposed — does not exist)

Introduce only if implementation needs 2×/4× sources:

| Layer | Role |
| :--- | :--- |
| `SOURCE ASSET` | Owner file + hash + original width/height/MIME |
| `NORMALIZED RUNTIME ASSET` | PNG/WebP stills at recommended size (or integer 2×), nearest-neighbor, no color remap |
| `RENDER PROFILE` | Category box, anchor, default scale, max footprint, whether to apply instance `scaleX/Y` (default **false** for custom) |

Until that pipeline exists, **source === runtime**. Validation uses the category profile directly.

---

## 5. Library metadata

Backend-authoritative (`localStorage` cache only). Suggested Motoko / TS record:

| Field | Type | Notes |
| :--- | :--- | :--- |
| `ASSET_ID` | Text | Stable id. Never reuse after delete. |
| `DISPLAY_NAME` | Text | Owner rename. |
| `ENTITY_CATEGORY` | variant | `#player` `#enemyStandard` `#enemyElite` `#boss` `#summon` `#future(Text)` |
| `ENTITY_FAMILY` | [Text] | Empty = any family. Else `EnemyFamily` / `boss` / summon pieceType. |
| `ENTITY_IDS` | [Text] | Explicit binds: `player`, `boss_3`, summon `pieceType`, future ids. Empty = pool-only. |
| `VARIANT_TAGS` | [Text] | Owner tags. Matching is explicit, never name heuristics. |
| `ACTIVE` | Bool | Inactive assets are invisible to resolver. |
| `WEIGHT` | Nat | Pool weight. 0 = never randomly selected (direct assign only). |
| `RARITY` | Text | Display/filter only. Does not change combat. |
| `ELITE_ONLY` | Bool | Eligible only if instance is marked elite (future). If no elite flag exists, ineligible for random pools. |
| `BOSS_ONLY` | Bool | Eligible only for `isBoss` / `id.startsWith("boss_")`. |
| `UPLOAD_DATE` | Nat | Timestamp. |
| `VERSION` | Nat | Increments on replace. |
| `SOURCE_METADATA` | record | hash, MIME, original w/h, byte length, uploader principal. |
| `RENDER_PROFILE` | Text | `player_standard` / `enemy_standard` / `enemy_elite` / `boss_large` / `summon_standard`. |
| `VALIDATION_STATUS` | variant | `#ok` `#pending` `#invalid(Text)` |
| `BLOB_REF` | opt | Caffeine object id **or** (legacy import) URL. Prefer blob. |
| `DIRECTION_REFS` | record | opt front/right/left/back stills. Missing directions fall back to `front`, then builtin. |
| `PREVIOUS_VERSION` | opt Text | For revert / dependency inspect. |

Assignments (separate map):

| Field | Meaning |
| :--- | :--- |
| `targetKind` | `#entity` `#family` `#pool` `#pieceType` |
| `targetId` | e.g. `boss_1`, `iron_golem`, `pool_undead_standard`, `wolf` |
| `assetId` | Direct bind (priority 1) |
| `poolId` | Weighted pool (priority 2) |
| `active` | Soft disable without delete |

Pools: `poolId`, `category`, `entries: { assetId, weight }`, `fallback` always builtin. Only `ACTIVE` + `#ok` + matching flags participate.

**World-pack bind cannot live only on `EnemyConfig.spriteUrl`.** `generateEnemies` never reads admin enemy templates. Assignments must key off instance fields the spawn path already has: `pieceType`, `family`, `id` prefix (`boss_`), `isSummon`, and a future elite flag.

---

## 6. Owner operations

All `#admin` only. Players never see this UI.

| Operation | Behavior |
| :--- | :--- |
| **Upload** | Show category spec → pick files (1–4 directions) → validate → store source + metadata `ACTIVE=false` until owner activates. |
| **Preview** | Iso diamond 80×40, draw point +9, player 24×24 pixel dummy, one standard enemy dummy, optional boss dummy. Actual scale. Warn clip / pad / overlap / tablet zoom. |
| **Activate / deactivate** | Toggle `ACTIVE`. Deactivate → live instances with that id fall back **next frame** (resolver), no re-roll. |
| **Rename** | `DISPLAY_NAME` only. |
| **Replace / version** | New bytes, `VERSION++`, keep `ASSET_ID`. Live binds keep the id; runtime reloads blob. |
| **Safe removal** | Dependency inspect first. If any assignment or live instance id matches: block hard-delete, offer deactivate. |
| **Assign to entity / family / pool** | Priority 1 / family / weighted. Pool resolved **once at spawn**. |
| **Weighted random** | `seededRng(hash(encounterVisualSeed, instanceId, poolId))` then walk cumulative weights. |
| **Revert to default** | Clear assignment / `visualAssetId`. Builtin immediately. |
| **Dependency inspection** | List assignments, pools, and (best-effort) current-map instance ids. |

Admin URL fields may remain as **legacy import sources**. Their status text must say **stored, not rendered** until the library resolver is live.

---

## 7. Stable assignment (spawn time, not React render)

Add optional `visualAssetId?: string` (and optional `visualPoolId?: string`) on `Enemy` / summon spawn objects. **Write at spawn / summon / boss portal.** Read-only in the rAF path.

No encounter seed exists. Add a **presentation-only** `encounterVisualSeed: number` on the current map ref when a map (or boss room) is committed — e.g. hash of `mapCount`, dungeon depth, portal id, and the `Date.now()` already used in enemy ids. **Do not change `mapGen.ts`.** Do not feed this seed into occupancy, AI, or damage.

```
seed = hash(encounterVisualSeed, instanceId, poolId)
rng  = seededRng(seed)          // combatMath.ts 122–128
pick = weightedChoice(eligible, rng)
entity.visualAssetId = pick?.id ?? undefined
```

Eligible = `ACTIVE` ∧ `#ok` ∧ category match ∧ (empty ENTITY_IDS or contains this id) ∧ family/tags ∧ not (`ELITE_ONLY` unless elite) ∧ not (`BOSS_ONLY` unless boss).

If `eligible.length === 0` → leave `visualAssetId` unset → builtin.

Player: not random. Assignment is `#entity` / `#pieceType`. Direction follows `playerView`. Missing direction → `front` still → builtin.

Summons: resolve in `spawnSummonUnit` / `spawnEnemySummonUnit` using `pieceType` + encounter seed + `summonId`. Owner tint still wraps the runtime footprint.

---

## 8. Preview studio (admin)

A small canvas (not the live RAF loop) that reuses `TILE_WIDTH` / `TILE_HEIGHT`, `gridToScreen` math (or a copy in `engine/visualPreview.ts`), `CHARACTER_Y_OFFSET`, `drawPixelPattern` / `drawCombatant` for dummies, and `imageSmoothingEnabled = false`.

Layout: 3-tile strip — [standard enemy] [uploaded asset] [player]. Optional fourth tile for boss profile.

| Warning | Condition |
| :--- | :--- |
| Clipping (labels) | Image top &lt; `tileTop − 34` |
| Clipping (badge) | Summon profile and image top &lt; `tileTop − 48` (badge is also **+18 x**) |
| Padding | Transparent margin &gt; 25% on any side |
| Scale | Decoded size ≠ recommended |
| Neighbor overlap | Width &gt; 40 (half tile) — soft; width &gt; 80 — hard reject |
| Tablet risk | Projected size vs 140×70 tiles (asset stays 24px) — informational |
| Hit-rect overflow | Drawn box outside 80×60 `drawSize` — pointer may miss the art (hit box stays tile-sized on purpose) |

Do not use the current 72×72 `object-fit: contain` box as the combat preview. That path silently distorts.

---

## 9. Storage and safety

| Do | Don't |
| :--- | :--- |
| Metadata + assignment maps on the canonical actor `src/backend/main.mo` | Deploy `backend_extended/` |
| Bytes in Caffeine object storage (`ExternalBlob`) or another measured blob store | Multi-megabyte base64 in Motoko `Text` |
| Content-address `SOURCE_METADATA.hash` | Trust MIME from the filename |
| Import existing `spriteUrl` / `frontUrl` as **inactive** library rows if the owner wants | Auto-enable unused URL stubs or treat a filled URL as “custom visual active” |
| Cache decoded bitmaps in `Map<assetId, ImageBitmap>` keyed by id+version | Decode on every rAF |
| Keep `data:` rejected for combat URLs | Hotlink arbitrary player URLs in combat |

If blob storage is not ready, v1 may keep **admin-only URL** refs with decode-at-load and the same validation — still never required for gameplay.

---

## 10. Implementation placement (when a human picks IDs)

Per `AGENTS.md` and `VAL-2026-08-31-017`:

- New logic: `src/frontend/src/engine/visualAssets.ts` (+ tests) and optionally `visualPreview.ts`.
- Backend: new types in `src/backend/main.mo`, **not** `backend_extended/`.
- Admin UI: new panel in `AdminDashboard.tsx` (already gated). Honest status until resolver ships.
- WorldExploration: **wiring only** — pass `visualAssetId` into `drawCombatant` / player site. **Do not** edit the RAF loop, map generation, turn logic, or damage math.
- `drawCombatant` may gain optional `getCustomVisual?: (entity) => CustomVisual | null`.

Phasing:

0. Types + `resolveRuntimeVisual` + empty-library tests (behavior identical to today).  
1. Admin metadata CRUD without bytes. Honest “not rendered” copy.  
2. Upload validation + preview canvas.  
3. Spawn-time bind + `encounterVisualSeed`.  
4. Optional `drawImage` branch + instant fallback.  
5. Pools, versioning, safe delete, dependency inspect.

Death shatter (`engine/effects.ts`) stays `fillRect` fragments. Do not bind custom death sprites in v1.

---

## 11. Regression surface

| Risk | Mitigation |
| :--- | :--- |
| Empty library changes look | Resolver short-circuits to builtin; golden tests: no `drawImage` when library `[]` |
| Random flicker | Bind at spawn; tests: 100 fake renders same `visualAssetId` |
| Boss looks like a stretched pawn | Separate `boss_large`; forbid applying 1.4 on recommended boss bitmaps |
| Occupancy / targeting drift | No reads of image size in `occupancy.ts` / `targeting.ts` / `spriteRectsRef.drawSize` |
| WX rAF churn | Extracted helper; WX wiring only |
| Stale `spriteUrl` wired by mistake | VAL-012 + VAL-2026-09-01-001/002 |
| Admin chip lies | Honest copy until resolver exists |
| Family owners expect family pixels | Today family art is ghost/minion only |
| Canister bloat | Blob store + 256 KiB starting cap pending measurement |
| Player-facing upload | Admin + `#admin` only |

---

## 12. Validation required (before calling the system done)

1. Boot with **zero** assets — new enemy, new boss, summon, player: identical to current pixels.  
2. Invalid / inactive / corrupt bind → builtin the same frame.  
3. Pool pick stable across 60 rAF frames and a React state tick.  
4. Preview warnings match measured clip (label y−34, badge y−48 / x+18, tile 80×40).  
5. Occupancy still one tile when a 64×72 boss image is bound. Sprite `drawSize` still 80×60.  
6. Filling `spriteUrl` in today’s admin still does not change world pixels until an explicit import + resolver.  
7. `pnpm typecheck` / `pnpm check` (or `pnpm fix` then `pnpm check`) clean. Motoko gate if actor types change.  
8. Admin denied for non-admin principal.

---

## 13. Future category registry

Add categories only with an explicit render profile (tile box + anchor + max). Until then `#future(Text)` records are stored but **resolver treats them as ineligible** → builtin / current procedural art (portals, walls, loot, juice fragments). No name-based matching.
