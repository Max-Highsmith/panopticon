/* ===================================================================
   PANOPTICON — Live Commercial Aircraft (OpenSky Network)
   =================================================================== */

import { API, REFRESH } from '../config.js';
import { $ } from '../utils.js';
import { entityMaps } from '../globe.js';
import { createLiveEntity, updateLiveEntity, removeLiveEntity, pruneStale, LIVE_STYLES } from './livelayer.js';

const entities = entityMaps.commercial;
let interval = null;

// Compute a bounding box from the camera's current view rectangle,
// with generous padding so aircraft aren't popping in at edges.
function getViewBounds(viewer) {
  const rect = viewer.camera.computeViewRectangle();
  if (!rect) return null; // fallback: no culling
  const PAD = 0.35; // ~20 degrees padding
  return {
    lonMin: Cesium.Math.toDegrees(rect.west) - PAD * 180,
    lonMax: Cesium.Math.toDegrees(rect.east) + PAD * 180,
    latMin: Cesium.Math.toDegrees(rect.south) - PAD * 90,
    latMax: Cesium.Math.toDegrees(rect.north) + PAD * 90,
  };
}

export async function fetchCommercial(viewer) {
  try {
    const res = await fetch(API.OPENSKY);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const states = data.states || [];

    const seen = new Set();
    let count = 0;
    const bounds = getViewBounds(viewer);

    for (const s of states) {
      const hex = s[0];
      const lon = s[5], lat = s[6];
      if (lat == null || lon == null) continue;
      if (entityMaps.military.has(hex)) continue; // skip duplicates

      count++; // count total before culling

      // Viewport culling: skip entity creation for aircraft far outside view
      if (bounds && (lon < bounds.lonMin || lon > bounds.lonMax || lat < bounds.latMin || lat > bounds.latMax)) {
        if (entities.has(hex)) removeLiveEntity(viewer, entities, hex);
        continue;
      }

      seen.add(hex);

      const altMeters = s[7] ?? 10000 * 0.3048;
      const velocity = s[9];
      const track = s[10];
      const callsign = (s[1] || hex).trim();
      const onGround = s[8];

      // Skip parked/taxiing aircraft (on ground or very low & slow)
      if (onGround || (altMeters < 50 && (velocity == null || velocity < 5))) {
        if (entities.has(hex)) removeLiveEntity(viewer, entities, hex);
        continue;
      }

      const position = Cesium.Cartesian3.fromDegrees(lon, lat, altMeters);

      const acData = {
        hex, r: callsign, t: s[2] || '', flight: callsign,
        alt_baro: onGround ? 'ground' : Math.round(altMeters * 3.28084),
        gs: velocity != null ? Math.round(velocity * 1.94384) : null,
        track, squawk: s[14],
      };

      if (entities.has(hex)) {
        const record = entities.get(hex);
        updateLiveEntity(record.entity, { position, heading: track, callsign, acData });
      } else {
        const entity = createLiveEntity(viewer, {
          position, heading: track, callsign,
          layerKey: 'commercial', acData, style: LIVE_STYLES.commercial,
        });
        entities.set(hex, { entity });
      }
    }

    // Remove stale
    pruneStale(viewer, entities, seen);

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
