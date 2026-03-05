/* ===================================================================
   PANOPTICON — Site Reconnaissance View (second Cesium viewer + Canvas)
   Provides immersive 3D static view of ground sites.
   For mines: procedural canvas reconstruction (satellite imagery style).
   For datacenters/nuclear: Cesium 3D viewer with Google Tiles.
   =================================================================== */

import { $ } from './utils.js';

let siteViewer = null;
let siteViewOpen = false;
let siteViewTarget = null;
let overlayAnimFrame = null;
let lastOverlayData = null;
let isMineView = false;  // true = procedural canvas, false = Cesium 3D
let mineReconCache = null; // offscreen canvas cache for mine reconstruction
let mineReconCacheKey = null; // cache key: "name|W|H"

export function isSiteViewOpen() { return siteViewOpen; }
export function resizeSiteView() { if (siteViewer) siteViewer.resize(); }

// --- Camera configuration per site category ---
const CAM_PROFILES = {
  DC:       { altitudeM: 1200, distanceM: 800,  pitchDeg: -35 },
  NUCLEAR:  { altitudeM: 4000, distanceM: 2500, pitchDeg: -45 },
  DEFAULT:  { altitudeM: 1500, distanceM: 1000, pitchDeg: -35 },
};

function profileForType(t) {
  if (!t) return CAM_PROFILES.DEFAULT;
  if (t === 'DATACENTER') return CAM_PROFILES.DC;
  if (t.includes('NUCLEAR')) return CAM_PROFILES.NUCLEAR;
  return CAM_PROFILES.DEFAULT;
}

const HUD_COLOR = 'rgba(180, 220, 255, ';
const HUD_ACCENT = '#b4dcff';
const FIXED_HEADING_RAD = Cesium.Math.toRadians(315);

// --- Second Cesium Viewer (only for non-mine sites) ---

function initSiteViewer() {
  if (siteViewer) return;
  siteViewer = new Cesium.Viewer('site-view-container', {
    geocoder: false, homeButton: false, sceneModePicker: false,
    baseLayerPicker: false, navigationHelpButton: false,
    animation: false, timeline: false, fullscreenButton: false,
    selectionIndicator: false, infoBox: false, scene3DOnly: true,
    imageryProvider: false,
  });
  siteViewer.scene.backgroundColor = Cesium.Color.BLACK;
  siteViewer.imageryLayers.addImageryProvider(
    new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })
  );
  siteViewer.scene.screenSpaceCameraController.enableInputs = true;
  (async () => {
    try {
      const tileset = await Cesium.createGooglePhotorealistic3DTileset();
      siteViewer.scene.primitives.add(tileset);
      siteViewer.scene.globe.show = false;
    } catch {
      console.log('Site view: Google 3D Tiles not available, using OSM.');
    }
  })();
}

// --- Extract position from a Cesium entity ---
function getEntityPosition(entity) {
  if (!entity) return null;
  let pos = entity.position;
  if (!pos) return null;
  if (typeof pos.getValue === 'function') pos = pos.getValue(Cesium.JulianDate.now());
  if (!pos) return null;
  const carto = Cesium.Cartographic.fromCartesian(pos);
  return {
    lon: Cesium.Math.toDegrees(carto.longitude),
    lat: Cesium.Math.toDegrees(carto.latitude),
    altM: carto.height,
  };
}

// --- Metadata extraction from "operator // country // notes" desc format ---
function extractOperator(desc) {
  if (!desc) return '---';
  return desc.split(' // ')[0]?.trim() || '---';
}
function extractCountry(desc) {
  if (!desc) return '---';
  return desc.split(' // ')[1]?.trim() || '---';
}
function extractNotes(desc) {
  if (!desc) return '---';
  return desc.split(' // ').slice(2).join(' // ').trim() || '---';
}

// --- Set camera once (static, for non-mine sites) ---

function setSiteCamera(posInfo, siteType) {
  if (!siteViewer || !posInfo) return;
  const { lon, lat } = posInfo;
  const prof = profileForType(siteType);

  const cosLat = Math.cos(Cesium.Math.toRadians(lat));
  const offsetLon = (prof.distanceM / 111320) * Math.cos(FIXED_HEADING_RAD - Math.PI) / cosLat;
  const offsetLat = (prof.distanceM / 111320) * Math.sin(FIXED_HEADING_RAD - Math.PI);

  siteViewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lon + offsetLon, lat + offsetLat, prof.altitudeM),
    orientation: {
      heading: FIXED_HEADING_RAD,
      pitch: Cesium.Math.toRadians(prof.pitchDeg),
      roll: 0,
    },
  });
}

// =====================================================
// PROCEDURAL MINE RECONSTRUCTION (canvas-based)
// Satellite-imagery-style rendering of mines/facilities
// =====================================================

// Simple seeded PRNG for consistent per-mine randomness
function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}
function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// --- Shared helpers ---

