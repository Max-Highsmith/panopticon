/* ===================================================================
   PANOPTICON — Wargame Mode Controller
   Dual-mode: connects to server via WebSocket (self-hosted) OR
   runs simulation client-side (static/GitHub Pages).
   =================================================================== */

import { $ } from './utils.js';
import {
  buildWorldState, buildPrompt, parseDecision,
  generateRunId, buildStartedPayload, buildSummary,
  summarizeLayerData, applyMovements, snapshotBluePositions,
} from './simulation.mjs';
import { adapters as clientAdapters, providerInfo } from './llm.js';
import { getSettings, saveSettings, hasAnyApiKey, getKeyForProvider } from './settings.js';
import { saveResult, getResult } from './results.js';
import { loadPlaybackList } from './playbackbrowser.js';
import { getLoader, getLayerData } from './layerregistry.js';
import { toggleLayer, entityMaps, registerLayer } from './globe.js';
import { getView } from './viewregistry.js';

// Stores the last completed run's config so we can generate a playback manifest
let lastCompletedConfig = null;

let ws = null;
let viewer = null;
let wargameEntities = new Map();
let running = false;
let scenarioCache = null;

// Mode: 'server' (WebSocket) or 'browser' (client-side simulation)
let useServer = false;
let activeSim = null; // client-side abort handle

// State from the active run
let executionMode = 'turn_based';
let criticalAction = null;
let totalDurationMs = 0;
let lastIntelCount = 0;

// =====================================================
// PUBLIC API
// =====================================================
export function startWargameMode(v) {
  viewer = v;
  $('wargame-panel').style.display = 'block';
  $('playback-sidebar').style.display = 'none';
  $('timeline-bar').style.display = 'none';
  loadScenarioList();
  initSettingsUI();
}

export function stopWargameMode() {
  if (running) stopSimulation();
  $('wargame-panel').style.display = 'none';
  clearEntities();
  // Close detail views if they were open
  const subView = getView('submarine');
  if (subView && subView.isOpen()) subView.close(viewer);
  const sniperView = getView('sniper');
  if (sniperView && sniperView.isOpen()) sniperView.close(viewer);
}

export function isWargameRunning() { return running; }

// =====================================================
// SCENARIO LIST — server fallback to static manifest
// =====================================================
async function loadScenarioList() {
  // Try server first (self-hosted mode)
  try {
    const res = await fetch('/api/scenarios');
    if (res.ok) {
      scenarioCache = await res.json();
      useServer = true;
      populateSelectors();
      showStatus('Server detected. Ready.');
      return;
    }
  } catch (_) { /* server not available */ }

  // Fall back to static manifest (GitHub Pages / static hosting)
  try {
    const res = await fetch('scenarios/index.json');
    if (res.ok) {
      scenarioCache = await res.json();
      useServer = false;
      populateSelectors();
      if (hasAnyApiKey()) {
        showStatus('Browser mode. Configure scenario and press START.');
      } else {
        showStatus('Set an API key in Settings to run wargames. BASELINE works without one.');
      }
      return;
    }
  } catch (_) { /* manifest not found */ }

  showStatus('No scenarios available.', true);
}

function populateSelectors() {
  if (!scenarioCache || scenarioCache.length === 0) return;

  const scenarioSel = $('wg-scenario');
  scenarioSel.innerHTML = '';
  // Sort: ready scenarios first, then stubs
  const sorted = [...scenarioCache].sort((a, b) => (b.ready ? 1 : 0) - (a.ready ? 1 : 0));
  sorted.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    if (s.ready === false) {
      opt.textContent = s.label + ' [COMING SOON]';
      opt.disabled = true;
      opt.style.color = '#555';
    } else {
      opt.textContent = s.label;
    }
    scenarioSel.appendChild(opt);
  });

  updateVariantFraming();
  scenarioSel.onchange = updateVariantFraming;
}

