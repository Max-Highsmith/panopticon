/* ===================================================================
   PANOPTICON — Airport View (schedule + aerial Cesium viewer)
   Top: procedural flight schedule display (FIDS style)
   Bottom: overhead aerial view with Google 3D Tiles
   =================================================================== */

import { $ } from './utils.js';

let airportViewer = null;
let airportViewOpen = false;
let airportViewTarget = null;
let overlayAnimFrame = null;
let scheduleAnimFrame = null;
let lastAirportData = null;
let generatedSchedule = null;

export function isAirportViewOpen() { return airportViewOpen; }
export function resizeAirportView() { if (airportViewer) airportViewer.resize(); }

const HUD_COLOR = 'rgba(0, 204, 255, ';
const HUD_ACCENT = '#00ccff';

// --- Extract position from a Cesium entity ---
function getEntityPosition(entity) {
  if (!entity) return null;
  let pos = entity.position;
  if (!pos) return null;
  if (typeof pos.getValue === 'function') pos = pos.getValue(Cesium.JulianDate.now());
  if (!pos) return null;
  const carto = Cesium.Cartographic.fromCartesian(pos);
  return {
    lon: Cesium.Math.toDegrees(carto.longitude),
    lat: Cesium.Math.toDegrees(carto.latitude),
    altM: carto.height,
  };
}

// --- Metadata extraction ---
function extractCountry(desc) {
  if (!desc) return '---';
  return desc.split(' // ')[1]?.trim() || '---';
}

// --- Second Cesium Viewer for aerial imagery ---
function initAirportViewer() {
  if (airportViewer) return;
  airportViewer = new Cesium.Viewer('airport-view-container', {
    geocoder: false, homeButton: false, sceneModePicker: false,
    baseLayerPicker: false, navigationHelpButton: false,
    animation: false, timeline: false, fullscreenButton: false,
    selectionIndicator: false, infoBox: false, scene3DOnly: true,
    imageryProvider: false,
  });
  airportViewer.scene.backgroundColor = Cesium.Color.BLACK;
  airportViewer.imageryLayers.addImageryProvider(
    new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })
  );
  airportViewer.scene.screenSpaceCameraController.enableInputs = true;
  (async () => {
    try {
      const tileset = await Cesium.createGooglePhotorealistic3DTileset();
      airportViewer.scene.primitives.add(tileset);
      airportViewer.scene.globe.show = false;
    } catch {
      console.log('Airport view: Google 3D Tiles not available, using OSM.');
    }
  })();
}

// --- Camera: overhead view of the airport ---
function setAirportCamera(posInfo) {
  if (!airportViewer || !posInfo) return;
  airportViewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(posInfo.lon, posInfo.lat, 2500),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-60),
      roll: 0,
    },
  });
}

// =====================================================
// PROCEDURAL FLIGHT SCHEDULE GENERATOR
// =====================================================

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const AIRLINES = [
  'AA', 'UA', 'DL', 'BA', 'LH', 'AF', 'KL', 'EK', 'QR', 'SQ',
  'CX', 'JL', 'NH', 'TK', 'EY', 'QF', 'AC', 'LX', 'OS', 'IB',
  'AZ', 'SK', 'TP', 'MS', 'RJ', 'SV', 'WY', 'GF', 'KU', 'PK',
  'AI', 'CI', 'BR', 'MH', 'TG', 'GA', 'PR', 'OZ', 'KE', 'CA',
];

const DESTINATIONS = [
  'JFK', 'LAX', 'LHR', 'CDG', 'FRA', 'DXB', 'SIN', 'HND', 'ICN', 'HKG',
  'SYD', 'DOH', 'IST', 'AMS', 'MAD', 'FCO', 'MUC', 'ZRH', 'BKK', 'KUL',
  'DEL', 'BOM', 'PEK', 'PVG', 'NRT', 'MNL', 'CGK', 'GRU', 'MEX', 'EZE',
  'JNB', 'CAI', 'ADD', 'NBO', 'CMN', 'CPT', 'ATL', 'ORD', 'DFW', 'MIA',
  'SFO', 'SEA', 'YYZ', 'YVR', 'LIS', 'VIE', 'WAW', 'PRG', 'HEL', 'ARN',
];

const STATUSES = ['ON TIME', 'ON TIME', 'ON TIME', 'ON TIME', 'BOARDING', 'DELAYED', 'DEPARTED', 'ARRIVED', 'FINAL CALL', 'CANCELLED', 'GATE CLOSED', 'EN ROUTE'];
const GATES = ['A1', 'A3', 'A5', 'A7', 'B2', 'B4', 'B6', 'B8', 'C1', 'C3', 'C5', 'C9', 'D2', 'D4', 'D6', 'E1', 'E3', 'E5', 'F2', 'F4'];

