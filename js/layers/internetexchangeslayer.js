/* ===================================================================
   PANOPTICON — Internet Exchange Points Layer (Data Layer)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'ixps',
  dataUrl: 'data/layers/points/internet_exchanges.json',
  idPrefix: 'ixp',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'ixps-count',
  logLabel: 'IXPs',
  flyTo: { lon: 8.68, lat: 50.11, alt: 20_000_000 },
  categories: {
    tier1:    { icon: 'ixpTier1',    color: '#00ff88', label: 'TIER-1 IXP' },
    regional: { icon: 'ixpRegional', color: '#44cc88', label: 'REGIONAL IXP' },
  },
});

registerLayerLoader('ixps', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/internet_exchanges.json' });

export const fetchIXPs     = layer.load;
export const isIXPsLoaded  = layer.isLoaded;
export const resetIXPs     = layer.reset;
export const IXPS_FLY_TO   = layer.FLY_TO;
