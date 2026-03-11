/* ===================================================================
   PANOPTICON — Webcam View Panel (HLS + YouTube Live Stream Embed)
   Side panel with live webcam feed. Prefers HLS via hls.js for a clean
   watermark-free feed; falls back to YouTube embed when no HLS URL.
   =================================================================== */

import { $ } from './utils.js';
import { startAnimLoop, setupOverlayCanvas } from './viewbase.js';
import { registerView } from './viewregistry.js';

let webcamViewOpen = false;
let webcamViewTarget = null;
let overlayHandle = null;
let videoOverlayHandle = null;
let hlsInstance = null;
let currentMode = null; // 'hls' | 'youtube'
let frameCounter = 0;
let surveillanceOn = true;

export function isWebcamViewOpen() { return webcamViewOpen; }
export function resizeWebcamView() { /* iframe/video auto-resizes */ }

const HUD_COLOR = 'rgba(0, 221, 255, ';
const HUD_ACCENT = '#00ddff';

// --- Canvas overlay: military-style info display ---

function renderInfoCanvas() {
  const canvas = $('webcam-info-canvas');
  if (!canvas || !webcamViewTarget) return;

  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const W = Math.round(rect.width * dpr);
  const H = Math.round(rect.height * dpr);
  if (W === 0 || H === 0) return;

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const w = rect.width;
  const h = rect.height;

  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  const ac = webcamViewTarget.acData;
  const now = new Date();

  // Scanlines
  ctx.strokeStyle = HUD_COLOR + '0.04)';
  ctx.lineWidth = 0.5;
  for (let y = 0; y < h; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Grid
  ctx.strokeStyle = HUD_COLOR + '0.08)';
  ctx.lineWidth = 0.5;
  const gridSpacing = 40;
  for (let x = 0; x < w; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Title
  ctx.font = 'bold 14px Courier New';
  ctx.fillStyle = HUD_ACCENT;
  ctx.textAlign = 'left';
  ctx.shadowColor = HUD_ACCENT;
  ctx.shadowBlur = 8;
  ctx.fillText('LIVE WEBCAM FEED', 16, 28);
  ctx.shadowBlur = 0;

  // Webcam name
  ctx.font = 'bold 18px Courier New';
  ctx.fillStyle = '#ffffff';
  ctx.fillText((ac.flight || '---').toUpperCase(), 16, 54);

  // Location
  ctx.font = '12px Courier New';
  ctx.fillStyle = HUD_COLOR + '0.7)';
  ctx.fillText(`${ac.city || '---'}, ${ac.country || '---'}`, 16, 74);

  // Coordinates
  ctx.font = '11px Courier New';
  ctx.fillStyle = HUD_COLOR + '0.5)';
  const lat = ac.lat != null ? ac.lat.toFixed(4) + '\u00B0' : '---';
  const lon = ac.lon != null ? ac.lon.toFixed(4) + '\u00B0' : '---';
  ctx.fillText(`LAT ${lat}  LON ${lon}`, 16, 96);

  // Timestamp
  ctx.textAlign = 'right';
  ctx.font = '10px Courier New';
  ctx.fillStyle = HUD_COLOR + '0.4)';
  const ts = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  ctx.fillText(ts, w - 16, 28);

  // Status indicator
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.fillStyle = `rgba(0, 255, 65, ${0.4 + pulse * 0.6})`;
  ctx.beginPath();
  ctx.arc(w - 16, 50, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '10px Courier New';
  ctx.fillStyle = HUD_COLOR + '0.6)';
  ctx.fillText('ACTIVE', w - 26, 54);

  // Source label
  ctx.textAlign = 'right';
  ctx.font = '9px Courier New';
  ctx.fillStyle = HUD_COLOR + '0.3)';
  const sourceLabel = currentMode === 'video' ? 'SOURCE: DIRECT FEED' : currentMode === 'hls' ? 'SOURCE: HLS STREAM' : 'SOURCE: YOUTUBE LIVE';
  ctx.fillText(sourceLabel, w - 16, 74);

  // Bottom border accent
  ctx.strokeStyle = HUD_ACCENT;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(0, h - 1);
  ctx.lineTo(w, h - 1);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// --- Canvas overlay: spy-movie surveillance HUD on top of video feed ---

function renderVideoOverlay() {
  if (!surveillanceOn) return;
  const canvas = $('webcam-video-overlay');
  const setup = setupOverlayCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;
  frameCounter++;

  ctx.clearRect(0, 0, W, H);

  const ac = webcamViewTarget?.acData;
  const now = new Date();
  const t = Date.now();

  // --- Vignette (dark edges) ---
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.6, 'rgba(0,0,0,0.08)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // --- Scanlines ---
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);

  // --- Moving scan bar ---
  const scanY = (t / 30) % H;
  const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
  scanGrad.addColorStop(0, 'rgba(0,255,65,0)');
  scanGrad.addColorStop(0.5, 'rgba(0,255,65,0.06)');
  scanGrad.addColorStop(1, 'rgba(0,255,65,0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 20, W, 40);

  // --- Corner brackets ---
  const bLen = Math.min(40, W * 0.08);
  const bInset = 14;
  ctx.strokeStyle = 'rgba(0,255,65,0.5)';
  ctx.lineWidth = 1.5;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(bInset, bInset + bLen); ctx.lineTo(bInset, bInset); ctx.lineTo(bInset + bLen, bInset);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(W - bInset - bLen, bInset); ctx.lineTo(W - bInset, bInset); ctx.lineTo(W - bInset, bInset + bLen);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(bInset, H - bInset - bLen); ctx.lineTo(bInset, H - bInset); ctx.lineTo(bInset + bLen, H - bInset);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(W - bInset - bLen, H - bInset); ctx.lineTo(W - bInset, H - bInset); ctx.lineTo(W - bInset, H - bInset - bLen);
  ctx.stroke();

  // --- Center crosshair / reticle ---
  const cx = W / 2, cy = H / 2;
  const rOuter = Math.min(W, H) * 0.08;
  const rInner = rOuter * 0.4;
  const gap = rOuter * 0.15;

  ctx.strokeStyle = 'rgba(0,255,65,0.3)';
  ctx.lineWidth = 1;
  // Outer circle
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.stroke();
  // Inner circle
  ctx.beginPath();
  ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
  ctx.stroke();
  // Cross lines with gap
  ctx.beginPath();
  ctx.moveTo(cx - rOuter * 1.4, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + rOuter * 1.4, cy);
  ctx.moveTo(cx, cy - rOuter * 1.4); ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + rOuter * 1.4);
  ctx.stroke();

  // Tick marks on outer circle (every 45 deg)
  ctx.strokeStyle = 'rgba(0,255,65,0.25)';
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (rOuter - 3), cy + Math.sin(ang) * (rOuter - 3));
    ctx.lineTo(cx + Math.cos(ang) * (rOuter + 5), cy + Math.sin(ang) * (rOuter + 5));
    ctx.stroke();
  }

  // --- "REC" indicator (top-left, blinking) ---
  const recVisible = Math.floor(t / 700) % 2 === 0;
  if (recVisible) {
    ctx.fillStyle = 'rgba(255,40,40,0.9)';
    ctx.beginPath();
    ctx.arc(bInset + 8, bInset + bLen + 22, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = 'bold 11px Courier New';
  ctx.fillStyle = 'rgba(255,40,40,0.8)';
  ctx.textAlign = 'left';
  ctx.fillText('REC', bInset + 16, bInset + bLen + 26);

  // --- Classification banner (top-center) ---
  ctx.font = 'bold 10px Courier New';
  ctx.fillStyle = 'rgba(0,255,65,0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('CLASSIFIED // NOFORN // PANOPTICON', W / 2, bInset + 10);

  // --- Timestamp + frame (bottom-left) ---
  ctx.font = '10px Courier New';
  ctx.fillStyle = 'rgba(0,255,65,0.6)';
  ctx.textAlign = 'left';
  const ts = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  ctx.fillText(ts, bInset + 4, H - bInset - bLen - 4);
  ctx.font = '9px Courier New';
  ctx.fillStyle = 'rgba(0,255,65,0.35)';
  ctx.fillText('FRM ' + String(frameCounter).padStart(6, '0'), bInset + 4, H - bInset - bLen + 8);

  // --- Coordinates (bottom-right) ---
  if (ac) {
    ctx.font = '10px Courier New';
    ctx.fillStyle = 'rgba(0,255,65,0.5)';
    ctx.textAlign = 'right';
    const lat = ac.lat != null ? ac.lat.toFixed(4) + '\u00B0' : '---';
    const lon = ac.lon != null ? ac.lon.toFixed(4) + '\u00B0' : '---';
    ctx.fillText(`LAT ${lat}`, W - bInset - 4, H - bInset - bLen - 4);
    ctx.fillText(`LON ${lon}`, W - bInset - 4, H - bInset - bLen + 8);
  }

  // --- Signal strength bars (top-right) ---
  const barX = W - bInset - 4;
  const barY = bInset + bLen + 16;
  const barW = 3, barGap = 2, barCount = 5;
  const signalLevel = 3 + Math.floor(Math.sin(t / 2000) * 1.5 + 1.5); // fluctuate 2-5
  ctx.textAlign = 'right';
  ctx.font = '8px Courier New';
  ctx.fillStyle = 'rgba(0,255,65,0.4)';
  ctx.fillText('SIG', barX - (barW + barGap) * barCount - 2, barY + 12);
  for (let i = 0; i < barCount; i++) {
    const bh = 4 + i * 2;
    const bx = barX - (barCount - i) * (barW + barGap);
    const active = i < signalLevel;
    ctx.fillStyle = active ? 'rgba(0,255,65,0.6)' : 'rgba(0,255,65,0.12)';
    ctx.fillRect(bx, barY + 14 - bh, barW, bh);
  }

  // --- Random noise specks (subtle) ---
  ctx.fillStyle = 'rgba(0,255,65,0.03)';
  const seed = (frameCounter * 7) % 997;
  for (let i = 0; i < 30; i++) {
    const px = ((seed * (i + 1) * 13) % 997) / 997 * W;
    const py = ((seed * (i + 1) * 29) % 991) / 991 * H;
    ctx.fillRect(px, py, 1, 1);
  }

  // --- Grid overlay (very subtle) ---
  ctx.strokeStyle = 'rgba(0,255,65,0.03)';
  ctx.lineWidth = 0.5;
  const gridSp = 50;
  for (let x = gridSp; x < W; x += gridSp) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = gridSp; y < H; y += gridSp) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // --- Feed ID (bottom-center) ---
  ctx.font = '8px Courier New';
  ctx.fillStyle = 'rgba(0,255,65,0.25)';
  ctx.textAlign = 'center';
  const feedId = ac ? `FEED-${(ac.city || 'UNK').slice(0, 3).toUpperCase()}-${String(Math.abs(hashCode(ac.flight || 'X'))).slice(0, 4)}` : 'FEED-0000';
  ctx.fillText(feedId + ' // CH-' + (currentMode === 'hls' ? '01' : '02'), W / 2, H - bInset - 4);
}

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

function applySurveillanceState() {
  const wrapper = $('webcam-embed-wrapper');
  const btn = $('webcam-surveillance-toggle');
  if (wrapper) wrapper.classList.toggle('surveillance', surveillanceOn);
  if (btn) btn.classList.toggle('active', surveillanceOn);
  // Clear the overlay canvas when turning off so it doesn't freeze on last frame
  if (!surveillanceOn) {
    const canvas = $('webcam-video-overlay');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}

function toggleSurveillance() {
  surveillanceOn = !surveillanceOn;
  applySurveillanceState();
}

// overlay loops managed via startAnimLoop from viewbase.js

// --- Build embed URL for YouTube live stream ---
function buildEmbedUrl(ytId) {
  return `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&rel=0&modestbranding=1&controls=0&showinfo=0&iv_load_policy=3&disablekb=1`;
}

// --- HLS playback via hls.js ---

function destroyHls() {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  const video = $('webcam-hls-video');
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
}

function startHls(url) {
  const video = $('webcam-hls-video');
  const wrapper = $('webcam-embed-wrapper');
  if (!video || !wrapper) return false;

  // Check if hls.js is loaded
  if (typeof Hls === 'undefined') {
    console.warn('hls.js not loaded, falling back to YouTube');
    return false;
  }

  // Native HLS support (Safari)
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    wrapper.classList.add('hls-mode');
    video.src = url;
    video.play().catch(() => {});
    currentMode = 'hls';
    return true;
  }

  // hls.js support
  if (Hls.isSupported()) {
    destroyHls();
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    });

    hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        console.warn('HLS fatal error, falling back to YouTube:', data.type);
        destroyHls();
        wrapper.classList.remove('hls-mode');
        // Fall back to YouTube if available
        const ac = webcamViewTarget?.acData;
        if (ac?.ytId) {
          currentMode = 'youtube';
          const iframe = $('webcam-embed-iframe');
          if (iframe) iframe.src = buildEmbedUrl(ac.ytId);
        }
      }
    });

    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });

    wrapper.classList.add('hls-mode');
    currentMode = 'hls';
    return true;
  }

  return false;
}

