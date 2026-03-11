/* ===================================================================
   PANOPTICON — Ambient Layer Factory
   Shared logic for non-geographic sidebar panel layers.
   Manages a tabbed container — multiple layers share one sidebar
   with tabs to switch between them.
   =================================================================== */

import { cacheLayerData } from '../layerregistry.js';

// --- Shared tab state ---
const openLayers = new Map(); // layerKey → { panelId, label, color }
let activeTab = null;

function syncTabs() {
  const container = document.getElementById('ambient-container');
  const tabBar = document.getElementById('ambient-tabs');
  if (!container || !tabBar) return;

  if (openLayers.size === 0) {
    container.style.display = 'none';
    activeTab = null;
    return;
  }

  container.style.display = 'flex';

  // If active tab was removed, switch to first available
  if (!activeTab || !openLayers.has(activeTab)) {
    activeTab = openLayers.keys().next().value;
  }

  // Rebuild tab bar
  tabBar.innerHTML = '';
  for (const [key, info] of openLayers) {
    const tab = document.createElement('div');
    tab.className = 'ambient-tab' + (key === activeTab ? ' active' : '');
    tab.textContent = info.label;
    tab.style.setProperty('--tab-color', info.color);
    tab.addEventListener('click', () => {
      activeTab = key;
      syncTabs();
    });
    tabBar.appendChild(tab);
  }

  // Show only the active panel, hide others
  for (const [key, info] of openLayers) {
    const panel = document.getElementById(info.panelId);
    if (panel) panel.classList.toggle('active', key === activeTab);
  }
}

/**
 * Creates an ambient sidebar panel layer.
 *
 * @param {Object} cfg
 * @param {string} cfg.layerKey       - Registry key (e.g. 'kalshi')
 * @param {string} cfg.dataUrl        - URL of the static JSON data file
 * @param {string} cfg.panelId        - DOM ID for the panel element
 * @param {string} cfg.countId        - DOM element ID for count display
 * @param {string} cfg.logLabel       - Console log prefix
 * @param {string} cfg.tabLabel       - Short label for the tab bar
 * @param {string} [cfg.tabColor]     - Tab accent color (default '#ffaa00')
 * @param {Function} cfg.renderFn     - (panelContentEl, data) => void — renders panel body
 * @param {string}   [cfg.liveUrl]    - If set, polls this URL for live data
 * @param {number}   [cfg.livePollMs] - Poll interval in ms (default 60000)
 * @param {Function} [cfg.parseLiveFn] - (apiResponse) => data — transforms live API response
 * @param {Function} [cfg.countFn]     - (data) => string|number — returns count for stat chip
 */
export function createAmbientLayer(cfg) {
  let loaded = false;
  let data = null;
  let pollTimer = null;
  let visible = false;

  async function load() {
    if (loaded) return;
    try {
      const res = await fetch(cfg.dataUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      cacheLayerData(cfg.layerKey, data);
      loaded = true;
      updateCount();
      console.log(`${cfg.logLabel}: loaded static data`);
    } catch (err) {
      console.error(`${cfg.logLabel} fetch error:`, err);
    }
  }

  function updateCount() {
    const el = document.getElementById(cfg.countId);
    if (!el || !data) return;
    el.textContent = cfg.countFn ? cfg.countFn(data) : (data.markets?.length || '0');
  }

  function render() {
    const panel = document.getElementById(cfg.panelId);
    if (!panel || !data) return;
    const content = panel.querySelector('.ambient-content');
    if (content) cfg.renderFn(content, data);
  }

  async function fetchLive() {
    if (!cfg.liveUrl) return;
    try {
      const res = await fetch(cfg.liveUrl);
      if (!res.ok) return;
      const raw = await res.json();
      const liveData = cfg.parseLiveFn ? cfg.parseLiveFn(raw) : raw;
      if (liveData) {
        data = liveData;
        cacheLayerData(cfg.layerKey, data);
        updateCount();
        if (visible) render();
        console.log(`${cfg.logLabel}: live update`);
      }
    } catch {
      // CORS or network failure — fall back silently to static data
    }
  }

  function startPolling() {
    if (!cfg.liveUrl || pollTimer) return;
    fetchLive();
    pollTimer = setInterval(fetchLive, cfg.livePollMs || 60000);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function show() {
    visible = true;

    // Register in shared tab state
    openLayers.set(cfg.layerKey, {
      panelId: cfg.panelId,
      label: cfg.tabLabel || cfg.logLabel,
      color: cfg.tabColor || '#ffaa00',
    });
    activeTab = cfg.layerKey; // Switch to newly opened tab

    if (!loaded) {
      load().then(() => {
        render();
        syncTabs();
        startPolling();
      });
    } else {
      render();
      syncTabs();
      startPolling();
    }
  }

  function hide() {
    visible = false;
    openLayers.delete(cfg.layerKey);
    const panel = document.getElementById(cfg.panelId);
    if (panel) panel.classList.remove('active');
    syncTabs();
    stopPolling();
  }

  function reset() {
    loaded = false;
    data = null;
    hide();
  }

  /**
   * Push new data into the layer without fetching.
   * Useful for layers that display computed/dynamic state
   * rather than loading from a static file.
   */
  function update(newData) {
    data = newData;
    cacheLayerData(cfg.layerKey, newData);
    loaded = true;
    updateCount();
    if (visible) render();
  }

  return { load, show, hide, reset, update, isLoaded: () => loaded };
}
