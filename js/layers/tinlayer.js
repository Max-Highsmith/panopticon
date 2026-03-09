/* ===================================================================
   PANOPTICON — Tin Mining & Smelting Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'tin',
  dataUrl: 'data/layers/points/tin.json',
  idPrefix: 'tin',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'tin-count',
  logLabel: 'TIN',
  flyTo: { lon: 107.0, lat: -2.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralTin', color: '#aabb99', label: 'TIN MINE' },
  },
});

registerLayerLoader('tin', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/tin.json' });

export const fetchTin    = layer.load;
export const isTinLoaded = layer.isLoaded;
export const resetTin    = layer.reset;
export const TIN_FLY_TO  = layer.FLY_TO;
