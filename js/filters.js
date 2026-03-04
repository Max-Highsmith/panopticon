/* ===================================================================
   PANOPTICON — Visual Filters (altitude-adaptive)
   =================================================================== */

let activeFilter = 'none';
let filterIntensity = 1;

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

export function setVisualFilter(filter, viewer) {
  document.body.classList.remove(...FILTER_CLASSES);
  activeFilter = filter;

  if (filter !== 'none') {
    document.body.classList.add('filter-' + filter);
  }

  document.querySelectorAll('#filter-bar button').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === (filter === 'none' ? 'OFF' : filter.toUpperCase()));
  });

  const fi = calcFilterIntensity(viewer);
  filterIntensity = fi;
  document.documentElement.style.setProperty('--fi', fi);
  applyFilterCSS(fi);
}

/**
 * Register a per-frame listener that adjusts filter intensity with camera altitude.
 */
export function initFilterUpdater(viewer) {
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