// Fractal Brownian motion noise (pixel-level terrain texture)
function fbm(x, y, rng, octaves = 4) {
  let val = 0, amp = 0.5, freq = 1;
  // Use a hash-like combination for deterministic noise
  for (let i = 0; i < octaves; i++) {
    const nx = Math.sin(x * freq * 0.01 + y * freq * 0.007 + i * 1337) * 43758.5453;
    val += (nx - Math.floor(nx)) * amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}

// Fill terrain with dense pixel-level noise for realistic satellite look
function fillTerrainNoise(ctx, W, H, baseR, baseG, baseB, rng, variation = 20) {
  // Use ImageData for pixel-level rendering (much more realistic than rectangles)
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm(x, y, rng);
      const v = (n - 0.3) * variation;
      const idx = (y * W + x) * 4;
      data[idx]     = Math.max(0, Math.min(255, baseR + v + (Math.sin(x * 0.3 + y * 0.2) * 3)));
      data[idx + 1] = Math.max(0, Math.min(255, baseG + v + (Math.cos(x * 0.2 + y * 0.4) * 2)));
      data[idx + 2] = Math.max(0, Math.min(255, baseB + v * 0.7));
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// Draw an irregular wobbly shape (for natural-looking pit terraces, ponds, etc.)
function irregularPath(ctx, cx, cy, rx, ry, rng, wobble = 0.12, steps = 64) {
  // Pre-generate wobble offsets
  const offsets = [];
  for (let i = 0; i < steps; i++) offsets.push((rng() - 0.5) * 2 * wobble);
  // Smooth the offsets by averaging neighbors
  const smooth = offsets.map((v, i) =>
    (offsets[(i - 1 + steps) % steps] + v + offsets[(i + 1) % steps]) / 3
  );
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const wob = 1 + smooth[i % steps];
    const px = cx + rx * wob * Math.cos(angle);
    const py = cy + ry * wob * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Draw a building with 3D shadow (satellite perspective)
function drawBuilding(ctx, x, y, w, h, roofColor, wallColor, shadowLen = 4) {
  // Shadow (SE direction — sun from NW)
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + shadowLen, y + shadowLen, w, h);
  // Wall/side visible from satellite angle
  ctx.fillStyle = wallColor;
  ctx.fillRect(x, y + h - 2, w, 2);
  ctx.fillRect(x + w - 2, y, 2, h);
  // Roof
  ctx.fillStyle = roofColor;
  ctx.fillRect(x, y, w, h);
}

// Draw a road with realistic width and slight curves
function drawRoad(ctx, points, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
  // Road edge lines (slightly darker)
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = width + 2;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
  // Redraw lighter center
  ctx.strokeStyle = color;
  ctx.lineWidth = width - 1;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
}

// --- Mine Reconstruction dispatcher ---
function renderMineReconstruction(ctx, W, H, d) {
  const ac = siteViewTarget?.acData;
  if (!ac) return;
  const mineType = ac.t || '';
  const isLithium = mineType.includes('LITHIUM');
  const isBitcoin = mineType.includes('BITCOIN');
  const rng = seededRandom(hashName(d.name || 'mine'));

  // Use high-res canvas dimensions for pixel-level rendering
  const dpr = window.devicePixelRatio || 1;
  const pixW = Math.round(W * dpr);
  const pixH = Math.round(H * dpr);

  if (isLithium) {
    fillTerrainNoise(ctx, pixW, pixH, 185, 175, 145, rng, 15);
    renderLithiumBrine(ctx, W, H, rng, dpr);
  } else if (isBitcoin) {
    fillTerrainNoise(ctx, pixW, pixH, 55, 70, 38, rng, 18);
    renderBitcoinFacility(ctx, W, H, rng, dpr);
  } else {
    fillTerrainNoise(ctx, pixW, pixH, 105, 72, 38, rng, 22);
    renderOpenPitMine(ctx, W, H, rng, dpr);
  }
}

// =====================================================
// OPEN-PIT MINE (cobalt, copper)
// =====================================================
function renderOpenPitMine(ctx, W, H, rng, dpr) {
  const cx = W * (0.42 + rng() * 0.06);
  const cy = H * (0.42 + rng() * 0.06);
  const pitRadiusX = Math.min(W, H) * (0.22 + rng() * 0.06);
  const pitRadiusY = pitRadiusX * (0.7 + rng() * 0.25);
  const numTerraces = 8 + Math.floor(rng() * 5);
  const pitAngle = rng() * 0.4 - 0.2; // slight rotation

  // --- Cleared/disturbed earth ring around pit ---
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(pitAngle);
  const disturbR = pitRadiusX * 1.4;
  const disturbGrad = ctx.createRadialGradient(0, 0, pitRadiusX * 0.9, 0, 0, disturbR);
  disturbGrad.addColorStop(0, 'rgba(130, 90, 50, 0.6)');
  disturbGrad.addColorStop(0.5, 'rgba(120, 85, 45, 0.3)');
  disturbGrad.addColorStop(1, 'rgba(100, 75, 40, 0)');
  ctx.fillStyle = disturbGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, disturbR, disturbR * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- Vegetation around the mine (pushed to edges) ---
  for (let i = 0; i < 120; i++) {
    const vx = rng() * W;
    const vy = rng() * H;
    const dist = Math.sqrt(((vx - cx) / pitRadiusX) ** 2 + ((vy - cy) / pitRadiusY) ** 2);
    if (dist < 1.5) continue;
    const vr = rng() * 12 + 4;
    const g = Math.round(35 + rng() * 40);
    ctx.fillStyle = `rgba(${20 + rng() * 15}, ${g}, ${15 + rng() * 10}, ${0.35 + rng() * 0.25})`;
    ctx.beginPath();
    ctx.arc(vx, vy, vr, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Draw terraces from outer (surface) to inner (deep) ---
  for (let t = 0; t < numTerraces; t++) {
    const frac = 1 - t / numTerraces;
    const rx = pitRadiusX * frac;
    const ry = pitRadiusY * frac;
    const depth = t / numTerraces;

    // Terrace fill — gets darker with depth
    const r = Math.round(115 - depth * 55 + rng() * 8);
    const g = Math.round(80 - depth * 40 + rng() * 6);
    const b = Math.round(40 - depth * 20 + rng() * 4);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(pitAngle);
    irregularPath(ctx, 0, 0, rx, ry, rng, 0.06 + depth * 0.04);
    ctx.restore();
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fill();

    // Shadow on south/east wall of each terrace (simulating 3D depth)
    if (t > 0) {
      const shadowOffset = 2 + depth * 3;
      ctx.save();
      ctx.translate(cx + shadowOffset, cy + shadowOffset);
      ctx.rotate(pitAngle);
      irregularPath(ctx, 0, 0, rx, ry, rng, 0.06 + depth * 0.04);
      ctx.restore();
      ctx.save();
      // Clip to the previous terrace boundary and fill shadow
      ctx.translate(cx, cy);
      ctx.rotate(pitAngle);
      const outerRx = pitRadiusX * (1 - (t - 1) / numTerraces);
      const outerRy = pitRadiusY * (1 - (t - 1) / numTerraces);
      irregularPath(ctx, 0, 0, outerRx, outerRy, rng, 0.06 + ((t - 1) / numTerraces) * 0.04);
      ctx.restore();
      ctx.fillStyle = `rgba(0,0,0,${0.08 + depth * 0.12})`;
      ctx.fill();

      // Terrace edge line (darker line at rim)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(pitAngle);
      irregularPath(ctx, 0, 0, rx, ry, rng, 0.06 + depth * 0.04);
      ctx.restore();
      ctx.strokeStyle = `rgba(40,25,10,${0.25 + depth * 0.25})`;
      ctx.lineWidth = 0.8 + depth * 0.5;
      ctx.stroke();
    }

    // Subtle texture on each terrace
    const terraceInnerR = rx * 0.95;
    for (let k = 0; k < 40; k++) {
      const angle = rng() * Math.PI * 2;
      const dist2 = rng() * rx;
      const nDist = dist2 / rx;
      if (nDist > 1) continue;
      const nx = cx + dist2 * Math.cos(angle) * 0.8;
      const ny = cy + dist2 * (ry / rx) * Math.sin(angle) * 0.8;
      ctx.fillStyle = `rgba(0,0,0,${rng() * 0.06})`;
      ctx.fillRect(nx, ny, rng() * 2 + 0.5, rng() * 2 + 0.5);
    }
  }

  // --- Deep pit floor ---
  const floorR = pitRadiusX * 0.1;
  ctx.fillStyle = '#2a1a0a';
  irregularPath(ctx, cx, cy, floorR, floorR * 0.8, rng, 0.15);
  ctx.fill();

  // --- Water pool at bottom (turquoise-green, typical of copper/cobalt mines) ---
  const waterCx = cx + floorR * 0.2;
  const waterCy = cy + floorR * 0.15;
  const waterRx = floorR * 1.1;
  const waterRy = floorR * 0.7;
  irregularPath(ctx, waterCx, waterCy, waterRx, waterRy, rng, 0.2);
  const waterGrad = ctx.createRadialGradient(waterCx, waterCy, 0, waterCx, waterCy, waterRx);
  waterGrad.addColorStop(0, 'rgba(35, 100, 110, 0.85)');
  waterGrad.addColorStop(0.6, 'rgba(50, 120, 115, 0.7)');
  waterGrad.addColorStop(1, 'rgba(60, 90, 80, 0.5)');
  ctx.fillStyle = waterGrad;
  ctx.fill();
  // Water surface highlight
  ctx.fillStyle = 'rgba(130, 200, 210, 0.12)';
  ctx.beginPath();
  ctx.ellipse(waterCx - waterRx * 0.2, waterCy - waterRy * 0.2, waterRx * 0.3, waterRy * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // --- Haul road spiraling up from pit ---
  const roadTurns = 2.2 + rng() * 0.8;
  const roadPts = [];
  for (let a = 0; a < roadTurns * Math.PI * 2; a += 0.04) {
    const f = a / (roadTurns * Math.PI * 2);
    const rr = pitRadiusX * (0.08 + f * 0.92);
    const rrY = pitRadiusY * (0.08 + f * 0.92);
    const wobble = Math.sin(a * 3) * 2 + Math.cos(a * 7) * 1;
    roadPts.push([cx + (rr + wobble) * Math.cos(a + pitAngle), cy + (rrY + wobble) * Math.sin(a + pitAngle)]);
  }
  // Road shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(roadPts[0][0] + 1, roadPts[0][1] + 1);
  for (const p of roadPts) ctx.lineTo(p[0] + 1, p[1] + 1);
  ctx.stroke();
  // Road surface
  ctx.strokeStyle = '#9a8560';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(roadPts[0][0], roadPts[0][1]);
  for (const p of roadPts) ctx.lineTo(p[0], p[1]);
  ctx.stroke();
  // Road dust/wear marks
  ctx.strokeStyle = 'rgba(160, 140, 100, 0.3)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(roadPts[0][0], roadPts[0][1]);
  for (const p of roadPts) ctx.lineTo(p[0], p[1]);
  ctx.stroke();

  // --- Haul road extends to processing area ---
  const lastRoad = roadPts[roadPts.length - 1];
  const plantX = cx + pitRadiusX * 1.25;
  const plantY = cy - pitRadiusY * 0.2;
  drawRoad(ctx, [lastRoad, [plantX - 20, plantY + 10], [plantX - 5, plantY + 12]], 4, '#9a8560');

  // --- Dump trucks on haul road ---
  for (let i = 0; i < 8; i++) {
    const idx = Math.floor(rng() * roadPts.length);
    const [tx, ty] = roadPts[idx];
    const nextIdx = Math.min(idx + 1, roadPts.length - 1);
    const angle = Math.atan2(roadPts[nextIdx][1] - ty, roadPts[nextIdx][0] - tx);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    // Truck shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-3, 1, 7, 4);
    // Truck body
    ctx.fillStyle = i % 3 === 0 ? '#e8d040' : i % 3 === 1 ? '#d0c030' : '#f0e050';
    ctx.fillRect(-3, -2, 7, 4);
    // Cab
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(-3, -2, 2, 4);
    ctx.restore();
  }

  // --- Excavators at active face ---
  for (let i = 0; i < 2; i++) {
    const eIdx = Math.floor(rng() * Math.floor(roadPts.length * 0.3));
    const [ex, ey] = roadPts[eIdx];
    ctx.save();
    ctx.translate(ex, ey);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-4 + 2, -3 + 2, 9, 7);
    // Body
    ctx.fillStyle = '#d4b830';
    ctx.fillRect(-4, -3, 9, 7);
    // Boom
    ctx.strokeStyle = '#c0a020';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(12, -5);
    ctx.lineTo(15, -2);
    ctx.stroke();
    ctx.restore();
  }

  // --- Processing plant / buildings ---
  drawBuilding(ctx, plantX, plantY - 10, 35, 22, '#5a5a5a', '#484848', 5);
  drawBuilding(ctx, plantX + 40, plantY - 3, 24, 16, '#555555', '#444444', 5);
  drawBuilding(ctx, plantX + 12, plantY + 16, 28, 14, '#505050', '#404040', 4);
  // Small auxiliary buildings
  drawBuilding(ctx, plantX - 18, plantY + 5, 14, 10, '#606060', '#4a4a4a', 3);
  drawBuilding(ctx, plantX + 68, plantY + 2, 12, 8, '#585858', '#464646', 3);

  // Smokestack / crusher
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(plantX + 30 + 3, plantY - 25 + 3, 5, 18);
  ctx.fillStyle = '#666';
  ctx.fillRect(plantX + 30, plantY - 25, 5, 18);

  // --- Tailings pond (irregular shape with murky water) ---
  const tpX = cx - pitRadiusX * 1.05;
  const tpY = cy + pitRadiusY * 0.75;
  const tpRx = pitRadiusX * 0.4;
  const tpRy = pitRadiusY * 0.28;

  // Dam/berm
  ctx.save();
  irregularPath(ctx, tpX, tpY, tpRx + 5, tpRy + 5, rng, 0.08);
  ctx.fillStyle = '#8a7a58';
  ctx.fill();
  ctx.restore();

  // Tailings water
  irregularPath(ctx, tpX, tpY, tpRx, tpRy, rng, 0.1);
  const tpGrad = ctx.createRadialGradient(tpX, tpY, 0, tpX, tpY, tpRx);
  tpGrad.addColorStop(0, '#5a8a6a');
  tpGrad.addColorStop(0.4, '#6a9a72');
  tpGrad.addColorStop(0.8, '#7a8a68');
  tpGrad.addColorStop(1, '#6a7a58');
  ctx.fillStyle = tpGrad;
  ctx.fill();
  // Sediment swirls
  for (let i = 0; i < 5; i++) {
    const sa = rng() * Math.PI * 2;
    const sr = rng() * tpRx * 0.6;
    ctx.strokeStyle = `rgba(100, 130, 80, ${0.15 + rng() * 0.1})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(tpX + sr * Math.cos(sa), tpY + sr * 0.6 * Math.sin(sa), rng() * 8 + 3, sa, sa + Math.PI * (0.5 + rng()));
    ctx.stroke();
  }

  // --- Access road from edge ---
  drawRoad(ctx, [[W, plantY + 12], [plantX + 75, plantY + 10], [plantX + 50, plantY + 9]], 5, '#8a7a58');
  // Secondary road to tailings
  drawRoad(ctx, [[plantX - 5, plantY + 25], [tpX + tpRx, tpY - 5]], 3, '#8a7a58');

  // --- Waste dumps / stockpiles ---
  for (let i = 0; i < 4; i++) {
    const mx = plantX + 65 + rng() * 30;
    const my = plantY + 18 + rng() * 20;
    const mRx = rng() * 12 + 8;
    const mRy = mRx * (0.6 + rng() * 0.3);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    irregularPath(ctx, mx + 2, my + 2, mRx, mRy, rng, 0.15);
    ctx.fill();
    // Mound
    const mGrad = ctx.createRadialGradient(mx - mRx * 0.2, my - mRy * 0.3, 0, mx, my, mRx);
    mGrad.addColorStop(0, '#9a8560');
    mGrad.addColorStop(1, '#7a6540');
    ctx.fillStyle = mGrad;
    irregularPath(ctx, mx, my, mRx, mRy, rng, 0.15);
    ctx.fill();
  }

  // --- Erosion channels radiating from disturbed area ---
  for (let i = 0; i < 6; i++) {
    const ea = pitAngle + rng() * Math.PI * 2;
    const eStartR = pitRadiusX * (1.1 + rng() * 0.3);
    const eLen = 30 + rng() * 50;
    const sx = cx + eStartR * Math.cos(ea);
    const sy = cy + eStartR * (pitRadiusY / pitRadiusX) * Math.sin(ea);
    ctx.strokeStyle = `rgba(80, 55, 30, ${0.15 + rng() * 0.1})`;
    ctx.lineWidth = 0.8 + rng() * 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    let ex = sx, ey = sy;
    for (let j = 0; j < 8; j++) {
      ex += Math.cos(ea + (rng() - 0.5) * 0.8) * (eLen / 8);
      ey += Math.sin(ea + (rng() - 0.5) * 0.8) * (eLen / 8);
      ctx.lineTo(ex, ey);
    }
    ctx.stroke();
  }

  // --- Atmospheric dust haze ---
  const dustGrad = ctx.createRadialGradient(cx, cy, pitRadiusX * 0.2, cx, cy, pitRadiusX * 1.5);
  dustGrad.addColorStop(0, 'rgba(180, 155, 110, 0.06)');
  dustGrad.addColorStop(0.4, 'rgba(180, 155, 110, 0.03)');
  dustGrad.addColorStop(1, 'rgba(180, 155, 110, 0)');
  ctx.fillStyle = dustGrad;
  ctx.fillRect(0, 0, W, H);
}

// =====================================================
// LITHIUM BRINE EVAPORATION PONDS
// =====================================================
function renderLithiumBrine(ctx, W, H, rng, dpr) {
  const cx = W * 0.45;
  const cy = H * 0.45;

  // Subtle terrain features — salt crusts, dry channels
  for (let i = 0; i < 200; i++) {
    const px = rng() * W;
    const py = rng() * H;
    ctx.fillStyle = `rgba(210, 200, 170, ${0.03 + rng() * 0.04})`;
    ctx.fillRect(px, py, rng() * 6 + 1, rng() * 2 + 1);
  }

  // Dry salt flat texture patches
  for (let i = 0; i < 30; i++) {
    const px = rng() * W;
    const py = rng() * H;
    const dist = Math.sqrt(((px - cx) / W) ** 2 + ((py - cy) / H) ** 2);
    if (dist < 0.25) continue;
    ctx.fillStyle = `rgba(220, 210, 185, ${0.05 + rng() * 0.08})`;
    irregularPath(ctx, px, py, rng() * 25 + 5, rng() * 15 + 5, rng, 0.3);
    ctx.fill();
  }

  // --- Evaporation ponds (the distinctive colorful rectangles) ---
  const pondPalette = [
    ['#1a8a9a', '#2598a5'],  // deep teal (high concentration)
    ['#45b8c8', '#55c0cc'],  // medium blue
    ['#7ad4d8', '#88dde0'],  // light blue-green
    ['#a8e8d4', '#b5f0dd'],  // pale green (low concentration)
    ['#d0f0e5', '#daf5ea'],  // very pale
    ['#2ca0aa', '#3aacb5'],  // turquoise
    ['#60c8c0', '#70d0c8'],  // sea green
    ['#b8e0d0', '#c5e8d8'],  // mint
  ];

  const numPonds = 6 + Math.floor(rng() * 5);
  const baseSize = Math.min(W, H) * 0.15;

  // Lay out ponds in an irregular grid with varying sizes
  const ponds = [];
  const gridCols = Math.ceil(Math.sqrt(numPonds * 1.2));
  const gridRows = Math.ceil(numPonds / gridCols);
  const cellW = baseSize + 12;
  const cellH = baseSize * 0.75 + 10;
  const startX = cx - (gridCols * cellW) / 2;
  const startY = cy - (gridRows * cellH) / 2;

  let drawn = 0;
  for (let row = 0; row < gridRows && drawn < numPonds; row++) {
    for (let col = 0; col < gridCols && drawn < numPonds; col++) {
      const px = startX + col * cellW + rng() * 6 - 3;
      const py = startY + row * cellH + rng() * 6 - 3;
      const pw = baseSize * (0.8 + rng() * 0.4);
      const ph = pw * (0.55 + rng() * 0.25);
      const colorIdx = Math.floor(rng() * pondPalette.length);
      ponds.push({ x: px, y: py, w: pw, h: ph, colorIdx });
      drawn++;
    }
  }

  // Draw berms/dikes first (raised earth between ponds)
  for (const p of ponds) {
    const bermW = 5 + rng() * 2;
    ctx.fillStyle = '#b8a878';
    ctx.fillRect(p.x - bermW, p.y - bermW, p.w + bermW * 2, p.h + bermW * 2);
    // Berm shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(p.x - bermW + 1, p.y + p.h, p.w + bermW * 2 - 1, bermW);
    ctx.fillRect(p.x + p.w, p.y - bermW + 1, bermW, p.h + bermW * 2 - 1);
  }
  // Berm texture
  for (const p of ponds) {
    const bermW = 5 + rng() * 2;
    for (let k = 0; k < 20; k++) {
      const bx = p.x - bermW + rng() * (p.w + bermW * 2);
      const by = p.y - bermW + rng() * (p.h + bermW * 2);
      ctx.fillStyle = `rgba(0,0,0,${rng() * 0.04})`;
      ctx.fillRect(bx, by, rng() * 2 + 0.5, rng() * 2 + 0.5);
    }
  }

  // Draw pond water with gradient and crystallization
  for (const p of ponds) {
    const [c1, c2] = pondPalette[p.colorIdx];
    const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
    grad.addColorStop(0, c1);
    grad.addColorStop(0.5, c2);
    grad.addColorStop(1, c1);
    ctx.fillStyle = grad;
    ctx.fillRect(p.x, p.y, p.w, p.h);

    // Wind ripple texture
    ctx.strokeStyle = `rgba(255,255,255,0.06)`;
    ctx.lineWidth = 0.5;
    for (let k = 0; k < 12; k++) {
      const ry = p.y + rng() * p.h;
      ctx.beginPath();
      ctx.moveTo(p.x, ry);
      ctx.lineTo(p.x + p.w, ry + (rng() - 0.5) * 3);
      ctx.stroke();
    }

    // Salt crystallization at edges (white patches)
    for (let edge = 0; edge < 4; edge++) {
      for (let k = 0; k < 8; k++) {
        let sx, sy;
        if (edge === 0) { sx = p.x + rng() * p.w; sy = p.y + rng() * 4; }
        else if (edge === 1) { sx = p.x + rng() * p.w; sy = p.y + p.h - rng() * 4; }
        else if (edge === 2) { sx = p.x + rng() * 4; sy = p.y + rng() * p.h; }
        else { sx = p.x + p.w - rng() * 4; sy = p.y + rng() * p.h; }
        ctx.fillStyle = `rgba(255,255,255,${0.08 + rng() * 0.12})`;
        ctx.fillRect(sx, sy, rng() * 5 + 1, rng() * 3 + 1);
      }
    }

    // Concentration gradient visible as color bands
    for (let band = 0; band < 3; band++) {
      const by = p.y + (p.h / 4) * (band + 1);
      ctx.fillStyle = `rgba(0,0,0,${0.02 + rng() * 0.02})`;
      ctx.fillRect(p.x, by - 1, p.w, 2);
    }
  }

  // --- Access roads (dirt tracks along berms) ---
  const gridLeft = startX - 15;
  const gridRight = startX + gridCols * cellW + 15;
  const gridTop = startY - 15;
  const gridBot = startY + gridRows * cellH + 15;

  // Horizontal roads
  for (let row = 0; row <= gridRows; row++) {
    const ry = startY + row * cellH - 6;
    drawRoad(ctx, [[gridLeft - 30, ry], [gridRight + 30, ry]], 3, '#a89868');
  }
  // Vertical roads
  for (let col = 0; col <= gridCols; col++) {
    const rx = startX + col * cellW - 6;
    drawRoad(ctx, [[rx, gridTop - 30], [rx, gridBot + 30]], 3, '#a89868');
  }

  // --- Processing plant ---
  const plX = gridRight + 40;
  const plY = cy - 20;
  drawBuilding(ctx, plX, plY, 30, 20, '#707068', '#5a5a54', 5);
  drawBuilding(ctx, plX + 34, plY + 4, 22, 14, '#686860', '#555550', 4);
  drawBuilding(ctx, plX + 8, plY + 24, 20, 12, '#6a6a62', '#545450', 4);
  // Pipe runs from ponds to plant
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const py = plY + 5 + i * 8;
    ctx.beginPath();
    ctx.moveTo(gridRight + 10, py);
    ctx.lineTo(plX, py);
    ctx.stroke();
  }

  // --- Main road to edge ---
  drawRoad(ctx, [[W, plY + 10], [plX + 55, plY + 10]], 5, '#a89868');

  // --- Vehicles on roads ---
  for (let i = 0; i < 5; i++) {
    const vx = gridLeft + rng() * (gridRight - gridLeft);
    const rowIdx = Math.floor(rng() * (gridRows + 1));
    const vy = startY + rowIdx * cellH - 6;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(vx - 2 + 1, vy - 1 + 1, 5, 3);
    // Vehicle
    ctx.fillStyle = i % 2 === 0 ? '#e0d040' : '#ffffff';
    ctx.fillRect(vx - 2, vy - 1, 5, 3);
  }
}

// =====================================================
// BITCOIN MINING FACILITY
// =====================================================
function renderBitcoinFacility(ctx, W, H, rng, dpr) {
  const cx = W * (0.45 + rng() * 0.05);
  const cy = H * (0.43 + rng() * 0.05);

  // --- Vegetation (grass, trees, scrubland) ---
  for (let i = 0; i < 200; i++) {
    const vx = rng() * W;
    const vy = rng() * H;
    const dist = Math.sqrt(((vx - cx) / (W * 0.3)) ** 2 + ((vy - cy) / (H * 0.25)) ** 2);
    if (dist < 1) continue;
    const vr = rng() * 10 + 3;
    const g = 50 + Math.round(rng() * 35);
    ctx.fillStyle = `rgba(${25 + rng() * 15}, ${g}, ${18 + rng() * 12}, ${0.25 + rng() * 0.2})`;
    ctx.beginPath();
    ctx.arc(vx, vy, vr, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tree canopies (darker circles with highlights)
  for (let i = 0; i < 40; i++) {
    const vx = rng() * W;
    const vy = rng() * H;
    const dist = Math.sqrt(((vx - cx) / (W * 0.35)) ** 2 + ((vy - cy) / (H * 0.3)) ** 2);
    if (dist < 1.1) continue;
    const tr = rng() * 6 + 3;
    ctx.fillStyle = `rgba(25, ${40 + rng() * 20}, 15, ${0.5 + rng() * 0.3})`;
    ctx.beginPath(); ctx.arc(vx, vy, tr, 0, Math.PI * 2); ctx.fill();
    // Highlight
    ctx.fillStyle = `rgba(50, ${70 + rng() * 20}, 30, 0.2)`;
    ctx.beginPath(); ctx.arc(vx - tr * 0.3, vy - tr * 0.3, tr * 0.5, 0, Math.PI * 2); ctx.fill();
  }

  // --- Cleared compound area ---
  const compW = Math.min(W, H) * (0.5 + rng() * 0.08);
  const compH = compW * (0.55 + rng() * 0.1);
  const compX = cx - compW / 2;
  const compY = cy - compH / 2;

  // Graded/cleared earth
  const clearGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, compW * 0.7);
  clearGrad.addColorStop(0, 'rgba(120, 115, 100, 0.85)');
  clearGrad.addColorStop(0.6, 'rgba(110, 108, 92, 0.7)');
  clearGrad.addColorStop(1, 'rgba(80, 90, 60, 0)');
  ctx.fillStyle = clearGrad;
  ctx.fillRect(compX - 20, compY - 20, compW + 40, compH + 40);

  // Concrete pad
  ctx.fillStyle = '#8a8880';
  ctx.fillRect(compX, compY, compW, compH);
  // Concrete texture
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(${rng() > 0.5 ? 0 : 255},${rng() > 0.5 ? 0 : 255},${rng() > 0.5 ? 0 : 255},${rng() * 0.03})`;
    ctx.fillRect(compX + rng() * compW, compY + rng() * compH, rng() * 2 + 0.5, rng() * 2 + 0.5);
  }
  // Expansion joints in concrete
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 5; i++) {
    const jx = compX + compW * (i + 1) / 6;
    ctx.beginPath(); ctx.moveTo(jx, compY); ctx.lineTo(jx, compY + compH); ctx.stroke();
  }

  // --- Security fence ---
  ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]);
  ctx.strokeRect(compX - 6, compY - 6, compW + 12, compH + 12);
  ctx.setLineDash([]);
  // Fence shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(compX - 5, compY - 5, compW + 12, compH + 12);

  // --- Long mining halls (the main buildings) ---
  const numHalls = 3 + Math.floor(rng() * 3);
  const hallW = compW * 0.85;
  const hallSpacing = compH * 0.85 / numHalls;
  const hallH = hallSpacing * 0.65;
  const hallStartX = compX + (compW - hallW) / 2;
  const hallStartY = compY + compH * 0.08;

  for (let i = 0; i < numHalls; i++) {
    const hx = hallStartX;
    const hy = hallStartY + i * hallSpacing;

    // Building with shadow
    drawBuilding(ctx, hx, hy, hallW, hallH, i % 2 === 0 ? '#656565' : '#5e5e5e', '#4a4a4a', 4);

    // Metal roof ridgeline
    ctx.strokeStyle = 'rgba(180,180,180,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx, hy + hallH / 2);
    ctx.lineTo(hx + hallW, hy + hallH / 2);
    ctx.stroke();

    // HVAC/cooling units on roof (the distinctive feature of mining facilities)
    const numHVAC = 6 + Math.floor(rng() * 4);
    for (let j = 0; j < numHVAC; j++) {
      const hx2 = hx + 8 + j * (hallW - 16) / numHVAC;
      const hy2 = hy + 3 + (j % 2) * 2;
      const hvacSize = 5 + rng() * 3;
      // HVAC shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(hx2 + 1, hy2 + 1, hvacSize, hvacSize);
      // HVAC unit
      ctx.fillStyle = '#757575';
      ctx.fillRect(hx2, hy2, hvacSize, hvacSize);
      // Fan circle
      ctx.strokeStyle = 'rgba(200,200,200,0.2)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(hx2 + hvacSize / 2, hy2 + hvacSize / 2, hvacSize * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Loading dock doors on one side
    for (let j = 0; j < 3; j++) {
      const dx = hx + 15 + j * 25;
      ctx.fillStyle = 'rgba(40,40,40,0.3)';
      ctx.fillRect(dx, hy + hallH - 3, 8, 3);
    }
  }

  // --- Cooling infrastructure (side of compound) ---
  const coolX = compX + compW + 12;
  const numCool = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < numCool; i++) {
    const cty = compY + 8 + i * (compH / numCool);
    const coolSize = 12 + rng() * 4;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(coolX + 2, cty + 2, coolSize, coolSize);
    // Unit
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(coolX, cty, coolSize, coolSize);
    // Fan
    ctx.strokeStyle = 'rgba(180,180,180,0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(coolX + coolSize / 2, cty + coolSize / 2, coolSize * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    // Pipe to building
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(coolX, cty + coolSize / 2);
    ctx.lineTo(compX + compW, cty + coolSize / 2);
    ctx.stroke();
  }

  // --- Electrical substation ---
  const subX = compX - 50;
  const subY = compY + 15;
  const subW = 35;
  const subH = 25;
  // Fence
  ctx.strokeStyle = 'rgba(150,150,150,0.4)';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([2, 2]);
  ctx.strokeRect(subX - 3, subY - 3, subW + 6, subH + 6);
  ctx.setLineDash([]);
  // Pad
  ctx.fillStyle = '#7a7a72';
  ctx.fillRect(subX, subY, subW, subH);
  // Transformers
  for (let i = 0; i < 3; i++) {
    drawBuilding(ctx, subX + 4 + i * 10, subY + 4, 7, 7, '#555', '#444', 2);
  }
  // Buswork
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(subX + 7 + i * 10, subY);
    ctx.lineTo(subX + 7 + i * 10, subY - 3);
    ctx.stroke();
  }

  // --- Power lines from substation ---
  ctx.strokeStyle = 'rgba(100,100,100,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, subY + subH / 2);
  ctx.lineTo(subX, subY + subH / 2);
  ctx.stroke();
  // Transmission poles
  for (let i = 0; i < 4; i++) {
    const px = subX - 20 - i * 30;
    const py = subY + subH / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(px + 1, py - 8 + 1, 2, 16);
    ctx.fillStyle = '#666';
    ctx.fillRect(px, py - 8, 2, 16);
    ctx.fillRect(px - 5, py - 6, 12, 1);
  }
  // Cable from substation to compound
  ctx.strokeStyle = 'rgba(80,80,80,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(subX + subW, subY + subH / 2);
  ctx.lineTo(compX, subY + subH / 2);
  ctx.stroke();

  // --- Parking lot ---
  const parkX = compX + compW * 0.08;
  const parkY = compY + compH + 12;
  ctx.fillStyle = '#606058';
  ctx.fillRect(parkX, parkY, 65, 28);
  // Parking lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 8; i++) {
    const lx = parkX + 4 + i * 8;
    ctx.beginPath(); ctx.moveTo(lx, parkY + 4); ctx.lineTo(lx, parkY + 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, parkY + 16); ctx.lineTo(lx, parkY + 24); ctx.stroke();
  }
  // Parked cars with shadows
  for (let i = 0; i < 7; i++) {
    const carX = parkX + 4 + i * 8;
    const carRow = rng() > 0.5 ? parkY + 5 : parkY + 17;
    if (rng() > 0.3) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(carX + 1, carRow + 1, 5, 4);
      const carColors = ['#ccc', '#888', '#555', '#aaa', '#999', '#bbb', '#ddd'];
      ctx.fillStyle = carColors[Math.floor(rng() * carColors.length)];
      ctx.fillRect(carX, carRow, 5, 4);
    }
  }

  // --- Admin / office building ---
  drawBuilding(ctx, compX + compW * 0.7, parkY, 30, 16, '#707068', '#5a5a55', 4);

  // --- Access road ---
  drawRoad(ctx, [[W, parkY + 14], [parkX + 70, parkY + 14], [parkX + 60, parkY + 12]], 6, '#7a7860');
  // Gate entry
  ctx.fillStyle = '#888';
  ctx.fillRect(compX + compW * 0.5 - 2, compY - 8, 4, 4);
  ctx.fillRect(compX + compW * 0.5 + 4, compY - 8, 4, 4);

  // --- Stormwater retention pond ---
  const swpX = compX + compW + 35;
  const swpY = compY + compH * 0.6;
  irregularPath(ctx, swpX, swpY, 18, 12, rng, 0.15);
  ctx.fillStyle = '#4a6a5a';
  ctx.fill();
  irregularPath(ctx, swpX, swpY, 14, 9, rng, 0.2);
  ctx.fillStyle = 'rgba(50, 90, 70, 0.5)';
  ctx.fill();

  // --- Perimeter lighting (small dots along fence) ---
  ctx.fillStyle = 'rgba(255, 255, 200, 0.3)';
  for (let i = 0; i < 20; i++) {
    const t = i / 20;
    const lx = compX - 6 + t * (compW + 12);
    ctx.beginPath(); ctx.arc(lx, compY - 6, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lx, compY + compH + 6, 1, 0, Math.PI * 2); ctx.fill();
  }
}

