/* ===================================================================
   PANOPTICON — Spaceports & Launch Sites Layer (Data Layer)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'spaceports',
  dataUrl: 'data/spaceports.json',
  idPrefix: 'launch',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'spaceports-count',
  logLabel: 'SPACEPORTS',
  flyTo: { lon: -80.6, lat: 28.6, alt: 20_000_000 },
  categories: {
    active:   { icon: 'rocketActive',   color: '#ff4400', label: 'ACTIVE LAUNCH SITE' },
    historic: { icon: 'rocketHistoric', color: '#888888', label: 'HISTORIC LAUNCH SITE' },
  },
});

registerLayerLoader('spaceports', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/spaceports.json' });

export const fetchSpaceports     = layer.load;
export const isSpaceportsLoaded  = layer.isLoaded;
export const resetSpaceports     = layer.reset;
export const SPACEPORTS_FLY_TO   = layer.FLY_TO;
