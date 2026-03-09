/* ===================================================================
   PANOPTICON — Electrical Grid Network Layer (Path Layer)
   Major HVDC transmission lines
   =================================================================== */

import { createPathLayer } from './pathlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createPathLayer({
  layerKey: 'electricalgrid',
  layerType: 'path', dataUrl: 'data/layers/paths/electrical_grid.json',
  idPrefix: 'grid',
  countId: 'electricalgrid-count',
  logLabel: 'ELECTRICAL GRID',
  flyTo: { lon: 10.0, lat: 50.0, alt: 15_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    transmission: { color: '#ffff00', width: 2, label: 'HVDC TRANSMISSION', clamp: true, alpha: 0.7 },
  },
});

registerLayerLoader('electricalgrid', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, layerType: 'path', dataUrl: 'data/layers/paths/electrical_grid.json' });

export const fetchElectricalGrid     = layer.load;
export const isElectricalGridLoaded  = layer.isLoaded;
export const resetElectricalGrid     = layer.reset;
export const ELECTRICAL_GRID_FLY_TO  = layer.FLY_TO;
