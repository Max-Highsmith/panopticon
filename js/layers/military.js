/* ===================================================================
   PANOPTICON — Live Military Aircraft (ADS-B Exchange)
   =================================================================== */

import { API, REFRESH } from '../config.js';
import { extrapolate, $ } from '../utils.js';
import { entityMaps } from '../globe.js';
import { createLiveEntity, updateLiveEntity, removeLiveEntity, pruneStale, LIVE_STYLES } from './livelayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const entities = entityMaps.military;
let interval = null;

export async function fetchMilitary(viewer) {
  try {
    const res = await fetch(API.ADSB_MIL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const aircraft = data.ac || [];

    $('mil-count').textContent = aircraft.length;
    $('updated').textContent = new Date().toLocaleTimeString();

    const seen = new Set();
    const now = Date.now();

    for (const ac of aircraft) {
      if (ac.lat == null || ac.lon == null) continue;
      const hex = ac.hex;

      // Skip parked/taxiing aircraft
      const isGround = ac.alt_baro === 'ground';
      const altMeters = isGround ? 100 : (ac.alt_baro || 10000) * 0.3048;
      if (isGround || (altMeters < 50 && (!ac.gs || ac.gs < 5))) {
        if (entities.has(hex)) removeLiveEntity(viewer, entities, hex);
        continue;
      }

      seen.add(hex);
      const position = Cesium.Cartesian3.fromDegrees(ac.lon, ac.lat, altMeters);
      const callsign = (ac.flight || ac.r || hex).trim();

      if (entities.has(hex)) {
        const record = entities.get(hex);
        Object.assign(record, { lat: ac.lat, lon: ac.lon, alt: altMeters, gs: ac.gs, track: ac.track, timestamp: now });
        updateLiveEntity(record.entity, { position, heading: ac.track, callsign, acData: ac });
      } else {
        const entity = createLiveEntity(viewer, {
          position, heading: ac.track, callsign,
          layerKey: 'military', acData: ac, style: LIVE_STYLES.military,
        });
        entities.set(hex, { entity, trailEntity: null, lat: ac.lat, lon: ac.lon, alt: altMeters, gs: ac.gs, track: ac.track, timestamp: now });
      }
    }

    // Remove stale entries
    pruneStale(viewer, entities, seen);
  } catch (err) {
    console.error('Military fetch error:', err);
  }
}

export function startMilitary(viewer) {
  fetchMilitary(viewer);
  interval = setInterval(() => fetchMilitary(viewer), REFRESH.MILITARY_MS);
}

export function stopMilitary() {
  if (interval) { clearInterval(interval); interval = null; }
}

export function extrapolateMilitaryPositions() {
  const now = Date.now();
  for (const [, record] of entities) {
    if (record.timestamp) {
      const dtSec = (now - record.timestamp) / 1000;
      const { lat, lon } = extrapolate(record.lat, record.lon, record.gs, record.track, dtSec);
      record.entity.position = Cesium.Cartesian3.fromDegrees(lon, lat, record.alt);
    }
  }
}

registerLayerLoader('military', { load: fetchMilitary, reset: stopMilitary, view: 'plane', layerType: 'live' });
