/* ===================================================================
   PANOPTICON — Natural Resource Mines Layer (Cobalt + Lithium)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { $ } from '../utils.js';
import { icons } from '../icons.js';
import { layers, entityMaps } from '../globe.js';

const entities = entityMaps.mines;
let loaded = false;

export function isMinesLoaded() { return loaded; }
export function resetMines()    { loaded = false; }

// DRC cobalt belt — densest cluster of mines
export const MINES_FLY_TO = { lon: 26.0, lat: -10.7, alt: 5_000_000 };

export async function fetchMines(viewer) {
  if (loaded) return;
  try {
    const res = await fetch('data/mines.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const addPoints = (list, mineral, icon) => {
      for (const m of list) {
        const id = `${mineral}_${m.name}`;
        if (entities.has(id)) continue;

        const entity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(m.lon, m.lat, 500),
          billboard: {
            image: icon,
            width: DISPLAY.MINE_ICON_SIZE,
            height: DISPLAY.MINE_ICON_SIZE,
            alignedAxis: Cesium.Cartesian3.ZERO,
            disableDepthTestDistance: 0,
          },
          label: {
            text: m.name,
            font: '10px Courier New',
            fillColor: Cesium.Color.fromCssColorString(
              mineral === 'cobalt' ? '#cc44ff' : mineral === 'bitcoin' ? '#f7931a' : '#00ddcc'
            ),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(12, -3),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3_000_000),
            scale: 0.8,
          },
        });
        entity.show = layers.mines;
        entity.acData = {
          hex: id,
          r: m.name,
          t: mineral.toUpperCase() + ' MINE',
          flight: m.name,
          desc: `${m.operator || ''} // ${m.country}${m.notes ? ' // ' + m.notes : ''}`,
          alt_baro: 0,
          gs: 0,
          track: 0,
        };
        entities.set(id, { entity });
      }
    };

    addPoints(data.cobalt || [], 'cobalt', icons.mineCobalt);
    addPoints(data.lithium || [], 'lithium', icons.mineLithium);
    addPoints(data.bitcoin || [], 'bitcoin', icons.mineBitcoin);

    loaded = true;
    $('mines-count').textContent = entities.size;
    console.log(`MINES: loaded ${entities.size} locations`);
  } catch (err) {
    console.error('MINES fetch error:', err);
    $('mines-count').textContent = 'ERR';
  }
}
