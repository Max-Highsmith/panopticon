/* ===================================================================
   PANOPTICON — Pokemon GO (POGO) POI Layer via Overpass API
   =================================================================== */

import { API, DISPLAY } from '../config.js';
import { $ } from '../utils.js';
import { icons } from '../icons.js';
import { layers, entityMaps } from '../globe.js';

const entities = entityMaps.pokemon;
let loaded = false;

export function isPogoLoaded() { return loaded; }
export function resetPogo()    { loaded = false; }

export async function fetchPogoStops(viewer) {
  if (loaded) return;
  try {
    const query = `[out:json][timeout:25];
(
  node["historic"="monument"](40.7,-74.05,40.85,-73.9);
  node["historic"="monument"](51.45,-0.2,51.55,0.05);
  node["historic"="monument"](35.6,139.7,35.75,139.8);
  node["historic"="monument"](48.82,2.28,48.9,2.4);
  node["historic"="monument"](33.95,-118.35,34.1,-118.2);
);
out 300;`;

    const res = await fetch(API.OVERPASS, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    for (const el of (data.elements || [])) {
      if (!el.lat || !el.lon) continue;
      const id = String(el.id);
      if (entities.has(id)) continue;

      const name = (el.tags && (el.tags.name || el.tags.description)) || 'PokéStop';
      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(el.lon, el.lat, 200),
        billboard: { image: icons.pogo, width: DISPLAY.POGO_ICON_SIZE, height: DISPLAY.POGO_ICON_SIZE, alignedAxis: Cesium.Cartesian3.ZERO, disableDepthTestDistance: 0 },
      });
      entity.show = layers.pokemon;
      entity.acData = { hex: id, r: name, t: 'POKESTOP', flight: name, alt_baro: 0, gs: 0, track: 0 };
      entities.set(id, { entity });
    }

    loaded = true;
    $('pogo-count').textContent = entities.size;
    console.log(`POGO: loaded ${entities.size} stops from Overpass`);
  } catch (err) {
    console.error('POGO fetch error:', err);
    $('pogo-count').textContent = 'ERR';
  }
}
