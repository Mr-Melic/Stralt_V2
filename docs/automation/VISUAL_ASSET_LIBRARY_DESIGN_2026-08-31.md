# Custom Visual Asset Library & Assignment — Design

**Designer:** Visual Asset Library & Assignment Designer  
**Date:** 2026-08-31  
**Source automation:** cron `0 */48 * * *`  
**Gameplay / production code:** not modified.  
**Invariant:** custom visuals are optional. The current built-in / generated pixel visual remains default and fallback. An empty library must be indistinguishable from today.

This document is the owner-only design for uploading, organizing, previewing, assigning, and safely using custom visual assets. Every dimension below is derived from the live renderer. Invented sprite sizes are not used.

Related ACTION_IDs: `docs/automation/ACTION_IDS_2026-08-31.md`.

---

## 1. Inspection summary (what exists today)

### 1.1 The live renderer is generated pixel grids, not images

World and battle combatants are painted with `fillRect` cells. There is **no** `ctx.drawImage` anywhere in the combat / world renderer.

| Path | Role | Evidence |
| :--- | :--- | :--- |
| `src/frontend/src/data/gameConstants.ts` | Tile + character offset | `TILE_WIDTH = 80`, `TILE_HEIGHT = 40`, `CHARACTER_Y_OFFSET = -9` (lines 6–7, 17) |
| `WorldExploration.tsx` `drawPixelPattern` | World paint | `pixelSize = 3`; pattern centered on `(x, y)` (lines 3658–3701) |
| `WorldExploration.tsx` player draw | Chess-piece pattern by `pieceType` + `playerView` | lines 8678–8720 |
| `data/pieceArt.ts` `drawCombatant` | Single dispatch: boss → summon → ghost/minion → default | lines 825–1011 |
| `data/pieceArt.ts` `drawPatternInline` | Standalone fallback painter | `pixelSize = 3` (lines 741–770) |
| Portrait HUD | Same 8×8 pattern, `pixelSize = 6`, canvas **60×60** | `WorldExploration.tsx` 3526–3580, 18080–18082 |
| Character creation preview | 8×8 cells × `scale = 10` → **80×80** | `CharacterCreation.tsx` 146–148 |
| Character selection preview | `pixelSize = floor(internalSize / 10)` on a 2× canvas | `CharacterSelection.tsx` 321–346 |

`Character.pixelPattern` is persisted (`CharacterCreation.tsx` 283) but **WorldExploration never reads it**. The world player always uses `chessPiecePatterns[pieceType][playerView]`.

### 1.2 Unused URL stubs already exist — they are not a library

| Stub | Stored | Consumed by renderer? |
| :--- | :--- | :--- |
| `EnemyConfig.spriteUrl : ?Text` | Canister + admin text field (`AdminDashboard.tsx` 602–616) | **No.** `WorldExploration` never reads `getEnemyConfigs` / `spriteUrl`. Spawn picks chess `pieceType` + optional `EnemyFamily`. |
| `PlayerSpriteConfig` (`frontUrl` / `rightUrl` / `leftUrl` / `backUrl` + walk-frame URL arrays) | Canister + admin Sprite panel | **No.** `WorldExploration` has zero matches for `getPlayerSpriteConfigs` / `frontUrl`. Admin preview is a 72×72 `<img object-fit:contain>` only (`AdminDashboard.tsx` 1223–1246). |
| Login ad boxes | `adminSetAdBox(index, imageUrl, linkUrl)` — three URL strings | Landing page `<img>`, not combat. |

Caffeine `ExternalBlob` appears in `backend.ts` as the bindgen upload/download adapter. **No visual-asset blob type, no decode pipeline, no SOURCE / NORMALIZED / RENDER_PROFILE split exists.** Do not treat the URL stubs as an implementation.

**Recommendation:** do not wire `spriteUrl` or `frontUrl` straight into `drawCombatant`. They have no validation, no fallback, no instance-stable bind, and no size contract. A new library supersedes them. Existing URL rows may later be imported as library records (VAL-2026-08-31-012).

