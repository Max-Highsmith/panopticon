/* ===================================================================
   PANOPTICON — Path Detail View (second Cesium viewer + Canvas)
   Provides immersive route view for paths: cables, pipelines,
   shipping routes, migrations, etc.
   =================================================================== */

import { $ } from './utils.js';
import { createDetailViewer, startAnimLoop, drawHudOverlay, extractOperator, extractCountry, extractNotes, setupOverlayCanvas } from './viewbase.js';
import { registerView } from './viewregistry.js';

let pathViewer = null;
let pathViewOpen = false;
let pathViewTarget = null;
let overlayHandle = null;
let lastOverlayData = null;

export function isPathViewOpen() { return pathViewOpen; }
export function resizePathView() { if (pathViewer) pathViewer.resize(); }

const HUD_COLOR = 'rgba(0, 255, 160, ';
const HUD_ACCENT = '#00ffa0';
const BRACKET_INSET = 20;

// --- Second Cesium Viewer ---

function initPathViewer() {
  if (pathViewer) return;
  pathViewer = createDetailViewer('path-view-container');
  pathViewer.scene.screenSpaceCameraController.enableInputs = true;
}

// --- Extract midpoint position from a polyline entity ---

function getPathMidpoint(entity) {
  if (!entity || !entity.polyline) return null;
  let positions = entity.polyline.positions;
  if (!positions) return null;
  if (typeof positions.getValue === 'function') {
    positions = positions.getValue(Cesium.JulianDate.now());
  }
  if (!positions || positions.length === 0) return null;
  const midIdx = Math.floor(positions.length / 2);
  const carto = Cesium.Cartographic.fromCartesian(positions[midIdx]);
  return {
    lon: Cesium.Math.toDegrees(carto.longitude),
    lat: Cesium.Math.toDegrees(carto.latitude),
  };
}

// --- Extract all positions as lon/lat arrays ---

function getPathCoords(entity) {
  if (!entity || !entity.polyline) return [];
  let positions = entity.polyline.positions;
  if (!positions) return [];
  if (typeof positions.getValue === 'function') {
    positions = positions.getValue(Cesium.JulianDate.now());
  }
  if (!positions) return [];
  return positions.map(p => {
    const c = Cesium.Cartographic.fromCartesian(p);
    return [Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude)];
  });
}

// --- Compute approximate route length in km ---

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeLengthKm(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
  }
  return total;
}

// --- Set camera to frame the path ---

function setPathCamera(coords) {
  if (!pathViewer || coords.length === 0) return;
  // Compute bounding box
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const spanDeg = Math.max(maxLon - minLon, maxLat - minLat);
  // Altitude proportional to span
  const alt = Math.max(500_000, spanDeg * 80_000);

  pathViewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, alt),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
  });
}

// =====================================================
// HUD OVERLAY
// =====================================================