function generateSchedule(icao, name) {
  const rng = seededRandom(hashName(icao + name));
  const isLarge = name.toLowerCase().includes('international') || icao.length === 4;
  const numFlights = isLarge ? 20 : 12;
  const flights = [];

  // Base hour from current time
  const now = new Date();
  const baseHour = now.getUTCHours();

  for (let i = 0; i < numFlights; i++) {
    const airline = AIRLINES[Math.floor(rng() * AIRLINES.length)];
    const flightNum = 100 + Math.floor(rng() * 900);
    const dest = DESTINATIONS[Math.floor(rng() * DESTINATIONS.length)];
    const gate = GATES[Math.floor(rng() * GATES.length)];
    const isDep = rng() > 0.4; // 60% departures
    const hourOffset = Math.floor(i * 1.2); // spread across hours
    const hour = (baseHour + hourOffset) % 24;
    const minute = Math.floor(rng() * 12) * 5; // 5-min intervals

    let status;
    if (hourOffset < 1) {
      status = isDep
        ? (rng() > 0.5 ? 'BOARDING' : 'FINAL CALL')
        : 'ARRIVED';
    } else if (hourOffset < 3) {
      const r = rng();
      if (r < 0.1) status = 'DELAYED';
      else if (r < 0.15) status = 'CANCELLED';
      else status = 'ON TIME';
    } else {
      status = 'ON TIME';
    }

    flights.push({
      flight: airline + flightNum,
      dest,
      time: String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0'),
      gate,
      type: isDep ? 'DEP' : 'ARR',
      status,
    });
  }

  return flights;
}

// =====================================================
// SCHEDULE CANVAS RENDERING (top panel — FIDS style)
// =====================================================

let scheduleScroll = 0;

function renderScheduleCanvas() {
  const canvas = $('airport-schedule-canvas');
  if (!canvas) return;

  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;

  ctx.fillStyle = '#000a14';
  ctx.fillRect(0, 0, W, H);

  const d = lastAirportData;
  if (!d || !generatedSchedule) return;

  // Header bar
  const headerH = 28;
  ctx.fillStyle = 'rgba(0, 204, 255, 0.08)';
  ctx.fillRect(0, 0, W, headerH);
  ctx.strokeStyle = 'rgba(0, 204, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(W, headerH);
  ctx.stroke();

  // Airport name + ICAO in header
  ctx.font = 'bold 11px Courier New';
  ctx.fillStyle = HUD_ACCENT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('FLIGHT INFORMATION DISPLAY // ' + (d.icao || '---'), 12, headerH / 2);

  // Current time
  const now = new Date();
  const utcStr = now.toISOString().substring(11, 19) + ' UTC';
  ctx.textAlign = 'right';
  ctx.font = '10px Courier New';
  ctx.fillStyle = HUD_COLOR + '0.6)';
  ctx.fillText(utcStr, W - 12, headerH / 2);

  // Column headers
  const colY = headerH + 4;
  const rowH = 18;
  const cols = { time: 12, flight: 70, type: 140, dest: 175, gate: 230, status: 280 };

  ctx.font = '9px Courier New';
  ctx.fillStyle = HUD_COLOR + '0.35)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('TIME', cols.time, colY);
  ctx.fillText('FLIGHT', cols.flight, colY);
  ctx.fillText('D/A', cols.type, colY);
  ctx.fillText('DEST', cols.dest, colY);
  ctx.fillText('GATE', cols.gate, colY);
  ctx.fillText('STATUS', cols.status, colY);

  // Separator
  ctx.strokeStyle = HUD_COLOR + '0.1)';
  ctx.beginPath();
  ctx.moveTo(8, colY + 13);
  ctx.lineTo(W - 8, colY + 13);
  ctx.stroke();

  // Flight rows
  const startY = colY + 16;
  const maxVisible = Math.floor((H - startY) / rowH);
  // Slow auto-scroll
  scheduleScroll = (Date.now() / 80) % (generatedSchedule.length * rowH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, startY, W, H - startY);
  ctx.clip();

  for (let i = 0; i < generatedSchedule.length; i++) {
    const f = generatedSchedule[i];
    const y = startY + i * rowH - (scheduleScroll % (generatedSchedule.length * rowH));
    // Wrap around
    const yWrapped = y < startY - rowH
      ? y + generatedSchedule.length * rowH
      : y;

    if (yWrapped < startY - rowH || yWrapped > H + rowH) continue;

    // Alternate row shading
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(0, 204, 255, 0.02)';
      ctx.fillRect(0, yWrapped, W, rowH);
    }

    ctx.font = '10px Courier New';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // Time
    ctx.fillStyle = HUD_COLOR + '0.7)';
    ctx.fillText(f.time, cols.time, yWrapped + 3);

    // Flight number
    ctx.fillStyle = HUD_ACCENT;
    ctx.fillText(f.flight, cols.flight, yWrapped + 3);

    // Type (DEP/ARR)
    ctx.fillStyle = f.type === 'DEP'
      ? 'rgba(0, 255, 100, 0.7)'
      : 'rgba(255, 170, 0, 0.7)';
    ctx.fillText(f.type, cols.type, yWrapped + 3);

    // Destination
    ctx.fillStyle = HUD_COLOR + '0.7)';
    ctx.fillText(f.dest, cols.dest, yWrapped + 3);

    // Gate
    ctx.fillStyle = HUD_COLOR + '0.5)';
    ctx.fillText(f.gate, cols.gate, yWrapped + 3);

    // Status
    let statusColor;
    switch (f.status) {
      case 'ON TIME':    statusColor = 'rgba(0, 255, 100, 0.7)'; break;
      case 'BOARDING':
      case 'FINAL CALL': statusColor = 'rgba(255, 255, 0, 0.8)'; break;
      case 'DELAYED':    statusColor = 'rgba(255, 100, 0, 0.8)'; break;
      case 'CANCELLED':  statusColor = 'rgba(255, 50, 50, 0.8)'; break;
      case 'DEPARTED':
      case 'ARRIVED':    statusColor = HUD_COLOR + '0.5)'; break;
      default:           statusColor = HUD_COLOR + '0.6)'; break;
    }
    ctx.fillStyle = statusColor;
    ctx.fillText(f.status, cols.status, yWrapped + 3);
  }

  ctx.restore();

  // Scanline effect
  const scanY = (Date.now() / 40) % H;
  const scanGrad = ctx.createLinearGradient(0, scanY - 10, 0, scanY + 10);
  scanGrad.addColorStop(0, 'rgba(0, 204, 255, 0)');
  scanGrad.addColorStop(0.5, 'rgba(0, 204, 255, 0.03)');
  scanGrad.addColorStop(1, 'rgba(0, 204, 255, 0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 10, W, 20);

  // Subtle border glow
  ctx.strokeStyle = HUD_COLOR + '0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, W, H);
}