// --- Open / Close ---

export function openWebcamView(viewer, entity) {
  if (!entity || !entity.acData) return;

  webcamViewTarget = entity;
  webcamViewOpen = true;

  const ac = entity.acData;

  $('webcam-view-panel').classList.add('open');
  document.body.classList.add('webcam-panel-open');

  // Populate stats
  $('wcv-cam-name').textContent = (ac.flight || '---').trim();
  $('wcv-type').textContent = 'LIVE FEED';
  $('wcv-city').textContent = ac.city || ac.r || '---';
  $('wcv-country').textContent = ac.country || '---';
  $('wcv-lat').textContent = ac.lat != null ? ac.lat.toFixed(4) + '\u00B0' : '---';
  $('wcv-lon').textContent = ac.lon != null ? ac.lon.toFixed(4) + '\u00B0' : '---';

  const wrapper = $('webcam-embed-wrapper');
  wrapper.classList.remove('hls-mode');

  // Direct video URL (mp4, webm, etc.) — highest priority
  let videoStarted = false;
  if (ac.videoUrl) {
    const video = $('webcam-hls-video');
    if (video) {
      destroyHls();
      video.src = ac.videoUrl;
      video.loop = true;
      video.muted = true;
      video.play().catch(() => {});
      wrapper.classList.add('hls-mode');
      currentMode = 'video';
      videoStarted = true;
    }
  }

  // Prefer HLS if URL available
  let hlsStarted = false;
  if (!videoStarted && ac.hlsUrl) {
    hlsStarted = startHls(ac.hlsUrl);
  }

  // Fall back to YouTube iframe
  if (!videoStarted && !hlsStarted) {
    currentMode = 'youtube';
    const iframe = $('webcam-embed-iframe');
    if (iframe && ac.ytId) {
      iframe.src = buildEmbedUrl(ac.ytId);
    }
  }

  overlayHandle = startAnimLoop(renderInfoCanvas);
  videoOverlayHandle = startAnimLoop(renderVideoOverlay);
  frameCounter = 0;

  // Apply surveillance filter state + bind toggle
  applySurveillanceState();
  const togBtn = $('webcam-surveillance-toggle');
  if (togBtn) togBtn.onclick = toggleSurveillance;

  setTimeout(() => viewer.resize(), 400);
}

export function closeWebcamView(viewer) {
  webcamViewOpen = false;
  webcamViewTarget = null;
  currentMode = null;

  $('webcam-view-panel').classList.remove('open');
  document.body.classList.remove('webcam-panel-open');

  // Stop HLS
  destroyHls();
  $('webcam-embed-wrapper').classList.remove('hls-mode');

  // Clear iframe to stop loading
  const iframe = $('webcam-embed-iframe');
  if (iframe) iframe.src = 'about:blank';

  if (overlayHandle) { overlayHandle.stop(); overlayHandle = null; }
  if (videoOverlayHandle) { videoOverlayHandle.stop(); videoOverlayHandle = null; }

  setTimeout(() => viewer.resize(), 400);
}

// --- Self-register with view registry ---
registerView('webcam', { open: openWebcamView, close: closeWebcamView, isOpen: isWebcamViewOpen, resize: resizeWebcamView });
