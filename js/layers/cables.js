/* ===================================================================
   PANOPTICON — Submarine Internet Cables Layer (Path Layer)
   =================================================================== */

import { createPathLayer } from './pathlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createPathLayer({
  layerKey: 'cables',
  layerType: 'path', dataUrl: 'data/layers/paths/submarine_cables.json',
  idPrefix: 'cable',
  countId: 'cables-count',
  logLabel: 'CABLES',
  flyTo: { lon: -30.0, lat: 40.0, alt: 20_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    subsea: { color: '#00ff88', width: 2, label: 'SUBSEA CABLE', clamp: true, alpha: 0.7 },
  },
});

registerLayerLoader('cables', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, layerType: 'path', dataUrl: 'data/layers/paths/submarine_cables.json' });

export const fetchCables     = layer.load;
export const isCablesLoaded  = layer.isLoaded;
export const resetCables     = layer.reset;
export const CABLES_FLY_TO   = layer.FLY_TO;
