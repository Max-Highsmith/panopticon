/* ===================================================================
   PANOPTICON — Cobalt Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'cobalt',
  dataUrl: 'data/layers/points/cobalt.json',
  idPrefix: 'cobalt',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'cobalt-count',
  logLabel: 'COBALT',
  flyTo: { lon: 26.0, lat: -10.7, alt: 8_000_000 },
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
    sites: { icon: 'mineralCobalt', color: '#cc44ff', label: 'COBALT MINE' },
  },
});

registerLayerLoader('cobalt', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/cobalt.json' });

export const fetchCobalt    = layer.load;
export const isCobaltLoaded = layer.isLoaded;
export const resetCobalt    = layer.reset;
export const COBALT_FLY_TO  = layer.FLY_TO;
