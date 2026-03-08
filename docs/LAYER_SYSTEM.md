# Panopticon Layer System

**Version:** 2.0
**Last updated:** 2026-03-07

This document describes the data layer architecture (how layers are defined, registered, loaded, and consumed by the wargame AI) and the view system (how clicking entities opens detail panels).

---

## Overview

Panopticon renders 45+ data layers on a CesiumJS globe. Each layer is a collection of entities — **geographic** (rendered on the globe as points, polylines, or polygons) or **non-geographic** (rendered as sidebar panels for markets, feeds, or other ambient data). The system uses three patterns:

1. **Layer Registry** — central registration and data caching
2. **Layer Factories** — shared logic for the three geographic entity types (point, path, region)
3. **Self-Registration** — each layer module registers itself at import time

Clicking a geographic entity opens a **view** — a pair of detail panels. The view system uses a parallel registry pattern so layers declare their view type at registration time rather than requiring bespoke dispatch logic.

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

### Geographic Layers

Geographic layers render entities on the 3D globe. Three subtypes:

- **Point layers** — billboards with labels (mines, nuclear plants, airports, radar stations)
- **Path layers** — polylines (submarine cables, pipelines, migration routes, ocean currents)
- **Region layers** — polygons (fisheries zones, sea ice extent, chokepoints)

All geographic layers use the factory pattern (`createDataLayer`, `createPathLayer`, `createRegionLayer`) unless they need truly unique rendering.

### Non-Geographic Layers (Future)

Non-geographic layers render as sidebar panels, not on the globe. Planned examples:

- Prediction markets (Kalshi, Polymarket)
- Stock/crypto prices
- News feeds
- Sensor data streams

These will register with `geographic: false` in the layer registry. The layer catalog UI and wargame engine will handle them distinctly from geographic layers.

---

## Layer Registry API

```javascript
import {
  registerLayerLoader,  // (key, { load, flyTo, reset, dataUrl, view, geographic }) → void
  cacheLayerData,       // (key, rawJSON) → void
  getLoader,            // (key) → { load, flyTo, reset, dataUrl, view, geographic } | null
  hasLoader,            // (key) → boolean
  getLayerData,         // (key) → rawJSON | null
  isLayerDataCached,    // (key) → boolean
  resetAllLayers,       // () → void  (calls every layer's reset())
  getRegisteredKeys,    // () → string[]
  getCachedLayerKeys,   // () → string[]
  getViewForLayer,      // (key) → string | undefined
  isLayerGeographic,    // (key) → boolean (defaults true)
} from './layerregistry.js';
```

### Registration

Each layer module calls `registerLayerLoader()` at module scope:

```javascript
registerLayerLoader('nuclearplants', {
  load:       layer.load,      // (viewer) => Promise<void>
  flyTo:      layer.FLY_TO,    // { lon, lat, alt }
  reset:      layer.reset,     // () => void
  dataUrl:    'data/nuclear_plants.json',
  view:       'site',          // optional — which view type opens on click
  geographic: true,            // optional — defaults to true
});
```

The `view` field declares which view type opens when entities from this layer are clicked. See [View System](#view-system) below.

The `geographic` field marks whether this layer renders on the globe (`true`, default) or as a sidebar panel (`false`).

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
  dataUrl:    'data/nuclear_plants.json',// JSON data file
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
  dataUrl:    'data/submarine_cables.json',
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
  dataUrl:    'data/fisheries_zones.json',
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

When a user clicks a geographic entity, a **view** opens — a pair of detail panels:

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

## Bespoke Layers

Some layers don't use the factories. These manually call `registerLayerLoader()` and `cacheLayerData()`:

| Layer | File | Reason |
|-------|------|--------|
| `airports` | `js/layers/airports.js` | Custom icon sizing by airport class |
| `webcams` | `js/layers/webcams.js` | Hardcoded list, HLS/YouTube streams |

Note: `mines`, `infrastructure`, and `militarybases` were formerly bespoke but now use the point factory pattern (`createDataLayer`).

---

## Data File Requirements

Every JSON file in `data/` **must** include a `_source` field at the top level:

```jsonc
{
  "_source": {
    "description": "Global nuclear power plant locations and capacities",
    "origin": "IAEA Power Reactor Information System (PRIS) — pris.iaea.org",
    "retrieved": "2026-03-07",
    "license": "public domain",
    "notes": "Approximate coordinates for some facilities"
  },
  "operating": [ ... ],
  "shutdown": [ ... ]
}
```

Every data file **must** have a corresponding ingestion script in `scripts/`:
- Pattern: `scripts/ingest_<layer>.py` → `data/<layer>.json`
- The script must be runnable: `python3 scripts/ingest_<layer>.py`
- See `scripts/prepare_airports.py` for the reference implementation

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

The summarizer handles all three geographic data shapes (points, paths, regions) and supports proximity filtering via `nearLat`, `nearLon`, `nearRadiusKm`. Non-geographic layers will require a separate summarization strategy.

---

## Adding a New Layer

1. Create the data file: `data/<layer>.json` with `_source` metadata
2. Create the ingestion script: `scripts/ingest_<layer>.py`
3. Create the layer module: `js/layers/<layer>.js`
   - Use the appropriate factory (`createDataLayer`, `createPathLayer`, `createRegionLayer`)
   - Set `viewType` in factory config if not `'site'` (e.g. `viewType: 'airport'`)
   - Call `registerLayerLoader()` at module scope, including `view` and `geographic` fields
4. Add the import to `js/layers/index.js`
5. Add a layer key entry to `js/globe.js` in the `layers` and `entityMaps` objects
6. Add to `js/layercatalog.js` for the searchable layer dropdown
7. If using a new view type, create the view module and register it (see [Adding a New View Type](#adding-a-new-view-type))

---

## Registered Layer Keys

Current layer keys (as of 2026-03-07):

**Point layers:** `mines`, `infrastructure`, `militarybases`, `arcticmining`, `rareearth`, `drillingleases`, `powerplants`, `nuclearplants`, `refineries`, `platforms`, `radar`, `strategicnuclear`, `volcanoes`, `earthquakes`, `wildfires`, `spacedebris`, `spaceports`, `lightning`, `ports`, `ixps`, `oceantemp`, `meteors`, `cosmic`, `ionosphere`, `arcticdeposits`

**Path layers:** `cables`, `pipelines`, `traderoutes`, `arcticroutes`, `electricalgrid`, `whales`, `seaturtles`, `birds`, `elephants`, `oceancurrents`, `cargoroutes`, `commodityflows`

**Region layers:** `chokepoints`, `fisheries`, `seaice`, `fishingfleets`

**Bespoke layers:** `airports`, `webcams`
