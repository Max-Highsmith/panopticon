/* ===================================================================
   PANOPTICON — Live Satellites (CelesTrak + satellite.js)
   =================================================================== */

import { API, LIMITS, SCENARIOS, DISPLAY } from '../config.js';
import { $ } from '../utils.js';
import { icons } from '../icons.js';
import { layers, entityMaps } from '../globe.js';

const entities = entityMaps.satellites;
let satRecords = [];
let satLoaded = false;
let footprintCounter = 0;

export function isSatLoaded() { return satLoaded; }
export function getSatRecords() { return satRecords; }

// --- TLE Loading ---

export async function loadSatellites() {
  try {
    const res = await fetch(API.CELESTRAK_TLE);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.trim().split('\n').map(l => l.trim());

    satRecords = [];
    for (let i = 0; i + 2 < lines.length; i += 3) {
      const name = lines[i];
      const line1 = lines[i + 1];
      const line2 = lines[i + 2];
      if (!line1.startsWith('1') || !line2.startsWith('2')) continue;
      try {
        const satrec = satellite.twoline2satrec(line1, line2);
        const noradId = line1.substring(2, 7).trim();
        satRecords.push({ name, satrec, noradId });
      } catch { /* skip bad TLE */ }
    }

    if (satRecords.length > LIMITS.MAX_SATELLITES) {
      satRecords = satRecords.slice(0, LIMITS.MAX_SATELLITES);
    }

    satLoaded = true;
    $('sat-count').textContent = satRecords.length;
    console.log(`Loaded ${satRecords.length} satellite TLEs (capped at ${LIMITS.MAX_SATELLITES})`);
  } catch (err) {
    console.error('CelesTrak fetch error:', err);
    $('sat-count').textContent = 'ERR';
  }
}

// --- Visibility Check (Earth Occlusion) ---

export function isSatelliteVisible(viewer, satPosition) {
  const camPos = viewer.camera.positionWC;
  const dx = satPosition.x - camPos.x;
  const dy = satPosition.y - camPos.y;
  const dz = satPosition.z - camPos.z;
  const a = dx * dx + dy * dy + dz * dz;
  const b = 2 * (camPos.x * dx + camPos.y * dy + camPos.z * dz);
  const R = LIMITS.EARTH_RADIUS_OCCLUDE;
  const c = camPos.x ** 2 + camPos.y ** 2 + camPos.z ** 2 - R * R;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return true;
  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  if ((t1 > 0.001 && t1 < 0.999) || (t2 > 0.001 && t2 < 0.999)) return false;
  if (t1 < 0 && t2 > 1) return false;
  return true;
}

// --- Entity Creation ---

export function createSatelliteEntities(viewer, activeScenario, atDate) {
  const t = atDate || new Date();
  const sc = SCENARIOS[activeScenario];
  const centerLon = sc ? sc.camera.lon : 0;
  const centerLat = sc ? sc.camera.lat : 0;

  for (const sat of satRecords) {
    try {
      const pv = satellite.propagate(sat.satrec, t);
      if (!pv.position || typeof pv.position.x !== 'number') continue;

      const gmst = satellite.gstime(t);
      const gd = satellite.eciToGeodetic(pv.position, gmst);
      const lon = satellite.degreesLong(gd.longitude);
      const lat = satellite.degreesLat(gd.latitude);
      const altM = gd.height * 1000;
      if (isNaN(lon) || isNaN(lat) || isNaN(altM)) continue;

      const position = Cesium.Cartesian3.fromDegrees(lon, lat, altM);
      const entity = viewer.entities.add({
        position,
        billboard: { image: icons.satYellow, width: DISPLAY.SAT_ICON_SIZE, height: DISPLAY.SAT_ICON_SIZE, alignedAxis: Cesium.Cartesian3.ZERO, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: { text: sat.name, font: '9px Courier New', fillColor: Cesium.Color.fromCssColorString('#ffaa00'), outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(8, -3), disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15_000_000), scale: 0.8 },
      });
      entity.show = isSatelliteVisible(viewer, position) && layers.satellites;
      entity.acData = { hex: sat.noradId, r: sat.name, t: 'SATELLITE', flight: sat.name, alt_baro: Math.round(gd.height * 3280.84), gs: null, track: null };

      const dLon = Math.abs(lon - centerLon);
      const dLat = Math.abs(lat - centerLat);
      const nearScenario = dLon < LIMITS.FOOTPRINT_RANGE_DEG && dLat < LIMITS.FOOTPRINT_RANGE_DEG;
      const orbitEntities    = nearScenario ? computeOrbitPath(viewer, sat.satrec, t) : [];
      const footprintEntities = nearScenario ? createSensorFootprint(viewer, lon, lat, altM) : [];

      entities.set(sat.noradId, { entity, satrec: sat.satrec, name: sat.name, orbitEntities, footprintEntities, lon, lat, altM });
    } catch { /* skip propagation failures */ }
  }
}

// --- Sensor Footprint ---

