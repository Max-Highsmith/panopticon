/* ===================================================================
   PANOPTICON — Infrastructure Layer (Datacenters + Nuclear Test Sites)
   Two createDataLayer instances from the same JSON file.
   Browser HTTP cache handles the duplicate fetch.
   =================================================================== */

import { DISPLAY } from '../config.js';
import { createDataLayer } from './datalayer.js';

// --- Datacenters ---

const infraLayer = createDataLayer({
  layerKey: 'infra',
  dataUrl: 'data/infrastructure.json',
  idPrefix: 'datacenter',
  iconSize: DISPLAY.INFRA_ICON_SIZE,
  countId: 'infra-count',
  logLabel: 'INFRA',
  flyTo: { lon: -77.0, lat: 39.0, alt: 8_000_000 },
  categories: {
    datacenters: { icon: 'datacenter', color: '#ff8800', label: 'DATACENTER' },
  },
});

export const fetchInfra    = infraLayer.load;
export const isInfraLoaded = infraLayer.isLoaded;
export const resetInfra    = infraLayer.reset;
export const INFRA_FLY_TO  = infraLayer.FLY_TO;

// --- Nuclear Test Sites ---

const nuclearLayer = createDataLayer({
  layerKey: 'nuclear',
  dataUrl: 'data/infrastructure.json',
  idPrefix: 'nuclear',
  iconSize: DISPLAY.INFRA_ICON_SIZE,
  countId: 'nuclear-count',
  logLabel: 'NUCLEAR',
  flyTo: { lon: -116.0, lat: 37.0, alt: 12_000_000 },
  descFn: (item) =>
    `${item.country} // ${item.tests || '?'} tests // ${item.years || ''}${item.notes ? ' // ' + item.notes : ''}`,
  categories: {
    nuclear_tests: { icon: 'nuclear', color: '#ff2222', label: 'NUCLEAR TEST SITE' },
  },
});

export const fetchNuclear    = nuclearLayer.load;
export const isNuclearLoaded = nuclearLayer.isLoaded;
export const resetNuclear    = nuclearLayer.reset;
export const NUCLEAR_FLY_TO  = nuclearLayer.FLY_TO;
