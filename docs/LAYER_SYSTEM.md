# Panopticon Layer System

**Version:** 3.0
**Last updated:** 2026-03-21

This document describes the data layer architecture (how layers are defined, registered, loaded, and consumed by the wargame AI) and the view system (how clicking entities opens detail panels).

For detailed JSON schemas of all data types (point, path, region, playback, manifests), see [DATA_SPEC.md](DATA_SPEC.md).

---

## Overview

Panopticon renders 100+ data layers on a CesiumJS globe. Each layer has one of six types: **point** (billboards), **path** (polylines), **region** (polygons), **live** (streaming multi-geometry), **scenario** (ephemeral wargame entities), or **ambient** (sidebar panels for markets, feeds, or other non-globe data). The system uses three patterns:

1. **Layer Registry** — central registration and data caching
2. **Layer Factories** — shared logic for the three globe entity types (point, path, region)
3. **Self-Registration** — each layer module registers itself at import time

Clicking an entity opens a **view** — a pair of detail panels. The view system uses a parallel registry pattern so layers declare their view type at registration time rather than requiring bespoke dispatch logic.

---

## Architecture

```
js/layerregistry.js          Central layer registry (pure leaf module, no deps)
js/viewregistry.js           Central view registry (pure leaf module, no deps)
js/viewbase.js               Shared view utilities (Cesium viewer init, HUD, animation)
    ↑
js/layers/datalayer.js       Point factory (createDataLayer)
js/layers/pathlayer.js       Path factory (createPathLayer)
js/layers/regionlayer.js     Region factory (createRegionLayer)
    ↑
js/layers/*.js               Individual layer modules (self-register)
    ↑
js/layers/index.js           Barrel file (imports all for side effects)
    ↑
js/app.js                    Imports barrel → all layers registered
                             Imports view modules → all views registered
```

### Key files

| File | Role |
|------|------|
| `js/layerregistry.js` | Layer registry: `registerLayerLoader()`, `cacheLayerData()`, `getLoader()`, `getLayerData()` |
| `js/viewregistry.js` | View registry: `registerView()`, `getView()`, `closeAllViews()`, `resizeAllViews()` |
| `js/viewbase.js` | Shared view utilities: detail viewer init, HUD overlay, animation loops |
| `js/layers/datalayer.js` | Factory for point/billboard layers |
| `js/layers/pathlayer.js` | Factory for polyline layers |
| `js/layers/regionlayer.js` | Factory for polygon layers |
| `js/layers/index.js` | Barrel file — imports all layer modules |
| `js/globe.js` | Defines `layers` (visibility flags) and `entityMaps` (entity stores) |

---

## Layer Types

Every layer declares a `layerType` at registration. Six types:

| Type | Factory | Data Source | Rendering | Default Modalities | Lifecycle |
|------|---------|-------------|-----------|-------------------|-----------|
| `point` | `createDataLayer` | Static JSON (`data/layers/points/`) | Billboards with labels | `text`, `geospatial` | Persistent |
| `path` | `createPathLayer` | Static JSON (`data/layers/paths/`) | Polylines | `text`, `geospatial` | Persistent |
| `region` | `createRegionLayer` | Static JSON (`data/layers/regions/`) | Polygons | `text`, `geospatial` | Persistent |
| `live` | *(bespoke)* | Streaming APIs (HTTP polling, WebSocket) | Multi-geometry (billboards + trails + footprints) | `text`, `geospatial` | Persistent |
| `scenario` | *(wargame engine)* | Inline in scenario JSON | Points with labels | `text`, `geospatial` | Ephemeral (wargame session) |
| `ambient` | *(future)* | TBD | Sidebar panels (markets, prices, feeds) | `text`, `structured_json` | Persistent |

Point, path, and region layers render entities on the CesiumJS globe using their respective factory patterns. Live layers manage their own entity lifecycle using `livelayer.js` helpers and may render multiple geometry types per entity (e.g. satellites render billboards + orbit arcs + ground footprints). Scenario layers are ephemeral — created by the wargame engine on session start and destroyed on session end. They participate in the entity system (click dispatch, detail panels) via `acData` stamps but are not user-togglable in the layer selector. Ambient layers will use a separate rendering strategy (sidebar panels, charts, tickers). No ambient layers exist yet.

