/**
 * Barrier Tower renderer — Section 3.
 *
 * Renders a barrier tile as a 6-high stacked tower using the SAME iso
 * projection as `drawIsometricTile`'s wall branch (wallHeight = 28 per layer).
 * Each layer is shifted up by the wall block height and shaded slightly darker
 * going up, producing a carved-stone purple-gray tower consistent with the
 * Ankama/Dofus-inspired aesthetic.
 *
 * Pure canvas drawing — no React/DOM imports. Passability, LoS, occupancy,
 * and the 3-turn expiry are untouched; this only changes the RENDER.
 */

// Wall block height — must match drawIsometricTile's wall branch (WX line 3273).
const BARRIER_LAYER_HEIGHT = 28;
const BARRIER_LAYERS = 6;

// Purple-gray barrier palette (matches the prior single-block barrier draw).
const FACE_MAIN = "rgba(42,36,51,0.96)";
const FACE_TOP = "#4a4060";
const FACE_LEFT = "rgba(74,64,96,0.6)";
const OUTLINE = "rgba(120,100,160,0.9)";

/**
 * Draw a single iso block layer at the given screen anchor.
 * Mirrors drawIsometricTile's wall branch: top diamond + right face + left face.
 */
function drawBarrierLayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tw: number,
  th: number,
  shade: number,
): void {
  const topH = BARRIER_LAYER_HEIGHT;
  const halfW = tw / 2;
  const halfH = th / 2;

  // Apply per-layer darkening by drawing a translucent black overlay after
  // the base faces. shade ranges 0 (bottom) .. 1 (top).
  const dim = shade * 0.28;

  // Right face — fully opaque
  ctx.save();
  ctx.globalAlpha = 1.0;
  ctx.beginPath();
  ctx.moveTo(x + halfW, y + halfH);
  ctx.lineTo(x + halfW, y + halfH - topH);
  ctx.lineTo(x, y - topH);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = FACE_MAIN;
  ctx.fill();
  if (dim > 0) {
    ctx.fillStyle = `rgba(0,0,0,${dim})`;
    ctx.fill();
  }
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.restore();

  // Left face — fully opaque
  ctx.save();
  ctx.globalAlpha = 1.0;
  ctx.beginPath();
  ctx.moveTo(x - halfW, y + halfH);
  ctx.lineTo(x - halfW, y + halfH - topH);
  ctx.lineTo(x, y - topH);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = FACE_LEFT;
  ctx.fill();
  if (dim > 0) {
    ctx.fillStyle = `rgba(0,0,0,${dim})`;
    ctx.fill();
  }
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.restore();

  // Top diamond — lighter purple-gray cap
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y - topH);
  ctx.lineTo(x + halfW, y + halfH - topH);
  ctx.lineTo(x, y + th - topH);
  ctx.lineTo(x - halfW, y + halfH - topH);
  ctx.closePath();
  ctx.fillStyle = FACE_TOP;
  ctx.fill();
  if (dim > 0) {
    ctx.fillStyle = `rgba(0,0,0,${dim})`;
    ctx.fill();
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw a 6-high barrier tower at the given iso anchor.
 * Layers stack upward; each layer is shifted up by BARRIER_LAYER_HEIGHT.
 */
export function drawBarrierTower(
  ctx: CanvasRenderingContext2D,
  isoX: number,
  isoY: number,
  tileW: number,
  tileH: number,
  _gridX: number,
  _gridY: number,
): void {
  ctx.save();
  // Draw bottom layer first, then stack upward so the top layer is drawn last
  // (painter's order within the tower — top cap visible above lower faces).
  for (let layer = 0; layer < BARRIER_LAYERS; layer++) {
    const layerY = isoY - layer * BARRIER_LAYER_HEIGHT;
    const shade = layer / (BARRIER_LAYERS - 1);
    drawBarrierLayer(ctx, isoX, layerY, tileW, tileH, shade);
  }
  ctx.restore();
}
