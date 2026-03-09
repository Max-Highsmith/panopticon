/* ===================================================================
   PANOPTICON — View Registry
   Maps view type strings to their handler functions.
   Each view module self-registers at import time.
   =================================================================== */

const _views = new Map();

export function registerView(viewType, { open, close, isOpen, resize, notify, tick }) {
  _views.set(viewType, { open, close, isOpen, resize, notify, tick });
}

/** Push playback progress to all open views that registered a tick callback. */
export function tickAllViews(progress, tick, totalTicks) {
  for (const [, v] of _views) {
    if (v.tick && v.isOpen()) v.tick(progress, tick, totalTicks);
  }
}

export function getView(viewType) {
  return _views.get(viewType) || null;
}

export function closeAllViews(viewer, except) {
  for (const [type, v] of _views) {
    if (type === except) continue;
    if (v.isOpen()) v.close(viewer);
  }
}

export function resizeAllViews() {
  for (const [, v] of _views) {
    v.resize();
  }
}

export function getViewTypes() {
  return Array.from(_views.keys());
}