**Future:** Live layers will be consumable by the wargame engine — real-time satellite positions, aircraft tracks, and vessel locations will be available as geographic context for AI decision-making. This will require a live data summarization strategy parallel to the static `summarizeLayerData()` approach.

---

## Layer Registry API

```javascript
import {
  registerLayerLoader,  // (key, { load, flyTo, reset, dataUrl, view, layerType, modalities }) → void
  cacheLayerData,       // (key, rawJSON) → void
  getLoader,            // (key) → { load, flyTo, reset, dataUrl, view, layerType } | null
  hasLoader,            // (key) → boolean
  getLayerData,         // (key) → rawJSON | null
  isLayerDataCached,    // (key) → boolean
  resetAllLayers,       // () → void  (calls every layer's reset())
  getRegisteredKeys,    // () → string[]
  getCachedLayerKeys,   // () → string[]
  getViewForLayer,      // (key) → string | null
  getLayerType,         // (key) → 'point' | 'path' | 'region' | 'live' | 'scenario' | 'ambient'
  getLayerModalities,   // (key) → string[]  (e.g. ['text', 'geospatial'] or ['text', 'image', 'video'])
} from './layerregistry.js';
```

### Registration

Each layer module calls `registerLayerLoader()` at module scope:

```javascript
registerLayerLoader('nuclearplants', {
  load:       layer.load,      // (viewer) => Promise<void>
  flyTo:      layer.FLY_TO,    // { lon, lat, alt }
  reset:      layer.reset,     // () => void
  dataUrl:    'data/layers/points/nuclear_plants.json',
  view:       'site',          // optional — which view type opens on click
  layerType:  'point',         // optional — 'point' (default), 'path', 'region', 'live', 'scenario', or 'ambient'
  modalities: ['text', 'image', 'video'],  // optional — override default modalities (see below)
});
```

The `view` field declares which view type opens when entities from this layer are clicked. See [View System](#view-system) below.

The `layerType` field declares the layer's rendering type: `'point'` (default), `'path'`, `'region'`, `'live'`, or `'ambient'`.

The `modalities` field optionally overrides the default modalities inferred from `layerType` (see table above). Use this for layers that provide non-standard data types — for example, a surveillance camera layer that provides video feeds would declare `modalities: ['text', 'image', 'video']`. Most layers do not need this field; the defaults are correct for all current layers.

The `getLayerModalities(key)` function returns the effective modalities for a layer (explicit override if set, otherwise inferred from `layerType`). This is used by the safety-dance compatibility system to determine what input modalities a wargame scenario requires when it references layers.

### Data Caching

The three factories call `cacheLayerData(key, data)` after fetching JSON. This makes the raw data available to the wargame engine for AI prompt generation via `getLayerData(key)`.

---

## Layer Factories

### Point Layer (`createDataLayer`)

Renders geographic points as billboards with labels.

```javascript
import { createDataLayer } from './datalayer.js';

const layer = createDataLayer({
  layerKey:   'nuclearplants',           // Key in layers{} and entityMaps{}
  dataUrl:    'data/layers/points/nuclear_plants.json',
  idPrefix:   'nuke',                    // Entity ID prefix
  categories: {                          // Data file top-level keys → display config
    operating: { icon: 'nuclear', color: '#00ff41', label: 'NUCLEAR' },
    shutdown:  { icon: 'nuclear', color: '#666666', label: 'SHUTDOWN' },
  },
  viewType:   'site',                    // View that opens on click (default: 'site')
  flyTo:      { lon: 0, lat: 30, alt: 20_000_000 },
  iconSize:   28,
  countId:    'nuclearplants-count',      // DOM element for count display
  logLabel:   'NUCLEAR',
  descFn:     (item, cat) => `${item.operator} // ${item.country} // ${item.capacity_mw} MW`,
});
```

The factory stamps `_view: cfg.viewType || 'site'` on every entity's `acData`, enabling data-driven click dispatch.

**Optional hooks** for advanced layers (airports, webcams, etc.):

| Hook | Signature | Default | Purpose |
|------|-----------|---------|---------|
| `labelFn` | `(item, cat) → string` | `item.name` | Custom billboard label text |
| `idFn` | `(item, cat) → string` | `{idPrefix}_{cat}_{item.name}` | Custom entity ID |
| `descFn` | `(item, cat) → string` | `{operator} // {country} // {notes}` | Description string |
| `acDataFn` | `(item, cat) → object` | `{}` | Extra fields merged into `acData` |
| `altFn` | `(item) → number` | `500` | Entity altitude in meters |

