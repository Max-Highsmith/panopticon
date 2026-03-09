# Contributing to Panopticon

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/panopticon.git`
3. Create a feature branch: `git checkout -b my-feature`
4. Make your changes
5. Submit a pull request

## Adding a New Data Layer

Every layer requires three things:

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
  "features": [...]
}
```

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

createDataLayer({
  layerKey: 'mylayer',
  dataUrl: 'data/layers/points/mylayer.json',
  categories: {
    default: { icon: '⚡', color: '#ff0000', label: 'My Layer' }
  },
  viewType: 'site',
  flyTo: true
});
```

Then add the import to `js/layers/index.js`:

```js
import './mylayer.js';
```

And add the catalog entry to `js/layercatalog.js`:

```js
{ key: 'mylayer', label: 'My Layer', shortLabel: 'MYLAY', category: 'infrastructure', color: '#ff0000' },
```

## Adding a Wargame Scenario

Create a JSON file in `scenarios/` following the format in [docs/SCENARIO_SPEC.md](docs/SCENARIO_SPEC.md). Add the scenario to `scenarios/index.json`.

Key requirements:
- `camera` and `region` fields for geographic positioning
- `blueForces` (friendly) and `redContacts` (adversary) arrays
- `actions` array with at least some marked `terminal: true`
- `measurement` field with binary outcome metric

## Adding a View Type

1. Create `js/<name>view.js` implementing the view interface:
   - `open(viewer, entity)` — Show the detail panel
   - `close(viewer)` — Hide and clean up
   - `isOpen()` — Return current state
   - `resize()` — Handle panel resize (optional)
   - `tick(progress, tick, totalTicks)` — Playback sync (optional)

2. Register with `registerView(viewType, { open, close, isOpen, resize, tick })` from `js/viewregistry.js`

3. Add the panel HTML to `index.html`

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

## Questions?

Open an issue on the repository.
