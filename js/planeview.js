/* ===================================================================
   PANOPTICON — Aircraft Aerial View (second Cesium viewer + Canvas)
   Shows what a plane would see from its altitude and speed.
   Military camera footage aesthetic.
   =================================================================== */

import { $ } from './utils.js';
import { getEntityPosition, createDetailViewer, startAnimLoop, drawHudOverlay, computeFootprintKm, computeCirclePositions, setupOverlayCanvas } from './viewbase.js';
import { registerView } from './viewregistry.js';

let planeViewer = null;
let planeViewOpen = false;
let planeViewTarget = null;   // the Cesium entity being tracked
let planeViewUpdateHandler = null;
let planeViewFootprintEntities = [];
let overlayHandle = null;
let frameCounter = 0;

export function isPlaneViewOpen() { return planeViewOpen; }
export function resizePlaneView() { if (planeViewer) planeViewer.resize(); }

function initPlaneViewer() {
  if (planeViewer) return;
  planeViewer = createDetailViewer('plane-view-container');
}

let lastOverlayData = null;

function renderMilitaryOverlay() {
  const setup = setupOverlayCanvas($('plane-view-overlay'));
  if (!setup) return;
  const { ctx, W, H } = setup;

  ctx.clearRect(0, 0, W, H);

  const HUD = 'rgba(0, 255, 65, ';
  drawHudOverlay(ctx, W, H, HUD, {
    tintColor: 'rgba(0, 20, 0, 0.15)',
    vigInner: 0.05,
    vigOuter: 0.55,
    scanSpeed: 20,
  });

  const d = lastOverlayData;
  if (!d) return;

  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const altFt = Math.round(d.altM / 0.3048);
  const gsKnots = d.gs || 0;
  const heading = d.track || 0;
  const callsign = (d.flight || d.r || d.hex || '---').trim();

  ctx.font = '10px Courier New';
  ctx.textBaseline = 'bottom';

  // Top-left: callsign + mode
  ctx.fillStyle = 'rgba(0, 255, 65, 0.7)';
  ctx.textAlign = 'left';
  ctx.fillText('TGT: ' + callsign, bracketInset + 2, bracketInset - 4);
  ctx.fillStyle = 'rgba(0, 255, 65, 0.4)';
  ctx.fillText('IR / NAR', bracketInset + 2, bracketInset - 16);

  // Top-right: recording indicator
  ctx.textAlign = 'right';
  ctx.fillStyle = (Math.floor(Date.now() / 800) % 2 === 0) ? 'rgba(255, 60, 60, 0.8)' : 'rgba(255, 60, 60, 0.3)';
  ctx.fillText('REC', W - bracketInset - 2, bracketInset - 4);

  // Bottom-left block
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0, 255, 65, 0.65)';
  const bY = H - bracketInset + 6;
  ctx.fillText(timestamp, bracketInset + 2, bY);
  ctx.fillText('ALT ' + altFt.toLocaleString() + ' FT', bracketInset + 2, bY + 13);
  ctx.fillText('GS  ' + Math.round(gsKnots) + ' KTS', bracketInset + 2, bY + 26);

  // Bottom-right block
  ctx.textAlign = 'right';
  ctx.fillText('HDG ' + Math.round(heading).toString().padStart(3, '0') + '\u00B0', W - bracketInset - 2, bY);
  ctx.fillText('LAT ' + d.lat.toFixed(4) + '\u00B0', W - bracketInset - 2, bY + 13);
  ctx.fillText('LON ' + d.lon.toFixed(4) + '\u00B0', W - bracketInset - 2, bY + 26);

  // --- Center reticle (small + with gap) ---
  const cx = W / 2, cy = H / 2;
  ctx.strokeStyle = 'rgba(0, 255, 65, 0.3)';
  ctx.lineWidth = 1;
  const gap = 8, arm = 18;
  ctx.beginPath();
  ctx.moveTo(cx - gap - arm, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + arm, cy);
  ctx.moveTo(cx, cy - gap - arm); ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + arm);
  ctx.stroke();

  // Small center dot
  ctx.fillStyle = 'rgba(0, 255, 65, 0.4)';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
}

// --- Open / Close ---

