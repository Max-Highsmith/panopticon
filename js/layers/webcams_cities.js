/* ===================================================================
   PANOPTICON — Webcams: Cities Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/webcams_cities.json';

const layer = createDataLayer({
  layerKey:   'webcams_cities',
  dataUrl:    DATA_URL,
  idPrefix:   'wc_city',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    cities: { icon: 'webcam', color: '#00ddff', label: 'CITY CAM', displayDist: 8_000_000, labelDist: 2_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: -40, lat: 30, alt: 20_000_000 },
  countId:    'webcam-cities-count',
  logLabel:   'WEBCAM CITIES',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.name,
  descFn:     (item) => `CITY CAM // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({ r: item.city, city: item.city, country: item.country, lat: item.lat, lon: item.lon, ytId: item.ytId || null, hlsUrl: item.hlsUrl || null }),
  altFn:      () => 200,
});

registerLayerLoader('webcams_cities', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
