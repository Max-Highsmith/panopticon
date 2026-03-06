/* ===================================================================
   PANOPTICON — Layer Catalog
   Central registry of all available layers.
   Pure data — no layer module imports.
   =================================================================== */

export const LAYER_CATALOG = [
  // === LIVE TRACKING ===
  { key: 'military',     label: 'MILITARY',           shortLabel: 'MIL',      category: 'Live Tracking',  color: '#00ff41', defaultOn: true,  defaultPinned: true  },
  { key: 'commercial',   label: 'COMMERCIAL',         shortLabel: 'CIV',      category: 'Live Tracking',  color: '#cccccc', defaultOn: true,  defaultPinned: true  },
  { key: 'satellites',   label: 'SATELLITES',          shortLabel: 'SAT',      category: 'Live Tracking',  color: '#ffaa00', defaultOn: true,  defaultPinned: true  },
  { key: 'ships',        label: 'AIS SHIPS',           shortLabel: 'SHIPS',    category: 'Live Tracking',  color: '#4488ff', defaultOn: false, defaultPinned: false },
  { key: 'pokemon',      label: 'POKEMON GO',          shortLabel: 'POGO',     category: 'Live Tracking',  color: '#ff4444', defaultOn: false, defaultPinned: false },

  // === MILITARY ===
  { key: 'bases',        label: 'MILITARY BASES',      shortLabel: 'BASES',    category: 'Military',       color: '#ff6644', defaultOn: false, defaultPinned: false },

  // === INFRASTRUCTURE ===
  { key: 'infra',        label: 'DATACENTERS',         shortLabel: 'INFRA',    category: 'Infrastructure', color: '#ff8800', defaultOn: false, defaultPinned: false },
  { key: 'nuclear',      label: 'NUCLEAR SITES',       shortLabel: 'NUCLEAR',  category: 'Infrastructure', color: '#ff2222', defaultOn: false, defaultPinned: false },
  { key: 'airports',     label: 'AIRPORTS',            shortLabel: 'AIRPORTS', category: 'Infrastructure', color: '#00ccff', defaultOn: false, defaultPinned: false },

  // === RESOURCES ===
  { key: 'mines',        label: 'RESOURCE MINES',      shortLabel: 'MINES',    category: 'Resources',      color: '#cc44ff', defaultOn: false, defaultPinned: false },
  { key: 'arcticmining', label: 'ARCTIC MINING',       shortLabel: 'ARCTIC',   category: 'Resources',      color: '#cc6633', defaultOn: false, defaultPinned: false },
  { key: 'rareearth',    label: 'RARE EARTH DEPOSITS', shortLabel: 'REE',      category: 'Resources',      color: '#cc88ff', defaultOn: false, defaultPinned: false },
  { key: 'drilling',     label: 'OFFSHORE DRILLING',   shortLabel: 'DRILL',    category: 'Resources',      color: '#ff8844', defaultOn: false, defaultPinned: false },

  // === SURVEILLANCE ===
  { key: 'webcams',      label: 'LIVE WEBCAMS',        shortLabel: 'CAMS',     category: 'Surveillance',   color: '#00ddff', defaultOn: false, defaultPinned: false },
];

// Runtime additions (custom datasets, future layers)
const _extra = [];

export function getCatalog() {
  return [...LAYER_CATALOG, ..._extra];
}

export function getCatalogByKey(key) {
  return LAYER_CATALOG.find(e => e.key === key) || _extra.find(e => e.key === key) || null;
}

export function getCategories() {
  const seen = new Set();
  const cats = [];
  for (const e of getCatalog()) {
    if (!seen.has(e.category)) { seen.add(e.category); cats.push(e.category); }
  }
  return cats;
}

export function registerLayer(entry) {
  if (getCatalogByKey(entry.key)) return; // already registered
  _extra.push(entry);
}
