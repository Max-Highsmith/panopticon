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
  { key: 'border', label: 'BORDER', desc: 'Political map overlay' },
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
    border: () => `saturate(${1 - 0.7 * fi}) brightness(${1 + 0.15 * fi}) contrast(${1 + 0.2 * fi}) sepia(${0.3 * fi})`,
  };

  const fn = filters[activeFilter];
  el.style.filter = fn ? fn() : '';
}

const FILTER_CLASSES = ['filter-crt', 'filter-nvg', 'filter-flir', 'filter-anime', 'filter-border'];

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
  document.body.classList.remove(...FILTER_CLASSES);
  activeFilter = filter;

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
