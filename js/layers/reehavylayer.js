/* ===================================================================
   PANOPTICON — Rare Earth Elements (Heavy) Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'reeheavy',
  dataUrl: 'data/layers/points/reeheavy.json',
  idPrefix: 'reeheavy',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'reeheavy-count',
  logLabel: 'REE HEAVY',
  flyTo: { lon: 110.0, lat: 25.0, alt: 15_000_000 },
  descFn: (item) => {
    const parts = [item.operator || '---', item.country || '---'];
    const details = [];
    if (item.status) details.push(`status: ${item.status}`);
    if (item.type) details.push(`type: ${item.type}`);
    if (item.products) details.push(`products: ${item.products.join(', ')}`);
    if (item.capacity_tpa) details.push(`capacity: ${item.capacity_tpa.toLocaleString()} tpa REO`);
    if (item.ownership) details.push(`ownership: ${item.ownership}`);
    if (item.grade) details.push(`grade: ${item.grade}`);
    if (item.notes) details.push(item.notes);
    parts.push(details.join(' | '));
    return parts.join(' // ');
  },
  categories: {
    sites: { icon: 'mineralReeHeavy', color: '#ff66cc', label: 'HEAVY REE MINE' },
  },
});

registerLayerLoader('reeheavy', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/reeheavy.json' });

export const fetchReeHeavy    = layer.load;
export const isReeHeavyLoaded = layer.isLoaded;
export const resetReeHeavy    = layer.reset;
export const REEHEAVY_FLY_TO  = layer.FLY_TO;
