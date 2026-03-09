/* ===================================================================
   Submarine Bridge Test Client
   Simulates the Unity side — connects to bridge, sends fake state,
   prints AI navigation commands. No Unity required.

   Usage: node server/submarine-test-client.js
   =================================================================== */

import WebSocket from 'ws';

const BRIDGE_URL = process.env.BRIDGE_URL || 'ws://localhost:3002';
const STATE_INTERVAL_MS = 2000;

// Reference point (must match bridge server)
const REF_LAT = 55.0;
const REF_LON = -28.0;
const NM_PER_DEG_LAT = 60.0;
const NM_PER_DEG_LON = 60.0 * Math.cos(REF_LAT * Math.PI / 180);

// Simulated submarine state
const sub = {
  lat: 58.0,
  lon: -32.0,
  depth_m: 100,
  heading: 150,
  speed_kts: 0,
  // Unity coords
  x: 0,
  z: 0,
};

// Target trace (GOBLIN ONE from scenario)
const targetTrace = [
  { tick: 0, lat: 55.0, lon: -26.0 },
  { tick: 4, lat: 54.0, lon: -24.0 },
  { tick: 8, lat: 52.5, lon: -21.5 },
  { tick: 12, lat: 51.0, lon: -19.0 },
];
const TOTAL_DURATION_SEC = 360;

// Init Unity coords
sub.x = (sub.lon - REF_LON) * NM_PER_DEG_LON;
sub.z = (sub.lat - REF_LAT) * NM_PER_DEG_LAT;

let startTime = 0;
let commandCount = 0;

function getTargetPos(elapsedSec) {
  const progress = Math.min(1, elapsedSec / TOTAL_DURATION_SEC);
  const eqTick = progress * 12;
  for (let i = 0; i < targetTrace.length - 1; i++) {
    const t0 = targetTrace[i], t1 = targetTrace[i + 1];
    if (eqTick >= t0.tick && eqTick <= t1.tick) {
      const frac = (eqTick - t0.tick) / (t1.tick - t0.tick);
      return {
        lat: t0.lat + (t1.lat - t0.lat) * frac,
        lon: t0.lon + (t1.lon - t0.lon) * frac,
      };
    }
  }
  const last = targetTrace[targetTrace.length - 1];
  return { lat: last.lat, lon: last.lon };
}

function computeSonar(elapsedSec) {
  const tgt = getTargetPos(elapsedSec);
  const tgtX = (tgt.lon - REF_LON) * NM_PER_DEG_LON;
  const tgtZ = (tgt.lat - REF_LAT) * NM_PER_DEG_LAT;

  const dx = tgtX - sub.x;
  const dz = tgtZ - sub.z;
  const distNm = Math.sqrt(dx * dx + dz * dz);

  let bearingDeg = Math.atan2(dx, dz) * 180 / Math.PI;
  bearingDeg = (bearingDeg + 360) % 360;

  // Signal strength (passive sonar)
  const maxRange = 60;
  if (distNm > maxRange) return [];

  const distFactor = Math.pow(1 - distNm / maxRange, 2);
  const noisePenalty = sub.speed_kts > 15 ? 0.4 : sub.speed_kts > 8 ? 0.7 : 1.0;
  const signalStrength = distFactor * 0.5 * noisePenalty;

  if (signalStrength < 0.05) return [];

  // Add bearing noise
  const bearingNoise = (1 - signalStrength) * 8;
  const noisyBearing = bearingDeg + (Math.random() - 0.5) * 2 * bearingNoise;

  // Range estimate (poor for passive)
  let rangeEst = -1;
  if (signalStrength > 0.3) {
    rangeEst = distNm + (Math.random() - 0.5) * distNm * 0.5;
    rangeEst = Math.max(1, rangeEst);
  }

  return [{
    id: 'GOBLIN ONE',
    bearing: Math.round(((noisyBearing % 360) + 360) % 360 * 10) / 10,
    range_nm: rangeEst > 0 ? Math.round(rangeEst * 10) / 10 : -1,
    signal_strength: Math.round(signalStrength * 100) / 100,
    classification: signalStrength > 0.4 ? 'Probable submarine' :
                    signalStrength > 0.2 ? 'Submerged contact — unclassified' :
                    'Possible contact — very weak',
  }];
}

