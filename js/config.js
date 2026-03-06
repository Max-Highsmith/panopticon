/* ===================================================================
   PANOPTICON — Configuration & Constants
   =================================================================== */

// API tokens (injected by config.local.js or CI environment)
Cesium.Ion.defaultAccessToken = window.CESIUM_TOKEN || '%%CESIUM_TOKEN%%';

export const API = {
  ADSB_MIL:     'https://api.adsb.one/v2/mil',
  OPENSKY:      'https://opensky-network.org/api/states/all',
  CELESTRAK_TLE:'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle',
  AIS_KEY:       window.AIS_API_KEY || '%%AIS_API_KEY%%',
  AIS_WS:       'wss://stream.aisstream.io/v0/stream',
  OVERPASS:      'https://overpass-api.de/api/interpreter',
};

export const LIMITS = {
  MAX_SATELLITES:       100,
  FOOTPRINT_RANGE_DEG:  40,
  EARTH_RADIUS_M:       6_371_000,
  EARTH_RADIUS_OCCLUDE: 6_400_000,
  SHIP_STALE_MS:        300_000,   // 5 minutes
  SHIP_PRUNE_INTERVAL:  30_000,    // 30 seconds
  TRAIL_MAX_POINTS:     200,
};

export const REFRESH = {
  MILITARY_MS:   10_000,
  COMMERCIAL_MS: 15_000,
};

export const DISPLAY = {
  MIL_ICON_SIZE:  42,
  CIV_ICON_SIZE:  28,
  SAT_ICON_SIZE:  24,
  SHIP_ICON_SIZE: 42,
  POGO_ICON_SIZE: 22,
  MINE_ICON_SIZE:  28,
  INFRA_ICON_SIZE: 28,
  CUSTOM_ICON_SIZE: 18,
  AIRPORT_ICON_SIZE_LG: 24,
  AIRPORT_ICON_SIZE_MD: 18,
  BASE_ICON_SIZE: 28,
  WEBCAM_ICON_SIZE: 22,
};

// Custom datasets — add entries here to load your own data layers.
// Each entry creates a toggle in the UI and loads point data onto the globe.
//
// Supported formats: .geojson, .csv, .kml
//
// Example:
// {
//   id: 'my_data',                          // Unique ID (used for toggle, entity map)
//   label: 'MY DATA',                       // Toggle label in the HUD
//   file: 'data/custom/my_data.geojson',    // Path to data file
//   color: '#ff00ff',                        // Marker color
//   iconType: 'circle',                      // 'circle' | 'diamond' | 'server' | 'radiation'
//   iconSize: 20,                            // Optional (default: CUSTOM_ICON_SIZE)
//   altitude: 200,                           // Optional display altitude in meters (default: 0)
// }
//
// GeoJSON: FeatureCollection with Point geometries. Feature.properties shown on click.
// CSV:     Must have lat/lon or latitude/longitude columns. First row = headers.
// KML:     Standard KML with <Placemark> elements containing <Point> coordinates.
export const CUSTOM_DATASETS = [];

export const REPLAY_SPEEDS = [1, 2, 5, 10, 30, 60, 100];
export const DEFAULT_SPEED_INDEX = 4; // 30x

export const CITIES = {
  nyc:    { lon: -73.98, lat: 40.75, alt: 30_000 },
  london: { lon: -0.12,  lat: 51.50, alt: 30_000 },
  tokyo:  { lon: 139.75, lat: 35.68, alt: 30_000 },
  paris:  { lon: 2.35,   lat: 48.86, alt: 30_000 },
};

