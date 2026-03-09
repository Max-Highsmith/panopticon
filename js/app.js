/* ===================================================================
   PANOPTICON — Main Application Entry Point
   =================================================================== */

import { SCENARIOS } from './config.js';
import { formatAlt, formatSpd, formatHdg, replayAbsDate, $ } from './utils.js';
import { icons } from './icons.js';
import { createViewer, layers, entityMaps, toggleLayer, clearAllLayers } from './globe.js';
import {
  loadPlayback, startPlaying, togglePlayback, seekPlayback,
  cycleSpeed, getSpeed, stopPlayback, isPlaying, isLoaded,
  getManifest, getTimeSeconds,
} from './playback.js';
import { initLayerSelector, openLayerPanel, refreshCatalog } from './layerselector.js';
import { getCatalogByKey } from './layercatalog.js';
import { initCitySelector, openCityPanel } from './cityselector.js';
import { getCityByKey } from './citycatalog.js';
import { setVisualFilter, initFilterUpdater, openFilterPanel, showCountryPanel, closeCountryPanel } from './filters.js';
import { initAudioPlayer, toggleAudio } from './audio.js';
import { startMilitary, stopMilitary, extrapolateMilitaryPositions } from './layers/military.js';
import { startCommercial, stopCommercial } from './layers/commercial.js';
import { loadSatellites, isSatLoaded, getSatRecords, createSatelliteEntities, updateSatellitePositions } from './layers/satellites.js';
import { startAIS, stopAIS } from './layers/ships.js';
import { fetchPogoStops, isPogoLoaded, resetPogo } from './layers/pogo.js';
import { loadCustomDatasets } from './layers/custom.js';
import { createBlackoutOverlays, removeBlackoutOverlays, createDataBoundsOverlay, removeDataBoundsOverlay } from './overlays.js';
import { closeAllViews, resizeAllViews, getView, tickAllViews } from './viewregistry.js';
// View modules imported for side-effect registration:
import './satview.js';
import './planeview.js';
import './siteview.js';
import './airportview.js';
import './webcamview.js';
import './pathview.js';
import './submarineview.js';
import './sniperview.js';
import { startWargameMode, stopWargameMode } from './wargame.js';
import { getLoader, resetAllLayers, registerLayerLoader, getLayerType } from './layerregistry.js';
import './layers/index.js'; // triggers self-registration of all data layers
import { initPlaybackBrowser, loadPlaybackList } from './playbackbrowser.js';

// --- Globe ---
const viewer = createViewer('cesiumContainer');
window._panopticonViewer = viewer;
viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(53, 32, 5_000_000) });

// --- Filter System ---
initFilterUpdater(viewer);

// --- Audio ---
initAudioPlayer();

// --- State ---
let currentMode = 'playback';
let activeScenario = 'iran'; // tracks which ADS-B scenario is active (legacy compat)

// --- Detail-panel helpers (delegated to view registry) ---
function closeAllDetailPanels(except) { closeAllViews(viewer, except); }
function resizeAllPanels() { resizeAllViews(); }

// Layer loaders are now self-registered via js/layerregistry.js
// (see js/layers/index.js for the barrel import that triggers registration)

// Replay/Playback state
let liveExtrapolateHandler = null;
let playbackSatHandler = null; // preRender callback for satellite time-sync during playback

// =====================================================
// EXPOSE GLOBALS (for inline onclick handlers in HTML)
// =====================================================
// --- Layer Selector ---
function syncStatChip(layer) {
  const chip = document.querySelector(`.stat-chip[data-layer="${layer}"]`);
  if (chip) chip.classList.toggle('active', !!layers[layer]);
}

function updateLegend() {
  const container = $('layer-legend');
  if (!container) return;
  container.innerHTML = '';

  // Collect active layers
  const active = [];
  for (const key in layers) {
    if (layers[key]) {
      const cat = getCatalogByKey(key);
      if (cat) active.push({ key, cat });
    }
  }

  if (active.length === 0) {
    container.style.display = 'none';
    return;
  }

  // Title
  const title = document.createElement('div');
  title.className = 'll-title';
  title.textContent = 'ACTIVE LAYERS';
  container.appendChild(title);

  // Shape class per layer type
  const shapeClass = { point: 'll-swatch-diamond', path: 'll-swatch-line', region: 'll-swatch-rect', live: 'll-swatch-circle', ambient: 'll-swatch-bar' };

  for (const { key, cat } of active) {
    const item = document.createElement('div');
    item.className = 'll-item';

    const swatch = document.createElement('span');
    const lt = getLayerType(key);
    swatch.className = shapeClass[lt] || 'll-swatch-circle';
    swatch.style.backgroundColor = cat.color;
    if (lt === 'ambient') swatch.style.borderColor = cat.color;

    const label = document.createElement('span');
    label.textContent = cat.label;

    item.appendChild(swatch);
    item.appendChild(label);
    container.appendChild(item);
  }

  container.style.display = 'block';
}