**Per-category overrides** in the `categories` config:

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `iconSize` | `number` | `cfg.iconSize` | Billboard size for this category |
| `displayDist` | `number` | *(none)* | Max billboard visibility distance in meters |
| `labelDist` | `number` | `3_000_000` | Max label visibility distance in meters |

**Expected data format:**
```jsonc
{
  "_source": { ... },
  "operating": [
    { "name": "Kashiwazaki-Kariwa", "lat": 37.43, "lon": 138.6, "country": "Japan",
      "operator": "TEPCO", "capacity_mw": 7965 }
  ],
  "shutdown": [ ... ]
}
```

### Path Layer (`createPathLayer`)

Renders polylines (cables, pipelines, routes, migrations).

```javascript
import { createPathLayer } from './pathlayer.js';

const layer = createPathLayer({
  layerKey:   'cables',
  dataUrl:    'data/layers/paths/submarine_cables.json',
  idPrefix:   'cable',
  categories: {
    transatlantic: { color: '#00aaff', width: 2, label: 'CABLE', clamp: true, alpha: 0.8 },
    transpacific:  { color: '#00ddff', width: 2, label: 'CABLE', clamp: true, alpha: 0.8 },
  },
  viewType:   'site',                    // View that opens on click (default: 'site')
  flyTo:      { lon: -30, lat: 30, alt: 20_000_000 },
  countId:    'cables-count',
  logLabel:   'CABLES',
});
```

Coordinates are `[lon, lat]` pairs. The factory places a label at the midpoint.

**Expected data format:**
```jsonc
{
  "_source": { ... },
  "transatlantic": [
    { "name": "TAT-14", "coords": [[-1.2, 50.8], [-30, 45], [-65.5, 41.3]],
      "operator": "Telia", "country": "UK-US" }
  ]
}
```

### Region Layer (`createRegionLayer`)

Renders polygons (EEZs, conflict zones, fisheries).

```javascript
import { createRegionLayer } from './regionlayer.js';

const layer = createRegionLayer({
  layerKey:   'fisheries',
  dataUrl:    'data/layers/regions/fisheries_zones.json',
  idPrefix:   'fish',
  categories: {
    eez: { fillColor: '#0066cc', outlineColor: '#00aaff', label: 'EEZ', alpha: 0.15 },
  },
  viewType:   'site',                    // View that opens on click (default: 'site')
  flyTo:      { lon: 0, lat: 0, alt: 20_000_000 },
  countId:    'fisheries-count',
  logLabel:   'FISHERIES',
});
```

**Expected data format:**
```jsonc
{
  "_source": { ... },
  "eez": [
    { "name": "US Atlantic EEZ",
      "rings": [[[-80, 25], [-65, 25], [-65, 45], [-80, 45], [-80, 25]]],
      "country": "US" }
  ]
}
```

`rings[0]` is the outer boundary. `rings[1+]` are holes (optional).

---

## View System

When a user clicks an entity, a **view** opens — a pair of detail panels:

- **Minor view** — smaller top panel with a canvas overlay (HUD chrome, stats, custom rendering)
- **Major view** — larger bottom panel with a secondary Cesium viewer or embedded content

### View Types

| View Type | Module | Minor View | Major View |
|-----------|--------|------------|------------|
| `plane` | `js/planeview.js` | Flight profile + HUD overlay | 3D aircraft close-up with flight path |
| `site` | `js/siteview.js` | Site intel + mine reconstruction | 3D site close-up with terrain |
| `airport` | `js/airportview.js` | Airport intel + FIDS schedules | 3D airport close-up |
| `satellite` | `js/satview.js` | Orbital profile + footprint | 3D satellite close-up |
| `webcam` | `js/webcamview.js` | Info overlay | HLS/YouTube live stream |

### View Architecture

```
js/viewregistry.js       Registry: registerView(), getView(), closeAllViews()
js/viewbase.js           Shared utilities (extracted from 5 view modules)
    ↑
js/planeview.js          Self-registers as 'plane'
js/siteview.js           Self-registers as 'site'
js/airportview.js        Self-registers as 'airport'
js/satview.js            Self-registers as 'satellite'
js/webcamview.js         Self-registers as 'webcam'
```

