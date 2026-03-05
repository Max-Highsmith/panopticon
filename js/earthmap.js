/* ===================================================================
   PANOPTICON — Simplified World Map for Orbital Profile Canvas
   Orthographic projection with continent outlines
   =================================================================== */

const DEG2RAD = Math.PI / 180;

// Simplified continent outlines as [lon, lat] closed polygons
// Low-resolution for fast canvas rendering at small sizes
const CONTINENTS = [
  // North America
  [[-126,49],[-130,55],[-140,60],[-152,58],[-168,64],[-168,72],[-140,72],[-100,72],[-80,72],
   [-68,60],[-57,48],[-67,44],[-70,42],[-74,40],[-76,37],[-80,32],[-81,25],[-83,29],[-90,30],
   [-97,28],[-105,22],[-110,24],[-117,32],[-122,37],[-124,42],[-126,49]],
  // South America
  [[-80,8],[-75,12],[-67,11],[-60,8],[-52,3],[-50,-1],[-46,-4],[-35,-6],[-35,-12],[-38,-17],
   [-42,-23],[-48,-28],[-53,-34],[-58,-40],[-66,-50],[-70,-53],[-75,-45],[-72,-35],[-70,-18],
   [-75,-5],[-78,2],[-80,8]],
  // Africa
  [[-17,15],[-17,22],[-13,28],[-5,36],[0,37],[10,37],[20,33],[30,31],[34,30],[40,15],[43,12],
   [51,8],[45,0],[40,-10],[35,-20],[28,-34],[20,-35],[15,-28],[12,-17],[10,-5],[8,5],[3,6],
   [-5,5],[-10,8],[-15,12],[-17,15]],
  // Europe
  [[-10,36],[-10,44],[-2,48],[-5,54],[-3,58],[5,58],[10,56],[15,55],[22,54],[28,55],[30,60],
   [25,66],[20,70],[30,72],[40,68],[42,55],[35,45],[28,40],[25,38],[20,36],[15,38],[12,44],
   [8,44],[3,43],[-3,43],[-10,36]],
  // Asia
  [[28,40],[35,38],[40,38],[45,40],[50,38],[55,25],[60,25],[65,25],[70,20],[75,10],[78,8],
   [80,13],[85,22],[90,22],[95,16],[100,12],[104,2],[108,15],[112,22],[118,24],[120,30],
   [125,33],[128,35],[130,43],[140,40],[142,45],[144,50],[150,58],[160,60],[170,63],[180,68],
   [180,72],[170,72],[150,72],[120,72],[90,72],[75,72],[60,68],[50,48],[42,42],[35,42],[28,40]],
  // Australia
  [[115,-35],[115,-22],[122,-15],[130,-12],[138,-12],[142,-11],[145,-16],[150,-23],[153,-28],
   [150,-35],[140,-38],[130,-35],[120,-35],[115,-35]],
  // Greenland
  [[-55,60],[-48,62],[-42,65],[-35,70],[-22,76],[-18,80],[-30,83],[-48,83],[-58,80],[-60,75],
   [-55,65],[-55,60]],
];

// Orthographic projection: projects (lon, lat) onto visible hemisphere
// Returns {x, y} in [-1, 1] range, or null if point is on far side of globe
function orthoProject(lon, lat, centerLon, centerLat) {
  const λ = lon * DEG2RAD, φ = lat * DEG2RAD;
  const λ0 = centerLon * DEG2RAD, φ0 = centerLat * DEG2RAD;
  const cosC = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ - λ0);
  if (cosC < 0) return null;
  return {
    x: Math.cos(φ) * Math.sin(λ - λ0),
    y: Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ - λ0),
  };
}

// Draw a single continent polygon onto the globe
function drawContinent(ctx, points, cx, cy, radius, cLon, cLat) {
  const projected = [];
  for (const [lon, lat] of points) {
    const p = orthoProject(lon, lat, cLon, cLat);
    if (p) projected.push({ x: cx + p.x * radius, y: cy - p.y * radius });
  }
  if (projected.length < 3) return;

  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i].x, projected[i].y);
  ctx.closePath();

  ctx.fillStyle = '#1a6030';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 220, 100, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Draw latitude/longitude grid lines on the globe
