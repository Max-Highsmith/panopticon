/* ===================================================================
   PANOPTICON WARGAME SERVER — POC
   Express + WebSocket + LLM Agent Adapters + Simulation Engine
   Supports turn-based and realtime execution modes.
   =================================================================== */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import {
  applyVariables, interpolateContact, buildWorldState, buildPrompt,
  parseDecision, generateRunId, buildStartedPayload, buildSummary,
  summarizeLayerData, applyMovements, snapshotBluePositions,
} from '../js/simulation.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SCENARIOS_DIR = join(ROOT, 'scenarios');
const RESULTS_DIR = join(ROOT, 'results');
const PLAYBACKS_DIR = join(ROOT, 'playbacks');

if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
if (!existsSync(PLAYBACKS_DIR)) mkdirSync(PLAYBACKS_DIR, { recursive: true });

// =====================================================
// LAYER DATA — server-side loading for wargame AI context
// =====================================================
// Maps layer key → data file path (relative to ROOT)
const LAYER_DATA_FILES = {
  // Points
  mines: 'data/layers/points/mines.json', infra: 'data/layers/points/infrastructure.json',
  nuclear: 'data/layers/points/nuclear_plants.json',
  bases: 'data/layers/points/military_bases.json', airports: 'data/layers/points/airports.json',
  arcticmining: 'data/layers/points/arctic_mining.json', rareearth: 'data/layers/points/rare_earth.json',
  drilling: 'data/layers/points/drilling_leases.json', powerplants: 'data/layers/points/power_plants.json',
  nuclearplants: 'data/layers/points/nuclear_plants.json', refineries: 'data/layers/points/oil_refineries.json',
  platforms: 'data/layers/points/offshore_platforms.json', radar: 'data/layers/points/radar_installations.json',
  strategicnuclear: 'data/layers/points/strategic_nuclear.json', volcanoes: 'data/layers/points/volcanoes.json',
  earthquakes: 'data/layers/points/earthquakes.json', wildfires: 'data/layers/points/wildfires.json',
  spacedebris: 'data/layers/points/space_debris.json', spaceports: 'data/layers/points/spaceports.json',
  lightning: 'data/layers/points/lightning.json', ports: 'data/layers/points/ports.json',
  ixps: 'data/layers/points/internet_exchanges.json', oceantemp: 'data/layers/points/ocean_temp.json',
  meteors: 'data/layers/points/meteor_impacts.json', cosmic: 'data/layers/points/cosmic_radiation.json',
  ionosphere: 'data/layers/points/ionosphere.json', arcticdeposits: 'data/layers/points/arctic_deposits.json',
  // Paths
  cables: 'data/layers/paths/submarine_cables.json', pipelines: 'data/layers/paths/pipelines.json',
  traderoutes: 'data/layers/paths/trade_routes.json', arcticroutes: 'data/layers/paths/arctic_routes.json',
  electricalgrid: 'data/layers/paths/electrical_grid.json',
  whales: 'data/layers/paths/whale_migrations.json', seaturtles: 'data/layers/paths/sea_turtles.json',
  birds: 'data/layers/paths/bird_migration.json', elephants: 'data/layers/paths/elephant_migration.json',
  oceancurrents: 'data/layers/paths/ocean_currents.json', cargoroutes: 'data/layers/paths/cargo_routes.json',
  commodityflows: 'data/layers/paths/commodity_flows.json',
  // Regions
  chokepoints: 'data/layers/regions/chokepoints.json', fisheries: 'data/layers/regions/fisheries_zones.json',
  seaice: 'data/layers/regions/sea_ice.json', fishingfleets: 'data/layers/regions/fishing_fleets.json',
};

function loadLayerContext(scenario) {
  const ctx = {};
  for (const key of (scenario.layers || [])) {
    const relPath = LAYER_DATA_FILES[key];
    if (!relPath) continue;
    try {
      const raw = JSON.parse(readFileSync(join(ROOT, relPath), 'utf-8'));
      const summary = summarizeLayerData(key, raw, {
        maxEntries: 15,
        nearLat: scenario.camera?.lat,
        nearLon: scenario.camera?.lon,
        nearRadiusKm: 2000,
      });
      if (summary) ctx[key] = summary;
    } catch { /* skip if file not found */ }
  }
  return ctx;
}

