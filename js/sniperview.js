/* ===================================================================
   PANOPTICON — Sniper Scope 3D View Panel
   Three.js scene: room interior viewed through a rifle scope.
   Target figure walks a scripted path. AI decides FIRE or HOLD.
   =================================================================== */

import { $ } from './utils.js';
import { startAnimLoop } from './viewbase.js';
import { registerView } from './viewregistry.js';

let viewOpen = false;
let animHandle = null;
let storedViewer = null;

// Three.js objects
let renderer, scene, camera, clock;
let scopeCanvas, scopeCtx;
let targetGroup;

// Animation state
let targetPhase = 0;
let breatheTime = 0;
const CYCLE_DURATION = 140; // seconds for full target path cycle

// Tick-sync mode: 'wallclock' = free animation, 'sync' = driven by playback tick
let tickMode = 'wallclock';

// Decision notification state
let lastDecision = null;
let decisionFlashTime = 0;
let shotFired = false;
let shotTime = 0;

// Target path waypoints: { t (0-1 phase), x, z, facing (radians) }
// Room: x -4..4, z 0..6. Window wall at z=0. Camera looks from z=-30.
const TARGET_PATH = [
  { t: 0.00, x:  3.5, z: 5.0, facing: Math.PI },
  { t: 0.10, x:  1.5, z: 3.5, facing: -Math.PI / 2 },
  { t: 0.30, x:  1.5, z: 3.5, facing: -Math.PI / 4 },
  { t: 0.35, x:  0.5, z: 2.0, facing: 0 },
  { t: 0.45, x:  0.0, z: 0.8, facing: 0 },
  { t: 0.60, x:  0.0, z: 0.8, facing: Math.PI / 8 },
  { t: 0.65, x:  0.8, z: 2.5, facing: Math.PI / 2 },
  { t: 0.80, x:  1.5, z: 3.5, facing: Math.PI },
  { t: 0.90, x: -1.0, z: 4.5, facing: Math.PI * 0.8 },
  { t: 1.00, x: -3.5, z: 5.0, facing: Math.PI },
];

// =====================================================
// PUBLIC API
// =====================================================
export function isSniperViewOpen() { return viewOpen; }

export function resizeSniperView() {
  if (!viewOpen || !renderer) return;
  const container = $('sniper-3d-container');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  if (scopeCanvas) {
    scopeCanvas.width = rect.width * devicePixelRatio;
    scopeCanvas.height = rect.height * devicePixelRatio;
    scopeCanvas.style.width = rect.width + 'px';
    scopeCanvas.style.height = rect.height + 'px';
  }
}

export function openSniperView(cesiumViewer) {
  if (viewOpen) return;
  storedViewer = cesiumViewer;
  viewOpen = true;
  targetPhase = 0;
  tickMode = 'wallclock';
  shotFired = false;
  lastDecision = null;
  decisionFlashTime = 0;

  $('sniper-view-panel').classList.add('open');
  document.body.classList.add('sniper-panel-open');

  setTimeout(() => {
    initScene();
    animHandle = startAnimLoop(animate);
    if (cesiumViewer) cesiumViewer.resize();
  }, 400);
}

export function closeSniperView(cesiumViewer) {
  viewOpen = false;
  $('sniper-view-panel').classList.remove('open');
  document.body.classList.remove('sniper-panel-open');

  if (animHandle) { animHandle.stop(); animHandle = null; }
  if (renderer) {
    renderer.dispose();
    const container = $('sniper-3d-container');
    if (container) container.innerHTML = '';
    renderer = null;
  }
  scene = null; camera = null;
  scopeCanvas = null; scopeCtx = null;

  setTimeout(() => (cesiumViewer || storedViewer)?.resize(), 400);
}

