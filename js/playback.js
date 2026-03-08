/* ===================================================================
   PANOPTICON — Unified Playback Engine
   Manages timeline state and frame loop for all playback types.
   Adapter pattern: each data source implements load/renderFrame/etc.
   =================================================================== */

import { $ } from './utils.js';
import { entityMaps } from './globe.js';
import adsbAdapter from './adapters/adsb.js';
import wargameAdapter from './adapters/wargame.js';

// --- Adapter Registry ---
const ADAPTERS = {
  adsb: adsbAdapter,
  wargame: wargameAdapter,
};

// --- Playback Speeds ---
export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 5, 10, 30, 60, 100];
const DEFAULT_SPEED_INDEX = 6; // 30x

// --- Engine State ---
let state = {
  manifest: null,
  adapter: null,
  context: null,

  // Timeline
  timeSeconds: 0,       // current position in seconds
  durationSeconds: 0,   // total duration
  playing: false,
  speed: PLAYBACK_SPEEDS[DEFAULT_SPEED_INDEX],
  speedIdx: DEFAULT_SPEED_INDEX,
  lastFrameTime: 0,

  // Rendering
  viewer: null,
  entityMap: null,       // shared entity registry for the adapter
  renderHandler: null,   // preRender callback reference

  // Callbacks (set by the host app)
  onTimeUpdate: null,    // (timeSeconds, durationSeconds, progress) => void
  onFrameInfo: null,     // ({ entityCount, timeLabel, localTimeLabel }) => void
  onEvents: null,        // (events[]) => void
};

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Load a playback manifest and prepare for playback.
 * @param {CesiumViewer} viewer
 * @param {Object} manifest - playback manifest object
 * @param {Object} [callbacks] - optional { onTimeUpdate, onFrameInfo, onEvents }
 */
export async function loadPlayback(viewer, manifest, callbacks = {}) {
  // Stop any existing playback
  stopPlayback();

  const adapterType = manifest.type || 'adsb';
  const adapter = ADAPTERS[adapterType];
  if (!adapter) throw new Error(`Unknown playback type: ${adapterType}`);

  state.viewer = viewer;
  state.manifest = manifest;
  state.adapter = adapter;
  state.entityMap = entityMaps.replay; // reuse the existing replay entity map
  state.onTimeUpdate = callbacks.onTimeUpdate || null;
  state.onFrameInfo = callbacks.onFrameInfo || null;
  state.onEvents = callbacks.onEvents || null;

  // Load data
  state.context = await adapter.load(manifest);
  state.durationSeconds = adapter.getDurationSeconds(state.context, manifest);
  state.timeSeconds = 0;
  state.playing = false;

  // Wargame playbacks default to 1x; others default to 30x
  const defaultIdx = adapterType === 'wargame'
    ? PLAYBACK_SPEEDS.indexOf(1)
    : DEFAULT_SPEED_INDEX;
  state.speedIdx = defaultIdx;
  state.speed = PLAYBACK_SPEEDS[defaultIdx];
}

/**
 * Start playback (begin frame loop).
 */
export function startPlaying() {
  if (!state.adapter || !state.context) return;
  state.playing = true;
  state.lastFrameTime = performance.now();

  if (!state.renderHandler) {
    state.renderHandler = () => tick();
    state.viewer.scene.preRender.addEventListener(state.renderHandler);
  }

  // Render initial frame
  renderCurrentFrame();
}

/**
 * Toggle play/pause.
 * @returns {boolean} new playing state
 */
export function togglePlayback() {
  state.playing = !state.playing;
  if (state.playing) {
    state.lastFrameTime = performance.now();
  }
  return state.playing;
}

/**
 * Seek to a position.
 * @param {number} timeSeconds
 */
export function seekPlayback(timeSeconds) {
  state.timeSeconds = Math.max(0, Math.min(timeSeconds, state.durationSeconds));
  if (state.adapter?.onSeek) {
    state.adapter.onSeek(state.context, state.entityMap);
  }
  renderCurrentFrame();
}

/**
 * Seek by progress (0.0 to 1.0).
 */
export function seekByProgress(progress) {
  seekPlayback(progress * state.durationSeconds);
}

/**
 * Cycle to next speed.
 * @returns {number} new speed value
 */
export function cycleSpeed() {
  state.speedIdx = (state.speedIdx + 1) % PLAYBACK_SPEEDS.length;
  state.speed = PLAYBACK_SPEEDS[state.speedIdx];
  return state.speed;
}

/**
 * Get current speed.
 */
export function getSpeed() {
  return state.speed;
}

/**
 * Get current time position.
 */
export function getTimeSeconds() {
  return state.timeSeconds;
}

/**
 * Get total duration.
 */
export function getDurationSeconds() {
  return state.durationSeconds;
}

/**
 * Get current progress (0.0 to 1.0).
 */
export function getProgress() {
  return state.durationSeconds > 0 ? state.timeSeconds / state.durationSeconds : 0;
}

/**
 * Check if playback is currently playing.
 */
export function isPlaying() {
  return state.playing;
}

/**
 * Check if a manifest is loaded.
 */
export function isLoaded() {
  return !!state.adapter && !!state.context;
}

/**
 * Get the current manifest.
 */
export function getManifest() {
  return state.manifest;
}

/**
 * Stop playback entirely. Cleans up entities and event listeners.
 */
export function stopPlayback() {
  state.playing = false;

  if (state.renderHandler && state.viewer) {
    state.viewer.scene.preRender.removeEventListener(state.renderHandler);
    state.renderHandler = null;
  }

  if (state.adapter && state.context && state.viewer && state.entityMap) {
    state.adapter.cleanup(state.context, state.viewer, state.entityMap);
  }

  state.manifest = null;
  state.adapter = null;
  state.context = null;
  state.entityMap = null;
  state.timeSeconds = 0;
  state.durationSeconds = 0;
  state.onTimeUpdate = null;
  state.onFrameInfo = null;
  state.onEvents = null;
}

/**
 * Register an adapter for a playback type.
 */
export function registerAdapter(type, adapter) {
  ADAPTERS[type] = adapter;
}

// =====================================================
// INTERNAL
// =====================================================

function tick() {
  if (!state.playing || !state.context) return;

  const now = performance.now();
  const dt = (now - state.lastFrameTime) / 1000;
  state.lastFrameTime = now;
  state.timeSeconds += dt * state.speed;

  if (state.timeSeconds >= state.durationSeconds) {
    state.timeSeconds = state.durationSeconds;
    state.playing = false;
  }

  renderCurrentFrame();
}

function renderCurrentFrame() {
  if (!state.adapter || !state.context) return;

  const progress = state.durationSeconds > 0 ? state.timeSeconds / state.durationSeconds : 0;

  // Render entities
  const frameInfo = state.adapter.renderFrame(
    state.context, state.manifest, state.viewer, state.entityMap,
    progress, state.timeSeconds
  );

  // Notify host
  if (state.onTimeUpdate) {
    state.onTimeUpdate(state.timeSeconds, state.durationSeconds, progress);
  }
  if (state.onFrameInfo && frameInfo) {
    state.onFrameInfo(frameInfo);
  }

  // Events (for wargame adapter)
  if (state.onEvents && state.adapter.getEvents) {
    const events = state.adapter.getEvents(state.context, progress);
    state.onEvents(events);
  }
}
