/* ===================================================================
   PANOPTICON — Ocean Temperature Anomalies Layer (Data Layer)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'oceantemp',
  dataUrl: 'data/ocean_temp.json',
  idPrefix: 'sst',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'oceantemp-count',
  logLabel: 'OCEAN TEMP',
  flyTo: { lon: -170.0, lat: 0.0, alt: 25_000_000 },
  categories: {
    warm_anomaly: { icon: 'tempWarm', color: '#ff4400', label: 'WARM ANOMALY' },
    cold_anomaly: { icon: 'tempCold', color: '#4488ff', label: 'COLD ANOMALY' },
  },
});

registerLayerLoader('oceantemp', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/ocean_temp.json' });

export const fetchOceanTemp     = layer.load;
export const isOceanTempLoaded  = layer.isLoaded;
export const resetOceanTemp     = layer.reset;
export const OCEAN_TEMP_FLY_TO  = layer.FLY_TO;
