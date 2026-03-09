/* ===================================================================
   PANOPTICON — Lightning Hotspots Layer (Data Layer)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'lightning',
  dataUrl: 'data/layers/points/lightning.json',
  idPrefix: 'bolt',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'lightning-count',
  logLabel: 'LIGHTNING',
  flyTo: { lon: -71.58, lat: 9.40, alt: 20_000_000 },
  categories: {
    hotspot: { icon: 'lightning', color: '#ffff00', label: 'LIGHTNING HOTSPOT' },
  },
});

registerLayerLoader('lightning', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/lightning.json' });

export const fetchLightning     = layer.load;
export const isLightningLoaded  = layer.isLoaded;
export const resetLightning     = layer.reset;
export const LIGHTNING_FLY_TO   = layer.FLY_TO;
