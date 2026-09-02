// rejectCopy.ts — Player-facing labels for live-cast reject reasons.
// targeting.ts emits engine tokens (ground_los_blocked). Sprite-click
// float text used to show those tokens verbatim. Presentation only.

const REJECT_COPY: Record<string, string> = {
  out_of_bounds: "Out of bounds",
  wall_tile: "Blocked",
  self_other_tile: "Invalid target",
  ally_out_of_range: "Out of range",
  ally_no_summon_at_tile: "No ally there",
  ground_out_of_range: "Out of range",
  ground_occupied: "Occupied",
  ground_los_blocked: "No line of sight",
  line_off_axis: "Must be in a line",
  line_out_of_range: "Out of range",
  line_below_min_range: "Too close",
  line_blocked_bounds: "Blocked",
  line_blocked_wall: "Blocked",
  line_not_reached: "Blocked",
  linear_off_axis: "Must be in a line",
  diagonal_off_axis: "Must be on a diagonal",
  free_cells_occupied: "No space",
  los_blocked: "No line of sight",
  area_no_radius: "Invalid target",
  area_no_anchor: "Invalid target",
  no_matching_branch: "Invalid target",
};

/**
 * Map a live-cast / targeting reason to short carved-stone float copy.
 * Already-human strings (spaces, no snake_case) pass through unchanged.
 */
export function playerFacingRejectReason(reason: string): string {
  const token = String(reason ?? "").trim();
  if (!token) return "Invalid target";
  const mapped = REJECT_COPY[token];
  if (mapped) return mapped;
  if (!token.includes("_")) return token;
  return "Invalid target";
}