export const SCENARIOS = {
  iran: {
    file: 'military_feb28.json',
    label: 'IRAN',
    subtitle: 'HISTORICAL REPLAY // IRAN // FEB 28, 2026',
    dateLabel: 'FEB 28, 2026',
    timeLabel: 'FEB 28, 2026 // 16:02 - 16:32 UTC',
    date: '2026-02-28',
    timeStartUTC: 57720,
    camera: { lon: 53, lat: 32, alt: 5_000_000 },
    localTz: { name: 'IRST', offset: 3.5 },
    dataBounds: { latMin: 12.0, latMax: 44.0, lonMin: 26.0, lonMax: 74.0 },
    blackoutZones: [{
      label: 'ADS-B BLACKOUT',
      sublabel: 'NO SURVEILLANCE COVERAGE',
      labelPos: [53.5, 33.5],
      coords: [
        44.0, 39.8,  44.8, 39.5,  45.5, 38.9,  46.2, 38.8,  47.0, 38.5,
        48.0, 38.4,  48.5, 38.6,  49.0, 38.0,  50.0, 37.5,  51.0, 36.8,
        52.5, 36.9,  53.9, 37.0,  54.8, 37.3,  55.5, 37.2,  56.5, 37.6,
        57.3, 37.9,  58.5, 37.6,  59.5, 37.4,  60.5, 36.7,  61.2, 36.6,
        61.2, 35.6,  61.5, 34.5,  61.0, 33.5,  60.5, 33.0,  60.8, 32.0,
        60.5, 31.0,  61.7, 30.8,  61.8, 29.8,  61.5, 28.5,  60.8, 27.2,
        59.5, 26.5,  58.5, 25.5,  57.5, 25.2,  56.5, 25.8,  55.5, 26.0,
        54.5, 26.5,  53.5, 26.8,  52.0, 27.5,  51.0, 27.8,  50.0, 27.5,
        49.5, 27.8,  49.0, 28.5,  48.5, 29.5,  48.0, 30.0,  47.5, 30.5,
        47.0, 31.0,  46.5, 32.0,  46.0, 33.0,  45.5, 34.0,  45.0, 35.5,
        44.5, 36.5,  44.2, 37.0,  44.0, 38.0,  44.3, 39.0,  44.0, 39.8,
      ],
    }],
  },
  venezuela: {
    file: 'venezuela_jan03.json',
    label: 'VENEZUELA',
    subtitle: 'HISTORICAL REPLAY // VENEZUELA // JAN 3, 2026',
    dateLabel: 'JAN 3, 2026',
    timeLabel: 'JAN 3, 2026 // 08:00 - 08:30 UTC',
    date: '2026-01-03',
    timeStartUTC: 28800,
    camera: { lon: -66.9, lat: 10.5, alt: 4_000_000 },
    localTz: { name: 'VET', offset: -4 },
    dataBounds: { latMin: 0.0, latMax: 18.0, lonMin: -78.0, lonMax: -55.0 },
    blackoutZones: [{
      label: 'ADS-B BLACKOUT',
      sublabel: 'NO SURVEILLANCE COVERAGE',
      labelPos: [-66.0, 7.5],
      coords: [
        -73.0, 12.2,  -72.0, 11.8,  -71.6, 11.0,  -71.8, 10.5,
        -72.4, 10.0,  -72.2,  9.0,  -71.5,  8.5,  -70.5,  8.2,
        -70.2,  7.5,  -69.5,  7.0,  -68.5,  6.2,  -67.8,  6.0,
        -67.5,  5.5,  -67.0,  4.5,  -66.0,  3.8,  -65.0,  2.5,
        -64.0,  2.0,  -63.5,  2.5,  -63.0,  3.5,  -62.0,  4.0,
        -61.0,  4.5,  -60.5,  5.0,  -61.0,  6.0,  -61.5,  7.0,
        -61.0,  8.0,  -60.0,  8.5,  -60.5,  9.0,  -61.0, 10.0,
        -62.0, 10.5,  -63.0, 10.8,  -64.0, 10.5,  -65.0, 10.2,
        -66.0, 10.5,  -67.5, 10.5,  -68.5, 10.8,  -69.5, 11.0,
        -70.0, 11.5,  -70.5, 11.8,  -71.0, 12.0,  -71.5, 12.5,
        -72.0, 12.5,  -73.0, 12.2,
      ],
    }],
  },
  jalisco: {
    file: 'jalisco_feb22.json',
    label: 'JALISCO',
    subtitle: 'HISTORICAL REPLAY // JALISCO // FEB 22, 2026',
    dateLabel: 'FEB 22, 2026',
    timeLabel: 'FEB 22, 2026 // 11:00 - 11:30 UTC',
    date: '2026-02-22',
    timeStartUTC: 39600,
    camera: { lon: -103.5, lat: 20.7, alt: 3_500_000 },
    localTz: { name: 'CST', offset: -6 },
    dataBounds: { latMin: 12.0, latMax: 28.0, lonMin: -112.0, lonMax: -95.0 },
    blackoutZones: [{
      label: 'ADS-B BLACKOUT',
      sublabel: 'WESTERN MEXICO // NO COVERAGE',
      labelPos: [-104.5, 22.0],
      coords: [
        -105.5, 27.0,  -104.5, 26.0,  -104.0, 25.0,  -104.5, 24.0,
        -105.0, 23.5,  -105.5, 23.0,  -105.2, 22.0,  -105.0, 21.0,
        -105.5, 20.5,  -105.3, 19.5,  -104.5, 19.0,  -103.5, 18.5,
        -103.0, 18.8,  -102.5, 19.0,  -102.0, 19.5,  -102.0, 20.5,
        -102.5, 21.5,  -103.0, 22.5,  -103.5, 23.5,  -104.0, 24.5,
        -104.0, 25.5,  -104.5, 26.5,  -105.5, 27.0,
      ],
    }],
  },
};