### 1.3 Entity categories as the game actually classifies them

| Requested category | Current identity | Visual today |
| :--- | :--- | :--- |
| **PLAYER CHARACTER** | `id: "player"`, `pieceType: ChessPieceType` (king/queen/pawn/rook/bishop/knight), 4-way `playerView` | 8×8 `chessPiecePatterns` + character colors |
| **STANDARD ENEMY** | `id: \`enemy-${index}-${Date.now()}\``, `pieceType` random chess piece, `family` starts `"default"` | `drawCombatant` branch 4 — chess pattern. **Family is not used for regular enemies.** |
| **ELITE / LARGE ENEMY** | **Does not exist as a type.** `generateEnemyScaleFactors` stores `scaleX`/`scaleY` in **0.6–1.4** (sometimes non-uniform) on the instance. `iron_golem` is a tanky **family** (HP ×2.5), not an elite flag. | Same chess (or unused family) path × instance scale |
| **BOSS** | Spawn `id: \`boss_${bossConf.id}_${Date.now()}\``, `scaleX/Y = 1.4`, `family: "boss"`. `isBoss` / `bossId` are set at **battle start** if `id.startsWith("boss_")` (`WorldExploration.tsx` 12224–12250) | `getBossPixelPattern` — **8×12** cell grids, then ×1.4. Fallback `P.boss_12` |
| **SUMMON** | `id: \`summon-${Math.random()…}\``, `pieceType` wolf/golem/archer/bomber/wisp, `isSummon`, owner tint | 8×8 `creaturePatterns` + `strokeOwnerTint` |
| **Ghost / boss minion** | `assignedName === "Ghost"` or `isBossMinion` | **Only these** use `getEnemyFamilyPixelPattern` (`pieceArt.ts` 920–946) |
| **Future** | Portals (procedural whirlpool), hazards, loot, walls (`wallHeight = 28`), ads | Not combatant `drawCombatant` |

`EnemyFamily` keys (`gameTypes.ts` 12–20): `wraith_bishop`, `iron_golem`, `plague_rat`, `ember_knight`, `tide_shade`, `bone_scribe`, `void_mirror`, `default`. Family is assigned with 30% chance at spawn (`WorldExploration.tsx` 6236–6326) and changes **stats**, not the default draw path.

### 1.4 Gameplay footprint is already tile-based

`engine/occupancy.ts` (lines 6–15, 78–89): one combatant per logical tile. Passability is in-bounds + walkable + not barrier/portal/void + not occupied. **No width/height is read.**

Targeting (`engine/targeting.ts`) uses Chebyshev / Manhattan on **tiles**. Sprite rects exist only for pointer hit-testing and are a **fixed tile-derived box**, not the painted pattern size (`WorldExploration.tsx` 8479–8498, 8728–8747):

```
drawSize = { w: effectiveTileW, h: effectiveTileH * 1.5 }
  desktop: 80 × 60
  mobile-zoom: 140 × 105
registered h = effectiveTileH/2 + CHARACTER_Y_OFFSET + (effectiveTileH*1.5)/2
  desktop: 20 + (−9) + 30 = 41
```

Custom art must never change occupancy, movement, range, targeting, or combat hitboxes.

### 1.5 Randomness today — and why render-time picks are forbidden

| What | When | Stability |
| :--- | :--- | :--- |
| Enemy `scaleX`/`scaleY` | Spawn (`Math.random`) | Stored on the `Enemy` — stable for the instance, not deterministic across sessions |
| Enemy `id` | `enemy-${length}-${Date.now()}` | Unique for the instance lifetime |
| Boss `id` | `boss_${bossConf.id}_${Date.now()}` | Unique for the instance lifetime |
| Summon `id` | `summon-${Math.random().toString(36).slice(2)}` (`summonSpawn.ts` 137) | Unique for the instance lifetime |
| Family roll | 30% `Math.random` at spawn | Stored on `enemy.family` |
| Combat stats | `seededRng` from `seedKey` (`combatMath.ts` 122–128; `progression.ts` 163–170) | Deterministic for a given key |
| Tile wall tint | `seededRng(gridX * 397 + gridY * 521 + …)` (`WorldExploration.tsx` 4431–4434) | Deterministic per tile |
| **Encounter seed** | **Does not exist** as a first-class field | — |