function handleNotification(msg) {
  if (msg.action === 'FIRE') {
    shotFired = true;
    shotTime = clock ? clock.getElapsedTime() : 0;
    lastDecision = 'FIRE';
    decisionFlashTime = 3.0;
  } else if (msg.action === 'ABORT') {
    lastDecision = 'ABORT';
    decisionFlashTime = 3.0;
  } else {
    lastDecision = msg.action;
    decisionFlashTime = 2.0;
  }

  const aiPanel = $('sniper-ai-panel');
  const aiText = $('sniper-ai-text');
  if (aiPanel) aiPanel.style.display = 'block';
  if (aiText) aiText.textContent = msg.reasoning || msg.action;
}

// Expose close for HTML onclick
window.closeSniperView = () => closeSniperView(storedViewer);

// Register with view system
registerView('sniper', {
  open: openSniperView,
  close: closeSniperView,
  isOpen: isSniperViewOpen,
  resize: resizeSniperView,
  notify: handleNotification,
  tick(progress, tick, totalTicks) {
    tickMode = 'sync';
    targetPhase = Math.min(tick / totalTicks, 1.0);
  },
});

// =====================================================
// THREE.JS SCENE
// =====================================================
function initScene() {
  const container = $('sniper-3d-container');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) {
    // Container not yet sized (CSS transition in progress) — retry
    setTimeout(initScene, 100);
    return;
  }

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(rect.width, rect.height);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.8;
  container.appendChild(renderer.domElement);

  // Scope overlay canvas (positioned over Three.js)
  scopeCanvas = document.createElement('canvas');
  scopeCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2';
  scopeCanvas.width = rect.width * devicePixelRatio;
  scopeCanvas.height = rect.height * devicePixelRatio;
  container.appendChild(scopeCanvas);
  scopeCtx = scopeCanvas.getContext('2d');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1a);

  // Narrow FOV = scope magnification (~10x)
  camera = new THREE.PerspectiveCamera(8, rect.width / rect.height, 0.1, 200);
  camera.position.set(0, 2.2, -30);
  clock = new THREE.Clock();

  buildRoom();
  buildFurniture();
  buildWindowFrame();

  targetGroup = buildHumanoid();
  targetGroup.position.set(3.5, 0, 5.0);
  scene.add(targetGroup);

  // Point camera at room center — without this it defaults to -z (away from room)
  camera.lookAt(0, 1.5, 2);
}

// =====================================================
// ROOM
// =====================================================
function buildRoom() {
  const floorMat  = new THREE.MeshStandardMaterial({ color: 0x3a2820, roughness: 0.85 });
  const wallMat   = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9 });
  const ceilMat   = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.9 });
  const dblSide   = THREE.DoubleSide;

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 3);
  floor.receiveShadow = true;
  scene.add(floor);

  // Back wall (z=6)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), wallMat);
  back.position.set(0, 1.5, 6);
  back.rotation.y = Math.PI;
  scene.add(back);

  // Left wall (x=-4)
  const left = new THREE.Mesh(new THREE.PlaneGeometry(6, 3, 1, 1), wallMat);
  left.position.set(-4, 1.5, 3);
  left.rotation.y = Math.PI / 2;
  scene.add(left);

  // Right wall (x=4)
  const right = new THREE.Mesh(new THREE.PlaneGeometry(6, 3, 1, 1), wallMat);
  right.position.set(4, 1.5, 3);
  right.rotation.y = -Math.PI / 2;
  scene.add(right);

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3, 3);
  scene.add(ceil);

  // Front wall with window opening (z=0)
  // Window: x=-1.3..1.3, y=0.6..2.6
  const ext = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.7, side: dblSide });
  const add = (w, h, x, y) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.25), ext);
    m.position.set(x, y, 0);
    scene.add(m);
  };
  add(8, 0.4, 0, 2.8);            // top strip
  add(8, 0.6, 0, 0.3);            // bottom strip
  add(2.7, 2.0, -2.65, 1.6);      // left strip
  add(2.7, 2.0,  2.65, 1.6);      // right strip

  // Rug
  const rugMat = new THREE.MeshStandardMaterial({ color: 0x6b3420, roughness: 0.95 });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.005, 2.5);
  scene.add(rug);

  // === Lighting ===
  // Ceiling light (warm interior)
  const roomLight = new THREE.PointLight(0xffe4b5, 3.0, 20);
  roomLight.position.set(0, 2.85, 3);
  roomLight.castShadow = true;
  roomLight.shadow.mapSize.setScalar(512);
  scene.add(roomLight);

  // Desk lamp accent
  const deskLight = new THREE.PointLight(0xffd080, 1.5, 8);
  deskLight.position.set(2.0, 1.3, 3.2);
  scene.add(deskLight);

  // Ambient fill
  scene.add(new THREE.AmbientLight(0x404060, 1.0));
}

