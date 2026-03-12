/* ===================================================================
   PANOPTICON — SAR Imagery View Panel
   Displays synthetic aperture radar imagery with military-style HUD
   overlay. Green-tinted radar scope aesthetic with animated scanline,
   coordinate grid, and metadata readouts.
   =================================================================== */

import { $ } from './utils.js';
import { startAnimLoop, setupOverlayCanvas, drawHudOverlay } from './viewbase.js';
import { registerView } from './viewregistry.js';

let sarViewOpen = false;
let overlayHandle = null;
let currentImage = null;    // HTMLImageElement
let currentMetadata = null;  // { acquisition, analysis }
let frameCounter = 0;
let acquiring = false;       // true while waiting for image data

const SAR_GREEN = 'rgba(0, 255, 65, ';
const SAR_ACCENT = '#00ff41';

export function isSarViewOpen() { return sarViewOpen; }
export function resizeSarView() { renderStaticImage(); }

/**
 * Load SAR image data and display in the panel.
 * Called from wargame.js handleToolResult for query_sar_imagery.
 */
export function showSarImage(base64, mediaType, metadata) {
  acquiring = false;
  currentMetadata = metadata;
  currentImage = new Image();
  currentImage.onload = () => renderStaticImage();
  currentImage.src = `data:${mediaType};base64,${base64}`;
}

