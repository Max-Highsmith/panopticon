/* ===================================================================
   PANOPTICON — Bauxite Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'bauxite',
  dataUrl: 'data/layers/points/bauxite.json',
  idPrefix: 'bauxite',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'bauxite-count',
  logLabel: 'BAUXITE',
  flyTo: { lon: -12.0, lat: 11.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralBauxite', color: '#dd8855', label: 'BAUXITE MINE' },
  },
});

registerLayerLoader('bauxite', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/bauxite.json' });

export const fetchBauxite    = layer.load;
export const isBauxiteLoaded = layer.isLoaded;
export const resetBauxite    = layer.reset;
export const BAUXITE_FLY_TO  = layer.FLY_TO;
