/* ===================================================================
   PANOPTICON — Uranium Mining/Production Sites Layer
   =================================================================== */
import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'uranium',
  dataUrl: 'data/layers/points/uranium.json',
  idPrefix: 'uranium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'uranium-count',
  logLabel: 'URANIUM',
  flyTo: { lon: 68.0, lat: 48.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralUranium', color: '#44dd44', label: 'URANIUM SITE' },
  },
});

registerLayerLoader('uranium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/uranium.json' });

export const fetchUranium    = layer.load;
export const isUraniumLoaded = layer.isLoaded;
export const resetUranium    = layer.reset;
export const URANIUM_FLY_TO  = layer.FLY_TO;
