/* ===================================================================
   PANOPTICON — Volcanoes Layer (Active + Dormant)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'volcanoes',
  dataUrl: 'data/layers/points/volcanoes.json',
  idPrefix: 'volc',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'volcanoes-count',
  logLabel: 'VOLCANOES',
  flyTo: { lon: -155.0, lat: 19.4, alt: 20_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country} // ${item.elevation_m ? item.elevation_m + 'm' : ''}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    active:  { icon: 'volcanoActive',  color: '#ff4400', label: 'ACTIVE VOLCANO' },
    dormant: { icon: 'volcanoDormant', color: '#aa6644', label: 'DORMANT VOLCANO' },
  },
});

registerLayerLoader('volcanoes', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/volcanoes.json' });

export const fetchVolcanoes     = layer.load;
export const isVolcanoesLoaded  = layer.isLoaded;
export const resetVolcanoes     = layer.reset;
export const VOLCANOES_FLY_TO   = layer.FLY_TO;