`seededRng` already exists and is the correct primitive for weighted pool picks. **There is no encounter seed to compose with today.** Map generation and enemy placement use `Math.random()` / `Date.now()`. Visual selection must still be **bound at spawn onto the instance** (`visualAssetId`) so React rerenders and rAF frames cannot change appearance.

**Never call `Math.random()` or pick a pool member inside `drawCombatant` / the rAF loop.**

### 1.6 Owner / admin gate

- `App.tsx` 224: `isAdmin = userRole === "admin"`.
- `AdminDashboard.tsx` 4760–4761: hard deny if `!isAdmin`.
- Backend `adminSet*` / `adminDelete*` require `#admin` (`main.mo` 567–579 and siblings).
- First non-anonymous `getUserRole` caller becomes admin (`docs/ARCHITECTURE.md`).
- `AGENTS.md`: admin/debug features must be dev-only/gated and never ship to normal players.

The library UI is an **admin-only** panel. Players never upload or choose combat art.

### 1.7 Mobile / tablet

- `SmallScreenGuard` blocks viewports **&lt; 768px** (`App.tsx` 26–28, `ARCHITECTURE.md` 227).
- `useIsMobile()` is the same 768 breakpoint (`hooks/use-mobile.tsx` 3–11).
- When `isMobile` is true: `MOBILE_ZOOM = 1.75` → tiles **140×70**; camera follows (`WorldExploration.tsx` 818–821).
- **Pixel patterns do not multiply by `MOBILE_ZOOM`.** A 24×24 character is relatively smaller on zoomed tiles.

Custom assets should follow the same rule unless a render profile explicitly opts into tile-relative scale (not the default).

---

## 2. Visual fallback invariant

Resolution order for every combatant, every frame:

1. **Bound instance assignment** — `entity.visualAssetId` points at a library record that is `ACTIVE`, `VALIDATION_STATUS = ok`, bytes decode, and category/eligibility still match.
2. **Bound pool assignment** — `entity.visualPoolId` was resolved at spawn into a stored `visualAssetId` (step 1). If the stored id is now invalid, **do not re-roll in render.** Fall through.
3. **Built-in / generated pixel visual** — current `drawCombatant` / `drawPixelPattern` path.

Hard rules:

- Missing, inactive, corrupt, undecodable, oversized, or ineligible custom assets **immediately** use step 3.
- Empty library ⇒ every entity is step 3. No upload required to ship a new enemy or boss.
- New `BossConfig` / `EnemyConfig` / summon `pieceType` automatically works with generated pixels.
- Failures log once (reuse `logPatternLookupFailed` throttling in `pieceArt.ts` 37–55), never throw, never block combat.

Suggested helper (new module, not WorldExploration):

```ts
// src/frontend/src/engine/visualAssets.ts  (not implemented in this PR)
function resolveRuntimeVisual(entity, library): RuntimeVisual
  // "custom" | { kind: "builtin" }
```

`drawCombatant` grows **one optional branch at the top**: if `resolveRuntimeVisual` returns a decoded bitmap + render profile, `drawImage` at the same anchor as `drawPixelPattern`; otherwise existing branches 1–4 run unchanged.

---

## 3. Derived render measurements (do not invent)

All sizes below are **logical CSS pixels** after `ctx.scale(dpr)` (`WorldExploration.tsx` 7591–7602). Source bitmaps may be integer multiples for sharpness.

### 3.1 Tile, anchor, scale

