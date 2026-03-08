/* ===================================================================
   PANOPTICON — Bird Migration Flyways Layer (Path Layer)
   =================================================================== */

import { createPathLayer } from './pathlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createPathLayer({
  layerKey: 'birds',
  dataUrl: 'data/bird_migration.json',
  idPrefix: 'bird',
  countId: 'birds-count',
  logLabel: 'BIRDS',
  flyTo: { lon: -30.0, lat: 30.0, alt: 25_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    flyway: { color: '#88cc44', width: 3, label: 'BIRD FLYWAY', clamp: true, alpha: 0.6 },
  },
});

registerLayerLoader('birds', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/bird_migration.json' });

export const fetchBirds     = layer.load;
export const isBirdsLoaded  = layer.isLoaded;
export const resetBirds     = layer.reset;
export const BIRDS_FLY_TO   = layer.FLY_TO;
