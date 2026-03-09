/* ===================================================================
   PANOPTICON — Submarine 3D View Panel
   Three.js underwater scene for submarine pursuit wargames.
   Connects to the submarine bridge server for AI navigation.
   =================================================================== */

import { $ } from './utils.js';
import { startAnimLoop } from './viewbase.js';
import { registerView } from './viewregistry.js';

let submarineViewOpen = false;
let animHandle = null;
let currentEntityId = null;
let storedCesiumViewer = null;

// Three.js objects
let renderer, scene, camera, clock;
let playerSub, targetSub, particles, godray;
let motionParticles = null; // speed-relative debris that streams past camera
let sonarPPICtx, sweepAngle = 0;

// Bridge connection
let ws = null;
let wsConnected = false;
let gameStarted = false;
let gameStartTime = 0;
let lastStateSend = 0;
let lastContacts = [];

// Submarine state
const sub = {
  heading: 150, targetHeading: 150,
  depthM: 100, targetDepthM: 100,
  speedKts: 0, targetSpeedKts: 0,
  maxSpeedKts: 30, maxDepthM: 500, minDepthM: 30,
  turnRate: 12, depthRate: 3, accelRate: 1.5,
};

// Camera orbit state
let camDistance = 12, camOrbitX = 0, camOrbitY = 15, isOrbiting = false;

// Constants
const BRIDGE_URL = 'ws://localhost:3002';
const STATE_INTERVAL = 2000;
const REF_LAT = 55.0, REF_LON = -28.0;
const NM_PER_DEG_LAT = 60.0;
const NM_PER_DEG_LON = 60.0 * Math.cos(REF_LAT * Math.PI / 180);
const DEPTH_SCALE = 50;
const KTS_TO_UNITS = 1 / 3600;
const MAX_SONAR_RANGE = 60;
const MAX_ACTIVE_RANGE = 20;
const GAME_DURATION = 360;

const START_LAT = 56.0, START_LON = -30.0;
const START_X = (START_LON - REF_LON) * NM_PER_DEG_LON;
const START_Z = (START_LAT - REF_LAT) * NM_PER_DEG_LAT;

const TARGET_TRACE = [
  { tick: 0, lat: 55.0, lon: -26.0 },
  { tick: 4, lat: 54.0, lon: -24.0 },
  { tick: 8, lat: 52.5, lon: -21.5 },
  { tick: 12, lat: 51.0, lon: -19.0 },
];
const targetTraceUnity = TARGET_TRACE.map(t => ({
  x: (t.lon - REF_LON) * NM_PER_DEG_LON,
  z: (t.lat - REF_LAT) * NM_PER_DEG_LAT,
  timeSec: (t.tick / 12) * GAME_DURATION,
}));

let activeSonar = false;
let keys = {};

// =====================================================
// PUBLIC API
// =====================================================
export function isSubmarineViewOpen() { return submarineViewOpen; }
export function resizeSubmarineView() {
  if (!submarineViewOpen || !renderer) return;
  const container = $('submarine-3d-container');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}

export function openSubmarineView(cesiumViewer, entity) {
  storedCesiumViewer = cesiumViewer;
  const ac = entity?.acData;
  const entityId = ac?.hex || null;

  // Already open — swap entity or ignore if same
  if (submarineViewOpen) {
    if (entityId && entityId !== currentEntityId) {
      swapToEntity(entity);
    }
    return;
  }

  submarineViewOpen = true;
  currentEntityId = entityId;

  $('submarine-view-panel').classList.add('open');
  document.body.classList.add('submarine-panel-open');

  setTimeout(() => {
    initThreeScene(entity);
    connectBridge();
    animHandle = startAnimLoop(animate);
    updateUnitLabel(ac);
    cesiumViewer.resize();
  }, 400);
}

function swapToEntity(entity) {
  const ac = entity?.acData;
  const cfg = ac?._subConfig;
  currentEntityId = ac?.hex || null;

  if (cfg && playerSub) {
    const nx = (cfg.lon - REF_LON) * NM_PER_DEG_LON;
    const nz = (cfg.lat - REF_LAT) * NM_PER_DEG_LAT;
    playerSub.position.set(nx, playerSub.position.y, nz);

    sub.heading = cfg.heading || 0;
    sub.targetHeading = sub.heading;
    const swapSpeed = (cfg.speed_kts || 0) > 0 ? cfg.speed_kts : 8;
    sub.speedKts = swapSpeed;
    sub.targetSpeedKts = swapSpeed;
    sub.maxSpeedKts = cfg.max_speed_kts || 30;

    // Re-center particles around new position
    particleOrigin.x = nx;
    particleOrigin.z = nz;
    const pAttr = particles.geometry.attributes.position;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pAttr.setXYZ(i,
        nx + (Math.random() - 0.5) * PARTICLE_EXTENT,
        playerSub.position.y + (Math.random() - 0.5) * PARTICLE_HEIGHT,
        nz + (Math.random() - 0.5) * PARTICLE_EXTENT,
      );
    }
    pAttr.needsUpdate = true;

    // Respawn environment around new entity
    spawnRocksAround(nx, nz, playerSub.position.y);
    spawnFishAround(nx, playerSub.position.y, nz);
  }

  updateUnitLabel(ac);
}