### View Registry API

```javascript
import {
  registerView,    // (viewType, { open, close, isOpen, resize }) → void
  getView,         // (viewType) → { open, close, isOpen, resize } | null
  closeAllViews,   // (viewer) → void
  resizeAllViews,  // () → void
  getViewTypes,    // () → string[]
} from './viewregistry.js';
```

Each view module self-registers at import time:

```javascript
registerView('site', {
  open:   (viewer, entity) => openSiteView(viewer, entity),
  close:  (viewer)         => closeSiteView(viewer),
  isOpen: ()               => isSiteViewOpen(),
  resize: ()               => resizeSitePanel(),
});
```

### Shared View Utilities (`viewbase.js`)

Extracted from 5 view modules to eliminate ~60-70% code duplication:

| Function | Purpose |
|----------|---------|
| `getEntityPosition(entity)` | Extract lat/lon/alt from a Cesium entity |
| `createDetailViewer(containerId)` | Initialize a stripped-down Cesium Viewer for detail panels |
| `startAnimLoop(renderFn)` | Start a requestAnimationFrame loop, returns `{ stop() }` handle |
| `drawHudOverlay(ctx, W, H, hudColor, opts)` | Render HUD chrome (vignette, scanlines, brackets, scan line) |
| `setupOverlayCanvas(canvas)` | DPR-aware canvas setup, returns `{ ctx, W, H }` |
| `computeFootprintKm(altM)` | Satellite/aircraft ground footprint radius |
| `computeCirclePositions(lon, lat, radiusDeg, n)` | Generate circle polygon for footprint rendering |
| `seededRandom(seed)` / `hashName(name)` | Deterministic random for procedural detail |
| `extractOperator(desc)` / `extractCountry(desc)` / `extractNotes(desc)` | Parse entity description strings |

### Click Dispatch

Click dispatch is **data-driven** via the `_view` field on each entity's `acData`:

```javascript
// In app.js click handler:
closeAllViews(viewer);
const viewType = ac._view || 'plane';
const view = getView(viewType);
if (view) view.open(viewer, picked.id);
```

Every entity creation site stamps `_view` on `acData`:

| Entity Source | `_view` Value |
|---------------|---------------|
| Point factory (`datalayer.js`) | `cfg.viewType \|\| 'site'` |
| Path factory (`pathlayer.js`) | `cfg.viewType \|\| 'site'` |
| Region factory (`regionlayer.js`) | `cfg.viewType \|\| 'site'` |
| `airports.js` | `'airport'` |
| `webcams.js` | `'webcam'` |
| `satellites.js` | `'satellite'` |
| `commercial.js` (live aircraft) | `'plane'` |
| `adsb.js` adapter (playback aircraft) | `'plane'` |
| `ships.js` (AIS vessels) | `'plane'` |
| `pogo.js` (Pokestops) | `'site'` |
| `custom.js` (user datasets) | `'site'` |

### Adding a New View Type

1. Create `js/<viewname>view.js`
2. Import from `viewbase.js` for shared utilities
3. Call `registerView('<viewname>', { open, close, isOpen, resize })` at module scope
4. Import the module in `js/app.js` for side-effect registration
5. Set `_view: '<viewname>'` on entities that should open this view
6. Declare `view: '<viewname>'` in layer registration

---

## Live Tracking Layers

Live layers (`layerType: 'live'`) use real-time data feeds rather than static JSON files. They self-register with the layer registry and use `livelayer.js` helpers for entity lifecycle management.

| Layer | File | Transport | Source | Geometries |
|-------|------|-----------|--------|------------|
| `military` | `js/layers/military.js` | HTTP polling | ADS-B Exchange API | billboard + trail polyline |
| `commercial` | `js/layers/commercial.js` | HTTP polling | OpenSky Network API | billboard + trail polyline |
| `satellites` | `js/layers/satellites.js` | HTTP + SGP4 | Celestrak TLE data | billboard + orbit arc + footprint polygon |
| `ships` | `js/layers/ships.js` | WebSocket | AISStream.io | billboard |
| `pokemon` | `js/layers/pogo.js` | HTTP + Overpass | OpenStreetMap | billboard |

