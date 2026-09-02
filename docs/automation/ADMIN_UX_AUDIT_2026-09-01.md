# Admin UX & Information Architecture Audit — 2026-09-01

**Auditor:** Admin UX & Information Architecture Auditor  
**SOURCE_AUTOMATION:** Admin UX & Information Architecture Auditor  
**HEAD inspected:** `cursor/admin-dashboard-audit-454d`  
**Scope:** Owner tool only (`AdminDashboard.tsx`, admin hooks, backend admin API). Gameplay math / RAF / map gen not touched.  
**Prior pass:** [`ADMIN_UX_AUDIT_2026-08-31.md`](./ADMIN_UX_AUDIT_2026-08-31.md)

This is an **owner console**, not a player HUD. Optimize for speed, clarity, safety, discoverability, density, low operator error, and content scale.

DESIGN.md identity (carved-stone, gold, crimson) is preserved on the owner tool. Decorative orbs / player HUD patterns are not imposed.

---

## Capability map (inspected, not imposed)

| Domain (prompt) | Actual capability | Admin surface today |
| :--- | :--- | :--- |
| OVERVIEW | None | Missing |
| ENEMIES | Canister CRUD spawn templates (`hp/ap/mp/init/level/regions/spriteUrl`) | Enemies tab + list search (this run) |
| BOSSES | 19 kits; **localStorage** `pbv_boss_configs` — Motoko `getAllBossConfigs` / `adminSetBossConfig` exist but frontend record does not match | Bosses tab (draft copy + ability filter) |
| SPELLS | Canister CRUD + large targeting/effect form | Spells tab + list search |
| SPELL DISCOVERY | Player `starterSpells` + minLevel; no discovery catalog | Missing |
| ACHIEVEMENTS | Canister CRUD + `active` flag | Achievements tab |
| CHALLENGES | Hardcoded `DEFAULT_CHALLENGES` | Missing — do not add an empty tab |
| AI | Constants in `gameConstants.ts` / `engine/enemyAI.ts` | Missing |
| FORMATIONS | Not a first-class config type | Missing |
| ENCOUNTERS | Runtime spawn + tiers + regions | Enemy Tiers + Regions only |
| DUNGEONS | `DungeonRecord` / chain persist | Missing |
| WORLD | Regions + map modifiers + paper palette | Regions / Modifiers / Visuals |
| VISUAL ASSETS | Enemy URL, player 4-facing URLs, ad image URLs | Scattered; no pool/weights |
| ECONOMY | Doka spawn, grant/ban, purchases; **`getShopPackages` / `adminSetShopPackage` exist** (`useGetShopQueries.ts`) | Shop / Purchases / Modifiers — packages unused |
| SYSTEM CONFIG | Partial level-up, role grant, Boss Rush (canister-live), palette | Settings / Boss Rush / Visuals |
| SIMULATION | None | Missing — do not add a writer |
| TELEMETRY | None | Missing |
| HEALTH / AUDIT | Canister `getAdminAuditLog` (`main.mo` ~3101) + rollback writers; frontend mock stub; **no owner tab** | Tab error banners only |

**Live tabs (15, still flat):** Enemies, Regions, Player Sprites, Spells, Map Modifiers, Enemy Tiers, Visuals, Settings, Purchases, Achievements, Enemy Names, Bosses, Ad Boxes, Shop, Boss Rush.  
File: `src/frontend/src/components/AdminDashboard.tsx` (~8.1k lines, one module).

---

## Recapture — do not reopen AUTO_FIXED

| ACTION_ID | Status 2026-09-01 |
| :--- | :--- |
| AUX-DEL-NO-CONFIRM | AUTO_FIXED (still present) |
| AUX-SHOP-NO-CONFIRM | AUTO_FIXED (still present; unban added) |
| AUX-TRANSFER-COPY-MISLEAD | AUTO_FIXED (body + success toast this run) |
| AUX-VIS-NO-DEFAULT-DISTINCTION | AUTO_FIXED (enemies/sprites; ads this run) |
| AUX-ID-MUTABLE | AUTO_FIXED (achievements + modifiers locked this run) |
| AUX-VALIDATION-EMPTY-SAVE | AUTO_FIXED (modifiers blocked this run) |
| AUX-SPRITE-FR-LABELS | AUTO_FIXED |
| AUX-UNBAN-NO-CONFIRM | AUTO_FIXED this run |
| AUX-SHOP-SHARED-PRINCIPAL | AUTO_FIXED this run |
| AUX-SPRITE-LEAVE-UNWARNED | AUTO_FIXED this run |
| AUX-THEME-SPLIT | AUTO_FIXED this run (shop / ads / boss rush tokens) |
| AUX-AD-CLEAR-NO-CONFIRM | AUTO_FIXED this run |
| AUX-AD-EMPTY-AS-ERROR | AUTO_FIXED this run |
| AUX-BOSSRUSH-LIVE-UNLABELED | AUTO_FIXED this run |
| AUX-ACCESS-FIRST-PLAYER-COPY | AUTO_FIXED this run |
| AUX-PII-PURCHASES | PARTIAL — search, status, proof confirm; no redact |
| AUX-LIST-NO-FILTER-SORT | PARTIAL — name/id search on enemies/regions/spells; no sort |
| AUX-BOSS-ABILITY-WALL | PARTIAL — ability filter only |
| AUX-DIRTY-UNUSED | PARTIAL — sprite editor now trips leave warning; `isDirty` still always false |
| AUX-BOSS-LOCALSTORAGE-AS-LIVE | PARTIAL — draft wording + Save browser draft; no canister writer |
| AUX-LEVELUP-PARTIAL | PARTIAL — honest field disclosure; UI still 4 fields |
| AUX-SIDEBAR-COUNTS-INCOMPLETE | PARTIAL — achievements + modifiers added |
| AUX-NAV-FLAT-15 | PARTIAL — overflow only; no grouped IA |
| AUX-LIFE-NO-STATES | NEW — do not implement without approval |
| AUX-DOMAIN-GAPS | REPORT_ONLY — no fake tabs |
| AUX-NO-HEALTH-AUDIT | NEW — log exists, UI does not |

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
  Shop            packages (hook already exists) + grant/ban
  Purchases
  Boss Rush
  System Config
HEALTH
  Audit           getAdminAuditLog + orphan IDs
  Telemetry       persist-ok/fail, grants, bans
```

Do **not** add Simulation until there is a read-only runner that cannot write wallets.

---

## Auto-fixes this run (SAFE_TO_AUTO_IMPLEMENT only)

1. Split Shop grant vs ban principal fields; confirm Unban  
2. Leave-editor warning includes Player Sprites (`editingSpriteId`)  
3. Lock achievement + modifier IDs after create; block empty modifier save  
4. Honest copy: access denied, transfer toast, level-up silent defaults, visuals reset, shop packages, boss draft vs Boss Rush live  
5. Shop / Ads / Boss Rush restyled onto owner-tool tokens  
6. Ad boxes: empty = valid hidden default; Clear confirms  
7. List search on enemies / regions / spells; purchase query + status + proof confirm  
8. Boss ability filter; boss reset confirm  
9. Sidebar counts for achievements + modifiers  

Major grouping, lifecycle state machine, dependency graph, new domains, and Health tab remain **HUMAN_APPROVAL_REQUIRED**.