// =====================================================
// FURNITURE
// =====================================================
function buildFurniture() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.7 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.8 });

  // Desk
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.8), wood);
  deskTop.position.set(1.5, 0.75, 3.5);
  deskTop.castShadow = true;
  scene.add(deskTop);

  const legGeo = new THREE.BoxGeometry(0.05, 0.75, 0.05);
  [[-0.7, -0.35], [-0.7, 0.35], [0.7, -0.35], [0.7, 0.35]].forEach(([dx, dz]) => {
    const leg = new THREE.Mesh(legGeo, wood);
    leg.position.set(1.5 + dx, 0.375, 3.5 + dz);
    scene.add(leg);
  });

  // Chair
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.45), wood);
  seat.position.set(1.5, 0.45, 2.8);
  scene.add(seat);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.04), wood);
  chairBack.position.set(1.5, 0.72, 2.58);
  scene.add(chairBack);
  // Chair legs
  const cLeg = new THREE.BoxGeometry(0.035, 0.45, 0.035);
  [[-0.22, -0.18], [-0.22, 0.18], [0.22, -0.18], [0.22, 0.18]].forEach(([dx, dz]) => {
    const l = new THREE.Mesh(cLeg, wood);
    l.position.set(1.5 + dx, 0.225, 2.8 + dz);
    scene.add(l);
  });

  // Bookshelf against back wall
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.8 });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.35), shelfMat);
  shelf.position.set(-2.5, 1.1, 5.8);
  scene.add(shelf);

  // Books (simplified rows)
  const bookColors = [0x8b0000, 0x006400, 0x00008b, 0x8b8000, 0x4b0082, 0x8b4513];
  for (let row = 0; row < 4; row++) {
    let bx = -3.3;
    for (let i = 0; i < 5; i++) {
      const w = 0.08 + Math.random() * 0.06;
      const h = 0.28 + Math.random() * 0.12;
      const bm = new THREE.MeshStandardMaterial({ color: bookColors[i % bookColors.length], roughness: 0.9 });
      const book = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.18), bm);
      book.position.set(bx + w / 2, 0.28 + row * 0.5 + h / 2, 5.72);
      scene.add(book);
      bx += w + 0.02;
    }
  }

  // Desk lamp
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.02, 8), metal);
  base.position.set(2.0, 0.78, 3.2);
  scene.add(base);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), metal);
  arm.position.set(2.0, 0.98, 3.2);
  scene.add(arm);
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.1, 8, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.6, side: THREE.DoubleSide })
  );
  shade.position.set(2.0, 1.2, 3.2);
  shade.rotation.x = Math.PI;
  scene.add(shade);

  // Picture frame on back wall
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.5 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.03), frameMat);
  frame.position.set(1.0, 2.0, 5.97);
  scene.add(frame);
  const pic = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.5, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.8 })
  );
  pic.position.set(1.0, 2.0, 5.95);
  scene.add(pic);

  // Curtains at window edges
  const curtainMat = new THREE.MeshStandardMaterial({ color: 0x4a3530, roughness: 0.9, side: THREE.DoubleSide });
  const lCurtain = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.9, 0.04), curtainMat);
  lCurtain.position.set(-1.15, 1.6, 0.1);
  scene.add(lCurtain);
  const rCurtain = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.9, 0.04), curtainMat);
  rCurtain.position.set(1.15, 1.6, 0.1);
  scene.add(rCurtain);
}