export function openPlaneView(viewer, entity) {
  if (!entity || !entity.acData) return;

  initPlaneViewer();
  planeViewTarget = entity;
  planeViewOpen = true;
  $('plane-view-panel').classList.add('open');
  document.body.classList.add('plane-panel-open');

  const ac = entity.acData;
  $('pv-callsign').textContent = (ac.flight || ac.r || ac.hex || '---').trim();
  $('pv-type').textContent = ac.desc || ac.t || '---';

  const posInfo = getEntityPosition(entity);
  if (posInfo) {
    // acData first, then posInfo wins — so current position always overrides stale API data
    lastOverlayData = { ...ac, ...posInfo };
    updatePlaneViewCamera(posInfo, ac);
  }

  if (planeViewUpdateHandler) viewer.scene.preRender.removeEventListener(planeViewUpdateHandler);
  planeViewUpdateHandler = () => {
    if (!planeViewOpen || !planeViewTarget) return;
    const p = getEntityPosition(planeViewTarget);
    const d = planeViewTarget.acData;
    if (p) {
      lastOverlayData = { ...d, ...p };
      updatePlaneViewCamera(p, d);
    }
  };
  viewer.scene.preRender.addEventListener(planeViewUpdateHandler);

  overlayHandle = startAnimLoop(renderMilitaryOverlay);

  setTimeout(() => {
    viewer.resize();
    if (planeViewer) planeViewer.resize();
    const freshPos = getEntityPosition(entity);
    if (freshPos) renderPlaneHorizonView(freshPos, entity.acData);
  }, 400);
}

export function closePlaneView(viewer) {
  planeViewOpen = false;
  planeViewTarget = null;
  lastOverlayData = null;
  $('plane-view-panel').classList.remove('open');
  document.body.classList.remove('plane-panel-open');

  if (overlayHandle) { overlayHandle.stop(); overlayHandle = null; }

  if (planeViewUpdateHandler) {
    viewer.scene.preRender.removeEventListener(planeViewUpdateHandler);
    planeViewUpdateHandler = null;
  }

  if (planeViewer) {
    planeViewFootprintEntities.forEach(e => planeViewer.entities.remove(e));
    planeViewFootprintEntities = [];
  }

  setTimeout(() => viewer.resize(), 400);
}

// --- Camera Updates ---

function updatePlaneViewCamera(posInfo, acData) {
  if (!planeViewer || !posInfo) return;

  const { lon, lat, altM } = posInfo;
  const footprintRadiusKm = computeFootprintKm(altM);

  const gsKnots = acData ? (acData.gs || 0) : 0;
  const gsKmh = gsKnots * 1.852;
  const altFt = Math.round(altM / 0.3048);
  const heading = acData ? (acData.track || 0) : 0;

  frameCounter++;
  if (frameCounter % 30 === 0) {
    $('pv-alt').textContent = altFt.toLocaleString() + ' ft (' + Math.round(altM / 1000 * 10) / 10 + ' km)';
    $('pv-spd').textContent = Math.round(gsKnots) + ' kts (' + Math.round(gsKmh) + ' km/h)';
    $('pv-lat').textContent = lat.toFixed(3) + '\u00B0';
    $('pv-lon').textContent = lon.toFixed(3) + '\u00B0';
    $('pv-footprint').textContent = footprintRadiusKm < 1
      ? Math.round(footprintRadiusKm * 1000) + ' m radius'
      : Math.round(footprintRadiusKm * 10) / 10 + ' km radius';
  }

  const viewAlt = Math.max(altM, 500);
  const headingRad = Cesium.Math.toRadians(heading);

  // Offset camera behind the plane so it looks forward along the track
  const offsetDist = Math.min(viewAlt * 0.4, 8000); // meters behind
  const offsetLat = lat - (offsetDist / 111320) * Math.cos(headingRad);
  const offsetLon = lon - (offsetDist / (111320 * Math.cos(Cesium.Math.toRadians(lat)))) * Math.sin(headingRad);

  planeViewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(offsetLon, offsetLat, viewAlt * 1.15),
    orientation: { heading: headingRad, pitch: Cesium.Math.toRadians(-35), roll: 0 },
  });

  if (planeViewFootprintEntities.length === 0) {
    createPlaneViewFootprint(lon, lat, footprintRadiusKm);
  } else if (frameCounter % 60 === 0) {
    updatePlaneViewFootprintPositions(lon, lat, footprintRadiusKm);
  }

  if (frameCounter % 5 === 0) renderPlaneHorizonView(posInfo, acData);
}

// --- Footprint Visualization ---

