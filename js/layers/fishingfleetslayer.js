/* ===================================================================
   PANOPTICON — Fishing Fleet Zones Layer (Region Layer)
   =================================================================== */

import { createRegionLayer } from './regionlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createRegionLayer({
  layerKey: 'fishingfleets',
  layerType: 'region', dataUrl: 'data/layers/regions/fishing_fleets.json',
  idPrefix: 'ffleet',
  countId: 'fishingfleets-count',
  logLabel: 'FISHING FLEETS',
  flyTo: { lon: -170.0, lat: 55.0, alt: 20_000_000 },
  descFn: (item) => item.notes || '',
  categories: {
    industrial_ground: { color: '#00aacc', alpha: 0.25, outline: '#0088aa', label: 'FISHING GROUND' },
  },
});

registerLayerLoader('fishingfleets', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, layerType: 'region', dataUrl: 'data/layers/regions/fishing_fleets.json' });

export const fetchFishingFleets     = layer.load;
export const isFishingFleetsLoaded  = layer.isLoaded;
export const resetFishingFleets     = layer.reset;
export const FISHING_FLEETS_FLY_TO  = layer.FLY_TO;
