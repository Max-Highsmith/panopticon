/* ===================================================================
   PANOPTICON — Magnesium Metal Production Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'magnesium',
  dataUrl: 'data/layers/points/magnesium.json',
  idPrefix: 'magnesium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'magnesium-count',
  logLabel: 'MAGNESIUM',
  flyTo: { lon: 105.0, lat: 35.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralMagnesium', color: '#99bb66', label: 'MAGNESIUM SITE' },
  },
});

registerLayerLoader('magnesium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/magnesium.json' });

export const fetchMagnesium    = layer.load;
export const isMagnesiumLoaded = layer.isLoaded;
export const resetMagnesium    = layer.reset;
export const MAGNESIUM_FLY_TO  = layer.FLY_TO;
