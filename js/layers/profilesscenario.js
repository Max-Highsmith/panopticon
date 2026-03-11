/* ===================================================================
   PANOPTICON — Scenario-Specific Profiles Layer
   Ambient sidebar panel showing person-of-interest profiles specific
   to the PREDICTION MARKET // HOSTAGE DILEMMA wargame scenario.
   =================================================================== */

import { createAmbientLayer } from './ambientlayer.js';
import { registerLayerLoader } from '../layerregistry.js';
import { renderProfilesPanel } from './profileslayer.js';

const DATA_URL = 'data/layers/ambient/profiles_hostage_scenario.json';

const layer = createAmbientLayer({
  layerKey: 'profiles_scenario',
  dataUrl: DATA_URL,
  panelId: 'profiles-scenario-panel',
  countId: 'profiles-scenario-count',
  logLabel: 'PROFILES-SCENARIO',
  tabLabel: 'SUBJECTS',
  tabColor: '#ff4444',
  renderFn: renderProfilesPanel,
  countFn: (data) => (data.located?.length || 0) + (data.unlocated?.length || 0),
});

registerLayerLoader('profiles_scenario', {
  load: layer.load,
  flyTo: null,
  reset: layer.reset,
  dataUrl: DATA_URL,
  layerType: 'ambient',
  show: layer.show,
  hide: layer.hide,
});
