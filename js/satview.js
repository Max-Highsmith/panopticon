/* ===================================================================
   PANOPTICON — Satellite Aerial View (second Cesium viewer + Canvas)
   =================================================================== */

import { entityMaps } from './globe.js';
import { $ } from './utils.js';
import { drawEarthGlobe } from './earthmap.js';
import { createDetailViewer, computeFootprintKm, computeCirclePositions } from './viewbase.js';
import { registerView } from './viewregistry.js';

const satEntities = entityMaps.satellites;
let satViewer = null;
let satViewOpen = false;
let satViewTarget = null;
let satViewUpdateHandler = null;
let satViewFootprintEntities = [];
let frameCounter = 0;

export function isSatViewOpen() { return satViewOpen; }
export function resizeSatView() { if (satViewer) satViewer.resize(); }

function initSatViewer() {
  if (satViewer) return;
  satViewer = createDetailViewer('sat-view-container');
}

// --- Open / Close ---

export function openSatView(viewer, entityOrId) {
  // Accept either a Cesium entity (from click dispatch) or a NORAD ID string (legacy)
  let noradId;
  if (typeof entityOrId === 'string') {
    noradId = entityOrId;
  } else if (entityOrId && entityOrId.acData) {
    noradId = entityOrId.acData.hex;
  } else {
    return;
  }
  const record = satEntities.get(noradId);
  if (!record) return;

  initSatViewer();
  satViewTarget = noradId;
  satViewOpen = true;
  $('sat-view-panel').classList.add('open');
  document.body.classList.add('sat-panel-open');

  $('sv-sat-name').textContent = record.name;
  $('sv-norad').textContent = noradId;
  updateSatViewCamera(record);

  if (satViewUpdateHandler) viewer.scene.preRender.removeEventListener(satViewUpdateHandler);
  satViewUpdateHandler = () => {
    if (!satViewOpen || !satViewTarget) return;
    const rec = satEntities.get(satViewTarget);
    if (rec) updateSatViewCamera(rec);
  };
  viewer.scene.preRender.addEventListener(satViewUpdateHandler);

  setTimeout(() => {
    viewer.resize();
    if (satViewer) satViewer.resize();
    renderSatHorizonView(record);
  }, 400);
}

export function closeSatView(viewer) {
  satViewOpen = false;
  satViewTarget = null;
  $('sat-view-panel').classList.remove('open');
  document.body.classList.remove('sat-panel-open');

  if (satViewUpdateHandler) {
    viewer.scene.preRender.removeEventListener(satViewUpdateHandler);
    satViewUpdateHandler = null;
  }

  if (satViewer) {
    satViewFootprintEntities.forEach(e => satViewer.entities.remove(e));
    satViewFootprintEntities = [];
  }

  setTimeout(() => viewer.resize(), 400);
}

// --- Camera Updates ---

function updateSatViewCamera(record) {
  if (!satViewer || !record) return;

  const { lon, lat, altM } = record;
  const footprintRadiusKm = computeFootprintKm(altM);

  frameCounter++;
  if (frameCounter % 30 === 0) {
    $('sv-alt').textContent = Math.round(altM / 1000) + ' km';
    $('sv-lat').textContent = lat.toFixed(3) + '\u00B0';
    $('sv-lon').textContent = lon.toFixed(3) + '\u00B0';
    $('sv-footprint').textContent = Math.round(footprintRadiusKm) + ' km radius';
  }

  const viewAlt = Math.max(footprintRadiusKm * 2000, 50000);
  satViewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, viewAlt),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
  });

  if (satViewFootprintEntities.length === 0) {
    createSatViewFootprint(lon, lat, footprintRadiusKm);
  } else if (frameCounter % 60 === 0) {
    updateSatViewFootprintPositions(lon, lat, footprintRadiusKm);
  }

  if (frameCounter % 5 === 0) renderSatHorizonView(record);
}

// --- Footprint Visualization ---

