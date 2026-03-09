/* ===================================================================
   PANOPTICON — Antimony Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'antimony',
  dataUrl: 'data/layers/points/antimony.json',
  idPrefix: 'antimony',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'antimony-count',
  logLabel: 'ANTIMONY',
  flyTo: { lon: 105.0, lat: 25.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralAntimony', color: '#bb6699', label: 'ANTIMONY MINE' },
  },
});

registerLayerLoader('antimony', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/antimony.json' });

export const fetchAntimony    = layer.load;
export const isAntimonyLoaded = layer.isLoaded;
export const resetAntimony    = layer.reset;
export const ANTIMONY_FLY_TO  = layer.FLY_TO;