function updateVariantFraming() {
  const selected = scenarioCache.find(s => s.id === $('wg-scenario').value);
  if (!selected) return;

  const varSel = $('wg-variant');
  varSel.innerHTML = '';
  selected.variants.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v.replace(/_/g, ' ').toUpperCase();
    varSel.appendChild(opt);
  });

  const framSel = $('wg-framing');
  framSel.innerHTML = '';
  selected.framings.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f.toUpperCase();
    framSel.appendChild(opt);
  });

  const modeSel = $('wg-execution-mode');
  if (modeSel) {
    modeSel.value = selected.execution_mode || 'turn_based';
  }

  const varsInput = $('wg-variables');
  if (varsInput && selected.variables && Object.keys(selected.variables).length > 0) {
    varsInput.placeholder = JSON.stringify(selected.variables, null, 2);
  } else if (varsInput) {
    varsInput.placeholder = '{"key": "value"}';
  }

  // Show scenario layers
  const layersEl = $('wg-layers');
  if (layersEl) {
    const scenarioLayers = selected.layers || [];
    if (scenarioLayers.length > 0) {
      layersEl.innerHTML = '<span class="wg-layers-label">DATA LAYERS:</span> ' +
        scenarioLayers.map(k =>
          `<span class="pb-layer-tag">${k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toUpperCase()}</span>`
        ).join('');
    } else {
      layersEl.innerHTML = '<span class="wg-layers-label">DATA LAYERS:</span> <span class="wg-layers-none">NONE</span>';
    }
  }
}

// =====================================================
// SETTINGS UI
// =====================================================
function initSettingsUI() {
  const s = getSettings();
  const keyGoogle = $('wg-key-google');
  const keyAnthropic = $('wg-key-anthropic');
  const keyOpenai = $('wg-key-openai');
  const keyXai = $('wg-key-xai');
  const keyOpenrouter = $('wg-key-openrouter');
  const proxyUrl = $('wg-proxy-url');
  const openaiBase = $('wg-openai-base');

  if (keyGoogle) keyGoogle.value = s.googleApiKey;
  if (keyAnthropic) keyAnthropic.value = s.anthropicApiKey;
  if (keyOpenai) keyOpenai.value = s.openaiApiKey;
  if (keyXai) keyXai.value = s.xaiApiKey;
  if (keyOpenrouter) keyOpenrouter.value = s.openrouterApiKey;
  if (proxyUrl) proxyUrl.value = s.proxyUrl;
  if (openaiBase) openaiBase.value = s.openaiBaseUrl;

  // Update provider note on change
  const providerSel = $('wg-provider');
  if (providerSel) {
    providerSel.onchange = updateProviderNote;
    updateProviderNote();
  }
}

function updateProviderNote() {
  const note = $('wg-provider-note');
  if (!note) return;
  const provider = $('wg-provider').value;

  if (useServer) {
    note.textContent = 'Server mode — keys from server/.env';
    note.style.color = '#888';
    return;
  }

  const info = providerInfo[provider];
  if (!info) { note.textContent = ''; return; }

  const hasKey = !!getKeyForProvider(provider);
  if (provider === 'baseline') {
    note.textContent = info.note;
    note.style.color = '#888';
  } else if (info.cors === 'direct' && hasKey) {
    note.textContent = 'Ready — direct browser connection.';
    note.style.color = '#00ff41';
  } else if (info.cors === 'direct' && !hasKey) {
    note.textContent = 'Set your Google API key in Settings below.';
    note.style.color = '#ffaa00';
  } else if (info.cors === 'proxy' && hasKey) {
    const s = getSettings();
    const hasProxy = !!(s.proxyUrl || s.openaiBaseUrl);
    if (hasProxy) {
      note.textContent = 'Ready — routing through your proxy.';
      note.style.color = '#00ff41';
    } else {
      note.textContent = info.note;
      note.style.color = '#ffaa00';
    }
  } else {
    note.textContent = info.note;
    note.style.color = '#ffaa00';
  }
}

// =====================================================
// SIMULATION CONTROL — dispatches to server or browser
// =====================================================
function readConfigFromUI() {
  const varsStr = $('wg-variables')?.value?.trim();
  let variables;
  if (varsStr) {
    try {
      variables = JSON.parse(varsStr);
    } catch (e) {
      showStatus('Invalid JSON in variables field', true);
      return null;
    }
  }
  const modelVal = $('wg-model').value;
  const isBaseline = modelVal === 'always-hold' || modelVal === 'always-launch';
  return {
    scenario: $('wg-scenario').value,
    variant: $('wg-variant').value,
    framing: $('wg-framing').value,
    provider: isBaseline ? 'baseline' : $('wg-provider').value,
    model: modelVal,
    execution_mode: $('wg-execution-mode')?.value || 'turn_based',
    variables,
  };
}

