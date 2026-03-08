/* ===================================================================
   PANOPTICON — Arctic Resource Deposits Layer (Region Layer)
   =================================================================== */

import { createRegionLayer } from './regionlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createRegionLayer({
  layerKey: 'arcticdeposits',
  dataUrl: 'data/arctic_deposits.json',
  idPrefix: 'adep',
  countId: 'arcticdeposits-count',
  logLabel: 'ARCTIC DEPOSITS',
  flyTo: { lon: 0.0, lat: 75.0, alt: 15_000_000 },
  descFn: (item) => item.notes || '',
  categories: {
    mineral_claim: { color: '#cc6633', alpha: 0.3, outline: '#aa4422', label: 'MINERAL CLAIM ZONE' },
  },
});

registerLayerLoader('arcticdeposits', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/arctic_deposits.json' });

export const fetchArcticDeposits     = layer.load;
export const isArcticDepositsLoaded  = layer.isLoaded;
export const resetArcticDeposits     = layer.reset;
export const ARCTIC_DEPOSITS_FLY_TO  = layer.FLY_TO;
