/* ===================================================================
   PANOPTICON — Airport Locations Layer (OurAirports data)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { $ } from '../utils.js';
import { icons } from '../icons.js';
import { layers, entityMaps } from '../globe.js';

const entities = entityMaps.airports;
let loaded = false;

export function isAirportsLoaded() { return loaded; }
export function resetAirports()    { loaded = false; }

export async function fetchAirports(viewer) {
  if (loaded) return;
  try {
    const res = await fetch('data/airports.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    for (const ap of (data.airports || [])) {
      const id = ap.icao || `${ap.lat}_${ap.lon}`;
      if (entities.has(id)) continue;

      const isLarge = ap.type === 'large_airport';
      const icon = isLarge ? icons.airportLarge : icons.airportMedium;
      const iconSize = isLarge ? DISPLAY.AIRPORT_ICON_SIZE_LG : DISPLAY.AIRPORT_ICON_SIZE_MD;
      const label = ap.iata || ap.icao || '';
      const elevMeters = (ap.elevation_ft || 0) * 0.3048;

      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(ap.lon, ap.lat, elevMeters + 100),
        billboard: {
          image: icon,
          width: iconSize,
          height: iconSize,
          alignedAxis: Cesium.Cartesian3.ZERO,
          disableDepthTestDistance: 0,
          distanceDisplayCondition: isLarge
            ? new Cesium.DistanceDisplayCondition(0, 15_000_000)
            : new Cesium.DistanceDisplayCondition(0, 3_000_000),
        },
        label: {
          text: label,
          font: '10px Courier New',
          fillColor: Cesium.Color.fromCssColorString('#00ccff'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(12, -3),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2_000_000),
          scale: 0.75,
        },
      });
      entity.show = layers.airports;
      entity.acData = {
        hex: id,
        r: ap.name,
        t: isLarge ? 'MAJOR AIRPORT' : 'AIRPORT',
        flight: label,
        desc: `${ap.name} // ${ap.country}${ap.iata ? ' // IATA: ' + ap.iata : ''}${ap.icao ? ' // ICAO: ' + ap.icao : ''}`,
        alt_baro: ap.elevation_ft || 0,
        gs: 0,
        track: 0,
      };
      entities.set(id, { entity });
    }

    loaded = true;
    $('airport-count').textContent = entities.size;
    console.log(`AIRPORTS: loaded ${entities.size} locations`);
  } catch (err) {
    console.error('AIRPORTS fetch error:', err);
    $('airport-count').textContent = 'ERR';
  }
}
