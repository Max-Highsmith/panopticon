/* ===================================================================
   PANOPTICON — Webcams: Landmarks Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/webcams_landmarks.json';

const layer = createDataLayer({
  layerKey:   'webcams_landmarks',
  dataUrl:    DATA_URL,
  idPrefix:   'wc_land',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    landmarks: { icon: 'webcam', color: '#ffaa00', label: 'LANDMARK', displayDist: 8_000_000, labelDist: 2_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: 10, lat: 45, alt: 20_000_000 },
  countId:    'webcam-landmarks-count',
  logLabel:   'WEBCAM LANDMARKS',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.name,
  descFn:     (item) => `LANDMARK // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({ r: item.city, city: item.city, country: item.country, lat: item.lat, lon: item.lon, ytId: item.ytId || null, hlsUrl: item.hlsUrl || null }),
  altFn:      () => 200,
});

registerLayerLoader('webcams_landmarks', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
