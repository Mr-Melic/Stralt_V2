# Admin UX & Information Architecture Audit — 2026-08-31

**Auditor:** Admin UX & Information Architecture Auditor  
**SOURCE_AUTOMATION:** Admin UX & Information Architecture Auditor  
**HEAD inspected:** current workspace branch  
**Scope:** Owner tool only (`AdminDashboard.tsx`, admin hooks, backend admin API). Gameplay math / RAF / map gen not touched.

This is an **owner console**, not a player HUD. Optimize for speed, clarity, safety, discoverability, density, low operator error, and content scale.

---

## Capability map (inspected, not imposed)

| Domain (prompt) | Actual capability | Admin surface today |
| :--- | :--- | :--- |
| OVERVIEW | None | Missing |
| ENEMIES | Canister CRUD spawn templates (`hp/ap/mp/init/level/regions/spriteUrl`) | Enemies tab |
| BOSSES | 19 kits; **localStorage** `pbv_boss_configs` (`useBossQueries.ts`) | Bosses tab |
| SPELLS | Canister CRUD + huge targeting/effect form | Spells tab |
| SPELL DISCOVERY | Player `starterSpells` + minLevel; no discovery catalog | Missing |
| ACHIEVEMENTS | Canister CRUD + `active` flag | Achievements tab |
| CHALLENGES | Hardcoded `DEFAULT_CHALLENGES` in `challengeCompletion.ts` | Missing |
| AI | Constants in `gameConstants.ts` / `engine/enemyAI.ts` | Missing |
| FORMATIONS | Not a first-class config type | Missing |
| ENCOUNTERS | Runtime spawn + tiers + regions | Enemy Tiers + Regions only |
| DUNGEONS | `DungeonRecord` / chain persist | Missing |
| WORLD | Regions + map modifiers + paper palette | Regions / Modifiers / Visuals |
| VISUAL ASSETS | Enemy URL, player 4-facing URLs, ad image URLs | Scattered; no pool/weights |
| ECONOMY | Doka spawn, shop grant, purchases, achievement rewards | Split across Modifiers / Shop / Purchases |
| SYSTEM CONFIG | Level-up (partial), admin transfer, Boss Rush rooms | Settings / Boss Rush |
| SIMULATION | None | Missing |
| TELEMETRY | None (comment-only in WX) | Missing |
| HEALTH / AUDIT | Tab error banners only | Missing |

**Live tabs (15, flat):** Enemies, Regions, Player Sprites, Spells, Map Modifiers, Enemy Tiers, Visuals, Settings, Purchases, Achievements, Enemy Names, Bosses, Ad Boxes, Shop, Boss Rush.  
File: `src/frontend/src/components/AdminDashboard.tsx` (~7.5k lines, one module).

---

## Findings (actionable)

Each item uses a **stable ACTION_ID** so later runs can recapture instead of duplicating.

### P0 — dangerous / operator-blocking

#### AUX-DEL-NO-CONFIRM — STATUS: AUTO_FIXED

One-click `×` deleted live enemy / region / spell / modifier / achievement / name records with no confirm (sprites already confirmed). Save on those entities is immediately live.

**This run:** shared `ConfirmDialog` (line 236) on those deletes.

---

#### AUX-SHOP-NO-CONFIRM — STATUS: AUTO_FIXED

Shop tab granted Doka and banned principals in one click (`adminAddDokaToUser`, `adminBanAccount`). Ban also clears achievement progress (`main.mo` ~950–963).

**This run:** confirm dialogs at lines 5126–5178; Grant/Ban buttons only queue the dialog.

---

#### AUX-BOSS-LOCALSTORAGE-AS-LIVE — STATUS: PARTIAL

`useGetAllBossConfigs` / `useSetBossConfig` write `localStorage` key `pbv_boss_configs` (`useBossQueries.ts` 1–29; `useAdminQueries.ts` 462–502). Subtitle previously said changes “take effect on the next boss encounter,” which reads as **live**.

**This run:** copy at line 7192 states browser-local draft, not canister-live.  
**Still required (HUMAN):** backend writer + draft vs active badge + preview-before-activate.

---

#### AUX-DIRTY-UNUSED — STATUS: PARTIAL

`AdminDashboardState.isDirty` exists (`gameTypes.ts` 495) but is always `false` (line 4805). Tab switch and Back discarded open editors with no warning.

**This run:** `hasOpenEditor` + `ConfirmDialog` “Leave this editor?” (line 5081) on tab change and Back. Full field-level dirty + beforeunload still missing.

---

#### AUX-TRANSFER-COPY-MISLEAD — STATUS: AUTO_FIXED

