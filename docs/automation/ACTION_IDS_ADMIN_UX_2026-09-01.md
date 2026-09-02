# ACTION_IDs — 2026-09-01 Admin UX & Information Architecture Auditor

Stable IDs. Recapture; do not duplicate AUTO_FIXED work.  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
Narrative: [`ADMIN_UX_AUDIT_2026-09-01.md`](./ADMIN_UX_AUDIT_2026-09-01.md)

---

ACTION_ID: AUX-UNBAN-NO-CONFIRM  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Confirm Unban the same way Ban is confirmed  
CATEGORY: destructive-actions  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Ban used ConfirmDialog; Unban called `adminUnbanAccount` immediately. Achievement progress cleared by ban is not restored. Fixed: `shopConfirm === "unban"` in `AdminDashboard.tsx` ~5456.  
SYSTEMS_AFFECTED: AdminDashboard Shop tab  
RECOMMENDED_ACTION: Keep the confirm. Do not one-click unban.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Ban still confirms; Unban opens dialog; cancel does not call the actor.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-SHOP-SHARED-PRINCIPAL  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Separate grant and ban principal fields  
CATEGORY: operator-error  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: One `shopPrincipalId` fed Grant, Ban, and Unban. Easy to ban the identity just credited. Fixed: `shopGrantPrincipalId` + `shopBanPrincipalId` (~5097, ~6967).  
SYSTEMS_AFFECTED: AdminDashboard Shop tab  
RECOMMENDED_ACTION: Keep fields separate.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Grant confirm shows grant principal; Ban confirm shows ban principal.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-SPRITE-LEAVE-UNWARNED  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Warn before leaving an open Player Sprite editor  
CATEGORY: unsaved-changes  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `hasOpenEditor` omitted sprites because `SpriteList` kept `editingCfg` locally and never set `dashState.editingSpriteId`. Tab switch discarded the form. Fixed: `onEditorOpenChange` + `editingSpriteId != null` (~5158).  
SYSTEMS_AFFECTED: AdminDashboard sprites panel; leave-editor ConfirmDialog  
RECOMMENDED_ACTION: Keep wiring. Field-level `isDirty` still open (AUX-DIRTY-UNUSED).  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: AUX-DIRTY-UNUSED  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Open a character, switch tab → Leave this editor? Cancel stays on Sprites.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-ID-MUTABLE  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Lock entity IDs after create (achievements + modifiers were missed)  
CATEGORY: validation  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Enemies/regions/spells were locked 2026-08-31. Achievement and modifier ID fields stayed editable; `adminSet*` keys by id so a rename orphans the live record. Fixed: `idLocked` on both editors; empty modifier id/name blocked.  
SYSTEMS_AFFECTED: AchievementEditor; ModifierEditor  
RECOMMENDED_ACTION: Keep locks. Do not add rename-as-migrate without a dedicated writer.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: New achievement/modifier IDs editable; existing IDs disabled.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-THEME-SPLIT  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Shop / Ads / Boss Rush looked like a different product  
CATEGORY: visual-identity  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Those tabs used Tailwind `bg-gray-800` / `text-red-400` / `#ff4444` while the rest of the console uses carved-stone `C` tokens. Operators could not trust they were still in the owner tool. Restyled onto `C` + `Btn` / `Field`.  
SYSTEMS_AFFECTED: Shop, Ads, Boss Rush panels  
RECOMMENDED_ACTION: Keep tokens. Do not mix player HUD orbs into the owner tool.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Visual only; grant/ban/publish still work.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-AD-EMPTY-AS-ERROR  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Empty ad box is a valid hidden default, not an error  
CATEGORY: visual-asset-ux  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Empty slots used error-red chrome (`#1a0505`, `#ff6666`). No custom visual is valid. Fixed: “No custom ad — box hidden (valid default)” in green; requirements shown before URL fields (~8130).  
SYSTEMS_AFFECTED: AdBoxEditor  
RECOMMENDED_ACTION: Never toast empty-as-error on load. Save still requires both URLs; Clear reverts to hidden default.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: AUX-VIS-NO-DEFAULT-DISTINCTION  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Empty box shows valid-default status, not Error.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-AD-CLEAR-NO-CONFIRM  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Confirm clearing a live ad box  
CATEGORY: destructive-actions  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `adminClearAdBox` was one-click and immediately hides the landing slot. Confirm added.  
SYSTEMS_AFFECTED: AdBoxEditor  
RECOMMENDED_ACTION: Keep confirm.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Cancel does not clear.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-BOSSRUSH-LIVE-UNLABELED  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Label Boss Rush save as canister-live  
CATEGORY: content-lifecycle  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Boss Rush writes `adminSetBossRushConfig` but shared gray “draft-looking” chrome with Bosses (localStorage). Operators could treat both Saves as the same. Fixed: “Canister-live. Save publishes immediately” + “Publish Boss Rush” (~7093).  
SYSTEMS_AFFECTED: Boss Rush tab  
RECOMMENDED_ACTION: Keep live vs draft language opposite the Bosses tab.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT  
DEPENDENCIES: AUX-BOSS-LOCALSTORAGE-AS-LIVE  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Copy visible above room list.  
STATUS: AUTO_FIXED  

