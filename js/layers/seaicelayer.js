/* ===================================================================
   PANOPTICON — Sea Ice Extent Layer (Region Layer)
   =================================================================== */

import { createRegionLayer } from './regionlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createRegionLayer({
  layerKey: 'seaice',
  layerType: 'region', dataUrl: 'data/layers/regions/sea_ice.json',
  idPrefix: 'ice',
  countId: 'seaice-count',
  logLabel: 'SEA ICE',
  flyTo: { lon: 0.0, lat: 85.0, alt: 15_000_000 },
  descFn: (item) => item.notes || '',
  categories: {
    arctic_ice:    { color: '#aaddff', alpha: 0.35, outline: '#88bbff', label: 'ARCTIC ICE ZONE' },
    antarctic_ice: { color: '#ccddff', alpha: 0.35, outline: '#99bbff', label: 'ANTARCTIC ICE ZONE' },
  },
});

registerLayerLoader('seaice', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, layerType: 'region', dataUrl: 'data/layers/regions/sea_ice.json' });

export const fetchSeaIce     = layer.load;
export const isSeaIceLoaded  = layer.isLoaded;
export const resetSeaIce     = layer.reset;
export const SEA_ICE_FLY_TO  = layer.FLY_TO;