export function startSimulation() {
  if (running) return;

  const config = readConfigFromUI();
  if (!config) return;

  clearFeed();
  clearEntities();
  lastIntelCount = 0;

  lastCompletedConfig = config; // store for playback manifest generation

  if (useServer) {
    startServerSimulation(config);
  } else {
    startBrowserSimulation(config);
  }
}

export function stopSimulation() {
  if (useServer) {
    // Server mode: close WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stop' }));
    }
    if (ws) { ws.close(); ws = null; }
  } else {
    // Browser mode: abort client-side loop
    if (activeSim) activeSim.running = false;
  }
  running = false;
  updateButtons();
}

// =====================================================
// SERVER MODE — existing WebSocket flow (unchanged)
// =====================================================
function startServerSimulation(config) {
  showStatus('Connecting to server...');
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.onopen = () => {
    running = true;
    updateButtons();
    showStatus('Simulation started. Waiting for first update...');
    ws.send(JSON.stringify({ type: 'start', ...config }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleMessage(msg);
  };

  ws.onerror = () => showStatus('WebSocket error', true);
  ws.onclose = () => {
    if (running) {
      running = false;
      updateButtons();
      showStatus('Connection lost.');
    }
  };
}

// =====================================================
// BROWSER MODE — client-side simulation
// =====================================================
async function startBrowserSimulation(config) {
  // Validate provider/key availability
  if (config.provider !== 'baseline') {
    const hasKey = !!getKeyForProvider(config.provider);
    if (!hasKey) {
      showStatus(`No API key for ${config.provider}. Set one in Settings.`, true);
      return;
    }
  }

  const adapter = clientAdapters[config.provider];
  if (!adapter) {
    showStatus(`Unknown provider: ${config.provider}`, true);
    return;
  }

  // Load full scenario JSON
  let scenario;
  try {
    const res = await fetch(`scenarios/${config.scenario}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    scenario = await res.json();
  } catch (e) {
    showStatus(`Failed to load scenario: ${e.message}`, true);
    return;
  }

  const mode = config.execution_mode || scenario.execution_mode || 'turn_based';
  config.execution_mode = mode;
  running = true;
  activeSim = { running: true };
  updateButtons();

  showStatus('Running simulation in browser...');

  try {
    if (mode === 'realtime') {
      await runBrowserRealtime(config, scenario, adapter);
    } else {
      await runBrowserTurnBased(config, scenario, adapter);
    }
  } catch (err) {
    showStatus(`Simulation error: ${err.message}`, true);
  }

  running = false;
  activeSim = null;
  updateButtons();
}

async function runBrowserTurnBased(config, scenario, adapter) {
  const runId = generateRunId();
  const validActions = scenario.actions.map(a => a.id);
  const terminalActions = scenario.actions.filter(a => a.terminal).map(a => a.id);
  const vars = { ...scenario.variables, ...config.variables };
  const responseFormat = scenario.response_format || 'text';
  const history = [];
  const results = [];

  const totalMs = scenario.duration_ticks * scenario.tick_interval_ms;
  handleMessage(buildStartedPayload(runId, scenario, 'turn_based', totalMs));

  // Navigation: mutable blue force state (deep copy)
  const navEnabled = !!scenario.navigation;
  const currentBlueForces = navEnabled
    ? JSON.parse(JSON.stringify(scenario.blue_forces))
    : null;

  let criticalActionTaken = false;

  for (let tick = 0; tick <= scenario.duration_ticks; tick++) {
    if (!activeSim?.running) break;

    // Gather layer context for AI prompt
    const layerContext = {};
    for (const layerKey of (scenario.layers || [])) {
      const data = getLayerData(layerKey);
      if (data) {
        const summary = summarizeLayerData(layerKey, data, {
          maxEntries: 15,
          nearLat: scenario.camera?.lat,
          nearLon: scenario.camera?.lon,
          nearRadiusKm: 2000,
        });
        if (summary) layerContext[layerKey] = summary;
      }
    }

    const worldState = buildWorldState(scenario, tick, config.variant, vars, layerContext, currentBlueForces);
    const { systemPrompt, userMessage } = buildPrompt(scenario, worldState, config.framing, history, vars);

    handleMessage({ type: 'tick', tick, totalTicks: scenario.duration_ticks, worldState });

    const t0 = Date.now();
    let decision;
    let retries = 0;
    const maxRetries = 3;
    while (retries <= maxRetries) {
      try {
        const llmOpts = navEnabled ? { maxTokens: 1024 } : {};
        const response = await adapter(config.model, systemPrompt, userMessage, llmOpts);
        console.log(`[wargame] Tick ${tick} raw response:`, response.text);
        const latencyMs = Date.now() - t0;
        decision = parseDecision(response.text, validActions, responseFormat, terminalActions);
        console.log(`[wargame] Tick ${tick} parsed action: ${decision.action}, movements: ${JSON.stringify(decision.movements)}`);
        decision.latencyMs = latencyMs;
        decision.usage = response.usage;
        break;
      } catch (err) {
        const isRateLimit = err.message.includes('429') || err.message.toLowerCase().includes('rate');
        if (isRateLimit && retries < maxRetries) {
          retries++;
          const backoff = retries * 4000;
          showStatus(`Rate limited — retrying in ${backoff / 1000}s (attempt ${retries}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        decision = {
          action: validActions.find(a => !scenario.actions.find(ac => ac.id === a && ac.terminal)) || validActions[0],
          confidence: 0, reasoning: `Error: ${err.message}`,
          raw: '', latencyMs: Date.now() - t0, usage: {}, movements: [],
        };
        break;
      }
    }

    // Navigation: apply movements, snapshot positions
    if (navEnabled && currentBlueForces) {
      const moves = decision.movements || [];
      if (moves.length > 0) {
        console.log(`[wargame] Tick ${tick} movements:`, JSON.stringify(moves));
      } else {
        console.log(`[wargame] Tick ${tick} no movements returned by LLM`);
      }
      applyMovements(currentBlueForces, moves, scenario.tick_interval_ms);
      decision.blue_positions = snapshotBluePositions(currentBlueForces);
    }

    results.push({ tick, ...decision });
    handleMessage({
      type: 'decision', tick, action: decision.action,
      confidence: decision.confidence, reasoning: decision.reasoning,
      latencyMs: decision.latencyMs,
      movements: decision.movements,
      blue_positions: decision.blue_positions,
    });

    const histEntry = { tick, action: decision.action, confidence: decision.confidence };
    if (decision.movements?.length) histEntry.movements = decision.movements;
    if (decision.blue_positions) histEntry.blue_positions = decision.blue_positions;
    history.push(histEntry);

    const terminalAction = scenario.actions.find(a => a.id === decision.action && a.terminal);
    if (terminalAction) {
      criticalActionTaken = true;
      handleMessage({ type: 'terminal', tick, action: decision.action, reasoning: decision.reasoning });
      break;
    }

    // Pace requests to respect rate limits (min 4s between ticks)
    if (tick < scenario.duration_ticks && activeSim?.running) {
      const elapsed = Date.now() - t0;
      const minDelay = Math.max(scenario.tick_interval_ms, 4000);
      const remaining = Math.max(0, minDelay - elapsed);
      await new Promise(r => setTimeout(r, remaining));
    }
  }

  const summary = buildSummary(runId, config, scenario, history, criticalActionTaken);
  handleMessage({ type: 'complete', ...summary });
  try { await saveResult(runId, results, summary); } catch (_) { /* IndexedDB may fail silently */ }
}

async function runBrowserRealtime(config, scenario, adapter) {
  const runId = generateRunId();
  const validActions = scenario.actions.map(a => a.id);
  const terminalActions = scenario.actions.filter(a => a.terminal).map(a => a.id);
  const vars = { ...scenario.variables, ...config.variables };
  const responseFormat = scenario.response_format || 'text';

  const totalMs = scenario.duration_seconds
    ? scenario.duration_seconds * 1000
    : scenario.duration_ticks * scenario.tick_interval_ms;
  const updateIntervalMs = scenario.update_interval_ms || 3000;
  const history = [];
  const results = [];

  handleMessage(buildStartedPayload(runId, scenario, 'realtime', totalMs));

  // Navigation: mutable blue force state (deep copy)
  const navEnabled = !!scenario.navigation;
  const currentBlueForces = navEnabled
    ? JSON.parse(JSON.stringify(scenario.blue_forces))
    : null;

  // Gather layer context once (static for the whole run)
  const layerContext = {};
  for (const layerKey of (scenario.layers || [])) {
    const data = getLayerData(layerKey);
    if (data) {
      const summary = summarizeLayerData(layerKey, data, {
        maxEntries: 15,
        nearLat: scenario.camera?.lat,
        nearLon: scenario.camera?.lon,
        nearRadiusKm: 2000,
      });
      if (summary) layerContext[layerKey] = summary;
    }
  }

  const startTime = Date.now();
  let criticalActionTaken = false;

  // Visual tick loop (1s interval)
  const visualInterval = setInterval(() => {
    if (!activeSim?.running || criticalActionTaken) {
      clearInterval(visualInterval);
      return;
    }
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / totalMs);
    const eqTick = progress * scenario.duration_ticks;
    const worldState = buildWorldState(scenario, eqTick, config.variant, vars, layerContext, currentBlueForces);
    worldState.elapsed_ms = elapsed;
    worldState.progress = progress;

    handleMessage({
      type: 'tick', tick: eqTick, totalTicks: scenario.duration_ticks,
      elapsed_ms: elapsed, progress, totalDurationMs: totalMs, worldState,
    });
  }, 1000);

  // Decision loop
  while (!criticalActionTaken && activeSim?.running) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= totalMs) break;

    const progress = Math.min(1, elapsed / totalMs);
    const eqTick = progress * scenario.duration_ticks;
    const worldState = buildWorldState(scenario, eqTick, config.variant, vars, layerContext, currentBlueForces);
    worldState.elapsed_ms = elapsed;
    worldState.progress = progress;
    const { systemPrompt, userMessage } = buildPrompt(scenario, worldState, config.framing, history, vars);

    const t0 = Date.now();
    try {
      const llmOpts = navEnabled ? { maxTokens: 1024 } : {};
      const response = await adapter(config.model, systemPrompt, userMessage, llmOpts);
      if (!activeSim?.running) break;

      const latencyMs = Date.now() - t0;
      const decisionElapsed = Date.now() - startTime;
      const decision = parseDecision(response.text, validActions, responseFormat, terminalActions);
      decision.latencyMs = latencyMs;

      // Navigation: apply movements, snapshot positions
      if (navEnabled && currentBlueForces) {
        const moves = decision.movements || [];
        if (moves.length > 0) {
          console.log(`[wargame] Realtime movements:`, JSON.stringify(moves));
        } else {
          console.log(`[wargame] Realtime: no movements returned by LLM`);
        }
        applyMovements(currentBlueForces, moves, updateIntervalMs);
        decision.blue_positions = snapshotBluePositions(currentBlueForces);
      }

      results.push({ elapsed_ms: decisionElapsed, ...decision });
      handleMessage({
        type: 'decision', elapsed_ms: decisionElapsed,
        action: decision.action, confidence: decision.confidence,
        reasoning: decision.reasoning, latencyMs,
        movements: decision.movements,
        blue_positions: decision.blue_positions,
      });

      const histEntry = {
        elapsed_ms: decisionElapsed, action: decision.action,
        confidence: decision.confidence,
      };
      if (decision.movements?.length) histEntry.movements = decision.movements;
      if (decision.blue_positions) histEntry.blue_positions = decision.blue_positions;
      history.push(histEntry);

      const terminal = scenario.actions.find(a => a.id === decision.action && a.terminal);
      if (terminal) {
        criticalActionTaken = true;
        handleMessage({
          type: 'terminal', elapsed_ms: decisionElapsed,
          action: decision.action, reasoning: decision.reasoning,
        });
        break;
      }
    } catch (err) {
      console.error('Realtime agent error:', err.message);
    }

    if (!criticalActionTaken && activeSim?.running) {
      const waited = Date.now() - t0;
      const remaining = Math.max(0, updateIntervalMs - waited);
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
    }
  }

  clearInterval(visualInterval);

  const summary = buildSummary(runId, config, scenario, history, criticalActionTaken);
  handleMessage({ type: 'complete', ...summary });
  try { await saveResult(runId, results, summary); } catch (_) { /* IndexedDB may fail silently */ }
}

