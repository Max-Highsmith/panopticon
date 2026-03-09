/* ===================================================================
   PANOPTICON — Titanium Mining/Production Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'titanium',
  dataUrl: 'data/layers/points/titanium.json',
  idPrefix: 'titanium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'titanium-count',
  logLabel: 'TITANIUM',
  flyTo: { lon: 80.0, lat: 10.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralTitanium', color: '#88aacc', label: 'TITANIUM MINE' },
  },
});

registerLayerLoader('titanium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/titanium.json' });

export const fetchTitanium    = layer.load;
export const isTitaniumLoaded = layer.isLoaded;
export const resetTitanium    = layer.reset;
export const TITANIUM_FLY_TO  = layer.FLY_TO;
