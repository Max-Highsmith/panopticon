/* ===================================================================
   PANOPTICON — Niobium Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'niobium',
  dataUrl: 'data/layers/points/niobium.json',
  idPrefix: 'niobium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'niobium-count',
  logLabel: 'NIOBIUM',
  flyTo: { lon: -47.0, lat: -16.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralNiobium', color: '#cc8855', label: 'NIOBIUM MINE' },
  },
});

registerLayerLoader('niobium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/niobium.json' });

export const fetchNiobium    = layer.load;
export const isNiobiumLoaded = layer.isLoaded;
export const resetNiobium    = layer.reset;
export const NIOBIUM_FLY_TO  = layer.FLY_TO;
