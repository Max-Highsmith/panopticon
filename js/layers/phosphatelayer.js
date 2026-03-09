/* ===================================================================
   PANOPTICON — Phosphate Rock Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'phosphate',
  dataUrl: 'data/layers/points/phosphate.json',
  idPrefix: 'phosphate',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'phosphate-count',
  logLabel: 'PHOSPHATE',
  flyTo: { lon: -8.0, lat: 32.0, alt: 15_000_000 },
  descFn: (item) => {
    const parts = [item.operator || '---', item.country || '---'];
    const details = [];
    if (item.status) details.push(`status: ${item.status}`);
    if (item.type) details.push(`type: ${item.type}`);
    if (item.products) details.push(`products: ${item.products.join(', ')}`);
    if (item.capacity_tpa) details.push(`capacity: ${item.capacity_tpa.toLocaleString()} tpa`);
    if (item.ownership) details.push(`ownership: ${item.ownership}`);
    if (item.grade) details.push(`grade: ${item.grade}`);
    if (item.notes) details.push(item.notes);
    parts.push(details.join(' | '));
    return parts.join(' // ');
  },
  categories: {
    sites: { icon: 'mineralPhosphate', color: '#ccaa44', label: 'PHOSPHATE MINE' },
  },
});

registerLayerLoader('phosphate', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/phosphate.json' });

export const fetchPhosphate    = layer.load;
export const isPhosphateLoaded = layer.isLoaded;
export const resetPhosphate    = layer.reset;
export const PHOSPHATE_FLY_TO  = layer.FLY_TO;
