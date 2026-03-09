/* ===================================================================
   PANOPTICON — Wikipedia Geosearch Layer
   Ambient sidebar panel showing contextual Wikipedia articles
   near the current camera position. Re-queries on camera movement.
   =================================================================== */

import { createAmbientLayer } from './ambientlayer.js';
import { registerLayerLoader, cacheLayerData } from '../layerregistry.js';

const DATA_URL = 'data/layers/ambient/wikipedia_geo.json';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const DEBOUNCE_MS = 2000;
const MIN_MOVE_KM = 50;
const GEOSEARCH_RADIUS = 10000; // 10km
const MAX_ARTICLES = 50;

// --- Camera-watching state ---
let lastQueryLat = null;
let lastQueryLon = null;
let cameraDebounceTimer = null;
let cameraRemoveFn = null;
let isVisible = false;
let currentData = null;

// --- Haversine distance ---
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Get camera center ---
function getCameraLatLon() {
  const viewer = window._panopticonViewer;
  if (!viewer) return null;
  const cart = viewer.camera.positionCartographic;
  if (!cart) return null;
  return {
    lat: Cesium.Math.toDegrees(cart.latitude),
    lon: Cesium.Math.toDegrees(cart.longitude),
  };
}

// --- Wikipedia geosearch fetch ---
async function fetchWikipediaGeo(lat, lon) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'geosearch',
    ggscoord: `${lat}|${lon}`,
    ggsradius: String(GEOSEARCH_RADIUS),
    ggslimit: String(MAX_ARTICLES),
    prop: 'coordinates|extracts|info',
    exintro: 'true',
    explaintext: 'true',
    exlimit: String(MAX_ARTICLES),
    inprop: 'url',
    format: 'json',
    origin: '*',
  });

  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: { 'Api-User-Agent': 'Panopticon/1.0 (globe intelligence tool)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  return parseResponse(raw, lat, lon);
}

function parseResponse(raw, queryLat, queryLon) {
  const pages = raw.query?.pages || {};
  const articles = Object.values(pages)
    .filter(p => p.coordinates?.length > 0)
    .map(p => {
      const coord = p.coordinates[0];
      const dist = haversineKm(queryLat, queryLon, coord.lat, coord.lon);
      return {
        pageid: p.pageid,
        name: p.title || '',
        title: p.title || '',
        lat: coord.lat,
        lon: coord.lon,
        extract: (p.extract || '').slice(0, 300),
        url: p.fullurl || `https://en.wikipedia.org/?curid=${p.pageid}`,
        distKm: Math.round(dist * 10) / 10,
      };
    })
    .sort((a, b) => a.distKm - b.distKm);

  return {
    queryLat,
    queryLon,
    snapshot_ts: new Date().toISOString(),
    articles,
  };
}

// --- Camera movement handler ---
function onCameraMove() {
  if (!isVisible) return;
  clearTimeout(cameraDebounceTimer);
  cameraDebounceTimer = setTimeout(async () => {
    const pos = getCameraLatLon();
    if (!pos) return;

    if (lastQueryLat !== null && lastQueryLon !== null) {
      const moved = haversineKm(lastQueryLat, lastQueryLon, pos.lat, pos.lon);
      if (moved < MIN_MOVE_KM) return;
    }

    lastQueryLat = pos.lat;
    lastQueryLon = pos.lon;

    try {
      const data = await fetchWikipediaGeo(pos.lat, pos.lon);
      currentData = data;
      cacheLayerData('wikipedia', data);
      updateCount();
      renderToPanel();
      console.log(`WIKI: ${data.articles.length} articles near ${pos.lat.toFixed(1)}, ${pos.lon.toFixed(1)}`);
    } catch (err) {
      console.error('WIKI fetch error:', err);
    }
  }, DEBOUNCE_MS);
}

