/* ===================================================================
   PANOPTICON — Pokemon GO PokéStop Layer (Static Point Layer)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'pokemon',
  dataUrl: 'data/layers/points/pokestops.json',
  idPrefix: 'pogo',
  iconSize: DISPLAY.POGO_ICON_SIZE,
  countId: 'pokemon-count',
  logLabel: 'POGO',
  flyTo: { lon: -74.0, lat: 40.75, alt: 20_000_000 },
  categories: {
    pokestops: { icon: 'pogo', color: '#ff4444', label: 'POKESTOP' },
  },
  descFn: (item) => `${item.city || ''} // ${item.country || ''}${item.notes ? ' // ' + item.notes : ''}`,
});

registerLayerLoader('pokemon', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/pokestops.json' });

export const fetchPogoStops    = layer.load;
export const isPogoLoaded      = layer.isLoaded;
export const resetPogo         = layer.reset;
export const POGO_FLY_TO       = layer.FLY_TO;
