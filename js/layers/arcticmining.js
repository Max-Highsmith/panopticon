/* ===================================================================
   PANOPTICON — Arctic Mining Sites Layer (GEUS / Various)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'arcticmining',
  dataUrl: 'data/layers/points/arctic_mining.json',
  idPrefix: 'arctic',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'arcticmining-count',
  logLabel: 'ARCTIC MINING',
  flyTo: { lon: -42.0, lat: 66.0, alt: 8_000_000 },
  categories: {
    iron:       { icon: 'mineIron',      color: '#cc6633', label: 'IRON MINE' },
    rare_earth: { icon: 'mineRareEarth', color: '#ff44cc', label: 'RARE EARTH MINE' },
    zinc:       { icon: 'mineZinc',      color: '#88aadd', label: 'ZINC MINE' },
    gold:       { icon: 'mineGold',      color: '#ffcc00', label: 'GOLD MINE' },
  },
});

registerLayerLoader('arcticmining', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/arctic_mining.json' });

export const fetchArcticMining     = layer.load;
export const isArcticMiningLoaded  = layer.isLoaded;
export const resetArcticMining     = layer.reset;
export const ARCTIC_MINING_FLY_TO  = layer.FLY_TO;