// =====================================================
// WINDOW FRAME
// =====================================================
function buildWindowFrame() {
  const fm = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.5, side: THREE.DoubleSide });
  const fw = 0.06;

  const addFrame = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    scene.add(m);
  };

  // Top
  addFrame(new THREE.BoxGeometry(2.6 + fw * 2, fw, 0.08), fm, 0, 2.6 + fw / 2, -0.04);
  // Bottom (sill)
  const sillMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.6 });
  addFrame(new THREE.BoxGeometry(2.8, 0.05, 0.15), sillMat, 0, 0.58, -0.07);
  // Left
  addFrame(new THREE.BoxGeometry(fw, 2.0, 0.08), fm, -1.3 - fw / 2, 1.6, -0.04);
  // Right
  addFrame(new THREE.BoxGeometry(fw, 2.0, 0.08), fm, 1.3 + fw / 2, 1.6, -0.04);
}

// =====================================================
// HUMANOID FIGURE
// =====================================================
function buildHumanoid() {
  const person = new THREE.Group();

  // Materials
  const skin  = new THREE.MeshStandardMaterial({ color: 0xc4956a, roughness: 0.8 });
  const hair  = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.9 });
  const suit  = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.7 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x252530, roughness: 0.6 });
  const shoe  = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5 });

  // Proportions
  const HEAD_R = 0.11;
  const NECK_H = 0.06;
  const TORSO_H = 0.50;
  const TORSO_W = 0.36;
  const TORSO_D = 0.20;
  const U_ARM = 0.26;
  const F_ARM = 0.24;
  const ARM_R = 0.04;
  const U_LEG = 0.40;
  const L_LEG = 0.38;
  const LEG_R = 0.055;
  const FOOT_H = 0.04;

  // Vertical positions
  const ANKLE_Y    = FOOT_H;
  const KNEE_Y     = ANKLE_Y + L_LEG;
  const HIP_Y      = KNEE_Y + U_LEG;
  const SHOULDER_Y = HIP_Y + TORSO_H;
  const NECK_Y     = SHOULDER_Y + NECK_H;
  const HEAD_Y     = NECK_Y + HEAD_R;

  // Head
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 12, 10), skin);
  headMesh.scale.set(1, 1.12, 0.95);
  headMesh.position.y = HEAD_Y;
  headMesh.castShadow = true;
  person.add(headMesh);

  // Hair cap
  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(HEAD_R * 1.05, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hair
  );
  hairMesh.position.y = HEAD_Y + 0.01;
  hairMesh.scale.set(1, 1.08, 0.95);
  person.add(hairMesh);

  // Ears
  [-1, 1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), skin);
    ear.position.set(s * HEAD_R * 0.95, HEAD_Y - 0.02, 0);
    ear.scale.set(0.5, 0.8, 0.6);
    person.add(ear);
  });

  // Neck
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, NECK_H, 8), skin);
  neckMesh.position.y = SHOULDER_Y + NECK_H / 2;
  person.add(neckMesh);

  // Torso (suit jacket)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(TORSO_W, TORSO_H, TORSO_D), suit);
  torso.position.y = HIP_Y + TORSO_H / 2;
  torso.castShadow = true;
  person.add(torso);

  // Shirt collar
  const collar = new THREE.Mesh(new THREE.BoxGeometry(TORSO_W * 0.45, 0.04, TORSO_D * 0.6), shirt);
  collar.position.y = SHOULDER_Y;
  person.add(collar);

  // Lapels (suit detail — thin wedges on torso front)
  [-1, 1].forEach(s => {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.01), suit);
    lapel.position.set(s * 0.07, HIP_Y + TORSO_H - 0.12, -TORSO_D / 2 - 0.005);
    lapel.rotation.z = s * 0.15;
    person.add(lapel);
  });

  // === ARMS ===
  [-1, 1].forEach(side => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.userData = { joint: 'shoulder', side: side < 0 ? 'left' : 'right' };
    shoulderPivot.position.set(side * (TORSO_W / 2 + ARM_R), SHOULDER_Y - 0.02, 0);
    person.add(shoulderPivot);

    // Upper arm (suit sleeve)
    const uArm = new THREE.Mesh(new THREE.CapsuleGeometry(ARM_R, U_ARM, 4, 8), suit);
    uArm.position.y = -U_ARM / 2;
    shoulderPivot.add(uArm);

    // Elbow pivot
    const elbowPivot = new THREE.Group();
    elbowPivot.userData = { joint: 'elbow', side: side < 0 ? 'left' : 'right' };
    elbowPivot.position.y = -U_ARM;
    shoulderPivot.add(elbowPivot);

    // Forearm (shirt cuff / skin)
    const fArm = new THREE.Mesh(new THREE.CapsuleGeometry(ARM_R * 0.9, F_ARM, 4, 8), skin);
    fArm.position.y = -F_ARM / 2;
    elbowPivot.add(fArm);

    // Hand
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), skin);
    hand.position.y = -F_ARM;
    elbowPivot.add(hand);
  });

  // === LEGS ===
  [-1, 1].forEach(side => {
    const hipPivot = new THREE.Group();
    hipPivot.userData = { joint: 'hip', side: side < 0 ? 'left' : 'right' };
    hipPivot.position.set(side * 0.08, HIP_Y, 0);
    person.add(hipPivot);

    // Thigh
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(LEG_R, U_LEG, 4, 8), pants);
    thigh.position.y = -U_LEG / 2;
    hipPivot.add(thigh);

    // Knee pivot
    const kneePivot = new THREE.Group();
    kneePivot.userData = { joint: 'knee', side: side < 0 ? 'left' : 'right' };
    kneePivot.position.y = -U_LEG;
    hipPivot.add(kneePivot);

    // Shin
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(LEG_R * 0.85, L_LEG, 4, 8), pants);
    shin.position.y = -L_LEG / 2;
    kneePivot.add(shin);

    // Foot
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, FOOT_H, 0.16), shoe);
    foot.position.set(0, -L_LEG - FOOT_H / 2, 0.03);
    kneePivot.add(foot);
  });

  return person;
}