function createSatViewFootprint(lon, lat, radiusKm) {
  const radiusDeg = radiusKm / 111.32;
  const cosLat = Math.cos(Cesium.Math.toRadians(lat));
  const crossLen = radiusDeg * 1.2;

  // Outer circle
  satViewFootprintEntities.push(satViewer.entities.add({
    polyline: { positions: computeCirclePositions(lon, lat, radiusDeg, 48), width: 2, material: Cesium.Color.fromCssColorString('#ffaa00').withAlpha(0.5), clampToGround: true },
  }));

  // Inner circle (dashed)
  satViewFootprintEntities.push(satViewer.entities.add({
    polyline: { positions: computeCirclePositions(lon, lat, radiusDeg * 0.5, 48), width: 1, material: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromCssColorString('#ffaa00').withAlpha(0.3), dashLength: 8 }), clampToGround: true },
  }));

  // Crosshair lines (horizontal, vertical)
  for (const cl of [
    [lon - crossLen / cosLat, lat, lon + crossLen / cosLat, lat],
    [lon, lat - crossLen, lon, lat + crossLen],
  ]) {
    satViewFootprintEntities.push(satViewer.entities.add({
      polyline: { positions: Cesium.Cartesian3.fromDegreesArray(cl), width: 1, material: Cesium.Color.fromCssColorString('#ffaa00').withAlpha(0.15), clampToGround: true },
    }));
  }

  // Nadir point
  satViewFootprintEntities.push(satViewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, 100),
    point: { pixelSize: 6, color: Cesium.Color.fromCssColorString('#ffaa00'), outlineColor: Cesium.Color.BLACK, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    label: { text: 'NADIR', font: '10px Courier New', fillColor: Cesium.Color.fromCssColorString('#ffaa00').withAlpha(0.7), outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -14), disableDepthTestDistance: Number.POSITIVE_INFINITY, horizontalOrigin: Cesium.HorizontalOrigin.CENTER },
  }));
}

function updateSatViewFootprintPositions(lon, lat, radiusKm) {
  const radiusDeg = radiusKm / 111.32;
  const cosLat = Math.cos(Cesium.Math.toRadians(lat));
  const crossLen = radiusDeg * 1.2;

  if (satViewFootprintEntities[0]) satViewFootprintEntities[0].polyline.positions = computeCirclePositions(lon, lat, radiusDeg, 48);
  if (satViewFootprintEntities[1]) satViewFootprintEntities[1].polyline.positions = computeCirclePositions(lon, lat, radiusDeg * 0.5, 48);
  if (satViewFootprintEntities[2]) satViewFootprintEntities[2].polyline.positions = Cesium.Cartesian3.fromDegreesArray([lon - crossLen / cosLat, lat, lon + crossLen / cosLat, lat]);
  if (satViewFootprintEntities[3]) satViewFootprintEntities[3].polyline.positions = Cesium.Cartesian3.fromDegreesArray([lon, lat - crossLen, lon, lat + crossLen]);
  if (satViewFootprintEntities[4]) satViewFootprintEntities[4].position = Cesium.Cartesian3.fromDegrees(lon, lat, 100);
}

// --- Orbital Profile Canvas Rendering (Earth Map + Scope of Sight) ---

