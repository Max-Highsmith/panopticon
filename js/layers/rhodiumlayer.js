/* ===================================================================
   PANOPTICON — Rhodium Production Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'rhodium',
  dataUrl: 'data/layers/points/rhodium.json',
  idPrefix: 'rhodium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'rhodium-count',
  logLabel: 'RHODIUM',
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
    sites: { icon: 'mineralRhodium', color: '#ddccbb', label: 'RHODIUM SITE' },
  },
});

registerLayerLoader('rhodium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/rhodium.json' });

export const fetchRhodium    = layer.load;
export const isRhodiumLoaded = layer.isLoaded;
export const resetRhodium    = layer.reset;
export const RHODIUM_FLY_TO  = layer.FLY_TO;