function startCameraWatch() {
  const viewer = window._panopticonViewer;
  if (!viewer || cameraRemoveFn) return;
  cameraRemoveFn = viewer.camera.changed.addEventListener(onCameraMove);
  // Trigger immediate fetch for current position
  onCameraMove();
}

function stopCameraWatch() {
  if (cameraRemoveFn) {
    cameraRemoveFn();
    cameraRemoveFn = null;
  }
  clearTimeout(cameraDebounceTimer);
}

// --- Render ---
function truncateExtract(text, maxLen = 120) {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '\u2026';
}

function renderWikiPanel(contentEl, data) {
  const articles = data?.articles || [];
  contentEl.innerHTML = '';

  // Location header
  const header = document.createElement('div');
  header.className = 'wiki-location';
  if (data?.queryLat != null) {
    header.textContent = `NEAR ${data.queryLat.toFixed(1)}\u00b0, ${data.queryLon.toFixed(1)}\u00b0`;
  } else {
    header.textContent = 'CACHED STRATEGIC REGIONS';
  }
  contentEl.appendChild(header);

  if (articles.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'wiki-empty';
    empty.textContent = 'NO ARTICLES FOUND NEARBY';
    contentEl.appendChild(empty);
    return;
  }

  for (const a of articles) {
    const card = document.createElement('div');
    card.className = 'wiki-card';

    const title = document.createElement('div');
    title.className = 'wiki-title';
    title.textContent = a.title;
    card.appendChild(title);

    if (a.extract) {
      const extract = document.createElement('div');
      extract.className = 'wiki-extract';
      extract.textContent = truncateExtract(a.extract);
      card.appendChild(extract);
    }

    const meta = document.createElement('div');
    meta.className = 'wiki-meta';

    const dist = document.createElement('span');
    dist.className = 'wiki-dist';
    dist.textContent = a.distKm != null && a.distKm > 0
      ? (a.distKm < 1 ? '<1 KM' : `${a.distKm} KM`)
      : '';
    meta.appendChild(dist);

    const coords = document.createElement('span');
    coords.className = 'wiki-coords';
    coords.textContent = `${a.lat.toFixed(2)}\u00b0, ${a.lon.toFixed(2)}\u00b0`;
    meta.appendChild(coords);

    card.appendChild(meta);

    card.addEventListener('click', () => {
      window.open(a.url, '_blank', 'noopener');
    });

    contentEl.appendChild(card);
  }
}

function renderToPanel() {
  const panel = document.getElementById('wiki-panel');
  if (!panel || !currentData) return;
  const content = panel.querySelector('.ambient-content');
  if (content) renderWikiPanel(content, currentData);
}

function updateCount() {
  const el = document.getElementById('wiki-count');
  if (el && currentData) el.textContent = currentData.articles?.length || '0';
}

// --- Factory layer (handles static load, tabs, panel lifecycle) ---
const layer = createAmbientLayer({
  layerKey: 'wikipedia',
  dataUrl: DATA_URL,
  panelId: 'wiki-panel',
  countId: 'wiki-count',
  logLabel: 'WIKI',
  tabLabel: 'WIKI',
  tabColor: '#aaaaaa',
  renderFn: renderWikiPanel,
  // No liveUrl — we use camera-driven updates instead
  countFn: (data) => data.articles?.length || '0',
});

// Wrap show/hide to add camera watching
const wrappedShow = () => {
  isVisible = true;
  layer.show();
  startCameraWatch();
};

const wrappedHide = () => {
  isVisible = false;
  stopCameraWatch();
  layer.hide();
};

const wrappedReset = () => {
  isVisible = false;
  stopCameraWatch();
  lastQueryLat = null;
  lastQueryLon = null;
  currentData = null;
  layer.reset();
};

registerLayerLoader('wikipedia', {
  load: layer.load,
  flyTo: null,
  reset: wrappedReset,
  dataUrl: DATA_URL,
  layerType: 'ambient',
  show: wrappedShow,
  hide: wrappedHide,
});
