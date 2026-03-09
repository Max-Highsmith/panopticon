/* ===================================================================
   PANOPTICON — Visual Filters (altitude-adaptive)
   Toolbar dropdown panel + altitude-adaptive CSS filters.
   =================================================================== */

let activeFilter = 'none';
let filterIntensity = 1;
let _viewer = null;
let _panelOpen = false;

const FILTERS = [
  { key: 'none',   label: 'OFF',    desc: 'No filter' },
  { key: 'crt',    label: 'CRT',    desc: 'Retro CRT scanlines' },
  { key: 'nvg',    label: 'NVG',    desc: 'Night vision green' },
  { key: 'flir',   label: 'FLIR',   desc: 'Thermal imaging' },
  { key: 'anime',  label: 'ANIME',  desc: 'Cel-shaded posterize' },
  { key: 'border', label: 'BORDER', desc: 'Geopolitical borders only' },
];

/* --- Border Mode State --- */
let _borderDataSource = null;
let _borderActive = false;
let _borderLabels = [];
let _savedGlobeShow = null;
let _savedImageryShow = [];
let _savedTilesetShow = [];
let _savedGlobeBaseColor = null;

// MAPCOLOR9 palette — 9 distinct low-saturation hues (graph-coloring: adjacent countries differ)
const BORDER_PALETTE = [
  [210, 0.15, 0.12],  // 1 — blue-steel
  [40,  0.15, 0.12],  // 2 — warm sand
  [140, 0.12, 0.11],  // 3 — muted green
  [300, 0.12, 0.11],  // 4 — faded violet
  [20,  0.15, 0.12],  // 5 — burnt sienna
  [180, 0.12, 0.11],  // 6 — teal
  [60,  0.12, 0.11],  // 7 — olive
  [330, 0.12, 0.11],  // 8 — rose
  [260, 0.12, 0.11],  // 9 — indigo
];

/**
 * Map camera altitude to 0..1 intensity.
 * Full effect at globe view (~5M+ m), scaled down at street level (~1k m).
 */
function calcFilterIntensity(viewer) {
  const cart = viewer.camera.positionCartographic;
  const altM = cart ? cart.height : 5_000_000;
  const lo = Math.log(1_000);
  const hi = Math.log(5_000_000);
  const t = (Math.log(Math.max(altM, 1_000)) - lo) / (hi - lo);
  return Math.min(Math.max(t, 0), 1);
}

/**
 * Apply CSS filter strings to #cesiumContainer based on the active filter and intensity.
 */
function applyFilterCSS(fi) {
  const el = document.getElementById('cesiumContainer');
  const filters = {
    crt:    () => `brightness(${1 + 0.1 * fi}) contrast(${1 + 0.15 * fi}) saturate(${1 - 0.2 * fi})`,
    nvg:    () => `brightness(${1 + 0.4 * fi}) contrast(${1 + 0.5 * fi}) saturate(${1 - fi}) sepia(${fi}) hue-rotate(${70 * fi}deg) saturate(${1 + 2 * fi})`,
    flir:   () => `contrast(${1 + 0.4 * fi}) saturate(${1 - fi}) brightness(${1 - 0.1 * fi})`,
    anime:  () => {
      const base = `contrast(${1 + 0.6 * fi}) saturate(${1 + 0.8 * fi}) brightness(${1 + 0.05 * fi})`;
      return fi > 0.15 ? `${base} url(#posterize)` : base;
    },
    border: () => `brightness(${1 + 0.05 * fi}) contrast(${1 + 0.1 * fi})`,
  };

  const fn = filters[activeFilter];
  el.style.filter = fn ? fn() : '';
}

const FILTER_CLASSES = ['filter-crt', 'filter-nvg', 'filter-flir', 'filter-anime', 'filter-border'];

/* --- Border Mode: imagery swap + GeoJSON borders --- */

/**
 * Read a GeoJSON property value from a Cesium entity.
 */
function prop(entity, key) {
  try { return entity.properties?.[key]?.getValue(); } catch { return undefined; }
}

/**
 * Activate border mode: hide imagery, show dark globe with country borders + labels.
 */
