/* ===================================================================
   PANOPTICON — Webcams: Rail & Transit Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/webcams_rail.json';

const layer = createDataLayer({
  layerKey:   'webcams_rail',
  dataUrl:    DATA_URL,
  idPrefix:   'wc_rail',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    infrastructure: { icon: 'webcam', color: '#ff6688', label: 'RAIL CAM', displayDist: 8_000_000, labelDist: 2_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: -90, lat: 38, alt: 15_000_000 },
  countId:    'webcam-rail-count',
  logLabel:   'WEBCAM RAIL',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.name,
  descFn:     (item) => `RAIL CAM // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({ r: item.city, city: item.city, country: item.country, lat: item.lat, lon: item.lon, ytId: item.ytId || null, hlsUrl: item.hlsUrl || null }),
  altFn:      () => 200,
});

registerLayerLoader('webcams_rail', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
