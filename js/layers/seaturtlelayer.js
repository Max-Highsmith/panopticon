/* ===================================================================
   PANOPTICON — Sea Turtle Migration Routes Layer (Path Layer)
   =================================================================== */

import { createPathLayer } from './pathlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createPathLayer({
  layerKey: 'seaturtles',
  dataUrl: 'data/sea_turtles.json',
  idPrefix: 'turtle',
  countId: 'seaturtles-count',
  logLabel: 'SEA TURTLES',
  flyTo: { lon: -60.0, lat: 20.0, alt: 20_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    migration_route: { color: '#00cc88', width: 2, label: 'SEA TURTLE MIGRATION', clamp: true, alpha: 0.7 },
  },
});

registerLayerLoader('seaturtles', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/sea_turtles.json' });

export const fetchSeaTurtles     = layer.load;
export const isSeaTurtlesLoaded  = layer.isLoaded;
export const resetSeaTurtles     = layer.reset;
export const SEA_TURTLES_FLY_TO  = layer.FLY_TO;
