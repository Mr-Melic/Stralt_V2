# Mechanic interaction matrix — 2026-08-31

**Auditor:** Mechanic Interaction Matrix Auditor  
**HEAD:** `22503b5` (after #110 / #111 / #109 / #103)  
**Gameplay code:** not modified.

Pairs were scored only when current source showed a real join. “Watch enemy cast → unlock spell” does not exist (`ownedSpells` = starter ∪ backend catalog); it is not listed as a defect.

## Priority surfaces (recently changed)

- #109 Thorned / Void Rift **player walk**
- #111 persist lock (shop / portal XP / spends)
- #110 solvability + reserved occupancy
- #103 boss/enemy heal + phase-2 store HP
- #81–#89 last-hostile DoT / plague / lava / summon fade
- In-flight: #114 (plague-death + barrier LoS), #108 (leftover XP HUD)

## Matrix (evidence-backed)

| Pair | Should | Do (on `main`) | Gap |
| :--- | :--- | :--- | :--- |
| Player walk × thorn/rift | Y | Y (#109) | Covered (`battleSetup.hp.test.ts`) |
| Player walk × lava/spikes/ice | Y | Y (path stepper) | — |
| Swap/teleport × hazards | Y | **N** | [001](./ACTION_IDS_MIMA_2026-08-31.md) |
| Summon-control walk × occupancy | Y | **N** | [002](./ACTION_IDS_MIMA_2026-08-31.md) |
| Summon-control walk × lava/spikes | Y | **N** | [002](./ACTION_IDS_MIMA_2026-08-31.md) |
| Enemy walk × lava/spikes/ice | Y | Y + store HP | — |
| AI path × Void Rift tile | Y | Tile not in `hazardTiles` | [008](./ACTION_IDS_MIMA_2026-08-31.md) |
| Push/pull × hazards | Y if shipped | Resolvers unused | [005](./ACTION_IDS_MIMA_2026-08-31.md) |
| DoT × last enemy death | Y | Y | Tests exist |
| Plague (player) × last enemy × death | Death wins | Race | [007](./ACTION_IDS_MIMA_2026-08-31.md) → #114 |
| Barrier LoS × live cast / Attack Nearest | Y | Preview only | [006](./ACTION_IDS_MIMA_2026-08-31.md) → #114 |
| Death × challenge | Fail, no pay | Early-return + cleanup | Same-tick covered by #114 |
| Reward × reload | Persist | #111 | Recap click-through [003](./ACTION_IDS_MIMA_2026-08-31.md) |
| Recap XP bar × persist curve | Match | `level*100` vs `2^(N-1)` | [004](./ACTION_IDS_MIMA_2026-08-31.md) |
| Summon spawn × portal/corridor | Not seal | Reserved spawn | `occupancy.mandatory.test.ts` |
| Boss phase × minion death | Hostiles remain | Store HP #103 | — |
| Achievement × spell discovery | — | No observe path | Not invented |

## Missing tests (actionable)

1. Swap onto lava / ice / live rift increments challenge damage (001).
2. Controlled summon cannot occupy another combatant; lava landing is lethal (002).
3. Recap visible or persist pending ⇒ walk/hazard clicks ignored (003).
4. Recap `xpForNextLevel` at character level 3 is 400 (004).
5. `applyPushback` / `applyAttract` wall-stop and no-stack **when** a spell is added (005).
6. After #114: `isTileCastableLive` + barrier fixture; lethal plague ⇒ no `applyRewards` (006, 007).
7. Enemy dest === `voidRiftTile` ⇒ `VOID_RIFT_TICK` (008).

Actionable records: [`ACTION_IDS_MIMA_2026-08-31.md`](./ACTION_IDS_MIMA_2026-08-31.md).