// =====================================================
// MESSAGE HANDLER (shared by server + browser modes)
// =====================================================
function handleMessage(msg) {
  switch (msg.type) {
    case 'started':
      handleStarted(msg);
      break;
    case 'tick':
      handleTick(msg);
      break;
    case 'decision':
      handleDecision(msg);
      break;
    case 'terminal':
      handleTerminal(msg);
      break;
    case 'complete':
      handleComplete(msg);
      break;
    case 'stopped':
      running = false;
      updateButtons();
      showStatus('Simulation stopped.');
      break;
    case 'error':
      showStatus(`Error: ${msg.message}`, true);
      break;
  }
}

function handleStarted(msg) {
  const sc = msg.scenario;
  executionMode = msg.execution_mode || 'turn_based';
  criticalAction = sc.critical_action || null;
  totalDurationMs = msg.totalDurationMs || 0;

  const modeLabel = executionMode === 'realtime' ? 'REALTIME' : 'TURN-BASED';
  showStatus(`Running [${modeLabel}]: ${sc.label}`);

  if (sc.camera) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(sc.camera.lon, sc.camera.lat, sc.camera.alt),
      duration: 1.5,
    });
  }

  // Auto-enable scenario layers on the globe
  const scenarioLayers = sc.layers || [];
  for (const layerKey of scenarioLayers) {
    const loader = getLoader(layerKey);
    if (loader && entityMaps[layerKey]?.size === 0) {
      loader.load(viewer);
    }
    toggleLayer(viewer, layerKey, 'wargame', true);
  }

  // Auto-open 3D view panels for specialized scenarios
  if (sc.navigation) {
    const subView = getView('submarine');
    if (subView) subView.open(viewer);
  }
  if (sc.view === 'sniper') {
    const sniperView = getView('sniper');
    if (sniperView) sniperView.open(viewer);
  }

  // Register ephemeral scenario entity maps
  registerLayer('wg_blue');
  registerLayer('wg_red');

  (sc.blue_forces || []).forEach(bf => {
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(bf.position.lon, bf.position.lat, 5000),
      point: {
        pixelSize: 10, color: Cesium.Color.fromCssColorString(bf.color || '#00aaff'),
        outlineColor: Cesium.Color.WHITE, outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: bf.label, font: '11px Courier New',
        fillColor: Cesium.Color.fromCssColorString(bf.color || '#00aaff'),
        outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -16),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20_000_000),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 0.9,
      },
    });
    entity.acData = {
      hex: bf.id, r: bf.label, t: bf.type, flight: bf.label,
      desc: `${bf.label} // ${bf.type}`,
      alt_baro: 0, gs: 0, track: 0,
      _view: sc.navigation ? 'submarine' : 'site',
      _subConfig: sc.navigation ? {
        id: bf.id, label: bf.label, type: bf.type,
        lat: bf.position.lat, lon: bf.position.lon,
        heading: bf.heading || 0, speed_kts: bf.speed_kts || 0,
        max_speed_kts: bf.max_speed_kts || 30,
      } : undefined,
    };
    wargameEntities.set(bf.id, { entity, type: 'blue' });
    entityMaps.wg_blue.set(bf.id, { entity });
  });
}

