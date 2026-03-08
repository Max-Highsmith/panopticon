/* ===================================================================
   PANOPTICON — Webcams Layer (HLS + YouTube Live Stream POC)
   Curated demo webcams from iconic civilian locations worldwide.
   Prefers HLS streams for clean watermark-free feeds; falls back
   to YouTube embeds where HLS is unavailable.
   =================================================================== */

import { layers, entityMaps } from '../globe.js';
import { DISPLAY } from '../config.js';
import { icons } from '../icons.js';
import { $ } from '../utils.js';
import { registerLayerLoader } from '../layerregistry.js';

const entities = entityMaps.webcams;
let loaded = false;

// Fly-to target: zoomed out to show worldwide markers
export const WEBCAMS_FLY_TO = { lon: -40, lat: 30, alt: 20_000_000 };

// Curated webcams — fixed street-level cameras with people & traffic
// hlsUrl = direct HLS stream (clean, no watermark); ytId = YouTube fallback
const DEMO_WEBCAMS = [
  // Tokyo — Shibuya Crossing (world's busiest pedestrian crossing)
  { ytId: 'dfVK7ld38Ys', title: 'Shibuya Crossing',        city: 'Tokyo',         country: 'JP', lat: 35.6595, lon: 139.7004 },
  { ytId: '8H3nRCFVR6Y', title: 'Shibuya Crossing (Cam 2)', city: 'Tokyo',         country: 'JP', lat: 35.6590, lon: 139.7010 },
  // Paris — Eiffel Tower panorama
  { ytId: 'OzYp4NRZlwQ', title: 'Eiffel Tower',            city: 'Paris',         country: 'FR', lat: 48.8584, lon: 2.2945 },
  // London — rotating city panorama
  { ytId: '8JCk5M_xrBs', title: 'London Panorama',         city: 'London',        country: 'GB', lat: 51.5074, lon: -0.1278 },
  // Venice — rolling cam through canals & piazzas
  { ytId: 'P393gTj527k', title: 'Venice Canals',            city: 'Venice',        country: 'IT', lat: 45.4408, lon: 12.3155 },
  // Jackson Hole — famous town square with pedestrians & elk arches
  { ytId: '1EiC9bvVGnk', title: 'Town Square',              city: 'Jackson Hole',  country: 'US', lat: 43.4799, lon: -110.7624 },
  { ytId: 'DoUOrTJbIu4', title: 'Town Square (Cam 2)',      city: 'Jackson Hole',  country: 'US', lat: 43.4795, lon: -110.7620 },
  // Nashville — Broadway honky-tonk street
  { ytId: 'ATbtGvbExP4', title: 'Broadway',                 city: 'Nashville',     country: 'US', lat: 36.1627, lon: -86.7816 },
  { ytId: 'h5Grd2w7HQM', title: 'Broadway (Cam 2)',         city: 'Nashville',     country: 'US', lat: 36.1622, lon: -86.7810 },
  // Key West — Duval Street pedestrian traffic
  { ytId: '3bXyYuk-XK0', title: 'Duval Street',             city: 'Key West',      country: 'US', lat: 24.5551, lon: -81.8018 },
  // Key West — Mallory Square sunset & crowds
  { ytId: '8Rw-tZTeBjU', title: 'Mallory Square',           city: 'Key West',      country: 'US', lat: 24.5597, lon: -81.8076 },
  // New York — Times Square (HLS via EarthCam + YouTube fallback)
  { ytId: 'rnXIjl_Rzy4', hlsUrl: '/hlsproxy?url=' + encodeURIComponent('https://video3.earthcam.com/fecnetwork/hdtimes10.flv/playlist.m3u8'), title: 'Times Square',  city: 'New York', country: 'US', lat: 40.7580, lon: -73.9855 },
  // Washington DC — Washington Monument (HLS via EarthCam)
  { ytId: null, hlsUrl: '/hlsproxy?url=' + encodeURIComponent('https://video3.earthcam.com/fecnetwork/7132.flv/playlist.m3u8'), title: 'Washington Monument', city: 'Washington DC', country: 'US', lat: 38.8895, lon: -77.0353 },
  // Maryland — I-270 traffic cam (MD DOT HLS)
  { ytId: null, hlsUrl: '/hlsproxy?url=' + encodeURIComponent('https://strmr5.sha.maryland.gov/rtplive/7a00a1dc01250075004d823633235daa/playlist.m3u8'), title: 'I-270 Traffic', city: 'Frederick', country: 'US', lat: 39.2904, lon: -77.2206 },
];

export function isWebcamsLoaded() { return loaded; }
export function resetWebcams() { loaded = false; }

export function fetchWebcams(viewer) {
  if (loaded) return;

  for (const cam of DEMO_WEBCAMS) {
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(cam.lon, cam.lat, 200),
      billboard: {
        image: icons.webcam,
        width: DISPLAY.WEBCAM_ICON_SIZE,
        height: DISPLAY.WEBCAM_ICON_SIZE,
        disableDepthTestDistance: 0,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8_000_000),
      },
      label: {
        text: cam.title,
        font: '10px Courier New',
        fillColor: Cesium.Color.fromCssColorString('#00ddff'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(14, -4),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2_000_000),
      },
    });

    entity.show = layers.webcams;
    entity.acData = {
      hex: cam.ytId || cam.title,
      flight: cam.title,
      t: 'WEBCAM',
      desc: `WEBCAM // ${cam.city}, ${cam.country}`,
      r: cam.city,
      city: cam.city,
      country: cam.country,
      lat: cam.lat,
      lon: cam.lon,
      ytId: cam.ytId,
      hlsUrl: cam.hlsUrl || null,
      _view: 'webcam',
    };

    entities.set(cam.ytId || cam.title, { entity });
  }

  $('webcam-count').textContent = entities.size;
  loaded = true;
}

registerLayerLoader('webcams', { load: fetchWebcams, flyTo: WEBCAMS_FLY_TO, reset: resetWebcams, view: 'webcam' });