async function activateBorderMode(viewer) {
  if (_borderActive) return;
  _borderActive = true;

  // Save and hide imagery layers
  _savedImageryShow = [];
  for (let i = 0; i < viewer.imageryLayers.length; i++) {
    const layer = viewer.imageryLayers.get(i);
    _savedImageryShow.push(layer.show);
    layer.show = false;
  }

  // Save and hide 3D tilesets
  _savedGlobeShow = viewer.scene.globe.show;
  _savedGlobeBaseColor = viewer.scene.globe.baseColor;
  _savedTilesetShow = [];
  for (let i = 0; i < viewer.scene.primitives.length; i++) {
    const prim = viewer.scene.primitives.get(i);
    if (prim instanceof Cesium.Cesium3DTileset) {
      _savedTilesetShow.push({ prim, show: prim.show });
      prim.show = false;
    }
  }

  // Show globe with dark base color (ocean/space)
  viewer.scene.globe.show = true;
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#08080f');

  // Load GeoJSON borders if not already loaded
  if (!_borderDataSource) {
    try {
      _borderDataSource = await Cesium.GeoJsonDataSource.load(
        'data/layers/regions/country_borders.json',
        {
          stroke: Cesium.Color.fromCssColorString('#00ff41').withAlpha(0.7),
          strokeWidth: 1.5,
          fill: Cesium.Color.fromCssColorString('#111118').withAlpha(0.8),
          markerSize: 0,
        }
      );

      // Style polygons + attach country data for click handling
      for (const entity of _borderDataSource.entities.values) {
        if (entity.polygon) {
          // MAPCOLOR9 graph-coloring for distinct adjacent fills
          const mapcolor = prop(entity, 'mapcolor9') || 1;
          const [h, s, l] = BORDER_PALETTE[(mapcolor - 1) % 9];
          entity.polygon.material = Cesium.Color.fromHsl(h / 360, s, l, 0.85);
          entity.polygon.outline = true;
          entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#00ff41').withAlpha(0.5);

          // Attach country metadata for click handler
          entity._countryData = {
            name:        prop(entity, 'name') || '',
            formal_name: prop(entity, 'formal_name') || '',
            iso_a2:      prop(entity, 'iso_a2') || '',
            iso_a3:      prop(entity, 'iso_a3') || '',
            continent:   prop(entity, 'continent') || '',
            subregion:   prop(entity, 'subregion') || '',
            type:        prop(entity, 'type') || '',
            pop_est:     prop(entity, 'pop_est') || 0,
            gdp_md:      prop(entity, 'gdp_md') || 0,
            economy:     prop(entity, 'economy') || '',
            income_grp:  prop(entity, 'income_grp') || '',
            capital:     prop(entity, 'capital') || '',
          };
        }
      }

      // Create country name labels at optimal positions (Natural Earth LABEL_X/LABEL_Y)
      const seen = new Set();
      for (const entity of _borderDataSource.entities.values) {
        const name = prop(entity, 'name');
        const labelX = prop(entity, 'label_x');
        const labelY = prop(entity, 'label_y');
        if (!name || labelX == null || labelY == null) continue;
        if (seen.has(name)) continue; // avoid duplicate labels for multi-polygon countries
        seen.add(name);

        const labelEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(labelX, labelY, 0),
          label: {
            text: name.toUpperCase(),
            font: '11px Courier New',
            fillColor: Cesium.Color.fromCssColorString('#00ff41').withAlpha(0.7),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8_000_000),
            scale: 0.85,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        _borderLabels.push(labelEntity);
      }

      viewer.dataSources.add(_borderDataSource);
    } catch (err) {
      console.warn('BORDER filter: failed to load country borders:', err);
    }
  } else {
    _borderDataSource.show = true;
    for (const lbl of _borderLabels) lbl.show = true;
  }
}

/**
 * Deactivate border mode: restore imagery, hide GeoJSON borders and labels.
 */
function deactivateBorderMode(viewer) {
  if (!_borderActive) return;
  _borderActive = false;

  // Restore imagery layers
  for (let i = 0; i < viewer.imageryLayers.length && i < _savedImageryShow.length; i++) {
    viewer.imageryLayers.get(i).show = _savedImageryShow[i];
  }

  // Restore 3D tilesets
  for (const { prim, show } of _savedTilesetShow) {
    prim.show = show;
  }

  // Restore globe state
  if (_savedGlobeShow !== null) {
    viewer.scene.globe.show = _savedGlobeShow;
  }
  if (_savedGlobeBaseColor) {
    viewer.scene.globe.baseColor = _savedGlobeBaseColor;
  }

  // Hide border data source + labels
  if (_borderDataSource) {
    _borderDataSource.show = false;
  }
  for (const lbl of _borderLabels) lbl.show = false;

  closeCountryPanel();
}

/* --- Country Info Panel --- */

function flagEmoji(iso2) {
  if (!iso2 || iso2.length !== 2) return '';
  return [...iso2.toUpperCase()].map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');
}

function formatPopulation(pop) {
  if (!pop) return '---';
  if (pop >= 1_000_000_000) return (pop / 1_000_000_000).toFixed(2) + 'B';
  if (pop >= 1_000_000) return (pop / 1_000_000).toFixed(1) + 'M';
  if (pop >= 1_000) return (pop / 1_000).toFixed(0) + 'K';
  return String(pop);
}

