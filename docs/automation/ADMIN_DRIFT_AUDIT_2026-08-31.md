# Admin Feature & Drift Audit — 2026-08-31

Compared the Admin Dashboard to live game + `src/backend/main.mo` + bindgen. Documentation was not treated as truth.

## Tiny corrections in this run

- Spell create/save: Candid `cooldown`, `multiTarget`, `hitsAllies`; checkbox dual-write `hitsMultiple`.
- Level-up save: full 9-field `LevelUpConfig` instead of a 4-field `as any` payload.
- Purchases: `getPurchases` + field map (was `getPurchaseRecords`).
- Player sprites: `walkFramesFront` ↔ `frontWalkFrames` on read/write.
- Visuals: write/read `pbv_color_palette` as well as `paperVertexPalette`.

Not wired (not tiny): boss canister CRUD, shop package catalog, enemy spawn from admin records, challenges, dungeon/AI/telemetry panels.

## Visual fallback

Custom artwork is **not** mandatory. Enemies/bosses/players draw built-in pixel patterns when no custom URL is present. Admin `spriteUrl` / player sprite URLs are unused by WorldExploration.

## Finite-level flags

Stralt has no player level cap. Admin defaults `levelMax: 5` on new enemies/regions; region matching uses that as a hard ceiling; Death Realm still has a `maxLevel: 5` zone in two sites; spawn math caps at tier index `floor(999 / tierSize)`.

Full records: `docs/automation/ACTION_IDS_2026-08-31.md`.
