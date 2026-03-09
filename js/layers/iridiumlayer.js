/* ===================================================================
   PANOPTICON — Iridium Production Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'iridium',
  dataUrl: 'data/layers/points/iridium.json',
  idPrefix: 'iridium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'iridium-count',
  logLabel: 'IRIDIUM',
  flyTo: { lon: 27.0, lat: -25.5, alt: 15_000_000 },
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
    sites: { icon: 'mineralIridium', color: '#ccddee', label: 'IRIDIUM SITE' },
  },
});

registerLayerLoader('iridium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/iridium.json' });

export const fetchIridium    = layer.load;
export const isIridiumLoaded = layer.isLoaded;
export const resetIridium    = layer.reset;
export const IRIDIUM_FLY_TO  = layer.FLY_TO;