function formatGDP(gdpMd) {
  if (!gdpMd) return '---';
  if (gdpMd >= 1_000_000) return '$' + (gdpMd / 1_000_000).toFixed(2) + 'T';
  if (gdpMd >= 1_000) return '$' + (gdpMd / 1_000).toFixed(0) + 'B';
  return '$' + gdpMd + 'M';
}

export function showCountryPanel(data) {
  const panel = document.getElementById('country-panel');
  if (!panel) return;

  const flag = flagEmoji(data.iso_a2);
  document.getElementById('cp-flag').textContent = flag;
  document.getElementById('cp-name').textContent = data.name;
  document.getElementById('cp-formal').textContent = data.formal_name || data.name;
  document.getElementById('cp-type').textContent = data.type || '---';
  document.getElementById('cp-capital').textContent = data.capital || '---';
  document.getElementById('cp-continent').textContent = data.continent || '---';
  document.getElementById('cp-subregion').textContent = data.subregion || '---';
  document.getElementById('cp-population').textContent = formatPopulation(data.pop_est);
  document.getElementById('cp-gdp').textContent = formatGDP(data.gdp_md);
  document.getElementById('cp-economy').textContent = data.economy || '---';
  document.getElementById('cp-income').textContent = data.income_grp || '---';
  document.getElementById('cp-iso').textContent = `${data.iso_a2} / ${data.iso_a3}`;

  panel.style.display = 'block';
}

export function closeCountryPanel() {
  const panel = document.getElementById('country-panel');
  if (panel) panel.style.display = 'none';
}

export function isBorderActive() { return _borderActive; }

// --- Dropdown Panel ---

function buildPanel() {
  const panel = document.getElementById('filter-panel');
  if (!panel) return;
  panel.innerHTML = '';

  for (const f of FILTERS) {
    const row = document.createElement('div');
    row.className = 'filter-row' + (activeFilter === f.key ? ' active' : '');
    row.dataset.key = f.key;

    const name = document.createElement('span');
    name.className = 'filter-name';
    name.textContent = f.label;

    const desc = document.createElement('span');
    desc.className = 'filter-desc';
    desc.textContent = f.desc;

    row.appendChild(name);
    row.appendChild(desc);
    row.addEventListener('click', () => {
      setVisualFilter(f.key, _viewer);
      closeFilterPanel();
    });
    panel.appendChild(row);
  }
}

function syncToggleButton() {
  const btn = document.getElementById('filter-panel-toggle');
  if (!btn) return;
  if (activeFilter === 'none') {
    btn.textContent = 'FILTERS';
    btn.classList.remove('filter-active');
  } else {
    btn.textContent = 'FILTERS: ' + activeFilter.toUpperCase();
    btn.classList.add('filter-active');
  }
}

// --- Public API ---

export function setVisualFilter(filter, viewer) {
  const prevFilter = activeFilter;
  document.body.classList.remove(...FILTER_CLASSES);
  activeFilter = filter;

  // Handle border mode transitions
  if (prevFilter === 'border' && filter !== 'border') {
    deactivateBorderMode(viewer);
  }
  if (filter === 'border' && prevFilter !== 'border') {
    activateBorderMode(viewer);
  }

  if (filter !== 'none') {
    document.body.classList.add('filter-' + filter);
  }

  syncToggleButton();

  const fi = calcFilterIntensity(viewer);
  filterIntensity = fi;
  document.documentElement.style.setProperty('--fi', fi);
  applyFilterCSS(fi);
}

export function openFilterPanel() {
  const panel = document.getElementById('filter-panel');
  if (!panel) return;
  _panelOpen = !_panelOpen;
  panel.style.display = _panelOpen ? 'block' : 'none';
  document.getElementById('filter-panel-toggle')?.classList.toggle('open', _panelOpen);
  if (_panelOpen) buildPanel();
}

export function closeFilterPanel() {
  const panel = document.getElementById('filter-panel');
  if (panel) panel.style.display = 'none';
  document.getElementById('filter-panel-toggle')?.classList.remove('open');
  _panelOpen = false;
}

/**
 * Register a per-frame listener that adjusts filter intensity with camera altitude.
 */
export function initFilterUpdater(viewer) {
  _viewer = viewer;

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!_panelOpen) return;
    const panel = document.getElementById('filter-panel');
    const toggle = document.getElementById('filter-panel-toggle');
    if (panel && !panel.contains(e.target) && toggle && !toggle.contains(e.target)) {
      closeFilterPanel();
    }
  });

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _panelOpen) closeFilterPanel();
  });

  viewer.scene.preRender.addEventListener(() => {
    if (activeFilter === 'none') return;
    const fi = calcFilterIntensity(viewer);
    if (Math.abs(fi - filterIntensity) > 0.005) {
      filterIntensity = fi;
      document.documentElement.style.setProperty('--fi', fi);
      applyFilterCSS(fi);
    }
  });
}