| Quantity | Desktop | Mobile-zoom (`isMobile`) | Source |
| :--- | ---: | ---: | :--- |
| Iso diamond | 80 × 40 | 140 × 70 | `TILE_*` × `MOBILE_ZOOM` 1.75 |
| `gridToScreen` | **top vertex** of the diamond | same | `WorldExploration.tsx` 3590–3605, 3632–3634 |
| Tile visual center | top + `th/2` → +20 / +35 | | `tileCenter` 3622–3628 |
| Character draw point | `(tileTopX, tileTopY − CHARACTER_Y_OFFSET)` = `(tileTopX, tileTopY + 9)` | same offset | `drawCombatant` 838–840; player 8712–8713 |
| Pattern **anchor** | **center of the pattern** on the draw point | same | `startX = x − patternWidth/2` (3677–3678, 752–753) |
| Drop-shadow foot | `(tileTopX, tileTopY + th/2 + 4)` | | 8424–8428 |
| World cell size | **3×3** logical px × `scaleX`/`scaleY` | **not** × 1.75 | 3672 |
| Default pattern | **8×8 cells** | | `chessPiecePatterns`, `creaturePatterns` |
| Default drawn size @ scale 1 | **24 × 24** | 24 × 24 | 8 × 3 |
| Enemy instance scale | 0.6–1.4 (stored) | same | `generateEnemyScaleFactors` 4928–4954 |
| Max standard drawn @ 1.4 | **33.6 × 33.6** | 33.6 × 33.6 | 24 × 1.4 |
| Boss pattern | **8×12 cells** (all inspected `boss_*` / named bosses) | | `getBossPixelPattern` 3706–4146 |
| Boss drawn @ 1.0 | **24 × 36** | | 8×3 × 12×3 |
| Boss spawn scale | **1.4 × 1.4** (not random) | | 6988–6989 |
| Boss drawn @ 1.4 | **33.6 × 50.4** | | |
| Family grids (ghost/minion only) | 3–7 cols × 3–8 rows | | 4148–4214 |
| Portrait | 60×60 canvas, 6px cells → 48×48 art | | 3538, 18080–18082 |
| Creation preview | 80×80 (8 × 10) | | `CharacterCreation.tsx` 146 |
| Name label | `screenPos.y − 34` | | 8516 |
| Level label | name + 14 | | 8517 |
| Status icons | draw point − 30 | | 8640 |
| Summon lifespan badge | `screenPos.y − 48` | | 8541 |
| Sprite hit `drawSize` | 80 × 60 | 140 × 105 | 8497, 8747 |
| Wall extrusion | 28 px | | 4430 |
| Viewport floor | phones &lt; 768 blocked | tablet uses zoom | `SmallScreenGuard` |

**Anchor for custom bitmaps must match the pixel path:** center the image on `(tileTopX, tileTopY + 9)`, not on tile center and not on a foot bone, unless a future render profile adds an explicit `anchor: "foot"` (not in the current renderer).

### 3.2 Per-category upload specification

Show this table **before** the file picker (VAL-2026-08-31-003). Reject or warn — **never silently scale, crop, or stretch**.

Shared:

| Field | Value | Why |
| :--- | :--- | :--- |
| `SUPPORTED_FORMATS` | `image/png` required; `image/webp` accepted if `createImageBitmap` succeeds | Pixel path is transparent (`cell === 0` skipped). JPEG has no alpha. SVG/GIF not used anywhere in combat. |
| `TRANSPARENCY_REQUIREMENT` | At least one pixel with alpha &lt; 255 | Opaque rectangles sit as boxes on the diamond. |
| `ANIMATION_SUPPORT` | **Four stills** (`front` / `right` / `left` / `back`) matching `ViewDirection` | `playerView` updates on step (`WorldExploration.tsx` 11690–11697). `walkFrames*` exist on `PlayerSpriteConfig` but are **never drawn**. Do not implement walk cycles in v1. |
| `MAX_FILE_SIZE` | **Not measured in-repo.** Caffeine `ExternalBlob` has no documented cap here. | Implementation must measure IC ingress + object-store limits, then write the cap into the profile. Design starting reject: **256 KiB per still** after encode (typical PNG at recommended size is tens of KB). Do not store raw base64 in Motoko `Text`. |

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
| `DEFAULT_SCALE` | **1** (instance `scaleX`/`scaleY` still apply to **builtin** pixels only unless the asset opts in) | Custom art should **not** inherit the random 0.6–1.4 squash (`generateEnemyScaleFactors`). That squash is a pixel-art variety trick; stretching a painted illustration with it is the “arbitrary stretch” this design forbids. |
| `MAX_SAFE_VISUAL_FOOTPRINT` | 48 × 48 | |

