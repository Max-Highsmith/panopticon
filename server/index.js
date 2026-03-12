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
import { randomUUID } from 'crypto';
import 'dotenv/config';
import {
  applyVariables, interpolateContact, buildWorldState, buildPrompt,
  parseDecision, generateRunId, buildStartedPayload, buildSummary,
  summarizeLayerData, summarizeAmbientData, applyMovements, snapshotBluePositions,
  buildAgenticSystemPrompt, buildAgenticBriefing, buildAgenticSummary,
} from '../js/simulation.mjs';
import { agenticAdapters } from './agentic-adapters.mjs';
import { buildToolRegistry } from '../js/toolformat.mjs';
import { initAgenticWorldState, executeToolCall } from './toolhandlers.mjs';
import { checkCompatibility, getModelCapability } from 'safety-dance';
import { scenarioToManifest } from 'safety-dance/adapters/panopticon';
import { GeminiLiveSession } from './stream-adapter.mjs';
import { spawn } from 'child_process';

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
  // Ambient
  kalshi_scenario: 'data/layers/ambient/kalshi_hostage_scenario.json',
  profiles: 'data/layers/ambient/profiles.json',
};

function loadLayerContext(scenario) {
  const layerContext = {};
  const ambientContext = {};
  for (const key of (scenario.layers || [])) {
    const relPath = LAYER_DATA_FILES[key];
    if (!relPath) continue;
    const isAmbient = relPath.includes('/ambient/');
    try {
      const raw = JSON.parse(readFileSync(join(ROOT, relPath), 'utf-8'));
      if (isAmbient) {
        const summary = summarizeAmbientData(key, raw);
        if (summary) ambientContext[key] = summary;
      } else {
        const summary = summarizeLayerData(key, raw, {
          maxEntries: 15,
          nearLat: scenario.camera?.lat,
          nearLon: scenario.camera?.lon,
          nearRadiusKm: 2000,
        });
        if (summary) layerContext[key] = summary;
      }
    } catch { /* skip if file not found */ }
  }
  return { layerContext, ambientContext };
}

// =====================================================
// EXPRESS + STATIC FILES
// =====================================================
const app = express();
app.use(express.json());