---

ACTION_ID: AUX-PII-PURCHASES  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Purchases need query, status filter, and proof confirm  
CATEGORY: pii / list-ux  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Table showed name/email/address/proof with no filter. Proof opened immediately. This run: search, paid/pending filter, ConfirmDialog before open/download. Redact still missing.  
SYSTEMS_AFFECTED: Purchases tab  
RECOMMENDED_ACTION: HUMAN — optional column redact for screenshare. Keep confirm.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT (filter + confirm); HUMAN_APPROVAL_REQUIRED (redact)  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Filter narrows rows; Cancel on proof does not open.  
STATUS: PARTIAL  

---

ACTION_ID: AUX-DIRTY-UNUSED  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Field-level dirty + beforeunload still missing  
CATEGORY: unsaved-changes  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `AdminDashboardState.isDirty` is still hardcoded `false`. Leave-editor now covers listed editors including sprites, but Back/tab with an untouched vs edited form is the same warning, and closing the browser tab has no `beforeunload`.  
SYSTEMS_AFFECTED: `gameTypes.ts` `isDirty`; all editors  
RECOMMENDED_ACTION: Set `isDirty` from form diffs; warn only when dirty; `beforeunload` when dirty.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-SPRITE-LEAVE-UNWARNED  
REGRESSION_RISK: MEDIUM — false positives will train operators to dismiss.  
VALIDATION_REQUIRED: Unchanged form can leave without dialog; dirty form warns; refresh prompts.  
STATUS: PARTIAL  

---

ACTION_ID: AUX-BOSS-LOCALSTORAGE-AS-LIVE  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Boss Save is a browser draft; Motoko writer unused  
CATEGORY: content-lifecycle  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `useBossQueries.ts` still reads/writes `pbv_boss_configs`. Canister `getAllBossConfigs` / `adminSetBossConfig` exist (`backend.ts`); frontend BossConfig (`iconEmoji`, `loreText`, `chc`) does not match Motoko (`defeated`, `adminNotes`). This run: “Save browser draft” toast + reset confirm. Still not live.  
SYSTEMS_AFFECTED: useBossQueries; BossesTab; `src/backend` BossConfig  
RECOMMENDED_ACTION: Align types, then staged draft → preview → activate. Show DRAFT vs ACTIVE badge.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-LIFE-NO-STATES  
REGRESSION_RISK: HIGH — live actor reject if fields diverge.  
VALIDATION_REQUIRED: Save round-trips canister; another browser sees the same kit.  
STATUS: PARTIAL  

---

ACTION_ID: AUX-LIFE-NO-STATES  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: No DRAFT / VALIDATION FAILED / READY / ACTIVE / INACTIVE / LEGACY  
CATEGORY: content-lifecycle  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Achievement `active` and modifier `active` are the only lifecycle bits. Every other canister Save publishes live. Boss Save is a local draft that still sits next to live entity Saves.  
SYSTEMS_AFFECTED: All admin writers  
RECOMMENDED_ACTION: Introduce explicit states. Never render a saved draft as live. Preview-before-activate.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-BOSS-LOCALSTORAGE-AS-LIVE  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: Draft save does not change player encounter tables.  
STATUS: NEW  

---