#### ELITE / LARGE ENEMY — profile `enemy_elite` (future category)

No elite type exists. Do **not** invent gameplay size. If metadata `ELITE_ONLY` is used:

| Spec | Value | Derivation |
| :--- | :--- | :--- |
| `RECOMMENDED_WIDTH` / `HEIGHT` | **34** | ceil(24 × 1.4) — current max instance scale |
| `MAX_WIDTH` / `MAX_HEIGHT` | **80** / **60** | same tile/hit box as standard — **visual only** |
| `DEFAULT_SCALE` | **1** on a 34×34 recommended asset | Do not also multiply by 1.4 |
| `MAX_SAFE_VISUAL_FOOTPRINT` | 56 × 56 | under tile width; warn if &gt; 48 |

Occupancy stays **one tile**.

#### BOSS — profile `boss_large`

Bosses already render larger via a **dedicated 8×12 pattern + fixed 1.4 scale**, not a stretched 8×8 enemy.

| Spec | Value | Derivation |
| :--- | :--- | :--- |
| `RECOMMENDED_WIDTH` | **34** | ceil(8 × 3 × 1.4) |
| `RECOMMENDED_HEIGHT` | **50** | ceil(12 × 3 × 1.4) |
| `MAX_WIDTH` | **80** | tile width; do not span two columns |
| `MAX_HEIGHT` | **72** | above current 50.4; labels/icons will clip — preview must warn |
| `ANCHOR` | center / draw point (same as now) | `drawCombatant` boss branch |
| `DEFAULT_SCALE` | **1** on the recommended bitmap | Do **not** apply the 1.4 enemy/boss pixel scale on top of a 34×50 upload (double-size). If the owner uploads a 24×36 “pixel-match” sheet, the boss profile may apply 1.4 to match today’s look. |
| `MAX_SAFE_VISUAL_FOOTPRINT` | 64 × 72 | still one tile occupancy |
| `ANIMATION_SUPPORT` | 4 stills optional; v1 may be a single `front` | Bosses spawn `currentView: "front"` (6981) |

Never assign `enemy_standard` art to a boss and scale it up.

#### SUMMON — profile `summon_standard`

| Spec | Value | Derivation |
| :--- | :--- | :--- |
| Same box as player/standard | 24 recommended, 80×60 max | 8×8 `creaturePatterns` |
| Extra | Keep `strokeOwnerTint` (green/red) around the **runtime** footprint | `pieceArt.ts` 779–798, 912–914 |
| `MAX_SAFE_VISUAL_FOOTPRINT` | 48 × 48 | lifespan badge at y−48 will collide with tall art — warn |

### 3.3 Aspect ratio and pixel-count gates

| Check | Rule |
| :--- | :--- |
| Aspect vs recommended | Warn if `|w/h − recW/recH| > 0.15`. Reject only if the owner did not confirm. |
| Pixel count | Reject if `w * h > MAX_WIDTH * MAX_HEIGHT` **after** intended scale (prevents 4096² uploads). |
| Decode | `createImageBitmap` / decode must succeed; on failure → reject, builtin fallback if already assigned. |
| MIME | Trust decoded type, not the extension. |
| Distortion | If the owner insists on a non-matching size, draw **unscaled** (or integer nearest-neighbor) inside the profile box with **transparent pad**. Never `drawImage` stretch to fill. |

