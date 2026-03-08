/* ===================================================================
   PANOPTICON — Radar Installations Layer (BMEWS, Aegis, OTH)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'radar',
  dataUrl: 'data/radar_installations.json',
  idPrefix: 'radar',
  iconSize: DISPLAY.BASE_ICON_SIZE,
  countId: 'radar-count',
  logLabel: 'RADAR',
  flyTo: { lon: -50.0, lat: 60.0, alt: 15_000_000 },
  descFn: (item) =>
    `${item.operator || ''} // ${item.country}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    bmews: { icon: 'radarBmews', color: '#ff3333', label: 'BMEWS RADAR' },
    aegis: { icon: 'radarAegis', color: '#4488ff', label: 'AEGIS ASHORE' },
    othr:  { icon: 'radarOthr',  color: '#ffaa00', label: 'OTH RADAR' },
  },
});

registerLayerLoader('radar', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/radar_installations.json' });

export const fetchRadar     = layer.load;
export const isRadarLoaded  = layer.isLoaded;
export const resetRadar     = layer.reset;
export const RADAR_FLY_TO   = layer.FLY_TO;