ACTION_ID: AUX-NAV-FLAT-15  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Fifteen peer tabs, no groups, no command palette  
CATEGORY: navigation  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Flat `TABS` array. Sidebar scrolls (2026-08-31). No Content / World / Economy / Health groups. Default tab is Enemies, not Overview.  
SYSTEMS_AFFECTED: AdminDashboard sidebar  
RECOMMENDED_ACTION: Grouped IA per audit proposal. Do not add empty domain tabs.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-NAV-NO-OVERVIEW; AUX-NO-GLOBAL-SEARCH  
REGRESSION_RISK: MEDIUM — operators lose muscle memory.  
VALIDATION_REQUIRED: Every current tab remains reachable in one click from its group.  
STATUS: PARTIAL  

---

ACTION_ID: AUX-NO-HEALTH-AUDIT  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Canister audit log has no owner view  
CATEGORY: health-audit  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `getAdminAuditLog` in `main.mo` ~3101; `_recordAdminAudit` on grant/ban/config writes; frontend mock stub; `usePanelLayout.ts` types the method; AdminDashboard never calls it. Rollback writers exist for level-up / game / palette / tiers / boss rush.  
SYSTEMS_AFFECTED: Health tab (missing); `main.mo` audit log  
RECOMMENDED_ACTION: Read-only Audit tab: timestamp, actor, action, before/after. Link rollbacks with confirm. Do not invent a second log.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: LOW for read-only; MEDIUM if rollback is one-click.  
VALIDATION_REQUIRED: Grant Doka appears in the log; non-admin cannot query.  
STATUS: NEW  

---

ACTION_ID: AUX-SHOP-PACKAGES-MISSING  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Shop packages API unused by the Shop tab  
CATEGORY: economy  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `useGetShopPackages` + `adminSetShopPackage` / `getShopPackages` exist. Shop tab had a dead “Payment Links” card. This run: honest “packages not editable here” copy. No package list yet.  
SYSTEMS_AFFECTED: Shop tab; useShopQueries  
RECOMMENDED_ACTION: List packages with paymentLink, dokaAmount, priceEur; staged edit. Do not invent a second package store.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM — wrong paymentLink ships to players.  
VALIDATION_REQUIRED: Save round-trips `getShopPackages`.  
STATUS: NEW  

---

ACTION_ID: AUX-LEVELUP-PARTIAL  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Level-up UI silently writes hardcoded remaining fields  
CATEGORY: system-config  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: UI edits 4 range/fail fields then `adminSetLevelUpConfig` also sends statGrowth 5, apMp threshold 25, spell cost 10×2, dmg growth 3. This run: disclosure copy under Spell System Config. Full editor still missing.  
SYSTEMS_AFFECTED: LevelUpConfigPanel; `adminSetLevelUpConfig`  
RECOMMENDED_ACTION: Surface every persisted field or stop overwriting hidden ones with literals.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if literals change live economy.  
VALIDATION_REQUIRED: Save does not clobber canister values the UI did not show (once implemented).  
STATUS: PARTIAL  

---

ACTION_ID: AUX-SPELL-FORM-MONOLITH  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Spell editor is one ~1k-line live publish form  
CATEGORY: edit-forms  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Identity, stats, type, targeting, AoE, flags, tiny preview. No section tabs, validation summary, or dependency rail (boss pools, minLevel, usableBy*). Save is live.  
SYSTEMS_AFFECTED: SpellEditor  
RECOMMENDED_ACTION: Sectioned editor + validation summary. Do not add discovery routes until catalog/ownership split exists (SDA IDs).  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-LIFE-NO-STATES; SDA-2026-08-31-001  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Existing fields still persist.  
STATUS: NEW  

---

ACTION_ID: AUX-ENEMY-STATS-INCOMPLETE  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Admin EnemyConfig is a spawn template, not combat identity  
CATEGORY: terminology  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Admin form: hp/ap/mp/init/level/regions/sprite. Runtime combat templates also have damage/res/sp/sr/chc (`ARCHITECTURE.md`). Operators will assume they set combat identity.  
SYSTEMS_AFFECTED: EnemyEditor; two EnemyConfig types  
RECOMMENDED_ACTION: Label the form “Spawn template”. Do not add combat fields without a typed persist path.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if a third type is invented.  
VALIDATION_REQUIRED: Copy only until persist exists.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-DEPENDENCY-VIEWS  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: No relationship pane for spell / enemy / asset  
CATEGORY: dependency-ux  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Spell↔boss pools exist only as chips in an expanded boss. Enemy↔regions is a checkbox list. No enemy→encounters/dungeons, asset→usage, spell→achievements/challenges.  
SYSTEMS_AFFECTED: All content editors  
RECOMMENDED_ACTION: Read-only dependency rail + badges. SPELL → pools, achievements, challenges, bosses, AI, acquisition. ENEMY → spells, visual, formations, encounters, dungeons. ASSET → enemy/boss usage.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-DOMAIN-GAPS  
REGRESSION_RISK: LOW for read-only.  
VALIDATION_REQUIRED: Click-through does not mutate.  
STATUS: NEW  