// =====================================================
// HUD OVERLAY
// =====================================================

function startOverlayLoop() {
  if (overlayAnimFrame) return;
  function loop() {
    overlayAnimFrame = requestAnimationFrame(loop);
    renderSiteOverlay();
  }
  loop();
}

function stopOverlayLoop() {
  if (overlayAnimFrame) {
    cancelAnimationFrame(overlayAnimFrame);
    overlayAnimFrame = null;
  }
}

function renderSiteOverlay() {
  const canvas = $('site-view-overlay');
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;

  const rect = parent.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = rect.width, H = rect.height;

  ctx.clearRect(0, 0, W, H);

  const d = lastOverlayData;

  // --- For mines: draw cached procedural reconstruction as background ---
  if (isMineView && d) {
    const cacheKey = `${d.name}|${canvas.width}|${canvas.height}`;
    if (mineReconCacheKey !== cacheKey || !mineReconCache) {
      // Render to offscreen canvas and cache
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext('2d');
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderMineReconstruction(offCtx, W, H, d);
      mineReconCache = offscreen;
      mineReconCacheKey = cacheKey;
    }
    // Blit cached reconstruction
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(mineReconCache, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.restore();
  }

  // --- HUD overlay (same for all site types) ---

  // Subtle tint
  if (!isMineView) {
    ctx.fillStyle = 'rgba(0, 10, 30, 0.1)';
    ctx.fillRect(0, 0, W, H);
  }

  // Vignette
  const vigGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(0.7, isMineView ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)');
  vigGrad.addColorStop(1, isMineView ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, W, H);

  // Scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  // Moving scan line
  const scanY = (Date.now() / 25) % H;
  const scanGrad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
  scanGrad.addColorStop(0, 'rgba(180, 220, 255, 0)');
  scanGrad.addColorStop(0.5, 'rgba(180, 220, 255, 0.04)');
  scanGrad.addColorStop(1, 'rgba(180, 220, 255, 0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 15, W, 30);

  // Corner brackets
  const bracketLen = 30, bracketInset = 20;
  ctx.strokeStyle = HUD_COLOR + '0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bracketInset, bracketInset + bracketLen);
  ctx.lineTo(bracketInset, bracketInset);
  ctx.lineTo(bracketInset + bracketLen, bracketInset);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - bracketInset - bracketLen, bracketInset);
  ctx.lineTo(W - bracketInset, bracketInset);
  ctx.lineTo(W - bracketInset, bracketInset + bracketLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bracketInset, H - bracketInset - bracketLen);
  ctx.lineTo(bracketInset, H - bracketInset);
  ctx.lineTo(bracketInset + bracketLen, H - bracketInset);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - bracketInset - bracketLen, H - bracketInset);
  ctx.lineTo(W - bracketInset, H - bracketInset);
  ctx.lineTo(W - bracketInset, H - bracketInset - bracketLen);
  ctx.stroke();

  // Data readouts
  if (!d) return;

  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  ctx.font = '10px Courier New';
  ctx.textBaseline = 'bottom';

  ctx.fillStyle = HUD_COLOR + '0.7)';
  ctx.textAlign = 'left';
  ctx.fillText('SITE: ' + (d.name || '---'), bracketInset + 2, bracketInset - 4);
  ctx.fillStyle = HUD_COLOR + '0.4)';
  ctx.fillText(d.type || 'UNKNOWN', bracketInset + 2, bracketInset - 16);

  ctx.textAlign = 'right';
  ctx.fillStyle = (Math.floor(Date.now() / 800) % 2 === 0) ? HUD_COLOR + '0.8)' : HUD_COLOR + '0.3)';
  ctx.fillText(isMineView ? 'RECON // RECONSTRUCTION' : 'RECON', W - bracketInset - 2, bracketInset - 4);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = HUD_COLOR + '0.65)';
  const bY = H - bracketInset + 6;
  ctx.fillText(timestamp, bracketInset + 2, bY);

  ctx.textAlign = 'right';
  ctx.fillText('LAT ' + d.lat.toFixed(4) + '\u00B0', W - bracketInset - 2, bY);
  ctx.fillText('LON ' + d.lon.toFixed(4) + '\u00B0', W - bracketInset - 2, bY + 13);

  // Center reticle (diamond)
  const rcx = W / 2, rcy = H / 2;
  ctx.strokeStyle = HUD_COLOR + '0.2)';
  ctx.lineWidth = 1;
  const r = 12;
  ctx.beginPath();
  ctx.moveTo(rcx, rcy - r);
  ctx.lineTo(rcx + r, rcy);
  ctx.lineTo(rcx, rcy + r);
  ctx.lineTo(rcx - r, rcy);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = HUD_COLOR + '0.3)';
  ctx.beginPath(); ctx.arc(rcx, rcy, 2, 0, Math.PI * 2); ctx.fill();
}

