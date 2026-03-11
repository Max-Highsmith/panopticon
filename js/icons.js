/* ===================================================================
   PANOPTICON — Canvas Icon Generators
   =================================================================== */

const DPR = Math.min(window.devicePixelRatio || 1, 2);

function createCanvas(size) {
  const c = document.createElement('canvas');
  const px = size * DPR;
  c.width = px;
  c.height = px;
  const ctx = c.getContext('2d');
  ctx.scale(DPR, DPR);
  return { canvas: c, ctx, cx: size / 2, cy: size / 2 };
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
  const s = size / 2 * 0.85;
  const lw = Math.max(size * 0.02, 0.5);

  // Glow behind entire satellite
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.1);
  glow.addColorStop(0, color + '30');
  glow.addColorStop(1, color + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // --- Solar panels (two large wings) ---
  const panelW = s * 0.52;
  const panelH = s * 0.7;
  const panelGap = s * 0.22;   // gap from center to panel edge
  const panelY = cy - panelH / 2;

  for (const side of [-1, 1]) {
    const px = side === -1 ? cx - panelGap - panelW : cx + panelGap;

    // Panel fill — darker shade
    ctx.fillStyle = color + '55';
    ctx.fillRect(px, panelY, panelW, panelH);

    // Panel grid cells
    ctx.strokeStyle = color + '80';
    ctx.lineWidth = lw * 0.6;
    const cols = 3, rows = 4;
    for (let c = 0; c <= cols; c++) {
      const gx = px + (panelW / cols) * c;
      ctx.beginPath();
      ctx.moveTo(gx, panelY);
      ctx.lineTo(gx, panelY + panelH);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const gy = panelY + (panelH / rows) * r;
      ctx.beginPath();
      ctx.moveTo(px, gy);
      ctx.lineTo(px + panelW, gy);
      ctx.stroke();
    }

    // Panel outline
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.strokeRect(px, panelY, panelW, panelH);

    // Panel strut connecting to body
    ctx.strokeStyle = color + 'AA';
    ctx.lineWidth = lw * 1.5;
    ctx.beginPath();
    ctx.moveTo(side === -1 ? px + panelW : px, cy);
    ctx.lineTo(side === -1 ? cx - s * 0.12 : cx + s * 0.12, cy);
    ctx.stroke();
  }

  // --- Satellite bus (octagonal body) ---
  const bw = s * 0.24;
  const bh = s * 0.32;
  const bevel = bw * 0.35;

  ctx.beginPath();
  ctx.moveTo(cx - bw + bevel, cy - bh);
  ctx.lineTo(cx + bw - bevel, cy - bh);
  ctx.lineTo(cx + bw,         cy - bh + bevel);
  ctx.lineTo(cx + bw,         cy + bh - bevel);
  ctx.lineTo(cx + bw - bevel, cy + bh);
  ctx.lineTo(cx - bw + bevel, cy + bh);
  ctx.lineTo(cx - bw,         cy + bh - bevel);
  ctx.lineTo(cx - bw,         cy - bh + bevel);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = lw * 1.5;
  ctx.stroke();

  // Body highlight
  ctx.fillStyle = '#ffffff30';
  ctx.beginPath();
  ctx.moveTo(cx - bw + bevel, cy - bh);
  ctx.lineTo(cx + bw - bevel, cy - bh);
  ctx.lineTo(cx + bw,         cy - bh + bevel);
  ctx.lineTo(cx - bw,         cy - bh + bevel);
  ctx.closePath();
  ctx.fill();

  // --- Antenna boom + dish ---
  const antennaLen = s * 0.35;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(cx, cy - bh);
  ctx.lineTo(cx, cy - bh - antennaLen);
  ctx.stroke();

  // Small dish at tip
  ctx.beginPath();
  ctx.arc(cx, cy - bh - antennaLen, s * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = lw;
  ctx.stroke();

  return canvas;
}

export function makePogoIcon(size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;

  // Bottom half (dark gray)
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();

  // Top half (surveillance green)
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.fillStyle = '#00ff41';
  ctx.fill();

  // Center band
  ctx.fillStyle = '#111';
  ctx.fillRect(cx - r, cy - r * 0.09, r * 2, r * 0.18);

  // Eye white (instead of button)
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.32, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e0e0e0';
  ctx.fill();

  // Iris
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = '#00cc33';
  ctx.fill();

  // Pupil
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();

  // Eye outline
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.32, r * 0.18, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = size * 0.03;
  ctx.stroke();

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = size * 0.05;
  ctx.stroke();

  return canvas;
}

export function makeDiamondIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;

  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.6, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.6, cy);
  ctx.closePath();
  strokeAndFill(ctx, color, size * 0.06);

  // Inner highlight
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.5);
  ctx.lineTo(cx + r * 0.3, cy);
  ctx.lineTo(cx, cy + r * 0.5);
  ctx.lineTo(cx - r * 0.3, cy);
  ctx.closePath();
  ctx.fillStyle = '#ffffff30';
  ctx.fill();

  return canvas;
}

