/* ===================================================================
   PANOPTICON — Submarine Bridge Server
   Bridges Unity 3D submarine game ↔ LLM AI captain.

   Unity sends sensor state via WebSocket.
   Server feeds state to LLM, returns navigation commands.
   Also broadcasts to Panopticon web clients for observation.

   Usage:  node server/submarine-bridge.js
   Env:    ANTHROPIC_API_KEY (or OPENAI_API_KEY, etc.)
   Port:   3002 (WebSocket) + 3003 (HTTP status)
   =================================================================== */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load .env — try server/.env first, then project root .env
let envPath = join(__dirname, '.env');
if (!existsSync(envPath) || readFileSync(envPath, 'utf-8').trim().split('\n').every(l => !l.includes('=') || l.split('=')[1]?.trim() === ''))
  envPath = join(ROOT, '.env');
console.log(`  Loading env from: ${envPath} (exists: ${existsSync(envPath)})`);
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  let loaded = 0;
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
    loaded++;
  }
  console.log(`  Loaded ${loaded} env vars`);
}

// =====================================================
// CONFIGURATION
// =====================================================
const WS_PORT = parseInt(process.env.SUB_BRIDGE_PORT || '3002');
const HTTP_PORT = parseInt(process.env.SUB_HTTP_PORT || '3003');
const LLM_INTERVAL_MS = 3000;       // Min time between LLM calls
const PROVIDER = process.env.SUB_PROVIDER || 'openrouter';
const MODEL = process.env.SUB_MODEL || '';

// =====================================================
// LLM ADAPTERS (subset from main server)
// =====================================================
const adapters = {
  async anthropic(model, systemPrompt, userMessage) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-5-20250929',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content[0].text;
  },

  async openai(model, systemPrompt, userMessage) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        max_tokens: 512,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content;
  },

  async google(model, systemPrompt, userMessage) {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('GOOGLE_API_KEY not set');
    const m = model || 'gemini-2.5-pro';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 512 },
      }),
    });
    if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  },

  async openrouter(model, systemPrompt, userMessage) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('OPENROUTER_API_KEY not set');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: model || 'qwen/qwen3.5-flash-02-23',
        max_tokens: 512,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content;
  },
};

// =====================================================
// SCENARIO DATA
// =====================================================
let scenario = null;
try {
  scenario = JSON.parse(readFileSync(join(ROOT, 'scenarios/submarine-pursuit-nav.json'), 'utf-8'));
} catch { console.warn('Could not load submarine scenario — using defaults'); }

// Target trace converted to Unity coordinate space
// Reference point: lat 55, lon -28 (center of play area)
const REF_LAT = 55.0;
const REF_LON = -28.0;
const NM_PER_DEG_LAT = 60.0;
const NM_PER_DEG_LON = 60.0 * Math.cos(REF_LAT * Math.PI / 180); // ~34.4 at 55°N

function latLonToUnity(lat, lon) {
  return {
    x: (lon - REF_LON) * NM_PER_DEG_LON,
    z: (lat - REF_LAT) * NM_PER_DEG_LAT,
  };
}

function unityToLatLon(x, z) {
  return {
    lat: REF_LAT + z / NM_PER_DEG_LAT,
    lon: REF_LON + x / NM_PER_DEG_LON,
  };
}

// =====================================================
// GAME STATE
// =====================================================
let gameState = {
  running: false,
  startTime: 0,
  lastLlmCall: 0,
  llmBusy: false,
  submarine: null,        // Latest state from Unity
  contacts: [],           // Latest sonar contacts from Unity
  commandHistory: [],     // All commands sent
  intelFeed: [],          // Intel messages revealed so far
};

// =====================================================
// LLM PROMPT CONSTRUCTION
// =====================================================
const SYSTEM_PROMPT = `You are the AI captain of a submarine conducting pursuit operations in the North Atlantic (GIUK gap).

You control your submarine in real-time by setting heading, depth, and speed. Your objective is to intercept, track, and classify an unknown underwater contact.

TACTICAL KNOWLEDGE:
- Lower speed = quieter = harder to detect (below 5 kts is very quiet)
- Active sonar reveals your position but gives precise target location
- Depth affects sonar performance: thermocline layers at ~100m and ~300m can hide you
- Going deep (>300m) reduces detection risk but limits communication
- Max depth: 500m. Max speed: 30 knots.
- Convergence zones at ~30nm and ~60nm can provide long-range passive detections

RESPONSE FORMAT — respond with ONLY a JSON object, no other text:
{"heading": <0-360>, "target_depth_m": <30-500>, "speed_kts": <0-30>, "active_sonar": <true/false>, "reasoning": "<1-2 sentences>"}`;

