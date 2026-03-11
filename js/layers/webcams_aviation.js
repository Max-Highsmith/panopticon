/* ===================================================================
   PANOPTICON — Webcams: Aviation Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/webcams_aviation.json';

const layer = createDataLayer({
  layerKey:   'webcams_aviation',
  dataUrl:    DATA_URL,
  idPrefix:   'wc_avia',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    airports: { icon: 'webcam', color: '#00ccff', label: 'AIRPORT CAM', displayDist: 8_000_000, labelDist: 2_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: -40, lat: 35, alt: 20_000_000 },
  countId:    'webcam-aviation-count',
  logLabel:   'WEBCAM AVIATION',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.name,
  descFn:     (item) => `AIRPORT CAM // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({ r: item.city, city: item.city, country: item.country, lat: item.lat, lon: item.lon, ytId: item.ytId || null, hlsUrl: item.hlsUrl || null }),
  altFn:      () => 200,
});

registerLayerLoader('webcams_aviation', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
