/* ===================================================================
   PANOPTICON — Webcams Master Layer (ALL webcam categories combined)
   Loads all 12 webcam sub-category files and displays them as one layer.
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URLS = [
  'data/layers/points/webcams_cities.json',
  'data/layers/points/webcams_beaches.json',
  'data/layers/points/webcams_landmarks.json',
  'data/layers/points/webcams_wildlife.json',
  'data/layers/points/webcams_aviation.json',
  'data/layers/points/webcams_maritime.json',
  'data/layers/points/webcams_volcanoes.json',
  'data/layers/points/webcams_rail.json',
  'data/layers/points/webcams_space.json',
  'data/layers/points/webcams_aurora.json',
  'data/layers/points/webcams_nature.json',
  'data/layers/points/webcams_traffic.json',
];

const layer = createDataLayer({
  layerKey:   'webcams',
  dataUrl:    DATA_URLS,
  idPrefix:   'wcam',
  iconSize:   DISPLAY.WEBCAM_ICON_SIZE,
  categories: {
    cities:         { icon: 'webcam', color: '#00ddff', label: 'CITY CAM',      displayDist: 8_000_000, labelDist: 2_000_000 },
    landmarks:      { icon: 'webcam', color: '#ffaa00', label: 'LANDMARK',      displayDist: 8_000_000, labelDist: 2_000_000 },
    beaches:        { icon: 'webcam', color: '#44ccff', label: 'BEACH CAM',     displayDist: 8_000_000, labelDist: 2_000_000 },
    volcanoes:      { icon: 'webcam', color: '#ff4422', label: 'VOLCANO CAM',   displayDist: 8_000_000, labelDist: 2_000_000 },
    wildlife:       { icon: 'webcam', color: '#44ff88', label: 'WILDLIFE CAM',  displayDist: 8_000_000, labelDist: 2_000_000 },
    ports:          { icon: 'webcam', color: '#ff8844', label: 'PORT CAM',      displayDist: 8_000_000, labelDist: 2_000_000 },
    airports:       { icon: 'webcam', color: '#00ccff', label: 'AIRPORT CAM',   displayDist: 8_000_000, labelDist: 2_000_000 },
    space:          { icon: 'webcam', color: '#cc88ff', label: 'SPACE CAM',     displayDist: 50_000_000, labelDist: 10_000_000 },
    aurora:         { icon: 'webcam', color: '#88ff44', label: 'AURORA CAM',    displayDist: 8_000_000, labelDist: 2_000_000 },
    nature:         { icon: 'webcam', color: '#22cc88', label: 'NATURE CAM',    displayDist: 8_000_000, labelDist: 2_000_000 },
    traffic:        { icon: 'webcam', color: '#ffcc00', label: 'TRAFFIC CAM',   displayDist: 8_000_000, labelDist: 2_000_000 },
    infrastructure: { icon: 'webcam', color: '#ff6688', label: 'RAIL CAM',      displayDist: 8_000_000, labelDist: 2_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: -40, lat: 30, alt: 20_000_000 },
  countId:    'webcam-count',
  logLabel:   'WEBCAMS',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.ytId || item.name,
  descFn:     (item, category) => `${(category || 'WEBCAM').toUpperCase()} // ${item.city}, ${item.country}`,
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

registerLayerLoader('webcams', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URLS, view: 'webcam',
});
