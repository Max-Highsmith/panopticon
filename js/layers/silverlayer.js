/* ===================================================================
   PANOPTICON — Silver Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'silver',
  dataUrl: 'data/layers/points/silver.json',
  idPrefix: 'silver',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'silver-count',
  logLabel: 'SILVER',
  flyTo: { lon: -103.0, lat: 23.0, alt: 15_000_000 },
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
    if (item.notes) details.push(item.notes);
    parts.push(details.join(' | '));
    return parts.join(' // ');
  },
  categories: {
    sites: { icon: 'mineralSilver', color: '#cccccc', label: 'SILVER MINE' },
  },
});

registerLayerLoader('silver', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/silver.json' });

export const fetchSilver    = layer.load;
export const isSilverLoaded = layer.isLoaded;
export const resetSilver    = layer.reset;
export const SILVER_FLY_TO  = layer.FLY_TO;
