/* ===================================================================
   PANOPTICON — Webcams: Traffic & Roads Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/webcams_traffic.json';

const layer = createDataLayer({
  layerKey:   'webcams_traffic',
  dataUrl:    DATA_URL,
  idPrefix:   'wc_traf',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    traffic: { icon: 'webcam', color: '#ffcc00', label: 'TRAFFIC CAM', displayDist: 8_000_000, labelDist: 2_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: -95, lat: 38, alt: 15_000_000 },
  countId:    'webcam-traffic-count',
  logLabel:   'WEBCAM TRAFFIC',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.name,
  descFn:     (item) => `TRAFFIC CAM // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({ r: item.city, city: item.city, country: item.country, lat: item.lat, lon: item.lon, ytId: item.ytId || null, hlsUrl: item.hlsUrl || null }),
  altFn:      () => 200,
});

registerLayerLoader('webcams_traffic', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
