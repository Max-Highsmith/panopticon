/* ===================================================================
   PANOPTICON — Path (Polyline) Layer Factory
   For: subsea cables, pipelines, shipping routes, etc.
   =================================================================== */

import { $ } from '../utils.js';
import { layers, entityMaps } from '../globe.js';
import { cacheLayerData } from '../layerregistry.js';

/**
 * Creates a lazy-loading Cesium polyline layer backed by a JSON data file.
 *
 * @param {Object} cfg
 * @param {string} cfg.layerKey      - Key into `layers` and `entityMaps`
 * @param {string} cfg.dataUrl       - URL of the JSON data file
 * @param {string} cfg.idPrefix      - Prefix for entity IDs
 * @param {Object} cfg.categories    - Map of data-key → { color, width, label, clamp, alpha }
 * @param {Object} cfg.flyTo         - { lon, lat, alt } camera target
 * @param {string} cfg.countId       - DOM element ID for the count display
 * @param {string} cfg.logLabel      - Console log prefix
 * @param {Function} [cfg.descFn]    - (item, category) → description string
 *
 * Expected JSON format:
 * {
 *   "category_key": [
 *     { "name": "...", "coords": [[lon, lat], ...], "operator": "...", "country": "..." }
 *   ]
 * }
 */
export function createPathLayer(cfg) {
  const entities = entityMaps[cfg.layerKey];
  let loaded = false;

  const defaultDesc = (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`;

  async function load(viewer) {
    if (loaded) return;
    try {
      const res = await fetch(cfg.dataUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cacheLayerData(cfg.layerKey, data);

      for (const [category, meta] of Object.entries(cfg.categories)) {
        const color = Cesium.Color.fromCssColorString(meta.color).withAlpha(meta.alpha ?? 0.8);
        const width = meta.width ?? 2;

        for (const item of (data[category] || [])) {
          const id = `${cfg.idPrefix}_${category}_${item.name}`;
          if (entities.has(id)) continue;

          const positions = Cesium.Cartesian3.fromDegreesArray(item.coords.flat());

          // Polyline entity
          const entity = viewer.entities.add({
            polyline: {
              positions,
              width,
              material: color,
              clampToGround: meta.clamp !== false,
              disableDepthTestDistance: 0,
            },
          });
          entity.show = layers[cfg.layerKey];
          entity.acData = {
            hex: id, r: item.name, t: meta.label, flight: item.name,
            desc: (cfg.descFn || defaultDesc)(item, category),
            alt_baro: 0, gs: 0, track: 0,
            _view: cfg.viewType || 'site',
          };

          // Label at midpoint
          const mid = item.coords[Math.floor(item.coords.length / 2)];
          const labelEntity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(mid[0], mid[1], 0),
            label: {
              text: item.name,
              font: '10px Courier New',
              fillColor: Cesium.Color.fromCssColorString(meta.color),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -10),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3_000_000),
              scale: 0.8,
            },
          });
          labelEntity.show = layers[cfg.layerKey];

          entities.set(id, { entity, labelEntity });
        }
      }

      loaded = true;
      $(cfg.countId).textContent = entities.size;
      console.log(`${cfg.logLabel}: loaded ${entities.size} paths`);
    } catch (err) {
      console.error(`${cfg.logLabel} fetch error:`, err);
      $(cfg.countId).textContent = 'ERR';
    }
  }

  return {
    load,
    isLoaded: () => loaded,
    reset: () => { loaded = false; },
    FLY_TO: cfg.flyTo,
  };
}
