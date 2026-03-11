/* ===================================================================
   PANOPTICON — Webcams: Nature & Parks Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/webcams_nature.json';

const layer = createDataLayer({
  layerKey:   'webcams_nature',
  dataUrl:    DATA_URL,
  idPrefix:   'wc_nat',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    nature: { icon: 'webcam', color: '#22cc88', label: 'NATURE CAM', displayDist: 8_000_000, labelDist: 2_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: -110, lat: 44, alt: 15_000_000 },
  countId:    'webcam-nature-count',
  logLabel:   'WEBCAM NATURE',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.name,
  descFn:     (item) => `NATURE CAM // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({ r: item.city, city: item.city, country: item.country, lat: item.lat, lon: item.lon, ytId: item.ytId || null, hlsUrl: item.hlsUrl || null }),
  altFn:      () => 200,
});

registerLayerLoader('webcams_nature', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
