# Panopticon Architecture Overview

**Version:** 1.3
**Last updated:** 2026-03-21

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
- **AI:** Multi-provider LLM adapters (Anthropic, OpenAI, Google, xAI, OpenRouter, baseline) with [safety-dance](https://github.com/Max-Highsmith/safety-dance) compatibility checks
- **Style:** Monospace Courier New, dark theme, `#00ff41` accent

---

## Directory Structure

```
panopticon/
├── index.html              Single-page app entry point
├── submarine.html          Submarine pursuit standalone view
├── Dockerfile              Container configuration
├── css/styles.css          All styles
├── js/
│   ├── app.js              Main application controller (mode switching, UI)
│   ├── globe.js            CesiumJS viewer, entity maps, layer visibility
│   ├── config.js           Constants (API keys, display settings, endpoints)
│   ├── icons.js            SVG data URIs for all map icons
│   ├── utils.js            Shared utilities ($, interpolateTrace, etc.)
│   ├── filters.js          Entity filtering and search
│   ├── audio.js            Background music player
│   ├── overlays.js         Map overlays (blackout zones, data bounds)
│   ├── earthmap.js         Earth texture/map utilities
│   │
│   ├── layerregistry.js    Central layer registry + data cache
│   ├── layercatalog.js     Searchable layer dropdown catalog
│   ├── layerselector.js    Layer toggle bar UI
│   ├── layers/
│   │   ├── index.js        Barrel file (imports all layers)
│   │   ├── datalayer.js    Point layer factory
│   │   ├── pathlayer.js    Path layer factory
│   │   ├── regionlayer.js  Region layer factory
│   │   ├── ambientlayer.js Ambient (non-geographic sidebar) layer factory
│   │   └── *.js            119 layer modules (self-registering)
│   │
│   ├── viewregistry.js     Central view registry (register, open, close, tick)
│   ├── viewbase.js         Shared view utilities (HUD, footprints, canvas)
│   ├── satview.js          Satellite aerial view panel
│   ├── planeview.js        Aircraft aerial view panel
│   ├── siteview.js         Site reconnaissance view (mines, datacenters, nuclear)
│   ├── airportview.js      Airport FIDS + overhead view
│   ├── webcamview.js       Live webcam feed panel (HLS / YouTube)
│   ├── pathview.js         Path detail view (cables, pipelines, routes)
│   ├── submarineview.js    Three.js underwater submarine scene
│   ├── sniperview.js       Three.js rifle scope view (AI fire/hold)
│   ├── sarview.js          SAR satellite imagery panel
│   │
│   ├── wargame.js          Wargame mode controller (browser execution)
│   ├── simulation.mjs      Shared simulation engine (prompts, parsing, summaries)
│   ├── agentic-llm.js      Browser-side agentic LLM adapters (tool-calling)
│   ├── llm.js              Browser-side LLM API caller (simple completions)
│   ├── toolformat.mjs      Layer capability resolution + modality inheritance + provider formatting
│   ├── settings.js         API key management UI
│   ├── results.js          IndexedDB storage for wargame results
│   ├── report.js           After-action HTML report generator
│   │
│   ├── playback.js         Unified playback engine (timeline, frame loop)
│   ├── playbackbrowser.js  Playback sidebar (list + select manifests)
│   ├── adapters/
│   │   ├── adsb.js         ADS-B playback adapter
│   │   └── wargame.js      Wargame playback adapter
│   │
│   ├── citycatalog.js      City search catalog
│   ├── cityselector.js     City search UI
│   │
│   └── lib/
│       └── safety-dance.mjs  Vendored safety-dance browser bundle
│
├── data/                   Runtime JSON data files (107 layer files)
│   ├── layers/
│   │   ├── points/         81 point layer files
│   │   ├── paths/          12 path layer files
│   │   ├── regions/        5 region layer files
│   │   └── ambient/        9 ambient layer files
│   ├── playback/           ADS-B trace data for historical replay
│   └── custom/             User-uploaded datasets (GeoJSON, CSV, KML)
├── scenarios/              Wargame scenario definitions (42 scenarios)
│   ├── *.json              Individual scenario files
│   ├── index.json          Scenario index
│   ├── general-tools.json  Universal tools (8 tools, always available)
│   ├── tool-catalog.json   DEPRECATED — tool defs moved to capability layers
│   └── monitor-catalog.json  DEPRECATED — monitor defs moved to capability layers
├── playbacks/              Playback manifest files (3 curated + auto-generated)
├── scripts/                Data ingestion scripts (69 Python scripts)
├── assets/                 Media files (leader portraits, profiles, SAR, video)
├── server/
│   ├── index.js            Express + WebSocket wargame server
│   ├── agentic-adapters.mjs  LLM provider adapters (Anthropic, OpenAI, Google, xAI, OpenRouter, baseline)
│   ├── stream-adapter.mjs   Gemini Live API WebSocket adapter
│   ├── toolhandlers.mjs     Tool execution handlers (query_data_layer, etc.)
│   └── submarine-bridge.js  Unity 3D submarine bridge server
├── unity/                  Unity integration scripts
├── tests/                  Test files
└── docs/                   Architecture and specification documents
    ├── ARCHITECTURE.md     This file
    ├── PLAYBACK_SPEC.md    Playback manifest format
    ├── SCENARIO_SPEC.md    Wargame scenario format (includes model compatibility)
    ├── LAYER_SYSTEM.md     Layer registry, factory system, and modality metadata
    ├── TOOL_CATALOG.md     Wargame tool and monitor catalog
    ├── DATA_SPEC.md        JSON schemas for all data types
    ├── CRITICAL_MINERALS_SPEC.md  Critical mineral layer schema
    └── UNITY_SUBMARINE_SETUP.md   Unity submarine integration guide
```

---

## Mode Architecture

### OBSERVE Mode

Real-time data feeds rendered on the globe:

| Feed | Source | Update method |
|------|--------|---------------|
| Military aircraft | api.adsb.one | 10s polling |
| Commercial aircraft | OpenSky Network | 15s polling |
| Satellites | Celestrak TLE | One-time TLE fetch + per-frame propagation via satellite.js |
| Ships (AIS) | AISstream.io | WebSocket push (real-time) |

Each feed is implemented as a self-contained layer module in `js/layers/` (`military.js`, `commercial.js`, `satellites.js`, `ships.js`). Feeds run independently — aircraft use HTTP polling, satellites propagate orbits every render frame, and AIS uses a persistent WebSocket connection.

### WARGAME Mode

Two execution paths, same simulation logic:

**Browser mode** (`js/wargame.js` + `js/agentic-llm.js` + `js/llm.js`):
- User configures scenario, variant, framing, provider
- `agentic-llm.js` handles multi-turn tool-calling conversations; `llm.js` handles simple completions
- `toolformat.mjs` resolves layer capabilities + formats tools per provider (see Layer-Centric Capabilities below)
- Results stored in IndexedDB via `results.js`
- Playback manifest built from IndexedDB data
- After-action reports generated by `report.js`

**Server mode** (`server/index.js` via WebSocket):
- Same configuration, sent over WebSocket
- `server/agentic-adapters.mjs` provides 6 LLM adapters (Anthropic, OpenAI, Google, xAI, OpenRouter, baseline)
- `server/toolhandlers.mjs` executes tool calls (query_data_layer, etc.)
- `server/stream-adapter.mjs` handles Gemini Live API for stream mode
- Results written to `results/<runId>.jsonl`
- Playback manifest written to `playbacks/wg-<runId>.json`

Both use `simulation.mjs` for prompt building, response parsing, and summary generation.

**Pre-flight compatibility check:**
Before any simulation starts, the system runs a [safety-dance](https://github.com/Max-Highsmith/safety-dance) compatibility check. The scenario is converted to a benchmark manifest (inferring required modalities, interaction pattern, context window, tool count) and checked against the selected model's declared capabilities. Blocking incompatibilities (e.g. baseline model on an agentic scenario) prevent the simulation from starting. Warnings (e.g. no structured JSON support) are surfaced in the feed but allow execution. See [SCENARIO_SPEC.md](SCENARIO_SPEC.md#model-compatibility-safety-dance) for details.

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

Used in three places:
1. **Playback adapters** (`js/adapters/`) — ADS-B vs wargame rendering
2. **LLM adapters** (`server/agentic-adapters.mjs` + `js/agentic-llm.js`) — Anthropic, OpenAI, Google, xAI, OpenRouter, baseline
3. **Benchmark adapter** (`safety-dance/adapters/panopticon`) — converts scenarios to safety-dance manifests

All use the same principle: common interface, type-dispatched implementation.

### View Registry Pattern

Detail view panels register themselves at import time via `registerView()` in `viewregistry.js`. Each view implements a standard interface: `{ open, close, isOpen, resize, notify?, tick? }`.

9 views: satellite, plane, site, airport, webcam, path, submarine, sniper, SAR. Views use a mix of Cesium 3D viewers (satellite, plane, site, airport) and Three.js scenes (submarine, sniper). `viewbase.js` provides shared utilities (HUD overlays, footprint calculations, canvas setup).

Views with a `tick` callback receive playback progress updates via `tickAllViews()`, enabling synchronization with wargame playback.

### Factory Pattern

Four layer factories (`datalayer.js`, `pathlayer.js`, `regionlayer.js`, `ambientlayer.js`) eliminate boilerplate. Each handles:
- Lazy loading (fetch on first toggle)
- CesiumJS entity creation (point/path/region) or sidebar panel rendering (ambient)
- Visibility binding
- Data caching for AI consumption
- Reset for mode switching

The ambient factory adds tabbed sidebar management — multiple ambient layers share one sidebar panel with tabs to switch between them, plus optional live polling.

---

## Data Flow: Wargame AI + Layers

### Geographic context (data layers → prompt)

```
Scenario JSON
    │
    ├── layers: ["cables", "chokepoints", "law_enforcement", ...]
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

1. Scenario declares `layers` array (strings or `{key, excludeTools, excludeMonitors}` objects)
2. Wargame engine loads those layers (triggers fetch + cache)
3. `getLayerData(key)` retrieves raw JSON from cache
4. `summarizeLayerData()` compresses it into text (with proximity filtering)
5. Text injected into `GEOGRAPHIC CONTEXT` section of AI prompt

### Layer-Centric Capabilities (tools + monitors + state)

```
Scenario JSON
    │
    ├── layers: ["law_enforcement", { "key": "isr", "excludeTools": [...] }]
    │
    ▼
┌───────────────────────┐
│ resolveLayerCapabilities() │
│ (js/toolformat.mjs)        │
│                             │
│ For each layer:             │
│  ├── Extract _tools         │
│  ├── Extract _monitors      │
│  ├── Extract _defaults      │
│  └── Apply exclusions       │
└───────────────────────┘
    │
    ├── tools ──────────┐
    ├── monitors ───────┤
    ├── defaults ───────┤
    │                   ▼
    │           ┌──────────────────┐
    │           │ Merge with:       │
    │           │  + scenario inline│
    │           │  + general-tools  │
    │           └──────────────────┘
    │                   │
    ▼                   ▼
┌──────────┐    ┌──────────────┐
│ World    │    │ Tool defs    │
│ State    │    │ (formatted   │
│ Init     │    │  per provider)│
└──────────┘    └──────────────┘
```

**Four-tier resolution:** modality tools (auto-inherited per layer type) + capability layers → scenario inline → general tools (gap-fill). Every data layer automatically gets a monitor and modality-appropriate tools via inheritance.

**Capability layers** live in `data/layers/ambient/` and bundle `_tools`, `_monitors`, and `_defaults` alongside their data. Five capability layers: `law_enforcement`, `defense_systems`, `financial_ops`, `diplomacy`, `isr`.

---

## Extensibility Points

| What | How to extend |
|------|---------------|
| New data layer | Create JSON + ingestion script + layer module + import in barrel |
| New capability domain | Create layer in `data/layers/ambient/` with `_tools`/`_monitors`/`_defaults` + ingestion script + handlers in `toolhandlers.mjs` + register in `LAYER_DATA_FILES` |
| New playback type | Implement adapter interface + `registerAdapter()` in `playback.js` |
| New LLM provider | Add adapter in `server/agentic-adapters.mjs` + `js/agentic-llm.js` + API key in `settings.js` |
| New scenario | Create JSON + add to `scenarios/index.json` + include capability layers in `layers` |
| New wargame tool (reusable) | Add to a capability layer's `_tools` + handler in `server/toolhandlers.mjs` |
| New wargame tool (one-off) | Add inline in scenario's `tools` + handler in `server/toolhandlers.mjs` |
| New wargame mode | Add execution mode handler in `wargame.js` / `server/index.js` |
| New detail view | Create view module + `registerView()` + import in `app.js` |

---

## Related Documentation

- [PLAYBACK_SPEC.md](PLAYBACK_SPEC.md) — Playback manifest format specification
- [SCENARIO_SPEC.md](SCENARIO_SPEC.md) — Wargame scenario format specification
- [LAYER_SYSTEM.md](LAYER_SYSTEM.md) — Layer registry, factories, and data format
- [DATA_SPEC.md](DATA_SPEC.md) — JSON schemas for all data types
- [TOOL_CATALOG.md](TOOL_CATALOG.md) — Wargame tool and monitor catalog
- [CRITICAL_MINERALS_SPEC.md](CRITICAL_MINERALS_SPEC.md) — Schema for critical mineral layers
- [UNITY_SUBMARINE_SETUP.md](UNITY_SUBMARINE_SETUP.md) — Unity 3D submarine pursuit integration
- [WARGAME_PLAN.md](WARGAME_PLAN.md) — Original wargame system design document (historical)
- [CLAUDE.md](../CLAUDE.md) — Project rules (data provenance, code style)