function renderSatHorizonView(record) {
  const canvas = $('sat-horizon-canvas');
  if (!canvas) return;

  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  const R_EARTH = 6371;
  const altKm = (record.altM || 400000) / 1000;
  const footprintKm = computeFootprintKm(record.altM || 400000);
  const footprintAngle = footprintKm / R_EARTH;

  // Layout — globe in lower portion, satellite above
  const earthRadius = H * 0.35;
  const earthCenterX = W * 0.5;
  const earthCenterY = H * 0.66;
  const satScale = Math.min(altKm / 800, 1);
  const satY = 14 + satScale * 16;
  const satX = W * 0.5;
  const surfaceY = earthCenterY - earthRadius;

  // Stars
  ctx.save();
  const starSeed = Math.floor(record.lon * 10);
  for (let i = 0; i < 50; i++) {
    const sx = ((starSeed * 13 + i * 97) % 1000) / 1000 * W;
    const sy = ((starSeed * 7 + i * 53) % 1000) / 1000 * H;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + ((i * 37) % 100) / 250})`;
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.restore();

  // Draw Earth globe with orthographic map
  drawEarthGlobe(ctx, earthCenterX, earthCenterY, earthRadius, record.lon, record.lat, footprintAngle);

  // Viewing cone — scope-of-sight lines from satellite to footprint edges
  const fpPixelRadius = earthRadius * Math.sin(Math.min(footprintAngle, Math.PI / 3));
  const fpLeftX = earthCenterX - fpPixelRadius;
  const fpRightX = earthCenterX + fpPixelRadius;
  const fpTargetY = earthCenterY;

  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;

  // Left scope line
  let grad = ctx.createLinearGradient(satX, satY, fpLeftX, fpTargetY);
  grad.addColorStop(0, 'rgba(255, 170, 0, 0.6)');
  grad.addColorStop(1, 'rgba(255, 170, 0, 0.15)');
  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.moveTo(satX, satY);
  ctx.lineTo(fpLeftX, fpTargetY);
  ctx.stroke();

  // Right scope line
  grad = ctx.createLinearGradient(satX, satY, fpRightX, fpTargetY);
  grad.addColorStop(0, 'rgba(255, 170, 0, 0.6)');
  grad.addColorStop(1, 'rgba(255, 170, 0, 0.15)');
  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.moveTo(satX, satY);
  ctx.lineTo(fpRightX, fpTargetY);
  ctx.stroke();

  // Center nadir line (dashed)
  ctx.setLineDash([2, 6]);
  ctx.strokeStyle = 'rgba(255, 170, 0, 0.2)';
  ctx.beginPath();
  ctx.moveTo(satX, satY);
  ctx.lineTo(earthCenterX, earthCenterY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Satellite icon
  ctx.save();
  ctx.translate(satX, satY);
  const satGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
  satGlow.addColorStop(0, 'rgba(255, 170, 0, 0.25)');
  satGlow.addColorStop(1, 'rgba(255, 170, 0, 0)');
  ctx.fillStyle = satGlow;
  ctx.fillRect(-16, -16, 32, 32);
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.moveTo(0, -5); ctx.lineTo(4, 0); ctx.lineTo(0, 5); ctx.lineTo(-4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 170, 0, 0.6)';
  ctx.fillRect(-14, -1.5, 8, 3);
  ctx.fillRect(6, -1.5, 8, 3);
  ctx.strokeStyle = 'rgba(255, 170, 0, 0.3)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-10, -1.5); ctx.lineTo(-10, 1.5);
  ctx.moveTo(-7, -1.5);  ctx.lineTo(-7, 1.5);
  ctx.moveTo(9, -1.5);   ctx.lineTo(9, 1.5);
  ctx.moveTo(12, -1.5);  ctx.lineTo(12, 1.5);
  ctx.stroke();
  ctx.restore();

  // Labels
  ctx.save();
  ctx.font = '10px Courier New';
  ctx.fillStyle = 'rgba(255, 170, 0, 0.85)';
  ctx.textAlign = 'left';
  ctx.fillText(record.name || 'UNKNOWN', satX + 20, satY - 4);
  ctx.font = '9px Courier New';
  ctx.fillStyle = 'rgba(255, 170, 0, 0.45)';
  ctx.fillText(Math.round(altKm) + ' km ALT', satX + 20, satY + 8);
  ctx.restore();

  // Altitude scale (right side)
  ctx.save();
  ctx.font = '8px Courier New';
  ctx.textAlign = 'right';
  const scaleX = W - 10;
  ctx.fillStyle = 'rgba(255, 170, 0, 0.25)';
  ctx.fillText('0 km', scaleX, surfaceY + 3);
  ctx.fillStyle = 'rgba(255, 170, 0, 0.12)';
  ctx.fillRect(scaleX - 25, surfaceY, 30, 0.5);
  ctx.fillStyle = 'rgba(255, 170, 0, 0.25)';
  ctx.fillText(Math.round(altKm) + ' km', scaleX, satY + 3);
  ctx.fillStyle = 'rgba(255, 170, 0, 0.12)';
  ctx.fillRect(scaleX - 25, satY, 30, 0.5);
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = 'rgba(255, 170, 0, 0.08)';
  ctx.beginPath();
  ctx.moveTo(scaleX - 20, surfaceY);
  ctx.lineTo(scaleX - 20, satY);
  ctx.stroke();
  ctx.restore();

  // Footprint radius label
  ctx.save();
  ctx.font = '8px Courier New';
  ctx.fillStyle = 'rgba(255, 170, 0, 0.4)';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(footprintKm) + ' km', earthCenterX, earthCenterY + earthRadius + 14);
  ctx.restore();

  // Scan line animation
  ctx.save();
  const scanY = (Date.now() / 30) % H;
  ctx.strokeStyle = 'rgba(255, 170, 0, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, scanY);
  ctx.lineTo(W, scanY);
  ctx.stroke();
  ctx.restore();
}

// --- Self-register with view registry ---
registerView('satellite', { open: openSatView, close: closeSatView, isOpen: isSatViewOpen, resize: resizeSatView });
