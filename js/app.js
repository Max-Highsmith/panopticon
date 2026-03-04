/* ===================================================================
   PANOPTICON — Main Application Entry Point
   =================================================================== */

import { SCENARIOS, CITIES, REPLAY_SPEEDS, DEFAULT_SPEED_INDEX } from './config.js';
import { formatAlt, formatSpd, formatHdg, secsToUTC, secsToLocal, replayAbsDate, interpolateTrace, $ } from './utils.js';
import { icons } from './icons.js';
import { createViewer, layers, entityMaps, toggleLayer, clearLayer, clearAllLayers } from './globe.js';
import { setVisualFilter, initFilterUpdater } from './filters.js';
import { initAudioPlayer, toggleAudio } from './audio.js';
import { startMilitary, stopMilitary, extrapolateMilitaryPositions } from './layers/military.js';
import { startCommercial, stopCommercial } from './layers/commercial.js';
import { loadSatellites, isSatLoaded, getSatRecords, createSatelliteEntities, updateSatellitePositions } from './layers/satellites.js';
import { startAIS, stopAIS } from './layers/ships.js';
import { fetchPogoStops, isPogoLoaded, resetPogo } from './layers/pogo.js';
import { createBlackoutOverlays, removeBlackoutOverlays, createDataBoundsOverlay, removeDataBoundsOverlay } from './overlays.js';
import { openSatView, closeSatView, isSatViewOpen } from './satview.js';

// --- Globe ---
const viewer = createViewer('cesiumContainer');
viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(53, 32, 5_000_000) });

// --- Filter System ---
initFilterUpdater(viewer);

// --- Audio ---
initAudioPlayer();

// --- State ---
let currentMode = 'replay';
let activeScenario = 'iran';

// Replay state
let replayData = null;
let replayTime = 0;
let replayPlaying = false;
let replaySpeed = REPLAY_SPEEDS[DEFAULT_SPEED_INDEX];
let replayLastFrame = 0;
let replayRenderHandler = null;
let speedIdx = DEFAULT_SPEED_INDEX;
let liveExtrapolateHandler = null;

const replayEntities = entityMaps.replay;

// Pre-allocated color constants (avoid per-frame allocation)
const COLOR_MIL      = Cesium.Color.fromCssColorString('#00ff41');
const COLOR_CIV      = Cesium.Color.fromCssColorString('#4488ff');
const COLOR_MIL_TRAIL = COLOR_MIL.withAlpha(0.4);
const COLOR_CIV_TRAIL = COLOR_CIV.withAlpha(0.4);

// Reusable set to avoid allocation every frame
const _seenHexes = new Set();

// =====================================================
// EXPOSE GLOBALS (for inline onclick handlers in HTML)
// =====================================================
window.switchMode     = switchMode;
window.toggleLayer    = (layer) => toggleLayer(viewer, layer, currentMode);
window.setVisualFilter = (f) => setVisualFilter(f, viewer);
window.flyToCity       = flyToCity;
window.selectScenario  = selectScenario;
window.togglePlay      = togglePlay;
window.changeSpeed     = changeSpeed;
window.toggleAudio     = toggleAudio;
window.closeSatView    = () => closeSatView(viewer);

// =====================================================
// CITY JUMP
// =====================================================
function flyToCity(key) {
  const c = CITIES[key];
  if (!c) return;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(c.lon, c.lat, c.alt),
    duration: 1.5,
  });
}

// =====================================================
// LIVE MODE
// =====================================================
function startLive() {
  clearAllLayers(viewer, () => removeDataBoundsOverlay(viewer));
  $('subtitle').textContent = 'LIVE TRACKING // ADS-B + OPENSKY + CELESTRAK + AIS + POGO';
  $('layer-toggles').style.display = 'flex';

  startMilitary(viewer);
  startCommercial(viewer);

  if (!isSatLoaded()) loadSatellites().then(() => createSatelliteEntities(viewer, activeScenario));
  else createSatelliteEntities(viewer, activeScenario);

  startAIS(viewer);
  fetchPogoStops(viewer);

  liveExtrapolateHandler = () => {
    extrapolateMilitaryPositions();
    updateSatellitePositions(viewer, activeScenario);
  };
  viewer.scene.preRender.addEventListener(liveExtrapolateHandler);
}

function stopLive() {
  stopMilitary();
  stopCommercial();
  if (liveExtrapolateHandler) {
    viewer.scene.preRender.removeEventListener(liveExtrapolateHandler);
    liveExtrapolateHandler = null;
  }
  stopAIS(viewer);
  resetPogo();
}

