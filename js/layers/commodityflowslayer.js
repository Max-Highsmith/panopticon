/* ===================================================================
   PANOPTICON — Commodity Shipping Flows Layer (Path Layer)
   =================================================================== */

import { createPathLayer } from './pathlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createPathLayer({
  layerKey: 'commodityflows',
  layerType: 'path', dataUrl: 'data/layers/paths/commodity_flows.json',
  idPrefix: 'comm',
  countId: 'commodityflows-count',
  logLabel: 'COMMODITY FLOWS',
  flyTo: { lon: 60.0, lat: 15.0, alt: 25_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    oil_flow:       { color: '#cc4400', width: 3, label: 'OIL TRADE FLOW',       clamp: true, alpha: 0.7 },
    lng_flow:       { color: '#44aaff', width: 3, label: 'LNG TRADE FLOW',       clamp: true, alpha: 0.7 },
    grain_flow:     { color: '#ccaa00', width: 3, label: 'GRAIN TRADE FLOW',     clamp: true, alpha: 0.7 },
    container_flow: { color: '#00cc88', width: 3, label: 'CONTAINER TRADE FLOW', clamp: true, alpha: 0.7 },
  },
});

registerLayerLoader('commodityflows', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, layerType: 'path', dataUrl: 'data/layers/paths/commodity_flows.json' });

export const fetchCommodityFlows     = layer.load;
export const isCommodityFlowsLoaded  = layer.isLoaded;
export const resetCommodityFlows     = layer.reset;
export const COMMODITY_FLOWS_FLY_TO  = layer.FLY_TO;
