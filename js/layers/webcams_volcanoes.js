/* ===================================================================
   PANOPTICON — Webcams: Volcanoes Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/webcams_volcanoes.json';

const layer = createDataLayer({
  layerKey:   'webcams_volcanoes',
  dataUrl:    DATA_URL,
  idPrefix:   'wc_volc',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    volcanoes: { icon: 'webcam', color: '#ff4422', label: 'VOLCANO CAM', displayDist: 8_000_000, labelDist: 2_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: 120, lat: 0, alt: 20_000_000 },
  countId:    'webcam-volcanoes-count',
  logLabel:   'WEBCAM VOLCANOES',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.name,
  descFn:     (item) => `VOLCANO CAM // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({ r: item.city, city: item.city, country: item.country, lat: item.lat, lon: item.lon, ytId: item.ytId || null, hlsUrl: item.hlsUrl || null }),
  altFn:      () => 200,
});

registerLayerLoader('webcams_volcanoes', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
