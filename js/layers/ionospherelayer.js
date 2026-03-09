/* ===================================================================
   PANOPTICON — Ionospheric Observation Network Layer (Data Layer)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'ionosphere',
  dataUrl: 'data/layers/points/ionosphere.json',
  idPrefix: 'iono',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'ionosphere-count',
  logLabel: 'IONOSPHERE',
  flyTo: { lon: -145.15, lat: 62.39, alt: 20_000_000 },
  categories: {
    ionosonde:    { icon: 'ionoRadar',  color: '#44ffaa', label: 'IONOSONDE / ISR' },
    gnss_station: { icon: 'ionoGNSS',   color: '#44ccaa', label: 'GNSS/TEC STATION' },
  },
});

registerLayerLoader('ionosphere', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/ionosphere.json' });

export const fetchIonosphere     = layer.load;
export const isIonosphereLoaded  = layer.isLoaded;
export const resetIonosphere     = layer.reset;
export const IONOSPHERE_FLY_TO   = layer.FLY_TO;