function handleLayerToggle(layer, enabled) {
  // Ambient layers: no globe entities — show/hide sidebar panel instead
  const ambientLoader = getLoader(layer);
  if (ambientLoader && ambientLoader.layerType === 'ambient') {
    layers[layer] = enabled !== undefined ? enabled : !layers[layer];
    syncStatChip(layer);
    if (layers[layer]) {
      if (ambientLoader.show) ambientLoader.show();
    } else {
      if (ambientLoader.hide) ambientLoader.hide();
    }
    updateLegend();
    return;
  }

  toggleLayer(viewer, layer, currentMode, enabled);
  syncStatChip(layer);
  updateLegend();

  if (layers[layer]) {
    // Live-only auto-start layers
    if (currentMode === 'observe') {
      if (layer === 'military' && entityMaps.military.size === 0) startMilitary(viewer);
      if (layer === 'commercial' && entityMaps.commercial.size === 0) startCommercial(viewer);
      if (layer === 'satellites') {
        if (!isSatLoaded()) loadSatellites().then(() => createSatelliteEntities(viewer, activeScenario));
        else if (entityMaps.satellites.size === 0) createSatelliteEntities(viewer, activeScenario);
      }
      if (layer === 'ships' && entityMaps.ships.size === 0) startAIS(viewer);
      if (layer === 'pokemon' && entityMaps.pokemon.size === 0) fetchPogoStops(viewer);
    }

    // Data layers with lazy loading + fly-to-entities
    const loader = getLoader(layer);
    if (loader) {
      if (entityMaps[layer].size === 0) {
        loader.load(viewer).then(() => flyToLayerEntities(layer));
      } else {
        flyToLayerEntities(layer);
      }
    }
  }
}

function flyToLayerEntities(layer) {
  const map = entityMaps[layer];
  if (!map || map.size === 0) return;
  const positions = [];
  for (const [, rec] of map) {
    const pos = rec.entity.position;
    if (pos) positions.push(pos.getValue(Cesium.JulianDate.now()));
  }
  if (positions.length === 0) return;
  const sphere = Cesium.BoundingSphere.fromPoints(positions);
  viewer.camera.flyToBoundingSphere(sphere, { duration: 1.5 });
}

initLayerSelector({ toggleFn: handleLayerToggle });
initCitySelector({ flyFn: flyToCity });

// Sync stat chips for default-on layers
for (const key of Object.keys(layers)) syncStatChip(key);

window.switchMode     = switchMode;
window.openLayerPanel  = openLayerPanel;
window.openCityPanel   = openCityPanel;
window.openFilterPanel = openFilterPanel;
window.setVisualFilter = (f) => setVisualFilter(f, viewer);
window.selectScenario  = selectScenario;
window.togglePlay      = togglePlay;
window.changeSpeed     = changeSpeed;
window.toggleAudio     = toggleAudio;
window.closeSatView    = () => { const v = getView('satellite'); if (v) v.close(viewer); };
window.closePlaneView  = () => { const v = getView('plane'); if (v) v.close(viewer); };
window.closeSiteView   = () => { const v = getView('site'); if (v) v.close(viewer); };
window.closeAirportView = () => { const v = getView('airport'); if (v) v.close(viewer); };
window.closeWebcamView  = () => { const v = getView('webcam'); if (v) v.close(viewer); };
window.closePathView    = () => { const v = getView('path'); if (v) v.close(viewer); };
window.closeSubmarineView = () => { const v = getView('submarine'); if (v) v.close(viewer); };
window.togglePlaybackSidebar = () => {
  const sb = document.getElementById('playback-sidebar');
  const btn = document.getElementById('playback-toggle');
  sb.classList.toggle('collapsed');
  btn.textContent = sb.classList.contains('collapsed') ? '\u25B6' : '\u25C0';
};

