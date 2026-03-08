/* ===================================================================
   PANOPTICON — Power Plants Layer (Coal, Gas, Hydro, Solar, Wind)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'powerplants',
  dataUrl: 'data/power_plants.json',
  idPrefix: 'power',
  iconSize: DISPLAY.INFRA_ICON_SIZE,
  countId: 'powerplants-count',
  logLabel: 'POWER PLANTS',
  flyTo: { lon: 111.0, lat: 30.8, alt: 8_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country} // ${item.capacity_mw ? item.capacity_mw + ' MW' : ''}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    coal:  { icon: 'powerCoal',  color: '#aa6633', label: 'COAL POWER PLANT' },
    gas:   { icon: 'powerGas',   color: '#cc8844', label: 'GAS POWER PLANT' },
    hydro: { icon: 'powerHydro', color: '#4488ff', label: 'HYDRO POWER PLANT' },
    solar: { icon: 'powerSolar', color: '#ffcc00', label: 'SOLAR POWER PLANT' },
    wind:  { icon: 'powerWind',  color: '#66ccaa', label: 'WIND POWER PLANT' },
  },
});

registerLayerLoader('powerplants', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/power_plants.json' });

export const fetchPowerPlants     = layer.load;
export const isPowerPlantsLoaded  = layer.isLoaded;
export const resetPowerPlants     = layer.reset;
export const POWER_PLANTS_FLY_TO  = layer.FLY_TO;
