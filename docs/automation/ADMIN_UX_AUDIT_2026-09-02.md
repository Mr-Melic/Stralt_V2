# Admin UX & Information Architecture Audit — 2026-09-02

**Auditor:** Admin UX & Information Architecture Auditor  
**SOURCE_AUTOMATION:** Admin UX & Information Architecture Auditor  
**HEAD inspected:** `cursor/admin-dashboard-audit-12ab`  
**Scope:** Owner tool only (`AdminDashboard.tsx`, `AdminGameKeyPurchases.tsx`, admin hooks, backend admin API). Gameplay math / RAF / map gen not touched.  
**Prior pass:** [`ADMIN_UX_AUDIT_2026-09-01.md`](./ADMIN_UX_AUDIT_2026-09-01.md)

This is an **owner console**, not a player HUD. Optimize for speed, clarity, safety, discoverability, density, low operator error, and content scale.

DESIGN.md identity (carved-stone, gold, crimson) is preserved on the owner tool. Decorative orbs / player HUD patterns are not imposed.

---

## Capability map (inspected, not imposed)

| Domain (prompt) | Actual capability | Admin surface today |
| :--- | :--- | :--- |
| OVERVIEW | None | Missing |
| ENEMIES | Canister CRUD spawn templates (`hp/ap/mp/init/level/regions/spriteUrl`) | Enemies tab + list search |
| BOSSES | 19 kits; **localStorage** `pbv_boss_configs` — Motoko `getAllBossConfigs` / `adminSetBossConfig` exist but frontend record does not match | Bosses tab (draft copy + ability + list filter) |
| SPELLS | Canister CRUD + large targeting/effect form | Spells tab + list search |
| SPELL DISCOVERY | Player `starterSpells` + minLevel; no discovery catalog | Missing |
| ACHIEVEMENTS | Canister CRUD + `active` flag | Achievements tab + list search (this run) |
| CHALLENGES | Hardcoded `DEFAULT_CHALLENGES` | Missing — do not add an empty tab |
| AI | Constants in `gameConstants.ts` / `engine/enemyAI.ts` | Missing |
| FORMATIONS | Not a first-class config type | Missing |
| ENCOUNTERS | Runtime spawn + tiers + regions | Enemy Tiers + Regions only |
| DUNGEONS | `DungeonRecord` / chain persist | Missing |
| WORLD | Regions + map modifiers + paper palette | Regions / Modifiers / Visuals |
| VISUAL ASSETS | Enemy URL, player 4-facing URLs, ad image URLs | Scattered; no pool/weights |
| ECONOMY | GameKey/Mollie (PR #258) + grant/ban; **packages API still on actor but player path is GameKey** | Shop / Purchases |
| SYSTEM CONFIG | All nine LevelUpConfig fields, role grant, Boss Rush (canister-live), palette | Settings / Boss Rush / Visuals |
| SIMULATION | None | Missing — do not add a writer |
| TELEMETRY | None | Missing |
| HEALTH / AUDIT | Canister `getAdminAuditLog` + rollback writers; frontend mock stub; **no owner tab** | Tab error banners only |
| BANS | `getBannedPrincipals` | Shop banned list (this run) |

**Live tabs (15, still flat):** Enemies, Regions, Player Sprites, Spells, Map Modifiers, Enemy Tiers, Visuals, Settings, Purchases, Achievements, Enemy Names, Bosses, Ad Boxes, Shop, Boss Rush.  
File: `src/frontend/src/components/AdminDashboard.tsx` (one module). Purchases: `AdminGameKeyPurchases.tsx`.

---

## Recapture — do not reopen AUTO_FIXED

| ACTION_ID | Status 2026-09-02 |
| :--- | :--- |
| AUX-DEL-NO-CONFIRM | AUTO_FIXED (still present) |
| AUX-SHOP-NO-CONFIRM | AUTO_FIXED (still present; unban + GameKey confirms) |
| AUX-TRANSFER-COPY-MISLEAD | AUTO_FIXED |
| AUX-VIS-NO-DEFAULT-DISTINCTION | AUTO_FIXED |
| AUX-ID-MUTABLE | AUTO_FIXED |
| AUX-VALIDATION-EMPTY-SAVE | AUTO_FIXED |
| AUX-SPRITE-FR-LABELS | AUTO_FIXED |
| AUX-UNBAN-NO-CONFIRM | AUTO_FIXED |
| AUX-SHOP-SHARED-PRINCIPAL | AUTO_FIXED |
| AUX-SPRITE-LEAVE-UNWARNED | AUTO_FIXED |
| AUX-THEME-SPLIT | AUTO_FIXED |
| AUX-AD-CLEAR-NO-CONFIRM | AUTO_FIXED |
| AUX-AD-EMPTY-AS-ERROR | AUTO_FIXED |
| AUX-BOSSRUSH-LIVE-UNLABELED | AUTO_FIXED |
| AUX-ACCESS-FIRST-PLAYER-COPY | AUTO_FIXED |
| AUX-LEVELUP-PARTIAL | AUTO_FIXED (fields already shown; disclosure is sibling #281 — this PR does not rewrite that paragraph) |
| AUX-GAMEKEY-NO-CONFIRM | AUTO_FIXED this run |
| AUX-UNBAN-COPY-STALE | AUTO_FIXED this run |
| AUX-UNBAN-NO-ASSERT | AUTO_FIXED this run |
| AUX-NO-BANNED-LIST | AUTO_FIXED this run |
| AUX-PII-PURCHASES | PARTIAL — GameKey table shows email/principal; no redact |
| AUX-LIST-NO-FILTER-SORT | PARTIAL — search now on remaining lists; no sort/facets |
| AUX-BOSS-ABILITY-WALL | PARTIAL — filter only |
| AUX-DIRTY-UNUSED | PARTIAL — sprite leave wired; `isDirty` still always false |
| AUX-BOSS-LOCALSTORAGE-AS-LIVE | PARTIAL — draft copy + Save browser draft; no canister writer |
| AUX-SIDEBAR-COUNTS-INCOMPLETE | PARTIAL — +achievements/modifiers; no bosses/names |
| AUX-NAV-FLAT-15 | PARTIAL — overflow only; no grouped IA |
| AUX-ENEMY-STATS-INCOMPLETE | PARTIAL — “Spawn template” copy this run; combat fields still not on persist path |
| AUX-SHOP-PACKAGES-MISSING | SUPERSEDED — player path is GameKey/Mollie; do not add a package editor |
| AUX-LIFE-NO-STATES | NEW — do not implement without approval |
| AUX-NO-HEALTH-AUDIT | NEW — `getAdminAuditLog` exists; no tab |
| AUX-DOMAIN-GAPS | REPORT_ONLY — no fake tabs |

---

## Recommended IA (proposal — do not implement until approved)

```
OVERVIEW          last writes (getAdminAuditLog), draft vs live counts
CONTENT
  Enemies         list + search → editor + dependency rail
  Bosses          staged edit (local draft ≠ live; type-align Motoko)
  Spells          sectioned editor + acquisition
  Achievements
  Challenges      (new; currently hardcoded)
  Enemy Names
WORLD
  Regions
  Tiers / Encounters
  Map Modifiers
  Dungeons        (new)
PRESENTATION
  Player Sprites
  Visual Assets   pools, weights (new)
  Ad Boxes
ECONOMY / OPS
  Shop            GameKey grant/ban + banned list (packages retired)
  Purchases       GameKey approve/reject
  Boss Rush
  System Config
HEALTH
  Audit           getAdminAuditLog + orphan IDs
  Telemetry       persist-ok/fail, grants, bans
```

Do **not** add Simulation until there is a read-only runner that cannot write wallets.

---

## Auto-fixes this run (SAFE_TO_AUTO_IMPLEMENT only)

1. Purchases: confirm Approve (GameKey mint), Reject, and Mark emailed  
2. Unban copy matches ban-keeps-progress; `assertAdminCmdOk` on unban  
3. Shop: read-only banned principal list (`getBannedPrincipals`), click fills unban field  
4. List search on sprites, modifiers, achievements, names, bosses  
5. Honest copy: Enemy editor = Spawn template  
6. Confirm copy helpers in `dokaGameKey.ts` so Approve cannot be described as a wallet mint  
7. Level-up disclosure left for sibling drift PR #281 (same paragraph) so stack merge stays clean

Major grouping, lifecycle state machine, dependency graph, new domains, and Health tab remain **HUMAN_APPROVAL_REQUIRED**.
