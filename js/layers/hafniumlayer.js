/* ===================================================================
   PANOPTICON — Hafnium Production Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'hafnium',
  dataUrl: 'data/layers/points/hafnium.json',
  idPrefix: 'hafnium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'hafnium-count',
  logLabel: 'HAFNIUM',
  flyTo: { lon: 5.0, lat: 45.0, alt: 15_000_000 },
  descFn: (item) => {
    const parts = [
      item.operator || '---',
      item.country || '---',
    ];
    const details = [];
    if (item.status) details.push(`status: ${item.status}`);
    if (item.type) details.push(`type: ${item.type}`);
    if (item.products) details.push(`products: ${item.products.join(', ')}`);
    if (item.capacity_tpa) details.push(`capacity: ${item.capacity_tpa} tpa`);
    if (item.ownership) details.push(`ownership: ${item.ownership}`);
    if (item.notes) details.push(item.notes);
    parts.push(details.join(' | '));
    return parts.join(' // ');
  },
  categories: {
    sites: { icon: 'mineralHafnium', color: '#9988cc', label: 'HAFNIUM SITE' },
  },
});

registerLayerLoader('hafnium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/hafnium.json' });

export const fetchHafnium    = layer.load;
export const isHafniumLoaded = layer.isLoaded;
export const resetHafnium    = layer.reset;
export const HAFNIUM_FLY_TO  = layer.FLY_TO;
