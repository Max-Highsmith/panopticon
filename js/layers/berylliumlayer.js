/* ===================================================================
   PANOPTICON — Beryllium Mining/Production Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'beryllium',
  dataUrl: 'data/layers/points/beryllium.json',
  idPrefix: 'beryllium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'beryllium-count',
  logLabel: 'BERYLLIUM',
  flyTo: { lon: -105.0, lat: 40.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralBeryllium', color: '#aacc88', label: 'BERYLLIUM MINE' },
  },
});

registerLayerLoader('beryllium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/beryllium.json' });

export const fetchBeryllium    = layer.load;
export const isBerylliumLoaded = layer.isLoaded;
export const resetBeryllium    = layer.reset;
export const BERYLLIUM_FLY_TO  = layer.FLY_TO;
