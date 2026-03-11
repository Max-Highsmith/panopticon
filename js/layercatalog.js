/* ===================================================================
   PANOPTICON — Layer Catalog
   Central registry of all available layers.
   Pure data — no layer module imports.
   =================================================================== */

export const LAYER_CATALOG = [
  // === LIVE TRACKING ===
  { key: 'military',     label: 'MILITARY',           shortLabel: 'MIL',      category: 'Live Tracking',  color: '#00ff41', defaultOn: false, defaultPinned: false },
  { key: 'commercial',   label: 'COMMERCIAL',         shortLabel: 'CIV',      category: 'Live Tracking',  color: '#cccccc', defaultOn: false, defaultPinned: false },
  { key: 'satellites',   label: 'SATELLITES',          shortLabel: 'SAT',      category: 'Live Tracking',  color: '#ffaa00', defaultOn: false, defaultPinned: false },
  { key: 'ships',        label: 'AIS SHIPS',           shortLabel: 'SHIPS',    category: 'Live Tracking',  color: '#4488ff', defaultOn: false, defaultPinned: false },
  { key: 'pokemon',      label: 'POKEMON GO',          shortLabel: 'POGO',     category: 'Live Tracking',  color: '#ff4444', defaultOn: false, defaultPinned: false },

  // === MILITARY ===
  { key: 'bases',        label: 'MILITARY BASES',      shortLabel: 'BASES',    category: 'Military',       color: '#ff6644', defaultOn: false, defaultPinned: false },

  // === INFRASTRUCTURE ===
  { key: 'infra',        label: 'DATACENTERS',         shortLabel: 'INFRA',    category: 'Infrastructure', color: '#ff8800', defaultOn: false, defaultPinned: false },
  { key: 'nuclear',      label: 'NUCLEAR SITES',       shortLabel: 'NUCLEAR',  category: 'Infrastructure', color: '#ff2222', defaultOn: false, defaultPinned: false },
  { key: 'airports',     label: 'AIRPORTS',            shortLabel: 'AIRPORTS', category: 'Infrastructure', color: '#00ccff', defaultOn: false, defaultPinned: false },

  // === CRITICAL MINERALS ===
  { key: 'lithium',      label: 'LITHIUM',             shortLabel: 'Li',       category: 'Critical Minerals', color: '#00ddcc', defaultOn: false, defaultPinned: false },
  { key: 'cobalt',       label: 'COBALT',              shortLabel: 'Co',       category: 'Critical Minerals', color: '#cc44ff', defaultOn: false, defaultPinned: false },
  { key: 'nickel',       label: 'NICKEL',              shortLabel: 'Ni',       category: 'Critical Minerals', color: '#44cc88', defaultOn: false, defaultPinned: false },
  { key: 'graphite',     label: 'GRAPHITE',            shortLabel: 'C',        category: 'Critical Minerals', color: '#888888', defaultOn: false, defaultPinned: false },
  { key: 'manganese',    label: 'MANGANESE',           shortLabel: 'Mn',       category: 'Critical Minerals', color: '#cc6688', defaultOn: false, defaultPinned: false },
  { key: 'vanadium',     label: 'VANADIUM',            shortLabel: 'V',        category: 'Critical Minerals', color: '#7744cc', defaultOn: false, defaultPinned: false },
  { key: 'reelight',     label: 'RARE EARTH (LIGHT)',  shortLabel: 'La',       category: 'Critical Minerals', color: '#dd88ff', defaultOn: false, defaultPinned: false },
  { key: 'reeheavy',     label: 'RARE EARTH (HEAVY)',  shortLabel: 'Dy',       category: 'Critical Minerals', color: '#ff66cc', defaultOn: false, defaultPinned: false },
  { key: 'copper',       label: 'COPPER',              shortLabel: 'Cu',       category: 'Critical Minerals', color: '#cc7744', defaultOn: false, defaultPinned: false },
  { key: 'bauxite',      label: 'BAUXITE / ALUMINUM',  shortLabel: 'Al',       category: 'Critical Minerals', color: '#dd8855', defaultOn: false, defaultPinned: false },
  { key: 'silicon',      label: 'SILICON (MET.)',      shortLabel: 'Si',       category: 'Critical Minerals', color: '#8888cc', defaultOn: false, defaultPinned: false },
  { key: 'tin',          label: 'TIN',                 shortLabel: 'Sn',       category: 'Critical Minerals', color: '#aabb99', defaultOn: false, defaultPinned: false },
  { key: 'gallium',      label: 'GALLIUM',             shortLabel: 'Ga',       category: 'Critical Minerals', color: '#6688cc', defaultOn: false, defaultPinned: false },
  { key: 'germanium',    label: 'GERMANIUM',           shortLabel: 'Ge',       category: 'Critical Minerals', color: '#7799bb', defaultOn: false, defaultPinned: false },
  { key: 'indium',       label: 'INDIUM',              shortLabel: 'In',       category: 'Critical Minerals', color: '#5588bb', defaultOn: false, defaultPinned: false },
  { key: 'tantalum',     label: 'TANTALUM',            shortLabel: 'Ta',       category: 'Critical Minerals', color: '#bb7744', defaultOn: false, defaultPinned: false },
  { key: 'niobium',      label: 'NIOBIUM',             shortLabel: 'Nb',       category: 'Critical Minerals', color: '#cc8855', defaultOn: false, defaultPinned: false },
  { key: 'tungsten',     label: 'TUNGSTEN',            shortLabel: 'W',        category: 'Critical Minerals', color: '#9999bb', defaultOn: false, defaultPinned: false },
  { key: 'titanium',     label: 'TITANIUM',            shortLabel: 'Ti',       category: 'Critical Minerals', color: '#88aacc', defaultOn: false, defaultPinned: false },
  { key: 'beryllium',    label: 'BERYLLIUM',           shortLabel: 'Be',       category: 'Critical Minerals', color: '#aacc88', defaultOn: false, defaultPinned: false },
  { key: 'chromium',     label: 'CHROMIUM',            shortLabel: 'Cr',       category: 'Critical Minerals', color: '#dd5566', defaultOn: false, defaultPinned: false },
  { key: 'antimony',     label: 'ANTIMONY',            shortLabel: 'Sb',       category: 'Critical Minerals', color: '#bb6699', defaultOn: false, defaultPinned: false },
  { key: 'platinum',     label: 'PLATINUM',            shortLabel: 'Pt',       category: 'Critical Minerals', color: '#ccccee', defaultOn: false, defaultPinned: false },
  { key: 'palladium',    label: 'PALLADIUM',           shortLabel: 'Pd',       category: 'Critical Minerals', color: '#bbbbdd', defaultOn: false, defaultPinned: false },
  { key: 'uranium',      label: 'URANIUM',             shortLabel: 'U',        category: 'Critical Minerals', color: '#44dd44', defaultOn: false, defaultPinned: false },
  { key: 'tellurium',    label: 'TELLURIUM',           shortLabel: 'Te',       category: 'Critical Minerals', color: '#779988', defaultOn: false, defaultPinned: false },
  { key: 'fluorspar',    label: 'FLUORSPAR',           shortLabel: 'F',        category: 'Critical Minerals', color: '#66bbcc', defaultOn: false, defaultPinned: false },
  { key: 'magnesium',    label: 'MAGNESIUM',           shortLabel: 'Mg',       category: 'Critical Minerals', color: '#99bb66', defaultOn: false, defaultPinned: false },
  { key: 'zinc',         label: 'ZINC',                shortLabel: 'Zn',       category: 'Critical Minerals', color: '#8899aa', defaultOn: false, defaultPinned: false },
  { key: 'phosphate',    label: 'PHOSPHATE',           shortLabel: 'P',        category: 'Critical Minerals', color: '#ccaa44', defaultOn: false, defaultPinned: false },
  { key: 'iridium',      label: 'IRIDIUM',             shortLabel: 'Ir',       category: 'Critical Minerals', color: '#ccddee', defaultOn: false, defaultPinned: false },
  { key: 'rhodium',      label: 'RHODIUM',             shortLabel: 'Rh',       category: 'Critical Minerals', color: '#ddccbb', defaultOn: false, defaultPinned: false },
  { key: 'molybdenum',   label: 'MOLYBDENUM',          shortLabel: 'Mo',       category: 'Critical Minerals', color: '#4466aa', defaultOn: false, defaultPinned: false },
  { key: 'zirconium',    label: 'ZIRCONIUM',           shortLabel: 'Zr',       category: 'Critical Minerals', color: '#88bbaa', defaultOn: false, defaultPinned: false },
  { key: 'hafnium',      label: 'HAFNIUM',             shortLabel: 'Hf',       category: 'Critical Minerals', color: '#9988cc', defaultOn: false, defaultPinned: false },
  { key: 'selenium',     label: 'SELENIUM',            shortLabel: 'Se',       category: 'Critical Minerals', color: '#cc6655', defaultOn: false, defaultPinned: false },
  { key: 'bismuth',      label: 'BISMUTH',             shortLabel: 'Bi',       category: 'Critical Minerals', color: '#aa88cc', defaultOn: false, defaultPinned: false },
  { key: 'cadmium',      label: 'CADMIUM',             shortLabel: 'Cd',       category: 'Critical Minerals', color: '#aa7755', defaultOn: false, defaultPinned: false },
  { key: 'silver',       label: 'SILVER',              shortLabel: 'Ag',       category: 'Critical Minerals', color: '#cccccc', defaultOn: false, defaultPinned: false },
  { key: 'scandium',     label: 'SCANDIUM',            shortLabel: 'Sc',       category: 'Critical Minerals', color: '#55ccaa', defaultOn: false, defaultPinned: false },

  // === RESOURCES ===
  { key: 'mines',        label: 'RESOURCE MINES',      shortLabel: 'MINES',    category: 'Resources',      color: '#cc44ff', defaultOn: false, defaultPinned: false },
  { key: 'arcticmining', label: 'ARCTIC MINING',       shortLabel: 'ARCTIC',   category: 'Resources',      color: '#cc6633', defaultOn: false, defaultPinned: false },
  { key: 'rareearth',    label: 'RARE EARTH DEPOSITS', shortLabel: 'REE',      category: 'Resources',      color: '#cc88ff', defaultOn: false, defaultPinned: false },
  { key: 'drilling',     label: 'OFFSHORE DRILLING',   shortLabel: 'DRILL',    category: 'Resources',      color: '#ff8844', defaultOn: false, defaultPinned: false },

  // === ENERGY ===
  { key: 'powerplants',     label: 'POWER PLANTS',        shortLabel: 'POWER',    category: 'Energy',         color: '#cc8844', defaultOn: false, defaultPinned: false },
  { key: 'nuclearplants',   label: 'NUCLEAR REACTORS',    shortLabel: 'REACT',    category: 'Energy',         color: '#ff4444', defaultOn: false, defaultPinned: false },
  { key: 'refineries',      label: 'OIL REFINERIES',      shortLabel: 'REFINE',   category: 'Energy',         color: '#ff6600', defaultOn: false, defaultPinned: false },
  { key: 'platforms',       label: 'OFFSHORE PLATFORMS',   shortLabel: 'PLAT',     category: 'Energy',         color: '#ff8844', defaultOn: false, defaultPinned: false },
  { key: 'electricalgrid',  label: 'ELECTRICAL GRID',      shortLabel: 'GRID',     category: 'Energy',         color: '#ffff00', defaultOn: false, defaultPinned: false },
  { key: 'pipelines',       label: 'PIPELINES',            shortLabel: 'PIPES',    category: 'Energy',         color: '#cc6600', defaultOn: false, defaultPinned: false },

  // === MILITARY (expanded) ===
  { key: 'radar',            label: 'RADAR SYSTEMS',        shortLabel: 'RADAR',    category: 'Military',       color: '#ff3333', defaultOn: false, defaultPinned: false },
  { key: 'strategicnuclear', label: 'STRATEGIC NUCLEAR',    shortLabel: 'NUKE',     category: 'Military',       color: '#ff0000', defaultOn: false, defaultPinned: false },

  // === MARITIME ===
  { key: 'cables',        label: 'SUBSEA CABLES',        shortLabel: 'CABLE',    category: 'Maritime',       color: '#00ff88', defaultOn: false, defaultPinned: false },
  { key: 'traderoutes',   label: 'TRADE ROUTES',         shortLabel: 'TRADE',    category: 'Maritime',       color: '#ffcc00', defaultOn: false, defaultPinned: false },
  { key: 'chokepoints',   label: 'CHOKEPOINTS',          shortLabel: 'CHOKE',    category: 'Maritime',       color: '#ff4444', defaultOn: false, defaultPinned: false },
  { key: 'arcticroutes',  label: 'ARCTIC SHIPPING',      shortLabel: 'ARCT',     category: 'Maritime',       color: '#44aaff', defaultOn: false, defaultPinned: false },
  { key: 'fisheries',     label: 'FISHERIES ZONES',      shortLabel: 'FISH',     category: 'Maritime',       color: '#00aaff', defaultOn: false, defaultPinned: false },

  { key: 'oceancurrents', label: 'OCEAN CURRENTS',       shortLabel: 'CURR',     category: 'Maritime',       color: '#00bbff', defaultOn: false, defaultPinned: false },

  // === NATURAL HAZARDS ===
  { key: 'volcanoes',    label: 'VOLCANOES',            shortLabel: 'VOLC',     category: 'Natural Hazards', color: '#ff4400', defaultOn: false, defaultPinned: false },
  { key: 'earthquakes',  label: 'EARTHQUAKES',          shortLabel: 'QUAKE',    category: 'Natural Hazards', color: '#ff6600', defaultOn: false, defaultPinned: false },
  { key: 'wildfires',    label: 'WILDFIRES',            shortLabel: 'FIRE',     category: 'Natural Hazards', color: '#ff4400', defaultOn: false, defaultPinned: false },

  // === WILDLIFE ===
  { key: 'whales',       label: 'WHALE MIGRATIONS',     shortLabel: 'WHALE',    category: 'Wildlife',       color: '#4488ff', defaultOn: false, defaultPinned: false },
  { key: 'seaturtles',   label: 'SEA TURTLE MIGRATIONS',shortLabel: 'TURTL',    category: 'Wildlife',       color: '#00cc88', defaultOn: false, defaultPinned: false },
  { key: 'birds',        label: 'BIRD MIGRATION',       shortLabel: 'BIRD',     category: 'Wildlife',       color: '#88cc44', defaultOn: false, defaultPinned: false },
  { key: 'elephants',    label: 'ELEPHANT CORRIDORS',   shortLabel: 'ELEPH',    category: 'Wildlife',       color: '#cc8844', defaultOn: false, defaultPinned: false },

  // === SPACE ===
  { key: 'spacedebris',  label: 'SPACE DEBRIS',         shortLabel: 'DEBRI',    category: 'Space',          color: '#888888', defaultOn: false, defaultPinned: false },
  { key: 'spaceports',   label: 'LAUNCH SITES',         shortLabel: 'LAUNCH',   category: 'Space',          color: '#ff4400', defaultOn: false, defaultPinned: false },

  // === TRANSPORT ===
  { key: 'cargoroutes',  label: 'CARGO FLIGHT ROUTES',  shortLabel: 'CARGO',    category: 'Transport',      color: '#ff8800', defaultOn: false, defaultPinned: false },
  { key: 'ports',        label: 'MAJOR PORTS',           shortLabel: 'PORT',     category: 'Transport',      color: '#00ccff', defaultOn: false, defaultPinned: false },

  // === CLIMATE ===
  { key: 'seaice',       label: 'SEA ICE EXTENT',       shortLabel: 'ICE',      category: 'Climate',        color: '#aaddff', defaultOn: false, defaultPinned: false },
  { key: 'lightning',    label: 'LIGHTNING HOTSPOTS',    shortLabel: 'BOLT',     category: 'Natural Hazards', color: '#ffff00', defaultOn: false, defaultPinned: false },
  { key: 'meteors',     label: 'METEOR IMPACTS',       shortLabel: 'METR',     category: 'Natural Hazards', color: '#aa6644', defaultOn: false, defaultPinned: false },

  // === TRADE & ECONOMICS ===
  { key: 'commodityflows', label: 'COMMODITY FLOWS',    shortLabel: 'COMMOD',   category: 'Trade',          color: '#cc4400', defaultOn: false, defaultPinned: false },

  // === INTERNET ===
  { key: 'ixps',        label: 'INTERNET EXCHANGES',    shortLabel: 'IXP',      category: 'Infrastructure', color: '#00ff88', defaultOn: false, defaultPinned: false },

  // === OCEAN / CLIMATE ===
  { key: 'oceantemp',   label: 'OCEAN TEMPERATURE',     shortLabel: 'SST',      category: 'Climate',        color: '#ff4400', defaultOn: false, defaultPinned: false },

  // === SPACE WEATHER ===
  { key: 'cosmic',      label: 'COSMIC RADIATION',      shortLabel: 'COSM',     category: 'Space',          color: '#aa44ff', defaultOn: false, defaultPinned: false },
  { key: 'ionosphere',  label: 'IONOSPHERE NETWORK',    shortLabel: 'IONO',     category: 'Space',          color: '#44ffaa', defaultOn: false, defaultPinned: false },

  // === FISHING ===
  { key: 'fishingfleets', label: 'FISHING GROUNDS',     shortLabel: 'FFISH',    category: 'Maritime',       color: '#00aacc', defaultOn: false, defaultPinned: false },

  // === ARCTIC ===
  { key: 'arcticdeposits', label: 'ARCTIC DEPOSITS',    shortLabel: 'ADEP',     category: 'Resources',      color: '#cc6633', defaultOn: false, defaultPinned: false },

  // === SURVEILLANCE ===
  { key: 'webcams',         label: 'LIVE WEBCAMS',        shortLabel: 'CAMS',     category: 'Surveillance',   color: '#00ddff', defaultOn: false, defaultPinned: false },
  { key: 'underwatercams',  label: 'UNDERWATER CAMS',     shortLabel: 'OCEAN',    category: 'Surveillance',   color: '#00aaff', defaultOn: false, defaultPinned: false },

  // === MARKETS ===
  { key: 'kalshi',      label: 'PREDICTION MARKETS', shortLabel: 'MKTS',  category: 'Markets', color: '#ffaa00', defaultOn: false, defaultPinned: false },
  { key: 'crypto',      label: 'CRYPTO MARKETS',     shortLabel: 'CRYPT', category: 'Markets', color: '#f7931a', defaultOn: false, defaultPinned: false },
  { key: 'commodities', label: 'COMMODITY PRICES',    shortLabel: 'CMDTY', category: 'Markets', color: '#cc8844', defaultOn: false, defaultPinned: false },
  { key: 'news',        label: 'TRENDING NEWS',       shortLabel: 'NEWS',  category: 'Markets', color: '#44aaff', defaultOn: false, defaultPinned: false },
  { key: 'whalebtc',    label: 'BTC WHALE TXS',       shortLabel: 'WHALE', category: 'Markets', color: '#f7931a', defaultOn: false, defaultPinned: false },

  // === INTELLIGENCE ===
  { key: 'headsofstate',        label: 'HEADS OF STATE',       shortLabel: 'HOS',   category: 'Intelligence', color: '#ffcc44', defaultOn: false, defaultPinned: false },
  { key: 'profiles',            label: 'PERSON PROFILES',      shortLabel: 'POI',   category: 'Intelligence', color: '#ff6699', defaultOn: false, defaultPinned: false },
  { key: 'profiles_scenario',   label: 'SCENARIO SUBJECTS',    shortLabel: 'SUBJ',  category: 'Intelligence', color: '#ff4444', defaultOn: false, defaultPinned: false },
  { key: 'kalshi_scenario',     label: 'SCENARIO MARKETS',     shortLabel: 'SMKT',  category: 'Intelligence', color: '#ff4444', defaultOn: false, defaultPinned: false },

  // === REFERENCE ===
  { key: 'wikipedia',  label: 'WIKIPEDIA GEO',       shortLabel: 'WIKI',  category: 'Reference', color: '#aaaaaa', defaultOn: false, defaultPinned: false },
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
