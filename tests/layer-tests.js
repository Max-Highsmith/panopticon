/* ===================================================================
   PANOPTICON — Layer Integration Tests
   Run via: node tests/layer-tests.js
   Validates JSON data files, layer module structure, and catalog registration.
   =================================================================== */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// __dirname is available in CJS
const ROOT = join(__dirname, '..');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message });
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function readJSON(relPath) {
  const full = join(ROOT, relPath);
  assert(existsSync(full), `File not found: ${relPath}`);
  const raw = readFileSync(full, 'utf8');
  return JSON.parse(raw);
}

function readText(relPath) {
  const full = join(ROOT, relPath);
  assert(existsSync(full), `File not found: ${relPath}`);
  return readFileSync(full, 'utf8');
}

// =========================================================
// 1. DATA FILE VALIDATION
// =========================================================
console.log('\n=== DATA FILE VALIDATION ===\n');

// --- Data Layer JSON files (point layers) ---
const DATA_LAYERS = [
  { file: 'data/mines.json', categories: ['cobalt', 'lithium', 'bitcoin'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/infrastructure.json', categories: ['datacenters', 'nuclear_tests'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/military_bases.json', categories: ['army', 'navy', 'airforce', 'joint'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/arctic_mining.json', categories: ['iron', 'rare_earth', 'zinc', 'gold'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/rare_earth.json', categories: ['heavy_rare_earth', 'light_rare_earth', 'strategic_minerals'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/drilling_leases.json', categories: ['alaska_ocs', 'norway_barents', 'russia_arctic', 'canada_arctic'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/power_plants.json', categories: ['coal', 'gas', 'hydro', 'solar', 'wind'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/nuclear_plants.json', categories: ['active'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/oil_refineries.json', categories: ['refinery'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/offshore_platforms.json', categories: ['platform'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/radar_installations.json', categories: ['bmews', 'aegis', 'othr'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/strategic_nuclear.json', categories: ['weapons_lab', 'submarine_base', 'missile_silo'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/volcanoes.json', categories: ['active', 'dormant'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/earthquakes.json', categories: ['significant'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/wildfires.json', categories: ['active_region'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/space_debris.json', categories: ['major_debris'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/spaceports.json', categories: ['active', 'historic'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/lightning.json', categories: ['hotspot'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/ports.json', categories: ['mega_port', 'major_port'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/internet_exchanges.json', categories: ['tier1', 'regional'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/ocean_temp.json', categories: ['warm_anomaly', 'cold_anomaly'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/meteor_impacts.json', categories: ['major_crater', 'recent_bolide'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/cosmic_radiation.json', categories: ['neutron_monitor'], fields: ['name', 'lon', 'lat'] },
  { file: 'data/ionosphere.json', categories: ['ionosonde', 'gnss_station'], fields: ['name', 'lon', 'lat'] },
];

for (const { file, categories, fields } of DATA_LAYERS) {
  test(`${file} — valid JSON with expected categories`, () => {
    const data = readJSON(file);
    assert(typeof data === 'object', 'Root must be object');
    for (const cat of categories) {
      assert(Array.isArray(data[cat]), `Missing category: ${cat}`);
      assert(data[cat].length > 0, `Empty category: ${cat}`);
    }
  });

  test(`${file} — all items have required fields`, () => {
    const data = readJSON(file);
    for (const cat of categories) {
      for (const item of (data[cat] || [])) {
        for (const field of fields) {
          assert(item[field] !== undefined, `Item "${item.name || '?'}" in "${cat}" missing field "${field}"`);
        }
      }
    }
  });

  test(`${file} — coordinates are valid numbers`, () => {
    const data = readJSON(file);
    for (const cat of categories) {
      for (const item of (data[cat] || [])) {
        assert(typeof item.lon === 'number' && !isNaN(item.lon), `Invalid lon for "${item.name}"`);
        assert(typeof item.lat === 'number' && !isNaN(item.lat), `Invalid lat for "${item.name}"`);
        assert(item.lon >= -180 && item.lon <= 180, `lon out of range for "${item.name}": ${item.lon}`);
        assert(item.lat >= -90 && item.lat <= 90, `lat out of range for "${item.name}": ${item.lat}`);
      }
    }
  });
}

// --- Path Layer JSON files ---
const PATH_LAYERS = [
  { file: 'data/submarine_cables.json', categories: ['subsea'] },
  { file: 'data/pipelines.json', categories: ['oil', 'gas'] },
  { file: 'data/trade_routes.json', categories: ['major'] },
  { file: 'data/arctic_routes.json', categories: ['northern_sea_route', 'northwest_passage', 'transpolar'] },
  { file: 'data/electrical_grid.json', categories: ['transmission'] },
  { file: 'data/whale_migrations.json', categories: ['migration_route'] },
  { file: 'data/sea_turtles.json', categories: ['migration_route'] },
  { file: 'data/bird_migration.json', categories: ['flyway'] },
  { file: 'data/elephant_migration.json', categories: ['corridor'] },
  { file: 'data/ocean_currents.json', categories: ['major_current'] },
  { file: 'data/cargo_routes.json', categories: ['cargo_air'] },
  { file: 'data/commodity_flows.json', categories: ['oil_flow', 'lng_flow', 'grain_flow', 'container_flow'] },
];

for (const { file, categories } of PATH_LAYERS) {
  test(`${file} — valid JSON with coords arrays`, () => {
    const data = readJSON(file);
    for (const cat of categories) {
      assert(Array.isArray(data[cat]), `Missing category: ${cat}`);
      for (const item of (data[cat] || [])) {
        assert(item.name, `Item missing name in "${cat}"`);
        assert(Array.isArray(item.coords), `Item "${item.name}" missing coords array`);
        assert(item.coords.length >= 2, `Item "${item.name}" needs >= 2 coord pairs`);
        for (const pt of item.coords) {
          assert(Array.isArray(pt) && pt.length === 2, `Invalid coord in "${item.name}"`);
          assert(typeof pt[0] === 'number' && typeof pt[1] === 'number', `Non-numeric coord in "${item.name}"`);
        }
      }
    }
  });
}

// --- Region Layer JSON files ---
const REGION_LAYERS = [
  { file: 'data/chokepoints.json', categories: ['chokepoint'] },
  { file: 'data/fisheries_zones.json', categories: ['industrial'] },
  { file: 'data/sea_ice.json', categories: ['arctic_ice', 'antarctic_ice'] },
  { file: 'data/fishing_fleets.json', categories: ['industrial_ground'] },
  { file: 'data/arctic_deposits.json', categories: ['mineral_claim'] },
];

for (const { file, categories } of REGION_LAYERS) {
  test(`${file} — valid JSON with rings arrays`, () => {
    const data = readJSON(file);
    for (const cat of categories) {
      assert(Array.isArray(data[cat]), `Missing category: ${cat}`);
      for (const item of (data[cat] || [])) {
        assert(item.name, `Item missing name in "${cat}"`);
        assert(Array.isArray(item.rings), `Item "${item.name}" missing rings array`);
        assert(item.rings.length >= 1, `Item "${item.name}" needs >= 1 ring`);
        assert(item.rings[0].length >= 3, `Item "${item.name}" outer ring needs >= 3 points`);
      }
    }
  });
}

// =========================================================
// 2. LAYER MODULE VALIDATION
// =========================================================
console.log('\n=== LAYER MODULE VALIDATION ===\n');

const EXPECTED_MODULES = [
  'js/layers/mines.js',
  'js/layers/infrastructure.js',
  'js/layers/militarybases.js',
  'js/layers/arcticmining.js',
  'js/layers/rareearth.js',
  'js/layers/drillingleases.js',
  'js/layers/powerplants.js',
  'js/layers/nuclearplants.js',
  'js/layers/refineries.js',
  'js/layers/platforms.js',
  'js/layers/radar.js',
  'js/layers/strategicnuclear.js',
  'js/layers/volcanoeslayer.js',
  'js/layers/earthquakeslayer.js',
  'js/layers/wildfireslayer.js',
  'js/layers/cables.js',
  'js/layers/pipelineslayer.js',
  'js/layers/traderoutes.js',
  'js/layers/arcticroutes.js',
  'js/layers/electricalgrid.js',
  'js/layers/chokepoints.js',
  'js/layers/fisherieslayer.js',
  'js/layers/whalelayer.js',
  'js/layers/seaturtlelayer.js',
  'js/layers/birdlayer.js',
  'js/layers/elephantlayer.js',
  'js/layers/spacedebrislayer.js',
  'js/layers/oceancurrentslayer.js',
  'js/layers/cargorouteslayer.js',
  'js/layers/spaceportslayer.js',
  'js/layers/seaicelayer.js',
  'js/layers/lightninglayer.js',
  'js/layers/portslayer.js',
  'js/layers/commodityflowslayer.js',
  'js/layers/internetexchangeslayer.js',
  'js/layers/oceantemplayer.js',
  'js/layers/meteorlayer.js',
  'js/layers/cosmiclayer.js',
  'js/layers/ionospherelayer.js',
  'js/layers/fishingfleetslayer.js',
  'js/layers/arcticdepositslayer.js',
];

for (const mod of EXPECTED_MODULES) {
  test(`${mod} — file exists`, () => {
    assert(existsSync(join(ROOT, mod)), `Module not found: ${mod}`);
  });

  test(`${mod} — exports fetch function`, () => {
    const src = readText(mod);
    assert(/export const fetch\w+/.test(src), 'Missing fetch export');
  });

  test(`${mod} — exports FLY_TO constant`, () => {
    const src = readText(mod);
    assert(/export const \w+_FLY_TO/.test(src), 'Missing FLY_TO export');
  });

  test(`${mod} — uses createDataLayer or createPathLayer or createRegionLayer`, () => {
    const src = readText(mod);
    const usesFactory = /create(Data|Path|Region)Layer/.test(src);
    assert(usesFactory, 'Must use one of the factory functions');
  });
}

// =========================================================
// 3. CATALOG REGISTRATION VALIDATION
// =========================================================
console.log('\n=== CATALOG REGISTRATION ===\n');

const EXPECTED_CATALOG_KEYS = [
  'military', 'commercial', 'satellites', 'ships', 'pokemon',
  'bases', 'infra', 'nuclear', 'airports',
  'mines', 'arcticmining', 'rareearth', 'drilling',
  'powerplants', 'nuclearplants', 'refineries', 'platforms',
  'electricalgrid', 'pipelines',
  'radar', 'strategicnuclear',
  'cables', 'traderoutes', 'chokepoints', 'arcticroutes', 'fisheries', 'oceancurrents',
  'volcanoes', 'earthquakes', 'wildfires',
  'whales', 'seaturtles', 'birds', 'elephants',
  'spacedebris',
  'webcams',
  'cargoroutes', 'spaceports', 'seaice', 'lightning', 'ports',
  'commodityflows', 'ixps', 'oceantemp', 'meteors',
  'cosmic', 'ionosphere', 'fishingfleets', 'arcticdeposits',
];

const catalogSrc = readText('js/layercatalog.js');
for (const key of EXPECTED_CATALOG_KEYS) {
  test(`layercatalog.js — key "${key}" registered`, () => {
    assert(catalogSrc.includes(`key: '${key}'`), `Missing catalog entry for key: ${key}`);
  });
}

// =========================================================
// 4. GLOBE.JS STATE VALIDATION
// =========================================================
console.log('\n=== GLOBE STATE VALIDATION ===\n');

const globeSrc = readText('js/globe.js');
for (const key of EXPECTED_CATALOG_KEYS) {
  test(`globe.js — layers.${key} defined`, () => {
    const pattern = new RegExp(`${key}:\\s*(true|false)`);
    assert(pattern.test(globeSrc), `Missing layers.${key} in globe.js`);
  });

  // replay is in entityMaps but not in layers; some keys may not need entityMaps
  test(`globe.js — entityMaps.${key} defined`, () => {
    assert(globeSrc.includes(`${key}:`), `Missing entityMaps entry for ${key}`);
  });
}

// =========================================================
// 5. APP.JS WIRING VALIDATION
// =========================================================
console.log('\n=== APP.JS WIRING ===\n');

const appSrc = readText('js/app.js');

const LOADER_KEYS = [
  'mines', 'infra', 'nuclear', 'airports', 'bases', 'webcams',
  'arcticmining', 'rareearth', 'drilling',
  'powerplants', 'nuclearplants', 'refineries', 'platforms',
  'radar', 'strategicnuclear', 'volcanoes',
  'cables', 'pipelines', 'traderoutes', 'arcticroutes',
  'electricalgrid', 'chokepoints', 'fisheries',
  'earthquakes', 'wildfires',
  'whales', 'seaturtles', 'birds', 'elephants',
  'spacedebris', 'oceancurrents',
  'cargoroutes', 'spaceports', 'seaice', 'lightning', 'ports',
  'commodityflows', 'ixps', 'oceantemp', 'meteors',
  'cosmic', 'ionosphere', 'fishingfleets', 'arcticdeposits',
];

for (const key of LOADER_KEYS) {
  test(`app.js — LAYER_LOADERS has "${key}"`, () => {
    assert(appSrc.includes(`${key}:`), `Missing LAYER_LOADERS entry for ${key}`);
  });
}

// =========================================================
// 6. INDEX.HTML COUNT SPANS
// =========================================================
console.log('\n=== INDEX.HTML COUNT SPANS ===\n');

const htmlSrc = readText('index.html');

const COUNT_IDS = [
  'mil-count', 'civ-count', 'sat-count', 'ship-count', 'pogo-count',
  'mines-count', 'infra-count', 'nuclear-count', 'airport-count', 'bases-count',
  'webcam-count', 'arcticmining-count', 'rareearth-count', 'drilling-count',
  'powerplants-count', 'nuclearplants-count', 'refineries-count', 'platforms-count',
  'radar-count', 'strategicnuclear-count', 'volcanoes-count',
  'cables-count', 'pipelines-count', 'traderoutes-count', 'arcticroutes-count',
  'electricalgrid-count', 'chokepoints-count', 'fisheries-count',
  'earthquakes-count', 'wildfires-count',
  'whales-count', 'seaturtles-count', 'birds-count', 'elephants-count',
  'spacedebris-count', 'oceancurrents-count',
  'cargoroutes-count', 'spaceports-count', 'seaice-count', 'lightning-count', 'ports-count',
  'commodityflows-count', 'ixps-count', 'oceantemp-count', 'meteors-count',
  'cosmic-count', 'ionosphere-count', 'fishingfleets-count', 'arcticdeposits-count',
];

for (const id of COUNT_IDS) {
  test(`index.html — span#${id} exists`, () => {
    assert(htmlSrc.includes(`id="${id}"`), `Missing count span: ${id}`);
  });
}

// =========================================================
// SUMMARY
// =========================================================
console.log('\n' + '='.repeat(50));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) {
    console.log(`  ✗ ${f.name}: ${f.error}`);
  }
}
console.log('='.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);
