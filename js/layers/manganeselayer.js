/* ===================================================================
   PANOPTICON — Manganese Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'manganese',
  dataUrl: 'data/layers/points/manganese.json',
  idPrefix: 'manganese',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'manganese-count',
  logLabel: 'MANGANESE',
  flyTo: { lon: 27.0, lat: -27.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralManganese', color: '#cc6688', label: 'MANGANESE MINE' },
  },
});

registerLayerLoader('manganese', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/manganese.json' });

export const fetchManganese    = layer.load;
export const isManganeseLoaded = layer.isLoaded;
export const resetManganese    = layer.reset;
export const MANGANESE_FLY_TO  = layer.FLY_TO;
