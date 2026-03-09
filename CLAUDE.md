# Panopticon — Project Rules

## Data Provenance (MANDATORY)

Every hardcoded data file MUST cite its specific source. When creating or modifying any file in `data/`, include a `_source` field at the top level of the JSON:

```json
{
  "_source": {
    "description": "What this data represents",
    "origin": "Specific database, publication, or API — with URL where possible",
    "retrieved": "YYYY-MM-DD",
    "license": "License (e.g. 'public domain', 'CC-BY-4.0', 'fair use summary')",
    "notes": "Any caveats — e.g. approximate coordinates, incomplete coverage"
  },
  ...
}
```

Rules for `origin`:
- **ALWAYS** name the specific database, dataset, or publication the data came from.
- **ALWAYS** include a URL when one exists (e.g. "IAEA PRIS — pris.iaea.org").
- **NEVER** use vague attributions like "general knowledge" or "various sources."
- If data is compiled from multiple sources, list each one.
- If Claude produced the data, it still came from somewhere in training data — identify what those sources are (e.g. "USGS Mineral Commodity Summaries" not "Claude-generated").

This applies to ALL data — static point layers, polyline routes, scenario files, replay data. No exceptions. Data without provenance is unacceptable.

## Data Ingestion Scripts (MANDATORY)

Every data layer MUST have a corresponding ingestion script in `scripts/`. The script must be capable of reproducing the data file from its source. This means:
- Downloading from the authoritative source (API, CSV, database export)
- Parsing and transforming into the app's JSON format
- Including the `_source` metadata in the output
- Being runnable with `python3 scripts/ingest_<layer>.py` to regenerate the corresponding file in `data/layers/`

Existing script: `scripts/prepare_airports.py` → `data/layers/points/airports.json` (downloads from OurAirports CSV).

If a source requires manual steps (e.g. account registration, manual download), document those steps clearly in the script header. The script should still handle the parsing/transformation from the downloaded file.

## Directory Structure

- `data/` — All runtime data loaded by the app.
  - `data/layers/points/` — Point layer JSON (mines, airports, nuclear plants, etc.)
  - `data/layers/paths/` — Path layer JSON (cables, pipelines, migrations, etc.)
  - `data/layers/regions/` — Region layer JSON (chokepoints, fisheries, sea ice, etc.)
  - `data/layers/ambient/` — Non-geographic layer data (future: markets, prices, feeds)
  - `data/playback/` — ADS-B trace data for historical replay
  - `data/custom/` — User-defined datasets (GeoJSON, CSV, KML)
- `scripts/` — One-time data extraction/processing tools. Not part of app runtime.
- `scenarios/` — Wargame scenario definitions.
- `server/` — Wargame server (Express + WebSocket + LLM adapters).
- `results/` — Wargame simulation output logs (gitignored).

## Code Style

- ES Modules, no build step, browser-native imports.
- Monospace Courier New UI, dark theme with #00ff41 accent.
- CesiumJS for globe rendering.