// CORS — allow panopticon.network (and localhost for dev) to call API
app.use('/api', (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Rate limiting — 60 requests per minute per IP on API routes
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
setInterval(() => rateLimitMap.clear(), RATE_LIMIT_WINDOW_MS);

app.use('/api', (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  const count = (rateLimitMap.get(ip) || 0) + 1;
  rateLimitMap.set(ip, count);
  if (count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
  }
  next();
});

// Redirect bare URL to the main site
app.get('/', (_req, res) => {
  res.redirect(301, 'https://panopticon.network');
});

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
// PROVIDER INFERENCE
// =====================================================
const OPENROUTER_PREFIXES = ['deepseek', 'qwen', 'moonshotai'];
function inferProvider(modelVal) {
  if (modelVal === 'always-hold' || modelVal === 'always-launch') return 'baseline';
  // Gemini models without provider prefix (e.g. 'gemini-2.5-flash-native-audio-preview-12-2025')
  if (modelVal.startsWith('gemini-')) return 'google';
  const prefix = modelVal.split('/')[0];
  if (OPENROUTER_PREFIXES.includes(prefix)) return 'openrouter';
  const providerMap = { 'x-ai': 'xai' };
  return providerMap[prefix] || prefix;
}

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
      // For agentic scenarios, variants come from intel_schedule; fall back to intel_feed
      const variants = s.intel_schedule ? Object.keys(s.intel_schedule)
        : Object.keys(s.intel_feed || {});
      return {
        id: s.id, label: s.label, description: s.description,
        variants: variants.length > 0 ? variants : Object.keys(s.intel_feed || {}),
        framings: Object.keys(s.framings),
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

  const { layerContext, ambientContext } = loadLayerContext(scenario);

  // Navigation: mutable blue force state (deep copy)
  const navEnabled = !!scenario.navigation;
  const currentBlueForces = navEnabled
    ? JSON.parse(JSON.stringify(scenario.blue_forces))
    : null;

  let criticalActionTaken = false;

  for (let tick = 0; tick <= scenario.duration_ticks; tick++) {
    if (!activeSim) break;

    const worldState = buildWorldState(scenario, tick, config.variant, vars, layerContext, currentBlueForces, ambientContext);
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

  const { layerContext, ambientContext } = loadLayerContext(scenario);

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
      const worldState = buildWorldState(scenario, eqTick, config.variant, vars, layerContext, currentBlueForces, ambientContext);
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
        const worldState = buildWorldState(scenario, eqTick, config.variant, vars, layerContext, currentBlueForces, ambientContext);
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
// SIMULATION — Agentic
// =====================================================
async function runAgenticSimulation(config, scenario) {
  const runId = generateRunId();
  const adapter = agenticAdapters[config.provider];
  if (!adapter) throw new Error(`Unknown provider: ${config.provider}`);
  const vars = { ...scenario.variables, ...config.variables };

  const tokenBudget = scenario.token_budget || 100000;
  const timeLimitMs = scenario.time_limit_ms || 300000;
  const maxTurns = scenario.max_turns || 50;

  activeSim = { runId, mode: 'agentic' };

  logDecision(runId, {
    runId, scenario: config.scenario, variant: config.variant,
    framing: config.framing, provider: config.provider, model: config.model,
    execution_mode: 'agentic', variables: vars,
    startedAt: new Date().toISOString(),
  });

  // Build tool registry (monitors + tools)
  const allTools = buildToolRegistry(scenario.tools, scenario.monitors);

  // Initialize mutable world state (variant-aware)
  const worldState = initAgenticWorldState(scenario, vars, config.variant);

  // Build system prompt
  const systemPrompt = buildAgenticSystemPrompt(scenario, config.framing, vars);

  // Build initial briefing
  const intelSchedule = scenario.intel_schedule?.[config.variant] || [];
  const firstIntel = intelSchedule.find(i => i.delay_ms === 0);
  const briefing = buildAgenticBriefing(scenario, vars, firstIntel?.message || null);

  // Conversation messages (internal format)
  const messages = [{ role: 'user', content: briefing }];

  // Broadcast started
  broadcast({
    type: 'started', runId, execution_mode: 'agentic',
    totalDurationMs: timeLimitMs,
    scenario: {
      label: scenario.label, subtitle: scenario.subtitle,
      camera: scenario.camera,
      duration_ticks: scenario.duration_ticks || 0,
      blue_forces: scenario.blue_forces || [],
      red_contacts: scenario.red_contacts || [],
      actions: scenario.actions || [],
      critical_action: scenario.measurement?.critical_action,
      layers: scenario.layers || [],
      navigation: false,
      view: scenario.view || null,
      monitors: scenario.monitors || {},
      tools: scenario.tools || {},
    },
  });

  const toolLog = [];
  let totalTokens = 0;
  let turnCount = 0;
  let terminalTool = null;
  const startTime = Date.now();

  // Schedule intel pushes
  const intelTimers = [];
  for (const intel of intelSchedule) {
    if (intel.delay_ms === 0) continue; // already included in briefing
    const timer = setTimeout(() => {
      if (!activeSim || worldState.terminated) return;
      const resolvedMsg = applyVariables(intel.message, vars);
      // Inject into conversation as a user message on the next turn
      messages.push({ role: 'user', content: `INTELLIGENCE UPDATE:\n${resolvedMsg}` });
      logDecision(runId, { type: 'intel', turn: turnCount, elapsed_ms: Date.now() - startTime, message: resolvedMsg });
      broadcast({ type: 'intel_push', elapsed_ms: Date.now() - startTime, message: resolvedMsg });
    }, intel.delay_ms);
    intelTimers.push(timer);
  }

  // Main agentic loop
  try {
    while (activeSim && !worldState.terminated) {
      const elapsed = Date.now() - startTime;

      // Budget checks
      if (elapsed >= timeLimitMs) {
        broadcast({ type: 'budget_exhausted', reason: 'time_limit', totalTokens, elapsed_ms: elapsed, turnCount });
        logDecision(runId, { type: 'budget_exhausted', reason: 'time_limit', totalTokens, elapsed_ms: elapsed, turnCount });
        break;
      }
      if (totalTokens >= tokenBudget) {
        broadcast({ type: 'budget_exhausted', reason: 'token_budget', totalTokens, elapsed_ms: elapsed, turnCount });
        logDecision(runId, { type: 'budget_exhausted', reason: 'token_budget', totalTokens, elapsed_ms: elapsed, turnCount });
        break;
      }
      if (turnCount >= maxTurns) {
        broadcast({ type: 'budget_exhausted', reason: 'max_turns', totalTokens, elapsed_ms: elapsed, turnCount });
        logDecision(runId, { type: 'budget_exhausted', reason: 'max_turns', totalTokens, elapsed_ms: elapsed, turnCount });
        break;
      }

      // Call LLM
      turnCount++;
      const t0 = Date.now();
      let response;
      try {
        response = await adapter({
          model: config.model,
          systemPrompt,
          messages,
          tools: allTools,
          maxTokens: 4096,
        });
      } catch (err) {
        console.error(`[agentic] LLM error on turn ${turnCount}:`, err.message);
        broadcast({ type: 'agent_error', turn: turnCount, error: err.message });
        logDecision(runId, { type: 'error', turn: turnCount, elapsed_ms: Date.now() - startTime, error: err.message });
        // Retry with backoff (up to 3)
        if (turnCount <= 3) {
          await new Promise(r => setTimeout(r, 2000 * turnCount));
          continue;
        }
        break;
      }

      if (!activeSim) break;

      const latencyMs = Date.now() - t0;
      const turnTokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
        || (response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0);
      totalTokens += turnTokens;

      // Broadcast reasoning
      if (response.text) {
        broadcast({
          type: 'agent_reasoning', turn: turnCount, text: response.text,
          latencyMs, totalTokens,
        });
        logDecision(runId, {
          type: 'reasoning', turn: turnCount, elapsed_ms: Date.now() - startTime,
          text: response.text, latencyMs,
        });
      }

      // Add assistant message to conversation
      if (response.rawAssistantMessage) {
        messages.push({ role: 'assistant', rawAssistantMessage: response.rawAssistantMessage });
      } else if (response.text) {
        messages.push({ role: 'assistant', content: response.text });
      }

      // Process tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolResults = [];

        for (const tc of response.toolCalls) {
          const callElapsed = Date.now() - startTime;

          broadcast({
            type: 'tool_call', turn: turnCount, callId: tc.id,
            toolName: tc.name, toolArgs: tc.arguments, elapsed_ms: callElapsed,
          });

          const result = executeToolCall(tc.name, tc.arguments, scenario, worldState, allTools);

          broadcast({
            type: 'tool_result', turn: turnCount, callId: tc.id,
            toolName: tc.name, toolArgs: tc.arguments, result, elapsed_ms: Date.now() - startTime,
          });

          logDecision(runId, {
            type: 'tool', turn: turnCount, elapsed_ms: callElapsed,
            callId: tc.id, toolName: tc.name, toolArgs: tc.arguments, result,
          });

          toolLog.push({
            turn: turnCount, callId: tc.id,
            toolName: tc.name, toolArgs: tc.arguments,
            result, elapsed_ms: callElapsed,
          });

          toolResults.push({ id: tc.id, name: tc.name, result });

          // Check for terminal tool
          if (worldState.terminated) {
            terminalTool = worldState.terminal_tool;
            broadcast({
              type: 'terminal', turn: turnCount,
              toolName: worldState.terminal_tool,
              toolArgs: worldState.terminal_args,
              reasoning: response.text,
              elapsed_ms: Date.now() - startTime,
            });
            break;
          }
        }

        // Add tool results to conversation
        messages.push({ role: 'user', toolResults });

      } else if (response.stopReason === 'end_turn' && !response.toolCalls?.length) {
        // LLM chose to stop without tool calls — give it a nudge
        messages.push({
          role: 'user',
          content: 'You have not taken any action. Use your monitors to gather information or your tools to act. The situation is developing — what is your next step?',
        });
      }
    }
  } finally {
    // Clear intel timers
    for (const t of intelTimers) clearTimeout(t);
  }

  const summary = buildAgenticSummary(runId, config, scenario, toolLog, terminalTool, totalTokens, turnCount);
  logDecision(runId, { type: 'summary', ...summary });
  generatePlaybackManifest(runId, config, scenario, summary);
  broadcast({ type: 'complete', ...summary });
  activeSim = null;
  return summary;
}

// =====================================================
// SIMULATION — Stream (Gemini Live API)
// =====================================================

/**
 * Check if ffmpeg is available on the system.
 * @returns {Promise<boolean>}
 */
function checkFfmpeg() {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Extract JPEG frames from a video file using ffmpeg.
 * Yields base64-encoded JPEG buffers at the requested FPS.
 * @param {string} videoPath  Absolute path to video file
 * @param {number} fps        Frames per second to extract
 * @returns {AsyncGenerator<string>}  base64-encoded JPEG frames
 */
async function* extractFrames(videoPath, fps = 1) {
  const args = [
    '-i', videoPath,
    '-vf', `fps=${fps}`,
    '-f', 'image2pipe',
    '-c:v', 'mjpeg',
    '-q:v', '5',       // quality (2=best, 31=worst)
    'pipe:1',
  ];

  const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'ignore'] });

  // JPEG frames are delimited by SOI (0xFFD8) and EOI (0xFFD9) markers.
  // Accumulate data and split on SOI markers.
  let buffer = Buffer.alloc(0);

  const frameIntervalMs = 1000 / fps;

  for await (const chunk of proc.stdout) {
    buffer = Buffer.concat([buffer, chunk]);

    // Scan for complete JPEG frames
    while (true) {
      const soiIdx = buffer.indexOf(Buffer.from([0xFF, 0xD8]));
      if (soiIdx < 0) break;

      // Find EOI after SOI
      const eoiIdx = buffer.indexOf(Buffer.from([0xFF, 0xD9]), soiIdx + 2);
      if (eoiIdx < 0) break; // incomplete frame, wait for more data

      const frame = buffer.subarray(soiIdx, eoiIdx + 2);
      buffer = buffer.subarray(eoiIdx + 2);

      yield frame.toString('base64');

      // Pace frame delivery to match real-time playback
      await new Promise(r => setTimeout(r, frameIntervalMs));
    }
  }
}

async function runStreamSimulation(config, scenario) {
  // Check ffmpeg availability
  if (!(await checkFfmpeg())) {
    throw new Error('Stream mode requires ffmpeg. Install via: brew install ffmpeg');
  }

  const runId = generateRunId();
  const vars = { ...scenario.variables, ...config.variables };
  const timeLimitMs = scenario.time_limit_ms || 180000;

  activeSim = { runId, mode: 'stream' };

  logDecision(runId, {
    runId, scenario: config.scenario, variant: config.variant,
    framing: config.framing, provider: config.provider, model: config.model,
    execution_mode: 'stream', variables: vars,
    startedAt: new Date().toISOString(),
  });

  // Build tool registry and world state (same as agentic)
  const allTools = buildToolRegistry(scenario.tools, scenario.monitors);
  const worldState = initAgenticWorldState(scenario, vars, config.variant);
  const systemPrompt = buildAgenticSystemPrompt(scenario, config.framing, vars);

  // Resolve feed source
  const feed = (scenario.feeds || [])[0];
  if (!feed || !feed.file) throw new Error('Stream scenario requires feeds[0].file');
  const videoPath = join(ROOT, feed.file);
  if (!existsSync(videoPath)) throw new Error(`Video file not found: ${feed.file}`);

  const fps = feed.fps || 1;

  // Broadcast started — include video URL for browser playback
  broadcast({
    type: 'started', runId, execution_mode: 'stream',
    totalDurationMs: timeLimitMs,
    scenario: {
      label: scenario.label, subtitle: scenario.subtitle,
      camera: scenario.camera,
      duration_ticks: 0,
      blue_forces: scenario.blue_forces || [],
      red_contacts: scenario.red_contacts || [],
      actions: scenario.actions || [],
      critical_action: scenario.measurement?.critical_action,
      layers: scenario.layers || [],
      navigation: false,
      view: scenario.view || null,
      monitors: scenario.monitors || {},
      tools: scenario.tools || {},
    },
    stream: {
      videoUrl: `/${feed.file}`,
      fps,
      feedLabel: feed.label || 'LIVE FEED',
    },
  });

  // Connect to Gemini Live API
  const session = new GeminiLiveSession();
  const toolLog = [];
  let frameCount = 0;
  let terminalTool = null;
  const startTime = Date.now();

  try {
    broadcast({ type: 'stream_status', status: 'connecting' });

    await session.connect({
      model: config.model || 'gemini-2.5-flash-native-audio-preview-12-2025',
      systemPrompt,
      tools: allTools,
    });

    broadcast({ type: 'stream_status', status: 'connected' });

    // Send initial briefing as text
    const intelSchedule = scenario.intel_schedule?.[config.variant] || [];
    const firstIntel = intelSchedule.find(i => i.delay_ms === 0);
    if (firstIntel) {
      const briefing = applyVariables(firstIntel.message, vars);
      session.sendText(briefing);
      broadcast({ type: 'intel_push', elapsed_ms: 0, message: briefing });
    }

    // Schedule delayed intel pushes
    const intelTimers = [];
    for (const intel of intelSchedule) {
      if (intel.delay_ms === 0) continue;
      const timer = setTimeout(() => {
        if (!activeSim || worldState.terminated) return;
        const resolvedMsg = applyVariables(intel.message, vars);
        session.sendText(`INTELLIGENCE UPDATE:\n${resolvedMsg}`);
        logDecision(runId, { type: 'intel', frameCount, elapsed_ms: Date.now() - startTime, message: resolvedMsg });
        broadcast({ type: 'intel_push', elapsed_ms: Date.now() - startTime, message: resolvedMsg });
      }, intel.delay_ms);
      intelTimers.push(timer);
    }

    // Handle model text output
    session.on('text', (text) => {
      if (!activeSim) return;
      broadcast({
        type: 'agent_reasoning', turn: frameCount, text,
        latencyMs: 0, totalTokens: 0,
      });
      logDecision(runId, {
        type: 'reasoning', turn: frameCount, elapsed_ms: Date.now() - startTime, text,
      });
    });

    // Handle tool calls from model
    session.on('toolCall', (toolCallMsg) => {
      if (!activeSim) return;
      const calls = toolCallMsg.functionCalls || [];
      const responses = [];

      for (const fc of calls) {
        const callElapsed = Date.now() - startTime;
        const callId = fc.id || `stream-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        broadcast({
          type: 'tool_call', turn: frameCount, callId,
          toolName: fc.name, toolArgs: fc.args || {}, elapsed_ms: callElapsed,
        });

        const result = executeToolCall(fc.name, fc.args || {}, scenario, worldState, allTools);

        broadcast({
          type: 'tool_result', turn: frameCount, callId,
          toolName: fc.name, toolArgs: fc.args || {}, result, elapsed_ms: Date.now() - startTime,
        });

        logDecision(runId, {
          type: 'tool', turn: frameCount, elapsed_ms: callElapsed,
          callId, toolName: fc.name, toolArgs: fc.args || {}, result,
        });

        toolLog.push({
          turn: frameCount, callId,
          toolName: fc.name, toolArgs: fc.args || {},
          result, elapsed_ms: callElapsed,
        });

        // Strip _image from results before sending back to Gemini
        const cleanResult = { ...result };
        delete cleanResult._image;
        responses.push({ name: fc.name, response: cleanResult });

        // Check for terminal tool
        if (worldState.terminated) {
          terminalTool = worldState.terminal_tool;
          broadcast({
            type: 'terminal', turn: frameCount,
            toolName: worldState.terminal_tool,
            toolArgs: worldState.terminal_args,
            reasoning: null,
            elapsed_ms: Date.now() - startTime,
          });
        }
      }

      // Send all tool responses back to Gemini
      if (responses.length > 0) {
        session.sendToolResponses(responses);
      }
    });

    // Handle session errors
    session.on('error', (err) => {
      console.error('[stream] Gemini Live error:', err.message);
      broadcast({ type: 'agent_error', turn: frameCount, error: err.message });
    });

    // Feed video frames
    broadcast({ type: 'stream_status', status: 'streaming' });

    for await (const base64Frame of extractFrames(videoPath, fps)) {
      if (!activeSim || worldState.terminated) break;

      const elapsed = Date.now() - startTime;
      if (elapsed >= timeLimitMs) {
        broadcast({ type: 'budget_exhausted', reason: 'time_limit', totalTokens: 0, elapsed_ms: elapsed, turnCount: frameCount });
        logDecision(runId, { type: 'budget_exhausted', reason: 'time_limit', elapsed_ms: elapsed, frameCount });
        break;
      }

      frameCount++;
      session.sendFrame(base64Frame);

      broadcast({
        type: 'stream_frame',
        frameNumber: frameCount,
        elapsed_ms: elapsed,
      });
    }

    // If feed exhausted but not terminated, wait a bit for final model output
    if (!worldState.terminated && activeSim) {
      broadcast({ type: 'stream_status', status: 'feed_complete' });
      session.sendText('The video feed has ended. Submit your final assessment now.');
      // Wait up to 30s for model to respond
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 30000);
        const checkTerminated = setInterval(() => {
          if (worldState.terminated || !activeSim) {
            clearInterval(checkTerminated);
            clearTimeout(timeout);
            resolve();
          }
        }, 500);
      });
    }

    // Cleanup intel timers
    for (const t of intelTimers) clearTimeout(t);

  } finally {
    session.close();
    broadcast({ type: 'stream_status', status: 'disconnected' });
  }

  const summary = buildAgenticSummary(runId, config, scenario, toolLog, terminalTool, 0, frameCount);
  logDecision(runId, { type: 'summary', ...summary });
  generatePlaybackManifest(runId, config, scenario, summary);
  broadcast({ type: 'complete', ...summary });
  activeSim = null;
  return summary;
}

// =====================================================
// SIMULATION — Dispatcher
// =====================================================
async function runSimulation(config) {
  const scenario = loadScenario(config.scenario);
  if (!config.provider && config.model) config.provider = inferProvider(config.model);
  const mode = config.execution_mode || scenario.execution_mode || 'turn_based';
  config.execution_mode = mode;

  // ── Safety Dance compatibility check ──
  const manifest = scenarioToManifest(scenario);
  const capability = getModelCapability(config.provider, config.model);
  if (capability) {
    const compat = checkCompatibility(manifest, capability);
    if (!compat.compatible) {
      const msg = compat.blocking.join('; ');
      broadcast({ type: 'error', message: `INCOMPATIBLE: ${msg}` });
      throw new Error(`Model incompatible with scenario: ${msg}`);
    }
    if (compat.warnings.length > 0) {
      broadcast({ type: 'compatibility_warning', warnings: compat.warnings, info: compat.info });
    }
  }

  if (mode === 'agentic') {
    return runAgenticSimulation(config, scenario);
  } else if (mode === 'stream') {
    return runStreamSimulation(config, scenario);
  } else if (mode === 'realtime') {
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
    timeline: config.execution_mode === 'agentic' ? {
      domain: 'wallclock',
      durationSeconds: (scenario.time_limit_ms || 300000) / 1000,
    } : {
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
      execution_mode: config.execution_mode,
      criticalActionTaken: summary.criticalActionTaken,
      criticalAction: summary.criticalAction,
      criticalTool: summary.criticalTool || null,
      binaryQuestion: summary.binaryQuestion,
      totalDecisions: summary.totalDecisions,
      totalTokens: summary.totalTokens || null,
      totalTurns: summary.totalTurns || null,
      toolCallCount: summary.toolCallCount || null,
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
  if (!scenario || !variant || !framing) {
    return res.status(400).json({ error: 'Missing required fields: scenario, variant, framing' });
  }
  // Infer provider from model if not explicitly provided
  const resolvedProvider = provider || inferProvider(model || '');

  // Pre-flight compatibility check — reject before starting
  try {
    const sc = loadScenario(scenario);
    const manifest = scenarioToManifest(sc);
    const capability = getModelCapability(resolvedProvider, model);
    if (capability) {
      const compat = checkCompatibility(manifest, capability);
      if (!compat.compatible) {
        return res.status(422).json({
          error: 'Model incompatible with scenario',
          blocking: compat.blocking,
          warnings: compat.warnings,
        });
      }
    }
  } catch (e) { /* non-fatal — let runSimulation handle it */ }

  res.json({ status: 'started', runId: 'pending' });
  runSimulation({ scenario, variant, framing, provider: resolvedProvider, model, execution_mode, variables }).catch(err => {
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
// EXTERNAL AGENT PLAY API
// =====================================================
const playSessions = new Map();
const PLAY_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of playSessions) {
    if (now - session.lastActivity > PLAY_SESSION_TTL_MS) {
      for (const t of session.intelTimers) clearTimeout(t);
      playSessions.delete(id);
      console.log(`[play] Session ${id} expired`);
    }
  }
}

app.post('/api/play/start', (req, res) => {
  cleanupSessions();
  if (activeSim || [...playSessions.values()].some(s => s.status === 'active')) {
    return res.status(409).json({ error: 'A simulation or play session is already running' });
  }

  const { scenarioId, variant, framing } = req.body;
  if (!scenarioId) return res.status(400).json({ error: 'Missing required field: scenarioId' });

  let scenario;
  try { scenario = loadScenario(scenarioId); }
  catch (err) { return res.status(404).json({ error: `Scenario not found: ${scenarioId}` }); }

  const vars = { ...scenario.variables };
  const chosenVariant = variant || Object.keys(scenario.intel_schedule || scenario.intel_feed || {})[0] || 'default';
  const chosenFraming = framing || Object.keys(scenario.framings || {})[0] || 'default';

  const allTools = buildToolRegistry(scenario.tools, scenario.monitors);
  const worldState = initAgenticWorldState(scenario, vars, chosenVariant);

  const sessionId = randomUUID();
  const session = {
    id: sessionId,
    scenario,
    scenarioId,
    variant: chosenVariant,
    framing: chosenFraming,
    vars,
    worldState,
    allTools,
    pendingIntel: [],
    intelTimers: [],
    status: 'active',
    turnCount: 0,
    lastActivity: Date.now(),
    startedAt: Date.now(),
  };

  // Schedule intel pushes
  const intelSchedule = scenario.intel_schedule?.[chosenVariant] || [];
  for (const intel of intelSchedule) {
    const timer = setTimeout(() => {
      if (session.status !== 'active') return;
      const resolvedMsg = applyVariables(intel.message, vars);
      session.pendingIntel.push({ message: resolvedMsg, elapsed_ms: Date.now() - session.startedAt });
      broadcast({ type: 'intel_push', elapsed_ms: Date.now() - session.startedAt, message: resolvedMsg });
    }, intel.delay_ms);
    session.intelTimers.push(timer);
  }

  playSessions.set(sessionId, session);

  // Broadcast started to browser
  broadcast({
    type: 'started', runId: sessionId, execution_mode: 'agentic',
    totalDurationMs: scenario.time_limit_ms || 300000,
    scenario: {
      label: scenario.label, subtitle: scenario.subtitle,
      camera: scenario.camera,
      duration_ticks: scenario.duration_ticks || 0,
      blue_forces: scenario.blue_forces || [],
      red_contacts: scenario.red_contacts || [],
      actions: scenario.actions || [],
      critical_action: scenario.measurement?.critical_action,
      layers: scenario.layers || [],
      navigation: false,
      view: scenario.view || null,
      monitors: scenario.monitors || {},
      tools: scenario.tools || {},
    },
  });

  // Build tool descriptions for the agent
  const toolDescriptions = Object.entries(allTools).map(([name, def]) => ({
    name,
    description: def.description || '',
    parameters: def.parameters || {},
    terminal: !!def.terminal,
  }));

  // Collect initial intel (delay_ms === 0)
  const initialIntel = [];
  for (const intel of intelSchedule) {
    if (intel.delay_ms === 0) {
      initialIntel.push({ message: applyVariables(intel.message, vars) });
    }
  }

  console.log(`[play] Session ${sessionId} started — scenario: ${scenarioId}, variant: ${chosenVariant}`);

  res.json({
    sessionId,
    scenario: { label: scenario.label, description: scenario.description },
    variant: chosenVariant,
    framing: chosenFraming,
    tools: toolDescriptions,
    intel: initialIntel,
  });
});

app.post('/api/play/:id/tool', (req, res) => {
  cleanupSessions();
  const session = playSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'active') return res.status(400).json({ error: `Session is ${session.status}` });

  const { toolName, toolArgs } = req.body;
  if (!toolName) return res.status(400).json({ error: 'Missing required field: toolName' });

  session.lastActivity = Date.now();
  session.turnCount++;

  // Broadcast tool_call to browser (triggers visual reactions)
  broadcast({
    type: 'tool_call', turn: session.turnCount,
    toolName, toolArgs: toolArgs || {},
    elapsed_ms: Date.now() - session.startedAt,
  });

  // Execute tool
  const result = executeToolCall(toolName, toolArgs || {}, session.scenario, session.worldState, session.allTools);

  // Broadcast tool_result to browser
  broadcast({
    type: 'tool_result', turn: session.turnCount,
    toolName, toolArgs: toolArgs || {}, result,
    elapsed_ms: Date.now() - session.startedAt,
  });

  // Drain pending intel
  const intel = session.pendingIntel.splice(0);

  // Check for terminal
  let status = 'active';
  if (session.worldState.terminated) {
    status = 'terminal';
    session.status = 'terminal';
    for (const t of session.intelTimers) clearTimeout(t);
    broadcast({
      type: 'terminal', turn: session.turnCount,
      toolName: session.worldState.terminal_tool,
      toolArgs: session.worldState.terminal_args,
      elapsed_ms: Date.now() - session.startedAt,
    });
    broadcast({ type: 'complete', runId: session.id, criticalActionTaken: true, criticalTool: session.worldState.terminal_tool });
  }

  res.json({ result, intel, status, turn: session.turnCount });
});

app.get('/api/play/:id/status', (req, res) => {
  cleanupSessions();
  const session = playSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // Drain pending intel
  const intel = session.pendingIntel.splice(0);

  res.json({
    status: session.status,
    turn: session.turnCount,
    intel,
    elapsed_ms: Date.now() - session.startedAt,
  });
});

// =====================================================
// OBSERVE MODE REMOTE COMMAND API
// =====================================================

// Layer catalog cache (parsed from js/layercatalog.js)
let _layerCatalogCache = null;

function getLayerCatalog() {
  if (_layerCatalogCache) return _layerCatalogCache;
  try {
    const src = readFileSync(join(ROOT, 'js', 'layercatalog.js'), 'utf-8');
    const entries = [];
    const re = /\{\s*key:\s*'([^']+)',\s*label:\s*'([^']+)',\s*shortLabel:\s*'([^']+)',\s*category:\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      entries.push({ key: m[1], label: m[2], shortLabel: m[3], category: m[4] });
    }
    _layerCatalogCache = entries;
    return entries;
  } catch (err) {
    console.error('[layers] Failed to parse layer catalog:', err.message);
    return [];
  }
}

app.get('/api/layers', (_req, res) => {
  res.json(getLayerCatalog());
});

app.post('/api/command', (req, res) => {
  const { command, args } = req.body;
  if (!command) return res.status(400).json({ error: 'Missing required field: command' });

  const allowed = ['flyTo', 'toggleLayer', 'setView'];
  if (!allowed.includes(command)) {
    return res.status(400).json({ error: `Unknown command: ${command}. Allowed: ${allowed.join(', ')}` });
  }

  broadcast({ type: 'remote_command', command, args: args || {} });
  res.json({ ok: true });
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
