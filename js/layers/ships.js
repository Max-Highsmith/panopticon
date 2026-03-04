/* ===================================================================
   PANOPTICON — Live AIS Ship Tracking
   =================================================================== */

import { API, LIMITS, DISPLAY } from '../config.js';
import { $ } from '../utils.js';
import { icons } from '../icons.js';
import { layers, entityMaps, clearLayer } from '../globe.js';

const entities = entityMaps.ships;
let socket = null;

export function startAIS(viewer) {
  if (socket) return;
  try {
    socket = new WebSocket(API.AIS_WS);
  } catch (e) {
    console.error('AIS WebSocket failed:', e);
    return;
  }

  socket.onopen = () => {
    socket.send(JSON.stringify({
      Apikey: API.AIS_KEY,
      BoundingBoxes: [[[-90, -180], [90, 180]]],
      FilterMessageTypes: ['PositionReport'],
    }));
    console.log('AIS stream connected');
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.MessageType !== 'PositionReport') return;

      const meta = msg.MetaData;
      const pos = msg.Message.PositionReport;
      if (!meta || !pos) return;

      const mmsi = String(meta.MMSI);
      const lat = meta.latitude;
      const lon = meta.longitude;
      if (lat === 0 && lon === 0) return;

      const name = (meta.ShipName || mmsi).trim();
      const sog = pos.Sog;
      const cog = pos.Cog;
      const position = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
      const acData = { hex: mmsi, r: name, t: 'VESSEL', flight: name, alt_baro: 0, gs: sog, track: cog };

      if (entities.has(mmsi)) {
        const record = entities.get(mmsi);
        record.entity.position = position;
        record.lastUpdate = Date.now();
        if (cog != null) record.entity.billboard.rotation = -Cesium.Math.toRadians(cog);
        record.entity.acData = acData;
      } else {
        const heading = cog != null ? Cesium.Math.toRadians(cog) : 0;
        const entity = viewer.entities.add({
          position,
          billboard: { image: icons.shipBlue, width: DISPLAY.SHIP_ICON_SIZE, height: DISPLAY.SHIP_ICON_SIZE, rotation: -heading, alignedAxis: Cesium.Cartesian3.ZERO, disableDepthTestDistance: 0 },
          label: { text: name, font: '10px Courier New', fillColor: Cesium.Color.fromCssColorString('#4488ff'), outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(10, -3), disableDepthTestDistance: 0, distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2_000_000), scale: 0.8 },
        });
        entity.show = layers.ships;
        entity.acData = acData;
        entities.set(mmsi, { entity, lastUpdate: Date.now() });
      }

      $('ship-count').textContent = entities.size;
    } catch { /* skip malformed messages */ }
  };

  socket.onclose = () => { socket = null; };
  socket.onerror = (e) => { console.error('AIS error:', e); };

  // Prune stale ships
  setInterval(() => {
    const cutoff = Date.now() - LIMITS.SHIP_STALE_MS;
    for (const [mmsi, record] of entities) {
      if (record.lastUpdate < cutoff) {
        viewer.entities.remove(record.entity);
        entities.delete(mmsi);
      }
    }
    $('ship-count').textContent = entities.size;
  }, LIMITS.SHIP_PRUNE_INTERVAL);
}

export function stopAIS(viewer) {
  if (socket) { socket.close(); socket = null; }
  clearLayer(viewer, entities);
}
