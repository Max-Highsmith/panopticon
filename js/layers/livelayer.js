/* ===================================================================
   PANOPTICON — Live Entity Helpers
   Shared create/update/remove for billboard+label moving entities.
   Each layer module owns its transport (polling/WebSocket) & filtering.
   =================================================================== */

import { DISPLAY } from '../config.js';
import { icons } from '../icons.js';
import { layers } from '../globe.js';

// --- Style presets (pre-computed Cesium colors to avoid per-entity allocation) ---

const _color = (css) => ({ css, cesium: Cesium.Color.fromCssColorString(css) });

export const LIVE_STYLES = {
  military: {
    icon: icons.planeMilLive,
    iconSize: DISPLAY.MIL_ICON_SIZE,
    _color: _color('#00ff41'),
    font: '11px Courier New',
    offset: [14, -4],
    maxDist: 8_000_000,
    labelScale: 0.9,
  },
  commercial: {
    icon: icons.planeBlue,
    iconSize: DISPLAY.CIV_ICON_SIZE,
    _color: _color('#4488ff'),
    font: '10px Courier New',
    offset: [10, -3],
    maxDist: 3_000_000,
    labelScale: 0.8,
  },
  ships: {
    icon: icons.shipBlue,
    iconSize: DISPLAY.SHIP_ICON_SIZE,
    _color: _color('#4488ff'),
    font: '10px Courier New',
    offset: [10, -3],
    maxDist: 2_000_000,
    labelScale: 0.8,
  },
};

// --- Helpers ---

/**
 * Create a new billboard+label entity for a moving object.
 * @returns {Cesium.Entity}
 */
export function createLiveEntity(viewer, { position, heading, callsign, layerKey, acData, style }) {
  const headingRad = heading != null ? Cesium.Math.toRadians(heading) : 0;
  const entity = viewer.entities.add({
    position,
    billboard: {
      image: style.icon,
      width: style.iconSize,
      height: style.iconSize,
      rotation: -headingRad,
      alignedAxis: Cesium.Cartesian3.ZERO,
      disableDepthTestDistance: 0,
    },
    label: {
      text: callsign,
      font: style.font,
      fillColor: style._color.cesium,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(style.offset[0], style.offset[1]),
      disableDepthTestDistance: 0,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, style.maxDist),
      scale: style.labelScale,
    },
  });
  entity.show = layers[layerKey];
  entity.acData = acData;
  return entity;
}

/**
 * Update an existing entity's position, heading, label, and acData.
 * All fields optional except acData.
 */
export function updateLiveEntity(entity, { position, heading, callsign, acData }) {
  if (position) entity.position = position;
  if (heading != null) entity.billboard.rotation = -Cesium.Math.toRadians(heading);
  if (callsign != null) entity.label.text = callsign;
  if (acData) entity.acData = acData;
}

/**
 * Remove one entity (and optional trail) from the viewer and entity map.
 */
export function removeLiveEntity(viewer, entityMap, id) {
  const record = entityMap.get(id);
  if (!record) return;
  viewer.entities.remove(record.entity);
  if (record.trailEntity) viewer.entities.remove(record.trailEntity);
  entityMap.delete(id);
}

/**
 * Reconcile: remove all entities whose IDs are NOT in the `seen` set.
 * Used by polling layers that get a full state snapshot each fetch.
 */
export function pruneStale(viewer, entityMap, seen) {
  for (const [id, record] of entityMap) {
    if (!seen.has(id)) {
      viewer.entities.remove(record.entity);
      if (record.trailEntity) viewer.entities.remove(record.trailEntity);
      entityMap.delete(id);
    }
  }
}

/**
 * Remove entities older than `maxAgeMs` based on record.lastUpdate.
 * Used by streaming layers (ships) that don't get full snapshots.
 */
export function pruneByAge(viewer, entityMap, maxAgeMs) {
  const cutoff = Date.now() - maxAgeMs;
  for (const [id, record] of entityMap) {
    if (record.lastUpdate < cutoff) {
      viewer.entities.remove(record.entity);
      if (record.trailEntity) viewer.entities.remove(record.trailEntity);
      entityMap.delete(id);
    }
  }
}