Live layers don't use the factories (`createDataLayer`, etc.) because they manage continuously updating entities with streaming transports. They share entity creation/update/removal utilities from `livelayer.js` (`createLiveEntity`, `updateLiveEntity`, `pruneStale`, `pruneByAge`).

Note: `airports` and `webcams` were formerly bespoke but now use the point factory with optional hooks.

---

## Scenario Layers

Scenario layers (`layerType: 'scenario'`) are ephemeral entities created by the wargame engine. Unlike all other layer types, they exist only for the duration of a wargame session and are not user-togglable in the layer selector.

| Entity Map | Source | Contents | Movement |
|------------|--------|----------|----------|
| `wg_blue` | `scenario.blue_forces` | Friendly units (command centers, silos, bases) | Static |
| `wg_red` | `scenario.red_contacts` | Threat contacts (inbound tracks, unknowns) | Scripted traces (interpolated per tick) |

**Entity contract:** Scenario entities participate in the standard entity system — they carry `acData` with `_view: 'site'`, `hex`, `r`, `t`, `desc`, enabling click dispatch and detail panel views. They are registered in `entityMaps` (`wg_blue`, `wg_red`) so the view system can resolve them.

**Lifecycle:** Created by `handleStarted()` in `wargame.js` (blue forces) and `handleTick()` (red contacts, created on first appearance). Destroyed by `clearEntities()` when the wargame ends, which also clears the ephemeral entity maps.

**Data source:** Unlike other layers, scenario entity data is inline in the scenario JSON file, not in separate data files. Blue forces have static positions; red contacts have `trace` arrays with tick-indexed waypoints that the simulation engine interpolates.

---

## Data File Requirements

Every JSON file in `data/layers/` must conform to the schema for its layer type. Full schemas with field-level detail, validation rules, and complete examples are in **[DATA_SPEC.md](DATA_SPEC.md)**.

