# ACTION_IDs — 2026-09-02 (Player Experience Coherence Auditor)

**Source:** Player Experience Coherence Auditor (`30118f7c-a49e-11f1-a7d1-d6b4613131ce`)  
**HEAD:** `58302bc` (`Merge pull request #258` — Doka GameKey shop)  
**Narrative:** [`PX_COHERENCE_AUDIT_2026-09-02.md`](./PX_COHERENCE_AUDIT_2026-09-02.md)

Prior PX records remain **open**. Do not re-file:

- `PXA-2026-08-31-001` … `015` in [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md)
- `PXA-2026-09-01-001` … `003` in [`ACTION_IDS_2026-09-01.md`](./ACTION_IDS_2026-09-01.md)

Gameplay / production code was **not** modified this run. Do not implement from this file unless a human or the Report Action Orchestrator picks an ID.

---

ACTION_ID: PXA-2026-09-02-001  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Keep GameKey as off-loop IAP; stop treating it as a tactical HUD system  
CATEGORY: shops  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: PR #258 replaced the player Doka-package picker with Mollie + admin-approved GameKey. World HUD cart is titled **Buy Doka** (`WorldExploration.tsx` 17790–17821) and opens `DokaGameKeyShop` (19202–19210). Copy requires email, consent, a QR payment, an admin wait, then a **120-character** redeem (`iapShopCopy.ts` 6–23; `dokaGameKey.ts` `GAME_KEY_LENGTH`). That answers none of the four PX questions (no decision, mastery, fantasy, or counterplay). A second cart already exists: GameFlow **Items** (`GameFlow.tsx` 307–316) opens `BuffShop` via `itemShopOpen` (WX 17922–17958). Canister `defaultShopPackages()` still seeds 15 SKUs through 1.6M Doka (`admin.mo` 265–282); `getShopPackages` is public; no player caller under `src/frontend/src/components`. Buff catalog drift is unchanged (`BuffShop.tsx` 31–79 vs `main.mo` 2707–2714) and stays PXA-011. “GameKey” is a new player-facing word beside Doka.  
SYSTEMS_AFFECTED: shops, visual feedback, terminology, admin-enabled content, progression  
RECOMMENDED_ACTION: SIMPLIFY. KEEP GameKey as the real-money faucet, off the combat language. Do not add a second wallet. Move Buy Doka out of the leftover-XP bar (settings / pause is enough). One cart icon in the realm row, or two **named** stores (Items vs Buy Doka) without a third noun. DEPRECATE the 15 `defaultShopPackages` from player-facing truth: stop seeding, or stop returning them from `getShopPackages` until an admin picker is the live UI. Do not re-introduce SKU tiles on the world HUD. Buff id/cost cutover remains PXA-011.  
AUTONOMY: HUMAN_DESIGN_REQUIRED for IAP placement and canister package retirement; ORCHESTRATOR_MAY_DRAFT to stop listing unused packages in any player-facing admin/help copy  
DEPENDENCIES: PXA-2026-08-31-011 (buff catalog + spell clones); PXA-2026-08-31-012 (one word per concept). Does not replace PXA-011.  
REGRESSION_RISK: MEDIUM if `getShopPackages` is deleted while a live canister or unmerged client still reads it. LOW if only HUD placement and copy change. HIGH if GameKey redeem is taken off the persist lock.  
VALIDATION_REQUIRED: World HUD leftover-XP row has Doka amount, not a second shop ritual. Redeem still credits through `redeemGameKeyThroughPersist`. `getShopPackages` is either unused and documented dead, or the live player UI. Typecheck clean.  
STATUS: NEW

---