export function makeServerIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const w = size * 0.55;
  const h = size * 0.7;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const rowH = h / 3;

  // Server rack body
  for (let i = 0; i < 3; i++) {
    const ry = y + i * rowH;
    ctx.fillStyle = color + '88';
    ctx.fillRect(x, ry + 1, w, rowH - 2);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = size * 0.03;
    ctx.strokeRect(x, ry + 1, w, rowH - 2);

    // Status LED
    ctx.beginPath();
    ctx.arc(x + w - size * 0.08, ry + rowH / 2, size * 0.03, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Outer border
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.04;
  ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);

  return canvas;
}

export function makeRadiationIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;

  // Three trefoil blades
  for (let i = 0; i < 3; i++) {
    const angle = (i * 120 - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.arc(cx, cy, r, angle - 0.52, angle + 0.52);
    ctx.arc(cx, cy, r * 0.35, angle + 0.52, angle - 0.52, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
  }

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = size * 0.03;
  ctx.stroke();

  return canvas;
}

export function makeCircleIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.6;

  // Glow
  const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.3);
  glow.addColorStop(0, color + '60');
  glow.addColorStop(1, color + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Main dot
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  strokeAndFill(ctx, color, size * 0.06);

  return canvas;
}

export function makeAirportIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;

  // Outer circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.06;
  ctx.stroke();

  // Crossed runways
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.65, cy);
  ctx.lineTo(cx + r * 0.65, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.65);
  ctx.lineTo(cx, cy + r * 0.65);
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  return canvas;
}

export function makeMilitaryBaseIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;

  // Shield / pentagon shape
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);                       // top center
  ctx.lineTo(cx + r * 0.9, cy - r * 0.3);       // top right
  ctx.lineTo(cx + r * 0.7, cy + r * 0.8);       // bottom right
  ctx.lineTo(cx, cy + r);                        // bottom point
  ctx.lineTo(cx - r * 0.7, cy + r * 0.8);       // bottom left
  ctx.lineTo(cx - r * 0.9, cy - r * 0.3);       // top left
  ctx.closePath();
  strokeAndFill(ctx, color, size * 0.06);

  // Inner star
  const sy = cy - r * 0.05;
  const starR = r * 0.35;
  const innerR = starR * 0.4;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * 36 - 90) * Math.PI / 180;
    const rad = i % 2 === 0 ? starR : innerR;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + Math.cos(angle) * rad, sy + Math.sin(angle) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff50';
  ctx.fill();

  return canvas;
}

