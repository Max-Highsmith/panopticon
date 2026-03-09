/* ===================================================================
   PANOPTICON — Nickel Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'nickel',
  dataUrl: 'data/layers/points/nickel.json',
  idPrefix: 'nickel',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'nickel-count',
  logLabel: 'NICKEL',
  flyTo: { lon: 121.0, lat: -2.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralNickel', color: '#44cc88', label: 'NICKEL MINE' },
  },
});

registerLayerLoader('nickel', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/nickel.json' });

export const fetchNickel    = layer.load;
export const isNickelLoaded = layer.isLoaded;
export const resetNickel    = layer.reset;
export const NICKEL_FLY_TO  = layer.FLY_TO;
