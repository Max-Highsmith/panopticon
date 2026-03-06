/* ===================================================================
   PANOPTICON — Wargame Mode Controller
   Connects to server via WebSocket, renders entities, shows decision feed.
   =================================================================== */

import { $ } from './utils.js';

let ws = null;
let viewer = null;
let wargameEntities = new Map();
let running = false;
let scenarioCache = null;

// =====================================================
// PUBLIC API
// =====================================================
export function startWargameMode(v) {
  viewer = v;
  $('wargame-panel').style.display = 'block';
  $('scenario-sidebar').style.display = 'none';
  $('timeline-bar').style.display = 'none';
  loadScenarioList();
}

export function stopWargameMode() {
  if (running) stopSimulation();
  $('wargame-panel').style.display = 'none';
  clearEntities();
}

export function isWargameRunning() { return running; }

// =====================================================
// SCENARIO LIST (fetched from server)
// =====================================================
async function loadScenarioList() {
  try {
    const res = await fetch('/api/scenarios');
    if (!res.ok) {
      showStatus('Server not running. Start with: cd server && npm start', true);
      return;
    }
    scenarioCache = await res.json();
    populateSelectors();
    showStatus('Ready. Configure and press START.');
  } catch (_err) {
    showStatus('Cannot reach server at /api/scenarios. Start the server.', true);
  }
}

function populateSelectors() {
  if (!scenarioCache || scenarioCache.length === 0) return;

  const scenarioSel = $('wg-scenario');
  scenarioSel.innerHTML = '';
  scenarioCache.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
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
}

// =====================================================
// SIMULATION CONTROL
// =====================================================
export function startSimulation() {
  if (running) return;

  const config = {
    scenario: $('wg-scenario').value,
    variant: $('wg-variant').value,
    framing: $('wg-framing').value,
    provider: $('wg-provider').value,
    model: $('wg-model').value || undefined,
  };

  clearFeed();
  clearEntities();
  showStatus('Connecting...');

  // Connect WebSocket
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.onopen = () => {
    running = true;
    updateButtons();
    showStatus('Simulation started. Waiting for first tick...');
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

export function stopSimulation() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'stop' }));
  }
  running = false;
  updateButtons();
  if (ws) { ws.close(); ws = null; }
}

// =====================================================
// MESSAGE HANDLER
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
  showStatus(`Running: ${sc.label} — Tick 0/${sc.duration_ticks}`);

  // Fly camera to scenario view
  if (sc.camera) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(sc.camera.lon, sc.camera.lat, sc.camera.alt),
      duration: 1.5,
    });
  }

  // Create blue force entities
  (sc.blue_forces || []).forEach(bf => {
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(bf.position.lon, bf.position.lat, 0),
      point: { pixelSize: 10, color: Cesium.Color.fromCssColorString(bf.color || '#00aaff'), outlineColor: Cesium.Color.WHITE, outlineWidth: 1 },
      label: {
        text: bf.label, font: '11px Courier New',
        fillColor: Cesium.Color.fromCssColorString(bf.color || '#00aaff'),
        outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -16),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20_000_000),
        scale: 0.9,
      },
    });
    wargameEntities.set(bf.id, { entity, type: 'blue' });
  });
}

function handleTick(msg) {
  const { tick, totalTicks, worldState } = msg;
  showStatus(`Tick ${tick}/${totalTicks} — Waiting for agent decision...`);
  $('wg-tick').textContent = `TICK ${tick}/${totalTicks}`;

  // Update red contact positions
  (worldState.contacts || []).forEach(c => {
    const pos = Cesium.Cartesian3.fromDegrees(c.lon, c.lat, (c.alt || 0) * 1000);
    if (wargameEntities.has(c.id)) {
      wargameEntities.get(c.id).entity.position = pos;
    } else {
      const entity = viewer.entities.add({
        position: pos,
        point: { pixelSize: 8, color: Cesium.Color.fromCssColorString(c.color || '#ff3333'), outlineColor: Cesium.Color.WHITE, outlineWidth: 1 },
        label: {
          text: c.label, font: '10px Courier New',
          fillColor: Cesium.Color.fromCssColorString(c.color || '#ff3333'),
          outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -14),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 20_000_000),
          scale: 0.85,
        },
      });
      wargameEntities.set(c.id, { entity, type: 'red' });
    }
  });

  // Show intel in feed
  const latestIntel = worldState.intelMessages[worldState.intelMessages.length - 1];
  if (latestIntel) appendFeed('intel', `INTEL`, latestIntel);
}

function handleDecision(msg) {
  const actionClass = msg.action === 'LAUNCH_RETALIATION' ? 'critical' : 'normal';
  appendFeed(actionClass, `T${msg.tick} → ${msg.action}`,
    `${msg.reasoning} (confidence: ${msg.confidence}, ${msg.latencyMs}ms)`);
  showStatus(`Tick ${msg.tick} — Agent chose: ${msg.action}`);
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
    : `NO — Agent held through all ${msg.totalDecisions} ticks`;

  $('wg-result').className = `wg-result ${resultClass}`;
  $('wg-result').textContent = `${msg.binaryQuestion} ${resultText}`;
  $('wg-result').style.display = 'block';

  showStatus(`Complete. Run ID: ${msg.runId}`);
}

// =====================================================
// UI HELPERS
// =====================================================
function clearEntities() {
  wargameEntities.forEach(({ entity }) => viewer.entities.remove(entity));
  wargameEntities.clear();
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
  // Disable config while running
  ['wg-scenario', 'wg-variant', 'wg-framing', 'wg-provider', 'wg-model'].forEach(id => {
    $(id).disabled = running;
  });
}

// =====================================================
// EXPOSE FOR HTML onclick
// =====================================================
window.wgStart = startSimulation;
window.wgStop = stopSimulation;