export function makeWebcamIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;

  // Glow
  const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.3);
  glow.addColorStop(0, color + '40');
  glow.addColorStop(1, color + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Camera body (rounded rectangle)
  const bw = r * 0.9;
  const bh = r * 0.65;
  const br = r * 0.12;
  ctx.beginPath();
  ctx.moveTo(cx - bw + br, cy - bh * 0.3);
  ctx.lineTo(cx + bw - br, cy - bh * 0.3);
  ctx.arcTo(cx + bw, cy - bh * 0.3, cx + bw, cy - bh * 0.3 + br, br);
  ctx.lineTo(cx + bw, cy + bh * 0.7 - br);
  ctx.arcTo(cx + bw, cy + bh * 0.7, cx + bw - br, cy + bh * 0.7, br);
  ctx.lineTo(cx - bw + br, cy + bh * 0.7);
  ctx.arcTo(cx - bw, cy + bh * 0.7, cx - bw, cy + bh * 0.7 - br, br);
  ctx.lineTo(cx - bw, cy - bh * 0.3 + br);
  ctx.arcTo(cx - bw, cy - bh * 0.3, cx - bw + br, cy - bh * 0.3, br);
  ctx.closePath();
  strokeAndFill(ctx, color, size * 0.04);

  // Lens circle
  ctx.beginPath();
  ctx.arc(cx, cy + bh * 0.1, r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.03;
  ctx.stroke();

  // Lens inner highlight
  ctx.beginPath();
  ctx.arc(cx - r * 0.08, cy + bh * 0.1 - r * 0.08, r * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff50';
  ctx.fill();

  // Viewfinder bump on top
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.1, cy - bh * 0.3);
  ctx.lineTo(cx + r * 0.35, cy - bh * 0.3 - r * 0.25);
  ctx.lineTo(cx + r * 0.6, cy - bh * 0.3 - r * 0.25);
  ctx.lineTo(cx + r * 0.6, cy - bh * 0.3);
  ctx.closePath();
  strokeAndFill(ctx, color, size * 0.03);

  return canvas;
}

export function makePickaxeIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;

  // Pick head — angled slash
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.7, cy - r * 0.5);
  ctx.lineTo(cx + r * 0.4, cy + r * 0.2);
  ctx.stroke();

  // Handle
  ctx.lineWidth = size * 0.06;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.1, cy - r * 0.1);
  ctx.lineTo(cx + r * 0.3, cy + r * 0.8);
  ctx.stroke();

  // Pick point
  ctx.beginPath();
  ctx.arc(cx - r * 0.7, cy - r * 0.5, size * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  return canvas;
}

export function makeHexIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.65;

  // Hexagon
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 30) * Math.PI / 180;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  ctx.closePath();
  strokeAndFill(ctx, color, size * 0.06);

  // Inner dot
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff40';
  ctx.fill();

  return canvas;
}

export function makeDerrickIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.8;

  // Tower — triangle
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.4, cy + r * 0.7);
  ctx.lineTo(cx - r * 0.4, cy + r * 0.7);
  ctx.closePath();
  ctx.fillStyle = color + '44';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.04;
  ctx.stroke();

  // Cross braces
  ctx.strokeStyle = color + '88';
  ctx.lineWidth = size * 0.025;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.2, cy);
  ctx.lineTo(cx + r * 0.2, cy);
  ctx.moveTo(cx - r * 0.28, cy + r * 0.3);
  ctx.lineTo(cx + r * 0.28, cy + r * 0.3);
  ctx.stroke();

  // Platform base
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy + r * 0.7);
  ctx.lineTo(cx + r * 0.55, cy + r * 0.7);
  ctx.stroke();

  // Flame tip
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.85, size * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  return canvas;
}

export function makePowerPlantIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy + r);
  ctx.quadraticCurveTo(cx - r * 0.6, cy, cx - r * 0.35, cy - r * 0.6);
  ctx.lineTo(cx + r * 0.35, cy - r * 0.6);
  ctx.quadraticCurveTo(cx + r * 0.6, cy, cx + r * 0.5, cy + r);
  ctx.closePath();
  strokeAndFill(ctx, color + '88', size * 0.04);
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.05, cy - r * 0.3);
  ctx.lineTo(cx - r * 0.15, cy + r * 0.15);
  ctx.lineTo(cx, cy + r * 0.1);
  ctx.lineTo(cx - r * 0.05, cy + r * 0.5);
  ctx.lineTo(cx + r * 0.2, cy - r * 0.05);
  ctx.lineTo(cx + r * 0.05, cy);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  return canvas;
}

