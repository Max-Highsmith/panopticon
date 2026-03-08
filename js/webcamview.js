/* ===================================================================
   PANOPTICON — Webcam View Panel (HLS + YouTube Live Stream Embed)
   Side panel with live webcam feed. Prefers HLS via hls.js for a clean
   watermark-free feed; falls back to YouTube embed when no HLS URL.
   =================================================================== */

import { $ } from './utils.js';
import { startAnimLoop } from './viewbase.js';
import { registerView } from './viewregistry.js';

let webcamViewOpen = false;
let webcamViewTarget = null;
let overlayHandle = null;
let hlsInstance = null;
let currentMode = null; // 'hls' | 'youtube'

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
  const sourceLabel = currentMode === 'hls' ? 'SOURCE: HLS STREAM' : 'SOURCE: YOUTUBE LIVE';
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

// overlay loop managed via startAnimLoop from viewbase.js

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

  // Prefer HLS if URL available
  let hlsStarted = false;
  if (ac.hlsUrl) {
    hlsStarted = startHls(ac.hlsUrl);
  }

  // Fall back to YouTube iframe
  if (!hlsStarted) {
    currentMode = 'youtube';
    const iframe = $('webcam-embed-iframe');
    if (iframe && ac.ytId) {
      iframe.src = buildEmbedUrl(ac.ytId);
    }
  }

  overlayHandle = startAnimLoop(renderInfoCanvas);

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

  setTimeout(() => viewer.resize(), 400);
}

// --- Self-register with view registry ---
registerView('webcam', { open: openWebcamView, close: closeWebcamView, isOpen: isWebcamViewOpen, resize: resizeWebcamView });
