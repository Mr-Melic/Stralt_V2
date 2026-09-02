/**
 * Admin copy for unused combat visual URL fields.
 *
 * WorldExploration never calls getEnemyConfigs / spriteUrl / frontUrl and
 * src/ has no ctx.drawImage. A filled EnemyConfig.spriteUrl or player
 * facing URL is catalog storage only until VAL-001/011 ships a resolver.
 * Do not bind these strings into combat to “make the copy true.”
 */

export const DEFAULT_PIXEL_VISUAL_STATUS =
  "Default Pixel Visual — Active fallback";
export const DEFAULT_PIXEL_VISUAL_CHIP = "Default pixel visual";
export const STORED_URL_NOT_RENDERED_STATUS =
  "Stored URL — not rendered in world";
export const STORED_URL_NOT_RENDERED_CHIP = "Stored URL — not rendered";
export const ENEMY_SPRITE_URL_FIELD_LABEL = "Stored sprite URL";
export const ENEMY_SPRITE_URL_HELP =
  "Default Pixel Visual — Active fallback when this field is empty. Leave blank to keep the chess-piece sprite. A pasted URL is stored on the catalog row only; it is not rendered in the world.";
export const ENEMY_SPRITE_URL_PLACEHOLDER =
  "https://… (stored only — not rendered)";
export const PLAYER_SPRITE_URL_HONESTY =
  "Paste hosted PNG/WebP URLs to store them. World combat still uses chess-piece pixels — a filled URL is stored, not rendered. Empty URLs keep the Default Pixel Visual.";

export function spriteUrlIsStored(
  spriteUrl: [] | [string] | string | undefined | null,
): boolean {
  if (typeof spriteUrl === "string") return spriteUrl.trim().length > 0;
  if (Array.isArray(spriteUrl)) {
    const first = spriteUrl[0];
    return typeof first === "string" && first.trim().length > 0;
  }
  return false;
}

export function enemyVisualStatusCopy(stored: boolean): {
  status: string;
  chip: string;
  storedNotRendered: boolean;
} {
  if (stored) {
    return {
      status: STORED_URL_NOT_RENDERED_STATUS,
      chip: STORED_URL_NOT_RENDERED_CHIP,
      storedNotRendered: true,
    };
  }
  return {
    status: DEFAULT_PIXEL_VISUAL_STATUS,
    chip: DEFAULT_PIXEL_VISUAL_CHIP,
    storedNotRendered: false,
  };
}
