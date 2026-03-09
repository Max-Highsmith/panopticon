/* ===================================================================
   PANOPTICON — Molybdenum Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'molybdenum',
  dataUrl: 'data/layers/points/molybdenum.json',
  idPrefix: 'molybdenum',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'molybdenum-count',
  logLabel: 'MOLYBDENUM',
  flyTo: { lon: -106.0, lat: 39.0, alt: 15_000_000 },
  descFn: (item) => {
    const parts = [
      item.operator || '---',
      item.country || '---',
    ];
    const details = [];
    if (item.status) details.push(`status: ${item.status}`);
    if (item.type) details.push(`type: ${item.type}`);
    if (item.products) details.push(`products: ${item.products.join(', ')}`);
    if (item.capacity_tpa) details.push(`capacity: ${item.capacity_tpa.toLocaleString()} tpa`);
    if (item.ownership) details.push(`ownership: ${item.ownership}`);
    if (item.notes) details.push(item.notes);
    parts.push(details.join(' | '));
    return parts.join(' // ');
  },
  categories: {
    sites: { icon: 'mineralMolybdenum', color: '#4466aa', label: 'MOLYBDENUM MINE' },
  },
});

registerLayerLoader('molybdenum', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/molybdenum.json' });

export const fetchMolybdenum    = layer.load;
export const isMolybdenumLoaded = layer.isLoaded;
export const resetMolybdenum    = layer.reset;
export const MOLYBDENUM_FLY_TO  = layer.FLY_TO;
