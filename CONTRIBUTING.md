# Contributing to Panopticon

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/panopticon.git`
3. Create a feature branch: `git checkout -b my-feature`
4. Make your changes
5. Submit a pull request

## Adding a New Data Layer

Every layer requires five things:

### 1. Data File

Create a JSON file in the appropriate `data/layers/` subdirectory:

- `data/layers/points/` — Point/billboard entities
- `data/layers/paths/` — Polyline routes
- `data/layers/regions/` — Polygon areas

Every data file **must** include a `_source` field at the top level:

```json
{
  "_source": {
    "description": "What this data represents",
    "origin": "Specific database or publication — with URL",
    "retrieved": "YYYY-MM-DD",
    "license": "License type",
    "notes": "Any caveats"
  },
  "operating": [
    { "name": "Site Name", "lat": 37.43, "lon": 138.6, "country": "Japan", "operator": "ACME" }
  ]
}
```

Top-level keys (except `_source`) are **category keys** that map to display config in the layer module. See [DATA_SPEC.md](docs/DATA_SPEC.md) for full schemas.

**No exceptions.** Vague attributions like "general knowledge" or "various sources" are not acceptable. Name the specific database, dataset, or publication.

### 2. Ingestion Script

Create `scripts/ingest_<layer>.py` that can reproduce the data file from source:

```python
#!/usr/bin/env python3
"""Ingest <layer name> from <source>.

Source: <URL>
Output: data/layers/points/<layer>.json

Manual steps (if any):
  1. Download CSV from <url>
  2. Run: python3 scripts/ingest_<layer>.py
"""

import json

# Download/parse source data
# Transform into app format
# Write JSON with _source metadata
```

### 3. Layer Module

Create `js/layers/<layer>.js` using one of the three factories:

```js
// js/layers/mylayer.js
import { createDataLayer } from './datalayer.js';
import { registerLayerLoader } from '../layerregistry.js';

const layer = createDataLayer({
  layerKey: 'mylayer',
  dataUrl: 'data/layers/points/mylayer.json',
  idPrefix: 'mylay',
  categories: {
    operating: { icon: 'nuclear', color: '#ff0000', label: 'MY LAYER' },
  },
  viewType: 'site',
  flyTo: { lon: 0, lat: 30, alt: 20_000_000 },
  iconSize: 28,
  countId: 'mylayer-count',
  logLabel: 'MYLAYER',
  descFn: (item, cat) => `${item.operator} // ${item.country} // ${item.notes || ''}`,
});

registerLayerLoader('mylayer', {
  load: layer.load,
  flyTo: layer.FLY_TO,
  reset: layer.reset,
  dataUrl: 'data/layers/points/mylayer.json',
  view: 'site',
  layerType: 'point',
});
```

For paths and regions, use `createPathLayer` or `createRegionLayer` instead. See [LAYER_SYSTEM.md](docs/LAYER_SYSTEM.md) for full factory APIs.

### 4. Wire It Up

Add the import to `js/layers/index.js`:

```js
import './mylayer.js';
```

Add a layer key entry to `js/globe.js` in both the `layers` and `entityMaps` objects.

Add the catalog entry to `js/layercatalog.js`:

```js
{ key: 'mylayer', label: 'MY LAYER', shortLabel: 'MYLAY', category: 'Infrastructure', color: '#ff0000', defaultOn: false, defaultPinned: false },
```

### 5. Verify

- Layer appears in the catalog dropdown
- Toggling it loads entities on the globe
- Clicking an entity opens the correct view
- `getLayerData('mylayer')` returns cached data (for wargame AI context)

## Adding a Wargame Scenario

Create a JSON file in `scenarios/` following the format in [SCENARIO_SPEC.md](docs/SCENARIO_SPEC.md). Then add the scenario to `scenarios/index.json`.

Key requirements:
- `camera` and `region` fields for geographic positioning
- `blue_forces` (friendly) and `red_contacts` (adversary) arrays
- `actions` array with at least one marked `terminal: true`
- `measurement` field with `critical_action` and `binary_question`
- At least one variant in `intel_feed` and one framing in `framings`

### Agentic Scenarios

For agentic scenarios (`execution_mode: "agentic"`), you also need:

- `monitors` — read-only data queries exposed to the AI as tools
- `tools` — parameterized actions with JSON Schema parameters and `terminal` flags
- `intel_schedule` — variant-keyed messages with `delay_ms` timing
- Tool handlers in `server/toolhandlers.mjs` for each new tool type
- Visual reactions in `dispatchToolVisuals()` in `js/wargame.js` for **every** tool

See the [scenario design checklist](docs/SCENARIO_SPEC.md#creating-a-new-scenario--complete-checklist) for the full walkthrough.

## Adding a View Type

1. Create `js/<name>view.js` implementing the view interface:
   - `open(viewer, entity)` — Show the detail panel
   - `close(viewer)` — Hide and clean up
   - `isOpen()` — Return current state
   - `resize()` — Handle panel resize

2. Import shared utilities from `js/viewbase.js` (HUD overlay, detail viewer init, animation loops)

3. Register with `registerView(viewType, { open, close, isOpen, resize })` from `js/viewregistry.js`

4. Add the panel HTML to `index.html`

5. Import the module in `js/app.js` for side-effect registration

6. Set `_view: '<viewtype>'` on entities and `view: '<viewtype>'` in layer registration

## Code Style

- ES Modules — no build step, browser-native imports
- No TypeScript, no JSX, no bundler
- Monospace Courier New UI, dark theme, `#00ff41` accent
- Prefer editing existing files over creating new ones
- Keep things simple — no premature abstractions

## Data Provenance

This project takes data provenance seriously. Every data point should be traceable to a specific, named source. If you're adding data:

- Identify the authoritative source (USGS, IAEA, NASA, etc.)
- Include URLs where available
- Note the retrieval date
- Document the license
- Note any caveats (approximate coordinates, incomplete coverage, etc.)

## Documentation

If your contribution changes the architecture or adds a new system, update the relevant doc in `docs/`:

| Document | When to update |
|----------|---------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | New modes, major structural changes |
| [SCENARIO_SPEC.md](docs/SCENARIO_SPEC.md) | New scenario fields, execution modes, tool patterns |
| [LAYER_SYSTEM.md](docs/LAYER_SYSTEM.md) | New layer types, factory changes, view system changes |
| [DATA_SPEC.md](docs/DATA_SPEC.md) | New data formats, schema changes |
| [PLAYBACK_SPEC.md](docs/PLAYBACK_SPEC.md) | New playback adapters, manifest fields |

## Questions?

Open an issue on the repository.
