/* ===================================================================
   PANOPTICON — Earthquakes Layer (Significant events + risk zones)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'earthquakes',
  dataUrl: 'data/earthquakes.json',
  idPrefix: 'quake',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'earthquakes-count',
  logLabel: 'EARTHQUAKES',
  flyTo: { lon: 0, lat: 20, alt: 25_000_000 },
  descFn: (item) =>
    `${item.country}${item.magnitude ? ' // M' + item.magnitude : ''}${item.depth_km ? ' // ' + item.depth_km + 'km depth' : ''}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    significant: { icon: 'earthquake', color: '#ff6600', label: 'EARTHQUAKE ZONE' },
  },
});

registerLayerLoader('earthquakes', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/earthquakes.json' });

export const fetchEarthquakes     = layer.load;
export const isEarthquakesLoaded  = layer.isLoaded;
export const resetEarthquakes     = layer.reset;
export const EARTHQUAKES_FLY_TO   = layer.FLY_TO;