// =====================================================
// CITY JUMP
// =====================================================
function flyToCity(key) {
  const c = getCityByKey(key);
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

  // Only start feeds for layers that are toggled on
  if (layers.satellites) {
    if (!isSatLoaded()) loadSatellites().then(() => createSatelliteEntities(viewer, activeScenario));
    else createSatelliteEntities(viewer, activeScenario);
  }

  if (layers.military) startMilitary(viewer);
  if (layers.commercial) startCommercial(viewer);
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
  resetAllLayers(); // resets all registered data layers via registry
}

// =====================================================
// SCENARIO → MANIFEST CONVERSION
// =====================================================
function scenarioToManifest(id) {
  const sc = SCENARIOS[id];
  if (!sc) return null;
  return {
    id,
    type: 'adsb',
    label: sc.label,
    subtitle: sc.subtitle,
    date: sc.date,
    camera: sc.camera,
    timeline: {
      domain: 'wallclock',
      startUTC: sc.timeStartUTC,
    },
    data: { file: sc.file },
    display: {
      localTz: sc.localTz,
      dataBounds: sc.dataBounds,
      blackoutZones: sc.blackoutZones,
      layers: ['military', 'commercial', 'satellites'],
      dateLabel: sc.dateLabel,
      timeLabel: sc.timeLabel,
    },
  };
}

// =====================================================
// SCENARIO SELECTION (PLAYBACK MODE)
// =====================================================
function selectScenario(id) {
  if (!SCENARIOS[id]) return;
  closeAllDetailPanels();
  activeScenario = id;

  document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('active'));
  document.getElementById('sc-' + id).classList.add('active');

  const sc = SCENARIOS[id];
  $('subtitle').textContent = sc.subtitle;
  $('updated').textContent = sc.dateLabel;
  $('btn-play').textContent = 'PLAY';

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(sc.camera.lon, sc.camera.lat, sc.camera.alt),
    duration: 1.5,
  });

  if (currentMode === 'playback') {
    stopReplay();
    startReplay();
  }
}

// =====================================================
// REPLAY MODE (powered by playback engine)
// =====================================================
function startReplay() {
  clearAllLayers(viewer, () => removeDataBoundsOverlay(viewer));
  const sc = SCENARIOS[activeScenario];
  $('subtitle').textContent = sc ? sc.subtitle : 'HISTORICAL REPLAY';
  $('timeline-bar').style.display = 'block';
  $('layer-toggles').style.display = 'flex';
  $('playback-sidebar').style.display = 'flex';
  $('playback-feed').style.display = 'none'; // no event feed for historical
  clearTimelineTicks(); // no tick marks for wallclock playbacks

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

  // Build manifest from config and load via playback engine
  const manifest = scenarioToManifest(activeScenario);
  if (!manifest) return;

  loadPlayback(viewer, manifest, {
    onTimeUpdate: (timeSec, durSec) => {
      $('timeline-slider').max = durSec;
      $('timeline-slider').value = timeSec;
      $('btn-play').textContent = isPlaying() ? 'PAUSE' : 'PLAY';
    },
    onFrameInfo: (info) => {
      $('time-current').textContent = info.timeLabel;
      $('time-irst').textContent = info.localTimeLabel;
      $('mil-count').textContent = info.entityCount;
    },
  }).then(() => {
    document.querySelector('#timeline-controls span:last-child').textContent = sc.timeLabel;
    $('speed-label').textContent = getSpeed() + 'x';

    // Satellite time-sync during playback
    playbackSatHandler = () => {
      if (sc && isLoaded()) {
        const manifest = getManifest();
        const startUTC = manifest?.timeline?.startUTC || sc.timeStartUTC;
        const absTimeSecs = startUTC + getTimeSeconds();
        updateSatellitePositions(viewer, activeScenario, replayAbsDate(sc.date, absTimeSecs));
      }
    };
    viewer.scene.preRender.addEventListener(playbackSatHandler);

    startPlaying();
  });
}

function stopReplay() {
  stopPlayback();
  closeAllViews(viewer);
  $('timeline-bar').style.display = 'none';
  $('playback-sidebar').style.display = 'none';
  $('playback-feed').style.display = 'none';
  clearTimelineTicks();
  removeBlackoutOverlays(viewer);
  if (playbackSatHandler) {
    viewer.scene.preRender.removeEventListener(playbackSatHandler);
    playbackSatHandler = null;
  }
}

function togglePlay() {
  const nowPlaying = togglePlayback();
  $('btn-play').textContent = nowPlaying ? 'PAUSE' : 'PLAY';
}

function changeSpeed() {
  const newSpeed = cycleSpeed();
  $('speed-label').textContent = newSpeed + 'x';
}

$('timeline-slider').addEventListener('input', (e) => {
  seekPlayback(Number(e.target.value));
});