// =====================================================
// EXPRESS + STATIC FILES
// =====================================================
const app = express();
app.use(express.json());
app.use(express.static(ROOT, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

const server = createServer(app);
const wss = new WebSocketServer({ server });

// =====================================================
// HLS CORS PROXY — Proxies .m3u8 and .ts segments
// =====================================================
const HLS_ALLOWED_HOSTS = new Set([
  'video3.earthcam.com',
  'videos-3.earthcam.com',
  'strmr3.sha.maryland.gov',
  'strmr5.sha.maryland.gov',
  'iowadotsfs2.us-east-1.skyvdn.com',
  's12.us-east-1.skyvdn.com',
  's58.nysdot.skyvdn.com',
  'cams.cdn-surfline.com',
]);

app.get('/hlsproxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url parameter');

  let parsed;
  try { parsed = new URL(targetUrl); } catch { return res.status(400).send('Invalid URL'); }

  if (!HLS_ALLOWED_HOSTS.has(parsed.hostname)) {
    return res.status(403).send('Host not in allowlist');
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Panopticon/1.0)' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) return res.status(upstream.status).send('Upstream error');

    const contentType = upstream.headers.get('content-type') || '';
    if (targetUrl.endsWith('.m3u8') || contentType.includes('mpegurl')) {
      let body = await upstream.text();
      const base = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      body = body.replace(/^(?!#)(\S+\.(?:m3u8|ts|aac|mp4|fmp4)\S*)/gm, (match) => {
        const absolute = match.startsWith('http') ? match : base + match;
        return '/hlsproxy?url=' + encodeURIComponent(absolute);
      });
      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      res.set('Access-Control-Allow-Origin', '*');
      return res.send(body);
    }

    res.set('Content-Type', contentType || 'video/mp2t');
    res.set('Access-Control-Allow-Origin', '*');

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error('HLS proxy error:', err.message);
    res.status(502).send('Proxy fetch failed');
  }
});