function updateUnitLabel(acData) {
  const el = $('sub-unit-label');
  if (el) el.textContent = acData?.label || acData?.r || acData?.flight || '---';
}

export function closeSubmarineView(cesiumViewer) {
  submarineViewOpen = false;
  currentEntityId = null;

  $('submarine-view-panel').classList.remove('open');
  document.body.classList.remove('submarine-panel-open');

  if (animHandle) { animHandle.stop(); animHandle = null; }
  if (ws) { ws.close(); ws = null; wsConnected = false; }

  // Clean up Three.js
  if (renderer) {
    renderer.dispose();
    const container = $('submarine-3d-container');
    if (container) container.innerHTML = '';
    renderer = null;
  }
  scene = null; camera = null;

  setTimeout(() => cesiumViewer?.resize(), 400);
}

// Register with view system
registerView('submarine', {
  open: openSubmarineView,
  close: closeSubmarineView,
  isOpen: isSubmarineViewOpen,
  resize: resizeSubmarineView,
});

// =====================================================
// THREE.JS SCENE INIT
// =====================================================
function initThreeScene(entity) {
  const container = $('submarine-3d-container');
  if (!container) return;

  // Determine starting position from entity or fallback to defaults
  const cfg = entity?.acData?._subConfig;
  const startLat = cfg?.lat ?? START_LAT;
  const startLon = cfg?.lon ?? START_LON;
  const startX = (startLon - REF_LON) * NM_PER_DEG_LON;
  const startZ = (startLat - REF_LAT) * NM_PER_DEG_LAT;

  const rect = container.getBoundingClientRect();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(rect.width, rect.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  const fogColor = new THREE.Color(0.015, 0.06, 0.09);
  scene.fog = new THREE.FogExp2(fogColor, 0.005);
  scene.background = fogColor;

  camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 500);
  clock = new THREE.Clock();

  // Lighting
  scene.add(new THREE.AmbientLight(new THREE.Color(0.06, 0.1, 0.15), 1.2));
  const sun = new THREE.DirectionalLight(new THREE.Color(0.15, 0.35, 0.45), 0.5);
  sun.position.set(50, 100, 30);
  scene.add(sun);

  godray = new THREE.SpotLight(new THREE.Color(0.1, 0.25, 0.3), 0.8, 200, Math.PI / 6, 0.5);
  godray.position.set(0, 50, 0);
  godray.target.position.set(0, -10, 0);
  scene.add(godray);
  scene.add(godray.target);

  // Ocean floor
  scene.add(createOceanFloor());

  // Water surface
  const surfGeo = new THREE.PlaneGeometry(2000, 2000);
  surfGeo.rotateX(-Math.PI / 2);
  scene.add(new THREE.Mesh(surfGeo, new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.08, 0.25, 0.35), transparent: true, opacity: 0.08, side: THREE.DoubleSide,
  })));

  // Submarines (created before particles so we can center particles around start pos)
  playerSub = createSubModel(0x338855);
  playerSub.position.set(startX, -100 / DEPTH_SCALE, startZ);
  scene.add(playerSub);

  // Particles (static in world space — stream past as submarine moves)
  particles = createParticles();
  particleOrigin = { x: startX, y: -100 / DEPTH_SCALE, z: startZ };
  const pAttr = particles.geometry.attributes.position;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pAttr.setXYZ(i,
      startX + (Math.random() - 0.5) * PARTICLE_EXTENT,
      (-100 / DEPTH_SCALE) + (Math.random() - 0.5) * PARTICLE_HEIGHT,
      startZ + (Math.random() - 0.5) * PARTICLE_EXTENT,
    );
  }
  pAttr.needsUpdate = true;
  scene.add(particles);

  const subLight = new THREE.PointLight(0x33ff55, 0.6, 25);
  subLight.position.set(0, 0.3, 1.5);
  playerSub.add(subLight);

  // Forward headlight for illuminating rocks/fish ahead
  const headlight = new THREE.SpotLight(0x44ff66, 0.5, 40, Math.PI / 5, 0.6);
  headlight.position.set(0, 0, 1.8);
  headlight.target.position.set(0, -0.5, 10);
  playerSub.add(headlight);
  playerSub.add(headlight.target);

  targetSub = createSubModel(0x993322);
  scene.add(targetSub);

  // Environmental objects (rocks + fish)
  spawnRocksAround(startX, startZ, -100 / DEPTH_SCALE);
  spawnFishAround(startX, -100 / DEPTH_SCALE, startZ);

  // Motion streak particles (speed-relative, rush past camera)
  motionParticles = createMotionParticles();
  scene.add(motionParticles);

  // Camera initial position
  camera.position.set(startX, -100 / DEPTH_SCALE + 3, startZ - 10);

  // Sonar PPI
  const ppiCanvas = $('sub-sonar-ppi');
  if (ppiCanvas) sonarPPICtx = ppiCanvas.getContext('2d');

  // Mouse controls on the Three.js canvas
  renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
  renderer.domElement.addEventListener('mousedown', e => { if (e.button === 2) isOrbiting = true; });
  renderer.domElement.addEventListener('wheel', e => {
    camDistance += e.deltaY * 0.01 * camDistance * 0.1;
    camDistance = Math.max(3, Math.min(80, camDistance));
  });

  // Reset state from entity config or defaults
  sub.heading = cfg?.heading ?? 150; sub.targetHeading = sub.heading;
  sub.depthM = 100; sub.targetDepthM = 100;
  // Default to 8 kts cruising speed if scenario provides 0 — otherwise sub sits still
  const initSpeed = (cfg?.speed_kts || 0) > 0 ? cfg.speed_kts : 8;
  sub.speedKts = initSpeed; sub.targetSpeedKts = initSpeed;
  sub.maxSpeedKts = cfg?.max_speed_kts ?? 30;
  lastContacts = [];
  gameStarted = false;
}

