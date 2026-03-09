/* ===================================================================
   PANOPTICON — Vanadium Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'vanadium',
  dataUrl: 'data/layers/points/vanadium.json',
  idPrefix: 'vanadium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'vanadium-count',
  logLabel: 'VANADIUM',
  flyTo: { lon: 105.0, lat: 35.0, alt: 15_000_000 },
  descFn: (item) => {
    const parts = [item.operator || '---', item.country || '---'];
    const details = [];
    if (item.status) details.push(`status: ${item.status}`);
    if (item.type) details.push(`type: ${item.type}`);
    if (item.products) details.push(`products: ${item.products.join(', ')}`);
    if (item.capacity_tpa) details.push(`capacity: ${item.capacity_tpa.toLocaleString()} tpa V2O5`);
    if (item.ownership) details.push(`ownership: ${item.ownership}`);
    if (item.grade) details.push(`grade: ${item.grade}`);
    if (item.notes) details.push(item.notes);
    parts.push(details.join(' | '));
    return parts.join(' // ');
  },
  categories: {
    sites: { icon: 'mineralVanadium', color: '#7744cc', label: 'VANADIUM MINE' },
  },
});

registerLayerLoader('vanadium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/vanadium.json' });

export const fetchVanadium    = layer.load;
export const isVanadiumLoaded = layer.isLoaded;
export const resetVanadium    = layer.reset;
export const VANADIUM_FLY_TO  = layer.FLY_TO;