function handleTick(msg) {
  const { worldState } = msg;

  if (msg.elapsed_ms !== undefined) {
    const elapsedSec = (msg.elapsed_ms / 1000).toFixed(1);
    const totalSec = (totalDurationMs / 1000).toFixed(0);
    const pct = Math.round((msg.progress || 0) * 100);
    $('wg-tick').textContent = `${elapsedSec}s / ${totalSec}s (${pct}%)`;
    showStatus(`Realtime — ${elapsedSec}s elapsed — Waiting for agent...`);
  } else {
    $('wg-tick').textContent = `TICK ${msg.tick}/${msg.totalTicks}`;
    showStatus(`Tick ${msg.tick}/${msg.totalTicks} — Waiting for agent decision...`);
  }

  (worldState.contacts || []).forEach(c => {
    const altM = Math.max((c.alt || 0) * 1000, 5000);
    const pos = Cesium.Cartesian3.fromDegrees(c.lon, c.lat, altM);
    if (wargameEntities.has(c.id)) {
      wargameEntities.get(c.id).entity.position = pos;
    } else {
      const entity = viewer.entities.add({
        position: pos,
        point: {
          pixelSize: 8, color: Cesium.Color.fromCssColorString(c.color || '#ff3333'),
          outlineColor: Cesium.Color.WHITE, outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: c.label, font: '10px Courier New',
          fillColor: Cesium.Color.fromCssColorString(c.color || '#ff3333'),
          outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -14),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20_000_000),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: 0.85,
        },
      });
      entity.acData = {
        hex: c.id, r: c.label, t: 'RED CONTACT', flight: c.label,
        desc: `${c.label} // UNIDENTIFIED`,
        alt_baro: (c.alt || 0) * 3280.84, gs: 0, track: 0,
        _view: 'site',
      };
      wargameEntities.set(c.id, { entity, type: 'red' });
      entityMaps.wg_red.set(c.id, { entity });
    }
  });

  // Update blue force positions when navigation is active
  (worldState.blue_forces || []).forEach(bf => {
    if (wargameEntities.has(bf.id)) {
      const rec = wargameEntities.get(bf.id);
      rec.entity.position = Cesium.Cartesian3.fromDegrees(bf.position.lon, bf.position.lat, 5000);
    }
  });

  const intelMsgs = worldState.intelMessages || [];
  if (intelMsgs.length > lastIntelCount) {
    for (let i = lastIntelCount; i < intelMsgs.length; i++) {
      appendFeed('intel', 'INTEL', intelMsgs[i]);
    }
    lastIntelCount = intelMsgs.length;
  }
}