ACTION_ID: PXA-2026-09-02-002  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Keep the challenge HUD visible after the player accepts  
CATEGORY: challenges  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Every fight still assigns one of 9 contracts at random, including legendary Untouchable 1000 XP (`WorldExploration.tsx` 12325–12333; `challengeCompletion.ts` 81–86). `markFirstAction` (WX 17174–17181) is documented as an **accept window**: if the offer is not accepted, drop it. `ChallengePanel` `visible` is `inBattle && !!currentChallenge && !firstActionTakenRef.current` (19219). After the first AP/MP spend, an **accepted** contract therefore loses the panel that shows turns, damage taken, Striker status, and on-track/failed (`ChallengePanel.tsx` 282–309). `firstActionTakenRef` is a ref, so hide happens on the next React render (HP/AP setState), not on the comment’s intent. Mastery that cannot be seen while it is being executed is not mastery. Offer-shaping (lava vs Untouchable, feat overlap) remains PXA-009.  
SYSTEMS_AFFECTED: challenges, visual feedback, rewards  
RECOMMENDED_ACTION: SIMPLIFY the HUD gate to match the comment: dismiss **unaccepted** offers on first action; keep `visible` for `challengeAccepted` until victory/defeat/decline. Do not put the contract only in the battle log. Do not change `DEFAULT_CHALLENGES` or persist wiring in this ID.  
AUTONOMY: ORCHESTRATOR_MAY_DRAFT (visibility condition + a unit test on the predicate). HUMAN_DESIGN_REQUIRED if the accept window itself should move (e.g. offer only after initiative).  
DEPENDENCIES: PXA-2026-08-31-009 (offer shaping, feat overlap). Do not block 009 on this HUD fix.  
REGRESSION_RISK: LOW — persist still uses `currentChallengeRef` / `challengeAcceptedRef`, not the panel. MEDIUM if `visible=false` is later treated as decline.  
VALIDATION_REQUIRED: Accept Untouchable, spend 2 AP: panel still shows “Damage taken: N”. Decline or ignore, then walk: offer gone, no persist credit. `pnpm typecheck`. Opening-turn Blitz count (`shouldCountOpeningPlayerTurn`) unchanged.  
STATUS: NEW

---

ACTION_ID: PXA-2026-09-02-003  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Paper Windstorm must be one rate, one sentence, one hook  
CATEGORY: world-events  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Announce (and therefore the admin dropdown, which now copies `announceText` via `listAdminModifierTypeOptions` at `mapModifiers.ts` 505–513) is “Paper Windstorm: ranged spell reach halved.” (249–257). Registry comment claims targeting applies ×0.5. `targeting.ts` has no windstorm branch. Live player casts go through `paperWindstormMiss` in WX 9603–9612: `Math.random() * 100 < 30` with **no** `range > 1` check. Live enemy casts/melee fallback still use `isPaperWindstorm && spellRange > 1 && Math.random() < 0.5` (WX 16579, 16817). Last audit’s PXA-2026-09-01-002 assumed a single 50% miss and asked copy to match it. Copy was not fixed; a second live rate was added. That is a new encounter-honesty break: the named event disagrees with itself. Blood Moon / Gravity / Fog / Frozen twins stay under 09-01-002.  
SYSTEMS_AFFECTED: world events, visual feedback, admin-enabled content, challenges (ranged contracts on a Windstorm map)  
RECOMMENDED_ACTION: REWORK. Pick **one** player-facing rule (recommend: 50% miss when `range > 1`, matching the enemy path and last 002 copy advice — or 30% for everyone, if that is the intended feel). Delete the other hook. Set `announceText` (and thus admin labels) to that sentence. Do not implement “reach halved” unless targeting actually halves range. Do not leave flavor that reads as a rule.  
AUTONOMY: ORCHESTRATOR_MAY_DRAFT for unifying the two live branches + announce string. HUMAN_DESIGN_REQUIRED to invent a new third rate or to implement true half-range.  
DEPENDENCIES: PXA-2026-09-01-002 (remaining announce-vs-engine ids); PXA-2026-08-31-008 (slim the set). Does not close 002.  
REGRESSION_RISK: MEDIUM — changing player 30% → 50% (or enemy 50% → 30%) changes fight outcomes and Striker/ranged challenges on Windstorm maps. LOW if only announce is fixed **after** the hooks match.  
VALIDATION_REQUIRED: One function implements Windstorm. Player Inferno and enemy Frost on the same map use it. Announce, Map Effects, and admin dropdown print that function’s sentence. Targeting range is unchanged. Import gate.  
STATUS: NEW
