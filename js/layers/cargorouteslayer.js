/* ===================================================================
   PANOPTICON — Cargo Flight Routes Layer (Path Layer)
   =================================================================== */

import { createPathLayer } from './pathlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createPathLayer({
  layerKey: 'cargoroutes',
  layerType: 'path', dataUrl: 'data/layers/paths/cargo_routes.json',
  idPrefix: 'cargo',
  countId: 'cargoroutes-count',
  logLabel: 'CARGO ROUTES',
  flyTo: { lon: 0.0, lat: 35.0, alt: 25_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    cargo_air: { color: '#ff8800', width: 2, label: 'CARGO AIR ROUTE', clamp: false, alpha: 0.7 },
  },
});

registerLayerLoader('cargoroutes', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, layerType: 'path', dataUrl: 'data/layers/paths/cargo_routes.json' });

export const fetchCargoRoutes     = layer.load;
export const isCargoRoutesLoaded  = layer.isLoaded;
export const resetCargoRoutes     = layer.reset;
export const CARGO_ROUTES_FLY_TO  = layer.FLY_TO;
