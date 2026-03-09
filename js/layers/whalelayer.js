/* ===================================================================
   PANOPTICON — Whale Migration Routes Layer (Path Layer)
   =================================================================== */

import { createPathLayer } from './pathlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createPathLayer({
  layerKey: 'whales',
  layerType: 'path', dataUrl: 'data/layers/paths/whale_migrations.json',
  idPrefix: 'whale',
  countId: 'whales-count',
  logLabel: 'WHALES',
  flyTo: { lon: -140.0, lat: 40.0, alt: 20_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    migration_route: { color: '#4488ff', width: 3, label: 'WHALE MIGRATION', clamp: true, alpha: 0.7 },
  },
});

registerLayerLoader('whales', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, layerType: 'path', dataUrl: 'data/layers/paths/whale_migrations.json' });

export const fetchWhales     = layer.load;
export const isWhalesLoaded  = layer.isLoaded;
export const resetWhales     = layer.reset;
export const WHALES_FLY_TO   = layer.FLY_TO;