export function createSensorFootprint(viewer, lon, lat, altM) {
  const footprintEntities = [];
  const R = LIMITS.EARTH_RADIUS_M;
  const halfAngle = Math.atan(R * Math.sin(Math.acos(R / (R + altM))) / altM) * 0.6;
  const radiusDeg = Cesium.Math.toDegrees(halfAngle);

  // Nadir + 4 cone edges
  const positions = [lon, lat, altM, lon, lat, 0];
  for (const ang of [0, 90, 180, 270]) {
    const rad = Cesium.Math.toRadians(ang);
    const gLon = lon + radiusDeg * Math.cos(rad) / Math.cos(Cesium.Math.toRadians(lat));
    const gLat = lat + radiusDeg * Math.sin(rad);
    positions.push(lon, lat, altM, gLon, gLat, 0);
  }
  const coneEntity = viewer.entities.add({
    polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions), width: 1, material: Cesium.Color.fromCssColorString('#ffaa00').withAlpha(0.2), clampToGround: false },
  });
  coneEntity.show = layers.satellites;
  footprintEntities.push(coneEntity);

  // Ground circle
  const circlePoints = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * 2 * Math.PI;
    circlePoints.push(lon + radiusDeg * Math.cos(a) / Math.cos(Cesium.Math.toRadians(lat)), lat + radiusDeg * Math.sin(a));
  }
  const circleEntity = viewer.entities.add({
    polyline: { positions: Cesium.Cartesian3.fromDegreesArray(circlePoints), width: 1, material: Cesium.Color.fromCssColorString('#ffaa00').withAlpha(0.2), clampToGround: true },
  });
  circleEntity.show = layers.satellites;
  footprintEntities.push(circleEntity);

  return footprintEntities;
}

function updateSensorFootprint(viewer, record, lon, lat, altM, activeScenario) {
  if (record.footprintEntities) {
    record.footprintEntities.forEach(e => viewer.entities.remove(e));
  }
  const sc = SCENARIOS[activeScenario];
  const centerLon = sc ? sc.camera.lon : 0;
  const centerLat = sc ? sc.camera.lat : 0;
  const dLon = Math.abs(lon - centerLon);
  const dLat = Math.abs(lat - centerLat);
  record.footprintEntities = (dLon < LIMITS.FOOTPRINT_RANGE_DEG && dLat < LIMITS.FOOTPRINT_RANGE_DEG)
    ? createSensorFootprint(viewer, lon, lat, altM) : [];
  record.lon = lon;
  record.lat = lat;
  record.altM = altM;
}

// --- Orbit Path ---

function computeOrbitPath(viewer, satrec, now) {
  const periodMin = (2 * Math.PI) / satrec.no;
  const segments = [[]];
  let prevLon = null;
  const orbEntities = [];

  for (let i = 0; i <= 60; i++) {
    const t = new Date(now.getTime() + (i / 60) * periodMin * 60000);
    try {
      const pv = satellite.propagate(satrec, t);
      if (!pv.position || typeof pv.position.x !== 'number') continue;
      const gmst = satellite.gstime(t);
      const gd = satellite.eciToGeodetic(pv.position, gmst);
      const lon = satellite.degreesLong(gd.longitude);
      const lat = satellite.degreesLat(gd.latitude);
      const altM = gd.height * 1000;
      if (isNaN(lon) || isNaN(lat) || isNaN(altM)) continue;

      if (prevLon !== null && Math.abs(lon - prevLon) > 180) segments.push([]);
      segments[segments.length - 1].push(lon, lat, altM);
      prevLon = lon;
    } catch { /* skip */ }
  }

  for (const seg of segments) {
    if (seg.length < 6) continue;
    const e = viewer.entities.add({
      polyline: { positions: Cesium.Cartesian3.fromDegreesArrayHeights(seg), width: 1, material: Cesium.Color.fromCssColorString('#ffaa00').withAlpha(0.2), clampToGround: false },
    });
    e.show = layers.satellites;
    orbEntities.push(e);
  }

  return orbEntities;
}

// --- Position Updates ---

export function updateSatellitePositions(viewer, activeScenario, atDate) {
  const t = atDate || new Date();
  const gmst = satellite.gstime(t);
  footprintCounter++;
  const doFootprints = (footprintCounter % 60 === 0);

  for (const [, record] of entities) {
    try {
      const pv = satellite.propagate(record.satrec, t);
      if (!pv.position || typeof pv.position.x !== 'number') continue;
      const gd = satellite.eciToGeodetic(pv.position, gmst);
      const lon = satellite.degreesLong(gd.longitude);
      const lat = satellite.degreesLat(gd.latitude);
      const altM = gd.height * 1000;
      if (isNaN(lon) || isNaN(lat) || isNaN(altM)) continue;

      const satCartesian = Cesium.Cartesian3.fromDegrees(lon, lat, altM);
      record.entity.position = satCartesian;
      record.entity.acData.alt_baro = Math.round(gd.height * 3280.84);
      record.lon = lon;
      record.lat = lat;
      record.altM = altM;

      const visible = isSatelliteVisible(viewer, satCartesian) && layers.satellites;
      record.entity.show = visible;
      if (record.orbitEntities)    record.orbitEntities.forEach(e => e.show = visible);
      if (record.footprintEntities) record.footprintEntities.forEach(e => e.show = visible);

      if (doFootprints) updateSensorFootprint(viewer, record, lon, lat, altM, activeScenario);
    } catch { /* skip */ }
  }
}