// =====================================================
// SCENARIO SELECTION
// =====================================================
function selectScenario(id) {
  if (!SCENARIOS[id]) return;
  if (isSatViewOpen()) closeSatView(viewer);
  activeScenario = id;

  document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('active'));
  document.getElementById('sc-' + id).classList.add('active');

  replayData = null;
  replayTime = 0;
  replayPlaying = false;
  $('btn-play').textContent = 'PLAY';

  const sc = SCENARIOS[id];
  $('subtitle').textContent = sc.subtitle;
  $('updated').textContent = sc.dateLabel;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(sc.camera.lon, sc.camera.lat, sc.camera.alt),
    duration: 1.5,
  });

  if (currentMode === 'replay') {
    stopReplay();
    startReplay();
  }
}

// =====================================================
// REPLAY MODE
// =====================================================
async function loadReplayData() {
  if (replayData) return;
  const sc = SCENARIOS[activeScenario];
  if (!sc) return;
  const res = await fetch(sc.file);
  replayData = await res.json();
  $('timeline-slider').max = replayData.time_end_utc - replayData.time_start_utc;
  document.querySelector('#timeline-controls span:last-child').textContent = sc.timeLabel;
}

function renderReplayFrame() {
  if (!replayData) return;
  const absTime = replayData.time_start_utc + replayTime;

  $('time-current').textContent = secsToUTC(absTime);
  $('time-irst').textContent = secsToLocal(absTime, activeScenario);

  _seenHexes.clear();
  let visibleCount = 0;

  for (const ac of replayData.aircraft) {
    if (ac.trace.length === 0) continue;
    if (absTime < ac.trace[0].t - 30 || absTime > ac.trace[ac.trace.length - 1].t + 30) continue;

    const pt = interpolateTrace(ac.trace, absTime);
    if (!pt || isNaN(pt.lat) || isNaN(pt.lon)) continue;

    _seenHexes.add(ac.hex);
    visibleCount++;

    const rawAlt = pt.alt === 'ground' ? 100 : (typeof pt.alt === 'number' && !isNaN(pt.alt) ? pt.alt : 10000);
    const altMeters = rawAlt * 0.3048;
    const position = Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, altMeters);
    const isMil = ac.mil;

    if (replayEntities.has(ac.hex)) {
      const record = replayEntities.get(ac.hex);
      record.entity.position = position;
      if (pt.track != null) record.entity.billboard.rotation = -Cesium.Math.toRadians(pt.track);

      // Append to trail coords buffer directly (flat array: lon, lat, alt, ...)
      const buf = record.trailCoords;
      buf.push(pt.lon, pt.lat, altMeters);
      // Cap at 200 points (600 floats)
      if (buf.length > 600) buf.splice(0, 3);
      if (buf.length >= 6) {
        record.trailEntity.polyline.positions = Cesium.Cartesian3.fromDegreesArrayHeights(buf);
      }
    } else {
      const heading = pt.track != null ? Cesium.Math.toRadians(pt.track) : 0;
      const color = isMil ? COLOR_MIL : COLOR_CIV;
      const entity = viewer.entities.add({
        position,
        billboard: { image: isMil ? icons.planeGreen : icons.planeBlue, width: 42, height: 42, rotation: -heading, alignedAxis: Cesium.Cartesian3.ZERO, disableDepthTestDistance: 0 },
        label: { text: ac.r || ac.hex, font: '11px Courier New', fillColor: color, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(16, -4), disableDepthTestDistance: 0, distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8_000_000), scale: 0.9 },
      });
      entity.acData = { hex: ac.hex, r: ac.r, t: ac.t, flight: ac.r, alt_baro: pt.alt, gs: pt.gs, track: pt.track, desc: ac.desc, mil: isMil };
      const layerVisible = isMil ? layers.military : layers.commercial;
      entity.show = layerVisible;
      const trailEntity = viewer.entities.add({
        polyline: { positions: [position], width: 1.5, material: (isMil ? COLOR_MIL_TRAIL : COLOR_CIV_TRAIL), clampToGround: false },
      });
      trailEntity.show = layerVisible;
      replayEntities.set(ac.hex, { entity, trailEntity, trailCoords: [pt.lon, pt.lat, altMeters] });
    }
  }

  // Remove entities no longer visible
  for (const [hex, record] of replayEntities) {
    if (!_seenHexes.has(hex)) {
      viewer.entities.remove(record.entity);
      if (record.trailEntity) viewer.entities.remove(record.trailEntity);
      replayEntities.delete(hex);
    }
  }

  $('mil-count').textContent = visibleCount;
}

function replayTick() {
  if (!replayPlaying || !replayData) return;
  const now = performance.now();
  const dt = (now - replayLastFrame) / 1000;
  replayLastFrame = now;
  replayTime += dt * replaySpeed;

  const maxTime = replayData.time_end_utc - replayData.time_start_utc;
  if (replayTime > maxTime) {
    replayTime = maxTime;
    replayPlaying = false;
    $('btn-play').textContent = 'PLAY';
  }

  $('timeline-slider').value = replayTime;
  renderReplayFrame();
}

