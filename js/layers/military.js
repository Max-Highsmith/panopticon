/* ===================================================================
   PANOPTICON — Live Military Aircraft (ADS-B Exchange)
   =================================================================== */

import { API, REFRESH, DISPLAY } from '../config.js';
import { extrapolate, $ } from '../utils.js';
import { icons } from '../icons.js';
import { layers, entityMaps } from '../globe.js';

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
      seen.add(hex);

      const altMeters = ac.alt_baro === 'ground' ? 100 : (ac.alt_baro || 10000) * 0.3048;
      const position = Cesium.Cartesian3.fromDegrees(ac.lon, ac.lat, altMeters);
      const callsign = (ac.flight || ac.r || hex).trim();

      if (entities.has(hex)) {
        const record = entities.get(hex);
        Object.assign(record, { lat: ac.lat, lon: ac.lon, alt: altMeters, gs: ac.gs, track: ac.track, timestamp: now });
        if (ac.track != null) record.entity.billboard.rotation = -Cesium.Math.toRadians(ac.track);
        record.entity.label.text = callsign;
        record.entity.acData = ac;
      } else {
        const heading = ac.track != null ? Cesium.Math.toRadians(ac.track) : 0;
        const entity = viewer.entities.add({
          position,
          billboard: { image: icons.planeMilLive, width: DISPLAY.MIL_ICON_SIZE, height: DISPLAY.MIL_ICON_SIZE, rotation: -heading, alignedAxis: Cesium.Cartesian3.ZERO, disableDepthTestDistance: 0 },
          label: { text: callsign, font: '11px Courier New', fillColor: Cesium.Color.fromCssColorString('#00ff41'), outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(14, -4), disableDepthTestDistance: 0, distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8_000_000), scale: 0.9 },
        });
        entity.show = layers.military;
        entity.acData = ac;
        entities.set(hex, { entity, trailEntity: null, lat: ac.lat, lon: ac.lon, alt: altMeters, gs: ac.gs, track: ac.track, timestamp: now });
      }
    }

    // Remove stale entries
    for (const [hex, record] of entities) {
      if (!seen.has(hex)) {
        viewer.entities.remove(record.entity);
        if (record.trailEntity) viewer.entities.remove(record.trailEntity);
        entities.delete(hex);
      }
    }
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
