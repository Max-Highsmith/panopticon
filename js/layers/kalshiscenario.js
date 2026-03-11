/* ===================================================================
   PANOPTICON — Scenario-Specific Kalshi Markets Layer
   Ambient sidebar panel showing prediction markets specific to
   the PREDICTION MARKET // HOSTAGE DILEMMA wargame scenario.
   =================================================================== */

import { createAmbientLayer } from './ambientlayer.js';
import { registerLayerLoader } from '../layerregistry.js';
import { renderMarketPanel } from './kalshilayer.js';

const DATA_URL = 'data/layers/ambient/kalshi_hostage_scenario.json';

const layer = createAmbientLayer({
  layerKey: 'kalshi_scenario',
  dataUrl: DATA_URL,
  panelId: 'kalshi-scenario-panel',
  countId: 'kalshi-scenario-count',
  logLabel: 'KALSHI-SCENARIO',
  tabLabel: 'SCENARIO MKTS',
  tabColor: '#ff4444',
  renderFn: renderMarketPanel,
});

registerLayerLoader('kalshi_scenario', {
  load: layer.load,
  flyTo: null,
  reset: layer.reset,
  dataUrl: DATA_URL,
  layerType: 'ambient',
  show: layer.show,
  hide: layer.hide,
});
