/* ===================================================================
   PANOPTICON — Strategic Nuclear Facilities Layer
   Weapons labs, submarine bases, missile silos
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'strategicnuclear',
  dataUrl: 'data/strategic_nuclear.json',
  idPrefix: 'strnuc',
  iconSize: DISPLAY.BASE_ICON_SIZE,
  countId: 'strategicnuclear-count',
  logLabel: 'STRATEGIC NUCLEAR',
  flyTo: { lon: -100.0, lat: 40.0, alt: 15_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    weapons_lab:    { icon: 'weaponsLab',  color: '#ff2222', label: 'WEAPONS LAB' },
    submarine_base: { icon: 'subBase',     color: '#ff4466', label: 'SSBN BASE' },
    missile_silo:   { icon: 'missileSilo', color: '#ff0000', label: 'MISSILE SILO' },
  },
});

registerLayerLoader('strategicnuclear', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/strategic_nuclear.json' });

export const fetchStrategicNuclear     = layer.load;
export const isStrategicNuclearLoaded  = layer.isLoaded;
export const resetStrategicNuclear     = layer.reset;
export const STRATEGIC_NUCLEAR_FLY_TO  = layer.FLY_TO;
