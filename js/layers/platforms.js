/* ===================================================================
   PANOPTICON — Offshore Oil Platforms Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'platforms',
  dataUrl: 'data/offshore_platforms.json',
  idPrefix: 'plat',
  iconSize: DISPLAY.INFRA_ICON_SIZE,
  countId: 'platforms-count',
  logLabel: 'PLATFORMS',
  flyTo: { lon: 2.0, lat: 58.0, alt: 6_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country} // ${item.field ? 'Field: ' + item.field : ''}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    platform: { icon: 'platform', color: '#ff8844', label: 'OFFSHORE PLATFORM' },
  },
});

registerLayerLoader('platforms', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/offshore_platforms.json' });

export const fetchPlatforms     = layer.load;
export const isPlatformsLoaded  = layer.isLoaded;
export const resetPlatforms     = layer.reset;
export const PLATFORMS_FLY_TO   = layer.FLY_TO;
