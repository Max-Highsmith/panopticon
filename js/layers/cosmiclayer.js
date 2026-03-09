/* ===================================================================
   PANOPTICON — Cosmic Radiation Monitoring Stations Layer (Data Layer)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'cosmic',
  dataUrl: 'data/layers/points/cosmic_radiation.json',
  idPrefix: 'cosm',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'cosmic-count',
  logLabel: 'COSMIC',
  flyTo: { lon: 0.0, lat: 65.0, alt: 25_000_000 },
  categories: {
    neutron_monitor: { icon: 'cosmicMonitor', color: '#aa44ff', label: 'NEUTRON MONITOR' },
  },
});

registerLayerLoader('cosmic', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/cosmic_radiation.json' });

export const fetchCosmic     = layer.load;
export const isCosmicLoaded  = layer.isLoaded;
export const resetCosmic     = layer.reset;
export const COSMIC_FLY_TO   = layer.FLY_TO;
