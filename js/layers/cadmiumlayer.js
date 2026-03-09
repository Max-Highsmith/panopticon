/* ===================================================================
   PANOPTICON — Cadmium Production Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'cadmium',
  dataUrl: 'data/layers/points/cadmium.json',
  idPrefix: 'cadmium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'cadmium-count',
  logLabel: 'CADMIUM',
  flyTo: { lon: 113.0, lat: 28.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralCadmium', color: '#aa7755', label: 'CADMIUM SITE' },
  },
});

registerLayerLoader('cadmium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/cadmium.json' });

export const fetchCadmium    = layer.load;
export const isCadmiumLoaded = layer.isLoaded;
export const resetCadmium    = layer.reset;
export const CADMIUM_FLY_TO  = layer.FLY_TO;
