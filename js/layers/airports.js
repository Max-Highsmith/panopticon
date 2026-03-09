/* ===================================================================
   PANOPTICON — Airport Locations Layer (OurAirports data)
   =================================================================== */

import { DISPLAY } from '../config.js';
import { registerLayerLoader } from '../layerregistry.js';
import { createDataLayer } from './datalayer.js';

const DATA_URL = 'data/layers/points/airports.json';

const layer = createDataLayer({
  layerKey:   'airports',
  dataUrl:    DATA_URL,
  idPrefix:   'apt',
  iconSize:   DISPLAY.AIRPORT_ICON_SIZE_MD,
  categories: {
    major:    { icon: 'airportLarge',  color: '#00ccff', label: 'MAJOR AIRPORT',
                iconSize: DISPLAY.AIRPORT_ICON_SIZE_LG, displayDist: 15_000_000, labelDist: 2_000_000 },
    regional: { icon: 'airportMedium', color: '#00ccff', label: 'AIRPORT',
                iconSize: DISPLAY.AIRPORT_ICON_SIZE_MD, displayDist: 3_000_000, labelDist: 2_000_000 },
  },
  viewType:   'airport',
  flyTo:      { lon: 0, lat: 30, alt: 20_000_000 },
  countId:    'airport-count',
  logLabel:   'AIRPORTS',
  labelFn:    (item) => item.iata || item.icao || '',
  idFn:       (item) => item.icao || `${item.lat}_${item.lon}`,
  altFn:      (item) => ((item.elevation_ft || 0) * 0.3048) + 100,
  descFn:     (item) => `${item.name} // ${item.country}${item.iata ? ' // IATA: ' + item.iata : ''}${item.icao ? ' // ICAO: ' + item.icao : ''}`,
  acDataFn:   (item) => ({ alt_baro: item.elevation_ft || 0 }),
});

registerLayerLoader('airports', {
  load: layer.load, flyTo: layer.FLY_TO, reset: layer.reset,
  dataUrl: DATA_URL, view: 'airport',
});