function createPlaneViewFootprint(lon, lat, radiusKm) {
  const radiusDeg = radiusKm / 111.32;
  const cosLat = Math.cos(Cesium.Math.toRadians(lat));
  const crossLen = radiusDeg * 1.2;
  const color = Cesium.Color.fromCssColorString('#00ff41');

  planeViewFootprintEntities.push(planeViewer.entities.add({
    polyline: { positions: computeCirclePositions(lon, lat, radiusDeg, 48), width: 2, material: color.withAlpha(0.5), clampToGround: true },
  }));

  planeViewFootprintEntities.push(planeViewer.entities.add({
    polyline: { positions: computeCirclePositions(lon, lat, radiusDeg * 0.5, 48), width: 1, material: new Cesium.PolylineDashMaterialProperty({ color: color.withAlpha(0.3), dashLength: 8 }), clampToGround: true },
  }));

  for (const cl of [
    [lon - crossLen / cosLat, lat, lon + crossLen / cosLat, lat],
    [lon, lat - crossLen, lon, lat + crossLen],
  ]) {
    planeViewFootprintEntities.push(planeViewer.entities.add({
      polyline: { positions: Cesium.Cartesian3.fromDegreesArray(cl), width: 1, material: color.withAlpha(0.15), clampToGround: true },
    }));
  }

  planeViewFootprintEntities.push(planeViewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, 100),
    point: { pixelSize: 6, color: color, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    label: { text: 'NADIR', font: '10px Courier New', fillColor: color.withAlpha(0.7), outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -14), disableDepthTestDistance: Number.POSITIVE_INFINITY, horizontalOrigin: Cesium.HorizontalOrigin.CENTER },
  }));
}

function updatePlaneViewFootprintPositions(lon, lat, radiusKm) {
  const radiusDeg = radiusKm / 111.32;
  const cosLat = Math.cos(Cesium.Math.toRadians(lat));
  const crossLen = radiusDeg * 1.2;

  if (planeViewFootprintEntities[0]) planeViewFootprintEntities[0].polyline.positions = computeCirclePositions(lon, lat, radiusDeg, 48);
  if (planeViewFootprintEntities[1]) planeViewFootprintEntities[1].polyline.positions = computeCirclePositions(lon, lat, radiusDeg * 0.5, 48);
  if (planeViewFootprintEntities[2]) planeViewFootprintEntities[2].polyline.positions = Cesium.Cartesian3.fromDegreesArray([lon - crossLen / cosLat, lat, lon + crossLen / cosLat, lat]);
  if (planeViewFootprintEntities[3]) planeViewFootprintEntities[3].polyline.positions = Cesium.Cartesian3.fromDegreesArray([lon, lat - crossLen, lon, lat + crossLen]);
  if (planeViewFootprintEntities[4]) planeViewFootprintEntities[4].position = Cesium.Cartesian3.fromDegrees(lon, lat, 100);
}

// --- Side-View Flight Profile Canvas ---
// Draws a cross-section: terrain at bottom, sky above, plane at altitude,
// scope-of-sight cone, altitude ladder, speed/heading info.

