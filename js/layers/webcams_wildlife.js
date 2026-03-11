/* ===================================================================
   PANOPTICON — Webcams: Wildlife Layer (includes underwater cams)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/webcams_wildlife.json';

const layer = createDataLayer({
  layerKey:   'webcams_wildlife',
  dataUrl:    DATA_URL,
  idPrefix:   'wc_wild',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    wildlife: { icon: 'webcam', color: '#44ff88', label: 'WILDLIFE CAM', displayDist: 8_000_000, labelDist: 2_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: 25, lat: -5, alt: 20_000_000 },
  countId:    'webcam-wildlife-count',
  logLabel:   'WEBCAM WILDLIFE',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.name,
  descFn:     (item) => `WILDLIFE CAM // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({ r: item.city, city: item.city, country: item.country, lat: item.lat, lon: item.lon, ytId: item.ytId || null, hlsUrl: item.hlsUrl || null }),
  altFn:      () => 200,
});

registerLayerLoader('webcams_wildlife', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