// =====================================================
// MODEL BUILDERS
// =====================================================
function createSubModel(color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.6), roughness: 0.5, metalness: 0.5,
  });

  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 2.8, 8, 16), mat);
  hull.rotation.z = Math.PI / 2;
  group.add(hull);

  const sail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.5), darkMat);
  sail.position.set(0, 0.42, 0.2);
  group.add(sail);

  const periscope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6), darkMat);
  periscope.position.set(0, 0.68, 0.25);
  group.add(periscope);

  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.35, 0.2), darkMat);
  rudder.position.set(0, 0, -1.55);
  group.add(rudder);

  const hStab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.18), darkMat);
  hStab.position.set(0, 0, -1.5);
  group.add(hStab);

  const bpGeo = new THREE.BoxGeometry(0.22, 0.03, 0.12);
  [-1, 1].forEach(side => {
    const bp = new THREE.Mesh(bpGeo, darkMat);
    bp.position.set(side * 0.25, 0, 1.1);
    group.add(bp);
  });

  const propMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.3 });
  const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 8), propMat);
  prop.rotation.x = Math.PI / 2;
  prop.position.set(0, 0, -1.7);
  prop.name = 'propeller';
  group.add(prop);

  group.scale.setScalar(1.5);
  return group;
}

function createOceanFloor() {
  const geo = new THREE.PlaneGeometry(800, 800, 128, 128);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    let h = Math.sin(x * 0.008 + 1.3) * Math.cos(z * 0.006 + 0.7) * 1.5;
    h += Math.sin(x * 0.025 + 4.1) * Math.cos(z * 0.03 + 2.3) * 0.4;
    h += Math.sin(x * 0.003 + z * 0.002) * 3.0;
    const sm = Math.sin(x * 0.004 + 3.0) * Math.sin(z * 0.005 + 1.5);
    if (sm > 0.7) h += (sm - 0.7) * 12;
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.06, 0.1, 0.06), roughness: 0.95, metalness: 0, flatShading: true,
  });
  const floor = new THREE.Mesh(geo, mat);
  floor.position.y = -400 / DEPTH_SCALE;
  return floor;
}

let particleOrigin = { x: 0, y: 0, z: 0 };
const PARTICLE_COUNT = 3000;
const PARTICLE_EXTENT = 150;
const PARTICLE_HEIGHT = 20;
const PARTICLE_RECENTER_DIST = 60;

