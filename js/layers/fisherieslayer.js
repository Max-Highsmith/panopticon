/* ===================================================================
   PANOPTICON — Fisheries Zones Layer (Region Layer)
   =================================================================== */

import { createRegionLayer } from './regionlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createRegionLayer({
  layerKey: 'fisheries',
  layerType: 'region', dataUrl: 'data/layers/regions/fisheries_zones.json',
  idPrefix: 'fish',
  countId: 'fisheries-count',
  logLabel: 'FISHERIES',
  flyTo: { lon: -50.0, lat: 45.0, alt: 20_000_000 },
  descFn: (item) =>
    `${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    industrial: { fillColor: '#00aaff', outlineColor: '#44ccff', label: 'FISHERIES ZONE', alpha: 0.15 },
  },
});

registerLayerLoader('fisheries', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, layerType: 'region', dataUrl: 'data/layers/regions/fisheries_zones.json' });

export const fetchFisheries     = layer.load;
export const isFisheriesLoaded  = layer.isLoaded;
export const resetFisheries     = layer.reset;
export const FISHERIES_FLY_TO   = layer.FLY_TO;