---

ACTION_ID: AUX-NAV-NO-OVERVIEW  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: No overview home  
CATEGORY: navigation  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Default tab is Enemies. No last-write strip, unpublished drafts, or validation failures. Audit log already exists server-side.  
SYSTEMS_AFFECTED: AdminDashboard default tab  
RECOMMENDED_ACTION: Overview from `getAdminAuditLog` + live/draft counts.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-NO-HEALTH-AUDIT  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Default landing is Overview; Enemies one click away.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-GLOBAL-SEARCH  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: No command palette / entity jump  
CATEGORY: search  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Per-list search added for enemies/regions/spells. No `⌘K` across 15 tabs.  
SYSTEMS_AFFECTED: AdminDashboard chrome  
RECOMMENDED_ACTION: Quick entity search jumping to the owning tab + editor.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-NAV-FLAT-15  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Jump opens the editor for that id.  
STATUS: NEW  

---

ACTION_ID: AUX-LIST-NO-FILTER-SORT  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Lists need sort and structured filters  
CATEGORY: list-ux  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: This run added substring search on enemies/regions/spells. No sort by level/name, no region/effect/active chips on other lists.  
SYSTEMS_AFFECTED: Entity lists  
RECOMMENDED_ACTION: Sort + facet filters. Do not paginate until counts exceed ~100.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED (sort/facets); search already shipped  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Filter does not hide Add.  
STATUS: PARTIAL  

---

ACTION_ID: AUX-BOSS-ABILITY-WALL  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Boss ability chips were unfiltered  
CATEGORY: edit-forms  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: 40+ `BossAbility` chips; easy mis-toggle. This run: ability filter in PhaseEditor. Still no grouped categories.  
SYSTEMS_AFFECTED: PhaseEditor  
RECOMMENDED_ACTION: Optional category groups. Keep filter.  
AUTONOMY: SAFE_TO_AUTO_IMPLEMENT (filter done); HUMAN for regroup  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Filter hides chips; selected abilities remain selected.  
STATUS: PARTIAL  

---

ACTION_ID: AUX-ASSET-NO-POOL  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: No visual pool / weights / activate / revert control  
CATEGORY: visual-asset-ux  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Single optional URL. Default vs custom copy exists. No pool, weights, activate/deactivate, or first-class revert (clearing a text field is not revert).  
SYSTEMS_AFFECTED: Enemy + sprite editors; Visuals tab (palette only)  
RECOMMENDED_ACTION: Entity-specific upload requirements already shown. Add weighted variants + revert-to-default control without treating empty as error.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: VISUAL_ASSET_LIBRARY_DESIGN_2026-08-31  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Empty pool = Default Pixel Visual active fallback.  
STATUS: NEW  

---