function createParticles() {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * PARTICLE_EXTENT;
    positions[i * 3 + 1] = (Math.random() - 0.5) * PARTICLE_HEIGHT;
    positions[i * 3 + 2] = (Math.random() - 0.5) * PARTICLE_EXTENT;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xaaddbb, size: 0.25, transparent: true, opacity: 0.5, sizeAttenuation: true,
  }));
}

// --- Rock pillars / coral structures scattered at submarine depth ---
let rockColumns = [];
const ROCK_GRID = 120; // how far apart rock clusters span
const ROCK_COUNT = 40; // rocks per cluster

function createRockCluster(cx, cz, subY) {
  const group = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.08, 0.12, 0.07), roughness: 0.9, metalness: 0.1, flatShading: true,
  });
  const coralMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.15, 0.06, 0.08), roughness: 0.8, metalness: 0, flatShading: true,
  });
  for (let i = 0; i < ROCK_COUNT; i++) {
    const rx = cx + (Math.random() - 0.5) * ROCK_GRID;
    const rz = cz + (Math.random() - 0.5) * ROCK_GRID;
    const h = 1 + Math.random() * 4;
    const r = 0.3 + Math.random() * 0.8;
    const useCoral = Math.random() > 0.7;
    const geo = new THREE.CylinderGeometry(r * 0.3, r, h, 5 + Math.floor(Math.random() * 3), 1);
    // Wobble vertices for organic look
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      pos.setX(v, pos.getX(v) + (Math.random() - 0.5) * 0.2);
      pos.setZ(v, pos.getZ(v) + (Math.random() - 0.5) * 0.2);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, useCoral ? coralMat : rockMat);
    mesh.position.set(rx, subY - 3 + h / 2, rz);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    group.add(mesh);
  }
  return group;
}

function spawnRocksAround(x, z, subY) {
  // Remove old rocks
  for (const r of rockColumns) scene.remove(r);
  rockColumns = [];
  // Spawn rocks in a grid around the player
  const cluster = createRockCluster(x, z, subY);
  scene.add(cluster);
  rockColumns.push(cluster);
}

// --- Fish schools (small groups that drift through the scene) ---
let fishSchools = [];

function createFishSchool(cx, cy, cz) {
  const count = 8 + Math.floor(Math.random() * 12);
  const group = new THREE.Group();
  const fishMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.3, 0.5, 0.4), roughness: 0.6, metalness: 0.2,
  });
  for (let i = 0; i < count; i++) {
    // Simple fish = elongated octahedron
    const fishGeo = new THREE.OctahedronGeometry(0.12, 0);
    fishGeo.scale(2.5, 0.6, 0.8);
    const fish = new THREE.Mesh(fishGeo, fishMat);
    fish.position.set(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 3,
    );
    group.add(fish);
  }
  group.position.set(cx, cy, cz);
  // Store drift direction
  group.userData.vx = (Math.random() - 0.5) * 0.3;
  group.userData.vz = (Math.random() - 0.5) * 0.3;
  return group;
}

function spawnFishAround(x, y, z) {
  for (const f of fishSchools) scene.remove(f);
  fishSchools = [];
  for (let i = 0; i < 12; i++) {
    const fx = x + (Math.random() - 0.5) * 80;
    const fz = z + (Math.random() - 0.5) * 80;
    const fy = y + (Math.random() - 0.5) * 6;
    const school = createFishSchool(fx, fy, fz);
    scene.add(school);
    fishSchools.push(school);
  }
}

function updateFish(dt) {
  for (const school of fishSchools) {
    school.position.x += school.userData.vx * dt;
    school.position.z += school.userData.vz * dt;
    // Gentle wobble
    school.rotation.y += dt * 0.3;
  }
}

// --- Motion streaks: particles that rush past the camera to show speed ---
const MOTION_COUNT = 600;
const MOTION_RANGE = 12;   // half-extent of spawn volume around sub (tighter = more visible)
const MOTION_DEPTH = 25;   // how far ahead/behind they extend
const MOTION_VIS_SCALE = 12; // visual speed multiplier (knots → units/sec feel)

function createMotionParticles() {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(MOTION_COUNT * 3);
  for (let i = 0; i < MOTION_COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * MOTION_RANGE;
    positions[i * 3 + 1] = (Math.random() - 0.5) * MOTION_RANGE;
    positions[i * 3 + 2] = (Math.random() - 0.5) * MOTION_DEPTH * 2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xddfff0, size: 0.2, transparent: true, opacity: 0.7, sizeAttenuation: true,
  }));
  return pts;
}