function handleDecision(msg) {
  const isCritical = criticalAction && msg.action === criticalAction;
  const actionClass = isCritical ? 'critical' : 'normal';

  const timeLabel = msg.elapsed_ms !== undefined
    ? `${(msg.elapsed_ms / 1000).toFixed(1)}s`
    : `T${msg.tick}`;

  let body = `${msg.reasoning} (confidence: ${msg.confidence}, ${msg.latencyMs}ms)`;

  // Show movement commands if present
  if (msg.movements && msg.movements.length > 0) {
    const moveStr = msg.movements.map(m =>
      `${m.id}: ${Math.round(m.heading)}° @ ${Math.round(m.speed_kts)}kts`
    ).join(', ');
    body += ` [MOVE: ${moveStr}]`;
  }

  appendFeed(actionClass, `${timeLabel} → ${msg.action}`, body);

  const statusTime = msg.elapsed_ms !== undefined
    ? `${(msg.elapsed_ms / 1000).toFixed(1)}s`
    : `Tick ${msg.tick}`;
  showStatus(`${statusTime} — Agent chose: ${msg.action}`);

  // Notify sniper view of decisions (for visual feedback)
  const sv = getView('sniper');
  if (sv?.isOpen() && sv.notify) sv.notify(msg);
}

function handleTerminal(msg) {
  appendFeed('critical', `TERMINAL ACTION: ${msg.action}`, msg.reasoning);
}

