/* ===================================================================
   PANOPTICON — Military Bases Layer (Global)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'bases',
  dataUrl: 'data/military_bases.json',
  idPrefix: 'base',
  iconSize: DISPLAY.BASE_ICON_SIZE,
  countId: 'bases-count',
  logLabel: 'BASES',
  flyTo: { lon: 0, lat: 20, alt: 20_000_000 },
  descFn: (item, category) =>
    `${category.toUpperCase()} // ${item.operator || item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    army:     { icon: 'militaryBase', color: '#ff6644', label: 'MILITARY BASE' },
    navy:     { icon: 'militaryBase', color: '#ff6644', label: 'MILITARY BASE' },
    airforce: { icon: 'militaryBase', color: '#ff6644', label: 'MILITARY BASE' },
    joint:    { icon: 'militaryBase', color: '#ff6644', label: 'MILITARY BASE' },
  },
});

registerLayerLoader('bases', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/military_bases.json' });

export const fetchMilitaryBases     = layer.load;
export const isMilitaryBasesLoaded  = layer.isLoaded;
export const resetMilitaryBases     = layer.reset;
export const BASES_FLY_TO           = layer.FLY_TO;
