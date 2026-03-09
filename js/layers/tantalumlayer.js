/* ===================================================================
   PANOPTICON — Tantalum Production Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'tantalum',
  dataUrl: 'data/layers/points/tantalum.json',
  idPrefix: 'tantalum',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'tantalum-count',
  logLabel: 'TANTALUM',
  flyTo: { lon: 29.0, lat: -2.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralTantalum', color: '#bb7744', label: 'TANTALUM SITE' },
  },
});

registerLayerLoader('tantalum', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/tantalum.json' });

export const fetchTantalum    = layer.load;
export const isTantalumLoaded = layer.isLoaded;
export const resetTantalum    = layer.reset;
export const TANTALUM_FLY_TO  = layer.FLY_TO;
