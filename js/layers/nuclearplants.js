/* ===================================================================
   PANOPTICON — Nuclear Power Plants Layer (Active reactors worldwide)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'nuclearplants',
  dataUrl: 'data/layers/points/nuclear_plants.json',
  idPrefix: 'npp',
  iconSize: DISPLAY.INFRA_ICON_SIZE,
  countId: 'nuclearplants-count',
  logLabel: 'NUCLEAR PLANTS',
  flyTo: { lon: 2.0, lat: 48.0, alt: 10_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country} // ${item.reactors || '?'} reactors // ${item.capacity_mw ? item.capacity_mw + ' MW' : ''}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    active: { icon: 'nuclearPlant', color: '#ff4444', label: 'NUCLEAR POWER PLANT' },
  },
});

registerLayerLoader('nuclearplants', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/nuclear_plants.json' });

export const fetchNuclearPlants     = layer.load;
export const isNuclearPlantsLoaded  = layer.isLoaded;
export const resetNuclearPlants     = layer.reset;
export const NUCLEAR_PLANTS_FLY_TO  = layer.FLY_TO;
