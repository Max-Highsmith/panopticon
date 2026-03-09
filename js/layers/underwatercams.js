/* ===================================================================
   PANOPTICON — Underwater Webcams Layer (YouTube Live Streams)
   Curated underwater cameras from reef cams, aquarium tanks, and
   marine environments worldwide.
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/underwater_webcams.json';

const layer = createDataLayer({
  layerKey:   'underwatercams',
  dataUrl:    DATA_URL,
  idPrefix:   'ucam',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    underwater: { icon: 'webcam', color: '#00aaff', label: 'UNDERWATER', displayDist: 8_000_000, labelDist: 2_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: -75, lat: 25, alt: 15_000_000 },
  countId:    'underwater-cam-count',
  logLabel:   'UNDERWATER CAMS',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.ytChannel || item.name,
  descFn:     (item) => `UNDERWATER CAM // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({
    r: item.city,
    city: item.city,
    country: item.country,
    lat: item.lat,
    lon: item.lon,
    ytId: item.ytId || null,
    hlsUrl: item.hlsUrl || null,
  }),
  altFn:      () => 200,
});

registerLayerLoader('underwatercams', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