// =====================================================
// SITE INFO CANVAS (top panel)
// =====================================================

function renderSiteInfoCanvas() {
  const canvas = $('site-info-canvas');
  if (!canvas) return;

  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;

  ctx.fillStyle = '#000810';
  ctx.fillRect(0, 0, W, H);

  const d = lastOverlayData;
  if (!d) return;
  const ac = siteViewTarget?.acData;
  if (!ac) return;

  // Coordinate grid
  const gridSize = Math.min(W * 0.45, H * 0.85);
  const gridX = 16;
  const gridY = (H - gridSize) / 2;

  ctx.fillStyle = HUD_COLOR + '0.03)';
  ctx.fillRect(gridX, gridY, gridSize, gridSize);
  ctx.strokeStyle = HUD_COLOR + '0.08)';
  ctx.lineWidth = 0.5;
  const cells = 8;
  for (let i = 0; i <= cells; i++) {
    const x = gridX + (gridSize / cells) * i;
    const y = gridY + (gridSize / cells) * i;
    ctx.beginPath(); ctx.moveTo(x, gridY); ctx.lineTo(x, gridY + gridSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gridX, y); ctx.lineTo(gridX + gridSize, y); ctx.stroke();
  }
  ctx.strokeStyle = HUD_COLOR + '0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(gridX, gridY, gridSize, gridSize);

  const centerX = gridX + gridSize / 2;
  const centerY = gridY + gridSize / 2;

  // Pulsing site marker
  const pulseR = 8 + Math.sin(Date.now() / 500) * 3;
  ctx.strokeStyle = HUD_COLOR + '0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(centerX, centerY, pulseR, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = HUD_ACCENT;
  ctx.beginPath(); ctx.arc(centerX, centerY, 3, 0, Math.PI * 2); ctx.fill();

  // Camera indicator (for non-mine) or "OVERHEAD" label (for mine)
  if (!isMineView) {
    const camR = gridSize * 0.3;
    const camAngle = FIXED_HEADING_RAD - Math.PI;
    const camX = centerX + camR * Math.cos(camAngle);
    const camY = centerY - camR * Math.sin(camAngle);
    ctx.fillStyle = HUD_COLOR + '0.8)';
    ctx.beginPath(); ctx.arc(camX, camY, 4, 0, Math.PI * 2); ctx.fill();
    const fovHalf = 0.3;
    const coneLen = camR * 0.7;
    const angleToCenter = Math.atan2(centerY - camY, centerX - camX);
    ctx.strokeStyle = HUD_COLOR + '0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(camX, camY);
    ctx.lineTo(camX + coneLen * Math.cos(angleToCenter - fovHalf), camY + coneLen * Math.sin(angleToCenter - fovHalf));
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(camX, camY);
    ctx.lineTo(camX + coneLen * Math.cos(angleToCenter + fovHalf), camY + coneLen * Math.sin(angleToCenter + fovHalf));
    ctx.stroke();
    ctx.font = '8px Courier New';
    ctx.fillStyle = HUD_COLOR + '0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('CAM', camX, camY - 8);
  } else {
    // Overhead view indicator for mine reconstruction
    ctx.font = '8px Courier New';
    ctx.fillStyle = HUD_COLOR + '0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('OVERHEAD', centerX, gridY + gridSize + 10);
  }

  // Site dossier
  const textX = gridX + gridSize + 24;
  const textY = gridY + 8;
  ctx.font = '9px Courier New';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const lines = [
    { label: 'SITE', value: (ac.flight || ac.r || '---').trim() },
    { label: 'TYPE', value: ac.t || '---' },
    { label: 'OPER', value: extractOperator(ac.desc) },
    { label: 'LOC ', value: extractCountry(ac.desc) },
    { label: 'NOTE', value: extractNotes(ac.desc) },
    { label: 'LAT ', value: d.lat.toFixed(4) + '\u00B0' },
    { label: 'LON ', value: d.lon.toFixed(4) + '\u00B0' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const y = textY + i * 18;
    ctx.fillStyle = HUD_COLOR + '0.35)';
    ctx.fillText(lines[i].label, textX, y);
    ctx.fillStyle = HUD_COLOR + '0.7)';
    let val = lines[i].value;
    if (val.length > 28) val = val.substring(0, 27) + '\u2026';
    ctx.fillText(val, textX + 44, y);
  }

  // Scan line
  const scanLineY = (Date.now() / 30) % H;
  ctx.strokeStyle = HUD_COLOR + '0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, scanLineY); ctx.lineTo(W, scanLineY); ctx.stroke();
}

// =====================================================
// OPEN / CLOSE
// =====================================================

export function openSiteView(viewer, entity) {
  if (!entity || !entity.acData) return;

  initSiteViewer();
  siteViewTarget = entity;
  siteViewOpen = true;

  const ac = entity.acData;
  isMineView = (ac.t || '').includes('MINE');

  $('site-view-panel').classList.add('open');
  document.body.classList.add('site-panel-open');

  $('stv-site-name').textContent = (ac.flight || ac.r || '---').trim();
  $('stv-type').textContent = ac.t || '---';
  $('stv-operator').textContent = extractOperator(ac.desc);
  $('stv-country').textContent = extractCountry(ac.desc);
  $('stv-notes').textContent = extractNotes(ac.desc);

  const posInfo = getEntityPosition(entity);
  if (posInfo) {
    lastOverlayData = {
      name: (ac.flight || ac.r || '---').trim(),
      type: ac.t || 'UNKNOWN',
      lat: posInfo.lat,
      lon: posInfo.lon,
    };
    $('stv-lat').textContent = posInfo.lat.toFixed(4) + '\u00B0';
    $('stv-lon').textContent = posInfo.lon.toFixed(4) + '\u00B0';
    // For non-mine sites, set the Cesium camera
    if (!isMineView) setSiteCamera(posInfo, ac.t);
  }

  startOverlayLoop();

  setTimeout(() => {
    viewer.resize();
    if (siteViewer) siteViewer.resize();
    const freshPos = getEntityPosition(entity);
    if (freshPos) {
      if (!isMineView) setSiteCamera(freshPos, entity.acData.t);
      renderSiteInfoCanvas();
    }
  }, 400);
}

export function closeSiteView(viewer) {
  siteViewOpen = false;
  siteViewTarget = null;
  lastOverlayData = null;
  isMineView = false;
  mineReconCache = null;
  mineReconCacheKey = null;
  $('site-view-panel').classList.remove('open');
  document.body.classList.remove('site-panel-open');

  stopOverlayLoop();

  setTimeout(() => viewer.resize(), 400);
}
