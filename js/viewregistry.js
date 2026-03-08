/* ===================================================================
   PANOPTICON — View Registry
   Maps view type strings to their handler functions.
   Each view module self-registers at import time.
   =================================================================== */

const _views = new Map();

export function registerView(viewType, { open, close, isOpen, resize }) {
  _views.set(viewType, { open, close, isOpen, resize });
}

export function getView(viewType) {
  return _views.get(viewType) || null;
}

export function closeAllViews(viewer) {
  for (const [, v] of _views) {
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
