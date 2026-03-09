/* ===================================================================
   PANOPTICON — Major Ports Layer (Data Layer)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'ports',
  dataUrl: 'data/layers/points/ports.json',
  idPrefix: 'port',
  iconSize: DISPLAY.MINE_ICON_SIZE,
  countId: 'ports-count',
  logLabel: 'PORTS',
  flyTo: { lon: 103.84, lat: 1.26, alt: 20_000_000 },
  categories: {
    mega_port:  { icon: 'portMega',  color: '#00ccff', label: 'MEGA PORT' },
    major_port: { icon: 'portMajor', color: '#4488ff', label: 'MAJOR PORT' },
  },
});

registerLayerLoader('ports', { load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset, dataUrl: 'data/layers/points/ports.json' });

export const fetchPorts     = layer.load;
export const isPortsLoaded  = layer.isLoaded;
export const resetPorts     = layer.reset;
export const PORTS_FLY_TO   = layer.FLY_TO;
