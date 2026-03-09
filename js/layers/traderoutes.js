/* ===================================================================
   PANOPTICON — Global Trade Routes Layer (Path Layer)
   =================================================================== */

import { createPathLayer } from './pathlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createPathLayer({
  layerKey: 'traderoutes',
  layerType: 'path', dataUrl: 'data/layers/paths/trade_routes.json',
  idPrefix: 'trade',
  countId: 'traderoutes-count',
  logLabel: 'TRADE ROUTES',
  flyTo: { lon: 60.0, lat: 20.0, alt: 20_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    major: { color: '#ffcc00', width: 2, label: 'MAJOR TRADE ROUTE', clamp: true, alpha: 0.6 },
  },
});

registerLayerLoader('traderoutes', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, layerType: 'path', dataUrl: 'data/layers/paths/trade_routes.json' });

export const fetchTradeRoutes     = layer.load;
export const isTradeRoutesLoaded  = layer.isLoaded;
export const resetTradeRoutes     = layer.reset;
export const TRADE_ROUTES_FLY_TO  = layer.FLY_TO;