### 3.4 SOURCE / NORMALIZED / RENDER_PROFILE (proposed — does not exist)

Introduce only if implementation needs 2×/4× sources:

| Layer | Role |
| :--- | :--- |
| `SOURCE ASSET` | Owner file + hash + original width/height/MIME |
| `NORMALIZED RUNTIME ASSET` | PNG/WebP stills at recommended size (or integer 2×), nearest-neighbor, no color remap |
| `RENDER PROFILE` | Category box, anchor, default scale, max footprint, whether to apply instance `scaleX/Y` (default **false** for custom) |

Until that pipeline exists, **source === runtime**. Validation uses the category profile directly.

---

## 4. Library metadata

Backend-authoritative (`localStorage` cache only, same as other admin config). Suggested Motoko / TS record:

| Field | Type | Notes |
| :--- | :--- | :--- |
| `ASSET_ID` | Text | Stable id. Never reuse after delete. |
| `DISPLAY_NAME` | Text | Owner rename. |
| `ENTITY_CATEGORY` | variant | `#player` `#enemyStandard` `#enemyElite` `#boss` `#summon` `#future(Text)` |
| `ENTITY_FAMILY` | [Text] | Empty = any family. Else `EnemyFamily` / `boss` / summon pieceType. |
| `ENTITY_IDS` | [Text] | Explicit binds: `player`, `boss_3`, `summon-dire-wolf` pieceType, future ids. Empty = pool-only. |
| `VARIANT_TAGS` | [Text] | Owner tags (`undead`, `phase2`). Matching is explicit, never name heuristics. |
| `ACTIVE` | Bool | Inactive assets are invisible to resolver. |
| `WEIGHT` | Nat | Pool weight. 0 = never randomly selected (direct assign only). |
| `RARITY` | Text | Display/filter only. Does not change combat. |
| `ELITE_ONLY` | Bool | Eligible only if instance is marked elite (future). If no elite flag exists, treat as ineligible for random pools. |
| `BOSS_ONLY` | Bool | Eligible only for `isBoss` / `id.startsWith("boss_")`. |
| `UPLOAD_DATE` | Nat | Timestamp. |
| `VERSION` | Nat | Increments on replace. |
| `SOURCE_METADATA` | record | hash, MIME, original w/h, byte length, uploader principal. |
| `RENDER_PROFILE` | Text | `player_standard` / `enemy_standard` / `enemy_elite` / `boss_large` / `summon_standard`. |
| `VALIDATION_STATUS` | variant | `#ok` `#pending` `#invalid(Text)` |
| `BLOB_REF` | opt | Caffeine object id **or** (legacy import) URL. Prefer blob. |
| `DIRECTION_REFS` | record | opt front/right/left/back stills. Missing directions fall back to `front`, then builtin. |
| `PREVIOUS_VERSION` | opt Text | For revert / dependency inspect. |

Assignments (separate map, so one asset can serve many binds):

| Field | Meaning |
| :--- | :--- |
| `targetKind` | `#entity` `#family` `#pool` `#pieceType` |
| `targetId` | e.g. `boss_1`, `iron_golem`, `pool_undead_standard`, `wolf` |
| `assetId` | Direct bind (priority 1) |
| `poolId` | Weighted pool (priority 2) |
| `active` | Soft disable without delete |

Pools:

| Field | Meaning |
| :--- | :--- |
| `poolId` | Stable |
| `category` | Eligibility gate |
| `entries` | `{ assetId, weight }` — only `ACTIVE` + `#ok` + matching flags participate |
| `fallback` | Always builtin |

---

## 5. Owner operations

All `#admin` only. Players never see this UI.

