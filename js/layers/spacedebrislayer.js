/* ===================================================================
   PANOPTICON — Space Debris Layer (Major debris events)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'spacedebris',
  dataUrl: 'data/space_debris.json',
  idPrefix: 'debris',
  iconSize: DISPLAY.CUSTOM_ICON_SIZE,
  countId: 'spacedebris-count',
  logLabel: 'SPACE DEBRIS',
  flyTo: { lon: 0, lat: 0, alt: 25_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    major_debris: { icon: 'debris', color: '#888888', label: 'SPACE DEBRIS' },
  },
});

registerLayerLoader('spacedebris', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/space_debris.json' });

export const fetchSpaceDebris     = layer.load;
export const isSpaceDebrisLoaded  = layer.isLoaded;
export const resetSpaceDebris     = layer.reset;
export const SPACE_DEBRIS_FLY_TO  = layer.FLY_TO;
