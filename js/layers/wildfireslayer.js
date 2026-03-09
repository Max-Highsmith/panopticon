/* ===================================================================
   PANOPTICON — Wildfires Layer (Active fire regions)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'wildfires',
  dataUrl: 'data/layers/points/wildfires.json',
  idPrefix: 'fire',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'wildfires-count',
  logLabel: 'WILDFIRES',
  flyTo: { lon: -100.0, lat: 40.0, alt: 20_000_000 },
  descFn: (item) =>
    `${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    active_region: { icon: 'wildfire', color: '#ff4400', label: 'WILDFIRE ZONE' },
  },
});

registerLayerLoader('wildfires', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/wildfires.json' });

export const fetchWildfires     = layer.load;
export const isWildfiresLoaded  = layer.isLoaded;
export const resetWildfires     = layer.reset;
export const WILDFIRES_FLY_TO   = layer.FLY_TO;