function updateMotionParticles(dt) {
  if (!motionParticles || !playerSub) return;
  const speed = sub.speedKts;
  if (speed < 0.5) return; // don't animate when nearly stopped

  // Move the system to track the player
  motionParticles.position.copy(playerSub.position);
  motionParticles.rotation.y = sub.heading * Math.PI / 180;

  const flowSpeed = speed * MOTION_VIS_SCALE * dt;
  const pos = motionParticles.geometry.attributes.position;
  for (let i = 0; i < MOTION_COUNT; i++) {
    // Move particles backward (negative local Z = behind the sub)
    let z = pos.getZ(i) - flowSpeed;
    // Recycle: when it passes behind, respawn ahead
    if (z < -MOTION_DEPTH) {
      z += MOTION_DEPTH * 2;
      pos.setX(i, (Math.random() - 0.5) * MOTION_RANGE);
      pos.setY(i, (Math.random() - 0.5) * MOTION_RANGE);
    }
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;

  // Fade opacity based on speed
  motionParticles.material.opacity = Math.min(0.7, speed / 20);
}

function recenterParticlesIfNeeded() {
  if (!particles || !playerSub) return;
  const dx = playerSub.position.x - particleOrigin.x;
  const dz = playerSub.position.z - particleOrigin.z;
  if (dx * dx + dz * dz > PARTICLE_RECENTER_DIST * PARTICLE_RECENTER_DIST) {
    particleOrigin.x = playerSub.position.x;
    particleOrigin.y = playerSub.position.y;
    particleOrigin.z = playerSub.position.z;
    const pos = particles.geometry.attributes.position;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos.setXYZ(i,
        particleOrigin.x + (Math.random() - 0.5) * PARTICLE_EXTENT,
        particleOrigin.y + (Math.random() - 0.5) * PARTICLE_HEIGHT,
        particleOrigin.z + (Math.random() - 0.5) * PARTICLE_EXTENT,
      );
    }
    pos.needsUpdate = true;
    // Respawn rocks and fish around new position
    spawnRocksAround(playerSub.position.x, playerSub.position.z, playerSub.position.y);
    spawnFishAround(playerSub.position.x, playerSub.position.y, playerSub.position.z);
  }
}

// =====================================================
// GAME LOOP
// =====================================================
function animate() {
  if (!renderer || !scene || !camera) return;
  const dt = Math.min(clock.getDelta(), 0.1);
  const elapsed = gameStarted ? (performance.now() - gameStartTime) / 1000 : 0;

  handleInput(dt);
  updateSubPhysics(dt);
  updateTarget(elapsed);

  // Re-center particle cloud when player moves far from origin
  recenterParticlesIfNeeded();
  updateFish(dt);
  updateMotionParticles(dt);
  if (godray && playerSub) {
    godray.position.set(playerSub.position.x, 50, playerSub.position.z);
    godray.target.position.copy(playerSub.position);
  }

  updateCamera(dt);

  // Fog with depth
  const depthFactor = sub.depthM / 500;
  scene.fog.density = 0.005 + depthFactor * 0.01;
  scene.fog.color.lerpColors(
    new THREE.Color(0.015, 0.06, 0.09),
    new THREE.Color(0.005, 0.02, 0.04),
    depthFactor
  );
  scene.background.copy(scene.fog.color);

  // Sonar + send state
  const now = performance.now();
  if (now - lastStateSend > STATE_INTERVAL) {
    lastStateSend = now;
    lastContacts = computeSonarContacts();
    sendState(lastContacts);
  }

  updateHUD(lastContacts);
  if (sonarPPICtx) drawSonarPPI(sonarPPICtx, lastContacts);

  renderer.render(scene, camera);
}

// =====================================================
// PHYSICS
// =====================================================
function updateSubPhysics(dt) {
  let hDiff = sub.targetHeading - sub.heading;
  if (hDiff > 180) hDiff -= 360;
  if (hDiff < -180) hDiff += 360;
  sub.heading += Math.max(-sub.turnRate * dt, Math.min(sub.turnRate * dt, hDiff));
  sub.heading = ((sub.heading % 360) + 360) % 360;

  const tD = Math.max(sub.minDepthM, Math.min(sub.maxDepthM, sub.targetDepthM));
  const dD = tD - sub.depthM;
  sub.depthM += Math.max(-sub.depthRate * dt, Math.min(sub.depthRate * dt, dD));

  const tS = Math.max(0, Math.min(sub.maxSpeedKts, sub.targetSpeedKts));
  const sD = tS - sub.speedKts;
  sub.speedKts += Math.max(-sub.accelRate * dt, Math.min(sub.accelRate * dt, sD));
  sub.speedKts = Math.max(0, sub.speedKts);

  const uPS = sub.speedKts * KTS_TO_UNITS;
  const hRad = sub.heading * Math.PI / 180;
  playerSub.position.x += Math.sin(hRad) * uPS * dt;
  playerSub.position.z += Math.cos(hRad) * uPS * dt;
  playerSub.position.y = -sub.depthM / DEPTH_SCALE;

  const pitchTarget = Math.max(-15, Math.min(15, (sub.targetDepthM - sub.depthM) * 0.1));
  playerSub.rotation.set(pitchTarget * Math.PI / 180, hRad, 0, 'YXZ');

  const prop = playerSub.getObjectByName('propeller');
  if (prop) prop.rotation.z += sub.speedKts * 0.02 * dt;
}