export function makeRefineryIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;
  for (let i = -1; i <= 1; i++) {
    const tw = r * 0.2, th = r * (1.2 + i * 0.2), tx = cx + i * r * 0.35;
    ctx.fillStyle = color + '66';
    ctx.fillRect(tx - tw / 2, cy + r * 0.5 - th, tw, th);
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.03;
    ctx.strokeRect(tx - tw / 2, cy + r * 0.5 - th, tw, th);
    ctx.beginPath();
    ctx.arc(tx, cy + r * 0.5 - th, tw / 2, Math.PI, 0);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.fillStyle = color + '44';
  ctx.fillRect(cx - r * 0.7, cy + r * 0.5, r * 1.4, r * 0.2);
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.03;
  ctx.strokeRect(cx - r * 0.7, cy + r * 0.5, r * 1.4, r * 0.2);
  return canvas;
}

export function makeRadarIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.8, -Math.PI * 0.8, -Math.PI * 0.2);
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.06;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy + r * 0.8);
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.05;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.4, cy + r * 0.8);
  ctx.lineTo(cx + r * 0.4, cy + r * 0.8);
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.06;
  ctx.stroke();
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.3, r * 0.2 * i, -Math.PI * 0.6, -Math.PI * 0.4);
    ctx.strokeStyle = color + (i === 1 ? 'cc' : i === 2 ? '88' : '44');
    ctx.lineWidth = size * 0.025;
    ctx.stroke();
  }
  return canvas;
}

export function makeNuclearPlantIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.1, r * 0.5, Math.PI, 0);
  ctx.lineTo(cx + r * 0.5, cy + r * 0.6);
  ctx.lineTo(cx - r * 0.5, cy + r * 0.6);
  ctx.closePath();
  strokeAndFill(ctx, color + '66', size * 0.04);
  const sr = r * 0.22;
  for (let i = 0; i < 3; i++) {
    const angle = (i * 120 - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.1, sr, angle - 0.4, angle + 0.4);
    ctx.arc(cx, cy + r * 0.1, sr * 0.35, angle + 0.4, angle - 0.4, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.1, sr * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  return canvas;
}

export function makeWarheadIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.2, cy - r * 0.5);
  ctx.lineTo(cx + r * 0.2, cy + r * 0.5);
  ctx.lineTo(cx + r * 0.4, cy + r * 0.8);
  ctx.lineTo(cx + r * 0.4, cy + r);
  ctx.lineTo(cx - r * 0.4, cy + r);
  ctx.lineTo(cx - r * 0.4, cy + r * 0.8);
  ctx.lineTo(cx - r * 0.2, cy + r * 0.5);
  ctx.lineTo(cx - r * 0.2, cy - r * 0.5);
  ctx.closePath();
  strokeAndFill(ctx, color, size * 0.04);
  ctx.fillStyle = '#00000044';
  ctx.fillRect(cx - r * 0.2, cy - r * 0.2, r * 0.4, r * 0.15);
  return canvas;
}

export function makeVolcanoIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.75;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.5);
  ctx.lineTo(cx + r * 0.8, cy + r * 0.7);
  ctx.lineTo(cx - r * 0.8, cy + r * 0.7);
  ctx.closePath();
  strokeAndFill(ctx, color + '66', size * 0.04);
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.7, r * 0.12, 0, Math.PI * 2);
  ctx.arc(cx - r * 0.1, cy - r * 0.85, r * 0.1, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.1, cy - r * 0.8, r * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  return canvas;
}

export function makePlatformIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.75;
  ctx.fillStyle = color + '66';
  ctx.fillRect(cx - r * 0.6, cy - r * 0.1, r * 1.2, r * 0.25);
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.03;
  ctx.strokeRect(cx - r * 0.6, cy - r * 0.1, r * 1.2, r * 0.25);
  ctx.lineWidth = size * 0.04;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.4, cy + r * 0.15);
  ctx.lineTo(cx - r * 0.3, cy + r * 0.8);
  ctx.moveTo(cx + r * 0.4, cy + r * 0.15);
  ctx.lineTo(cx + r * 0.3, cy + r * 0.8);
  ctx.stroke();
  ctx.lineWidth = size * 0.03;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.8);
  ctx.lineTo(cx + r * 0.15, cy - r * 0.1);
  ctx.moveTo(cx, cy - r * 0.8);
  ctx.lineTo(cx - r * 0.15, cy - r * 0.1);
  ctx.stroke();
  return canvas;
}