// =====================================================
// TIMELINE TICK MARKS
// =====================================================

function renderTimelineTicks(manifest) {
  const container = $('timeline-ticks');
  container.innerHTML = '';
  const tl = manifest.timeline;
  if (tl.domain !== 'ticks' || !tl.totalTicks) {
    container.style.display = 'none';
    return;
  }
  const totalTicks = tl.totalTicks;
  container.style.display = 'block';
  for (let i = 0; i <= totalTicks; i++) {
    const pct = (i / totalTicks) * 100;
    const mark = document.createElement('div');
    mark.className = 'tick-mark';
    mark.style.left = pct + '%';
    container.appendChild(mark);
    const label = document.createElement('div');
    label.className = 'tick-label';
    label.style.left = pct + '%';
    label.textContent = 'T' + i;
    container.appendChild(label);
  }
}

function clearTimelineTicks() {
  const container = $('timeline-ticks');
  container.innerHTML = '';
  container.style.display = 'none';
}

// =====================================================
// WARGAME PLAYBACK (from playback browser)
// =====================================================
let lastRenderedEventCount = 0;

function startWargamePlayback(manifest) {
  // Stop current playback
  stopReplay();

  clearAllLayers(viewer, () => removeDataBoundsOverlay(viewer));
  $('subtitle').textContent = manifest.subtitle || 'WARGAME PLAYBACK';
  $('timeline-bar').style.display = 'block';
  $('layer-toggles').style.display = 'flex';
  $('playback-sidebar').style.display = 'flex';
  $('playback-feed').style.display = 'block';
  $('playback-feed').innerHTML = '';
  lastRenderedEventCount = 0;

  // Fly to camera if specified
  if (manifest.camera) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(manifest.camera.lon, manifest.camera.lat, manifest.camera.alt),
      duration: 1.5,
    });
  }

  // Auto-enable recommended layers
  const autoLayers = manifest.display?.layers || [];
  for (const layerKey of autoLayers) {
    handleLayerToggle(layerKey, true);
  }

  // Render tick marks on the timeline slider
  renderTimelineTicks(manifest);

  // Open specialized view panels for scenarios that have them (e.g. sniper scope)
  const scenarioId = manifest.data?.scenarioId || manifest.data?.scenarioFile;
  if (scenarioId) {
    const scenarioFile = scenarioId.includes('/') ? scenarioId : `scenarios/${scenarioId}.json`;
    fetch(scenarioFile).then(r => r.ok ? r.json() : null).then(sc => {
      if (!sc) return;
      if (sc.view === 'sniper') {
        const sniperView = getView('sniper');
        if (sniperView) sniperView.open(viewer);
      }
      if (sc.navigation) {
        const subView = getView('submarine');
        if (subView) subView.open(viewer);
      }
    }).catch(() => {});
  }

  const totalTicks = manifest.timeline?.totalTicks || 8;

  loadPlayback(viewer, manifest, {
    onTimeUpdate: (timeSec, durSec, progress) => {
      $('timeline-slider').max = durSec;
      $('timeline-slider').value = timeSec;
      $('btn-play').textContent = isPlaying() ? 'PAUSE' : 'PLAY';
      tickAllViews(progress, progress * totalTicks, totalTicks);
    },
    onFrameInfo: (info) => {
      $('time-current').textContent = info.timeLabel;
      $('time-irst').textContent = info.localTimeLabel;
      $('mil-count').textContent = info.entityCount;
    },
    onEvents: (events) => {
      renderPlaybackFeed(events);
    },
  }).then(() => {
    document.querySelector('#timeline-controls span:last-child').textContent =
      manifest.description || '';
    $('speed-label').textContent = getSpeed() + 'x';
    startPlaying();
  });
}

function renderPlaybackFeed(events) {
  if (!events || events.length === lastRenderedEventCount) return;

  const feed = $('playback-feed');

  // If events shrunk (seeking backward), rebuild
  if (events.length < lastRenderedEventCount) {
    feed.innerHTML = '';
    lastRenderedEventCount = 0;
  }

  // Append only new events
  for (let i = lastRenderedEventCount; i < events.length; i++) {
    const ev = events[i];
    const entry = document.createElement('div');
    entry.className = `wg-entry wg-${ev.type}`;
    entry.innerHTML = `<div class="wg-entry-title">${ev.title}</div><div class="wg-entry-body">${ev.body}</div>`;
    feed.appendChild(entry);
  }

  lastRenderedEventCount = events.length;
  feed.scrollTop = feed.scrollHeight;
}