function startReplay() {
  clearAllLayers(viewer, () => removeDataBoundsOverlay(viewer));
  const sc = SCENARIOS[activeScenario];
  $('subtitle').textContent = sc ? sc.subtitle : 'HISTORICAL REPLAY';
  $('timeline-bar').style.display = 'block';
  $('layer-toggles').style.display = 'flex';
  $('scenario-sidebar').style.display = 'block';

  createBlackoutOverlays(viewer, sc);
  createDataBoundsOverlay(viewer, sc);

  if (sc) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(sc.camera.lon, sc.camera.lat, sc.camera.alt),
      duration: 1.5,
    });
  }

  // Load satellites at the scenario's historical date
  const initSats = () => {
    if (sc && isSatLoaded()) {
      createSatelliteEntities(viewer, activeScenario, replayAbsDate(sc.date, sc.timeStartUTC));
    }
  };
  if (!isSatLoaded()) loadSatellites().then(initSats);
  else initSats();
  $('sat-count').textContent = isSatLoaded() ? getSatRecords().length : '...';

  loadReplayData().then(() => {
    replayTime = 0;
    replayPlaying = true;
    replayLastFrame = performance.now();
    $('btn-play').textContent = 'PAUSE';
    $('speed-label').textContent = replaySpeed + 'x';
    renderReplayFrame();

    replayRenderHandler = () => {
      replayTick();
      if (sc) {
        const absTimeSecs = (replayData ? replayData.time_start_utc : sc.timeStartUTC) + replayTime;
        updateSatellitePositions(viewer, activeScenario, replayAbsDate(sc.date, absTimeSecs));
      }
    };
    viewer.scene.preRender.addEventListener(replayRenderHandler);
  });
}

function stopReplay() {
  replayPlaying = false;
  $('timeline-bar').style.display = 'none';
  $('scenario-sidebar').style.display = 'none';
  removeBlackoutOverlays(viewer);
  if (replayRenderHandler) {
    viewer.scene.preRender.removeEventListener(replayRenderHandler);
    replayRenderHandler = null;
  }
}

function togglePlay() {
  replayPlaying = !replayPlaying;
  $('btn-play').textContent = replayPlaying ? 'PAUSE' : 'PLAY';
  replayLastFrame = performance.now();
}

function changeSpeed() {
  speedIdx = (speedIdx + 1) % REPLAY_SPEEDS.length;
  replaySpeed = REPLAY_SPEEDS[speedIdx];
  $('speed-label').textContent = replaySpeed + 'x';
}

$('timeline-slider').addEventListener('input', (e) => {
  replayTime = Number(e.target.value);
  for (const [, record] of replayEntities) {
    record.trailCoords.length = 0;
  }
  renderReplayFrame();
});

// =====================================================
// MODE SWITCHING
// =====================================================
function switchMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;

  $('btn-live').classList.toggle('active', mode === 'live');
  $('btn-replay').classList.toggle('active', mode === 'replay');
  $('info-panel').style.display = 'none';
  if (isSatViewOpen()) closeSatView(viewer);

  if (mode === 'live') {
    stopReplay();
    startLive();
    $('updated').textContent = '---';
    $('civ-count').textContent = '---';
    $('sat-count').textContent = isSatLoaded() ? entityMaps.satellites.size : '---';
    $('ship-count').textContent = '---';
    $('pogo-count').textContent = isPogoLoaded() ? entityMaps.pokemon.size : '---';
  } else {
    stopLive();
    const sc = SCENARIOS[activeScenario];
    $('updated').textContent = sc ? sc.dateLabel : '---';
    $('civ-count').textContent = '---';
    $('sat-count').textContent = '---';
    $('ship-count').textContent = '---';
    $('pogo-count').textContent = '---';
    startReplay();
  }
}

// =====================================================
// CLICK INTERACTION
// =====================================================
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
const infoPanel = $('info-panel');

handler.setInputAction((click) => {
  const picked = viewer.scene.pick(click.position);
  if (Cesium.defined(picked) && picked.id && picked.id.acData) {
    const ac = picked.id.acData;
    $('info-callsign').textContent = (ac.flight || ac.r || '---').trim();
    $('info-hex').textContent = ac.hex || '---';
    $('info-type').textContent = ac.desc || ac.t || '---';
    $('info-reg').textContent = ac.r || '---';
    $('info-alt').textContent = formatAlt(ac.alt_baro);
    $('info-spd').textContent = formatSpd(ac.gs);
    $('info-hdg').textContent = formatHdg(ac.track);
    $('info-squawk').textContent = ac.squawk || '---';
    infoPanel.style.display = 'block';

    if (ac.t === 'SATELLITE') {
      openSatView(viewer, ac.hex);
    } else if (isSatViewOpen()) {
      closeSatView(viewer);
    }
  } else {
    infoPanel.style.display = 'none';
    if (isSatViewOpen()) closeSatView(viewer);
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// =====================================================
// BOOT — Start in Replay Mode (Iran Scenario)
// =====================================================
$('btn-live').classList.remove('active');
$('btn-replay').classList.add('active');
startReplay();
