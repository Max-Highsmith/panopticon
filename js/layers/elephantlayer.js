/* ===================================================================
   PANOPTICON — Elephant Migration Corridors Layer (Path Layer)
   =================================================================== */

import { createPathLayer } from './pathlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createPathLayer({
  layerKey: 'elephants',
  layerType: 'path', dataUrl: 'data/layers/paths/elephant_migration.json',
  idPrefix: 'eleph',
  countId: 'elephants-count',
  logLabel: 'ELEPHANTS',
  flyTo: { lon: 30.0, lat: -5.0, alt: 10_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    corridor: { color: '#cc8844', width: 3, label: 'ELEPHANT CORRIDOR', clamp: true, alpha: 0.8 },
  },
});

registerLayerLoader('elephants', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, layerType: 'path', dataUrl: 'data/layers/paths/elephant_migration.json' });

export const fetchElephants     = layer.load;
export const isElephantsLoaded  = layer.isLoaded;
export const resetElephants     = layer.reset;
export const ELEPHANTS_FLY_TO   = layer.FLY_TO;
