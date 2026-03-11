/* ===================================================================
   PANOPTICON — Webcams: Space & Astronomy Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/webcams_space.json';

const layer = createDataLayer({
  layerKey:   'webcams_space',
  dataUrl:    DATA_URL,
  idPrefix:   'wc_space',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    space: { icon: 'webcam', color: '#cc88ff', label: 'SPACE CAM', displayDist: 50_000_000, labelDist: 10_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: -97, lat: 26, alt: 20_000_000 },
  countId:    'webcam-space-count',
  logLabel:   'WEBCAM SPACE',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.name,
  descFn:     (item) => `SPACE CAM // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({ r: item.city, city: item.city, country: item.country, lat: item.lat, lon: item.lon, ytId: item.ytId || null, hlsUrl: item.hlsUrl || null }),
  altFn:      () => 200,
});

registerLayerLoader('webcams_space', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
