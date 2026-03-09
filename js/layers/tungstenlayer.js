/* ===================================================================
   PANOPTICON — Tungsten Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'tungsten',
  dataUrl: 'data/layers/points/tungsten.json',
  idPrefix: 'tungsten',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'tungsten-count',
  logLabel: 'TUNGSTEN',
  flyTo: { lon: 105.0, lat: 28.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralTungsten', color: '#9999bb', label: 'TUNGSTEN MINE' },
  },
});

registerLayerLoader('tungsten', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/tungsten.json' });

export const fetchTungsten    = layer.load;
export const isTungstenLoaded = layer.isLoaded;
export const resetTungsten    = layer.reset;
export const TUNGSTEN_FLY_TO  = layer.FLY_TO;
