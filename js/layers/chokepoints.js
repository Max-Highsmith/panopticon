/* ===================================================================
   PANOPTICON — Shipping Chokepoints Layer (Region Layer)
   =================================================================== */

import { createRegionLayer } from './regionlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createRegionLayer({
  layerKey: 'chokepoints',
  dataUrl: 'data/chokepoints.json',
  idPrefix: 'choke',
  countId: 'chokepoints-count',
  logLabel: 'CHOKEPOINTS',
  flyTo: { lon: 50.0, lat: 26.0, alt: 20_000_000 },
  descFn: (item) =>
    `${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    chokepoint: { fillColor: '#ff4444', outlineColor: '#ff6666', label: 'SHIPPING CHOKEPOINT', alpha: 0.2 },
  },
});

registerLayerLoader('chokepoints', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/chokepoints.json' });

export const fetchChokepoints     = layer.load;
export const isChokepointsLoaded  = layer.isLoaded;
export const resetChokepoints     = layer.reset;
export const CHOKEPOINTS_FLY_TO   = layer.FLY_TO;
