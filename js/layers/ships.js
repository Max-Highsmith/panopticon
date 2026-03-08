/* ===================================================================
   PANOPTICON — Live AIS Ship Tracking
   =================================================================== */

import { API, LIMITS } from '../config.js';
import { $ } from '../utils.js';
import { entityMaps, clearLayer } from '../globe.js';
import { createLiveEntity, updateLiveEntity, pruneByAge, LIVE_STYLES } from './livelayer.js';

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
      const acData = { hex: mmsi, r: name, t: 'VESSEL', flight: name, alt_baro: 0, gs: sog, track: cog, _view: 'plane' };

      if (entities.has(mmsi)) {
        const record = entities.get(mmsi);
        updateLiveEntity(record.entity, { position, heading: cog, acData });
        record.lastUpdate = Date.now();
      } else {
        const entity = createLiveEntity(viewer, {
          position, heading: cog, callsign: name,
          layerKey: 'ships', acData, style: LIVE_STYLES.ships,
        });
        entities.set(mmsi, { entity, lastUpdate: Date.now() });
      }

      $('ship-count').textContent = entities.size;
    } catch { /* skip malformed messages */ }
  };

  socket.onclose = () => { socket = null; };
  socket.onerror = (e) => { console.error('AIS error:', e); };

  // Prune stale ships
  setInterval(() => {
    pruneByAge(viewer, entities, LIMITS.SHIP_STALE_MS);
    $('ship-count').textContent = entities.size;
  }, LIMITS.SHIP_PRUNE_INTERVAL);
}

export function stopAIS(viewer) {
  if (socket) { socket.close(); socket = null; }
  clearLayer(viewer, entities);
}
