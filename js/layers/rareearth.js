/* ===================================================================
   PANOPTICON — Rare Earth Deposits Layer (USGS)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';

const layer = createDataLayer({
  layerKey: 'rareearth',
  dataUrl: 'data/rare_earth.json',
  idPrefix: 'ree',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'rareearth-count',
  logLabel: 'RARE EARTH',
  flyTo: { lon: 20.0, lat: 55.0, alt: 15_000_000 },
  categories: {
    heavy_rare_earth:   { icon: 'reeHeavy',    color: '#ff44cc', label: 'HEAVY REE DEPOSIT' },
    light_rare_earth:   { icon: 'reeLight',     color: '#cc88ff', label: 'LIGHT REE DEPOSIT' },
    strategic_minerals: { icon: 'reeStrategic', color: '#ffaa44', label: 'STRATEGIC MINERAL' },
  },
});

export const fetchRareEarth     = layer.load;
export const isRareEarthLoaded  = layer.isLoaded;
export const resetRareEarth     = layer.reset;
export const RARE_EARTH_FLY_TO  = layer.FLY_TO;