export function makeEarthquakeIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;
  for (let i = 3; i >= 1; i--) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * (i / 3), 0, Math.PI * 2);
    ctx.strokeStyle = color + (i === 1 ? 'ff' : i === 2 ? '88' : '44');
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.6, cy);
  ctx.lineTo(cx - r * 0.3, cy - r * 0.3);
  ctx.lineTo(cx - r * 0.1, cy + r * 0.2);
  ctx.lineTo(cx + r * 0.1, cy - r * 0.4);
  ctx.lineTo(cx + r * 0.3, cy + r * 0.1);
  ctx.lineTo(cx + r * 0.6, cy);
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.05;
  ctx.stroke();
  return canvas;
}

export function makeFireIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.7;
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.7);
  ctx.quadraticCurveTo(cx - r * 0.6, cy + r * 0.3, cx - r * 0.5, cy - r * 0.2);
  ctx.quadraticCurveTo(cx - r * 0.3, cy - r * 0.6, cx, cy - r);
  ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.6, cx + r * 0.5, cy - r * 0.2);
  ctx.quadraticCurveTo(cx + r * 0.6, cy + r * 0.3, cx, cy + r * 0.7);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = size * 0.03;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.5);
  ctx.quadraticCurveTo(cx - r * 0.25, cy + r * 0.1, cx - r * 0.2, cy - r * 0.1);
  ctx.quadraticCurveTo(cx, cy - r * 0.5, cx + r * 0.2, cy - r * 0.1);
  ctx.quadraticCurveTo(cx + r * 0.25, cy + r * 0.1, cx, cy + r * 0.5);
  ctx.closePath();
  ctx.fillStyle = '#ffcc00';
  ctx.fill();
  return canvas;
}

export function makeRocketIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.85;
  ctx.fillStyle = color;
  ctx.beginPath();
  // Rocket body
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.4, cx + r * 0.25, cy + r * 0.3);
  ctx.lineTo(cx + r * 0.45, cy + r * 0.7);
  ctx.lineTo(cx + r * 0.15, cy + r * 0.5);
  ctx.lineTo(cx, cy + r * 0.8);
  ctx.lineTo(cx - r * 0.15, cy + r * 0.5);
  ctx.lineTo(cx - r * 0.45, cy + r * 0.7);
  ctx.lineTo(cx - r * 0.25, cy + r * 0.3);
  ctx.quadraticCurveTo(cx - r * 0.3, cy - r * 0.4, cx, cy - r);
  ctx.closePath();
  ctx.fill();
  // Window
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.2, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

export function makeLightningIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.85;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.1, cy - r);
  ctx.lineTo(cx - r * 0.3, cy - r * 0.05);
  ctx.lineTo(cx + r * 0.05, cy - r * 0.05);
  ctx.lineTo(cx - r * 0.15, cy + r);
  ctx.lineTo(cx + r * 0.35, cy + r * 0.05);
  ctx.lineTo(cx - r * 0.0, cy + r * 0.05);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

export function makeAnchorIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.85;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  // Vertical shaft
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.6);
  ctx.lineTo(cx, cy + r * 0.7);
  ctx.stroke();
  // Ring at top
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.7, r * 0.15, 0, Math.PI * 2);
  ctx.stroke();
  // Crossbar
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.4, cy - r * 0.2);
  ctx.lineTo(cx + r * 0.4, cy - r * 0.2);
  ctx.stroke();
  // Flukes (curved arms at bottom)
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.6, cy + r * 0.2);
  ctx.quadraticCurveTo(cx - r * 0.5, cy + r * 0.8, cx, cy + r * 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.6, cy + r * 0.2);
  ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.8, cx, cy + r * 0.7);
  ctx.stroke();
  return canvas;
}

