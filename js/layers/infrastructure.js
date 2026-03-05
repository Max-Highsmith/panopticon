/* ===================================================================
   PANOPTICON — Infrastructure Layer (Datacenters + Nuclear Test Sites)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { $ } from '../utils.js';
import { icons } from '../icons.js';
import { layers, entityMaps } from '../globe.js';

const entities = entityMaps.infra;
let loaded = false;

export function isInfraLoaded() { return loaded; }
export function resetInfra()    { loaded = false; }

// US East Coast — densest cluster of datacenters (Ashburn corridor)
export const INFRA_FLY_TO = { lon: -77.0, lat: 39.0, alt: 8_000_000 };

export async function fetchInfra(viewer) {
  if (loaded) return;
  try {
    const res = await fetch('data/infrastructure.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const addPoints = (list, category, icon, color) => {
      for (const item of list) {
        const id = `${category}_${item.name}`;
        if (entities.has(id)) continue;

        const entity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(item.lon, item.lat, 500),
          billboard: {
            image: icon,
            width: DISPLAY.INFRA_ICON_SIZE,
            height: DISPLAY.INFRA_ICON_SIZE,
            alignedAxis: Cesium.Cartesian3.ZERO,
            disableDepthTestDistance: 0,
          },
          label: {
            text: item.name,
            font: '10px Courier New',
            fillColor: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(12, -3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3_000_000),
            scale: 0.8,
          },
        });
        entity.show = layers.infra;

        const desc = category === 'datacenter'
          ? `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`
          : `${item.country} // ${item.tests || '?'} tests // ${item.years || ''}${item.notes ? ' // ' + item.notes : ''}`;

        entity.acData = {
          hex: id,
          r: item.name,
          t: category === 'datacenter' ? 'DATACENTER' : 'NUCLEAR TEST SITE',
          flight: item.name,
          desc,
          alt_baro: 0,
          gs: 0,
          track: 0,
        };
        entities.set(id, { entity });
      }
    };

    addPoints(data.datacenters || [], 'datacenter', icons.datacenter, '#ff8800');
    addPoints(data.nuclear_tests || [], 'nuclear', icons.nuclear, '#ff2222');

    loaded = true;
    $('infra-count').textContent = entities.size;
    console.log(`INFRA: loaded ${entities.size} locations`);
  } catch (err) {
    console.error('INFRA fetch error:', err);
    $('infra-count').textContent = 'ERR';
  }
}
