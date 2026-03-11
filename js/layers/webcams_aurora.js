/* ===================================================================
   PANOPTICON — Webcams: Aurora & Sky Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/webcams_aurora.json';

const layer = createDataLayer({
  layerKey:   'webcams_aurora',
  dataUrl:    DATA_URL,
  idPrefix:   'wc_aur',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    aurora: { icon: 'webcam', color: '#88ff44', label: 'AURORA CAM', displayDist: 8_000_000, labelDist: 2_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: 25, lat: 66, alt: 15_000_000 },
  countId:    'webcam-aurora-count',
  logLabel:   'WEBCAM AURORA',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.name,
  descFn:     (item) => `AURORA CAM // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({ r: item.city, city: item.city, country: item.country, lat: item.lat, lon: item.lon, ytId: item.ytId || null, hlsUrl: item.hlsUrl || null }),
  altFn:      () => 200,
});

registerLayerLoader('webcams_aurora', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
