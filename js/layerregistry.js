/* ===================================================================
   PANOPTICON — Layer Registry
   Central registration, data caching, and query API for all data layers.
   Pure leaf module — no dependencies on other app modules.
   =================================================================== */

// Private state
const _loaders = new Map();    // key → { load, flyTo, reset, dataUrl, view, geographic }
const _dataCache = new Map();  // key → raw JSON object

/**
 * Register a data layer's loader, flyTo target, and reset function.
 * Called at module scope by each layer file.
 *
 * Optional fields:
 *   view: string — which view type opens on click ('site', 'airport', 'webcam', 'satellite', 'plane')
 *   geographic: boolean — whether this layer renders on the globe (default true)
 */
export function registerLayerLoader(key, { load, flyTo, reset, dataUrl, view, geographic }) {
  _loaders.set(key, { load, flyTo, reset, dataUrl, view: view || null, geographic: geographic !== false });
}

/**
 * Store the raw JSON data after a layer fetches it.
 * Called by factory functions (datalayer, pathlayer, regionlayer) after fetch.
 */
export function cacheLayerData(key, rawData) {
  _dataCache.set(key, rawData);
}

/**
 * Get the registered loader for a layer key.
 * Returns { load, flyTo, reset, dataUrl } or null.
 */
export function getLoader(key) {
  return _loaders.get(key) || null;
}

/**
 * Check if a loader is registered for a given key.
 */
export function hasLoader(key) {
  return _loaders.has(key);
}

/**
 * Get the raw JSON data for a layer (after it has been loaded).
 * Returns the original JSON object or null.
 */
export function getLayerData(key) {
  return _dataCache.get(key) || null;
}

/**
 * Check if a layer's data has been cached.
 */
export function isLayerDataCached(key) {
  return _dataCache.has(key);
}

/**
 * Reset all registered layers (calls each layer's reset function).
 * Replaces the 35+ manual resetXxx() calls in app.js stopLive().
 */
export function resetAllLayers() {
  for (const [, loader] of _loaders) {
    if (loader.reset) loader.reset();
  }
}

/**
 * Get all registered layer keys.
 */
export function getRegisteredKeys() {
  return Array.from(_loaders.keys());
}

/**
 * Get all layers whose data has been cached.
 */
export function getCachedLayerKeys() {
  return Array.from(_dataCache.keys());
}

/**
 * Get the declared view type for a layer's entities.
 * Returns string (e.g. 'site', 'airport') or null.
 */
export function getViewForLayer(key) {
  return _loaders.get(key)?.view || null;
}

/**
 * Check if a layer is geographic (rendered on the globe).
 * Non-geographic layers (markets, prices) render as sidebar panels.
 */
export function isLayerGeographic(key) {
  const loader = _loaders.get(key);
  return loader ? loader.geographic : true;
}
