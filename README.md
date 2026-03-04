# PANOPTICON

Real-time and historical 3D globe visualization for aircraft, satellite, and ship surveillance.

![PANOPTICON](https://img.shields.io/badge/status-active-00ff41?style=flat-square&labelColor=000)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square&labelColor=000)

## What It Does

PANOPTICON renders live tracking data from multiple open-source intelligence (OSINT) feeds onto an interactive 3D globe. It supports both real-time monitoring and historical scenario replay with timeline scrubbing.

**Live Mode** aggregates five data sources simultaneously:

| Layer | Source | Data |
|-------|--------|------|
| Military Aircraft | [ADS-B Exchange](https://www.adsbexchange.com/) | Real-time ADS-B transponder data |
| Commercial Aircraft | [OpenSky Network](https://opensky-network.org/) | Global flight tracking |
| Satellites | [CelesTrak](https://celestrak.org/) | TLE orbital elements + propagation |
| Ships | [AISStream](https://aisstream.io/) | Real-time AIS vessel positions |
| POI (POGO) | [Overpass API](https://overpass-api.de/) | OpenStreetMap monuments/landmarks |

**Replay Mode** plays back historical ADS-B snapshots with:
- Frame-by-frame timeline scrubbing at variable speed (1x–100x)
- Aircraft trail rendering with interpolated positions
- ADS-B blackout zone overlays
- Data boundary markers
- Satellite positions propagated to the historical date

### Visual Filters

Six altitude-adaptive visual filters that scale intensity based on camera height:

| Filter | Effect |
|--------|--------|
| CRT | Scanlines + vignette + brightness boost |
| NVG | Night vision green tint + scan noise |
| FLIR | Thermal imaging desaturation |
| Anime | Cel-shading + posterization |
| Border | Political map desaturation + warm tint |
| Off | Default rendering |

### Satellite View

Click any satellite to open a split-panel view with:
- Nadir ground projection (second Cesium viewer)
- Sensor footprint circle with crosshair overlay
- Canvas 2D orbital profile showing viewing cone geometry
- Real-time altitude, lat/lon, and footprint radius readouts

## Quick Start

### 1. Clone

```bash
git clone https://github.com/your-username/panopticon.git
cd panopticon
```

### 2. Configure API Keys

Create `config.local.js` in the project root (this file is gitignored):

```js
// config.local.js
window.CESIUM_TOKEN = 'your-cesium-ion-token';
window.AIS_API_KEY  = 'your-aisstream-api-key';
```

**Getting keys:**
- **Cesium Ion** — Free at [cesium.com/ion](https://cesium.com/ion/) (enables Google 3D Photorealistic Tiles)
- **AISStream** — Free at [aisstream.io](https://aisstream.io/) (enables ship tracking)

The other APIs (ADS-B Exchange, OpenSky, CelesTrak, Overpass) are public and require no keys.

### 3. Serve

Any static file server works. For local development:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .

# PHP
php -S localhost:8080
```

Open `http://localhost:8080` in a modern browser.

### 4. Deploy

PANOPTICON is a static site — deploy to any hosting provider:

```bash
# GitHub Pages (already configured via CNAME)
git push origin main

# Netlify / Vercel / Cloudflare Pages
# Just point to the repo root — no build step required
```

For CI/CD, inject API keys as environment variables using the `%%CESIUM_TOKEN%%` and `%%AIS_API_KEY%%` placeholders in the build pipeline.

## Project Structure

```
panopticon/
├── index.html                  # Application shell (HTML only)
├── config.local.js             # Local API keys (gitignored)
├── CNAME                       # GitHub Pages custom domain
│
├── css/
│   └── styles.css              # All styles (HUD, filters, panels, overlays)
│
├── js/
│   ├── app.js                  # Main entry point — mode switching, replay, interaction
│   ├── config.js               # API endpoints, constants, scenario definitions
│   ├── utils.js                # Formatting, time conversion, interpolation, DOM cache
│   ├── icons.js                # Canvas-based icon generators (plane, ship, satellite, POGO)
│   ├── globe.js                # Cesium viewer init, layer state, entity registries
│   ├── filters.js              # Altitude-adaptive visual filter system
│   ├── audio.js                # Background music player
│   ├── overlays.js             # Blackout zones and data boundary overlays
│   ├── satview.js              # Satellite aerial view (2nd viewer + canvas profile)
│   └── layers/
│       ├── military.js         # ADS-B Exchange military feed
│       ├── commercial.js       # OpenSky Network commercial feed
│       ├── satellites.js       # CelesTrak TLE + satellite.js propagation
│       ├── ships.js            # AIS WebSocket ship tracking
│       └── pogo.js             # Overpass API POI layer
│
├── military_feb28.json         # Replay data: Iran scenario
├── venezuela_jan03.json        # Replay data: Venezuela scenario
├── jalisco_feb22.json          # Replay data: Jalisco scenario
│
└── data/                       # Raw ADS-B archives (gitignored)
```

## Architecture

```
┌─────────────────────────────────────────────┐
│                  index.html                  │
│              (application shell)             │
└────────────────────┬────────────────────────┘
                     │
              ┌──────┴──────┐
              │   app.js    │  ← entry point (ES module)
              └──────┬──────┘
                     │
     ┌───────┬───────┼───────┬──────────┐
     │       │       │       │          │
  globe.js  filters  audio  overlays  satview
     │               │
     │        ┌──────┴──────────────┐
     │        │     layers/         │
     │        ├── military.js       │
     │        ├── commercial.js     │
     │        ├── satellites.js     │
     │        ├── ships.js          │
     │        └── pogo.js           │
     │                              │
     └──── config.js + utils.js ────┘
              (shared by all)
```

**Key patterns:**
- **ES Modules** — Each file exports its public API; `app.js` wires them together
- **Entity registries** — Each layer maintains a `Map<id, record>` for efficient updates
- **Frame-driven updates** — Satellite positions and filter intensity update via `preRender` listeners
- **Altitude-adaptive effects** — Camera height mapped to 0–1 intensity via log scale

## Replay Data Format

Scenario JSON files follow this schema:

```json
{
  "time_start_utc": 57720,
  "time_end_utc": 59520,
  "aircraft": [
    {
      "hex": "a1b2c3",
      "r": "CALLSIGN",
      "t": "B737",
      "desc": "Boeing 737-800",
      "mil": false,
      "trace": [
        { "t": 57720, "lat": 32.5, "lon": 53.2, "alt": 35000, "gs": 450, "track": 90 },
        { "t": 57721, "lat": 32.5, "lon": 53.21, "alt": 35000, "gs": 450, "track": 90 }
      ]
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `time_start_utc` | Window start as seconds since midnight UTC |
| `time_end_utc` | Window end as seconds since midnight UTC |
| `hex` | ICAO 24-bit transponder address |
| `r` | Registration / callsign |
| `t` | Aircraft type code |
| `mil` | `true` if flagged as military |
| `trace[].t` | Timestamp (seconds since midnight UTC) |
| `trace[].alt` | Barometric altitude in feet (or `"ground"`) |
| `trace[].gs` | Ground speed in knots |
| `trace[].track` | Track angle in degrees (0 = north) |

Traces are linearly interpolated between data points during playback.

## Included Scenarios

| Scenario | Region | Date | UTC Window |
|----------|--------|------|------------|
| **IRAN** | Persian Gulf / Strait of Hormuz | Feb 28, 2026 | 16:02 – 16:32 |
| **VENEZUELA** | Caribbean / Maracaibo | Jan 3, 2026 | 08:00 – 08:30 |
| **JALISCO** | Western Mexico / Pacific Coast | Feb 22, 2026 | 11:00 – 11:30 |

## Adding a New Scenario

1. Prepare a JSON file matching the replay data format above
2. Place it in the project root (e.g., `my_scenario.json`)
3. Add the scenario definition to `SCENARIOS` in [js/config.js](js/config.js)
4. Add a `.scenario-card` to the sidebar in [index.html](index.html)

## Browser Support

Requires WebGL 2.0. Tested on:
- Chrome 120+
- Firefox 120+
- Edge 120+
- Safari 17+ (partial — WebGL performance may vary)

## Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| [CesiumJS](https://cesium.com/) | 1.124 | 3D globe rendering |
| [satellite.js](https://github.com/shashwatak/satellite-js) | 5.0.0 | Orbital mechanics (SGP4/SDP4) |

No build tools, bundlers, or package managers required.

## License

MIT
