/* ===================================================================
   PANOPTICON — Surveillance Cameras: Scenario Layer
   Scenario-specific camera feeds for wargame simulations.
   =================================================================== */

import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/surveillance_cameras_scenario.json';

const layer = createDataLayer({
  layerKey:   'surveillance_cameras_scenario',
  dataUrl:    DATA_URL,
  idPrefix:   'surv_cam',
  categories: {
    cameras: { icon: 'webcam', color: '#ff4444', label: 'SURVEILLANCE', displayDist: 20_000_000, labelDist: 5_000_000 },
  },
  viewType:   'webcam',
  flyTo:      { lon: 50.08, lat: 35.12, alt: 5_000_000 },
  logLabel:   'SURVEILLANCE CAMS',
  labelFn:    (item) => item.name,
  idFn:       (item) => item.name,
  descFn:     (item) => `SURVEILLANCE // ${item.city}, ${item.country}`,
  acDataFn:   (item) => ({ r: item.city, city: item.city, country: item.country, lat: item.lat, lon: item.lon, videoUrl: item.videoUrl || null, ytId: item.ytId || null, hlsUrl: item.hlsUrl || null }),
  altFn:      () => 200,
});

registerLayerLoader('surveillance_cameras_scenario', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'webcam',
});