/** Set acquiring state (shown while waiting for imagery) */
export function setAcquiring(state) {
  acquiring = state;
  if (state) {
    currentImage = null;
    currentMetadata = null;
    // Clear the image canvas
    const canvas = $('sar-image-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}

function renderStaticImage() {
  const canvas = $('sar-image-canvas');
  if (!canvas || !currentImage) return;

  const parent = canvas.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height;

  // Draw image scaled to fill
  ctx.drawImage(currentImage, 0, 0, w, h);

  // Green tint — multiply then screen for radar look
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#002200';
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(0, 60, 0, 0.4)';
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'source-over';

  // Brighten highlights
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.15;
  ctx.drawImage(currentImage, 0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function renderOverlay() {
  const canvas = $('sar-overlay-canvas');
  const setup = setupOverlayCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;
  frameCounter++;
  const t = Date.now();

  ctx.clearRect(0, 0, W, H);

  // Shared HUD chrome (scanlines, corner brackets, vignette, scan bar)
  drawHudOverlay(ctx, W, H, SAR_GREEN, { scanSpeed: 40, vigOuter: 0.5 });

  // Coordinate grid
  ctx.strokeStyle = SAR_GREEN + '0.06)';
  ctx.lineWidth = 0.5;
  const gridSp = 60;
  for (let x = gridSp; x < W; x += gridSp) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = gridSp; y < H; y += gridSp) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Classification banner
  ctx.font = 'bold 10px Courier New';
  ctx.fillStyle = SAR_GREEN + '0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('CLASSIFIED // SAR IMAGERY // PANOPTICON', W / 2, 14);

  // Timestamp (top-right)
  ctx.textAlign = 'right';
  ctx.font = '10px Courier New';
  ctx.fillStyle = SAR_GREEN + '0.35)';
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  ctx.fillText(ts, W - 26, 14);

  // Frame counter (top-right below timestamp)
  ctx.font = '9px Courier New';
  ctx.fillStyle = SAR_GREEN + '0.25)';
  ctx.fillText('FRM ' + String(frameCounter).padStart(6, '0'), W - 26, 26);

  if (acquiring) {
    // "ACQUIRING..." animation
    const dots = '.'.repeat(Math.floor(t / 400) % 4);
    ctx.font = 'bold 16px Courier New';
    ctx.fillStyle = SAR_ACCENT;
    ctx.textAlign = 'center';
    ctx.shadowColor = SAR_ACCENT;
    ctx.shadowBlur = 12;
    ctx.fillText(`ACQUIRING IMAGERY${dots}`, W / 2, H / 2 - 10);
    ctx.shadowBlur = 0;

    ctx.font = '11px Courier New';
    ctx.fillStyle = SAR_GREEN + '0.5)';
    ctx.fillText('TASKING SAR-SENTINEL-POC // STANDBY', W / 2, H / 2 + 14);

    // Rotating radar sweep while acquiring
    const angle = (t / 1500) % (2 * Math.PI);
    const cx = W / 2, cy = H / 2;
    const sweepLen = Math.max(W, H) * 0.6;
    ctx.strokeStyle = SAR_GREEN + '0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * sweepLen, cy + Math.sin(angle) * sweepLen);
    ctx.stroke();

    return;
  }

  if (!currentMetadata) return;

  // Satellite ID + mode (top-left, below brackets)
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px Courier New';
  ctx.fillStyle = SAR_ACCENT;
  ctx.shadowColor = SAR_ACCENT;
  ctx.shadowBlur = 6;
  ctx.fillText('SAR-SENTINEL-POC', 28, 50);
  ctx.shadowBlur = 0;

  if (currentMetadata.acquisition) {
    const a = currentMetadata.acquisition;
    ctx.font = '10px Courier New';
    ctx.fillStyle = SAR_GREEN + '0.55)';
    ctx.fillText(`MODE: ${a.mode || '---'} | BAND: ${a.band || '---'}`, 28, 66);
    ctx.fillText(`RES: ${a.resolution_m || '---'}m | POL: ${a.polarization || '---'} | INC: ${a.incidence_angle_deg || '---'}\u00B0`, 28, 80);

    if (a.coordinates) {
      ctx.fillStyle = SAR_GREEN + '0.45)';
      ctx.fillText(`LAT ${a.coordinates.lat?.toFixed(4) || '---'}\u00B0  LON ${a.coordinates.lon?.toFixed(4) || '---'}\u00B0`, 28, 94);
    }
    ctx.fillText(`SWATH: ${a.swath_km || '---'}km | ORBIT: ${(a.orbit || '---').toUpperCase()}`, 28, 108);
  }

  // Analysis results box (bottom-left)
  if (currentMetadata.analysis) {
    const an = currentMetadata.analysis;
    const y0 = H - 104;

    // Semi-transparent background for readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(20, y0 - 8, 260, 90);
    ctx.strokeStyle = SAR_GREEN + '0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, y0 - 8, 260, 90);

    ctx.textAlign = 'left';
    ctx.font = 'bold 10px Courier New';
    ctx.fillStyle = SAR_ACCENT;
    ctx.fillText('ANALYSIS', 28, y0 + 4);

    ctx.font = '10px Courier New';
    ctx.fillStyle = SAR_GREEN + '0.65)';
    ctx.fillText(`TARGET: ${an.target_name || 'UNKNOWN'}`, 28, y0 + 18);
    ctx.fillText(`BRIGHT RETURNS: ${an.bright_returns ?? '---'}`, 28, y0 + 32);

    // Anomalies — orange if detected
    ctx.fillStyle = an.anomalies_detected ? 'rgba(255, 140, 0, 0.85)' : SAR_GREEN + '0.6)';
    ctx.fillText(`ANOMALIES: ${an.anomalies_detected ? 'DETECTED' : 'NONE'}`, 28, y0 + 46);

    // Change detection
    const isNewActivity = an.change_detection?.includes('NEW');
    ctx.fillStyle = isNewActivity ? 'rgba(255, 140, 0, 0.85)' : SAR_GREEN + '0.6)';
    ctx.fillText(`CHANGE: ${an.change_detection || '---'}`, 28, y0 + 60);

    ctx.fillStyle = SAR_GREEN + '0.6)';
    ctx.fillText(`CONFIDENCE: ${an.confidence ?? '---'}`, 28, y0 + 74);
  }

  // Rotating sweep line (radar aesthetic)
  const angle = (t / 4000) % (2 * Math.PI);
  const cx = W / 2, cy = H / 2;
  const sweepLen = Math.max(W, H);
  const sweepGrad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * sweepLen, cy + Math.sin(angle) * sweepLen);
  sweepGrad.addColorStop(0, SAR_GREEN + '0.1)');
  sweepGrad.addColorStop(0.3, SAR_GREEN + '0.03)');
  sweepGrad.addColorStop(1, SAR_GREEN + '0)');
  ctx.strokeStyle = sweepGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * sweepLen, cy + Math.sin(angle) * sweepLen);
  ctx.stroke();

  // Center reticle
  const rOuter = Math.min(W, H) * 0.06;
  ctx.strokeStyle = SAR_GREEN + '0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.stroke();
  // Cross
  const gap = rOuter * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - rOuter * 1.5, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + rOuter * 1.5, cy);
  ctx.moveTo(cx, cy - rOuter * 1.5); ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + rOuter * 1.5);
  ctx.stroke();

  // Image ID label (bottom-right)
  if (currentMetadata.analysis?.image_id) {
    ctx.textAlign = 'right';
    ctx.font = '9px Courier New';
    ctx.fillStyle = SAR_GREEN + '0.3)';
    ctx.fillText(`IMG: ${currentMetadata.analysis.image_id.toUpperCase()}`, W - 26, H - 26);
  }
}

export function openSarView(viewer) {
  sarViewOpen = true;
  $('sar-view-panel').classList.add('open');
  document.body.classList.add('sar-panel-open');
  overlayHandle = startAnimLoop(renderOverlay);
  frameCounter = 0;
  if (currentImage) renderStaticImage();
  setTimeout(() => viewer?.resize(), 400);
}

export function closeSarView(viewer) {
  sarViewOpen = false;
  acquiring = false;
  $('sar-view-panel').classList.remove('open');
  document.body.classList.remove('sar-panel-open');
  if (overlayHandle) { overlayHandle.stop(); overlayHandle = null; }
  setTimeout(() => viewer?.resize(), 400);
}

// Global close handler for onclick
window.closeSarView = closeSarView;

registerView('sar', {
  open: openSarView,
  close: closeSarView,
  isOpen: isSarViewOpen,
  resize: resizeSarView,
});
