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
import { fetchMines, isMinesLoaded, resetMines, MINES_FLY_TO } from './layers/mines.js';
import { fetchInfra, isInfraLoaded, resetInfra, INFRA_FLY_TO } from './layers/infrastructure.js';
import { fetchAirports, isAirportsLoaded, resetAirports } from './layers/airports.js';
import { loadCustomDatasets } from './layers/custom.js';
import { createBlackoutOverlays, removeBlackoutOverlays, createDataBoundsOverlay, removeDataBoundsOverlay } from './overlays.js';
import { openSatView, closeSatView, isSatViewOpen, resizeSatView } from './satview.js';
import { openPlaneView, closePlaneView, isPlaneViewOpen, resizePlaneView } from './planeview.js';
import { openSiteView, closeSiteView, isSiteViewOpen, resizeSiteView } from './siteview.js';

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
window.toggleLayer    = (layer) => {
  toggleLayer(viewer, layer, currentMode);
  if (layer === 'mines' && !layers[layer]) {
    $('mines-legend').style.display = 'none';
  }
  // Lazy-start deferred layers when user enables them
  if (layers[layer]) {
    if (layer === 'ships' && currentMode === 'live' && entityMaps.ships.size === 0) startAIS(viewer);
    if (layer === 'pokemon' && currentMode === 'live' && entityMaps.pokemon.size === 0) fetchPogoStops(viewer);
    if (layer === 'mines') {
      if (entityMaps.mines.size === 0) fetchMines(viewer);
      viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(MINES_FLY_TO.lon, MINES_FLY_TO.lat, MINES_FLY_TO.alt), duration: 1.5 });
      $('mines-legend').style.display = 'block';
    }
    if (layer === 'infra') {
      if (entityMaps.infra.size === 0) fetchInfra(viewer);
      viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(INFRA_FLY_TO.lon, INFRA_FLY_TO.lat, INFRA_FLY_TO.alt), duration: 1.5 });
    }
    if (layer === 'airports' && entityMaps.airports.size === 0) fetchAirports(viewer);
  }
};
window.setVisualFilter = (f) => setVisualFilter(f, viewer);
window.flyToCity       = flyToCity;
window.selectScenario  = selectScenario;
window.togglePlay      = togglePlay;
window.changeSpeed     = changeSpeed;
window.toggleAudio     = toggleAudio;
window.closeSatView    = () => closeSatView(viewer);
window.closePlaneView  = () => closePlaneView(viewer);
window.closeSiteView   = () => closeSiteView(viewer);

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

  // Priority order: satellites → military → commercial
  if (!isSatLoaded()) loadSatellites().then(() => createSatelliteEntities(viewer, activeScenario));
  else createSatelliteEntities(viewer, activeScenario);

  startMilitary(viewer);
  startCommercial(viewer);

  // Ships and POGO are off by default — only start if user has toggled them on
  if (layers.ships) startAIS(viewer);
  if (layers.pokemon) fetchPogoStops(viewer);

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
  resetAirports();
}

