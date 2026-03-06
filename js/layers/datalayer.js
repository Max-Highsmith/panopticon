/* ===================================================================
   PANOPTICON — Generic Data Layer Factory
   Shared logic for category-based point layers (mining, drilling, etc.)
   =================================================================== */

import { $ } from '../utils.js';
import { icons } from '../icons.js';
import { layers, entityMaps } from '../globe.js';

/**
 * Creates a lazy-loading Cesium point layer backed by a JSON data file.
 *
 * @param {Object} cfg
 * @param {string} cfg.layerKey      - Key into `layers` and `entityMaps`
 * @param {string} cfg.dataUrl       - URL of the JSON data file
 * @param {string} cfg.idPrefix      - Prefix for entity IDs (e.g. 'arctic', 'drill')
 * @param {Object} cfg.categories    - Map of data-key → { icon, color, label }
 * @param {Object} cfg.flyTo         - { lon, lat, alt } camera target
 * @param {number} cfg.iconSize      - Billboard size in pixels
 * @param {string} cfg.countId       - DOM element ID for the count display
 * @param {string} cfg.logLabel      - Console log prefix
 * @param {Function} [cfg.descFn]    - (item, category) → description string
 */
export function createDataLayer(cfg) {
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

      for (const [category, meta] of Object.entries(cfg.categories)) {
        for (const item of (data[category] || [])) {
          const id = `${cfg.idPrefix}_${category}_${item.name}`;
          if (entities.has(id)) continue;

          const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(item.lon, item.lat, 500),
            billboard: {
              image: icons[meta.icon],
              width: cfg.iconSize,
              height: cfg.iconSize,
              alignedAxis: Cesium.Cartesian3.ZERO,
              disableDepthTestDistance: 0,
            },
            label: {
              text: item.name,
              font: '10px Courier New',
              fillColor: Cesium.Color.fromCssColorString(meta.color),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(12, -3),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3_000_000),
              scale: 0.8,
            },
          });
          entity.show = layers[cfg.layerKey];
          entity.acData = {
            hex: id, r: item.name, t: meta.label, flight: item.name,
            desc: (cfg.descFn || defaultDesc)(item, category),
            alt_baro: 0, gs: 0, track: 0,
          };
          entities.set(id, { entity });
        }
      }

      loaded = true;
      $(cfg.countId).textContent = entities.size;
      console.log(`${cfg.logLabel}: loaded ${entities.size} sites`);
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