Settings claimed “You will lose admin access.” `assignCallerUserRole` only **grants** admin (`ARCHITECTURE.md` Role row). Copy was a dangerous lie.

**This run:** copy now says the grant does not auto-remove the current admin.

---

### P1 — major friction / error risk

#### AUX-NAV-FLAT-15 — STATUS: PARTIAL

15 peer tabs, no groups, no search. Sidebar had no `overflowY` so later tabs (Shop, Boss Rush) could clip under the count footer.

**This run:** `overflowY: auto` on the sidebar (line 5262).  
**Still required (HUMAN):** grouped IA (Content / World / Economy / Ops / Health).

Suggested groups (proposal only):

- **Content** — Enemies, Bosses, Spells, Achievements, Enemy Names
- **World** — Regions, Tiers, Map Modifiers, Visuals (palette)
- **Presentation** — Player Sprites, Ad Boxes
- **Economy / Ops** — Shop, Purchases, Boss Rush, Settings
- **Health** — (not built) Overview, Audit, Telemetry

---

#### AUX-VIS-NO-DEFAULT-DISTINCTION — STATUS: AUTO_FIXED

Empty `spriteUrl` looked like a missing asset (“No preview”, “Sprite URL (optional)”). Empty is a valid **Default Pixel Visual**.

**This run:** enemy editor status (lines 712–738), list badge, sprite preview fallback (line 1398), upload-requirement copy before the URL fields.

Still missing: pools, weights, activate/deactivate, revert-to-default as a first-class control (not just clearing a text field).

---

#### AUX-LIFE-NO-STATES — STATUS: NEW

No DRAFT / VALIDATION FAILED / READY TO ACTIVATE / ACTIVE / INACTIVE / LEGACY. Achievement `active` and modifier `active` are the only lifecycle bits. Every other Save publishes live. Boss “Save” is a local draft that still *looks* like publish.

---

#### AUX-ID-MUTABLE — STATUS: AUTO_FIXED

ID fields on existing enemies/regions/spells were editable. `adminSet*` keys by `id`, so a rename creates a new live record and orphans the old one.

**This run:** `idLocked` when `editing*Id !== "__new__"`.

---

#### AUX-THEME-SPLIT — STATUS: NEW

Shop (line 6481), Boss Rush, and Ad Boxes use Tailwind `bg-gray-800` / `text-red-400` / raw `#ff4444`. The rest of the console uses carved-stone / gold / crimson tokens. Operators cannot trust that they are still in the owner tool.

---

#### AUX-SPELL-FORM-MONOLITH — STATUS: NEW

`SpellEditor` is a single ~1k-line page: identity, stats, type, targeting, AoE grid, special flags, then a tiny preview. No sections-as-tabs, no validation summary, no dependency panel (boss pools, player usable, minLevel acquisition).

---

#### AUX-ENEMY-STATS-INCOMPLETE — STATUS: NEW

Admin `EnemyConfig` (`gameTypes.ts` 108–119) is a spawn template: hp/ap/mp/init/level/regions/sprite. Runtime combat templates also have damage/res/sp/sr/chc (`ARCHITECTURE.md` two-EnemyConfig note). Operators cannot set combat identity here and will assume they can.

---

#### AUX-VALIDATION-EMPTY-SAVE — STATUS: AUTO_FIXED

Save accepted empty name/id.

**This run:** toast + block on enemy/region/spell/achievement save.

---

#### AUX-PII-PURCHASES — STATUS: NEW

Purchases table (line 5561) shows customer name, email, address, and proof-of-address download with no search, status filter, or redact. Owner-tool OK; still need query + status chips + confirm before downloading proof.

---

### P2 — significant usability

