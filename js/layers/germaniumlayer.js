/* ===================================================================
   PANOPTICON — Germanium Production Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'germanium',
  dataUrl: 'data/layers/points/germanium.json',
  idPrefix: 'germanium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'germanium-count',
  logLabel: 'GERMANIUM',
  flyTo: { lon: 105.0, lat: 30.0, alt: 15_000_000 },
  descFn: (item) => {
    const parts = [item.operator || '---', item.country || '---'];
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
    sites: { icon: 'mineralGermanium', color: '#7799bb', label: 'GERMANIUM SITE' },
  },
});

registerLayerLoader('germanium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/germanium.json' });

export const fetchGermanium    = layer.load;
export const isGermaniumLoaded = layer.isLoaded;
export const resetGermanium    = layer.reset;
export const GERMANIUM_FLY_TO  = layer.FLY_TO;