// =====================================================
// AGENT ADAPTERS
// =====================================================
const adapters = {
  async anthropic(model, systemPrompt, userMessage, opts = {}) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set in server/.env');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-5-20250929',
        max_tokens: opts.maxTokens || 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return { text: data.content[0].text, usage: data.usage };
  },

  async openai(model, systemPrompt, userMessage, opts = {}) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set in server/.env');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        max_tokens: opts.maxTokens || 512,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return { text: data.choices[0].message.content, usage: data.usage };
  },

  async google(model, systemPrompt, userMessage, opts = {}) {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('GOOGLE_API_KEY not set in server/.env');
    const m = model || 'gemini-2.5-pro';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: opts.maxTokens || 512 },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return { text: data.candidates[0].content.parts[0].text, usage: {} };
  },

  async xai(model, systemPrompt, userMessage, opts = {}) {
    const key = process.env.XAI_API_KEY;
    if (!key) throw new Error('XAI_API_KEY not set in server/.env');
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: model || 'grok-3',
        max_tokens: opts.maxTokens || 512,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`xAI API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return { text: data.choices[0].message.content, usage: data.usage };
  },

  async openrouter(model, systemPrompt, userMessage, opts = {}) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('OPENROUTER_API_KEY not set in server/.env');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: model || 'qwen/qwen3.5-flash-02-23',
        max_tokens: opts.maxTokens || 512,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return { text: data.choices[0].message.content, usage: data.usage };
  },

  // Deterministic baseline — no API call
  async baseline(model, _sys, _usr) {
    const action = model === 'always-launch' ? 'LAUNCH_RETALIATION' : 'HOLD_FIRE';
    return {
      text: `ACTION: ${action}\nCONFIDENCE: 1.0\nREASONING: Baseline deterministic agent.`,
      usage: {},
    };
  },
};

// =====================================================
// SCENARIO LOADER
// =====================================================
function loadScenario(id) {
  const filePath = join(SCENARIOS_DIR, id + '.json');
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function listScenarios() {
  return readdirSync(SCENARIOS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .map(f => {
      const s = JSON.parse(readFileSync(join(SCENARIOS_DIR, f), 'utf-8'));
      // Detect stub scenarios: only have generic ESCALATE/HOLD/NEGOTIATE/WITHDRAW actions
      const actionIds = (s.actions || []).map(a => a.id).sort().join(',');
      const isStub = actionIds === 'ESCALATE,HOLD,NEGOTIATE,WITHDRAW';
      return {
        id: s.id, label: s.label, description: s.description,
        variants: Object.keys(s.intel_feed), framings: Object.keys(s.framings),
        execution_mode: s.execution_mode || 'turn_based',
        variables: s.variables || {},
        ready: !isStub,
      };
    });
}

// =====================================================
// SIMULATION ENGINE — Shared (imported from js/simulation.js)
// =====================================================
let activeSim = null;

function logDecision(runId, entry) {
  const file = join(RESULTS_DIR, `${runId}.jsonl`);
  appendFileSync(file, JSON.stringify(entry) + '\n');
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

// =====================================================
// SIMULATION — Turn-Based
// =====================================================
async function runTurnBasedSimulation(config, scenario) {
  const runId = generateRunId();
  const validActions = scenario.actions.map(a => a.id);
  const terminalActions = scenario.actions.filter(a => a.terminal).map(a => a.id);
  const adapter = adapters[config.provider];
  if (!adapter) throw new Error(`Unknown provider: ${config.provider}`);
  const vars = { ...scenario.variables, ...config.variables };
  const responseFormat = scenario.response_format || 'text';

  const history = [];
  activeSim = { runId, mode: 'turn_based' };

  logDecision(runId, {
    runId, scenario: config.scenario, variant: config.variant,
    framing: config.framing, provider: config.provider, model: config.model,
    execution_mode: 'turn_based', variables: vars,
    startedAt: new Date().toISOString(),
  });

  const totalDurationMs = scenario.duration_ticks * scenario.tick_interval_ms;
  broadcast(buildStartedPayload(runId, scenario, 'turn_based', totalDurationMs));

  const layerContext = loadLayerContext(scenario);

  // Navigation: mutable blue force state (deep copy)
  const navEnabled = !!scenario.navigation;
  const currentBlueForces = navEnabled
    ? JSON.parse(JSON.stringify(scenario.blue_forces))
    : null;

  let criticalActionTaken = false;

  for (let tick = 0; tick <= scenario.duration_ticks; tick++) {
    if (!activeSim) break;

    const worldState = buildWorldState(scenario, tick, config.variant, vars, layerContext, currentBlueForces);
    const { systemPrompt, userMessage } = buildPrompt(scenario, worldState, config.framing, history, vars);

    broadcast({ type: 'tick', tick, totalTicks: scenario.duration_ticks, worldState });

    let decision;
    const t0 = Date.now();
    try {
      const llmOpts = navEnabled ? { maxTokens: 1024 } : {};
      const response = await adapter(config.model, systemPrompt, userMessage, llmOpts);
      const latencyMs = Date.now() - t0;
      decision = parseDecision(response.text, validActions, responseFormat, terminalActions);
      decision.latencyMs = latencyMs;
      decision.usage = response.usage;
    } catch (err) {
      console.error(`Agent error at tick ${tick}:`, err.message);
      decision = {
        action: validActions.find(a => !terminalActions.includes(a)) || validActions[0],
        confidence: 0, reasoning: `Agent error: ${err.message}`,
        raw: '', latencyMs: Date.now() - t0, usage: {}, movements: [],
      };
    }

    // Navigation: apply movements, snapshot positions
    if (navEnabled && currentBlueForces) {
      const moves = decision.movements || [];
      console.log(`[wargame] Tick ${tick} movements: ${moves.length > 0 ? JSON.stringify(moves) : 'none'}`);
      applyMovements(currentBlueForces, moves, scenario.tick_interval_ms);
      decision.blue_positions = snapshotBluePositions(currentBlueForces);
    }

    logDecision(runId, { tick, ...decision, raw: undefined });
    broadcast({ type: 'decision', tick, action: decision.action,
                confidence: decision.confidence, reasoning: decision.reasoning,
                latencyMs: decision.latencyMs,
                movements: decision.movements,
                blue_positions: decision.blue_positions });

    const histEntry = { tick, action: decision.action, confidence: decision.confidence };
    if (decision.movements?.length) histEntry.movements = decision.movements;
    if (decision.blue_positions) histEntry.blue_positions = decision.blue_positions;
    history.push(histEntry);

    const terminalAction = scenario.actions.find(a => a.id === decision.action && a.terminal);
    if (terminalAction) {
      criticalActionTaken = true;
      broadcast({ type: 'terminal', tick, action: decision.action,
                  reasoning: decision.reasoning });
      break;
    }

    if (tick < scenario.duration_ticks && activeSim) {
      await new Promise(r => setTimeout(r, scenario.tick_interval_ms));
    }
  }

  const summary = buildSummary(runId, config, scenario, history, criticalActionTaken);
  logDecision(runId, { type: 'summary', ...summary });
  generatePlaybackManifest(runId, config, scenario, summary);
  broadcast({ type: 'complete', ...summary });
  activeSim = null;
  return summary;
}

// =====================================================
// SIMULATION — Realtime
// =====================================================
async function runRealtimeSimulation(config, scenario) {
  const runId = generateRunId();
  const validActions = scenario.actions.map(a => a.id);
  const terminalActions = scenario.actions.filter(a => a.terminal).map(a => a.id);
  const adapter = adapters[config.provider];
  if (!adapter) throw new Error(`Unknown provider: ${config.provider}`);
  const vars = { ...scenario.variables, ...config.variables };
  const responseFormat = scenario.response_format || 'text';

  const totalDurationMs = scenario.duration_seconds
    ? scenario.duration_seconds * 1000
    : scenario.duration_ticks * scenario.tick_interval_ms;
  const updateIntervalMs = scenario.update_interval_ms || 3000;

  const history = [];
  activeSim = { runId, mode: 'realtime' };

  logDecision(runId, {
    runId, scenario: config.scenario, variant: config.variant,
    framing: config.framing, provider: config.provider, model: config.model,
    execution_mode: 'realtime', variables: vars,
    startedAt: new Date().toISOString(),
  });

  broadcast(buildStartedPayload(runId, scenario, 'realtime', totalDurationMs));

  const layerContext = loadLayerContext(scenario);

  // Navigation: mutable blue force state (deep copy)
  const navEnabled = !!scenario.navigation;
  const currentBlueForces = navEnabled
    ? JSON.parse(JSON.stringify(scenario.blue_forces))
    : null;

  const startTime = Date.now();
  let criticalActionTaken = false;

  return new Promise((resolve) => {
    // --- World state broadcast (1s interval for smooth visualization) ---
    const visualInterval = setInterval(() => {
      if (!activeSim || criticalActionTaken) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / totalDurationMs);
      const eqTick = progress * scenario.duration_ticks;
      const worldState = buildWorldState(scenario, eqTick, config.variant, vars, layerContext, currentBlueForces);
      worldState.elapsed_ms = elapsed;
      worldState.progress = progress;

      broadcast({
        type: 'tick', tick: eqTick, totalTicks: scenario.duration_ticks,
        elapsed_ms: elapsed, progress, totalDurationMs, worldState,
      });
    }, 1000);

    // --- LLM decision loop (runs sequentially, async) ---
    const decisionLoop = async () => {
      while (!criticalActionTaken && activeSim) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= totalDurationMs) break;

        const progress = Math.min(1, elapsed / totalDurationMs);
        const eqTick = progress * scenario.duration_ticks;
        const worldState = buildWorldState(scenario, eqTick, config.variant, vars, layerContext, currentBlueForces);
        worldState.elapsed_ms = elapsed;
        worldState.progress = progress;
        const { systemPrompt, userMessage } = buildPrompt(scenario, worldState, config.framing, history, vars);

        const t0 = Date.now();
        try {
          const llmOpts = navEnabled ? { maxTokens: 1024 } : {};
          const response = await adapter(config.model, systemPrompt, userMessage, llmOpts);
          if (!activeSim) break; // stopped while waiting

          const latencyMs = Date.now() - t0;
          const decisionElapsed = Date.now() - startTime;
          const decision = parseDecision(response.text, validActions, responseFormat, terminalActions);
          decision.latencyMs = latencyMs;

          // Navigation: apply movements, snapshot positions
          if (navEnabled && currentBlueForces) {
            const moves = decision.movements || [];
            console.log(`[wargame] Realtime movements: ${moves.length > 0 ? JSON.stringify(moves) : 'none'}`);
            applyMovements(currentBlueForces, moves, updateIntervalMs);
            decision.blue_positions = snapshotBluePositions(currentBlueForces);
          }

          logDecision(runId, { elapsed_ms: decisionElapsed, ...decision, raw: undefined });
          broadcast({
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
            broadcast({
              type: 'terminal', elapsed_ms: decisionElapsed,
              action: decision.action, reasoning: decision.reasoning,
            });
            break;
          }
        } catch (err) {
          console.error('Realtime agent error:', err.message);
        }

        // Wait before next LLM call (account for time already spent)
        if (!criticalActionTaken && activeSim) {
          const waited = Date.now() - t0;
          const remaining = Math.max(0, updateIntervalMs - waited);
          if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
        }
      }
    };

    // --- Timeout: end simulation when duration expires ---
    const timeoutId = setTimeout(() => {
      if (!criticalActionTaken && activeSim) {
        clearInterval(visualInterval);
        const summary = buildSummary(runId, config, scenario, history, false);
        logDecision(runId, { type: 'summary', ...summary });
        generatePlaybackManifest(runId, config, scenario, summary);
        broadcast({ type: 'complete', ...summary });
        activeSim = null;
        resolve(summary);
      }
    }, totalDurationMs + 500); // small buffer for in-flight LLM call

    // Start the decision loop
    decisionLoop().then(() => {
      clearInterval(visualInterval);
      clearTimeout(timeoutId);
      if (criticalActionTaken) {
        const summary = buildSummary(runId, config, scenario, history, true);
        logDecision(runId, { type: 'summary', ...summary });
        generatePlaybackManifest(runId, config, scenario, summary);
        broadcast({ type: 'complete', ...summary });
        activeSim = null;
        resolve(summary);
      } else if (!activeSim) {
        // Stopped by user
        resolve(null);
      }
      // else: timeout handler will finalize
    });
  });
}

// =====================================================
// SIMULATION — Dispatcher
// =====================================================
async function runSimulation(config) {
  const scenario = loadScenario(config.scenario);
  const mode = config.execution_mode || scenario.execution_mode || 'turn_based';
  config.execution_mode = mode;

  if (mode === 'realtime') {
    return runRealtimeSimulation(config, scenario);
  } else {
    return runTurnBasedSimulation(config, scenario);
  }
}

// =====================================================
// PLAYBACK MANIFEST GENERATION
// =====================================================
function generatePlaybackManifest(runId, config, scenario, summary) {
  const manifest = {
    id: `wg-${runId}`,
    type: 'wargame',
    label: `${(scenario.label || config.scenario).toUpperCase()} // ${config.provider.toUpperCase()}`,
    subtitle: `WARGAME PLAYBACK // ${(scenario.label || config.scenario).toUpperCase()}`,
    description: `${config.provider.toUpperCase()} // ${config.variant.replace(/_/g, ' ').toUpperCase()} // ${config.framing.toUpperCase()}`,
    category: 'wargame',
    date: new Date().toISOString().slice(0, 10),
    camera: scenario.camera || null,
    region: scenario.region || null,
    timeline: {
      domain: 'ticks',
      totalTicks: scenario.duration_ticks || 8,
      tickIntervalMs: scenario.tick_interval_ms || 6000,
    },
    data: {
      scenarioFile: `scenarios/${config.scenario}.json`,
      resultsFile: `results/${runId}.jsonl`,
      variant: config.variant,
      framing: config.framing,
      resultsSource: 'file',
    },
    display: { layers: scenario.layers || [] },
    summary: {
      provider: config.provider,
      model: config.model || null,
      criticalActionTaken: summary.criticalActionTaken,
      criticalAction: summary.criticalAction,
      binaryQuestion: summary.binaryQuestion,
      totalDecisions: summary.totalDecisions,
    },
    tags: ['wargame', config.provider, config.scenario].filter(Boolean),
  };

  const filename = `wg-${runId}.json`;
  writeFileSync(join(PLAYBACKS_DIR, filename), JSON.stringify(manifest, null, 2));
  console.log(`Playback manifest written: ${filename}`);
  return manifest;
}