| ACTION_ID | Title | Notes |
| :--- | :--- | :--- |
| AUX-NAV-NO-OVERVIEW | No overview home | Default tab is Enemies. No health strip, unpublished drafts, or last-save. |
| AUX-DOMAIN-GAPS | Missing owner domains | Challenges, AI knobs, formations, encounters, dungeons, spell discovery, simulation, telemetry, audit. |
| AUX-NO-DEPENDENCY-VIEWS | No relationship pane | Spell↔boss pools exists only as chips inside an expanded boss. Enemy↔regions is a checkbox list. No enemy→encounters/dungeons, asset→usage. |
| AUX-NO-GLOBAL-SEARCH | No command palette | 15 tabs + long lists; no `⌘K` or entity jump. |
| AUX-NO-BULK-OPS | No bulk activate/deactivate/delete | Does not scale. |
| AUX-LIST-NO-FILTER-SORT | Lists are unsorted stacks | No filter by region, level, effect type, active. |
| AUX-SPRITE-FR-LABELS | Mixed FR/EN | AUTO_FIXED: ANNULER/UTILISER → Cancel / Save Character. |
| AUX-SETTINGS-KITCHEN-SINK | Settings is leftover + transfer | Dead “go to Spells” card + partial level-up + role transfer. |
| AUX-LEVELUP-PARTIAL | Level-up UI ≠ type | Backend `LevelUpConfig` has stat growth, AP/MP threshold, spell cost curve; UI saves 4 fields to localStorage then a backend call. |
| AUX-VISUALS-PALETTE-ONLY | Visuals ≠ asset studio | Paper vertex colors only. |
| AUX-BOSS-ABILITY-WALL | All abilities as chips | No search; easy to mis-toggle on a 40+ enum. |
| AUX-MODIFIER-DOKA-MISPLACED | Economy on Modifiers tab | Ground Doka + leader boost sit above map modifiers. |
| AUX-LANDING-EASTER-EGG | Triple-click `v1.0` | In-game Admin button is the real entry. Landing easter egg opens Access Denied for non-admins. |
| AUX-SHOP-SHARED-PRINCIPAL | Grant and Ban share one input | Easy to ban the principal you meant to credit. |
| AUX-SAVE-FEEDBACK-SPLIT | Three save languages | `toast`, `saveStatus` hex toast, “Saved!”, localStorage-only. |
| AUX-NO-SIMULATION | No sim shortcut | Cannot dry-run a spell/enemy/challenge before activate. |
| AUX-NO-TELEMETRY | No ops metrics | Matches Quality Auditor AUX/AQA telemetry gap. |
| AUX-NO-HEALTH-AUDIT | No config linter | Orphan spell IDs in boss pools, empty regions, inactive achievements with live copy. |
| AUX-CHALLENGES-HARDCODED | Challenges not adminable | `DEFAULT_CHALLENGES` (`challengeCompletion.ts` 38–103). |
| AUX-SPELL-DISCOVERY-MISSING | No acquisition routes UI | `usableByPlayer` / `minLevel` exist on the spell form; no route map (shop, drop, quest, starter). |
| AUX-ASSET-NO-POOL | No visual pool / weights | Single optional URL, not a weighted variant pool. |

---

### P3 — polish

| ACTION_ID | Title |
| :--- | :--- |
| AUX-HEX-VS-OKLCH | Dashboard `C` tokens are raw hex; DESIGN.md says OKLCH custom properties only. Acceptable for owner tool if documented as admin tokens. |
| AUX-BTN-SMALL-TARGETS | Small `×` deletes are <44px. App blocks `<768` so phone owners never reach the console (`App.tsx` 323–336). |
| AUX-NO-BREADCRUMBS | Editor replaces the list; no `Enemies / Shadow Knight`. |
| AUX-SIDEBAR-COUNTS-INCOMPLETE | Footer counts only Enemies/Regions/Sprites/Spells. |
| AUX-NO-MOBILE-ADMIN | Viewport guard is player-oriented; owners on a laptop-narrow window are locked out. |

---

## Recommended IA (proposal — do not implement until approved)

```
OVERVIEW          last writes, validation failures, draft vs live counts
CONTENT
  Enemies         list → editor + dependency rail
  Bosses          staged edit (local draft ≠ live)
  Spells          list + compact editor sections + acquisition
  Achievements
  Challenges      (new; currently hardcoded)
  Enemy Names
WORLD
  Regions
  Tiers / Encounters
  Map Modifiers
  Dungeons        (new)
PRESENTATION
  Player Sprites  default vs custom already started
  Visual Assets   pools, weights, previews (new)
  Ad Boxes
ECONOMY / OPS
  Shop            grant / ban / packages — confirm + separate fields
  Purchases       filterable PII table
  Boss Rush
  System Config   level-up full type, transfer
HEALTH
  Audit           orphan IDs, unused spells, inactive-but-referenced
  Telemetry       persist-ok/fail, grants, bans (no player HUD)
```

Do **not** add Simulation until there is a read-only runner that cannot write wallets.

---

## Auto-fixes this run (SAFE_TO_AUTO_IMPLEMENT only)

1. Shared confirm on destructive deletes + Doka grant + ban  
2. Leave-editor warning on tab switch / Back  
3. Lock entity IDs after create  
4. Require ID + name on save  
5. Default Pixel Visual vs Custom Override copy + list badge  
6. Sidebar scroll  
7. Honest transfer-admin and boss-draft copy  
8. English sprite actions  

Major restructuring, new tabs, lifecycle state machine, and dependency graph remain **HUMAN_APPROVAL_REQUIRED**.
