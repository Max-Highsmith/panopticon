/* ===================================================================
   PANOPTICON — Canvas Icon Generators
   =================================================================== */

function createCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return { canvas: c, ctx: c.getContext('2d'), cx: size / 2, cy: size / 2 };
}

function strokeAndFill(ctx, color, lineWidth) {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();
}

export function makePlaneIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const s = size / 2 * 0.85;

  const drawPath = () => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.08, cy - s * 0.25);
    ctx.lineTo(cx + s * 0.65, cy + s * 0.05);
    ctx.lineTo(cx + s * 0.1,  cy + s * 0.12);
    ctx.lineTo(cx + s * 0.18, cy + s * 0.7);
    ctx.lineTo(cx,            cy + s * 0.5);
    ctx.lineTo(cx - s * 0.18, cy + s * 0.7);
    ctx.lineTo(cx - s * 0.1,  cy + s * 0.12);
    ctx.lineTo(cx - s * 0.65, cy + s * 0.05);
    ctx.lineTo(cx - s * 0.08, cy - s * 0.25);
    ctx.closePath();
  };

  drawPath();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = size * 0.04;
  ctx.lineJoin = 'round';
  ctx.stroke();

  drawPath();
  ctx.fillStyle = color;
  ctx.fill();

  return canvas;
}

export function makeShipIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const s = size / 2 * 0.8;

  const drawPath = () => {
    ctx.beginPath();
    ctx.moveTo(cx,           cy - s);
    ctx.lineTo(cx + s * 0.4, cy);
    ctx.lineTo(cx + s * 0.3, cy + s * 0.8);
    ctx.lineTo(cx - s * 0.3, cy + s * 0.8);
    ctx.lineTo(cx - s * 0.4, cy);
    ctx.closePath();
  };

  drawPath();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = size * 0.08;
  ctx.lineJoin = 'round';
  ctx.stroke();

  drawPath();
  ctx.fillStyle = color;
  ctx.fill();

  return canvas;
}

export function makeSatIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const s = size / 2 * 0.6;

  ctx.fillStyle = color;
  ctx.fillRect(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6);          // body
  ctx.fillRect(cx - s,       cy - s * 0.15, s * 0.55, s * 0.3);         // left panel
  ctx.fillRect(cx + s * 0.45,cy - s * 0.15, s * 0.55, s * 0.3);         // right panel

  ctx.strokeStyle = '#000';
  ctx.lineWidth = size * 0.04;
  ctx.strokeRect(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6);
  ctx.strokeRect(cx - s,       cy - s * 0.15, s * 0.55, s * 0.3);
  ctx.strokeRect(cx + s * 0.45,cy - s * 0.15, s * 0.55, s * 0.3);

  return canvas;
}

export function makePogoIcon(size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;

  // Bottom half (white)
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Top half (red)
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.fillStyle = '#ff4444';
  ctx.fill();

  // Center band
  ctx.fillStyle = '#222';
  ctx.fillRect(cx - r, cy - r * 0.08, r * 2, r * 0.16);

  // Center button
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = size * 0.04;
  ctx.stroke();

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = size * 0.05;
  ctx.stroke();

  return canvas;
}

// Pre-rendered icon cache
export const icons = {
  planeGreen:  makePlaneIcon('#00ff41', 96),
  planeBlue:   makePlaneIcon('#4488ff', 96),
  planeMilLive:makePlaneIcon('#00ff41', 96),
  shipBlue:    makeShipIcon('#4488ff', 48),
  satYellow:   makeSatIcon('#ffaa00', 48),
  pogo:        makePogoIcon(36),
};
