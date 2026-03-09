/* ===================================================================
   PANOPTICON — Platinum Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'platinum',
  dataUrl: 'data/layers/points/platinum.json',
  idPrefix: 'platinum',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'platinum-count',
  logLabel: 'PLATINUM',
  flyTo: { lon: 28.0, lat: -25.0, alt: 15_000_000 },
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
    if (item.grade) details.push(`grade: ${item.grade}`);
    if (item.notes) details.push(item.notes);
    parts.push(details.join(' | '));
    return parts.join(' // ');
  },
  categories: {
    sites: { icon: 'mineralPlatinum', color: '#ccccee', label: 'PLATINUM MINE' },
  },
});

registerLayerLoader('platinum', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/platinum.json' });

export const fetchPlatinum    = layer.load;
export const isPlatinumLoaded = layer.isLoaded;
export const resetPlatinum    = layer.reset;
export const PLATINUM_FLY_TO  = layer.FLY_TO;
