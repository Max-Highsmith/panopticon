/* ===================================================================
   PANOPTICON — Scandium Production Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'scandium',
  dataUrl: 'data/layers/points/scandium.json',
  idPrefix: 'scandium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'scandium-count',
  logLabel: 'SCANDIUM',
  flyTo: { lon: 110.0, lat: 42.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralScandium', color: '#55ccaa', label: 'SCANDIUM SITE' },
  },
});

registerLayerLoader('scandium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/scandium.json' });

export const fetchScandium    = layer.load;
export const isScandiumLoaded = layer.isLoaded;
export const resetScandium    = layer.reset;
export const SCANDIUM_FLY_TO  = layer.FLY_TO;