function renderPlaneHorizonView(posInfo, acData) {
  const canvas = $('plane-horizon-canvas');
  if (!canvas) return;

  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;

  const altM = posInfo.altM || 10000;
  const altFt = Math.round(altM / 0.3048);
  const footprintKm = computeFootprintKm(altM);
  const gsKnots = acData ? (acData.gs || 0) : 0;
  const heading = acData ? (acData.track || 0) : 0;
  const callsign = acData ? (acData.flight || acData.r || acData.hex || 'UNKNOWN').trim() : 'UNKNOWN';

  // Layout
  const groundY = H * 0.82;       // ground level
  const skyTop = H * 0.08;        // top of usable area
  const planeX = W * 0.42;        // plane horizontal position (left-ish to leave room for labels)
  const altRange = groundY - skyTop;
  // Place plane proportionally; clamp so it doesn't go off-screen
  const maxDisplayAlt = 50000; // ft
  const altFrac = Math.min(altFt / maxDisplayAlt, 1);
  const planeY = groundY - altFrac * altRange;

  // --- Sky gradient ---
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, '#000a00');
  skyGrad.addColorStop(0.4, '#001a05');
  skyGrad.addColorStop(1, '#002a0a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, groundY);

  // --- Stars ---
  const starSeed = Math.floor(posInfo.lon * 10 + posInfo.lat * 7);
  for (let i = 0; i < 40; i++) {
    const sx = ((starSeed * 13 + i * 97) % 1000) / 1000 * W;
    const sy = ((starSeed * 7 + i * 53) % 1000) / 1000 * (groundY * 0.5);
    const brightness = 0.08 + ((i * 37) % 100) / 350;
    ctx.fillStyle = `rgba(0, 255, 65, ${brightness})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // --- Terrain (procedural hills based on lon/lat) ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, groundY);
  const terrainSeed = Math.floor(posInfo.lon * 3 + posInfo.lat * 5);
  for (let x = 0; x <= W; x += 4) {
    const t = x / W;
    const h1 = Math.sin(t * 8 + terrainSeed) * 6;
    const h2 = Math.sin(t * 15 + terrainSeed * 2.3) * 3;
    const h3 = Math.sin(t * 3 + terrainSeed * 0.7) * 8;
    ctx.lineTo(x, groundY + h1 + h2 + h3 - 4);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  const terrGrad = ctx.createLinearGradient(0, groundY - 15, 0, H);
  terrGrad.addColorStop(0, '#0a3a12');
  terrGrad.addColorStop(0.3, '#062a0a');
  terrGrad.addColorStop(1, '#021a04');
  ctx.fillStyle = terrGrad;
  ctx.fill();
  // Terrain edge highlight
  ctx.strokeStyle = 'rgba(0, 255, 65, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // --- Ground line ---
  ctx.strokeStyle = 'rgba(0, 255, 65, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(W, groundY);
  ctx.stroke();

  // --- Scope-of-sight cone from plane to ground ---
  const fpHalfSpan = Math.min(footprintKm * 8, W * 0.35); // pixel half-width on ground
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;

  // Left cone line
  let grad = ctx.createLinearGradient(planeX, planeY, planeX - fpHalfSpan, groundY);
  grad.addColorStop(0, 'rgba(0, 255, 65, 0.5)');
  grad.addColorStop(1, 'rgba(0, 255, 65, 0.1)');
  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.moveTo(planeX, planeY);
  ctx.lineTo(planeX - fpHalfSpan, groundY);
  ctx.stroke();

  // Right cone line
  grad = ctx.createLinearGradient(planeX, planeY, planeX + fpHalfSpan, groundY);
  grad.addColorStop(0, 'rgba(0, 255, 65, 0.5)');
  grad.addColorStop(1, 'rgba(0, 255, 65, 0.1)');
  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.moveTo(planeX, planeY);
  ctx.lineTo(planeX + fpHalfSpan, groundY);
  ctx.stroke();

  // Center nadir line
  ctx.setLineDash([2, 6]);
  ctx.strokeStyle = 'rgba(0, 255, 65, 0.15)';
  ctx.beginPath();
  ctx.moveTo(planeX, planeY + 12);
  ctx.lineTo(planeX, groundY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // --- Footprint highlight on ground ---
  const fpGlow = ctx.createLinearGradient(planeX - fpHalfSpan, 0, planeX + fpHalfSpan, 0);
  fpGlow.addColorStop(0, 'rgba(0, 255, 65, 0)');
  fpGlow.addColorStop(0.3, 'rgba(0, 255, 65, 0.08)');
  fpGlow.addColorStop(0.5, 'rgba(0, 255, 65, 0.12)');
  fpGlow.addColorStop(0.7, 'rgba(0, 255, 65, 0.08)');
  fpGlow.addColorStop(1, 'rgba(0, 255, 65, 0)');
  ctx.fillStyle = fpGlow;
  ctx.fillRect(planeX - fpHalfSpan, groundY - 2, fpHalfSpan * 2, 6);

  // --- Nadir marker on ground ---
  ctx.fillStyle = '#00ff41';
  ctx.beginPath();
  ctx.moveTo(planeX, groundY - 4);
  ctx.lineTo(planeX + 3, groundY);
  ctx.lineTo(planeX - 3, groundY);
  ctx.closePath();
  ctx.fill();

  // --- Plane icon (side view, facing right) ---
  ctx.save();
  ctx.translate(planeX, planeY);
  // Glow
  const planeGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
  planeGlow.addColorStop(0, 'rgba(0, 255, 65, 0.2)');
  planeGlow.addColorStop(1, 'rgba(0, 255, 65, 0)');
  ctx.fillStyle = planeGlow;
  ctx.fillRect(-18, -18, 36, 36);
  // Fuselage (side view)
  ctx.fillStyle = '#00ff41';
  ctx.beginPath();
  ctx.moveTo(-12, 0);    // nose
  ctx.lineTo(-6, -2);
  ctx.lineTo(4, -2);
  ctx.lineTo(8, -8);     // tail fin top
  ctx.lineTo(10, -8);
  ctx.lineTo(8, -2);
  ctx.lineTo(12, -1);    // tail
  ctx.lineTo(12, 1);
  ctx.lineTo(8, 2);
  ctx.lineTo(8, 5);      // tail fin bottom
  ctx.lineTo(6, 5);
  ctx.lineTo(6, 2);
  ctx.lineTo(4, 2);
  ctx.lineTo(-6, 2);
  ctx.lineTo(-12, 0);
  ctx.closePath();
  ctx.fill();
  // Wing
  ctx.fillStyle = 'rgba(0, 255, 65, 0.6)';
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.lineTo(2, -7);
  ctx.lineTo(4, -7);
  ctx.lineTo(2, -2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-4, 2);
  ctx.lineTo(2, 7);
  ctx.lineTo(4, 7);
  ctx.lineTo(2, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // --- Speed vector arrow ---
  if (gsKnots > 10) {
    const arrowLen = Math.min(gsKnots / 8, 40);
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(planeX - 14, planeY);
    ctx.lineTo(planeX - 14 - arrowLen, planeY);
    ctx.stroke();
    // Arrowhead
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0, 255, 65, 0.3)';
    ctx.beginPath();
    ctx.moveTo(planeX - 14 - arrowLen, planeY);
    ctx.lineTo(planeX - 10 - arrowLen, planeY - 3);
    ctx.lineTo(planeX - 10 - arrowLen, planeY + 3);
    ctx.closePath();
    ctx.fill();
  }

  // --- Labels next to plane ---
  ctx.save();
  ctx.font = '10px Courier New';
  ctx.fillStyle = 'rgba(0, 255, 65, 0.85)';
  ctx.textAlign = 'left';
  ctx.fillText(callsign, planeX + 20, planeY - 6);
  ctx.font = '9px Courier New';
  ctx.fillStyle = 'rgba(0, 255, 65, 0.45)';
  ctx.fillText(altFt.toLocaleString() + ' ft  //  ' + Math.round(gsKnots) + ' kts', planeX + 20, planeY + 6);
  ctx.fillText('HDG ' + Math.round(heading).toString().padStart(3, '0') + '\u00B0', planeX + 20, planeY + 17);
  ctx.restore();

  // --- Altitude ladder (right side) ---
  ctx.save();
  ctx.font = '8px Courier New';
  ctx.textAlign = 'right';
  const ladderX = W - 12;
  // Determine nice tick marks
  const ticks = [];
  if (altFt > 0) {
    const step = altFt > 30000 ? 10000 : altFt > 10000 ? 5000 : altFt > 3000 ? 2000 : 1000;
    for (let ft = 0; ft <= maxDisplayAlt && ft <= altFt * 1.3; ft += step) {
      ticks.push(ft);
    }
    if (!ticks.includes(altFt)) ticks.push(altFt);
  }
  for (const ft of ticks) {
    const frac = Math.min(ft / maxDisplayAlt, 1);
    const y = groundY - frac * altRange;
    const isPlaneAlt = ft === altFt;
    ctx.fillStyle = isPlaneAlt ? 'rgba(0, 255, 65, 0.8)' : 'rgba(0, 255, 65, 0.2)';
    ctx.fillText((ft / 1000).toFixed(0) + 'k', ladderX, y + 3);
    ctx.fillStyle = isPlaneAlt ? 'rgba(0, 255, 65, 0.5)' : 'rgba(0, 255, 65, 0.1)';
    ctx.fillRect(ladderX - 28, y, 24, 0.5);
  }
  // Vertical ladder line
  ctx.strokeStyle = 'rgba(0, 255, 65, 0.08)';
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(ladderX - 28, groundY);
  ctx.lineTo(ladderX - 28, skyTop);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // --- Ground labels ---
  ctx.save();
  ctx.font = '8px Courier New';
  ctx.fillStyle = 'rgba(0, 255, 65, 0.3)';
  ctx.textAlign = 'center';
  ctx.fillText('GND', planeX, groundY + 14);
  const fpLabel = footprintKm < 1
    ? Math.round(footprintKm * 1000) + ' m'
    : Math.round(footprintKm * 10) / 10 + ' km';
  ctx.fillText('FPT: ' + fpLabel, planeX, groundY + 24);
  ctx.restore();

  // --- Coordinates (bottom-left) ---
  ctx.save();
  ctx.font = '8px Courier New';
  ctx.fillStyle = 'rgba(0, 255, 65, 0.3)';
  ctx.textAlign = 'left';
  ctx.fillText(posInfo.lat.toFixed(4) + '\u00B0 N  ' + posInfo.lon.toFixed(4) + '\u00B0 E', 8, H - 6);
  ctx.restore();

  // --- Scan line ---
  const scanY = (Date.now() / 30) % H;
  ctx.strokeStyle = 'rgba(0, 255, 65, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, scanY);
  ctx.lineTo(W, scanY);
  ctx.stroke();
}

// --- Self-register with view registry ---
registerView('plane', { open: openPlaneView, close: closePlaneView, isOpen: isPlaneViewOpen, resize: resizePlaneView });
