/* ===================================================================
   PANOPTICON — Offshore Drilling Leases Layer (BOEM / Various)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'drilling',
  dataUrl: 'data/drilling_leases.json',
  idPrefix: 'drill',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'drilling-count',
  logLabel: 'DRILLING',
  flyTo: { lon: -150.0, lat: 70.0, alt: 6_000_000 },
  categories: {
    alaska_ocs:     { icon: 'drillUS',     color: '#ff8844', label: 'US ARCTIC LEASE' },
    norway_barents: { icon: 'drillNorway', color: '#44aaff', label: 'NORWAY BARENTS LEASE' },
    russia_arctic:  { icon: 'drillRussia', color: '#ff4444', label: 'RUSSIA ARCTIC FIELD' },
    canada_arctic:  { icon: 'drillCanada', color: '#ff6688', label: 'CANADA ARCTIC FIELD' },
  },
});

registerLayerLoader('drilling', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/drilling_leases.json' });

export const fetchDrilling     = layer.load;
export const isDrillingLoaded  = layer.isLoaded;
export const resetDrilling     = layer.reset;
export const DRILLING_FLY_TO   = layer.FLY_TO;
