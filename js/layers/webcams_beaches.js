/* ===================================================================
   PANOPTICON — Webcams: Beaches Layer
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/webcams_beaches.json';

const layer = createDataLayer({
  layerKey:   'webcams_beaches',
  dataUrl:    DATA_URL,
  idPrefix:   'wc_beach',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    beaches: { icon: 'webcam', color: '#44ccff', label: 'BEACH CAM', displayDist: 8_000_000, labelDist: 2_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: -80, lat: 25, alt: 15_000_000 },
  countId:    'webcam-beaches-count',
  logLabel:   'WEBCAM BEACHES',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.name,
  descFn:     (item) => `BEACH CAM // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({ r: item.city, city: item.city, country: item.country, lat: item.lat, lon: item.lon, ytId: item.ytId || null, hlsUrl: item.hlsUrl || null }),
  altFn:      () => 200,
});

registerLayerLoader('webcams_beaches', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
