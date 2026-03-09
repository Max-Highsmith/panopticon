/* ===================================================================
   PANOPTICON — Chromium Mining Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'chromium',
  dataUrl: 'data/layers/points/chromium.json',
  idPrefix: 'chromium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'chromium-count',
  logLabel: 'CHROMIUM',
  flyTo: { lon: 28.0, lat: -25.0, alt: 15_000_000 },
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
    sites: { icon: 'mineralChromium', color: '#dd5566', label: 'CHROMIUM MINE' },
  },
});

registerLayerLoader('chromium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/chromium.json' });

export const fetchChromium    = layer.load;
export const isChromiumLoaded = layer.isLoaded;
export const resetChromium    = layer.reset;
export const CHROMIUM_FLY_TO  = layer.FLY_TO;