| Operation | Behavior |
| :--- | :--- |
| **Upload** | Show category spec → pick files (1–4 directions) → validate → store source + metadata `ACTIVE=false` until owner activates. |
| **Preview** | Iso diamond 80×40, draw point +9, player 24×24 pixel dummy, one standard enemy dummy, optional boss dummy. Actual scale. Warn clip / pad / overlap / tablet zoom. |
| **Activate / deactivate** | Toggle `ACTIVE`. Deactivate → live instances with that id fall back **next frame** (resolver), no re-roll. |
| **Rename** | `DISPLAY_NAME` only. |
| **Replace / version** | New bytes, `VERSION++`, keep `ASSET_ID`. Live binds keep the id; runtime reloads blob. Old bytes retained until `PREVIOUS_VERSION` prune. |
| **Safe removal** | Dependency inspect first. If any assignment or live instance id matches: block hard-delete, offer deactivate. After zero dependents, delete blob + row. |
| **Assign to entity** | `ENTITY_IDS` / assignment row. Priority 1. |
| **Assign to family** | `ENTITY_FAMILY`. Used when no entity id bind. |
| **Assign to pool** | Weighted. Resolved **once at spawn**. |
| **Weighted random** | `seededRng(hash(encounterSeed, instanceId, poolId))` then walk cumulative weights. |
| **Revert to default** | Clear assignment / `visualAssetId`. Builtin immediately. |
| **Dependency inspection** | List assignments, pools, and (best-effort) current-map instance ids using the asset. |

---

## 6. Stable assignment (spawn time, not React render)

### 6.1 Bind field

Add optional `visualAssetId?: string` (and optional `visualPoolId?: string`) on `Enemy` / summon spawn objects. **Write at spawn / summon / boss portal.** Read-only in the rAF path.

### 6.2 Encounter seed (introduce; do not reuse mapGen)

No encounter seed exists. Add a **presentation-only** `encounterVisualSeed: number` on the current map ref when a map (or boss room) is committed — e.g. hash of `mapCount`, dungeon depth, portal id, and the same `Date.now()` already used in enemy ids. **Do not change `mapGen.ts`.** Do not feed this seed into occupancy, AI, or damage.

### 6.3 Deterministic pick

```
seed = hash(encounterVisualSeed, instanceId, poolId)
rng  = seededRng(seed)          // combatMath.ts 122–128
pick = weightedChoice(eligible, rng)
entity.visualAssetId = pick?.id ?? undefined
```

Eligible = `ACTIVE` ∧ `#ok` ∧ category match ∧ (empty ENTITY_IDS or contains this id) ∧ family/tags ∧ not (ELITE_ONLY unless elite) ∧ not (BOSS_ONLY unless boss).

If `eligible.length === 0` → leave `visualAssetId` unset → builtin.

Rerenders, camera, hover, and React Strict Mode must not call this again. Portal / death cleanup drops the instances; the next map gets a new seed.

### 6.4 Player

Not random. Assignment is `#entity` / `#pieceType` (king…knight). Direction follows `playerView`. Missing direction → `front` still → builtin.

### 6.5 Summons

Resolve in `spawnSummonUnit` (`summonSpawn.ts`) using `pieceType` + encounter seed + `summonId`. Store on the summon object. Owner tint still wraps the runtime footprint.

---

## 7. Preview studio (admin)

A small canvas (not the live RAF loop) that reuses:

- `TILE_WIDTH` / `TILE_HEIGHT`
- `gridToScreen` math (or a copy in `engine/visualPreview.ts`)
- `CHARACTER_Y_OFFSET`
- `drawPixelPattern` / `drawCombatant` for dummies
- nearest-neighbor `imageSmoothingEnabled = false` (HUD already uses `imageRendering: pixelated`)

Layout: 3-tile strip — [standard enemy] [uploaded asset] [player]. Optional fourth tile for boss profile.

Warnings (computed, not guessed):

| Warning | Condition |
| :--- | :--- |
| Clipping (labels) | Image top &lt; `tileTop − 34` |
| Clipping (badge) | Summon profile and image top &lt; `tileTop − 48` |
| Padding | Transparent margin &gt; 25% on any side |
| Scale | Decoded size ≠ recommended |
| Neighbor overlap | Width &gt; 40 (half tile) — soft; width &gt; 80 — hard reject |
| Tablet risk | Projected size vs 140×70 tiles (asset stays 24px) — informational |
| Hit-rect overflow | Drawn box outside 80×60 `drawSize` — pointer may miss the art (hit box stays tile-sized on purpose) |

