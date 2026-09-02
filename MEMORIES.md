# Bug-hunt memory

Open or rejected only. Delete an entry when its PR merges or the bug is gone.

- Leftover XP HUD: character select treated `experience` as cumulative, GameFlow top bar read a never-written App `selectedCharacter.xp`/`blood`, recap used `level * 100` / `xpForNextLevel: 0`. Persist already stores leftover via `100 * 2^(N-1)`. This run. Supersedes stale #108.
- Plague Zone player death is still `setCharacterStats` HP-2 only (`WorldExploration.tsx` ~14353); victory can credit after a lethal tick. Barrier LoS is still missing from `isTileCastableLive`. Draft #114. Recorded: 2026-08-31.
- Touch battle-walk (`handleCanvasTouch`) skipped Thorned Ground and Void Rift HP / challenge debits that mouse walk applied, so tablet/touch players could complete Untouchable and under-damage challenges the mouse path fails. Shared `battleWalkHazardDamages` + `applyBattleWalkHazards`. Recorded: 2026-08-30.
- GameFlow z-9000 top bar covers WorldExploration’s 44px bar (Center, Enemies, region, dungeon chain). Canvas inset stays 44px while the live bar is 48px + safe-area. Recorded: 2026-08-31.
- BattleUIPanel is a persisted DraggablePanel, not a sticky mobile dock (DESIGN.md bottom-menu rule). Recorded: 2026-08-31.
- Spell / status `title=` tooltips and mouse-only hover preview have no touch equivalent. Documented long-press inspect is not implemented. Recorded: 2026-08-31.
- Sprite hit padding is 10px mouse vs 14px touch; live gates match after target pick. Recorded: 2026-08-31.
