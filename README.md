# PANOPTICON

Real-time OSINT globe with 60+ data layers, AI wargame simulations, and historical playback.

![PANOPTICON](https://img.shields.io/badge/status-active-00ff41?style=flat-square&labelColor=000)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square&labelColor=000)

## What It Does

Panopticon renders live tracking data, static intelligence layers, and AI-driven crisis simulations on an interactive CesiumJS 3D globe. Three operating modes:

**OBSERVE** — Real-time feeds from five OSINT sources:

| Feed | Source | Data |
|------|--------|------|
| Military Aircraft | [ADS-B Exchange](https://www.adsbexchange.com/) | Real-time transponder positions |
| Commercial Aircraft | [OpenSky Network](https://opensky-network.org/) | Global flight tracking |
| Satellites | [CelesTrak](https://celestrak.org/) | TLE orbital elements + SGP4 propagation |
| Ships | [AISStream](https://aisstream.io/) | Real-time AIS vessel positions |
| POI | [Overpass API](https://overpass-api.de/) | OpenStreetMap landmarks |

**PLAYBACK** — Replay historical events and completed wargame results with timeline scrubbing, variable speed (0.25x–100x), and full data layer visibility.

**WARGAME** — Run AI-driven geopolitical crisis simulations using LLMs (Anthropic, OpenAI, Google, xAI, OpenRouter). 35+ scenarios across naval confrontations, cyber attacks, nuclear escalation, and more. Results automatically generate playback manifests for replay.

## Data Layers

60+ toggleable data layers across four categories:

| Category | Examples | Count |
|----------|----------|-------|
| **Critical Minerals** | Lithium, cobalt, rare earths, uranium, tungsten, gallium... | 40+ |
| **Energy & Infrastructure** | Nuclear plants, oil refineries, pipelines, power grids, subsea cables | 10+ |
| **Military & Intelligence** | Bases, radar installations, strategic nuclear sites, spaceports | 5+ |
| **Natural & Environmental** | Volcanoes, earthquakes, wildfires, ocean currents, sea ice, wildlife migrations | 10+ |

Every data file includes a `_source` field with specific provenance (database, publication, URL). Each layer has a corresponding ingestion script in `scripts/` to reproduce the data from source.

## Views

Click any entity on the globe to open a detail panel. Eight specialized view types:

| View | Description |
|------|-------------|
| **Plane** | Aircraft flight profile with altitude chart |
| **Satellite** | Orbital profile with nadir projection and sensor footprint |
| **Site** | 3D close-up of infrastructure (nuclear plants, mines, etc.) |
| **Airport** | Flight information display (FIDS) schedule |
| **Webcam** | Live HLS/YouTube stream embed |
| **Path** | Route intelligence for cables, pipelines, shipping lanes |
| **Submarine** | 3D submarine with sonar contacts (Three.js) |
| **Sniper** | Scope view with target tracking |

## Visual Filters

Six altitude-adaptive filters that scale intensity with camera height:

CRT · NVG · FLIR · Anime · Border · Off

## Quick Start

### 1. Clone

```bash
git clone https://github.com/Max-Highsmith/panopticon.git
cd panopticon
```

### 2. Configure API Keys

Create `config.local.js` in the project root (gitignored):

```js
window.CESIUM_TOKEN = 'your-cesium-ion-token';
window.AIS_API_KEY  = 'your-aisstream-api-key';
```

**Getting keys:**
- **Cesium Ion** — Free at [cesium.com/ion](https://cesium.com/ion/) (enables Google 3D Photorealistic Tiles)
- **AISStream** — Free at [aisstream.io](https://aisstream.io/) (enables ship tracking)

The other feeds (ADS-B Exchange, OpenSky, CelesTrak, Overpass) are public and require no keys.

### 3. Serve

Any static file server works:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

### 4. Wargame Server (Optional)

The wargame system can run entirely in the browser (direct API calls to LLM providers) or via a backend server for server-side execution:

```bash
cd server
npm install
cp .env.example .env    # Add your LLM API keys
npm start               # Starts on port 3001
```

## Project Structure

```
panopticon/
├── index.html                 Application shell
├── config.local.js            Local API keys (gitignored)
├── css/styles.css             All styles
│
├── js/
│   ├── app.js                 Entry point — mode switching, UI orchestration
│   ├── globe.js               CesiumJS viewer, entity maps, layer state
│   ├── config.js              API endpoints, constants
│   ├── utils.js               Shared utilities
│   ├── icons.js               Canvas-based icon generators
│   ├── filters.js             Visual filter system
│   │
│   ├── layerregistry.js       Central layer registry + data cache
│   ├── layercatalog.js        Layer catalog with metadata
│   ├── layerselector.js       Searchable layer dropdown + pin bar
│   ├── layers/
│   │   ├── index.js           Barrel file (imports all layers)
│   │   ├── datalayer.js       Point layer factory
│   │   ├── pathlayer.js       Path layer factory
│   │   ├── regionlayer.js     Region layer factory
│   │   └── *.js               60+ self-registering layer modules
│   │
│   ├── viewregistry.js        Central view registry
│   ├── viewbase.js            Shared view utilities
│   ├── *view.js               8 view modules (plane, site, airport, satellite, etc.)
│   │
│   ├── playback.js            Unified playback engine (timeline, frame loop)
│   ├── playbackbrowser.js     Playback sidebar UI
│   ├── adapters/
│   │   ├── adsb.js            Historical playback adapter
│   │   └── wargame.js         Wargame playback adapter
│   │
│   ├── wargame.js             Browser-side wargame execution
│   ├── simulation.mjs         Shared simulation logic (prompts, parsing)
│   ├── llm.js                 Browser-side LLM API caller
│   └── settings.js            API key management UI
│
├── data/
│   └── layers/
│       ├── points/            Point layer JSON (mines, plants, bases...)
│       ├── paths/             Path layer JSON (cables, routes, migrations...)
│       ├── regions/           Region layer JSON (chokepoints, fisheries...)
│       └── ambient/           Non-geographic data (markets, feeds)
│
├── scenarios/                 35+ wargame scenario definitions
├── playbacks/                 Playback manifest files
├── scripts/                   Python data ingestion scripts
├── server/                    Express + WebSocket wargame server
└── docs/                      Architecture and spec documents
```

## Architecture

### Design Patterns

**Self-Registering Modules** — Layers register themselves via `registerLayerLoader()` at import time. Adding a layer = create a file + add one import to the barrel. `app.js` has zero knowledge of individual layers.

**Factory Pattern** — Three factories (`datalayer.js`, `pathlayer.js`, `regionlayer.js`) handle point/path/region layers with config-driven customization, eliminating boilerplate.

**Adapter Pattern** — Playback engine delegates to type-specific adapters (historical vs wargame). LLM calls use the same pattern across five providers.

**View Registry** — Views self-register like layers. Each entity declares its view type; the registry handles dispatch.

### Wargame Flow

```
Scenario JSON → Layer Context → buildPrompt() → LLM API → parseDecision()
                                                              ↓
                                               Playback Manifest → PLAYBACK mode
```

1. User picks scenario, variant, framing, and LLM provider
2. Engine loads scenario-declared data layers for geographic context
3. Each tick: builds prompt with situation + intel + layer data, sends to LLM
4. LLM response parsed into structured decision (action, movements, reasoning)
5. On completion, results auto-generate a playback manifest for replay

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design overview |
| [LAYER_SYSTEM.md](docs/LAYER_SYSTEM.md) | Layer registry, factories, view system |
| [PLAYBACK_SPEC.md](docs/PLAYBACK_SPEC.md) | Playback manifest format |
| [SCENARIO_SPEC.md](docs/SCENARIO_SPEC.md) | Wargame scenario JSON format |
| [DATA_SPEC.md](docs/DATA_SPEC.md) | Data file schemas and provenance |
| [CRITICAL_MINERALS_SPEC.md](docs/CRITICAL_MINERALS_SPEC.md) | Mineral commodity layer spec |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding layers, scenarios, views, and other contributions.

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| [CesiumJS](https://cesium.com/) | 1.124 | 3D globe rendering |
| [satellite.js](https://github.com/shashwatak/satellite-js) | 5.0.0 | Orbital mechanics (SGP4/SDP4) |
| [Three.js](https://threejs.org/) | 0.160.0 | 3D submarine view |
| [HLS.js](https://github.com/video-dev/hls.js/) | 1.5.7 | Webcam stream playback |

No build tools, bundlers, or package managers required for the frontend. Pure ES Modules.

## Browser Support

Requires WebGL 2.0. Tested on Chrome 120+, Firefox 120+, Edge 120+, Safari 17+.

## License

MIT — see [LICENSE](LICENSE).
