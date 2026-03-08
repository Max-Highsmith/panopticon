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

// Pre-rendered icon cache
export const icons = {
  planeGreen:  makePlaneIcon('#00ff41', 96),
  planeBlue:   makePlaneIcon('#4488ff', 96),
  planeMilLive:makePlaneIcon('#00ff41', 96),
  shipBlue:    makeShipIcon('#4488ff', 48),
  satYellow:   makeSatIcon('#ffaa00', 96),
  pogo:        makePogoIcon(36),
  mineCobalt:   makeDiamondIcon('#cc44ff', 48),
  mineLithium:  makeDiamondIcon('#00ddcc', 48),
  mineBitcoin:  makeDiamondIcon('#f7931a', 48),
  datacenter:   makeServerIcon('#ff8800', 48),
  nuclear:      makeRadiationIcon('#ff2222', 48),
  militaryBase: makeMilitaryBaseIcon('#ff6644', 48),
  customDot:    makeCircleIcon('#ff00ff', 48),
  airportLarge: makeAirportIcon('#00ccff', 48),
  airportMedium:makeAirportIcon('#00ccff88', 48),
  webcam:       makeWebcamIcon('#00ddff', 48),
  reticle:      makeReticleIcon('#ffffff', 128),
  // Arctic mining
  mineIron:      makePickaxeIcon('#cc6633', 48),
  mineRareEarth: makePickaxeIcon('#ff44cc', 48),
  mineZinc:      makePickaxeIcon('#88aadd', 48),
  mineGold:      makePickaxeIcon('#ffcc00', 48),
  // Rare earth deposits
  reeHeavy:      makeHexIcon('#ff44cc', 48),
  reeLight:      makeHexIcon('#cc88ff', 48),
  reeStrategic:  makeHexIcon('#ffaa44', 48),
  // Drilling leases
  drillUS:       makeDerrickIcon('#ff8844', 48),
  drillNorway:   makeDerrickIcon('#44aaff', 48),
  drillRussia:   makeDerrickIcon('#ff4444', 48),
  drillCanada:   makeDerrickIcon('#ff6688', 48),
  // Power plants
  powerCoal:     makePowerPlantIcon('#aa6633', 48),
  powerGas:      makePowerPlantIcon('#cc8844', 48),
  powerHydro:    makePowerPlantIcon('#4488ff', 48),
  powerSolar:    makePowerPlantIcon('#ffcc00', 48),
  powerWind:     makePowerPlantIcon('#66ccaa', 48),
  // Nuclear power plants
  nuclearPlant:  makeNuclearPlantIcon('#ff4444', 48),
  // Oil refineries
  refinery:      makeRefineryIcon('#ff6600', 48),
  // Offshore platforms
  platform:      makePlatformIcon('#ff8844', 48),
  // Radar installations
  radarBmews:    makeRadarIcon('#ff3333', 48),
  radarAegis:    makeRadarIcon('#4488ff', 48),
  radarOthr:     makeRadarIcon('#ffaa00', 48),
  // Strategic nuclear
  weaponsLab:    makeWarheadIcon('#ff2222', 48),
  subBase:       makeWarheadIcon('#ff4466', 48),
  missileSilo:   makeWarheadIcon('#ff0000', 48),
  // Volcanoes
  volcanoActive: makeVolcanoIcon('#ff4400', 48),
  volcanoDormant:makeVolcanoIcon('#aa6644', 48),
  // Earthquakes
  earthquake:    makeEarthquakeIcon('#ff6600', 48),
  // Wildfires
  wildfire:      makeFireIcon('#ff4400', 48),
  // Space debris
  debris:        makeCircleIcon('#888888', 48),
  // Wildlife (reuse existing shapes)
  whale:         makeCircleIcon('#4488ff', 48),
  turtle:        makeCircleIcon('#00cc88', 48),
  elephant:      makeCircleIcon('#cc8844', 48),
  // Spaceports / launch sites
  rocketActive:  makeRocketIcon('#ff4400', 48),
  rocketHistoric:makeRocketIcon('#888888', 48),
  // Lightning
  lightning:     makeLightningIcon('#ffff00', 48),
  // Ports
  portMega:      makeAnchorIcon('#00ccff', 48),
  portMajor:     makeAnchorIcon('#4488ff', 48),
  // Internet exchanges
  ixpTier1:      makeServerIcon('#00ff88', 48),
  ixpRegional:   makeServerIcon('#44cc88', 48),
  // Ocean temperature
  tempWarm:      makeCircleIcon('#ff4400', 48),
  tempCold:      makeCircleIcon('#4488ff', 48),
  // Meteor impacts
  craterMajor:   makeCircleIcon('#aa6644', 48),
  craterRecent:  makeEarthquakeIcon('#ff6600', 48),
  // Cosmic radiation
  cosmicMonitor: makeRadarIcon('#aa44ff', 48),
  // Ionosphere
  ionoRadar:     makeRadarIcon('#44ffaa', 48),
  ionoGNSS:      makeRadarIcon('#44ccaa', 48),
};
