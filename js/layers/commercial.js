/* ===================================================================
   PANOPTICON — Live Commercial Aircraft (OpenSky Network)
   =================================================================== */

import { API, REFRESH, DISPLAY } from '../config.js';
import { $ } from '../utils.js';
import { icons } from '../icons.js';
import { layers, entityMaps } from '../globe.js';

const entities = entityMaps.commercial;
let interval = null;

export async function fetchCommercial(viewer) {
  try {
    const res = await fetch(API.OPENSKY);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const states = data.states || [];

    const seen = new Set();
    let count = 0;

    for (const s of states) {
      const hex = s[0];
      const lon = s[5], lat = s[6];
      if (lat == null || lon == null) continue;
      if (entityMaps.military.has(hex)) continue; // skip duplicates

      seen.add(hex);
      count++;

      const altMeters = s[7] ?? 10000 * 0.3048;
      const velocity = s[9];
      const track = s[10];
      const callsign = (s[1] || hex).trim();
      const onGround = s[8];
      const position = Cesium.Cartesian3.fromDegrees(lon, lat, onGround ? 100 : altMeters);

      const acData = {
        hex, r: callsign, t: s[2] || '', flight: callsign,
        alt_baro: onGround ? 'ground' : Math.round(altMeters * 3.28084),
        gs: velocity != null ? Math.round(velocity * 1.94384) : null,
        track, squawk: s[14],
      };

      if (entities.has(hex)) {
        const record = entities.get(hex);
        record.entity.position = position;
        if (track != null) record.entity.billboard.rotation = -Cesium.Math.toRadians(track);
        record.entity.acData = acData;
      } else {
        const heading = track != null ? Cesium.Math.toRadians(track) : 0;
        const entity = viewer.entities.add({
          position,
          billboard: { image: icons.planeBlue, width: DISPLAY.CIV_ICON_SIZE, height: DISPLAY.CIV_ICON_SIZE, rotation: -heading, alignedAxis: Cesium.Cartesian3.ZERO, disableDepthTestDistance: 0 },
          label: { text: callsign, font: '10px Courier New', fillColor: Cesium.Color.fromCssColorString('#4488ff'), outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(10, -3), disableDepthTestDistance: 0, distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3_000_000), scale: 0.8 },
        });
        entity.show = layers.commercial;
        entity.acData = acData;
        entities.set(hex, { entity });
      }
    }

    // Remove stale
    for (const [hex, record] of entities) {
      if (!seen.has(hex)) {
        viewer.entities.remove(record.entity);
        entities.delete(hex);
      }
    }

    $('civ-count').textContent = count;
  } catch (err) {
    console.error('OpenSky fetch error:', err);
    $('civ-count').textContent = 'ERR';
  }
}

export function startCommercial(viewer) {
  fetchCommercial(viewer);
  interval = setInterval(() => fetchCommercial(viewer), REFRESH.COMMERCIAL_MS);
}

export function stopCommercial() {
  if (interval) { clearInterval(interval); interval = null; }
}