// =====================================================
// REST API
// =====================================================
app.get('/api/scenarios', (_req, res) => {
  try {
    res.json(listScenarios());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wargame/start', async (req, res) => {
  if (activeSim) return res.status(409).json({ error: 'Simulation already running' });
  const { scenario, variant, framing, provider, model, execution_mode, variables } = req.body;
  if (!scenario || !variant || !framing || !provider) {
    return res.status(400).json({ error: 'Missing required fields: scenario, variant, framing, provider' });
  }
  res.json({ status: 'started', runId: 'pending' });
  runSimulation({ scenario, variant, framing, provider, model, execution_mode, variables }).catch(err => {
    console.error('Simulation failed:', err);
    broadcast({ type: 'error', message: err.message });
    activeSim = null;
  });
});

app.post('/api/wargame/stop', (_req, res) => {
  if (!activeSim) return res.status(404).json({ error: 'No active simulation' });
  activeSim = null;
  broadcast({ type: 'stopped' });
  res.json({ status: 'stopped' });
});

app.get('/api/results', (_req, res) => {
  if (!existsSync(RESULTS_DIR)) return res.json([]);
  const files = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.jsonl')).reverse();
  const runs = files.map(f => {
    const lines = readFileSync(join(RESULTS_DIR, f), 'utf-8').trim().split('\n');
    const header = JSON.parse(lines[0]);
    const lastLine = JSON.parse(lines[lines.length - 1]);
    return { file: f, ...header, completed: lastLine.type === 'summary', summary: lastLine.type === 'summary' ? lastLine : null };
  });
  res.json(runs);
});

app.get('/api/playbacks', (_req, res) => {
  if (!existsSync(PLAYBACKS_DIR)) return res.json([]);
  const files = readdirSync(PLAYBACKS_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
  const manifests = files.map(f => {
    try {
      return JSON.parse(readFileSync(join(PLAYBACKS_DIR, f), 'utf-8'));
    } catch { return null; }
  }).filter(Boolean);
  res.json(manifests);
});

// =====================================================
// WEBSOCKET
// =====================================================
wss.on('connection', (ws) => {
  console.log('WS client connected');
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'start' && !activeSim) {
        runSimulation(msg).catch(err => {
          ws.send(JSON.stringify({ type: 'error', message: err.message }));
          activeSim = null;
        });
      } else if (msg.type === 'stop') {
        activeSim = null;
        broadcast({ type: 'stopped' });
      }
    } catch (e) { /* ignore malformed */ }
  });
  ws.on('close', () => console.log('WS client disconnected'));
});

// =====================================================
// START
// =====================================================
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n  PANOPTICON WARGAME SERVER`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  Scenarios: ${SCENARIOS_DIR}`);
  console.log(`  Results:   ${RESULTS_DIR}\n`);
  const keys = ['ANTHROPIC', 'OPENAI', 'GOOGLE', 'XAI']
    .map(k => `${k}: ${process.env[k + '_API_KEY'] ? 'SET' : '---'}`)
    .join('  ');
  console.log(`  API Keys:  ${keys}\n`);
});
