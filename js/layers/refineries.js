/* ===================================================================
   PANOPTICON — Oil Refineries Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'refineries',
  dataUrl: 'data/oil_refineries.json',
  idPrefix: 'refinery',
  iconSize: DISPLAY.INFRA_ICON_SIZE,
  countId: 'refineries-count',
  logLabel: 'REFINERIES',
  flyTo: { lon: 70.0, lat: 22.2, alt: 8_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country} // ${item.capacity_bpd ? item.capacity_bpd.toLocaleString() + ' bpd' : ''}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    refinery: { icon: 'refinery', color: '#ff6600', label: 'OIL REFINERY' },
  },
});

registerLayerLoader('refineries', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/oil_refineries.json' });

export const fetchRefineries     = layer.load;
export const isRefineriesLoaded  = layer.isLoaded;
export const resetRefineries     = layer.reset;
export const REFINERIES_FLY_TO   = layer.FLY_TO;