function buildUserMessage(state) {
  const sub = state.submarine || {};
  const elapsed = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;

  const parts = [
    `SITUATION UPDATE — ${elapsed}s elapsed`,
    '',
    'YOUR SUBMARINE:',
    `  Position: ${(sub.lat || 0).toFixed(2)}°N, ${Math.abs(sub.lon || 0).toFixed(2)}°${(sub.lon || 0) >= 0 ? 'E' : 'W'}`,
    `  Depth: ${Math.round(sub.depth_m || 100)}m`,
    `  Heading: ${Math.round(sub.heading || 0)}°`,
    `  Speed: ${(sub.speed_kts || 0).toFixed(1)} knots`,
    `  Noise level: ${sub.speed_kts > 15 ? 'HIGH' : sub.speed_kts > 8 ? 'MODERATE' : sub.speed_kts > 3 ? 'LOW' : 'ULTRA-QUIET'}`,
    '',
  ];

  // Sonar contacts
  if (state.contacts && state.contacts.length > 0) {
    parts.push('SONAR CONTACTS:');
    for (const c of state.contacts) {
      const rangeStr = c.range_nm > 0 ? `${c.range_nm.toFixed(1)}nm` : 'unknown';
      const sigStr = c.signal_strength ? `signal ${(c.signal_strength * 100).toFixed(0)}%` : '';
      parts.push(`  - ${c.id || 'UNKNOWN'}: bearing ${Math.round(c.bearing || 0)}°, range ${rangeStr}, ${sigStr}`);
      if (c.classification) parts.push(`    Classification: ${c.classification}`);
    }
  } else {
    parts.push('SONAR CONTACTS: None detected');
  }
  parts.push('');

  // Intel feed
  if (state.intelFeed && state.intelFeed.length > 0) {
    parts.push('INTELLIGENCE:');
    for (const intel of state.intelFeed) {
      parts.push(`  [${intel.time}] ${intel.message}`);
    }
  }
  parts.push('');

  // Command history (last 3)
  if (state.commandHistory.length > 0) {
    parts.push('RECENT COMMANDS:');
    const recent = state.commandHistory.slice(-3);
    for (const cmd of recent) {
      parts.push(`  - Hdg ${cmd.heading}°, Depth ${cmd.target_depth_m}m, Speed ${cmd.speed_kts}kts: "${cmd.reasoning}"`);
    }
  }

  return parts.join('\n');
}

// =====================================================
// LLM CALL
// =====================================================
async function callLlm() {
  if (gameState.llmBusy || !gameState.running) return;
  if (Date.now() - gameState.lastLlmCall < LLM_INTERVAL_MS) return;

  gameState.llmBusy = true;
  gameState.lastLlmCall = Date.now();

  try {
    const adapter = adapters[PROVIDER];
    if (!adapter) throw new Error(`Unknown provider: ${PROVIDER}`);

    const userMsg = buildUserMessage(gameState);
    console.log(`[bridge] Calling ${PROVIDER} LLM...`);
    const t0 = Date.now();
    const rawText = await adapter(MODEL, SYSTEM_PROMPT, userMsg);
    const latency = Date.now() - t0;
    console.log(`[bridge] LLM responded in ${latency}ms`);

    // Parse JSON response
    const command = parseCommand(rawText);
    command.latency_ms = latency;
    command.timestamp = Date.now();

    gameState.commandHistory.push(command);

    // Send command to Unity
    broadcastToUnity({ type: 'command', ...command });

    // Broadcast to observers (Panopticon web UI)
    broadcastToObservers({
      type: 'submarine_command',
      command,
      state: gameState.submarine,
      elapsed_s: Math.floor((Date.now() - gameState.startTime) / 1000),
    });

  } catch (err) {
    console.error('[bridge] LLM error:', err.message);
  } finally {
    gameState.llmBusy = false;
  }
}

