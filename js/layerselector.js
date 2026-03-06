/* ===================================================================
   PANOPTICON — Layer Selector UI
   Dropdown panel + pin bar for managing 100+ layers.
   =================================================================== */

import { getCatalog, getCatalogByKey, getCategories } from './layercatalog.js';

const STORAGE_KEY = 'panopticon_pinned_layers';

// --- State ---
const state = {};  // key → { enabled, pinned }
let _toggleFn = null;  // (key, enabled) => void
let _panelOpen = false;
let _collapsedCats = new Set();

// --- localStorage ---

function loadPinnedKeys() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

function savePinnedKeys() {
  const keys = getCatalog().filter(e => state[e.key]?.pinned).map(e => e.key);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

// --- Core State Management ---

function setState(key, updates) {
  if (!state[key]) state[key] = { enabled: false, pinned: false };
  const prev = { ...state[key] };
  Object.assign(state[key], updates);

  // Fire toggle if enabled changed
  if (updates.enabled !== undefined && updates.enabled !== prev.enabled && _toggleFn) {
    _toggleFn(key, state[key].enabled);
  }

  // Persist pinned changes
  if (updates.pinned !== undefined && updates.pinned !== prev.pinned) {
    savePinnedKeys();
    renderPinBar();
  }

  syncPanelRow(key);
}

// --- Pin Bar ---

function renderPinBar() {
  const container = document.getElementById('layer-toggles');
  if (!container) return;

  // Remove all children except the toggle button
  const btn = document.getElementById('layer-panel-toggle');
  while (container.firstChild) container.removeChild(container.firstChild);

  // Add pinned layers
  const catalog = getCatalog();
  for (const entry of catalog) {
    const s = state[entry.key];
    if (!s || !s.pinned) continue;

    const label = document.createElement('label');
    label.style.color = entry.color;
    label.dataset.layer = entry.key;

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.id = 'chk-' + entry.key;
    chk.checked = s.enabled;
    chk.addEventListener('change', () => {
      setState(entry.key, { enabled: chk.checked });
    });

    const span = document.createElement('span');
    span.textContent = entry.shortLabel;

    const unpin = document.createElement('button');
    unpin.className = 'unpin-btn';
    unpin.textContent = '\u00d7';
    unpin.title = 'Unpin';
    unpin.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setState(entry.key, { pinned: false });
    });

    label.appendChild(chk);
    label.appendChild(span);
    label.appendChild(unpin);
    container.appendChild(label);
  }

  // Re-add the toggle button
  if (btn) container.appendChild(btn);
}

// --- Dropdown Panel ---

function buildPanel() {
  const panel = document.getElementById('layer-panel');
  if (!panel) return;
  panel.innerHTML = '';

  // Search
  const search = document.createElement('input');
  search.type = 'text';
  search.id = 'layer-search';
  search.placeholder = 'SEARCH LAYERS...';
  search.addEventListener('input', () => filterPanel(search.value));
  panel.appendChild(search);

  // Categories
  const categories = getCategories();
  const catalog = getCatalog();

  for (const cat of categories) {
    const entries = catalog.filter(e => e.category === cat);
    if (entries.length === 0) continue;

    const catDiv = document.createElement('div');
    catDiv.className = 'layer-category';
    catDiv.dataset.category = cat;

    const header = document.createElement('div');
    header.className = 'layer-category-header';
    const arrow = document.createElement('span');
    arrow.className = 'cat-arrow';
    arrow.textContent = _collapsedCats.has(cat) ? '\u25b8 ' : '\u25be ';
    header.appendChild(arrow);
    header.appendChild(document.createTextNode(cat.toUpperCase()));
    header.addEventListener('click', () => {
      if (_collapsedCats.has(cat)) _collapsedCats.delete(cat);
      else _collapsedCats.add(cat);
      arrow.textContent = _collapsedCats.has(cat) ? '\u25b8 ' : '\u25be ';
      items.style.display = _collapsedCats.has(cat) ? 'none' : 'block';
    });
    catDiv.appendChild(header);

    const items = document.createElement('div');
    items.className = 'layer-category-items';
    items.style.display = _collapsedCats.has(cat) ? 'none' : 'block';

    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'layer-row';
      row.dataset.key = entry.key;
      row.dataset.search = (entry.label + ' ' + entry.shortLabel).toLowerCase();

      // Checkbox
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.id = 'panel-chk-' + entry.key;
      chk.checked = state[entry.key]?.enabled || false;
      chk.addEventListener('change', () => {
        setState(entry.key, { enabled: chk.checked });
      });

      // Color swatch
      const swatch = document.createElement('span');
      swatch.className = 'layer-color-swatch';
      swatch.style.backgroundColor = entry.color;

      // Name
      const name = document.createElement('span');
      name.className = 'layer-name';
      name.textContent = entry.label;

      // Pin button
      const pinBtn = document.createElement('button');
      pinBtn.className = 'layer-pin-btn' + (state[entry.key]?.pinned ? ' pinned' : '');
      pinBtn.id = 'pin-btn-' + entry.key;
      pinBtn.textContent = state[entry.key]?.pinned ? 'PINNED' : 'PIN';
      pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nowPinned = !state[entry.key]?.pinned;
        const updates = { pinned: nowPinned };
        // Auto-enable when pinning
        if (nowPinned && !state[entry.key]?.enabled) updates.enabled = true;
        setState(entry.key, updates);
        // Update panel checkbox if we just enabled
        const panelChk = document.getElementById('panel-chk-' + entry.key);
        if (panelChk) panelChk.checked = state[entry.key].enabled;
      });

      row.appendChild(chk);
      row.appendChild(swatch);
      row.appendChild(name);
      row.appendChild(pinBtn);
      items.appendChild(row);
    }

    catDiv.appendChild(items);
    panel.appendChild(catDiv);
  }
}