function drawGrid(ctx, cx, cy, radius, cLon, cLat) {
  ctx.strokeStyle = 'rgba(80, 150, 220, 0.15)';
  ctx.lineWidth = 0.5;

  // Latitude lines every 30°
  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.beginPath();
    let penDown = false;
    for (let lon = -180; lon <= 180; lon += 4) {
      const p = orthoProject(lon, lat, cLon, cLat);
      if (p) {
        const px = cx + p.x * radius, py = cy - p.y * radius;
        if (!penDown) { ctx.moveTo(px, py); penDown = true; }
        else ctx.lineTo(px, py);
      } else {
        penDown = false;
      }
    }
    ctx.stroke();
  }

  // Longitude lines every 30°
  for (let lon = -180; lon < 180; lon += 30) {
    ctx.beginPath();
    let penDown = false;
    for (let lat = -90; lat <= 90; lat += 4) {
      const p = orthoProject(lon, lat, cLon, cLat);
      if (p) {
        const px = cx + p.x * radius, py = cy - p.y * radius;
        if (!penDown) { ctx.moveTo(px, py); penDown = true; }
        else ctx.lineTo(px, py);
      } else {
        penDown = false;
      }
    }
    ctx.stroke();
  }
}

/**
 * Draw Earth globe with simplified world map, grid, footprint, and atmosphere.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - Globe center X
 * @param {number} cy - Globe center Y
 * @param {number} radius - Globe radius in pixels
 * @param {number} centerLon - Projection center longitude (satellite nadir)
 * @param {number} centerLat - Projection center latitude (satellite nadir)
 * @param {number} footprintAngleRad - Footprint angular radius on Earth surface (radians)
 */
export function drawEarthGlobe(ctx, cx, cy, radius, centerLon, centerLat, footprintAngleRad) {
  ctx.save();

  // Clip to Earth circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Ocean fill
  ctx.fillStyle = '#0c2d5a';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Grid lines
  drawGrid(ctx, cx, cy, radius, centerLon, centerLat);

  // Continents
  for (const continent of CONTINENTS) {
    drawContinent(ctx, continent, cx, cy, radius, centerLon, centerLat);
  }

  // Footprint overlay
  if (footprintAngleRad > 0) {
    const fpRadius = radius * Math.sin(Math.min(footprintAngleRad, Math.PI / 3));

    // Red/orange ground glow
    const fpGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, fpRadius * 1.5);
    fpGlow.addColorStop(0, 'rgba(255, 60, 40, 0.2)');
    fpGlow.addColorStop(0.6, 'rgba(255, 100, 40, 0.08)');
    fpGlow.addColorStop(1, 'rgba(255, 100, 40, 0)');
    ctx.fillStyle = fpGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, fpRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Footprint outer circle
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, fpRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dashed circle
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, fpRadius * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Crosshairs through nadir
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - fpRadius, cy);
    ctx.lineTo(cx + fpRadius, cy);
    ctx.moveTo(cx, cy - fpRadius);
    ctx.lineTo(cx, cy + fpRadius);
    ctx.stroke();

    // Target boxes inside footprint
    const targets = [[-0.3, 0.15], [0.15, -0.25], [0.5, 0.1], [-0.15, -0.45], [0.35, 0.35], [-0.5, -0.1]];
    for (const [ox, oy] of targets) {
      if (Math.sqrt(ox * ox + oy * oy) < 0.9) {
        const tx = cx + fpRadius * ox, ty = cy + fpRadius * oy;
        ctx.strokeStyle = 'rgba(255, 60, 40, 0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx - 3, ty - 3, 6, 6);
        ctx.fillStyle = 'rgba(255, 80, 40, 0.5)';
        ctx.fillRect(tx - 1, ty - 1, 2, 2);
      }
    }

    // Nadir point
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Atmosphere glow (outside clipping region)
  const atmosGrad = ctx.createRadialGradient(cx, cy, radius - 2, cx, cy, radius + 15);
  atmosGrad.addColorStop(0, 'rgba(80, 160, 255, 0)');
  atmosGrad.addColorStop(0.4, 'rgba(80, 160, 255, 0.2)');
  atmosGrad.addColorStop(1, 'rgba(80, 160, 255, 0)');
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 15, 0, Math.PI * 2);
  ctx.fillStyle = atmosGrad;
  ctx.fill();

  // Globe outline
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(80, 160, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