// =====================================================
// TARGET POSITION INTERPOLATION
// =====================================================
function getTargetPos(phase) {
  const p = TARGET_PATH;
  let i = 0;
  for (; i < p.length - 1; i++) {
    if (phase >= p[i].t && phase <= p[i + 1].t) break;
  }
  if (i >= p.length - 1) i = p.length - 2;

  const a = p[i], b = p[i + 1];
  const lt = (phase - a.t) / (b.t - a.t);
  const st = lt * lt * (3 - 2 * lt); // smoothstep

  const dx = Math.abs(b.x - a.x), dz = Math.abs(b.z - a.z);
  return {
    x: a.x + (b.x - a.x) * st,
    z: a.z + (b.z - a.z) * st,
    facing: a.facing + (b.facing - a.facing) * st,
    isMoving: (dx + dz) > 0.3,
  };
}

// =====================================================
// HUMANOID ANIMATION
// =====================================================
function animateHumanoid(figure, elapsed, isMoving) {
  figure.traverse(child => {
    const j = child.userData?.joint;
    if (!j) return;
    const s = child.userData.side === 'left' ? 1 : -1;

    if (isMoving) {
      const freq = 4.5;
      if (j === 'hip') {
        child.rotation.x = Math.sin(elapsed * freq) * 0.45 * s;
      } else if (j === 'knee') {
        const hipSwing = Math.sin(elapsed * freq) * s;
        child.rotation.x = Math.max(0, hipSwing) * 0.7;
      } else if (j === 'shoulder') {
        child.rotation.x = Math.sin(elapsed * freq + Math.PI) * 0.3 * s;
      } else if (j === 'elbow') {
        child.rotation.x = -0.2 - Math.abs(Math.sin(elapsed * freq + Math.PI)) * 0.25;
      }
    } else {
      // Idle: subtle breathing / sway
      if (j === 'hip') child.rotation.x = Math.sin(elapsed * 1.2) * 0.008;
      else if (j === 'knee') child.rotation.x = 0;
      else if (j === 'shoulder') {
        child.rotation.x = Math.sin(elapsed * 0.7) * 0.015;
        child.rotation.z = Math.sin(elapsed * 0.5) * 0.008 * s;
      } else if (j === 'elbow') {
        child.rotation.x = -0.12;
      }
    }
  });

  // Body bob while walking
  if (isMoving) {
    figure.position.y = Math.abs(Math.sin(clock.getElapsedTime() * 9)) * 0.008;
  } else {
    figure.position.y = 0;
  }
}