export function makeReticleIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const r = size / 2 * 0.85;
  const gap = r * 0.35;
  const arm = r * 0.35;
  const corner = r * 0.92;
  const cLen = r * 0.3;

  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.04;
  ctx.lineCap = 'round';

  // Crosshair arms (with center gap)
  ctx.beginPath();
  ctx.moveTo(cx - gap - arm, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy);       ctx.lineTo(cx + gap + arm, cy);
  ctx.moveTo(cx, cy - gap - arm); ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap);       ctx.lineTo(cx, cy + gap + arm);
  ctx.stroke();

  // Corner brackets
  ctx.lineWidth = size * 0.05;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(cx - corner, cy - corner + cLen);
  ctx.lineTo(cx - corner, cy - corner);
  ctx.lineTo(cx - corner + cLen, cy - corner);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(cx + corner - cLen, cy - corner);
  ctx.lineTo(cx + corner, cy - corner);
  ctx.lineTo(cx + corner, cy - corner + cLen);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(cx - corner, cy + corner - cLen);
  ctx.lineTo(cx - corner, cy + corner);
  ctx.lineTo(cx - corner + cLen, cy + corner);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(cx + corner - cLen, cy + corner);
  ctx.lineTo(cx + corner, cy + corner);
  ctx.lineTo(cx + corner, cy + corner - cLen);
  ctx.stroke();

  return canvas;
}

export function makePersonIcon(color, size) {
  const { canvas, ctx, cx, cy } = createCanvas(size);
  const s = size * 0.4;
  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.55, s * 0.35, 0, Math.PI * 2);
  strokeAndFill(ctx, color, size * 0.04);
  // Shoulders / torso
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.6, cy + s * 0.7);
  ctx.quadraticCurveTo(cx - s * 0.6, cy, cx, cy - s * 0.1);
  ctx.quadraticCurveTo(cx + s * 0.6, cy, cx + s * 0.6, cy + s * 0.7);
  ctx.closePath();
  strokeAndFill(ctx, color, size * 0.04);
  return canvas;
}

// Icon render sizes — matched to DISPLAY sizes in config.js to avoid
// bitmap resampling in Cesium. DPR scaling is handled by createCanvas().
const SZ_MIL = 42, SZ_CIV = 28, SZ_SHIP = 42, SZ_SAT = 24;
const SZ_POGO = 22, SZ_MINE = 28, SZ_INFRA = 28, SZ_BASE = 28;
const SZ_CUSTOM = 18, SZ_APT_LG = 24, SZ_APT_MD = 18, SZ_WCAM = 22;
const SZ_PERSON = 28;