function applyPhysics(dt) {
  // Move submarine based on current heading/speed
  if (sub.speed_kts <= 0) return;

  const unitsPerSec = sub.speed_kts / 3600; // nm per second
  const headingRad = sub.heading * Math.PI / 180;
  sub.x += Math.sin(headingRad) * unitsPerSec * dt;
  sub.z += Math.cos(headingRad) * unitsPerSec * dt;

  // Update lat/lon
  sub.lat = REF_LAT + sub.z / NM_PER_DEG_LAT;
  sub.lon = REF_LON + sub.x / NM_PER_DEG_LON;
}

// =====================================================

console.log('\n  SUBMARINE TEST CLIENT');
console.log(`  Connecting to ${BRIDGE_URL}...\n`);

const ws = new WebSocket(BRIDGE_URL);

ws.on('open', () => {
  console.log('  Connected!\n');

  // Register as Unity client
  ws.send(JSON.stringify({ type: 'register', role: 'unity' }));

  // Wait a moment then start the game
  setTimeout(() => {
    ws.send(JSON.stringify({ type: 'start' }));
    startTime = Date.now();
    console.log('  Game started. Waiting for AI commands...\n');
    console.log('  ─'.repeat(35));

    // Send state updates periodically
    setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      applyPhysics(STATE_INTERVAL_MS / 1000);
      const contacts = computeSonar(elapsed);

      const state = {
        type: 'state',
        submarine: {
          lat: Math.round(sub.lat * 10000) / 10000,
          lon: Math.round(sub.lon * 10000) / 10000,
          depth_m: Math.round(sub.depth_m),
          heading: Math.round(sub.heading),
          speed_kts: Math.round(sub.speed_kts * 10) / 10,
        },
        contacts,
      };

      ws.send(JSON.stringify(state));

      // Status line
      const tgt = getTargetPos(elapsed);
      const tgtDist = Math.sqrt(
        Math.pow((tgt.lon - sub.lon) * NM_PER_DEG_LON, 2) +
        Math.pow((tgt.lat - sub.lat) * NM_PER_DEG_LAT, 2)
      );
      process.stdout.write(
        `\r  [T+${elapsed.toFixed(0).padStart(3)}s] ` +
        `HDG ${Math.round(sub.heading).toString().padStart(3)}° ` +
        `DEP ${Math.round(sub.depth_m).toString().padStart(3)}m ` +
        `SPD ${sub.speed_kts.toFixed(1).padStart(4)}kts ` +
        `| GOBLIN dist: ${tgtDist.toFixed(1).padStart(5)}nm ` +
        `| Sonar: ${contacts.length > 0 ? contacts[0].signal_strength.toFixed(0) + '%' : '---'}` +
        `  `
      );
    }, STATE_INTERVAL_MS);
  }, 1000);
});

ws.on('message', (raw) => {
  try {
    const msg = JSON.parse(raw);

    if (msg.type === 'command') {
      commandCount++;
      // Apply command to simulated sub (smooth it a bit)
      sub.heading = msg.heading;
      sub.depth_m = msg.target_depth_m;
      sub.speed_kts = msg.speed_kts;

      // Print command
      console.log(''); // newline after status
      console.log(`  ┌─ AI COMMAND #${commandCount} ─────────────────────────────`);
      console.log(`  │ HDG ${msg.heading}°  DEP ${msg.target_depth_m}m  SPD ${msg.speed_kts}kts  SONAR: ${msg.active_sonar ? 'ACTIVE' : 'passive'}`);
      console.log(`  │ "${msg.reasoning}"`);
      console.log(`  │ (${msg.latency_ms}ms latency)`);
      console.log(`  └──────────────────────────────────────────────`);
    }

    if (msg.type === 'intel') {
      console.log('');
      console.log(`  ╔═ INTEL ═══════════════════════════════════════`);
      console.log(`  ║ ${msg.message}`);
      console.log(`  ╚═══════════════════════════════════════════════`);
    }

    if (msg.type === 'config') {
      // Config received — update start position if provided
      if (msg.blueStart) {
        sub.lat = msg.blueStart.lat || sub.lat;
        sub.lon = msg.blueStart.lon || sub.lon;
        sub.x = (sub.lon - REF_LON) * NM_PER_DEG_LON;
        sub.z = (sub.lat - REF_LAT) * NM_PER_DEG_LAT;
        console.log(`  Starting position: ${sub.lat.toFixed(1)}°N, ${Math.abs(sub.lon).toFixed(1)}°W`);
      }
    }
  } catch (e) { /* ignore */ }
});

ws.on('error', (err) => {
  console.error(`\n  Connection error: ${err.message}`);
  console.error('  Is the bridge server running? node server/submarine-bridge.js\n');
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n\n  Disconnected from bridge.\n');
  process.exit(0);
});
