/* ===================================================================
   PANOPTICON — Meteor Impact Sites & Bolide Events Layer (Data Layer)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'meteors',
  dataUrl: 'data/layers/points/meteor_impacts.json',
  idPrefix: 'mtr',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'meteors-count',
  logLabel: 'METEORS',
  flyTo: { lon: -89.52, lat: 21.40, alt: 20_000_000 },
  categories: {
    major_crater:  { icon: 'craterMajor',  color: '#aa6644', label: 'IMPACT CRATER' },
    recent_bolide: { icon: 'craterRecent', color: '#ff6600', label: 'RECENT BOLIDE' },
  },
});

registerLayerLoader('meteors', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/meteor_impacts.json' });

export const fetchMeteors     = layer.load;
export const isMeteorsLoaded  = layer.isLoaded;
export const resetMeteors     = layer.reset;
export const METEORS_FLY_TO   = layer.FLY_TO;