ACTION_ID: AUX-DOMAIN-GAPS  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Missing owner domains must not become empty tabs  
CATEGORY: information-architecture  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Challenges hardcoded (`challengeCompletion.ts`). AI/formations/encounters/dungeons/discovery/simulation/telemetry have no admin API. Shop packages and audit log *do* have APIs and should be first if Health/Economy expand.  
SYSTEMS_AFFECTED: Future tabs  
RECOMMENDED_ACTION: Do not add empty Challenges/AI/Formations/Dungeons/Telemetry tabs. Prefer Audit + Shop packages.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if empty tabs ship  
VALIDATION_REQUIRED: No new tab without a writer/reader.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-BULK-OPS  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: No bulk activate / deactivate / delete  
CATEGORY: bulk-operations  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: One-row Edit/× only. Does not scale.  
SYSTEMS_AFFECTED: Entity lists  
RECOMMENDED_ACTION: Bulk only after confirm + dependency summary.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-NO-DEPENDENCY-VIEWS  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: Partial failure does not leave half-deleted sets.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-SIMULATION  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: No dry-run shortcut  
CATEGORY: simulation  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: No read-only runner. Must not write wallets or killCount.  
SYSTEMS_AFFECTED: Future sim panel  
RECOMMENDED_ACTION: Report-only until a runner exists that cannot call `applyRewards` / `adminAddDokaToUser`.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if it can mint  
VALIDATION_REQUIRED: Sim path has no persist lock writes.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-TELEMETRY  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: No ops metrics in the owner tool  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Matches prior Quality/Telemetry audits. Persist ok/fail, grants, bans belong here — not the player HUD.  
SYSTEMS_AFFECTED: Future Health tab  
RECOMMENDED_ACTION: Reuse audit log + persist outcomes. No player-facing telemetry HUD.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: AUX-NO-HEALTH-AUDIT  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Metrics are admin-gated.  
STATUS: NEW  

---

ACTION_ID: AUX-MODIFIER-DOKA-MISPLACED  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Ground Doka + leader boost sit on Map Modifiers  
CATEGORY: information-architecture  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: Economy fields above modifier list. Settings is leftover + transfer.  
SYSTEMS_AFFECTED: Modifiers tab; Settings  
RECOMMENDED_ACTION: Move economy fields to Economy / System Config when IA is grouped.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-NAV-FLAT-15  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Save still hits `adminSetGameConfig`.  
STATUS: NEW  

---

ACTION_ID: AUX-SAVE-FEEDBACK-SPLIT  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Three save languages  
CATEGORY: save-feedback  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: `toast`, hex `saveStatus` pill, “Saved!”, “Live save committed”, localStorage-only.  
SYSTEMS_AFFECTED: All writers  
RECOMMENDED_ACTION: One toast vocabulary: Published (live) vs Draft saved (local) vs Failed.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-LIFE-NO-STATES  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: No dual toast + hex pill for the same write.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-BREADCRUMBS  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Editor replaces the list with no trail  
CATEGORY: navigation  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: Enemy/region/spell editors swap the list. No `Enemies / Shadow Knight`.  
SYSTEMS_AFFECTED: Editors  
RECOMMENDED_ACTION: Breadcrumb + Back that honors dirty warning.  
AUTONOMY: HUMAN_APPROVAL_REQUIRED  
DEPENDENCIES: AUX-DIRTY-UNUSED  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Breadcrumb returns to the same list filter.  
STATUS: NEW  

---

ACTION_ID: AUX-NO-MOBILE-ADMIN  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Viewport guard is player-oriented  
CATEGORY: responsive  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: `App.tsx` small-screen guard is bypassable but console `×` targets stay <44px. Owner-on-laptop-narrow is not a first-class layout.  
SYSTEMS_AFFECTED: App.tsx; delete buttons  
RECOMMENDED_ACTION: Do not ship a phone-first admin. Keep desktop density; enlarge destructive targets only.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Player small-screen continue still works.  
STATUS: NEW  

---

ACTION_ID: AUX-HEX-VS-OKLCH  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Owner-tool `C` tokens are raw hex  
CATEGORY: visual-identity  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: DESIGN.md says OKLCH custom properties only. Admin `C` is hex. Acceptable if documented as admin tokens; do not force player CSS variables into the console.  
SYSTEMS_AFFECTED: AdminDashboard `C`  
RECOMMENDED_ACTION: Document admin hex tokens as owner-tool-only.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: N/A  
STATUS: NEW  

---

ACTION_ID: AUX-LANDING-EASTER-EGG  
SOURCE_AUTOMATION: Admin UX & Information Architecture Auditor  
TITLE: Triple-click v1.0 still opens Access Denied for non-admins  
CATEGORY: discoverability  
PRIORITY: P3  
CONFIDENCE: MEDIUM  
EVIDENCE: In-game Admin button is the real entry. Landing easter egg is a footgun.  
SYSTEMS_AFFECTED: LandingPage; App.tsx  
RECOMMENDED_ACTION: Leave for admins; do not advertise to players.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Non-admin still sees Access Denied, not a player HUD leak.  
STATUS: NEW  
