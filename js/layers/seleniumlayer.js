/* ===================================================================
   PANOPTICON — Selenium Production Sites Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'selenium',
  dataUrl: 'data/layers/points/selenium.json',
  idPrefix: 'selenium',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'selenium-count',
  logLabel: 'SELENIUM',
  flyTo: { lon: 117.0, lat: 28.0, alt: 15_000_000 },
  descFn: (item) => {
    const parts = [
      item.operator || '---',
      item.country || '---',
    ];
    const details = [];
    if (item.status) details.push(`status: ${item.status}`);
    if (item.type) details.push(`type: ${item.type}`);
    if (item.products) details.push(`products: ${item.products.join(', ')}`);
    if (item.capacity_tpa) details.push(`capacity: ${item.capacity_tpa} tpa`);
    if (item.ownership) details.push(`ownership: ${item.ownership}`);
    if (item.notes) details.push(item.notes);
    parts.push(details.join(' | '));
    return parts.join(' // ');
  },
  categories: {
    sites: { icon: 'mineralSelenium', color: '#cc6655', label: 'SELENIUM SITE' },
  },
});

registerLayerLoader('selenium', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/selenium.json' });

export const fetchSelenium    = layer.load;
export const isSeleniumLoaded = layer.isLoaded;
export const resetSelenium    = layer.reset;
export const SELENIUM_FLY_TO  = layer.FLY_TO;