Key requirements:
- **`_source` metadata** — required on every data file, with specific origin (see [DATA_SPEC.md §1](DATA_SPEC.md#1-source-metadata))
- **Ingestion script** — every data file must have `scripts/ingest_<layer>.py` that can reproduce it
- **Point items** — `name`, `lat`, `lon` required; `country`, `operator`, `notes` optional (see [DATA_SPEC.md §2](DATA_SPEC.md#2-point-layer-data))
- **Path items** — `name`, `coords` (as `[lon, lat]` pairs) required (see [DATA_SPEC.md §3](DATA_SPEC.md#3-path-layer-data))
- **Region items** — `name`, `rings` (array of `[lon, lat]` rings) required (see [DATA_SPEC.md §4](DATA_SPEC.md#4-region-layer-data))

---

## Capability Layers (Tools & Monitors)

Layers are the **atomic unit of capability** in Panopticon. A layer can bundle data, tools, monitors, and state defaults in one self-contained file.

### Three-Tier Tool Resolution

1. **General tools** (`scenarios/general-tools.json`) — always available to every scenario: `list_data_layers`, `query_data_layer`, `send_message`, `submit_assessment`, `flag_activity`, `no_action`, `terminal_flag_activity`
2. **Layer tools/monitors** — included automatically when a layer appears in `scenario.layers`
3. **Scenario inline** — escape hatch for one-off custom tools/monitors defined directly in the scenario JSON

### Layer Capability Schema

Layer data files may include optional `_tools`, `_monitors`, and `_defaults` keys:

```json
{
  "_source": { ... },
  "_tools": {
    "tool_name": {
      "category": "intelligence",
      "description": "What this tool does",
      "parameters": { "param": { "type": "string", "description": "..." } },
      "required": ["param"],
      "terminal": false
    }
  },
  "_monitors": {
    "monitor_name": {
      "description": "Queryable state source",
      "state_key": "worldState.key"
    }
  },
  "_defaults": {
    "state_key": { "initial": "values" }
  }
}
```

### Capability Layer Files

Pure capability layers (tools/monitors only, no geographic data) live in `data/layers/ambient/`:

| Layer | Tools | Monitors |
|-------|-------|----------|
| `law_enforcement` | request_search_warrant, interview_person, deploy_field_agents, warrantless_search, warrantless_wiretap, bulk_cell_surveillance | case_file, threat_assessment, warrant_status, public_cameras, public_records |
| `defense_systems` | drone_strike, cruise_missile_strike, deploy_uav, cyber_operation | defense_network, operational_status, program_communications |
| `financial_ops` | place_market_order, request_funding, transfer_funds | account_balance, funding_status |
| `diplomacy` | *(none)* | diplomatic_channels, hostage_situation |
| `isr` | task_sar_satellite, check_surveillance | mission_brief |

### Layer Inclusion with Exclusions

Scenario `layers` array supports both string (include everything) and object (with exclusions):

```json
"layers": [
  "submarine_cables",
  "financial_ops",
  { "key": "defense_systems", "excludeTools": ["cruise_missile_strike"] },
  { "key": "isr", "excludeMonitors": ["mission_brief"] }
]
```

### Modality Inheritance

Layers without explicit `_monitors` or `_tools` automatically inherit capabilities based on their geometric type. This happens at resolution time — no layer JSON files need editing.

**Auto-generated monitors:** Every layer gets a monitor entry derived from `_source.description` and its layer type. This makes every layer discoverable and queryable by the AI via `list_data_layers` / `query_data_layer`.

**Modality tools** — three tools, one per geometric type, injected once per type (not per layer):

| Modality | Tool | Description |
|----------|------|-------------|
| `point` | `find_nearest` | Proximity search — returns entities sorted by distance from given coordinates |
| `path` | `find_paths_near` | Finds polyline routes that pass within a radius of given coordinates |
| `region` | `find_regions_containing` | Point-in-polygon containment — which regions CONTAIN given coordinates |

These tools take a `layer` parameter so the AI specifies which layer to query. They complement `query_data_layer` with optimized spatial queries.

**Override behavior:** Layers with explicit `_monitors` or `_tools` (capability layers) use their own definitions — inheritance only applies to layers without them.

### Resolution Flow

In `loadScenario()` (server) and the browser wargame init:

1. `resolveLayerCapabilities(scenario.layers, loadFn, getLayerTypeFn)` processes each layer:
   - Extracts explicit `_tools`/`_monitors`/`_defaults` from layer data (capability layers)
   - Auto-generates monitor entries for layers without `_monitors` (from `_source.description`)
   - Injects modality tools for layers without `_tools` (one per geometric type, deduplicated)
   - Applies exclusion lists
2. Scenario-level inline `tools`/`monitors` are merged as overrides (scenario wins on conflict)
3. General tools are always injected
4. `_layerDefaults` are merged into world state before `variant_state` overrides

Core function: `resolveLayerCapabilities()` in `js/toolformat.mjs`.

### State Default Merge Order

1. Layer `_defaults` (from each layer in order)
2. Scenario `variant_state[variant]` overrides
3. Template variable overrides (`initial_cash`, `credit_line`)
4. Dynamic generation (e.g. `public_records` from suspect data)

---

## Wargame Integration

When a scenario declares `"layers": ["cables", "chokepoints"]`, the wargame engine:

1. **Auto-enables** those layers on the globe (loads data, shows entities)
2. **Summarizes** each layer's data for the AI prompt using `summarizeLayerData()` from `simulation.mjs`
3. The summary appears in the `GEOGRAPHIC CONTEXT` section of the AI prompt:

```
GEOGRAPHIC CONTEXT:
SUBMARINE CABLES (12 entries) [showing nearest 15]:
  - TAT-14, UK-US, 45.0N 30.0W, 890km away
  - AC-1, UK-US, 47.2N 25.3W, 650km away
  ...
```

The summarizer handles point, path, and region layers and supports proximity filtering via `nearLat`, `nearLon`, `nearRadiusKm`.

**Scenario entities** (blue forces and red contacts) are also fed to the AI prompt, but through the dedicated `buildPrompt()` function in `simulation.mjs` rather than through `summarizeLayerData()`. Blue forces appear in `BLUE FORCE STATUS` and red contacts in `RED CONTACTS`, both with positions and types. These scenario entities carry `acData` stamps and are clickable in the globe view during wargame sessions.

**Planned: Live layer integration.** Live layers (satellites, aircraft, vessels) will be consumable by wargame scenarios as real-time geographic context. This will require a `summarizeLiveData()` function that snapshots current entity positions from `entityMaps` and formats them for the AI prompt. Scenarios will be able to declare live layers alongside static ones (e.g. `"layers": ["cables", "satellites", "military"]`) to give the AI awareness of real-time positions during decision-making.

---

## Adding a New Layer

### Geographic Data Layer (point/path/region)

1. Create the data file in the appropriate subdirectory with `_source` metadata:
   - Point layers: `data/layers/points/<layer>.json`
   - Path layers: `data/layers/paths/<layer>.json`
   - Region layers: `data/layers/regions/<layer>.json`
2. Create the ingestion script: `scripts/ingest_<layer>.py`
3. Optionally add `_tools`, `_monitors`, `_defaults` to the data file if the layer provides wargame capabilities
4. Create the layer module: `js/layers/<layer>.js`
   - Use the appropriate factory (`createDataLayer`, `createPathLayer`, `createRegionLayer`)
   - Set `viewType` in factory config if not `'site'` (e.g. `viewType: 'airport'`)
   - Call `registerLayerLoader()` at module scope, including `layerType` and `view` fields
5. Add the import to `js/layers/index.js`
6. Add a layer key entry to `js/globe.js` in the `layers` and `entityMaps` objects
7. Add to `js/layercatalog.js` for the searchable layer dropdown
8. Add the key → path mapping to `LAYER_DATA_FILES` in `server/index.js`
9. If using a new view type, create the view module and register it (see [Adding a New View Type](#adding-a-new-view-type))

### Capability Layer (tools/monitors only, no globe visualization)

1. Create the data file in `data/layers/ambient/<layer>.json` with `_source`, `_tools`, `_monitors`, `_defaults`
2. Create the ingestion script: `scripts/ingest_<layer>.py`
3. Add the key → path mapping to `LAYER_DATA_FILES` in `server/index.js`
4. Add tool handlers for any new tools in `server/toolhandlers.mjs`
5. Add the layer key to any scenario's `layers` array to make its tools/monitors available

---

## Registered Layer Keys

Current layer keys (as of 2026-03-16, 169 catalog entries across 22 categories):

**Live layers (4):** `military`, `commercial`, `satellites`, `ships`

**Critical Minerals (42):** `lithium`, `cobalt`, `nickel`, `graphite`, `manganese`, `vanadium`, `reelight`, `reeheavy`, `copper`, `bauxite`, `silicon`, `tin`, `gallium`, `germanium`, `indium`, `tantalum`, `niobium`, `tungsten`, `titanium`, `beryllium`, `chromium`, `antimony`, `platinum`, `palladium`, `uranium`, `tellurium`, `fluorspar`, `magnesium`, `zinc`, `phosphate`, `iridium`, `rhodium`, `molybdenum`, `zirconium`, `hafnium`, `selenium`, `bismuth`, `cadmium`, `silver`, `scandium`

**Point layers:** `mines`, `arcticmining`, `rareearth`, `drilling`, `powerplants`, `nuclearplants`, `refineries`, `platforms`, `radar`, `strategicnuclear`, `bases`, `infra`, `volcanoes`, `earthquakes`, `wildfires`, `lightning`, `meteors`, `spacedebris`, `spaceports`, `ports`, `ixps`, `oceantemp`, `cosmic`, `ionosphere`, `arcticdeposits`, `airports`, `headsofstate`, `wikipedia`

**Webcam layers (13):** `webcams`, `webcams_cities`, `webcams_beaches`, `webcams_landmarks`, `webcams_wildlife`, `webcams_aviation`, `webcams_maritime`, `webcams_volcanoes`, `webcams_rail`, `webcams_space`, `webcams_aurora`, `webcams_nature`, `webcams_traffic`

**Path layers:** `cables`, `pipelines`, `traderoutes`, `arcticroutes`, `electricalgrid`, `whales`, `seaturtles`, `birds`, `elephants`, `oceancurrents`, `cargoroutes`, `commodityflows`

**Region layers:** `chokepoints`, `fisheries`, `seaice`, `fishingfleets`

**Market/Ambient layers (5):** `kalshi`, `crypto`, `commodities`, `news`, `whalebtc`

**Scenario layers (3):** `profiles`, `kalshi_scenario`, `surveillance_cameras_scenario`

**Capability layers (5):** `law_enforcement`, `defense_systems`, `financial_ops`, `diplomacy`, `isr`

**Ridiculous (1):** `pokemon`