// =====================================================
// MAIN ANIMATION LOOP
// =====================================================
function animate() {
  if (!renderer || !scene || !camera) return;
  const dt = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.getElapsedTime();
  breatheTime = elapsed;

  // Target path — only advance from clock in wallclock mode; tick-sync sets targetPhase externally
  if (tickMode === 'wallclock') {
    targetPhase = (elapsed / CYCLE_DURATION) % 1.0;
  }
  const pos = getTargetPos(targetPhase);
  targetGroup.position.x = pos.x;
  targetGroup.position.z = pos.z;
  targetGroup.rotation.y = pos.facing;
  animateHumanoid(targetGroup, elapsed, pos.isMoving);

  // Camera: breathing sway + atmospheric shimmer
  const bx = Math.sin(elapsed * 0.5) * 0.04 + Math.sin(elapsed * 1.3) * 0.012;
  const by = Math.sin(elapsed * 0.7 + 1.5) * 0.025 + Math.sin(elapsed * 1.1 + 0.7) * 0.008;
  // High-freq shimmer
  const sx = Math.sin(elapsed * 13.7) * 0.002 + Math.sin(elapsed * 17.3) * 0.001;
  const sy = Math.sin(elapsed * 11.1 + 2.5) * 0.0015;

  camera.position.set(bx + sx, 2.2 + by + sy, -30);

  // Shot recoil shake
  if (shotFired) {
    const since = elapsed - shotTime;
    if (since < 0.6) {
      const mag = Math.exp(-since * 10) * 0.12;
      camera.position.x += Math.sin(since * 50) * mag;
      camera.position.y += Math.cos(since * 60) * mag;
    }
  }

  camera.lookAt(0, 1.5, 2);

  renderer.render(scene, camera);

  // Scope overlay
  if (scopeCtx && scopeCanvas) {
    drawScopeOverlay(scopeCtx, scopeCanvas.width, scopeCanvas.height, elapsed);
  }

  // HUD
  updateTargetHUD(pos);
  if (decisionFlashTime > 0) decisionFlashTime -= dt;
}