// =====================================================
// SCENARIO SELECTION
// =====================================================
function selectScenario(id) {
  if (!SCENARIOS[id]) return;
  if (isSatViewOpen()) closeSatView(viewer);
  if (isPlaneViewOpen()) closePlaneView(viewer);
  if (isSiteViewOpen()) closeSiteView(viewer);
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

    const rawAlt = pt.alt === 'ground' ? 100 : (typeof pt.alt === 'number' && !isNaN(pt.alt) ? pt.alt : 10000);
    const altMeters = rawAlt * 0.3048;

    // Skip parked/taxiing aircraft (on ground or very low & slow)
    if (pt.alt === 'ground' || (altMeters < 50 && (!pt.gs || pt.gs < 5))) continue;

    _seenHexes.add(ac.hex);
    visibleCount++;
    const position = Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, altMeters);
    const isMil = ac.mil;

    if (replayEntities.has(ac.hex)) {
      const record = replayEntities.get(ac.hex);
      record.entity.position = position;
      if (pt.track != null) record.entity.billboard.rotation = -Cesium.Math.toRadians(pt.track);
      // Keep acData in sync so plane view reads current values
      const acd = record.entity.acData;
      if (acd) { acd.alt_baro = pt.alt; acd.gs = pt.gs; acd.track = pt.track; acd.lat = pt.lat; acd.lon = pt.lon; }

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
  if (isPlaneViewOpen()) closePlaneView(viewer);
  if (isSiteViewOpen()) closeSiteView(viewer);

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
// CLICK INTERACTION — Selection Reticle
// =====================================================
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
const infoPanel = $('info-panel');
let selectedEntity = null;

// Persistent reticle overlay that tracks the selected entity
const reticleEntity = viewer.entities.add({
  position: Cesium.Cartesian3.ZERO,
  billboard: {
    image: icons.reticle,
    width: 64,
    height: 64,
    alignedAxis: Cesium.Cartesian3.ZERO,
    disableDepthTestDistance: 0,
    color: Cesium.Color.WHITE,
  },
  show: false,
});

// Follow selected entity + pulse each frame
viewer.scene.preRender.addEventListener(() => {
  if (!selectedEntity || !reticleEntity.show) return;
  let pos = selectedEntity.position;
  if (!pos) { reticleEntity.show = false; return; }
  if (typeof pos.getValue === 'function') pos = pos.getValue(Cesium.JulianDate.now());
  if (!pos) { reticleEntity.show = false; return; }
  reticleEntity.position = pos;
  const pulse = 1.0 + 0.12 * Math.sin(Date.now() / 150);
  const baseW = selectedEntity.billboard?.width?._value ?? selectedEntity.billboard?.width ?? 42;
  const baseSize = Math.max(baseW * 1.8, 56);
  reticleEntity.billboard.width = baseSize * pulse;
  reticleEntity.billboard.height = baseSize * pulse;
});

function deselectEntity() {
  if (!selectedEntity) return;
  selectedEntity = null;
  reticleEntity.show = false;
}

function selectEntity(entity) {
  if (selectedEntity === entity) return;
  deselectEntity();
  if (!entity || !entity.billboard) return;
  selectedEntity = entity;
  reticleEntity.show = true;
}

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

    selectEntity(picked.id);

    const SITE_TYPES = new Set(['COBALT MINE', 'LITHIUM MINE', 'BITCOIN MINE', 'DATACENTER', 'NUCLEAR TEST SITE']);

    if (ac.t === 'SATELLITE') {
      if (isPlaneViewOpen()) closePlaneView(viewer);
      if (isSiteViewOpen()) closeSiteView(viewer);
      openSatView(viewer, ac.hex);
    } else if (SITE_TYPES.has(ac.t)) {
      if (isSatViewOpen()) closeSatView(viewer);
      if (isPlaneViewOpen()) closePlaneView(viewer);
      if (isSiteViewOpen()) closeSiteView(viewer);
      openSiteView(viewer, picked.id);
    } else if (ac.t === 'MAJOR AIRPORT' || ac.t === 'AIRPORT') {
      if (isSatViewOpen()) closeSatView(viewer);
      if (isPlaneViewOpen()) closePlaneView(viewer);
      if (isSiteViewOpen()) closeSiteView(viewer);
    } else {
      if (isSatViewOpen()) closeSatView(viewer);
      if (isSiteViewOpen()) closeSiteView(viewer);
      openPlaneView(viewer, picked.id);
    }
  } else {
    deselectEntity();
    infoPanel.style.display = 'none';
    if (isSatViewOpen()) closeSatView(viewer);
    if (isPlaneViewOpen()) closePlaneView(viewer);
    if (isSiteViewOpen()) closeSiteView(viewer);
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// =====================================================
// PANEL RESIZE — Drag the left edge of any detail panel
// =====================================================
{
  let resizeRAF = null;
  const scheduleResize = () => {
    if (resizeRAF) return;
    resizeRAF = requestAnimationFrame(() => {
      viewer.resize();
      resizeSatView();
      resizePlaneView();
      resizeSiteView();
      resizeRAF = null;
    });
  };

  document.querySelectorAll('.panel-resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.body.classList.add('resizing');

      const onMove = (ev) => {
        const width = window.innerWidth - ev.clientX;
        const clamped = Math.max(250, Math.min(width, window.innerWidth * 0.8));
        document.documentElement.style.setProperty('--panel-width', clamped + 'px');
        scheduleResize();
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.classList.remove('resizing');
        viewer.resize();
        resizeSatView();
        resizePlaneView();
        resizeSiteView();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

// =====================================================
// BOOT — Register Custom Datasets & Start in Replay Mode
// =====================================================
loadCustomDatasets(viewer);

$('btn-live').classList.remove('active');
$('btn-replay').classList.add('active');
startReplay();
