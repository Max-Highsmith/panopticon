/* ===================================================================
   PANOPTICON — Arctic Shipping Lanes Layer (Path Layer)
   =================================================================== */

import { createPathLayer } from './pathlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createPathLayer({
  layerKey: 'arcticroutes',
  layerType: 'path', dataUrl: 'data/layers/paths/arctic_routes.json',
  idPrefix: 'arcrt',
  countId: 'arcticroutes-count',
  logLabel: 'ARCTIC ROUTES',
  flyTo: { lon: 90.0, lat: 75.0, alt: 12_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    northern_sea_route: { color: '#ff4444', width: 3, label: 'NORTHERN SEA ROUTE', clamp: true, alpha: 0.8 },
    northwest_passage:  { color: '#44aaff', width: 2, label: 'NORTHWEST PASSAGE', clamp: true, alpha: 0.7 },
    transpolar:         { color: '#ffaa00', width: 2, label: 'TRANSPOLAR ROUTE', clamp: true, alpha: 0.5 },
  },
});

registerLayerLoader('arcticroutes', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, layerType: 'path', dataUrl: 'data/layers/paths/arctic_routes.json' });

export const fetchArcticRoutes     = layer.load;
export const isArcticRoutesLoaded  = layer.isLoaded;
export const resetArcticRoutes     = layer.reset;
export const ARCTIC_ROUTES_FLY_TO  = layer.FLY_TO;
