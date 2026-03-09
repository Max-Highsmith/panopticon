# Panopticon Architecture Overview

**Version:** 1.0
**Last updated:** 2026-03-07

---

## What is Panopticon?

Panopticon is a CesiumJS globe application with three modes:

1. **OBSERVE** — Real-time surveillance feeds (ADS-B aircraft, satellites, ships)
2. **WARGAME** — AI-driven geopolitical crisis simulations
3. **PLAYBACK** — Replay of historical events and completed wargame results

---

## Tech Stack

- **Frontend:** Vanilla ES Modules, CesiumJS, no build step
- **Backend:** Node.js Express + WebSocket (optional, for server-side wargames)
- **Storage:** IndexedDB (browser-side wargame results), filesystem (server-side)
- **AI:** Multi-provider LLM adapters (Anthropic, OpenAI, Google, xAI, baseline)
- **Style:** Monospace Courier New, dark theme, `#00ff41` accent

---

## Directory Structure

```
panopticon/
├── index.html              Single-page app entry point
├── css/styles.css          All styles
├── js/
│   ├── app.js              Main application controller (mode switching, UI)
│   ├── globe.js            CesiumJS viewer, entity maps, layer visibility
│   ├── config.js           Constants (API keys, display settings, endpoints)
│   ├── icons.js             SVG data URIs for all map icons
│   ├── utils.js            Shared utilities ($, interpolateTrace, etc.)
│   ├── filters.js          Entity filtering and search
│   │
│   ├── layerregistry.js    Central layer registry + data cache
│   ├── layercatalog.js     Searchable layer dropdown catalog
│   ├── layerselector.js    Layer toggle bar UI
│   ├── layers/
│   │   ├── index.js        Barrel file (imports all layers)
│   │   ├── datalayer.js    Point layer factory
│   │   ├── pathlayer.js    Path layer factory
│   │   ├── regionlayer.js  Region layer factory
│   │   ├── airports.js     Bespoke: airports layer
│   │   ├── webcams.js      Bespoke: webcam streams layer
│   │   └── *.js            60+ layer modules (self-registering)
│   │
│   ├── wargame.js          Wargame mode controller (browser execution)
│   ├── simulation.mjs      Shared simulation engine (prompts, parsing, summaries)
│   ├── llm.js              Browser-side LLM API caller
│   ├── settings.js         API key management UI
│   ├── results.js          IndexedDB storage for wargame results
│   │
│   ├── playback.js         Unified playback engine (timeline, frame loop)
│   ├── playbackbrowser.js  Playback sidebar (list + select manifests)
│   ├── adapters/
│   │   ├── adsb.js         ADS-B playback adapter
│   │   └── wargame.js      Wargame playback adapter
│   │
│   ├── citycatalog.js      City search catalog
│   └── cityselector.js     City search UI
│
├── data/                   Runtime JSON data files (60+ layers)
├── scenarios/              Wargame scenario definitions (38+ scenarios)
├── playbacks/              Playback manifest files
├── scripts/                Data ingestion scripts (Python)
├── server/
│   └── index.js            Express + WebSocket wargame server
├── tests/                  Test files
└── docs/                   Architecture and specification documents
    ├── ARCHITECTURE.md     This file
    ├── PLAYBACK_SPEC.md    Playback manifest format
    ├── SCENARIO_SPEC.md    Wargame scenario format
    └── LAYER_SYSTEM.md     Layer registry and factory system
```

---

## Mode Architecture

### OBSERVE Mode

Real-time data feeds rendered on the globe:

| Feed | Source | Update interval |
|------|--------|----------------|
| Military aircraft | api.adsb.one | 5s |
| Commercial aircraft | OpenSky Network | 10s |
| Satellites | Celestrak TLE | 60s |
| Ships (AIS) | AIS endpoint | 30s |
| POI (POGO) | Overpass API | 60s |

Each feed runs an independent polling loop started by `app.js`. Entity positions update in-place on the CesiumJS viewer.

### WARGAME Mode

Two execution paths, same simulation logic:

