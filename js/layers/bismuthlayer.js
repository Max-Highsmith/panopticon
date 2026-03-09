/* ===================================================================
   PANOPTICON — Bismuth Production Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'bismuth',
  dataUrl: 'data/layers/points/bismuth.json',
  idPrefix: 'bismuth',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'bismuth-count',
  logLabel: 'BISMUTH',
  flyTo: { lon: 113.0, lat: 26.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralBismuth', color: '#aa88cc', label: 'BISMUTH SITE' },
  },
});

registerLayerLoader('bismuth', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/bismuth.json' });

export const fetchBismuth    = layer.load;
export const isBismuthLoaded = layer.isLoaded;
export const resetBismuth    = layer.reset;
export const BISMUTH_FLY_TO  = layer.FLY_TO;