function updateTarget(elapsed) {
  const pos = getTargetPos(elapsed);
  targetSub.position.set(pos.x, -180 / DEPTH_SCALE, pos.z);
  const next = getTargetPos(elapsed + 1);
  const dx = next.x - pos.x, dz = next.z - pos.z;
  if (dx * dx + dz * dz > 0.0001) targetSub.rotation.y = Math.atan2(dx, dz);
}

function getTargetPos(elapsed) {
  const t = targetTraceUnity;
  if (elapsed <= t[0].timeSec) return { x: t[0].x, z: t[0].z };
  if (elapsed >= t[t.length - 1].timeSec) return { x: t[t.length - 1].x, z: t[t.length - 1].z };
  for (let i = 0; i < t.length - 1; i++) {
    if (elapsed >= t[i].timeSec && elapsed <= t[i + 1].timeSec) {
      const f = (elapsed - t[i].timeSec) / (t[i + 1].timeSec - t[i].timeSec);
      return { x: t[i].x + (t[i + 1].x - t[i].x) * f, z: t[i].z + (t[i + 1].z - t[i].z) * f };
    }
  }
  return { x: t[t.length - 1].x, z: t[t.length - 1].z };
}

// =====================================================
// INPUT
// =====================================================
function handleInput(dt) {
  if (keys['w']) sub.targetSpeedKts = Math.min(sub.targetSpeedKts + 5 * dt, sub.maxSpeedKts);
  if (keys['s']) sub.targetSpeedKts = Math.max(sub.targetSpeedKts - 5 * dt, 0);
  if (keys['a']) sub.targetHeading -= 30 * dt;
  if (keys['d']) sub.targetHeading += 30 * dt;
  if (keys['q']) sub.targetDepthM = Math.max(sub.targetDepthM - 20 * dt, sub.minDepthM);
  if (keys['e']) sub.targetDepthM = Math.min(sub.targetDepthM + 20 * dt, sub.maxDepthM);
  sub.targetHeading = ((sub.targetHeading % 360) + 360) % 360;
}