---

## 8. Storage and safety

| Do | Don't |
| :--- | :--- |
| Metadata + assignment maps on the canister (`#admin` writes, public read of **active metadata only** if the client must resolve; or admin-only query + client cache) | Put multi-megabyte base64 in Motoko `Text` |
| Bytes in Caffeine object storage (`ExternalBlob` already in bindgen) or another measured blob store | Hotlink arbitrary player URLs in combat |
| Content-address `SOURCE_METADATA.hash` | Trust MIME from the filename |
| Import existing `spriteUrl` / `frontUrl` as **inactive** library rows if the owner wants | Auto-enable unused URL stubs |
| Cache decoded bitmaps in a `Map<assetId, ImageBitmap>` keyed by id+version | Decode on every rAF |

If blob storage is not ready, v1 may keep **admin-only URL** refs with decode-at-load and the same validation — still never required for gameplay.

---

## 9. Implementation placement (when a human picks IDs)

Per `AGENTS.md` and AQA-2026-08-30-007:

- New logic: `src/frontend/src/engine/visualAssets.ts` (+ tests) and optionally `visualPreview.ts`.
- Backend: new types in `src/backend/main.mo` (canonical actor), **not** `backend_extended/`.
- Admin UI: new panel in `AdminDashboard.tsx` (already gated).
- WorldExploration: **one-line** call-site — pass `visualAssetId` into `drawCombatant` / resolve before draw. **Do not** edit the RAF loop, map generation, turn logic, or damage math.
- `drawCombatant` may gain an optional `getCustomVisual?: (entity) => CustomVisual \| null`.

Phasing (implementers, not this PR):

0. Types + `resolveRuntimeVisual` + empty-library tests (behavior identical to today).  
1. Admin metadata CRUD without bytes.  
2. Upload validation + preview canvas.  
3. Spawn-time bind + `encounterVisualSeed`.  
4. Optional `drawImage` branch + instant fallback.  
5. Pools, versioning, safe delete, dependency inspect.

---

## 10. Regression surface

| Risk | Mitigation |
| :--- | :--- |
| Empty library changes look | Resolver short-circuits to builtin; golden tests: no `drawImage` when library `[]` |
| Random flicker | Bind at spawn; tests: 100 fake renders same `visualAssetId` |
| Boss looks like a stretched pawn | Separate `boss_large` profile; forbid applying 1.4 on top of recommended boss bitmaps |
| Occupancy / targeting drift | No reads of image size in `occupancy.ts` / `targeting.ts` |
| WX rAF churn | Extracted helper; WX wiring only |
| Stale `spriteUrl` wired by mistake | VAL-2026-08-31-012 — migrate or ignore, do not bind raw |
| Family owners expect family pixels | Today family art is **ghost/minion only**. Custom family assign is new presentation, not a fix of that gap (VAL-2026-08-31-013) |
| Canister bloat | Blob store + 256 KiB starting cap pending measurement |
| Player-facing upload | Admin + `#admin` only |

---

## 11. Validation required (before calling the system done)

1. Boot with **zero** assets — new enemy, new boss, summon, player: identical to current pixels.  
2. Invalid / inactive / corrupt bind → builtin the same frame.  
3. Pool pick stable across 60 rAF frames and a React state tick.  
4. Preview warnings match measured clip (label y−34, tile 80×40).  
5. Occupancy still one tile when a 64×72 boss image is bound.  
6. `pnpm typecheck` / `pnpm fix` / `pnpm build` clean.  
7. Admin denied for non-admin principal.

---

## 12. Future category registry

Add categories only with an explicit render profile (tile box + anchor + max). Until then `#future(Text)` records are stored but **resolver treats them as ineligible** → builtin / current procedural art (portals, walls, loot). No name-based matching.