function filterPanel(query) {
  const q = query.toLowerCase().trim();
  const panel = document.getElementById('layer-panel');
  if (!panel) return;

  const categories = panel.querySelectorAll('.layer-category');
  for (const cat of categories) {
    const rows = cat.querySelectorAll('.layer-row');
    let anyVisible = false;
    for (const row of rows) {
      const match = !q || row.dataset.search.includes(q);
      row.style.display = match ? 'flex' : 'none';
      if (match) anyVisible = true;
    }
    cat.style.display = anyVisible ? 'block' : 'none';
    // Expand categories when searching
    if (q && anyVisible) {
      const items = cat.querySelector('.layer-category-items');
      if (items) items.style.display = 'block';
    }
  }
}

function syncPanelRow(key) {
  const panelChk = document.getElementById('panel-chk-' + key);
  if (panelChk) panelChk.checked = state[key]?.enabled || false;

  const pinBtn = document.getElementById('pin-btn-' + key);
  if (pinBtn) {
    const pinned = state[key]?.pinned || false;
    pinBtn.classList.toggle('pinned', pinned);
    pinBtn.textContent = pinned ? 'PINNED' : 'PIN';
  }

  // Keep pin bar checkbox in sync
  const barChk = document.getElementById('chk-' + key);
  if (barChk) barChk.checked = state[key]?.enabled || false;
}

// --- Public API ---

export function openLayerPanel() {
  const panel = document.getElementById('layer-panel');
  if (!panel) return;
  _panelOpen = !_panelOpen;
  panel.style.display = _panelOpen ? 'block' : 'none';
  if (_panelOpen) {
    buildPanel(); // rebuild to reflect latest state
    const search = document.getElementById('layer-search');
    if (search) { search.value = ''; search.focus(); }
  }
}

export function closeLayerPanel() {
  const panel = document.getElementById('layer-panel');
  if (panel) panel.style.display = 'none';
  _panelOpen = false;
}

export function refreshCatalog() {
  // Re-init state for any new catalog entries
  for (const entry of getCatalog()) {
    if (!state[entry.key]) {
      state[entry.key] = { enabled: entry.defaultOn || false, pinned: entry.defaultPinned || false };
    }
  }
  renderPinBar();
  if (_panelOpen) buildPanel();
}

export function isLayerEnabled(key) {
  return state[key]?.enabled || false;
}

export function setLayerEnabled(key, enabled) {
  setState(key, { enabled });
}

export function initLayerSelector({ toggleFn }) {
  _toggleFn = toggleFn;

  // Load persisted pin state (or defaults)
  const savedPins = loadPinnedKeys();
  const catalog = getCatalog();

  for (const entry of catalog) {
    const pinned = savedPins ? savedPins.includes(entry.key) : (entry.defaultPinned || false);
    state[entry.key] = {
      enabled: entry.defaultOn || false,
      pinned,
    };
  }

  // Build UI
  renderPinBar();

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!_panelOpen) return;
    const panel = document.getElementById('layer-panel');
    const toggle = document.getElementById('layer-panel-toggle');
    if (panel && !panel.contains(e.target) && toggle && !toggle.contains(e.target)) {
      closeLayerPanel();
    }
  });

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _panelOpen) closeLayerPanel();
  });
}