function startScheduleLoop() {
  if (scheduleAnimFrame) return;
  function loop() {
    scheduleAnimFrame = requestAnimationFrame(loop);
    renderScheduleCanvas();
  }
  loop();
}

function stopScheduleLoop() {
  if (scheduleAnimFrame) {
    cancelAnimationFrame(scheduleAnimFrame);
    scheduleAnimFrame = null;
  }
}

// =====================================================
// AERIAL VIEW HUD OVERLAY
// =====================================================

function startOverlayLoop() {
  if (overlayAnimFrame) return;
  function loop() {
    overlayAnimFrame = requestAnimationFrame(loop);
    renderAirportOverlay();
  }
  loop();
}

function stopOverlayLoop() {
  if (overlayAnimFrame) {
    cancelAnimationFrame(overlayAnimFrame);
    overlayAnimFrame = null;
  }
}

function renderAirportOverlay() {
  const canvas = $('airport-view-overlay');
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;

  const rect = parent.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = rect.width, H = rect.height;

  ctx.clearRect(0, 0, W, H);

  // Vignette
  const vigGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(0.7, 'rgba(0,0,0,0.1)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, W, H);

  // Scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  // Moving scan line
  const scanY = (Date.now() / 25) % H;
  const scanGrad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
  scanGrad.addColorStop(0, 'rgba(0, 204, 255, 0)');
  scanGrad.addColorStop(0.5, 'rgba(0, 204, 255, 0.04)');
  scanGrad.addColorStop(1, 'rgba(0, 204, 255, 0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 15, W, 30);

  // Corner brackets
  const bracketLen = 30, bracketInset = 20;
  ctx.strokeStyle = HUD_COLOR + '0.35)';
  ctx.lineWidth = 1.5;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(bracketInset, bracketInset + bracketLen);
  ctx.lineTo(bracketInset, bracketInset);
  ctx.lineTo(bracketInset + bracketLen, bracketInset);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(W - bracketInset - bracketLen, bracketInset);
  ctx.lineTo(W - bracketInset, bracketInset);
  ctx.lineTo(W - bracketInset, bracketInset + bracketLen);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(bracketInset, H - bracketInset - bracketLen);
  ctx.lineTo(bracketInset, H - bracketInset);
  ctx.lineTo(bracketInset + bracketLen, H - bracketInset);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(W - bracketInset - bracketLen, H - bracketInset);
  ctx.lineTo(W - bracketInset, H - bracketInset);
  ctx.lineTo(W - bracketInset, H - bracketInset - bracketLen);
  ctx.stroke();

  // Data readouts
  const d = lastAirportData;
  if (!d) return;

  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  ctx.font = '10px Courier New';
  ctx.textBaseline = 'bottom';

  // Top-left: Airport name
  ctx.fillStyle = HUD_COLOR + '0.7)';
  ctx.textAlign = 'left';
  ctx.fillText('AIRPORT: ' + (d.name || '---'), bracketInset + 2, bracketInset - 4);
  ctx.fillStyle = HUD_COLOR + '0.4)';
  ctx.fillText(d.icao || '---', bracketInset + 2, bracketInset - 16);

  // Top-right: AERIAL label (blinking)
  ctx.textAlign = 'right';
  ctx.fillStyle = (Math.floor(Date.now() / 800) % 2 === 0) ? HUD_COLOR + '0.8)' : HUD_COLOR + '0.3)';
  ctx.fillText('AERIAL VIEW', W - bracketInset - 2, bracketInset - 4);

  // Bottom readouts
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = HUD_COLOR + '0.65)';
  const bY = H - bracketInset + 6;
  ctx.fillText(timestamp, bracketInset + 2, bY);

  ctx.textAlign = 'right';
  ctx.fillText('LAT ' + d.lat.toFixed(4) + '\u00B0', W - bracketInset - 2, bY);
  ctx.fillText('LON ' + d.lon.toFixed(4) + '\u00B0', W - bracketInset - 2, bY + 13);

  // Center reticle (crosshair)
  const rcx = W / 2, rcy = H / 2;
  ctx.strokeStyle = HUD_COLOR + '0.2)';
  ctx.lineWidth = 1;
  // Horizontal
  ctx.beginPath();
  ctx.moveTo(rcx - 15, rcy);
  ctx.lineTo(rcx - 5, rcy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rcx + 5, rcy);
  ctx.lineTo(rcx + 15, rcy);
  ctx.stroke();
  // Vertical
  ctx.beginPath();
  ctx.moveTo(rcx, rcy - 15);
  ctx.lineTo(rcx, rcy - 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rcx, rcy + 5);
  ctx.lineTo(rcx, rcy + 15);
  ctx.stroke();
  // Center dot
  ctx.fillStyle = HUD_COLOR + '0.3)';
  ctx.beginPath(); ctx.arc(rcx, rcy, 2, 0, Math.PI * 2); ctx.fill();
}

// =====================================================
// OPEN / CLOSE
// =====================================================

export function openAirportView(viewer, entity) {
  if (!entity || !entity.acData) return;

  initAirportViewer();
  airportViewTarget = entity;
  airportViewOpen = true;

  const ac = entity.acData;

  $('airport-view-panel').classList.add('open');
  document.body.classList.add('airport-panel-open');

  // Populate stats bar
  $('apv-airport-name').textContent = (ac.r || ac.flight || '---').trim();
  $('apv-type').textContent = ac.t || '---';
  $('apv-country').textContent = extractCountry(ac.desc);
  $('apv-elev').textContent = (ac.alt_baro || 0) + ' FT';

  const posInfo = getEntityPosition(entity);
  const icao = ac.hex || '---';

  if (posInfo) {
    lastAirportData = {
      name: (ac.r || ac.flight || '---').trim(),
      icao,
      lat: posInfo.lat,
      lon: posInfo.lon,
    };
    $('apv-lat').textContent = posInfo.lat.toFixed(4) + '\u00B0';
    $('apv-lon').textContent = posInfo.lon.toFixed(4) + '\u00B0';
    setAirportCamera(posInfo);
  }

  // Generate schedule
  generatedSchedule = generateSchedule(icao, ac.r || '');
  scheduleScroll = 0;

  startScheduleLoop();
  startOverlayLoop();

  setTimeout(() => {
    viewer.resize();
    if (airportViewer) airportViewer.resize();
    const freshPos = getEntityPosition(entity);
    if (freshPos) {
      setAirportCamera(freshPos);
    }
  }, 400);
}

export function closeAirportView(viewer) {
  airportViewOpen = false;
  airportViewTarget = null;
  lastAirportData = null;
  generatedSchedule = null;
  $('airport-view-panel').classList.remove('open');
  document.body.classList.remove('airport-panel-open');

  stopScheduleLoop();
  stopOverlayLoop();

  setTimeout(() => viewer.resize(), 400);
}