// =====================================================
// MODE SWITCHING
// =====================================================
function switchMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;

  $('btn-observe').classList.toggle('active', mode === 'observe');
  $('btn-playback').classList.toggle('active', mode === 'playback');
  $('btn-wargame').classList.toggle('active', mode === 'wargame');
  $('info-panel').style.display = 'none';
  closeAllDetailPanels();

  // Always stop prior modes
  if (currentMode !== 'observe') stopLive();
  if (currentMode !== 'playback') stopReplay();
  if (currentMode !== 'wargame') stopWargameMode();

  if (mode === 'observe') {
    startLive();
    $('updated').textContent = '---';
    $('civ-count').textContent = '---';
    $('sat-count').textContent = isSatLoaded() ? entityMaps.satellites.size : '---';
    $('ship-count').textContent = '---';
    $('pogo-count').textContent = isPogoLoaded() ? entityMaps.pokemon.size : '---';
  } else if (mode === 'playback') {
    const sc = SCENARIOS[activeScenario];
    $('updated').textContent = sc ? sc.dateLabel : '---';
    $('civ-count').textContent = '---';
    $('sat-count').textContent = '---';
    $('ship-count').textContent = '---';
    $('pogo-count').textContent = '---';
    startReplay();
  } else if (mode === 'wargame') {
    clearAllLayers(viewer, () => removeDataBoundsOverlay(viewer));
    $('subtitle').textContent = 'WARGAME // AI DECISION EVALUATION';
    $('layer-toggles').style.display = 'flex';
    $('timeline-bar').style.display = 'none';
    $('playback-sidebar').style.display = 'none';
    startWargameMode(viewer);
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
  if (!entity) return;
  selectedEntity = entity;
  // Only show reticle for billboard entities (points); polylines/polygons skip it
  if (entity.billboard) reticleEntity.show = true;
}

handler.setInputAction((click) => {
  const picked = viewer.scene.pick(click.position);

  // Country polygon click (BORDER filter)
  if (Cesium.defined(picked) && picked.id && picked.id._countryData) {
    showCountryPanel(picked.id._countryData);
    infoPanel.style.display = 'none';
    selectEntity(picked.id);
    closeAllDetailPanels();
    return;
  }

  if (Cesium.defined(picked) && picked.id && picked.id.acData) {
    closeCountryPanel();
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

    // View dispatch: each entity declares its view type via _view field
    const viewType = ac._view || 'plane';
    closeAllDetailPanels(viewType);

    const view = getView(viewType);
    if (view) view.open(viewer, picked.id);
  } else {
    deselectEntity();
    infoPanel.style.display = 'none';
    closeCountryPanel();
    closeAllDetailPanels();
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
      resizeAllPanels();
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
        resizeAllPanels();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

// =====================================================
// KEYBOARD SHORTCUTS (Playback)
// =====================================================
document.addEventListener('keydown', (e) => {
  // Ignore if user is typing in an input/textarea/select
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (currentMode !== 'playback' || !isLoaded()) return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      togglePlay();
      break;
    case 'ArrowRight':
      e.preventDefault();
      seekPlayback(getTimeSeconds() + 5); // skip forward 5 seconds
      break;
    case 'ArrowLeft':
      e.preventDefault();
      seekPlayback(Math.max(0, getTimeSeconds() - 5)); // skip back 5 seconds
      break;
    case 'ArrowUp':
      e.preventDefault();
      changeSpeed();
      break;
  }
});

// =====================================================
// BOOT — Register Custom Datasets & Start in Playback Mode
// =====================================================
loadCustomDatasets(viewer, (key, loader) => { registerLayerLoader(key, loader); });
refreshCatalog(); // pick up any custom dataset registrations

// Initialize playback browser sidebar
initPlaybackBrowser({
  onSelect: (manifest) => {
    if (manifest.type === 'adsb') {
      // ADS-B: map back to legacy scenario key for satellite/overlay compat
      const scenarioMap = { 'iran-feb28': 'iran', 'venezuela-jan03': 'venezuela', 'jalisco-feb22': 'jalisco' };
      const legacyKey = scenarioMap[manifest.id];
      if (legacyKey) {
        activeScenario = legacyKey;
        selectScenario(legacyKey);
      }
    } else if (manifest.type === 'wargame') {
      startWargamePlayback(manifest);
    }
  },
});
loadPlaybackList();

$('btn-observe').classList.remove('active');
$('btn-playback').classList.add('active');
startReplay();
