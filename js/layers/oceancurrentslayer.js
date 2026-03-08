/* ===================================================================
   PANOPTICON — Ocean Currents Layer (Path Layer)
   =================================================================== */

import { createPathLayer } from './pathlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createPathLayer({
  layerKey: 'oceancurrents',
  dataUrl: 'data/ocean_currents.json',
  idPrefix: 'curr',
  countId: 'oceancurrents-count',
  logLabel: 'OCEAN CURRENTS',
  flyTo: { lon: -40.0, lat: 30.0, alt: 25_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    major_current: { color: '#00bbff', width: 3, label: 'OCEAN CURRENT', clamp: true, alpha: 0.6 },
  },
});

registerLayerLoader('oceancurrents', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/ocean_currents.json' });

export const fetchOceanCurrents     = layer.load;
export const isOceanCurrentsLoaded  = layer.isLoaded;
export const resetOceanCurrents     = layer.reset;
export const OCEAN_CURRENTS_FLY_TO  = layer.FLY_TO;
