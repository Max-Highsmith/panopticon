/* ===================================================================
   PANOPTICON — Region (Polygon) Layer Factory
   For: territorial waters, conflict zones, EEZs, etc.
   =================================================================== */

import { $ } from '../utils.js';
import { layers, entityMaps } from '../globe.js';
import { cacheLayerData } from '../layerregistry.js';

/**
 * Creates a lazy-loading Cesium polygon layer backed by a JSON data file.
 *
 * @param {Object} cfg
 * @param {string} cfg.layerKey      - Key into `layers` and `entityMaps`
 * @param {string} cfg.dataUrl       - URL of the JSON data file
 * @param {string} cfg.idPrefix      - Prefix for entity IDs
 * @param {Object} cfg.categories    - Map of data-key → { fillColor, outlineColor, label, alpha }
 * @param {Object} cfg.flyTo         - { lon, lat, alt } camera target
 * @param {string} cfg.countId       - DOM element ID for the count display
 * @param {string} cfg.logLabel      - Console log prefix
 * @param {Function} [cfg.descFn]    - (item, category) → description string
 *
 * Expected JSON format:
 * {
 *   "category_key": [
 *     { "name": "...", "rings": [[[lon, lat], ...]], "country": "..." }
 *   ]
 * }
 *
 * rings[0] is the outer boundary; rings[1+] are holes.
 */
export function createRegionLayer(cfg) {
  const entities = entityMaps[cfg.layerKey];
  let loaded = false;

  const defaultDesc = (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`;

  // Compute centroid of a ring [[lon,lat], ...]
  function centroid(ring) {
    let lonSum = 0, latSum = 0;
    for (const [lon, lat] of ring) { lonSum += lon; latSum += lat; }
    return [lonSum / ring.length, latSum / ring.length];
  }

  async function load(viewer) {
    if (loaded) return;
    try {
      const res = await fetch(cfg.dataUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cacheLayerData(cfg.layerKey, data);

      for (const [category, meta] of Object.entries(cfg.categories)) {
        const fillColor = Cesium.Color.fromCssColorString(meta.fillColor).withAlpha(meta.alpha ?? 0.25);
        const outlineColor = Cesium.Color.fromCssColorString(meta.outlineColor || meta.fillColor);

        for (const item of (data[category] || [])) {
          const id = `${cfg.idPrefix}_${category}_${item.name}`;
          if (entities.has(id)) continue;

          const rings = item.rings || [item.coords ? [item.coords] : []];
          const outerRing = rings[0];
          if (!outerRing || outerRing.length < 3) continue;

          const hierarchy = new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(outerRing.flat()),
            rings.slice(1).map(hole =>
              new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(hole.flat()))
            ),
          );

          const entity = viewer.entities.add({
            polygon: {
              hierarchy,
              material: fillColor,
              outline: true,
              outlineColor,
              outlineWidth: 1,
            },
          });
          entity.show = layers[cfg.layerKey];
          entity.acData = {
            hex: id, r: item.name, t: meta.label, flight: item.name,
            desc: (cfg.descFn || defaultDesc)(item, category),
            alt_baro: 0, gs: 0, track: 0,
            _view: cfg.viewType || 'site',
          };

          // Label at centroid
          const [cLon, cLat] = centroid(outerRing);
          const labelEntity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(cLon, cLat, 0),
            label: {
              text: item.name,
              font: '11px Courier New',
              fillColor: outlineColor,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, 0),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5_000_000),
              scale: 0.9,
            },
          });
          labelEntity.show = layers[cfg.layerKey];

          entities.set(id, { entity, labelEntity });
        }
      }

      loaded = true;
      $(cfg.countId).textContent = entities.size;
      console.log(`${cfg.logLabel}: loaded ${entities.size} regions`);
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
