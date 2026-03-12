/* ===================================================================
   PANOPTICON — Layer Registry
   Central registration, data caching, and query API for all data layers.
   Pure leaf module — no dependencies on other app modules.
   =================================================================== */

// Private state
const _loaders = new Map();    // key → { load, flyTo, reset, dataUrl, view, layerType, modalities }
const _dataCache = new Map();  // key → raw JSON object

// Default modalities inferred from layerType
const LAYER_TYPE_MODALITIES = {
  point:    ['text', 'geospatial'],
  path:     ['text', 'geospatial'],
  region:   ['text', 'geospatial'],
  live:     ['text', 'geospatial'],
  scenario: ['text', 'geospatial'],
  ambient:  ['text', 'structured_json'],
};

/**
 * Register a data layer's loader, flyTo target, and reset function.
 * Called at module scope by each layer file.
 *
 * Optional fields:
 *   view: string — which view type opens on click ('site', 'airport', 'webcam', 'satellite', 'plane')
 *   layerType: string — 'point', 'path', 'region', 'live', 'scenario', or 'ambient' (default 'point')
 *   modalities: string[] — override default modalities (e.g. ['text', 'image', 'video'] for camera feeds)
 */
export function registerLayerLoader(key, { load, flyTo, reset, dataUrl, view, layerType, modalities, show, hide, update }) {
  _loaders.set(key, {
    load, flyTo, reset, dataUrl,
    view: view || null,
    layerType: layerType || 'point',
    modalities: modalities || null,
    show: show || null, hide: hide || null, update: update || null,
  });
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
 * Returns { load, flyTo, reset, dataUrl, view, layerType } or null.
 */
export function getLoader(key) {
  return _loaders.get(key) || null;
}

/**
 * Get the raw JSON data for a layer (after it has been loaded).
 * Returns the original JSON object or null.
 */
export function getLayerData(key) {
  return _dataCache.get(key) || null;
}

/**
 * Reset all registered layers (calls each layer's reset function).
 */
export function resetAllLayers() {
  for (const [, loader] of _loaders) {
    if (loader.reset) loader.reset();
  }
}

/**
 * Get the layer type: 'point', 'path', 'region', 'live', 'scenario', or 'ambient'.
 * Returns 'point' as default if not specified.
 */
export function getLayerType(key) {
  return _loaders.get(key)?.layerType || 'point';
}

/**
 * Get the modalities for a layer.
 * Returns explicit modalities if set, otherwise infers from layerType.
 * @param {string} key — layer key
 * @returns {string[]} e.g. ['text', 'geospatial'] or ['text', 'image', 'video']
 */
export function getLayerModalities(key) {
  const loader = _loaders.get(key);
  if (loader?.modalities) return loader.modalities;
  return LAYER_TYPE_MODALITIES[loader?.layerType || 'point'] || ['text'];
}