**Browser mode** (`js/wargame.js` + `js/llm.js`):
- User configures scenario, variant, framing, provider
- `llm.js` calls provider APIs directly from the browser
- Results stored in IndexedDB via `results.js`
- Playback manifest built from IndexedDB data

**Server mode** (`server/index.js` via WebSocket):
- Same configuration, sent over WebSocket
- Server calls LLM APIs server-side
- Results written to `results/<runId>.jsonl`
- Playback manifest written to `playbacks/wg-<runId>.json`

Both use `simulation.mjs` for prompt building, response parsing, and summary generation.

**Wargame → Playback flow:**
1. Wargame completes → `buildSummary()` creates outcome data
2. Summary includes `camera`, `region`, `layers` from scenario
3. Manifest generated (server: JSON file, browser: IndexedDB → sidebar)
4. User clicks WATCH PLAYBACK → switches to playback mode with that manifest
5. Globe zooms to `camera` position, data layers auto-enabled from `display.layers`

### PLAYBACK Mode

Adapter-based playback engine (`js/playback.js`):

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ playback.js │────▶│  Adapter     │────▶│ CesiumJS    │
│ (engine)    │     │ (adsb/wargame)│     │ (viewer)    │
└─────────────┘     └──────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│ Controls UI │
│ (timeline,  │
│  speed, etc)│
└─────────────┘
```

The engine manages: timeline position, play/pause/seek, speed control, frame loop.
Each adapter implements: `load()`, `renderFrame()`, `getEvents()`, `cleanup()`.

---

## Design Patterns

### Self-Registering Modules

Layers register themselves at import time via `registerLayerLoader()`. The barrel file `js/layers/index.js` imports all modules for their side effects. This means:
- No manual registry maintenance
- Adding a layer = create file + add one import
- `app.js` has zero knowledge of individual layers

### Adapter Pattern

Used in two places:
1. **Playback adapters** (`js/adapters/`) — ADS-B vs wargame rendering
2. **LLM adapters** (`server/index.js`) — Anthropic, OpenAI, Google, xAI, baseline

Both use the same principle: common interface, type-dispatched implementation.

### Factory Pattern

Three layer factories (`datalayer.js`, `pathlayer.js`, `regionlayer.js`) eliminate boilerplate. Each handles:
- Lazy loading (fetch on first toggle)
- CesiumJS entity creation
- Visibility binding
- Data caching for AI consumption
- Reset for mode switching

---

## Data Flow: Wargame AI + Layers

```
Scenario JSON
    │
    ├── layers: ["cables", "chokepoints"]
    │
    ▼
┌──────────────┐     ┌────────────────┐
│ Layer Registry│────▶│ summarizeLayer │
│ (cached data) │     │    Data()      │
└──────────────┘     └────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ buildPrompt()│
                     │ GEOGRAPHIC   │
                     │ CONTEXT sect │
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   LLM API   │
                     └──────────────┘
```

1. Scenario declares `layers` array
2. Wargame engine loads those layers (triggers fetch + cache)
3. `getLayerData(key)` retrieves raw JSON from cache
4. `summarizeLayerData()` compresses it into text (with proximity filtering)
5. Text injected into `GEOGRAPHIC CONTEXT` section of AI prompt

---

## Extensibility Points

| What | How to extend |
|------|---------------|
| New data layer | Create JSON + ingestion script + layer module + import in barrel |
| New playback type | Implement adapter interface + `registerAdapter()` in `playback.js` |
| New LLM provider | Add adapter in `server/index.js` + API key in `settings.js` |
| New scenario | Create JSON + add to `scenarios/index.json` |
| New wargame mode | Add execution mode handler in `wargame.js` / `server/index.js` |

---

## Related Documentation

- [PLAYBACK_SPEC.md](PLAYBACK_SPEC.md) — Playback manifest format specification
- [SCENARIO_SPEC.md](SCENARIO_SPEC.md) — Wargame scenario format specification
- [LAYER_SYSTEM.md](LAYER_SYSTEM.md) — Layer registry, factories, and data format
- [CLAUDE.md](../CLAUDE.md) — Project rules (data provenance, code style)
