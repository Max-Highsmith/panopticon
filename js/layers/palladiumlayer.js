/* ===================================================================
   PANOPTICON — Palladium Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'palladium',
  dataUrl: 'data/layers/points/palladium.json',
  idPrefix: 'palladium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'palladium-count',
  logLabel: 'PALLADIUM',
  flyTo: { lon: 50.0, lat: 62.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralPalladium', color: '#bbbbdd', label: 'PALLADIUM MINE' },
  },
});

registerLayerLoader('palladium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/palladium.json' });

export const fetchPalladium    = layer.load;
export const isPalladiumLoaded = layer.isLoaded;
export const resetPalladium    = layer.reset;
export const PALLADIUM_FLY_TO  = layer.FLY_TO;
