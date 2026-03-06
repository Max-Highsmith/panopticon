/* ===================================================================
   PANOPTICON — Infrastructure Layer (Datacenters)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { $ } from '../utils.js';
import { icons } from '../icons.js';
import { layers, entityMaps } from '../globe.js';

const infraEntities   = entityMaps.infra;
const nuclearEntities = entityMaps.nuclear;
let infraLoaded   = false;
let nuclearLoaded = false;

export function isInfraLoaded()   { return infraLoaded; }
export function resetInfra()      { infraLoaded = false; }
export function isNuclearLoaded() { return nuclearLoaded; }
export function resetNuclear()    { nuclearLoaded = false; }

// US East Coast — densest cluster of datacenters (Ashburn corridor)
export const INFRA_FLY_TO   = { lon: -77.0, lat: 39.0, alt: 8_000_000 };
// Nevada Test Site area
export const NUCLEAR_FLY_TO = { lon: -116.0, lat: 37.0, alt: 12_000_000 };

// Shared data fetch (loads once, populates both layers)
let dataPromise = null;
function loadData() {
  if (!dataPromise) {
    dataPromise = fetch('data/infrastructure.json').then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
  }
  return dataPromise;
}

export async function fetchInfra(viewer) {
  if (infraLoaded) return;
  try {
    const data = await loadData();

    for (const item of (data.datacenters || [])) {
      const id = `datacenter_${item.name}`;
      if (infraEntities.has(id)) continue;

      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(item.lon, item.lat, 500),
        billboard: {
          image: icons.datacenter,
          width: DISPLAY.INFRA_ICON_SIZE,
          height: DISPLAY.INFRA_ICON_SIZE,
          alignedAxis: Cesium.Cartesian3.ZERO,
          disableDepthTestDistance: 0,
        },
        label: {
          text: item.name,
          font: '10px Courier New',
          fillColor: Cesium.Color.fromCssColorString('#ff8800'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(12, -3),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3_000_000),
          scale: 0.8,
        },
      });
      entity.show = layers.infra;
      entity.acData = {
        hex: id, r: item.name, t: 'DATACENTER', flight: item.name,
        desc: `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
        alt_baro: 0, gs: 0, track: 0,
      };
      infraEntities.set(id, { entity });
    }

    infraLoaded = true;
    $('infra-count').textContent = infraEntities.size;
    console.log(`INFRA: loaded ${infraEntities.size} datacenters`);
  } catch (err) {
    console.error('INFRA fetch error:', err);
    $('infra-count').textContent = 'ERR';
  }
}

export async function fetchNuclear(viewer) {
  if (nuclearLoaded) return;
  try {
    const data = await loadData();

    for (const item of (data.nuclear_tests || [])) {
      const id = `nuclear_${item.name}`;
      if (nuclearEntities.has(id)) continue;

      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(item.lon, item.lat, 500),
        billboard: {
          image: icons.nuclear,
          width: DISPLAY.INFRA_ICON_SIZE,
          height: DISPLAY.INFRA_ICON_SIZE,
          alignedAxis: Cesium.Cartesian3.ZERO,
          disableDepthTestDistance: 0,
        },
        label: {
          text: item.name,
          font: '10px Courier New',
          fillColor: Cesium.Color.fromCssColorString('#ff2222'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(12, -3),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3_000_000),
          scale: 0.8,
        },
      });
      entity.show = layers.nuclear;
      entity.acData = {
        hex: id, r: item.name, t: 'NUCLEAR TEST SITE', flight: item.name,
        desc: `${item.country} // ${item.tests || '?'} tests // ${item.years || ''}${item.notes ? ' // ' + item.notes : ''}`,
        alt_baro: 0, gs: 0, track: 0,
      };
      nuclearEntities.set(id, { entity });
    }

    nuclearLoaded = true;
    $('nuclear-count').textContent = nuclearEntities.size;
    console.log(`NUCLEAR: loaded ${nuclearEntities.size} test sites`);
  } catch (err) {
    console.error('NUCLEAR fetch error:', err);
    $('nuclear-count').textContent = 'ERR';
  }
}
