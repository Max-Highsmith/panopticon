/* ===================================================================
   PANOPTICON — View Base Module
   Shared utilities for all detail view panels (satellite, plane,
   site, airport, webcam). Eliminates duplication across view modules.
   =================================================================== */

// --- Extract { lon, lat, altM } from a Cesium entity ---
export function getEntityPosition(entity) {
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

// --- Create a stripped-down Cesium Viewer for detail panels ---
export function createDetailViewer(containerId) {
  const viewer = new Cesium.Viewer(containerId, {
    geocoder: false, homeButton: false, sceneModePicker: false,
    baseLayerPicker: false, navigationHelpButton: false,
    animation: false, timeline: false, fullscreenButton: false,
    selectionIndicator: false, infoBox: false, scene3DOnly: true,
    imageryProvider: false,
    msaaSamples: 4,
  });
  viewer.scene.backgroundColor = Cesium.Color.BLACK;
  viewer.scene.postProcessStages.fxaa.enabled = true;
  viewer.resolutionScale = window.devicePixelRatio || 1;
  viewer.imageryLayers.addImageryProvider(
    new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })
  );
  (async () => {
    try {
      const tileset = await Cesium.createGooglePhotorealistic3DTileset();
      viewer.scene.primitives.add(tileset);
      viewer.scene.globe.show = false;
    } catch {
      console.log(`${containerId}: Google 3D Tiles not available, using OSM.`);
    }
  })();
  return viewer;
}

// --- Animation loop helper ---
// Returns { stop() } handle. Call stop() to cancel.
export function startAnimLoop(renderFn) {
  let id = null;
  function loop() {
    id = requestAnimationFrame(loop);
    renderFn();
  }
  loop();
  return {
    stop() {
      if (id) { cancelAnimationFrame(id); id = null; }
    },
  };
}

// --- HUD overlay: vignette + scanlines + corner brackets + moving scan line ---
// Draws the shared HUD chrome used by plane, site, and airport overlays.
// Call this first, then draw view-specific content (readouts, reticle) on top.
export function drawHudOverlay(ctx, W, H, hudColor, opts = {}) {
  const tintColor = opts.tintColor || null;
  const vigInner = opts.vigInner || 0;
  const vigOuter = opts.vigOuter || 0.4;

  // Optional tint
  if (tintColor) {
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, W, H);
  }

  // Vignette
  const vigGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(0.7, `rgba(0,0,0,${0.1 + vigInner})`);
  vigGrad.addColorStop(1, `rgba(0,0,0,${vigOuter})`);
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, W, H);

  // Scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  // Moving scan line
  const scanSpeed = opts.scanSpeed || 25;
  const scanY = (Date.now() / scanSpeed) % H;
  const scanGrad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
  scanGrad.addColorStop(0, hudColor + '0)');
  scanGrad.addColorStop(0.5, hudColor + '0.04)');
  scanGrad.addColorStop(1, hudColor + '0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 15, W, 30);

  // Corner brackets
  const bracketLen = 30, bracketInset = 20;
  ctx.strokeStyle = hudColor + '0.35)';
  ctx.lineWidth = 1.5;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(bracketInset, bracketInset + bracketLen);
  ctx.lineTo(bracketInset, bracketInset);
  ctx.lineTo(bracketInset + bracketLen, bracketInset);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(W - bracketInset - bracketLen, bracketInset);
  ctx.lineTo(W - bracketInset, bracketInset);
  ctx.lineTo(W - bracketInset, bracketInset + bracketLen);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(bracketInset, H - bracketInset - bracketLen);
  ctx.lineTo(bracketInset, H - bracketInset);
  ctx.lineTo(bracketInset + bracketLen, H - bracketInset);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(W - bracketInset - bracketLen, H - bracketInset);
  ctx.lineTo(W - bracketInset, H - bracketInset);
  ctx.lineTo(W - bracketInset, H - bracketInset - bracketLen);
  ctx.stroke();
}

// --- Geometric line-of-sight footprint radius (km) from altitude (m) ---
export function computeFootprintKm(altM) {
  const R = 6371;
  const altKm = altM / 1000;
  if (altKm <= 0) return 0;
  const angularRadius = Math.acos(R / (R + altKm));
  return R * angularRadius;
}

// --- Compute circle positions on globe for footprint visualization ---
export function computeCirclePositions(lon, lat, radiusDeg, numPts) {
  const cosLat = Math.cos(Cesium.Math.toRadians(lat));
  const pts = [];
  for (let i = 0; i <= numPts; i++) {
    const ang = (i / numPts) * 2 * Math.PI;
    pts.push(lon + (radiusDeg * Math.cos(ang)) / cosLat, lat + radiusDeg * Math.sin(ang));
  }
  return Cesium.Cartesian3.fromDegreesArray(pts);
}

// --- Seeded PRNG ---
export function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

export function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// --- Metadata extraction from "operator // country // notes" desc format ---
export function extractOperator(desc) {
  if (!desc) return '---';
  return desc.split(' // ')[0]?.trim() || '---';
}

export function extractCountry(desc) {
  if (!desc) return '---';
  return desc.split(' // ')[1]?.trim() || '---';
}

export function extractNotes(desc) {
  if (!desc) return '---';
  return desc.split(' // ').slice(2).join(' // ').trim() || '---';
}

// --- DPR-aware canvas setup for overlay canvases ---
// Returns { ctx, W, H } where W,H are CSS pixel dimensions.
// The canvas internal resolution is scaled by devicePixelRatio.
export function setupOverlayCanvas(canvas) {
  if (!canvas) return null;
  const parent = canvas.parentElement;
  if (!parent) return null;
  const rect = parent.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const pxW = Math.round(rect.width * dpr);
  const pxH = Math.round(rect.height * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W: rect.width, H: rect.height };
}