function parseCommand(rawText) {
  // Strip thinking tags
  const cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();

  for (const text of [cleaned, rawText]) {
    try {
      const firstBrace = text.indexOf('{');
      if (firstBrace === -1) continue;
      let depth = 0, lastBrace = -1;
      for (let i = firstBrace; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { depth--; if (depth === 0) { lastBrace = i; break; } }
      }
      if (lastBrace === -1) continue;
      const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
      return {
        heading: clamp(parsed.heading || 0, 0, 360),
        target_depth_m: clamp(parsed.target_depth_m || 100, 30, 500),
        speed_kts: clamp(parsed.speed_kts || 5, 0, 30),
        active_sonar: !!parsed.active_sonar,
        reasoning: parsed.reasoning || 'No reasoning provided',
      };
    } catch { continue; }
  }

  // Fallback: maintain course
  return {
    heading: gameState.submarine?.heading || 0,
    target_depth_m: gameState.submarine?.depth_m || 100,
    speed_kts: 5,
    active_sonar: false,
    reasoning: 'Failed to parse LLM response — maintaining course',
  };
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// =====================================================
// INTEL FEED (time-based reveals from scenario)
// =====================================================
function updateIntelFeed() {
  if (!scenario || !gameState.running) return;
  const elapsed = (Date.now() - gameState.startTime) / 1000;
  // Map ticks to seconds: each tick = 30 seconds for the realtime game
  const SECONDS_PER_TICK = 30;
  const variant = 'hostile_sub'; // default variant
  const feed = scenario.intel_feed?.[variant] || [];

  for (const item of feed) {
    const revealTime = item.tick * SECONDS_PER_TICK;
    const alreadyRevealed = gameState.intelFeed.some(i => i.tick === item.tick);
    if (elapsed >= revealTime && !alreadyRevealed) {
      const intel = { tick: item.tick, time: `T+${revealTime}s`, message: item.message };
      gameState.intelFeed.push(intel);
      broadcastToUnity({ type: 'intel', ...intel });
      broadcastToObservers({ type: 'submarine_intel', ...intel });
      console.log(`[bridge] Intel revealed: ${item.message.slice(0, 60)}...`);
    }
  }
}

// =====================================================
// WEBSOCKET SERVER
// =====================================================
const server = createServer();
const wss = new WebSocketServer({ server });

// Track client types
const unityClients = new Set();
const observerClients = new Set();

function broadcastToUnity(data) {
  const msg = JSON.stringify(data);
  for (const ws of unityClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

function broadcastToObservers(data) {
  const msg = JSON.stringify(data);
  for (const ws of observerClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

wss.on('connection', (ws, req) => {
  console.log('[bridge] Client connected');

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case 'register':
          // Unity or observer client registration
          if (msg.role === 'unity') {
            unityClients.add(ws);
            console.log('[bridge] Unity client registered');
            // Send current game config
            ws.send(JSON.stringify({
              type: 'config',
              refLat: REF_LAT,
              refLon: REF_LON,
              nmPerDegLat: NM_PER_DEG_LAT,
              nmPerDegLon: NM_PER_DEG_LON,
              targetTrace: scenario?.red_contacts?.[0]?.trace || [],
              blueStart: scenario?.blue_forces?.[0]?.position || { lat: 58, lon: -32 },
            }));
          } else {
            observerClients.add(ws);
            console.log('[bridge] Observer client registered');
          }
          break;

        case 'start':
          // Start the game
          gameState.running = true;
          gameState.startTime = Date.now();
          gameState.commandHistory = [];
          gameState.intelFeed = [];
          gameState.llmBusy = false;
          console.log('[bridge] Game started');
          broadcastToUnity({ type: 'game_start' });
          broadcastToObservers({ type: 'game_start' });
          break;

        case 'stop':
          gameState.running = false;
          console.log('[bridge] Game stopped');
          broadcastToUnity({ type: 'game_stop' });
          broadcastToObservers({ type: 'game_stop' });
          break;

        case 'state':
          // State update from Unity
          gameState.submarine = msg.submarine;
          gameState.contacts = msg.contacts || [];

          // Trigger LLM call if enough time has passed
          callLlm();

          // Check for new intel
          updateIntelFeed();
          break;
      }
    } catch (e) {
      console.error('[bridge] Bad message:', e.message);
    }
  });

  ws.on('close', () => {
    unityClients.delete(ws);
    observerClients.delete(ws);
    console.log('[bridge] Client disconnected');
  });
});

// =====================================================
// HTTP STATUS ENDPOINT
// =====================================================
const httpApp = createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      running: gameState.running,
      elapsed_s: gameState.startTime ? Math.floor((Date.now() - gameState.startTime) / 1000) : 0,
      submarine: gameState.submarine,
      contacts: gameState.contacts,
      commandCount: gameState.commandHistory.length,
      intelCount: gameState.intelFeed.length,
      provider: PROVIDER,
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// =====================================================
// START
// =====================================================
server.listen(WS_PORT, () => {
  console.log(`\n  PANOPTICON SUBMARINE BRIDGE`);
  console.log(`  WebSocket: ws://localhost:${WS_PORT}`);
  console.log(`  Provider:  ${PROVIDER} ${MODEL ? `(${MODEL})` : '(default model)'}`);
  console.log(`  Ref point: ${REF_LAT}°N, ${Math.abs(REF_LON)}°W`);

  const keys = ['ANTHROPIC', 'OPENAI', 'GOOGLE', 'OPENROUTER']
    .map(k => `${k}: ${process.env[k + '_API_KEY'] ? 'SET' : '---'}`)
    .join('  ');
  console.log(`  API Keys:  ${keys}\n`);
});

httpApp.listen(HTTP_PORT, () => {
  console.log(`  Status:    http://localhost:${HTTP_PORT}/status\n`);
});
