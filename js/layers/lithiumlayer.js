/* ===================================================================
   PANOPTICON — Lithium Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'lithium',
  dataUrl: 'data/layers/points/lithium.json',
  idPrefix: 'lithium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'lithium-count',
  logLabel: 'LITHIUM',
  flyTo: { lon: -68.0, lat: -23.5, alt: 15_000_000 },
  descFn: (item) => {
    const parts = [
      item.operator || '---',
      item.country || '---',
    ];
    const details = [];
    if (item.status) details.push(`status: ${item.status}`);
    if (item.type) details.push(`type: ${item.type}`);
    if (item.products) details.push(`products: ${item.products.join(', ')}`);
    if (item.capacity_tpa) details.push(`capacity: ${item.capacity_tpa.toLocaleString()} tpa LCE`);
    if (item.ownership) details.push(`ownership: ${item.ownership}`);
    if (item.grade) details.push(`grade: ${item.grade}`);
    if (item.notes) details.push(item.notes);
    parts.push(details.join(' | '));
    return parts.join(' // ');
  },
  categories: {
    sites: { icon: 'mineralLithium', color: '#00ddcc', label: 'LITHIUM MINE' },
  },
});

registerLayerLoader('lithium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/lithium.json' });

export const fetchLithium    = layer.load;
export const isLithiumLoaded = layer.isLoaded;
export const resetLithium    = layer.reset;
export const LITHIUM_FLY_TO  = layer.FLY_TO;
