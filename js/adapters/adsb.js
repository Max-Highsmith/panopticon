/* ===================================================================
   PANOPTICON — ADS-B Playback Adapter
   Renders historical ADS-B flight data on the timeline.
   Extracted from app.js replay logic.
   =================================================================== */

import { interpolateTrace } from '../utils.js';
import { icons } from '../icons.js';
import { layers, entityMaps } from '../globe.js';

// Pre-allocated color constants
const COLOR_MIL       = Cesium.Color.fromCssColorString('#00ff41');
const COLOR_CIV       = Cesium.Color.fromCssColorString('#4488ff');
const COLOR_MIL_TRAIL = COLOR_MIL.withAlpha(0.4);
const COLOR_CIV_TRAIL = COLOR_CIV.withAlpha(0.4);

const _seenHexes = new Set();

const adsbAdapter = {
  /** Load ADS-B trace data from manifest.data.file */
  async load(manifest) {
    const res = await fetch(manifest.data.file);
    const data = await res.json();
    return { data };
  },

  /** Total duration in seconds */
  getDurationSeconds(ctx, manifest) {
    return ctx.data.time_end_utc - ctx.data.time_start_utc;
  },

  /**
   * Render a frame at the given time offset.
   * @param {number} timeSeconds — seconds from start of playback
   * @returns {{ entityCount, timeLabel, localTimeLabel }}
   */
  renderFrame(ctx, manifest, viewer, entityMap, progress, timeSeconds) {
    const { data } = ctx;
    const absTime = data.time_start_utc + timeSeconds;

    _seenHexes.clear();
    let visibleCount = 0;

    for (const ac of data.aircraft) {
      if (ac.trace.length === 0) continue;
      if (absTime < ac.trace[0].t - 30 || absTime > ac.trace[ac.trace.length - 1].t + 30) continue;

      const pt = interpolateTrace(ac.trace, absTime);
      if (!pt || isNaN(pt.lat) || isNaN(pt.lon)) continue;

      const rawAlt = pt.alt === 'ground' ? 100 : (typeof pt.alt === 'number' && !isNaN(pt.alt) ? pt.alt : 10000);
      const altMeters = rawAlt * 0.3048;

      // Skip parked/taxiing aircraft
      if (pt.alt === 'ground' || (altMeters < 50 && (!pt.gs || pt.gs < 5))) continue;

      _seenHexes.add(ac.hex);
      visibleCount++;
      const position = Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, altMeters);
      const isMil = ac.mil;

      if (entityMap.has(ac.hex)) {
        const record = entityMap.get(ac.hex);
        record.entity.position = position;
        if (pt.track != null) record.entity.billboard.rotation = -Cesium.Math.toRadians(pt.track);
        const acd = record.entity.acData;
        if (acd) { acd.alt_baro = pt.alt; acd.gs = pt.gs; acd.track = pt.track; acd.lat = pt.lat; acd.lon = pt.lon; }

        const buf = record.trailCoords;
        buf.push(pt.lon, pt.lat, altMeters);
        if (buf.length > 600) buf.splice(0, 3);
        if (buf.length >= 6) {
          record.trailEntity.polyline.positions = Cesium.Cartesian3.fromDegreesArrayHeights(buf);
        }
      } else {
        const heading = pt.track != null ? Cesium.Math.toRadians(pt.track) : 0;
        const color = isMil ? COLOR_MIL : COLOR_CIV;
        const entity = viewer.entities.add({
          position,
          billboard: { image: isMil ? icons.planeGreen : icons.planeBlue, width: 42, height: 42, rotation: -heading, alignedAxis: Cesium.Cartesian3.ZERO, disableDepthTestDistance: 0 },
          label: { text: ac.r || ac.hex, font: '11px Courier New', fillColor: color, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(16, -4), disableDepthTestDistance: 0, distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8_000_000), scale: 0.9 },
        });
        entity.acData = { hex: ac.hex, r: ac.r, t: ac.t, flight: ac.r, alt_baro: pt.alt, gs: pt.gs, track: pt.track, desc: ac.desc, mil: isMil, _view: 'plane' };
        const layerVisible = isMil ? layers.military : layers.commercial;
        entity.show = layerVisible;
        const trailEntity = viewer.entities.add({
          polyline: { positions: [position], width: 1.5, material: (isMil ? COLOR_MIL_TRAIL : COLOR_CIV_TRAIL), clampToGround: false },
        });
        trailEntity.show = layerVisible;
        entityMap.set(ac.hex, { entity, trailEntity, trailCoords: [pt.lon, pt.lat, altMeters] });
      }
    }

    // Remove entities no longer visible
    for (const [hex, record] of entityMap) {
      if (!_seenHexes.has(hex)) {
        viewer.entities.remove(record.entity);
        if (record.trailEntity) viewer.entities.remove(record.trailEntity);
        entityMap.delete(hex);
      }
    }

    // Time labels
    const timeLabel = secsToUTCLabel(absTime);
    const localTimeLabel = secsToLocalLabel(absTime, manifest);

    return { entityCount: visibleCount, timeLabel, localTimeLabel };
  },

  /** ADS-B playbacks have no event feed (yet) */
  getEvents(ctx, progress) {
    return [];
  },

  /** Clear trail buffers on seek */
  onSeek(ctx, entityMap) {
    for (const [, record] of entityMap) {
      record.trailCoords.length = 0;
    }
  },

  /** Cleanup — remove all entities */
  cleanup(ctx, viewer, entityMap) {
    for (const [, record] of entityMap) {
      viewer.entities.remove(record.entity);
      if (record.trailEntity) viewer.entities.remove(record.trailEntity);
    }
    entityMap.clear();
  },
};

// --- Time formatting helpers (self-contained, no dependency on config SCENARIOS) ---

function secsToUTCLabel(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} UTC`;
}

function secsToLocalLabel(secs, manifest) {
  const tz = manifest.display?.localTz;
  if (!tz) return '';
  const local = secs + tz.offset * 3600;
  const h = Math.floor(((local % 86400) + 86400) % 86400 / 3600);
  const m = Math.floor((((local % 3600) + 3600) % 3600) / 60);
  const s = Math.floor(((local % 60) + 60) % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${tz.name}`;
}

export default adsbAdapter;
