// Barrel re-export — all hooks live in focused files for tree-shaking and
// maintainability. Importing from "useQueries" continues to work unchanged.
//
// E4: Do NOT import from this file inside any of the hooks/ files.
// Doing so creates a circular dependency that can cause subtle runtime failures.
// Always import directly from the source hook file instead.
export * from "./useCharacterQueries";
export * from "./useSpellQueries";
export * from "./useAdminQueries";
export * from "./useShopQueries";
export * from "./useBossQueries";
export * from "./useLeaderboardQueries";
