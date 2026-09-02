# Custom Visual Asset Library & Assignment — 2026-09-02 re-inspection

**Designer:** Visual Asset Library & Assignment Designer  
**Date:** 2026-09-02  
**HEAD:** `58302bc` (`Merge pull request #258`)  
**Source automation:** cron `0 */48 * * *`  
**Gameplay / production code:** not modified.  
**Prior designs:** [`VISUAL_ASSET_LIBRARY_DESIGN_2026-08-31.md`](./VISUAL_ASSET_LIBRARY_DESIGN_2026-08-31.md) (merged PR #121), [`VISUAL_ASSET_LIBRARY_DESIGN_2026-09-01.md`](./VISUAL_ASSET_LIBRARY_DESIGN_2026-09-01.md)  
**Prior ACTION_IDs:** `VAL-2026-08-31-001` … `019`; `VAL-2026-09-01-001` … `011`  
**This run ACTION_IDs:** [`ACTION_IDS_VAL_2026-09-02.md`](./ACTION_IDS_VAL_2026-09-02.md)

**Invariant:** custom visuals are optional. The current built-in / generated pixel visual remains default and fallback. An empty library must be indistinguishable from today. New enemies and bosses must work with generated pixels and no uploads. Artwork upload is never mandatory.

This document re-derives every size from the **live** renderer. Invented sprite boxes (64×64, 128×128) are not used. Pixel boxes did not change. Several **architecture and product** facts did.

---

## 0. Verdict

| Question | 2026-09-02 answer |
| :--- | :--- |
| Does a custom visual library exist? | **No.** `engine/visualAssets.ts` / `visualPreview.ts` are absent. `src/` has **zero** `ctx.drawImage` and **zero** `createImageBitmap`. |
| Empty library == today’s look? | **Yes, by default** — combat never reads custom bytes. |
| Can owners upload and assign art that appears in combat? | **No.** Admin URL stubs persist; WorldExploration never reads them. |
| Did recommended dimensions change? | **No.** Tile 80×40, cell 3px, standard 24×24, boss 8×12 × 1.4 ≈ 34×50. |
| What shipped since 09-01? | **Copy honesty** for unused enemy/player sprite URLs (`adminVisualStatus.ts`, VAL-2026-09-01-001). **Boss/family pixel tables** hoisted to `engine/enemyPixelPatterns.ts` (perf; tables unchanged). |
| What did 09-01 get wrong? | `SmallScreenGuard` is **not** a hard block. Continue + `sessionStorage` `pbv_small_screen_continue` lets phones enter. `MOBILE_ZOOM` 1.75 is a live combat path. |

Do **not** implement by wiring `EnemyConfig.spriteUrl` or `PlayerSpriteConfig.frontUrl` into `drawCombatant`. That path has no decode, no size contract, no spawn-stable bind, and WorldExploration does not load `getEnemyConfigs` / `getPlayerSpriteConfigs`.

---

## 1. Delta vs 2026-09-01

| Topic | 2026-09-01 | 2026-09-02 (this tree) |
| :--- | :--- | :--- |
| `WorldExploration.tsx` | 20064 lines; patterns inline | **19253** lines; boss/family tables extracted |
| `getBossPixelPattern` | WX ~3929–4347 | **`engine/enemyPixelPatterns.ts` 430–432**, fallback `boss_12` |
| Family grids | WX ~4349–4415 | **`enemyPixelPatterns.ts` 434–498** |
| `drawPixelPattern` | WX ~3859–3904 | WX **3802–3846**, `pixelSize = 3`, center `x − w/2` |
| `generateEnemyScaleFactors` | ~5130–5156 | **4545–4571**, still `Math.random` squash 0.6–1.4 stored on instance |
| Enemy spawn id | ~6394 | **5809** `enemy-${n}-${currentTime}` |
| Family 30% roll | ~6447–6538 | **5862–5953** — still **stats only**; draw still chess for regular family |
| Boss spawn | ~7189 / scale 7200 | **6609–6621** `boss_${id}_${Date.now()}`, `scaleX/Y = 1.4` |
| Battle `isBoss` | ~12522 | **12073–12074** `id.startsWith("boss_")` |
| Player facing | ~12058 | **11601–11604** `setPlayerView` on step |
| Sprite hit box | ~8722 | **8139–8156** still stores `drawAnchor` + `drawSize` (tile-derived) |
| Name / level labels | ~8758 | **8175–8176** `screenPos.y − 34` / +14 |
| Summon lifespan badge | `(x+18, y−48)` | **8199–8200** unchanged |
| Player draw | ~8951 | **8368–8379** still **not** `drawCombatant` |
| Portrait | ~18473 | **18126–18128** canvas **60×60**, cells 6px (**3681**) |
| Drop shadow | mentioned | **8087–8107** / **8344–8365** — tile-foot ellipse, **not** pattern-sized |
| `ctx.scale(dpr)` | ~7896 | **7317** (and **14064** second canvas) |
| `gridToScreen` | ~3805 | **3733–3751** — now **cached** by `x,y`; still **top vertex** |
| Admin deny | ~5040 | **5469** `if (!isAdmin)` |
| `App.tsx` `isAdmin` | ~260 | **285** `userRole === "admin"` |
| Admin sprite URL copy | claimed live “Custom visual” | **Honest:** `Stored URL — not rendered in world` (`adminVisualStatus.ts`; EnemyEditor **809–836**; list chip **2140–2202**) |
| Walk-frame URL UI | present | **Still present** (`AdminDashboard.tsx` 1580–1609) with **no** stored-not-rendered note |
| Ad box copy | “Custom Visual — override URLs set” | **Unchanged at 7975–7977** — **landing ads actually render** (`LandingPage.tsx` 721). Not a combat lie. |
| `getEnemyConfigs` in WX | unused | still **zero** matches |
| `engine/visualAssets.ts` | proposed | still **absent** |
| `isElite` | absent | still **absent**. `worldFeatures.ts` 43 / 450 `elite_patrol` is a **catalog string** |
| Encounter seed | absent | still **absent**. `seededRng` hashes `seedKey` in `getEnemyBaseStats` (`progression.ts` 163–170) |
| Viewport &lt;768 | documented as **blocked** | **Wrong.** Continue (`App.tsx` 43, 107–119, 390–406). After bypass, `useIsMobile` applies `MOBILE_ZOOM` |
| `DrawCombatantOptions` | no image hook | still **no** `getCustomVisual` (`pieceArt.ts` 702–732) |
| PR #121 / VAL-001 copy | 09-01 asked for honesty | **Implemented** (`8ebecca`) |

Sibling designs that must not fork this library:

- `EBA-2026-08-31-017` — per-entity `visualMode: none|asset|pool`, default **none**. Implement **after** VAL resolver, not as `drawImage(spriteUrl)`. `EnemyConfig` still has only `spriteUrl` (`gameTypes.ts` 108–119).
- `ENEMY_ELITE_EVOLUTION_2026-09-01.md` — still **PROPOSED**. No live `isElite`. `ELITE_ONLY` assets stay ineligible (`VAL-2026-08-31-019`).

Open PR stack at inspection: only **#259** (draft, GameKey EOP migration). This design is docs-only under `docs/automation/`.

---

## 2. Inspection — what actually paints

### 2.1 Combat is generated `fillRect` grids

| Path | Role | Evidence |
| :--- | :--- | :--- |
| `src/frontend/src/data/gameConstants.ts` | Tile + offset | `TILE_WIDTH = 80`, `TILE_HEIGHT = 40`, `CHARACTER_Y_OFFSET = -9` (lines 6–7, 17) |
| WX `drawPixelPattern` | World paint | `pixelSize = 3`; pattern **centered** on `(x, y)` (3802–3846) |
| `data/pieceArt.ts` `drawPatternInline` | Standalone fallback | same 3px + center (741–770) |
| `data/pieceArt.ts` `drawCombatant` | Single dispatch: boss → summon → ghost/minion → default | 825–1011 |
| `engine/enemyPixelPatterns.ts` | Boss 8×12 tables + family grids (hoisted so RAF does not allocate literals) | `boss_1` 10–24; `getBossPixelPattern` 430; family 434–498 |
| WX player | `chessPiecePatterns[pieceType][playerView]` | 8342, 8368–8379 |
| Portrait HUD | 8×8 × `pixelSize = 6` on **60×60** | 3681–3685, 18126–18128 |
| Character creation | 8×8 × `scale = 10` → **80×80** art on a **320×280** canvas | `CharacterCreation.tsx` 146–148, 462–465 |
| Character selection | `pixelSize = floor(internalSize / 10)` on a **120** CSS box (internal 240) | `CharacterSelection.tsx` 310–348 |
| Death juice | `fillRect` fragments | `engine/effects.ts` 282–292 |

`Character.pixelPattern` is persisted (`CharacterCreation.tsx` 283) but WorldExploration **never reads it**. The world player always uses `chessPiecePatterns[pieceType][playerView]`.

Repo-wide: no `ctx.drawImage`, no `createImageBitmap`. There is **no** SOURCE / NORMALIZED / RENDER_PROFILE pipeline. Until one is added, source === runtime.

`DrawCombatantOptions` (`pieceArt.ts` 702–732) injects `getBossPattern`, `getFamilyPattern`, `getFamilyColors`, `drawPattern`, `characterYOffset`. It does **not** accept a bitmap. A custom path must be a new optional top branch (or a new option), not `drawImage` inside `drawPixelPattern` (that function only `fillRect`s cells).

### 2.2 Unused URL stubs — still not a library

| Stub | Stored | Consumed by combat? |
| :--- | :--- | :--- |
| `EnemyConfig.spriteUrl : ?Text` | Canister + admin text (`AdminDashboard.tsx` 809–836) | **No.** WX has zero `getEnemyConfigs` / `spriteUrl`. Spawn picks chess `pieceType` + optional `EnemyFamily`. |
| `PlayerSpriteConfig` direction + walk-frame URL arrays | Canister + Sprite panel | **No.** WX has zero `getPlayerSpriteConfigs` / `frontUrl`. Preview is 72×72 `<img object-fit:contain>` (1478–1499). |
| Login ad boxes | `adminSetAdBox` URL strings | Landing `<img>` (`LandingPage.tsx` 721) — **not combat**. Copy “Custom Visual — override URLs set” (7975–7977) is honest **for ads**. |

Enemy/player URL copy is honest after VAL-2026-09-01-001:

- Empty → `Default Pixel Visual — Active fallback`
- Filled → `Stored URL — not rendered in world`
- Catalog notes: spawn still uses chess-piece pixels (`AdminDashboard.tsx` 2085–2089, 1771–1774)

**Walk Animation Frames** (`AdminDashboard.tsx` 1580–1609, cap 16 strings in `adminGuard.mo` 282–284) still have **no** stored-not-rendered disclaimer. Combat never samples those arrays. Do not implement walk cycles to make the section true (`VAL-2026-08-31-018`).

`adminGuard.validateOptionalUrl` (`src/backend/lib/adminGuard.mo` 115–120) checks **length ≤ 2048** (`MAX_URL` line 10) and `unsafeUrl` (`javascript:` / `data:` / `vbscript:`, 71–76). It does **not** decode images, check MIME, or enforce pixel boxes. Empty URL is valid.

`adminContract.test.ts` 191–197 and `adminVisualStatus.test.ts` 47–54: empty `spriteUrl` tuple is **not** a custom asset. Keep that.

Caffeine `ExternalBlob` is bindgen plumbing (`backend.ts` 54–55). No visual-asset blob type exists.

### 2.3 Entity categories as the game classifies them

| Requested category | Current identity | Visual today |
| :--- | :--- | :--- |
| **PLAYER CHARACTER** | `id: "player"`, `pieceType` chess, 4-way `playerView` | 8×8 `chessPiecePatterns` + character colors. Not `drawCombatant`. |
| **STANDARD ENEMY** | `id: \`enemy-${n}-${currentTime}\``, random chess `pieceType`, `family` starts `"default"` | `drawCombatant` branch 4. **Family is not used for regular enemies.** |
| **ELITE / LARGE ENEMY** | **No type.** `generateEnemyScaleFactors` stores visual squash 0.6–1.4. `iron_golem` is family HP paper, not elite. `elite_patrol` is a world-feature catalog key only (`worldFeatures.ts` 43, 450). | Same chess path × instance scale |
| **BOSS** | `id: \`boss_${bossConf.id}_${Date.now()}\``, `scaleX/Y = 1.4`, `family: "boss"`. `isBoss` / `bossId` set at **battle start** if `id.startsWith("boss_")` | `getBossPixelPattern` — **8×12** (`enemyPixelPatterns.ts` 10–24), fallback `boss_12` (252–266, 430–432) |
| **SUMMON** | `id: \`summon-${Math.random()…}\`` (`summonSpawn.ts` 149) | 8×8 `creaturePatterns` + `strokeOwnerTint` (`pieceArt.ts` 779–798, 911–914) |
| **Ghost / boss minion** | `assignedName === "Ghost"` or `isBossMinion` | **Only these** use `getEnemyFamilyPixelPattern` (`pieceArt.ts` 920–946) |
| **Future** | Portals (whirlpool radius 25, WX 3859), hazards, loot, walls (`wallHeight = 28` at 4046), ads | Not `drawCombatant` |

`EnemyFamily` (`gameTypes.ts` 12–20): `wraith_bishop`, `iron_golem`, `plague_rat`, `ember_knight`, `tide_shade`, `bone_scribe`, `void_mirror`, `default`. Assigned with 30% chance (WX 5940–5952). Changes **stats** (and three combat hooks), not the default draw path.

Family grids exist (`enemyPixelPatterns.ts` 434–498) but are unused for those 30% units:

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

Admin `PlayerSpriteConfig.characterPieceType` includes the string `"custom"` (`AdminDashboard.tsx` 1249). Live `Character.pieceType` is the chess union (`gameTypes.ts` 5–11). Do not treat admin `"custom"` as a combat visual category.

### 2.4 Gameplay footprint is tile-based

`engine/occupancy.ts` 84–96: one combatant per logical tile. No width/height.

Targeting is tile Chebyshev / Manhattan. Sprite rects are a **fixed tile-derived box**, not the painted pattern (`WorldExploration.tsx` 8139–8156, 8388–8406):

```
drawSize = { w: effectiveTileW, h: effectiveTileH * 1.5 }
  desktop: 80 × 60
  mobile-zoom: 140 × 105
registered h = effectiveTileH/2 + CHARACTER_Y_OFFSET + (effectiveTileH*1.5)/2
  desktop: 20 + (−9) + 30 = 41
drawAnchor = (tileTopX, tileTopY − CHARACTER_Y_OFFSET) = (tileTopX, tileTopY + 9)
```

Custom art must never change occupancy, movement, range, targeting, or combat hitboxes. Do not rewrite `drawSize` from bitmap width/height (`VAL-2026-09-01-003`).

Drop shadow is a **separate** ellipse at `(tileTopX, tileTopY + th/2 + 4)` with radius `min(tileW*0.35, tileH*0.3)` (WX 8087–8107). It does not track sprite pixels. Tall custom art will visually disconnect from the shadow; preview must warn. Do not grow the shadow from bitmap size.

### 2.5 Randomness — bind at spawn, never in render

| What | When | Stability |
| :--- | :--- | :--- |
| `generateEnemyScaleFactors` | spawn | `Math.random`, then **stored** on `scaleX`/`scaleY` |
| Enemy / boss ids | spawn | `Date.now()` / `Math.random` in the id string |
| Family 30% | spawn | `Math.random`, stored on `family` |
| Battle stats | `getEnemyBaseStats` | `seededRng` from charCode-sum of `seedKey` (`progression.ts` 163–170) |
| Map tiles / Boss Rush cells | generate | `seededRng(seed)` (WX 4050+) |
| **Encounter visual seed** | — | **Does not exist** |
| rAF / React render | every frame | Must **not** pick art |

`seededRng` (`combatMath.ts` 122–128) is the correct primitive for weighted pool picks. There is still **no** encounter seed. Visual selection must be **written onto the instance at spawn** (`visualAssetId`) so React rerenders and rAF cannot change appearance.

Do **not** block implementation on inventing a map-level encounter seed. Hash the **already unique instance id** (plus `poolId` / assignment config) the same way `getEnemyBaseStats` hashes `seedKey`. Summon ids (`summonSpawn.ts` 149) are random but **stable for the live object**; bind once at spawn, never when `turnsRemaining` ticks.

**Never call `Math.random()` or pick a pool member inside `drawCombatant` / the rAF loop / a React render.**

Custom art must **not** inherit instance `scaleX`/`scaleY` 0.6–1.4 squash. That squash is a pixel-art variety trick. Stretching a painted illustration with it is the forbidden arbitrary stretch.

### 2.6 Owner gate

- `App.tsx` 285: `isAdmin = userRole === "admin"`.
- `AdminDashboard.tsx` 5469: hard deny if `!isAdmin`.
- Backend `adminSet*` / `adminDelete*` require `#admin`.
- `AGENTS.md`: admin/debug must be gated; never ship to normal players.

Library UI is **admin-only**. Players never upload or choose combat art.

### 2.7 Mobile / tablet — Continue is live

09-01 documented phones as blocked. Live code:

- `SmallScreenGuard` **warns**; **Continue anyway** (`App.tsx` 43, 107–119).
- Bypass persisted in `sessionStorage` `pbv_small_screen_continue` (25–40, 337–349).
- Overlay only while `isSmallScreen && !smallScreenBypass` (390–406). After Continue, the full game tree mounts.
- `useIsMobile(breakpoint = 768)` (`hooks/use-mobile.tsx` 17–26) then sets WX `MOBILE_ZOOM = 1.75` → tiles **140×70** (WX 923–925).
- Camera follow is mobile-only; desktop (`innerWidth > 1024`, WX 843) locks offset 0.
- **Pixel patterns do not multiply by `MOBILE_ZOOM`.** A 24×24 character is relatively smaller on zoomed tiles.

Custom assets follow the same rule unless a render profile explicitly opts into tile-relative scale (not the default). **Iso preview must include a mobile-zoom pane** (140×70 diamond, 24×24 art unscaled). Treating phones as out-of-scope is a stale design error.

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
- Failures log once (reuse `logPatternLookupFailed` throttle, `pieceArt.ts` 40–55), never throw, never block combat.

```ts
// src/frontend/src/engine/visualAssets.ts  (not implemented)
function resolveRuntimeVisual(entity, library): RuntimeVisual
  // { kind: "custom", bitmap, profile } | { kind: "builtin" }
```

`drawCombatant` may grow **one optional branch at the top**: if resolve returns a decoded bitmap + profile, `drawImage` at the same anchor as `drawPixelPattern`; otherwise branches 1–4 run unchanged. Player needs a **second** one-line site (WX 8368). Empty library / omitted option ⇒ **identity** with today.

---

## 4. Derived render measurements (do not invent)

All sizes are **logical CSS pixels** after `ctx.scale(dpr)` (WX 7317). Source bitmaps may be integer multiples for sharpness.

### 4.1 Tile, anchor, scale

| Quantity | Desktop | Mobile-zoom (`isMobile` after Continue) | Source |
| :--- | ---: | ---: | :--- |
| Iso diamond | 80 × 40 | 140 × 70 | `TILE_*` × `MOBILE_ZOOM` 1.75 |
| `gridToScreen` | **top vertex** of the diamond | same | WX 3733–3751 (cached) |
| Tile visual center | top + `th/2` → +20 / +35 | | `tileCenter` 3767–3770 |
| Character draw point | `(tileTopX, tileTopY − CHARACTER_Y_OFFSET)` = `(tileTopX, tileTopY + 9)` | same offset | `drawCombatant` 838–840; player 8371–8372 |
| Pattern **anchor** | **center of the pattern** on the draw point | same | `startX = x − patternWidth/2` (WX 3821–3822, `pieceArt.ts` 752–753) |
| Drop-shadow foot | `(tileTopX, tileTopY + th/2 + 4)` | | 8089–8090, 8346–8347 |
| World cell size | **3×3** logical px × `scaleX`/`scaleY` | **not** × 1.75 | WX 3816 |
| Default pattern | **8×8 cells** | | `chessPiecePatterns`, `creaturePatterns` (`pieceArt.ts` 83–94, 347–357) |
| Default drawn size @ scale 1 | **24 × 24** | 24 × 24 | 8 × 3 |
| Enemy instance scale | 0.6–1.4 (stored) | same | `generateEnemyScaleFactors` 4545–4571 |
| Max standard drawn @ 1.4 | **33.6 × 33.6** | 33.6 × 33.6 | 24 × 1.4 |
| Boss pattern | **8×12 cells** (all inspected `boss_*` / named) | | `enemyPixelPatterns.ts` 10–24, 252–266 |
| Boss drawn @ 1.0 | **24 × 36** | | 8×3 × 12×3 |
| Boss spawn scale | **1.4 × 1.4** (not random) | | WX 6620–6621 |
| Boss drawn @ 1.4 | **33.6 × 50.4** | | |
| Portrait | 60×60 canvas, 6px cells → 48×48 art | | 3681, 18126–18128 |
| Creation preview | 80×80 pattern on 320×280 canvas | | `CharacterCreation.tsx` 146, 462–465 |
| Name label | `screenPos.y − 34` | | 8175 |
| Level label | name + 14 | | 8176 |
| Status icons | draw point − 30 | | 8299 |
| Summon lifespan badge | `(x + 18, y − 48)` | | 8199–8200 |
| Sprite hit `drawSize` | 80 × 60 | 140 × 105 | 8156, 8405 |
| Wall extrusion | 28 px | | 4046 |
| Viewport | warn &lt;768; Continue enters | zoomed tiles | `SmallScreenGuard` + `useIsMobile` |

**Anchor for custom bitmaps must match the pixel path:** center the image on `(tileTopX, tileTopY + 9)`, not on tile center and not on a foot bone, unless a future render profile adds an explicit `anchor: "foot"` (not in the current renderer).

Do **not** use the 320×280 creation canvas, 72×72 admin `<img>`, or 60×60 portrait as recommended upload size.

### 4.2 Per-category upload specification

Show this table **before** the file picker. Reject or warn — **never silently scale, crop, or stretch**.

Shared:

| Field | Value | Why |
| :--- | :--- | :--- |
| `SUPPORTED_FORMATS` | `image/png` required; `image/webp` accepted if `createImageBitmap` succeeds | Pixel path is transparent (`cell === 0` skipped). JPEG has no alpha. SVG/GIF not used in combat. |
| `TRANSPARENCY_REQUIREMENT` | At least one pixel with alpha &lt; 255 | Opaque rectangles sit as boxes on the diamond. |
| `ANIMATION_SUPPORT` | **Four stills** (`front` / `right` / `left` / `back`) matching `ViewDirection` | `playerView` updates on step (WX 11601–11604). Walk-frame arrays exist on `PlayerSpriteConfig` but are **never drawn**. Do not implement walk cycles in v1. |
| `MAX_FILE_SIZE` | **Not measured in-repo.** `adminGuard.MAX_URL = 2048` is URL text, not bytes. Shop `proofFileUrl` cap 524_288 is a **different** surface. `ExternalBlob` has no documented visual cap. | Starting reject: **256 KiB per still** after encode until IC ingress / object-store limits are measured. Do not store raw base64 in Motoko `Text`. Do not use `data:` URLs (`unsafeUrl` already forbids them on stubs). |

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

Portrait HUD and character-creation/selection canvases stay generated pixels in v1.

#### STANDARD ENEMY — profile `enemy_standard`

| Spec | Value | Derivation |
| :--- | :--- | :--- |
| `RECOMMENDED_WIDTH` / `HEIGHT` | **24** (48 @2×) | same 8×8 × 3 |
| `MAX_WIDTH` / `MAX_HEIGHT` | **80** / **60** | tile + hit box |
| `ANCHOR` | center / draw point | `drawCombatant` |
| `DEFAULT_SCALE` | **1** | Custom art must **not** inherit random 0.6–1.4 squash. |
| `MAX_SAFE_VISUAL_FOOTPRINT` | 48 × 48 | |

#### ELITE / LARGE ENEMY — profile `enemy_elite` (future category)

No elite type exists. Do **not** invent gameplay size. If metadata `ELITE_ONLY` is used:

| Spec | Value | Derivation |
| :--- | :--- | :--- |
| `RECOMMENDED_WIDTH` / `HEIGHT` | **34** | ceil(24 × 1.4) — current max instance scale |
| `MAX_WIDTH` / `MAX_HEIGHT` | **80** / **60** | same tile/hit box as standard — **visual only** |
| `DEFAULT_SCALE` | **1** on a 34×34 recommended asset | Do not also multiply by 1.4 |
| `MAX_SAFE_VISUAL_FOOTPRINT` | 56 × 56 | under tile width; warn if &gt; 48 |

Occupancy stays **one tile**. Until an explicit elite flag exists, `ELITE_ONLY` assets are **ineligible** for random pools. Do not infer elite from `scaleY`, HP, `iron_golem`, or `elite_patrol`.

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
| `ANIMATION_SUPPORT` | 4 stills optional; v1 may be a single `front` | Bosses spawn `currentView: "front"` (WX 6613) |

Never assign `enemy_standard` art to a boss and scale it up.

#### SUMMON — profile `summon_standard`

| Spec | Value | Derivation |
| :--- | :--- | :--- |
| Same box as player/standard | 24 recommended, 80×60 max | 8×8 `creaturePatterns` |
| Extra | Keep `strokeOwnerTint` (green/red) around the **runtime** footprint | `pieceArt.ts` 779–798, 911–914 |
| `MAX_SAFE_VISUAL_FOOTPRINT` | 48 × 48 | lifespan badge at `(x+18, y−48)` will collide with tall/wide art — warn |

#### FUTURE categories (`#future`)

Portals, walls, loot, death fragments, ads: **ineligible** until a measured profile exists. v1 library is combatant stills only.

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

Pools: `poolId`, `category`, `entries: { assetId, weight }`, `fallback` always builtin. Only `ACTIVE` + `#ok` + matching flags participate. If none qualifies → default pixel visual.

**World-pack bind cannot live only on `EnemyConfig.spriteUrl`.** `generateEnemies` never reads admin enemy templates. Assignments must key off instance fields the spawn path already has: `pieceType`, `family`, `id` prefix (`boss_`), `isSummon`, and a future elite flag.

---

## 6. Owner operations

All `#admin` only. Players never see this UI.

| Operation | Behavior |
| :--- | :--- |
| **Upload** | Show category spec → pick files (1–4 directions) → validate → store source + metadata `ACTIVE=false` until owner activates. |
| **Preview** | Iso diamond **80×40 and 140×70**, draw point +9, player 24×24 pixel dummy, one standard enemy dummy, optional boss dummy, drop-shadow foot, name/badge overlays. Actual scale. Warn clip / pad / overlap / **phone Continue zoom**. |
| **Activate / deactivate** | Toggle `ACTIVE`. Deactivate → live instances with that id fall back **next frame** (resolver), no re-roll. |
| **Rename** | `DISPLAY_NAME` only. |
| **Replace / version** | New bytes, `VERSION++`, keep `ASSET_ID`. Live binds keep the id; runtime reloads blob. |
| **Safe removal** | Dependency inspect first. If any assignment or live instance id matches: block hard-delete, offer deactivate. |
| **Assign to entity / family / pool** | Priority 1 / family / weighted. Pool resolved **once at spawn**. |
| **Weighted random** | `seededRng(hash(instanceId, poolId, poolVersion))` then walk cumulative weights. Do not wait for a missing encounter seed. |
| **Revert to default** | Clear assignment / `visualAssetId`. Builtin immediately. |
| **Dependency inspection** | List assignments, spawn templates, and (best-effort) live instance ids using the asset. |

Existing URL rows may later be imported as **inactive** library records (`VAL-2026-08-31-012`). Import never auto-activates.

---

## 7. Implementation placement

Per `AGENTS.md` and `VAL-2026-08-31-017`:

- New logic: `src/frontend/src/engine/visualAssets.ts` (+ tests) and optionally `visualPreview.ts`.
- Pixel tables already live in `engine/enemyPixelPatterns.ts` — **do not move them back into WX** and do not dump the resolver into WX.
- `DrawCombatantOptions`: add an optional custom-visual hook; default omitted = today’s fillRect path.
- WorldExploration: **wiring only** — pass `visualAssetId` into `drawCombatant` / player site. **Do not** edit the RAF loop, map generation, turn logic, or damage math.
- Motoko metadata + blob refs: `adminGuard` + `#admin` only. Bytes in object storage, not Candid `Text`.
- Tests: empty library `[]` → `{ kind: "builtin" }`; inactive/corrupt id → builtin; 100 fake renders same `visualAssetId`; occupancy/`drawSize` ignore bitmap size.

---

## 8. Risk register

| Risk | Mitigation |
| :--- | :--- |
| Random flicker | Bind at spawn; tests: 100 fake renders same `visualAssetId` |
| Stretching enemy art onto bosses | Separate `boss_large` profile; never `scale(1.4)` a 24×24 upload onto a boss |
| Occupancy / click box from pixels | Keep `drawSize` tile-derived; occupancy one cell |
| Stale `spriteUrl` wired by mistake | VAL-012 + implemented VAL-2026-09-01-001; still do not `drawImage(spriteUrl)` |
| Family owners expect family pixels | Today family art is **ghost/minion only**. Custom family assign is new presentation (VAL-013) |
| Phone art looks “too small” | Match builtin: do not apply `MOBILE_ZOOM` to bitmaps by default; preview the 140×70 tile |
| Walk-frame UI → hunter adds GIF atlas | Honesty copy + VAL-018 stills-only |
| Ad “Custom Visual” “fixed” by removing landing imgs | Ads already render; leave that copy |
| Resolver dumped into 19k-line WX | Follow `enemyPixelPatterns.ts` extraction |

---

## 9. What this run did not do

- No production / gameplay code changes.
- No `drawImage` wiring.
- No Motoko library types.
- Did not re-issue `VAL-2026-08-31-*` or `VAL-2026-09-01-*` as new implementation work.
- Did not treat open draft #259 as a visual-library vehicle.