function handleComplete(msg) {
  running = false;
  updateButtons();
  if (ws) { ws.close(); ws = null; }

  const launched = msg.criticalActionTaken;
  const resultClass = launched ? 'result-critical' : 'result-safe';
  const resultText = launched
    ? `YES — Agent chose ${msg.criticalAction}`
    : `NO — Agent held through all ${msg.totalDecisions} decisions`;

  $('wg-result').className = `wg-result ${resultClass}`;
  $('wg-result').innerHTML = '';

  const resultTextEl = document.createElement('div');
  resultTextEl.textContent = `${msg.binaryQuestion} ${resultText}`;
  $('wg-result').appendChild(resultTextEl);

  // Build playback manifest for this run
  if (msg.runId && lastCompletedConfig) {
    const btnRow = document.createElement('div');
    btnRow.className = 'wg-result-buttons';

    const playbackBtn = document.createElement('button');
    playbackBtn.className = 'wg-playback-btn';
    playbackBtn.textContent = 'WATCH PLAYBACK';
    playbackBtn.onclick = () => {
      if (typeof window.switchMode === 'function') {
        window.switchMode('playback');
      }
    };
    btnRow.appendChild(playbackBtn);

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'wg-playback-btn';
    downloadBtn.textContent = 'DOWNLOAD';
    downloadBtn.onclick = () => downloadResult(msg);
    btnRow.appendChild(downloadBtn);

    $('wg-result').appendChild(btnRow);
  }

  $('wg-result').style.display = 'block';
  showStatus(`Complete. Run ID: ${msg.runId}`);
}

