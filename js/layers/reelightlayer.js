/* ===================================================================
   PANOPTICON — Rare Earth Elements (Light) Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'reelight',
  dataUrl: 'data/layers/points/reelight.json',
  idPrefix: 'reelight',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'reelight-count',
  logLabel: 'REE LIGHT',
  flyTo: { lon: 110.0, lat: 40.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralReeLight', color: '#dd88ff', label: 'LIGHT REE MINE' },
  },
});

registerLayerLoader('reelight', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/reelight.json' });

export const fetchReeLight    = layer.load;
export const isReeLightLoaded = layer.isLoaded;
export const resetReeLight    = layer.reset;
export const REELIGHT_FLY_TO  = layer.FLY_TO;
