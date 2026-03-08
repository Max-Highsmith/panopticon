/* ===================================================================
   PANOPTICON — Pipelines Layer (Oil + Gas) (Path Layer)
   =================================================================== */

import { createPathLayer } from './pathlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createPathLayer({
  layerKey: 'pipelines',
  dataUrl: 'data/pipelines.json',
  idPrefix: 'pipe',
  countId: 'pipelines-count',
  logLabel: 'PIPELINES',
  flyTo: { lon: 40.0, lat: 50.0, alt: 15_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    oil: { color: '#cc6600', width: 3, label: 'OIL PIPELINE', clamp: true, alpha: 0.8 },
    gas: { color: '#44aaff', width: 2, label: 'GAS PIPELINE', clamp: true, alpha: 0.7 },
  },
});

registerLayerLoader('pipelines', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/pipelines.json' });

export const fetchPipelines     = layer.load;
export const isPipelinesLoaded  = layer.isLoaded;
export const resetPipelines     = layer.reset;
export const PIPELINES_FLY_TO   = layer.FLY_TO;