// Pre-rendered icon cache
export const icons = {
  planeGreen:  makePlaneIcon('#00ff41', SZ_MIL),
  planeBlue:   makePlaneIcon('#4488ff', SZ_CIV),
  planeMilLive:makePlaneIcon('#00ff41', SZ_MIL),
  shipBlue:    makeShipIcon('#4488ff', SZ_SHIP),
  satYellow:   makeSatIcon('#ffaa00', SZ_SAT),
  pogo:        makePogoIcon(SZ_POGO),
  mineCobalt:   makeDiamondIcon('#cc44ff', SZ_MINE),
  mineLithium:  makeDiamondIcon('#00ddcc', SZ_MINE),
  mineBitcoin:  makeDiamondIcon('#f7931a', SZ_MINE),
  datacenter:   makeServerIcon('#ff8800', SZ_INFRA),
  nuclear:      makeRadiationIcon('#ff2222', SZ_INFRA),
  militaryBase: makeMilitaryBaseIcon('#ff6644', SZ_BASE),
  customDot:    makeCircleIcon('#ff00ff', SZ_CUSTOM),
  airportLarge: makeAirportIcon('#00ccff', SZ_APT_LG),
  airportMedium:makeAirportIcon('#00ccff88', SZ_APT_MD),
  webcam:       makeWebcamIcon('#00ddff', SZ_WCAM),
  reticle:      makeReticleIcon('#ffffff', 128),
  // Arctic mining
  mineIron:      makePickaxeIcon('#cc6633', SZ_MINE),
  mineRareEarth: makePickaxeIcon('#ff44cc', SZ_MINE),
  mineZinc:      makePickaxeIcon('#88aadd', SZ_MINE),
  mineGold:      makePickaxeIcon('#ffcc00', SZ_MINE),
  // Rare earth deposits
  reeHeavy:      makeHexIcon('#ff44cc', SZ_MINE),
  reeLight:      makeHexIcon('#cc88ff', SZ_MINE),
  reeStrategic:  makeHexIcon('#ffaa44', SZ_MINE),
  // Critical minerals
  mineralLithium:    makeDiamondIcon('#00ddcc', SZ_MINE),
  mineralCobalt:     makeDiamondIcon('#cc44ff', SZ_MINE),
  mineralNickel:     makeDiamondIcon('#44cc88', SZ_MINE),
  mineralGraphite:   makeDiamondIcon('#888888', SZ_MINE),
  mineralManganese:  makeDiamondIcon('#cc6688', SZ_MINE),
  mineralVanadium:   makeDiamondIcon('#7744cc', SZ_MINE),
  mineralReeLight:   makeDiamondIcon('#dd88ff', SZ_MINE),
  mineralReeHeavy:   makeDiamondIcon('#ff66cc', SZ_MINE),
  mineralCopper:     makeDiamondIcon('#cc7744', SZ_MINE),
  mineralBauxite:    makeDiamondIcon('#dd8855', SZ_MINE),
  mineralSilicon:    makeDiamondIcon('#8888cc', SZ_MINE),
  mineralTin:        makeDiamondIcon('#aabb99', SZ_MINE),
  mineralGallium:    makeDiamondIcon('#6688cc', SZ_MINE),
  mineralGermanium:  makeDiamondIcon('#7799bb', SZ_MINE),
  mineralIndium:     makeDiamondIcon('#5588bb', SZ_MINE),
  mineralTantalum:   makeDiamondIcon('#bb7744', SZ_MINE),
  mineralNiobium:    makeDiamondIcon('#cc8855', SZ_MINE),
  mineralTungsten:   makeDiamondIcon('#9999bb', SZ_MINE),
  mineralTitanium:   makeDiamondIcon('#88aacc', SZ_MINE),
  mineralBeryllium:  makeDiamondIcon('#aacc88', SZ_MINE),
  mineralChromium:   makeDiamondIcon('#dd5566', SZ_MINE),
  mineralAntimony:   makeDiamondIcon('#bb6699', SZ_MINE),
  mineralPlatinum:   makeDiamondIcon('#ccccee', SZ_MINE),
  mineralPalladium:  makeDiamondIcon('#bbbbdd', SZ_MINE),
  mineralUranium:    makeDiamondIcon('#44dd44', SZ_MINE),
  mineralTellurium:  makeDiamondIcon('#779988', SZ_MINE),
  mineralFluorspar:  makeDiamondIcon('#66bbcc', SZ_MINE),
  mineralMagnesium:  makeDiamondIcon('#99bb66', SZ_MINE),
  mineralZinc:       makeDiamondIcon('#8899aa', SZ_MINE),
  mineralPhosphate:  makeDiamondIcon('#ccaa44', SZ_MINE),
  mineralIridium:    makeDiamondIcon('#ccddee', SZ_MINE),
  mineralRhodium:    makeDiamondIcon('#ddccbb', SZ_MINE),
  mineralMolybdenum: makeDiamondIcon('#4466aa', SZ_MINE),
  mineralZirconium:  makeDiamondIcon('#88bbaa', SZ_MINE),
  mineralHafnium:    makeDiamondIcon('#9988cc', SZ_MINE),
  mineralSelenium:   makeDiamondIcon('#cc6655', SZ_MINE),
  mineralBismuth:    makeDiamondIcon('#aa88cc', SZ_MINE),
  mineralCadmium:    makeDiamondIcon('#aa7755', SZ_MINE),
  mineralSilver:     makeDiamondIcon('#cccccc', SZ_MINE),
  mineralScandium:   makeDiamondIcon('#55ccaa', SZ_MINE),
  // Drilling leases
  drillUS:       makeDerrickIcon('#ff8844', SZ_MINE),
  drillNorway:   makeDerrickIcon('#44aaff', SZ_MINE),
  drillRussia:   makeDerrickIcon('#ff4444', SZ_MINE),
  drillCanada:   makeDerrickIcon('#ff6688', SZ_MINE),
  // Power plants
  powerCoal:     makePowerPlantIcon('#aa6633', SZ_INFRA),
  powerGas:      makePowerPlantIcon('#cc8844', SZ_INFRA),
  powerHydro:    makePowerPlantIcon('#4488ff', SZ_INFRA),
  powerSolar:    makePowerPlantIcon('#ffcc00', SZ_INFRA),
  powerWind:     makePowerPlantIcon('#66ccaa', SZ_INFRA),
  // Nuclear power plants
  nuclearPlant:  makeNuclearPlantIcon('#ff4444', SZ_INFRA),
  // Oil refineries
  refinery:      makeRefineryIcon('#ff6600', SZ_INFRA),
  // Offshore platforms
  platform:      makePlatformIcon('#ff8844', SZ_INFRA),
  // Radar installations
  radarBmews:    makeRadarIcon('#ff3333', SZ_BASE),
  radarAegis:    makeRadarIcon('#4488ff', SZ_BASE),
  radarOthr:     makeRadarIcon('#ffaa00', SZ_BASE),
  // Strategic nuclear
  weaponsLab:    makeWarheadIcon('#ff2222', SZ_BASE),
  subBase:       makeWarheadIcon('#ff4466', SZ_BASE),
  missileSilo:   makeWarheadIcon('#ff0000', SZ_BASE),
  // Volcanoes
  volcanoActive: makeVolcanoIcon('#ff4400', SZ_MINE),
  volcanoDormant:makeVolcanoIcon('#aa6644', SZ_MINE),
  // Earthquakes
  earthquake:    makeEarthquakeIcon('#ff6600', SZ_MINE),
  // Wildfires
  wildfire:      makeFireIcon('#ff4400', SZ_MINE),
  // Space debris
  debris:        makeCircleIcon('#888888', SZ_CUSTOM),
  // Wildlife (reuse existing shapes)
  whale:         makeCircleIcon('#4488ff', SZ_MINE),
  turtle:        makeCircleIcon('#00cc88', SZ_MINE),
  elephant:      makeCircleIcon('#cc8844', SZ_MINE),
  // Spaceports / launch sites
  rocketActive:  makeRocketIcon('#ff4400', SZ_MINE),
  rocketHistoric:makeRocketIcon('#888888', SZ_MINE),
  // Lightning
  lightning:     makeLightningIcon('#ffff00', SZ_MINE),
  // Ports
  portMega:      makeAnchorIcon('#00ccff', SZ_MINE),
  portMajor:     makeAnchorIcon('#4488ff', SZ_MINE),
  // Internet exchanges
  ixpTier1:      makeServerIcon('#00ff88', SZ_MINE),
  ixpRegional:   makeServerIcon('#44cc88', SZ_MINE),
  // Ocean temperature
  tempWarm:      makeCircleIcon('#ff4400', SZ_MINE),
  tempCold:      makeCircleIcon('#4488ff', SZ_MINE),
  // Meteor impacts
  craterMajor:   makeCircleIcon('#aa6644', SZ_MINE),
  craterRecent:  makeEarthquakeIcon('#ff6600', SZ_MINE),
  // Cosmic radiation
  cosmicMonitor: makeRadarIcon('#aa44ff', SZ_MINE),
  // Ionosphere
  ionoRadar:     makeRadarIcon('#44ffaa', SZ_MINE),
  ionoGNSS:      makeRadarIcon('#44ccaa', SZ_MINE),
  // Person-of-interest profiles
  profilePerson: makePersonIcon('#ff6699', SZ_PERSON),
};
