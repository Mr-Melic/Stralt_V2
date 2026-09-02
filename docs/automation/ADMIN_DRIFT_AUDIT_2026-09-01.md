# Admin Feature & Drift Audit — 2026-09-01

Compared Admin Dashboard to live game, `src/backend/main.mo`, bindgen (`src/frontend/src/backend.ts`), and `src/backend/types/admin.mo`. Documentation was not treated as truth.

## Tiny corrections in this run

- New enemy/region drafts default `levelMax` to 9999 (eligibility band, not a career cap).
- Fail-chance help no longer says “reaches 0% at level 200”.
- Level-up Settings: all nine `LevelUpConfig` fields are editable; save uses `toBackendLevelUpConfig` (no hardcoded growth/cost clobber); panel hydrates `getLevelUpConfig`.
- Modifier type dropdown is built from `MAP_MODIFIERS`. Legacy `lava_fields` / `ice_fields` / `spike_pit` / `custom` stay selectable. Unknown saved ids remain visible.
- Catalog-only notes on Enemies, Player Sprites, Shop, and Boss Rush.
- `newSpell()` seeds Motoko summon defaults (`isSummon`, `summonAI`, `summonLifespan`, `summonUnitDef`). Bindgen still omits those fields.

## Visual fallback

Custom artwork is **not** mandatory. Enemies/bosses/players draw built-in pixel patterns when no custom URL is present. Admin `spriteUrl` / player sprite URLs are unused by WorldExploration.

## Finite-level flags

Stralt has no player level cap. Remaining hard bands: region match uses `level <= levelMax`; Death Realm still has `maxLevel: 5` at two WorldExploration sites; `pickEnemyLevelFromTiers` still caps tier index at `floor(999 / tierSize)`.

Full records: `docs/automation/ACTION_IDS_2026-09-01.md`.