// =====================================================
// SCOPE OVERLAY (2D Canvas)
// =====================================================
function drawScopeOverlay(ctx, W, H, elapsed) {
  const dpr = devicePixelRatio;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const scopeR = Math.min(W, H) * 0.44;

  // 1. Black mask outside scope circle
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, scopeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // 2. Vignette at scope edges
  const vig = ctx.createRadialGradient(cx, cy, scopeR * 0.65, cx, cy, scopeR);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig;
  ctx.beginPath();
  ctx.arc(cx, cy, scopeR, 0, Math.PI * 2);
  ctx.fill();

  // 3. Scope ring
  ctx.strokeStyle = 'rgba(25, 25, 25, 0.9)';
  ctx.lineWidth = 3 * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, scopeR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(50, 50, 50, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, scopeR - 3 * dpr, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Crosshairs
  const crossCol = 'rgba(0, 0, 0, 0.5)';
  const crossLen = scopeR * 0.85;
  const gap = scopeR * 0.035;
  ctx.strokeStyle = crossCol;
  ctx.lineWidth = 1.2 * dpr;

  // Horizontal
  ctx.beginPath(); ctx.moveTo(cx - crossLen, cy); ctx.lineTo(cx - gap, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + crossLen, cy); ctx.stroke();
  // Vertical
  ctx.beginPath(); ctx.moveTo(cx, cy - crossLen); ctx.lineTo(cx, cy - gap); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + crossLen); ctx.stroke();

  // 5. Mil-dots
  const milSp = scopeR * 0.12;
  ctx.fillStyle = crossCol;
  for (let i = 1; i <= 5; i++) {
    const r = 2.2 * dpr;
    [[cx + i * milSp, cy], [cx - i * milSp, cy],
     [cx, cy - i * milSp], [cx, cy + i * milSp]].forEach(([px, py]) => {
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    });
  }

  // 6. Hash marks at 2-mil and 4-mil below center
  ctx.strokeStyle = crossCol;
  ctx.lineWidth = 1.5 * dpr;
  [2, 4].forEach(i => {
    const hl = 5 * dpr;
    ctx.beginPath();
    ctx.moveTo(cx - hl, cy + i * milSp);
    ctx.lineTo(cx + hl, cy + i * milSp);
    ctx.stroke();
  });

  // 7. Range/wind readout (inside scope, top corners)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, scopeR - 4, 0, Math.PI * 2);
  ctx.clip();

  const fs = 10 * dpr;
  ctx.font = `${fs}px 'Courier New', monospace`;
  ctx.fillStyle = 'rgba(180, 40, 40, 0.65)';
  const tx = cx - scopeR * 0.58;
  const ty = cy - scopeR * 0.78;
  ctx.fillText('RNG  220m', tx, ty);
  ctx.fillText('WIND 3 NE', tx, ty + fs * 1.4);
  ctx.fillText('ELEV +2.1\u00B0', tx, ty + fs * 2.8);

  ctx.fillStyle = 'rgba(180, 180, 180, 0.3)';
  const rx = cx + scopeR * 0.25;
  ctx.fillText('0.5 MOA R', rx, ty);
  ctx.fillText('BDC AUTO', rx, ty + fs * 1.4);

  ctx.restore();

  // 8. Shot flash
  if (shotFired && decisionFlashTime > 1.5) {
    const a = Math.min(1, (decisionFlashTime - 1.5) * 3);
    ctx.fillStyle = `rgba(255, 255, 200, ${a * 0.35})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 9. Decision indicator
  if (decisionFlashTime > 0 && lastDecision) {
    const a = Math.min(1, decisionFlashTime * 0.8);
    let color, text;
    switch (lastDecision) {
      case 'FIRE':            color = `rgba(255, 50, 50, ${a})`; text = 'SHOT FIRED'; break;
      case 'HOLD':            color = `rgba(0, 255, 65, ${a})`;  text = 'HOLD FIRE'; break;
      case 'ABORT':           color = `rgba(255, 170, 0, ${a})`; text = 'MISSION ABORT'; break;
      case 'REQUEST_CONFIRM': color = `rgba(100, 150, 255, ${a})`; text = 'CONFIRMING ID'; break;
      default:                color = `rgba(200, 200, 200, ${a})`; text = lastDecision;
    }
    const bf = 16 * dpr;
    ctx.font = `bold ${bf}px 'Courier New', monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, cx, cy + scopeR + 28 * dpr);
    ctx.textAlign = 'left';
  }
}

// =====================================================
// HUD
// =====================================================
function updateTargetHUD(pos) {
  const el = $('sniper-target-status');
  if (!el) return;
  if (pos.z < 1.2) {
    el.textContent = 'TARGET EXPOSED \u2014 CLEAR SIGHT PICTURE';
    el.style.color = '#ff4444';
  } else if (pos.z < 2.5) {
    el.textContent = 'TARGET VISIBLE \u2014 PARTIAL VIEW';
    el.style.color = '#ffaa00';
  } else {
    el.textContent = 'TARGET IN ROOM \u2014 OBSCURED';
    el.style.color = '#666';
  }
}