function renderPathOverlay() {
  const setup = setupOverlayCanvas($('path-view-overlay'));
  if (!setup) return;
  const { ctx, W, H } = setup;

  ctx.clearRect(0, 0, W, H);

  drawHudOverlay(ctx, W, H, HUD_COLOR, {
    tintColor: 'rgba(0, 10, 20, 0.08)',
    vigInner: 0,
    vigOuter: 0.4,
  });

  const d = lastOverlayData;
  if (!d) return;

  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  ctx.font = '10px Courier New';
  ctx.textBaseline = 'bottom';

  ctx.fillStyle = HUD_COLOR + '0.7)';
  ctx.textAlign = 'left';
  ctx.fillText('ROUTE: ' + (d.name || '---'), BRACKET_INSET + 2, BRACKET_INSET - 4);
  ctx.fillStyle = HUD_COLOR + '0.4)';
  ctx.fillText(d.type || 'UNKNOWN', BRACKET_INSET + 2, BRACKET_INSET - 16);

  ctx.textAlign = 'right';
  ctx.fillStyle = (Math.floor(Date.now() / 800) % 2 === 0) ? HUD_COLOR + '0.8)' : HUD_COLOR + '0.3)';
  ctx.fillText('ROUTE INTEL', W - BRACKET_INSET - 2, BRACKET_INSET - 4);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = HUD_COLOR + '0.65)';
  const bY = H - BRACKET_INSET + 6;
  ctx.fillText(timestamp, BRACKET_INSET + 2, bY);

  ctx.textAlign = 'right';
  if (d.lengthKm > 0) {
    ctx.fillText('LENGTH ' + Math.round(d.lengthKm).toLocaleString() + ' km', W - BRACKET_INSET - 2, bY);
  }
  if (d.midLat != null) {
    ctx.fillText('MID ' + d.midLat.toFixed(2) + '\u00B0, ' + d.midLon.toFixed(2) + '\u00B0', W - BRACKET_INSET - 2, bY + 13);
  }

  // Draw miniature route trace in center
  if (d.coords && d.coords.length > 1) {
    const margin = 60;
    const drawW = W - margin * 2;
    const drawH = H - margin * 2;
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lon, lat] of d.coords) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    const spanLon = maxLon - minLon || 1;
    const spanLat = maxLat - minLat || 1;
    const scale = Math.min(drawW / spanLon, drawH / spanLat);
    const offsetX = W / 2 - (spanLon * scale) / 2;
    const offsetY = H / 2 - (spanLat * scale) / 2;

    // Route shadow
    ctx.strokeStyle = HUD_COLOR + '0.08)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < d.coords.length; i++) {
      const x = offsetX + (d.coords[i][0] - minLon) * scale;
      const y = offsetY + (maxLat - d.coords[i][1]) * scale;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Route line
    ctx.strokeStyle = HUD_COLOR + '0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < d.coords.length; i++) {
      const x = offsetX + (d.coords[i][0] - minLon) * scale;
      const y = offsetY + (maxLat - d.coords[i][1]) * scale;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Waypoints
    for (let i = 0; i < d.coords.length; i++) {
      const x = offsetX + (d.coords[i][0] - minLon) * scale;
      const y = offsetY + (maxLat - d.coords[i][1]) * scale;
      const isEndpoint = i === 0 || i === d.coords.length - 1;
      ctx.fillStyle = isEndpoint ? HUD_COLOR + '0.8)' : HUD_COLOR + '0.3)';
      ctx.beginPath();
      ctx.arc(x, y, isEndpoint ? 4 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Animated pulse along route
    const t = (Date.now() / 4000) % 1;
    const segIdx = Math.floor(t * (d.coords.length - 1));
    const segFrac = (t * (d.coords.length - 1)) - segIdx;
    if (segIdx < d.coords.length - 1) {
      const ax = offsetX + (d.coords[segIdx][0] - minLon) * scale;
      const ay = offsetY + (maxLat - d.coords[segIdx][1]) * scale;
      const bx = offsetX + (d.coords[segIdx + 1][0] - minLon) * scale;
      const by = offsetY + (maxLat - d.coords[segIdx + 1][1]) * scale;
      const px = ax + (bx - ax) * segFrac;
      const py = ay + (by - ay) * segFrac;
      ctx.fillStyle = HUD_ACCENT;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      // Glow
      const glow = ctx.createRadialGradient(px, py, 0, px, py, 12);
      glow.addColorStop(0, HUD_COLOR + '0.3)');
      glow.addColorStop(1, HUD_COLOR + '0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// =====================================================
// PATH INFO CANVAS (top panel)
// =====================================================

function renderPathInfoCanvas() {
  const canvas = $('path-info-canvas');
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
  const ac = pathViewTarget?.acData;
  if (!ac) return;

  // --- Route profile visualization ---
  const profileW = Math.min(W * 0.45, H * 0.85);
  const profileH = profileW * 0.6;
  const profileX = 16;
  const profileY = (H - profileH) / 2;

  // Background grid
  ctx.fillStyle = HUD_COLOR + '0.03)';
  ctx.fillRect(profileX, profileY, profileW, profileH);
  ctx.strokeStyle = HUD_COLOR + '0.08)';
  ctx.lineWidth = 0.5;
  const cells = 8;
  for (let i = 0; i <= cells; i++) {
    const x = profileX + (profileW / cells) * i;
    const y = profileY + (profileH / cells) * i;
    ctx.beginPath(); ctx.moveTo(x, profileY); ctx.lineTo(x, profileY + profileH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(profileX, y); ctx.lineTo(profileX + profileW, y); ctx.stroke();
  }
  ctx.strokeStyle = HUD_COLOR + '0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(profileX, profileY, profileW, profileH);

  // Draw route in the profile box
  if (d.coords && d.coords.length > 1) {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lon, lat] of d.coords) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    const spanLon = maxLon - minLon || 1;
    const spanLat = maxLat - minLat || 1;
    const pad = 8;
    const dW = profileW - pad * 2;
    const dH = profileH - pad * 2;
    const scale = Math.min(dW / spanLon, dH / spanLat);
    const offX = profileX + pad + (dW - spanLon * scale) / 2;
    const offY = profileY + pad + (dH - spanLat * scale) / 2;

    // Route line
    ctx.strokeStyle = HUD_ACCENT;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < d.coords.length; i++) {
      const x = offX + (d.coords[i][0] - minLon) * scale;
      const y = offY + (maxLat - d.coords[i][1]) * scale;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Endpoints
    const startX = offX + (d.coords[0][0] - minLon) * scale;
    const startY = offY + (maxLat - d.coords[0][1]) * scale;
    const endX = offX + (d.coords[d.coords.length - 1][0] - minLon) * scale;
    const endY = offY + (maxLat - d.coords[d.coords.length - 1][1]) * scale;

    ctx.fillStyle = HUD_ACCENT;
    ctx.beginPath(); ctx.arc(startX, startY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(endX, endY, 4, 0, Math.PI * 2); ctx.fill();

    // Pulsing midpoint
    const midIdx = Math.floor(d.coords.length / 2);
    const midX = offX + (d.coords[midIdx][0] - minLon) * scale;
    const midY = offY + (maxLat - d.coords[midIdx][1]) * scale;
    const pulseR = 5 + Math.sin(Date.now() / 500) * 2;
    ctx.strokeStyle = HUD_COLOR + '0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(midX, midY, pulseR, 0, Math.PI * 2); ctx.stroke();

    // Waypoint count label
    ctx.font = '8px Courier New';
    ctx.fillStyle = HUD_COLOR + '0.5)';
    ctx.textAlign = 'center';
    ctx.fillText(d.coords.length + ' WAYPOINTS', profileX + profileW / 2, profileY + profileH + 10);
  }

  // --- Route dossier ---
  const textX = profileX + profileW + 24;
  const textY = profileY + 4;
  ctx.font = '9px Courier New';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const lines = [
    { label: 'NAME', value: (ac.flight || ac.r || '---').trim() },
    { label: 'TYPE', value: ac.t || '---' },
    { label: 'OPER', value: extractOperator(ac.desc) },
    { label: 'LOC ', value: extractCountry(ac.desc) },
    { label: 'NOTE', value: extractNotes(ac.desc) },
    { label: 'DIST', value: d.lengthKm > 0 ? Math.round(d.lengthKm).toLocaleString() + ' km' : '---' },
    { label: 'WPTS', value: d.coords ? d.coords.length.toString() : '---' },
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

export function openPathView(viewer, entity) {
  if (!entity || !entity.acData) return;

  initPathViewer();
  pathViewTarget = entity;
  pathViewOpen = true;

  const ac = entity.acData;

  $('path-view-panel').classList.add('open');
  document.body.classList.add('path-panel-open');

  $('ptv-path-name').textContent = (ac.flight || ac.r || '---').trim();
  $('ptv-type').textContent = ac.t || '---';
  $('ptv-operator').textContent = extractOperator(ac.desc);
  $('ptv-country').textContent = extractCountry(ac.desc);
  $('ptv-notes').textContent = extractNotes(ac.desc);

  const coords = getPathCoords(entity);
  const midpoint = getPathMidpoint(entity);
  const lengthKm = routeLengthKm(coords);

  $('ptv-length').textContent = lengthKm > 0 ? Math.round(lengthKm).toLocaleString() + ' km' : '---';

  if (midpoint) {
    $('ptv-mid').textContent = midpoint.lat.toFixed(2) + '\u00B0, ' + midpoint.lon.toFixed(2) + '\u00B0';
  }

  lastOverlayData = {
    name: (ac.flight || ac.r || '---').trim(),
    type: ac.t || 'UNKNOWN',
    coords,
    lengthKm,
    midLat: midpoint?.lat ?? null,
    midLon: midpoint?.lon ?? null,
  };

  overlayHandle = startAnimLoop(renderPathOverlay);

  setTimeout(() => {
    viewer.resize();
    if (pathViewer) pathViewer.resize();
    if (coords.length > 0) setPathCamera(coords);
    renderPathInfoCanvas();
  }, 400);
}

export function closePathView(viewer) {
  pathViewOpen = false;
  pathViewTarget = null;
  lastOverlayData = null;
  $('path-view-panel').classList.remove('open');
  document.body.classList.remove('path-panel-open');

  if (overlayHandle) { overlayHandle.stop(); overlayHandle = null; }

  setTimeout(() => viewer.resize(), 400);
}

// --- Self-register with view registry ---
registerView('path', { open: openPathView, close: closePathView, isOpen: isPathViewOpen, resize: resizePathView });