// Global keyboard listeners (only active when panel is open)
window.addEventListener('keydown', e => { if (submarineViewOpen) keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('mousemove', e => {
  if (isOrbiting && submarineViewOpen) {
    camOrbitX += e.movementX * 0.3;
    camOrbitY -= e.movementY * 0.3;
    camOrbitY = Math.max(-30, Math.min(60, camOrbitY));
  }
});
window.addEventListener('mouseup', e => { if (e.button === 2) isOrbiting = false; });

// =====================================================
// CAMERA
// =====================================================
function updateCamera(dt) {
  if (!isOrbiting) camOrbitX *= 0.97;
  const angle = (sub.heading + 180 + camOrbitX) * Math.PI / 180;
  const pitch = camOrbitY * Math.PI / 180;
  const offset = new THREE.Vector3(
    Math.sin(angle) * Math.cos(pitch) * camDistance,
    Math.sin(pitch) * camDistance + 2,
    Math.cos(angle) * Math.cos(pitch) * camDistance
  );
  const desired = playerSub.position.clone().add(offset);
  camera.position.lerp(desired, 5 * dt);
  camera.lookAt(playerSub.position);
}

// =====================================================
// SONAR
// =====================================================
function getNoiseLevel() {
  if (sub.speedKts <= 3) return 0.1;
  if (sub.speedKts <= 8) return 0.3;
  if (sub.speedKts <= 15) return 0.6;
  return 0.9;
}

function computeSonarContacts() {
  if (!playerSub || !targetSub) return [];
  const dx = targetSub.position.x - playerSub.position.x;
  const dz = targetSub.position.z - playerSub.position.z;
  const distNm = Math.sqrt(dx * dx + dz * dz);
  let bearingDeg = (Math.atan2(dx, dz) * 180 / Math.PI + 360) % 360;

  let sig = 0, rangeAcc = 0;
  if (activeSonar && distNm <= MAX_ACTIVE_RANGE) {
    sig = 1 - distNm / MAX_ACTIVE_RANGE; rangeAcc = 0.9;
  } else if (distNm <= MAX_SONAR_RANGE) {
    const df = Math.pow(1 - distNm / MAX_SONAR_RANGE, 2);
    const ownNP = 1 - getNoiseLevel() * 0.6;
    const therm = ((sub.depthM < 200 && 180 > 200) || (sub.depthM > 200 && 180 < 200)) ? 0.4 : 1.0;
    sig = df * 0.5 * ownNP * therm;
    rangeAcc = sig > 0.5 ? 0.3 : 0.1;
  }
  if (sig < 0.05) return [];

  const bNoise = (1 - sig) * 8;
  const noisyB = (bearingDeg + (Math.random() - 0.5) * 2 * bNoise + 360) % 360;
  let rangeEst = -1;
  if (rangeAcc > 0.2) rangeEst = Math.max(0.5, distNm + (Math.random() - 0.5) * distNm * (1 - rangeAcc));

  return [{
    id: 'GOBLIN ONE', bearing: Math.round(noisyB * 10) / 10,
    range_nm: rangeEst > 0 ? Math.round(rangeEst * 10) / 10 : -1,
    signal_strength: Math.round(sig * 100) / 100,
    classification: sig > 0.7 ? 'Submarine — high confidence' :
                    sig > 0.4 ? 'Probable submarine' :
                    sig > 0.2 ? 'Submerged contact — unclassified' : 'Possible contact — very weak',
    actualDist: distNm,
  }];
}

// =====================================================
// BRIDGE WEBSOCKET
// =====================================================
function connectBridge() {
  try { ws = new WebSocket(BRIDGE_URL); } catch { return; }

  ws.onopen = () => {
    wsConnected = true;
    ws.send(JSON.stringify({ type: 'register', role: 'unity' }));
    setTimeout(() => {
      ws.send(JSON.stringify({ type: 'start' }));
      gameStarted = true;
      gameStartTime = performance.now();
    }, 500);
  };

  ws.onmessage = e => {
    try { handleBridgeMessage(JSON.parse(e.data)); } catch {}
  };

  ws.onclose = () => {
    wsConnected = false;
    if (submarineViewOpen) setTimeout(connectBridge, 3000);
  };
  ws.onerror = () => { wsConnected = false; };
}

function handleBridgeMessage(msg) {
  if (msg.type === 'command') {
    sub.targetHeading = msg.heading;
    sub.targetDepthM = msg.target_depth_m;
    sub.targetSpeedKts = msg.speed_kts;
    activeSonar = !!msg.active_sonar;

    const aiText = $('sub-ai-text');
    const aiPanel = $('sub-hud-ai');
    if (aiText) aiText.textContent = msg.reasoning;
    if (aiPanel) aiPanel.style.display = 'block';

    const cmd = $('sub-s-cmd');
    if (cmd) cmd.textContent = `HDG ${msg.heading}° DEP ${msg.target_depth_m}m SPD ${msg.speed_kts}kts`;
  }
  if (msg.type === 'intel') {
    const panel = $('sub-hud-intel');
    const list = $('sub-intel-list');
    if (panel) panel.style.display = 'block';
    if (list) {
      const div = document.createElement('div');
      div.className = 'sub-intel-msg';
      div.textContent = msg.message;
      list.prepend(div);
      while (list.children.length > 5) list.removeChild(list.lastChild);
    }
  }
}

function sendState(contacts) {
  if (!ws || ws.readyState !== 1 || !gameStarted) return;
  const lat = REF_LAT + playerSub.position.z / NM_PER_DEG_LAT;
  const lon = REF_LON + playerSub.position.x / NM_PER_DEG_LON;
  ws.send(JSON.stringify({
    type: 'state',
    submarine: {
      lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4,
      depth_m: Math.round(sub.depthM), heading: Math.round(sub.heading),
      speed_kts: Math.round(sub.speedKts * 10) / 10,
    },
    contacts: contacts.map(c => ({
      id: c.id, bearing: c.bearing, range_nm: c.range_nm,
      signal_strength: c.signal_strength, classification: c.classification,
    })),
  }));
}

// =====================================================
// HUD UPDATES
// =====================================================
function updateHUD(contacts) {
  const h = Math.round(sub.heading);
  const el = id => $(id);

  const compass = el('sub-compass-heading');
  if (compass) compass.textContent = String(h).padStart(3, '0');

  const hdg = el('sub-s-hdg'); if (hdg) hdg.textContent = String(h).padStart(3, '0');
  const dep = el('sub-s-dep'); if (dep) dep.textContent = Math.round(sub.depthM);
  const spd = el('sub-s-spd'); if (spd) spd.textContent = sub.speedKts.toFixed(1);

  const noise = el('sub-s-noise');
  if (noise) {
    if (sub.speedKts > 15) { noise.textContent = 'HIGH'; noise.style.color = '#ff4444'; }
    else if (sub.speedKts > 8) { noise.textContent = 'MODERATE'; noise.style.color = '#ffaa00'; }
    else if (sub.speedKts > 3) { noise.textContent = 'LOW'; noise.style.color = '#00ff41'; }
    else { noise.textContent = 'ULTRA-QUIET'; noise.style.color = '#00ff41'; }
  }

  const list = el('sub-sonar-list');
  if (list) {
    if (contacts.length === 0) {
      list.innerHTML = '<div style="opacity:0.4;font-size:12px;color:#8a8">No contacts detected</div>';
    } else {
      list.innerHTML = contacts.map(c => {
        const rng = c.range_nm > 0 ? `${c.range_nm.toFixed(1)}nm` : 'UNKNOWN';
        const col = c.signal_strength > 0.5 ? '#ff4444' : c.signal_strength > 0.2 ? '#ffaa00' : '#8a8';
        return `<div style="color:${col};font-size:12px;font-weight:bold">${c.id}</div>
                <div style="color:#8a8;font-size:11px">&nbsp;BRG ${Math.round(c.bearing)}° RNG ${rng} SIG ${Math.round(c.signal_strength*100)}%</div>
                <div style="color:#666;font-size:10px">&nbsp;${c.classification}</div>`;
      }).join('');
    }
  }

  const depthInd = el('sub-depth-indicator');
  if (depthInd) {
    depthInd.style.top = `${((sub.depthM - sub.minDepthM) / (sub.maxDepthM - sub.minDepthM)) * 100}%`;
  }
}

// =====================================================
// SONAR PPI
// =====================================================
function drawSonarPPI(ctx, contacts) {
  const w = 180, h = 180;
  const cx = w / 2, cy = h / 2, r = w / 2 - 10;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(5, 20, 10, 0.8)';
  ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill();

  // Range rings
  ctx.strokeStyle = 'rgba(0, 255, 65, 0.12)'; ctx.lineWidth = 0.5;
  for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(cx, cy, r * i / 3, 0, Math.PI * 2); ctx.stroke(); }

  // Cardinal lines
  ctx.strokeStyle = 'rgba(0, 255, 65, 0.08)';
  for (let a = 0; a < 4; a++) {
    const ang = a * Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(ang) * r, cy - Math.cos(ang) * r); ctx.stroke();
  }

  // Sweep
  sweepAngle += 0.03;
  ctx.strokeStyle = 'rgba(0, 255, 65, 0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(sweepAngle) * r, cy - Math.cos(sweepAngle) * r); ctx.stroke();

  for (let i = 0; i < 30; i++) {
    const a = sweepAngle - i * 0.02;
    ctx.strokeStyle = `rgba(0, 255, 65, ${(1 - i / 30) * 0.15})`;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(a) * r, cy - Math.cos(a) * r); ctx.stroke();
  }

  // Heading indicator
  ctx.fillStyle = '#00ff41';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r - 6); ctx.lineTo(cx - 3, cy - r - 1); ctx.lineTo(cx + 3, cy - r - 1);
  ctx.fill();

  // Contact blips
  for (const c of contacts) {
    const relB = (c.bearing - sub.heading) * Math.PI / 180;
    const bDist = Math.min(1, (c.actualDist || 30) / MAX_SONAR_RANGE) * r;
    const bx = cx + Math.sin(relB) * bDist, by = cy - Math.cos(relB) * bDist;

    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, 6);
    grad.addColorStop(0, `rgba(255, 60, 60, ${c.signal_strength})`);
    grad.addColorStop(1, 'rgba(255, 60, 60, 0)');
    ctx.fillStyle = grad; ctx.fillRect(bx - 6, by - 6, 12, 12);

    ctx.fillStyle = c.signal_strength > 0.4 ? '#ff4444' : '#ff8844';
    ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Center dot
  ctx.fillStyle = '#00ff41';
  ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(0, 255, 65, 0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.stroke();
}
