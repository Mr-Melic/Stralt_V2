# Admin Feature & Drift Audit — 2026-09-02

Compared Admin Dashboard to live game (`WorldExploration.tsx`), `src/backend/main.mo`, bindgen (`src/frontend/src/backend.ts`), `src/backend/types/admin.mo`, and current hooks. Documentation was not treated as truth.

HEAD at start: `58302bc` (same as `origin/main`, includes GameKey shop #258).

## Tiny corrections in this run

Honesty copy only. No CRUD, persist, spawn, or combat changes.

- Level-up Settings intro no longer claims “range and fail chance only” while all nine `LevelUpConfig` inputs are visible (`AdminDashboard.tsx` ~4415–4419).
- Map modifier checkbox label: “Eligible for portal modifier roll” (was “Active on all maps”).
- Honesty notes: Regions (unused battleEffects/background), Spells (no summon editor; mechanic flags drop), Modifiers (global/second chances not Candid), Settings (rollback/audit/version/ban list have no editors).

## Visual fallback

Custom artwork is **not** mandatory. Enemies/bosses/players draw built-in pixel patterns when no custom URL is present. WorldExploration never calls `getEnemyConfigs` / `getPlayerSpriteConfigs` / `spriteUrl` / `frontUrl`. `src/` has no `ctx.drawImage`. New enemies/bosses function with generated/default pixel visual.

## Finite-level flags

Stralt has no player level cap. Remaining hard bands:

- Region match uses `level <= levelMax` (`WorldExploration.tsx` 3662–3664) then **discards** the match.
- Primary Death Realm zone is `maxLevel: 9999` (5436). Generation-failure fallbacks still use `maxLevel: 5` (13613, 13745).
- `pickEnemyLevelFromTiers` still caps tier index at `floor(999 / tierSize)`.
- Motoko `LevelUpConfig` comment still says fail reaches 0 at level 200 (`admin.mo` 148). Admin fail-chance help does not.

## Bindgen vs 2026-09-01

`SpellConfig` in `backend.ts` 118–152 now includes `isSummon`, `summonAI`, `summonLifespan`, `summonUnitDef`, `cooldown`. `getAdminAuditLog` exists on the generated client. Remaining bindgen drift: mixin `isCallerAdmin` / `assignCallerUserRole` are not in `src/backend/main.mo`.

## GameKey vs shop packages

Live player shop is `DokaGameKeyShop` + `requestGameKeyPurchase` / `redeemGameKey`. Admin Purchases is `AdminGameKeyPurchases`. Canister `ShopPackage` CRUD (`adminSetShopPackage` / `getShopPackages`) and `initiatePurchase` remain unused by UI. Do not delete until a live DID prove-out.

Full records: `docs/automation/ACTION_IDS_AFDA_2026-09-02.md`.
