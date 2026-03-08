/* ===================================================================
   PANOPTICON — City Selector UI
   Toolbar-style dropdown menu with pinning for city navigation.
   =================================================================== */

import { getCityCatalog, getCityRegions } from './citycatalog.js';
import { updatePinTrayVisibility } from './layerselector.js';

const STORAGE_KEY = 'panopticon_pinned_cities';

let _flyFn = null;
let _panelOpen = false;
let _collapsedRegions = new Set();
const state = {};  // key → { pinned }

// --- localStorage ---

function loadPinnedKeys() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

function savePinnedKeys() {
  const keys = getCityCatalog().filter(e => state[e.key]?.pinned).map(e => e.key);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

// --- Pin Bar ---

function renderPinBar() {
  const container = document.getElementById('city-pins');
  if (!container) return;

  while (container.firstChild) container.removeChild(container.firstChild);

  const catalog = getCityCatalog();
  for (const entry of catalog) {
    const s = state[entry.key];
    if (!s || !s.pinned) continue;

    const btn = document.createElement('button');
    btn.className = 'city-pin';
    btn.textContent = entry.shortLabel;
    btn.addEventListener('click', () => {
      if (_flyFn) _flyFn(entry.key);
    });

    container.appendChild(btn);
  }

  updatePinTrayVisibility();
}

// --- Dropdown Panel ---

function buildPanel() {
  const panel = document.getElementById('city-panel');
  if (!panel) return;
  panel.innerHTML = '';

  // Search
  const search = document.createElement('input');
  search.type = 'text';
  search.id = 'city-search';
  search.placeholder = 'SEARCH CITIES...';
  search.addEventListener('input', () => filterPanel(search.value));
  panel.appendChild(search);

  // Regions
  const regions = getCityRegions();
  const catalog = getCityCatalog();

  for (const region of regions) {
    const entries = catalog.filter(e => e.region === region);
    if (entries.length === 0) continue;

    const regionDiv = document.createElement('div');
    regionDiv.className = 'city-category';
    regionDiv.dataset.region = region;

    const header = document.createElement('div');
    header.className = 'city-category-header';
    const arrow = document.createElement('span');
    arrow.className = 'cat-arrow';
    arrow.textContent = _collapsedRegions.has(region) ? '\u25b8 ' : '\u25be ';
    header.appendChild(arrow);
    header.appendChild(document.createTextNode(region.toUpperCase()));
    header.addEventListener('click', () => {
      if (_collapsedRegions.has(region)) _collapsedRegions.delete(region);
      else _collapsedRegions.add(region);
      arrow.textContent = _collapsedRegions.has(region) ? '\u25b8 ' : '\u25be ';
      items.style.display = _collapsedRegions.has(region) ? 'none' : 'block';
    });
    regionDiv.appendChild(header);

    const items = document.createElement('div');
    items.className = 'city-category-items';
    items.style.display = _collapsedRegions.has(region) ? 'none' : 'block';

    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'city-row';
      row.dataset.key = entry.key;
      row.dataset.search = (entry.label + ' ' + entry.shortLabel + ' ' + entry.region).toLowerCase();

      const name = document.createElement('span');
      name.className = 'city-name';
      name.textContent = entry.label;

      const code = document.createElement('span');
      code.className = 'city-code';
      code.textContent = entry.shortLabel;

      const pinBtn = document.createElement('button');
      pinBtn.className = 'city-pin-btn' + (state[entry.key]?.pinned ? ' pinned' : '');
      pinBtn.id = 'city-pin-btn-' + entry.key;
      pinBtn.textContent = state[entry.key]?.pinned ? 'PINNED' : 'PIN';
      pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nowPinned = !state[entry.key]?.pinned;
        state[entry.key].pinned = nowPinned;
        savePinnedKeys();
        renderPinBar();
        pinBtn.classList.toggle('pinned', nowPinned);
        pinBtn.textContent = nowPinned ? 'PINNED' : 'PIN';
      });

      row.appendChild(name);
      row.appendChild(code);
      row.appendChild(pinBtn);
      row.addEventListener('click', () => {
        if (_flyFn) _flyFn(entry.key);
      });
      items.appendChild(row);
    }

    regionDiv.appendChild(items);
    panel.appendChild(regionDiv);
  }
}

function filterPanel(query) {
  const q = query.toLowerCase().trim();
  const panel = document.getElementById('city-panel');
  if (!panel) return;

  const categories = panel.querySelectorAll('.city-category');
  for (const cat of categories) {
    const rows = cat.querySelectorAll('.city-row');
    let anyVisible = false;
    for (const row of rows) {
      const match = !q || row.dataset.search.includes(q);
      row.style.display = match ? 'flex' : 'none';
      if (match) anyVisible = true;
    }
    cat.style.display = anyVisible ? 'block' : 'none';
    if (q && anyVisible) {
      const items = cat.querySelector('.city-category-items');
      if (items) items.style.display = 'block';
    }
  }
}

// --- Public API ---

export function openCityPanel() {
  const panel = document.getElementById('city-panel');
  if (!panel) return;
  _panelOpen = !_panelOpen;
  panel.style.display = _panelOpen ? 'block' : 'none';
  document.getElementById('city-panel-toggle')?.classList.toggle('open', _panelOpen);
  if (_panelOpen) {
    buildPanel();
    const search = document.getElementById('city-search');
    if (search) { search.value = ''; search.focus(); }
  }
}

export function closeCityPanel() {
  const panel = document.getElementById('city-panel');
  if (panel) panel.style.display = 'none';
  document.getElementById('city-panel-toggle')?.classList.remove('open');
  _panelOpen = false;
}

export function initCitySelector({ flyFn }) {
  _flyFn = flyFn;

  const savedPins = loadPinnedKeys();
  const catalog = getCityCatalog();

  for (const entry of catalog) {
    state[entry.key] = {
      pinned: savedPins ? savedPins.includes(entry.key) : false,
    };
  }

  renderPinBar();

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!_panelOpen) return;
    const panel = document.getElementById('city-panel');
    const toggle = document.getElementById('city-panel-toggle');
    if (panel && !panel.contains(e.target) && toggle && !toggle.contains(e.target)) {
      closeCityPanel();
    }
  });

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _panelOpen) closeCityPanel();
  });
}