// =====================================================
// DOWNLOAD / UPLOAD
// =====================================================
async function downloadResult(summary) {
  // Try to get full decision data from IndexedDB (includes movements + blue_positions)
  let fullDecisions = summary.decisions || [];
  if (summary.runId) {
    try {
      const run = await getResult(summary.runId);
      if (run?.decisions?.length) fullDecisions = run.decisions;
    } catch (_) { /* fall back to summary.decisions */ }
  }

  const payload = {
    _format: 'panopticon-wargame-result',
    _version: 1,
    runId: summary.runId,
    timestamp: Date.now(),
    summary: {
      scenario: summary.scenario,
      variant: summary.variant,
      framing: summary.framing,
      provider: summary.provider,
      model: summary.model,
      execution_mode: summary.execution_mode,
      layers: summary.layers || [],
      criticalActionTaken: summary.criticalActionTaken,
      criticalAction: summary.criticalAction,
      binaryQuestion: summary.binaryQuestion,
      totalDecisions: summary.totalDecisions,
    },
    decisions: fullDecisions,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wargame-${summary.scenario || 'result'}-${summary.runId || Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function uploadResults() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.multiple = true;
  input.onchange = async () => {
    let imported = 0;
    for (const file of input.files) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        // Handle both single result and array (from EXPORT ALL)
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const data of items) {
          if (!data.runId || !data.summary) continue;
          await saveResult(data.runId, data.decisions || [], data.summary);
          imported++;
        }
      } catch (err) {
        console.error(`Failed to import ${file.name}:`, err);
      }
    }
    if (imported > 0) {
      showStatus(`Imported ${imported} result(s).`);
      await loadPlaybackList();
    }
  };
  input.click();
}

// =====================================================
// UI HELPERS
// =====================================================
function clearEntities() {
  wargameEntities.forEach(({ entity }) => viewer.entities.remove(entity));
  wargameEntities.clear();
  if (entityMaps.wg_blue) entityMaps.wg_blue.clear();
  if (entityMaps.wg_red) entityMaps.wg_red.clear();
}

function clearFeed() {
  $('wg-feed').innerHTML = '';
  $('wg-result').style.display = 'none';
  $('wg-result').className = 'wg-result';
  $('wg-tick').textContent = '';
}

function appendFeed(type, title, body) {
  const feed = $('wg-feed');
  const entry = document.createElement('div');
  entry.className = `wg-entry wg-${type}`;
  entry.innerHTML = `<div class="wg-entry-title">${title}</div><div class="wg-entry-body">${body}</div>`;
  feed.appendChild(entry);
  feed.scrollTop = feed.scrollHeight;
}

function showStatus(text, isError) {
  const el = $('wg-status');
  el.textContent = text;
  el.style.color = isError ? '#ff4444' : '#888';
}

function updateButtons() {
  $('wg-start').style.display = running ? 'none' : 'inline-block';
  $('wg-stop').style.display = running ? 'inline-block' : 'none';
  ['wg-scenario', 'wg-variant', 'wg-framing', 'wg-provider', 'wg-model',
   'wg-execution-mode', 'wg-variables'].forEach(id => {
    const el = $(id);
    if (el) el.disabled = running;
  });
}

// =====================================================
// EXPOSE FOR HTML onclick
// =====================================================
window.wgStart = startSimulation;
window.wgStop = stopSimulation;
window.wgUploadResults = uploadResults;
window.wgSaveSettings = function () {
  saveSettings({
    googleApiKey: $('wg-key-google')?.value?.trim() || '',
    anthropicApiKey: $('wg-key-anthropic')?.value?.trim() || '',
    openaiApiKey: $('wg-key-openai')?.value?.trim() || '',
    xaiApiKey: $('wg-key-xai')?.value?.trim() || '',
    openrouterApiKey: $('wg-key-openrouter')?.value?.trim() || '',
    proxyUrl: $('wg-proxy-url')?.value?.trim() || '',
    openaiBaseUrl: $('wg-openai-base')?.value?.trim() || '',
  });
  updateProviderNote();
  showStatus('Settings saved.');
};
window.wgToggleSettings = function () {
  const body = $('wg-settings-body');
  const arrow = $('wg-settings-arrow');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    arrow.textContent = '\u25BC';
  } else {
    body.style.display = 'none';
    arrow.textContent = '\u25B6';
  }
};
