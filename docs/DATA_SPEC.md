# Panopticon Data Specifications

**Version:** 1.1
**Last updated:** 2026-03-16

This document defines the exact JSON schemas for all data types used by Panopticon. Every data file must conform to the schema for its type. The three factory-consumed types (point, path, region) are defined by what the factory code actually reads; layer-specific fields are passed through to the view system via `descFn`.

For architecture and registration details, see [LAYER_SYSTEM.md](LAYER_SYSTEM.md).

---

## Table of Contents

1. [Source Metadata (`_source`)](#1-source-metadata)
2. [Point Layer Data](#2-point-layer-data)
3. [Path Layer Data](#3-path-layer-data)
4. [Region Layer Data](#4-region-layer-data)
5. [Playback Data](#5-playback-data)
6. [Playback Manifests](#6-playback-manifests)
7. [Factory-Extended Layers](#7-factory-extended-layers)
8. [Wargame Results](#8-wargame-results)

---

## 1. Source Metadata

**Required on every JSON file in `data/`.** No exceptions.

```jsonc
{
  "_source": {
    "description": "<string>  What this data represents",
    "origin":      "<string>  Named database, publication, or API — with URL",
    "retrieved":   "<string>  ISO date: YYYY-MM-DD",
    "license":     "<string>  License identifier (e.g. 'public domain', 'CC-BY-4.0')",
    "notes":       "<string>  Caveats — approximate coords, incomplete coverage, etc."
  }
}
```

### Rules

- `origin` must name the **specific** source: a database, publication, dataset, or API. URLs required when available.
- Never use vague attributions: "general knowledge", "various sources", "Claude-generated".
- If compiled from multiple sources, list each one in `origin` (e.g. `"USGS Mineral Commodity Summaries 2024 + BGS World Mineral Production"`).
- The `_source` key is **reserved** — factories skip it when iterating category keys.

### Examples

```json
{
  "_source": {
    "description": "Global nuclear power plant locations and capacities",
    "origin": "IAEA Power Reactor Information System (PRIS) — pris.iaea.org",
    "retrieved": "2026-03-07",
    "license": "public domain",
    "notes": "Approximate coordinates for some facilities"
  }
}
```

```json
{
  "_source": {
    "description": "Major submarine telecommunications cables",
    "origin": "TeleGeography Submarine Cable Map — submarinecablemap.com",
    "retrieved": "2026-03-07",
    "license": "fair use — reference data",
    "notes": "Simplified route coordinates; actual cable paths follow seabed terrain"
  }
}
```

---

## 2. Point Layer Data

**Factory:** `createDataLayer()` in [js/layers/datalayer.js](../js/layers/datalayer.js)
**Data directory:** `data/layers/points/`
**Layer type:** `point`

### Top-level Structure

```jsonc
{
  "_source": { /* ... */ },
  "<category_key>": [ /* array of point items */ ],
  "<category_key>": [ /* ... */ ]
}
```

Each top-level key (except `_source`) is a **category key** that must match a key in the factory's `categories` config object. Items in each category array are rendered using that category's icon, color, and label.

### Point Item Schema

```jsonc
{
  // ── Required ──────────────────────────────────────────────
  "name":     "<string>",   // Display name — used as billboard label and entity ID component
  "lat":      <number>,     // Latitude in decimal degrees (WGS84), range [-90, 90]
  "lon":      <number>,     // Longitude in decimal degrees (WGS84), range [-180, 180]

  // ── Standard optional ─────────────────────────────────────
  "country":  "<string>",   // Country or region identifier (e.g. "Japan", "US", "UK-France")
  "operator": "<string>",   // Operating entity (e.g. "TEPCO", "US Navy", "Shell")
  "notes":    "<string>",   // Freeform additional details

  // ── Layer-specific optional ───────────────────────────────
  // Any additional fields needed by the layer's descFn.
  // These are NOT consumed by the factory directly — they are
  // passed through to descFn(item, category) for display.
}
```

### How the Factory Consumes Fields

| Field | Usage | Required |
|-------|-------|----------|
| `name` | Billboard label text; entity ID suffix (`{idPrefix}_{category}_{name}`) | **Yes** |
| `lat` | Entity position (latitude) | **Yes** |
| `lon` | Entity position (longitude) | **Yes** |
| `country` | Default `descFn` includes it in description string | No |
| `operator` | Default `descFn` includes it in description string | No |
| `notes` | Default `descFn` appends it if present | No |

The **default description function** produces:
```
{operator} // {country} // {notes}
```
Omitting `operator` produces `// {country}`. Omitting `notes` drops the trailing segment.

If a **custom `descFn`** is provided in the factory config, it receives the full item object and can access any fields:
```javascript
descFn: (item, cat) => `${item.operator} // ${item.country} // ${item.capacity_mw} MW`
```

### Layer-Specific Fields

These fields are **not** consumed by the factory — they exist for `descFn` and for wargame AI context summarization. Each layer may define its own:

| Layer | Extra Fields | Types |
|-------|-------------|-------|
| `nuclearplants` | `capacity_mw`, `reactors` | `number`, `number` |
| `powerplants` | `capacity_mw` | `number` |
| `earthquakes` | `magnitude`, `depth_km` | `number`, `number` |
| `volcanoes` | `elevation_m` | `number` |
| `platforms` | `field` | `string` |
| `airports` | `icao`, `iata`, `type`, `elevation_ft` | `string`, `string\|null`, `string`, `number` |
| `webcams` | `city`, `ytId`, `hlsUrl` | `string`, `string\|null`, `string\|null` |
| All others | *(none — standard fields only)* | — |

New layers may introduce any fields they need. The contract is:
1. `name`, `lat`, `lon` are always present.
2. The factory ignores unknown fields — they pass through for `descFn` and AI summarization.
3. Document layer-specific fields in the ingestion script header.

### Complete Example

```json
{
  "_source": {
    "description": "Global nuclear power plant locations and capacities",
    "origin": "IAEA Power Reactor Information System (PRIS) — pris.iaea.org",
    "retrieved": "2026-03-07",
    "license": "public domain",
    "notes": "Approximate coordinates for some facilities"
  },
  "operating": [
    {
      "name": "Kashiwazaki-Kariwa",
      "lat": 37.43,
      "lon": 138.6,
      "country": "Japan",
      "operator": "TEPCO",
      "capacity_mw": 7965,
      "reactors": 7,
      "notes": "World's largest nuclear plant by capacity"
    },
    {
      "name": "Bruce",
      "lat": 44.33,
      "lon": -81.6,
      "country": "Canada",
      "operator": "Bruce Power",
      "capacity_mw": 6384,
      "reactors": 8
    }
  ],
  "shutdown": [
    {
      "name": "Chernobyl",
      "lat": 51.39,
      "lon": 30.1,
      "country": "Ukraine",
      "operator": "SSE Chernobyl NPP",
      "capacity_mw": 0,
      "reactors": 4,
      "notes": "Permanently shutdown after 1986 disaster"
    }
  ]
}
```

---

## 3. Path Layer Data

**Factory:** `createPathLayer()` in [js/layers/pathlayer.js](../js/layers/pathlayer.js)
**Data directory:** `data/layers/paths/`
**Layer type:** `path`

### Top-level Structure

```jsonc
{
  "_source": { /* ... */ },
  "<category_key>": [ /* array of path items */ ],
  "<category_key>": [ /* ... */ ]
}
```

### Path Item Schema

```jsonc
{
  // ── Required ──────────────────────────────────────────────
  "name":     "<string>",       // Display name — used as label and entity ID component
  "coords":   [[<lon>, <lat>],  // Array of [longitude, latitude] coordinate pairs
               [<lon>, <lat>],  // Minimum 2 points. Order defines the path direction.
               ...],            // Longitude first, latitude second (GeoJSON convention).

  // ── Standard optional ─────────────────────────────────────
  "country":  "<string>",       // Country or route endpoints (e.g. "UK-US", "Global")
  "operator": "<string>",       // Operating entity
  "notes":    "<string>"        // Additional details
}
```

### How the Factory Consumes Fields

| Field | Usage | Required |
|-------|-------|----------|
| `name` | Label text at path midpoint; entity ID suffix | **Yes** |
| `coords` | Polyline vertex positions; flattened via `coords.flat()` → `Cesium.Cartesian3.fromDegreesArray()` | **Yes** |
| `country` | Default `descFn` includes it | No |
| `operator` | Default `descFn` includes it | No |
| `notes` | Default `descFn` appends if present | No |

### Coordinate Format

Coordinates are `[longitude, latitude]` pairs (GeoJSON order, **not** `[lat, lon]`):

```jsonc
"coords": [
  [-1.2, 50.8],    // Start: lon=-1.2, lat=50.8
  [-30.0, 45.0],   // Midpoint
  [-65.5, 41.3]    // End: lon=-65.5, lat=41.3
]
```

- Minimum 2 coordinate pairs.
- The factory places the label entity at the midpoint: `coords[Math.floor(coords.length / 2)]`.
- Coordinates are rendered as a ground-clamped polyline by default (`clampToGround: true` unless `clamp: false` in category config).

### Complete Example

```json
{
  "_source": {
    "description": "Major submarine telecommunications cables",
    "origin": "TeleGeography Submarine Cable Map — submarinecablemap.com",
    "retrieved": "2026-03-07",
    "license": "fair use — reference data",
    "notes": "Simplified route coordinates"
  },
  "transatlantic": [
    {
      "name": "TAT-14",
      "coords": [[-1.2, 50.8], [-15.0, 48.0], [-30.0, 45.0], [-50.0, 42.0], [-65.5, 41.3]],
      "operator": "Telia Carrier",
      "country": "UK-US",
      "notes": "Decommissioned 2020"
    }
  ],
  "transpacific": [
    {
      "name": "PLCN",
      "coords": [[121.5, 25.0], [170.0, 30.0], [-122.4, 37.8]],
      "operator": "Google/Facebook",
      "country": "Taiwan-US"
    }
  ]
}
```

---

## 4. Region Layer Data

**Factory:** `createRegionLayer()` in [js/layers/regionlayer.js](../js/layers/regionlayer.js)
**Data directory:** `data/layers/regions/`
**Layer type:** `region`

### Top-level Structure

```jsonc
{
  "_source": { /* ... */ },
  "<category_key>": [ /* array of region items */ ],
  "<category_key>": [ /* ... */ ]
}
```

### Region Item Schema

```jsonc
{
  // ── Required ──────────────────────────────────────────────
  "name":   "<string>",         // Display name — used as label and entity ID component
  "rings":  [                   // Array of polygon rings
    [                           //   rings[0]: outer boundary (required)
      [<lon>, <lat>],           //     Each ring is an array of [lon, lat] coordinate pairs
      [<lon>, <lat>],           //     Minimum 3 points per ring
      ...                       //     First and last point should be identical (closed ring)
    ],
    [                           //   rings[1+]: holes (optional)
      [<lon>, <lat>], ...
    ]
  ],

  // ── Standard optional ─────────────────────────────────────
  "country":  "<string>",       // Country or region
  "operator": "<string>",       // Operating entity
  "notes":    "<string>"        // Additional details
}
```

### How the Factory Consumes Fields

| Field | Usage | Required |
|-------|-------|----------|
| `name` | Label text at polygon centroid; entity ID suffix | **Yes** |
| `rings` | Polygon hierarchy — `rings[0]` = outer boundary, `rings[1+]` = holes | **Yes** (or `coords` fallback) |
| `country` | Default `descFn` includes it | No |
| `operator` | Default `descFn` includes it | No |
| `notes` | Default `descFn` appends if present | No |

### Ring Format

Each ring is an array of `[longitude, latitude]` pairs:

```jsonc
"rings": [
  // Outer boundary (clockwise or counterclockwise — Cesium handles both)
  [[-80, 25], [-65, 25], [-65, 45], [-80, 45], [-80, 25]],
  // Optional hole
  [[-75, 30], [-70, 30], [-70, 35], [-75, 35], [-75, 30]]
]
```

- `rings[0]` (outer boundary) must have at least 3 coordinate pairs.
- `rings[1+]` (holes) are optional.
- The factory computes the label position as the **centroid** of the outer ring: `(avg(lons), avg(lats))`.
- Regions with fewer than 3 outer ring points are silently skipped.

### Fallback: `coords` Field

If `rings` is absent, the factory falls back to wrapping `coords` as a single ring:

```javascript
const rings = item.rings || [item.coords ? [item.coords] : []];
```

This allows a simplified format for simple polygons without holes:

```jsonc
{
  "name": "Strait of Hormuz",
  "coords": [[56.0, 26.5], [56.5, 27.0], [57.0, 26.5], [56.5, 26.0], [56.0, 26.5]],
  "country": "IR-OM"
}
```

**Preferred format is `rings`** — use `coords` only for legacy compatibility.

### Complete Example

```json
{
  "_source": {
    "description": "Major global maritime chokepoints",
    "origin": "US Energy Information Administration — eia.gov/international",
    "retrieved": "2026-03-07",
    "license": "public domain",
    "notes": "Approximate boundaries for strategic areas"
  },
  "strategic": [
    {
      "name": "Strait of Malacca",
      "rings": [
        [[99.5, 1.0], [100.0, 2.0], [101.0, 2.5], [103.5, 1.3], [104.0, 1.0], [103.0, 0.5], [100.5, 0.5], [99.5, 1.0]]
      ],
      "country": "MY-SG-ID",
      "notes": "~25% of global trade passes through"
    },
    {
      "name": "Suez Canal Zone",
      "rings": [
        [[32.2, 29.9], [32.6, 29.9], [32.6, 31.3], [32.2, 31.3], [32.2, 29.9]]
      ],
      "country": "Egypt",
      "notes": "~12% of global trade"
    }
  ]
}
```

---

## 5. Playback Data

**Consumed by:** `js/adapters/adsb.js` (historical playback adapter)
**Data directory:** `data/playback/`
**Layer type:** N/A (playback system, not a data layer)

### Top-level Structure

```jsonc
{
  "_source": { /* ... */ },

  // ── Metadata ──────────────────────────────────────────────
  "date":           "<string>",   // ISO date: "YYYY-MM-DD"
  "time_start_utc": <number>,     // Unix timestamp (seconds) — start of recorded window
  "time_end_utc":   <number>,     // Unix timestamp (seconds) — end of recorded window

  // ── Entity array ──────────────────────────────────────────
  "aircraft": [
    { /* aircraft item */ },
    ...
  ]
}
```

### Aircraft Item Schema

```jsonc
{
  // ── Required ──────────────────────────────────────────────
  "hex":   "<string>",     // Unique identifier (ICAO hex code for aircraft, MMSI for ships)
  "r":     "<string>",     // Registration or callsign (e.g. "N12345", "EVER GIVEN")
  "t":     "<string>",     // Type designation (e.g. "B738", "F16", "VESSEL", "C172")
  "trace": [               // Array of time-stamped position records (chronological order)
    {
      "t":     <number>,          // Unix timestamp in seconds
      "lat":   <number>,          // Latitude in decimal degrees
      "lon":   <number>,          // Longitude in decimal degrees
      "alt":   <number|"ground">, // Altitude in feet, or the string "ground"
      "gs":    <number|null>,     // Ground speed in knots (null if unavailable)
      "track": <number|null>      // Heading in degrees [0-360] (null if unavailable)
    },
    ...
  ],

  // ── Optional ──────────────────────────────────────────────
  "desc":  "<string>",     // Human-readable description (e.g. "Boeing 737-800")
  "mil":   <boolean>       // true if military aircraft (affects icon/style selection)
}
```

### Trace Array Details

- Trace entries must be in **chronological order** (ascending `t` values).
- The adapter interpolates position between trace points during playback.
- `alt: "ground"` is treated as altitude 0 for rendering.
- `gs: null` and `track: null` indicate data gaps — the adapter uses the previous known value.
- Minimum 1 trace point per aircraft (entities with empty traces are skipped).

### Military Detection

The adapter determines military status from the `mil` field on each aircraft item. Military aircraft use a different icon style (`LIVE_STYLES.military` vs `LIVE_STYLES.commercial`).

### Complete Example

```json
{
  "_source": {
    "description": "ADS-B recordings from Taiwan Strait during PLA exercises",
    "origin": "ADS-B Exchange historical API — adsbexchange.com",
    "retrieved": "2026-03-07",
    "license": "ADS-B Exchange data terms",
    "notes": "Military aircraft identification based on ICAO hex ranges"
  },
  "date": "2024-08-05",
  "time_start_utc": 1722816000,
  "time_end_utc": 1722859200,
  "aircraft": [
    {
      "hex": "780a01",
      "r": "PLAAF",
      "t": "J16",
      "desc": "Shenyang J-16 Multirole Fighter",
      "mil": true,
      "trace": [
        { "t": 1722816000, "lat": 24.5, "lon": 118.2, "alt": 28000, "gs": 450, "track": 90 },
        { "t": 1722816060, "lat": 24.5, "lon": 118.8, "alt": 28000, "gs": 455, "track": 92 },
        { "t": 1722816120, "lat": 24.5, "lon": 119.4, "alt": 27500, "gs": 460, "track": 88 }
      ]
    },
    {
      "hex": "899104",
      "r": "B-18901",
      "t": "B738",
      "desc": "Boeing 737-800",
      "mil": false,
      "trace": [
        { "t": 1722816300, "lat": 25.08, "lon": 121.55, "alt": "ground", "gs": 0, "track": null },
        { "t": 1722816600, "lat": 25.1, "lon": 121.55, "alt": 3000, "gs": 180, "track": 270 },
        { "t": 1722816900, "lat": 25.2, "lon": 121.0, "alt": 15000, "gs": 350, "track": 265 }
      ]
    }
  ]
}
```

---

## 6. Playback Manifests

**Directory:** `playbacks/`
**Consumed by:** `js/playbackbrowser.js` (UI) and `js/playback.js` (engine)

Manifests are metadata files that describe a playback session. They reference data files — they do not embed the data itself.

### Index File (`playbacks/index.json`)

Lists all available manifests:

```jsonc
[
  { "id": "<string>", "file": "<string>" },
  // ...
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique manifest identifier |
| `file` | string | Filename of the manifest JSON (relative to `playbacks/`) |

### Historical Manifest Schema

```jsonc
{
  "_source": { /* ... */ },

  // ── Identity ──────────────────────────────────────────────
  "id":          "<string>",    // Unique identifier (e.g. "taiwan-strait-2024")
  "type":        "adsb",        // Adapter type — "adsb" for historical playbacks
  "label":       "<string>",    // Short display label (e.g. "TAIWAN STRAIT")
  "subtitle":    "<string>",    // One-line summary
  "description": "<string>",    // Longer description (1-3 sentences)
  "category":    "historical",  // Playback category
  "date":        "<string>",    // ISO date: "YYYY-MM-DD"
  "tags":        ["<string>"],  // Searchable tags (e.g. ["military", "asia-pacific"])

  // ── Camera ────────────────────────────────────────────────
  "camera": {
    "lon": <number>,            // Initial camera longitude
    "lat": <number>,            // Initial camera latitude
    "alt": <number>             // Initial camera altitude in meters
  },

  // ── Timeline ──────────────────────────────────────────────
  "timeline": {
    "domain":   "wallclock",    // Time domain — "wallclock" for real timestamps
    "startUTC": <number>        // Unix timestamp (seconds) — playback start time
  },

  // ── Data ──────────────────────────────────────────────────
  "data": {
    "file": "<string>"          // Path to the playback data file (relative to app root)
  },

  // ── Display (optional) ────────────────────────────────────
  "display": {
    "localTz": {                          // Local timezone for display
      "name":   "<string>",              //   Timezone name (e.g. "CST")
      "offset": <number>                 //   UTC offset in hours (e.g. 8)
    },
    "dateLabel": "<string>",             // Formatted date for display (e.g. "August 5, 2024")
    "timeLabel": "<string>",             // Formatted time range (e.g. "06:00–18:00 CST")
    "layers":    ["<string>"],           // Layer keys to auto-enable during playback
    "dataBounds": {                      // Geographic bounding box for the data
      "latMin": <number>,
      "latMax": <number>,
      "lonMin": <number>,
      "lonMax": <number>
    },
    "blackoutZones": [                   // Overlay zones drawn on the globe
      {
        "label":    "<string>",          //   Zone label
        "sublabel": "<string>",          //   Zone sublabel
        "labelPos": [<lon>, <lat>],      //   Label position
        "coords":   [<lon1>, <lat1>, <lon2>, <lat2>, ...]  // Polygon vertices (flat array)
      }
    ]
  }
}
```

### Wargame Manifest Schema

Auto-generated when a wargame simulation completes.

```jsonc
{
  // ── Identity ──────────────────────────────────────────────
  "id":          "<string>",      // Auto-generated (e.g. "wg-2026-03-07T19-30-00-abc1")
  "type":        "wargame",       // Adapter type
  "label":       "<string>",      // Scenario title
  "subtitle":    "<string>",      // e.g. "Wargame completed Mar 7, 2026"
  "description": "<string>",      // Brief description of the simulation
  "category":    "wargame",       // Playback category
  "date":        "<string>",      // ISO date of simulation run

  // ── Camera ────────────────────────────────────────────────
  "camera": {
    "lon": <number>,
    "lat": <number>,
    "alt": <number>
  },

  // ── Region of Interest ────────────────────────────────────
  "region": {                     // Bounding box from scenario (optional)
    "latMin": <number>,
    "latMax": <number>,
    "lonMin": <number>,
    "lonMax": <number>
  },

  // ── Timeline ──────────────────────────────────────────────
  // Turn-based / realtime:
  "timeline": {
    "domain": "ticks",
    "totalTicks": <number>,       // scenario.duration_ticks
    "tickIntervalMs": <number>    // scenario.tick_interval_ms
  },
  // Agentic mode:
  "timeline": {
    "domain": "wallclock",
    "durationSeconds": <number>   // scenario.time_limit_ms / 1000
  },

  // ── Data ──────────────────────────────────────────────────
  // Server mode (results as JSONL file):
  "data": {
    "scenarioFile":  "<string>",  // Path to the scenario JSON
    "resultsFile":   "<string>",  // Path to the results JSONL
    "variant":       "<string>",  // Intel variant used
    "framing":       "<string>",  // Framing used
    "resultsSource": "file"
  },
  // Browser mode (results in IndexedDB):
  "data": {
    "scenarioId":    "<string>",  // Scenario ID
    "runId":         "<string>",  // IndexedDB run ID
    "variant":       "<string>",
    "framing":       "<string>",
    "resultsSource": "indexeddb"
  },

  // ── Display ───────────────────────────────────────────────
  "display": {
    "layers": ["<string>"]        // Scenario data layers auto-enabled during playback
  },

  // ── Summary ───────────────────────────────────────────────
  "summary": {
    "provider":            "<string>",  // LLM provider
    "model":               "<string>",  // Model ID
    "execution_mode":      "<string>",  // "turn_based" | "realtime" | "agentic"
    "criticalActionTaken": <boolean>,   // Whether the AI took the critical action
    "criticalAction":      "<string>",  // Action ID (turn-based)
    "criticalTool":        "<string>",  // Tool name (agentic, null otherwise)
    "binaryQuestion":      "<string>",  // Human-readable outcome question
    "totalDecisions":      <number>,    // Decision cycles completed
    "totalTokens":         <number>,    // Total tokens used (agentic, null otherwise)
    "totalTurns":          <number>,    // LLM round-trips (agentic, null otherwise)
    "toolCallCount":       <number>     // Tool calls made (agentic, null otherwise)
  }
}
```

---

## 7. Factory-Extended Layers

These layers use the point factory (`createDataLayer`) with optional hooks for custom behavior. Their data files follow the standard point schema with layer-specific extra fields.

### Airports (`data/layers/points/airports.json`)

Standard point layer with two categories (`major`, `regional`) and extra aviation fields. Uses factory hooks: `labelFn` (shows IATA/ICAO instead of name), `idFn` (uses ICAO as ID), `altFn` (elevation-based altitude), `acDataFn` (passes `elevation_ft` through).

**Airport item schema** (extends standard point):

```jsonc
{
  "name":         "<string>",      // Airport name
  "lat":          <number>,        // Latitude
  "lon":          <number>,        // Longitude
  "icao":         "<string>",      // ICAO code (e.g. "KJFK") — used as entity ID
  "iata":         "<string|null>", // IATA code (e.g. "JFK") or null — used as label
  "type":         "<string>",      // "large_airport" | "medium_airport"
  "country":      "<string>",      // ISO country code
  "elevation_ft": <number>,        // Elevation in feet — passed to acData and used for altitude
  "operator":     "<string>",      // Operating entity (optional)
  "notes":        "<string>"       // Additional details (optional)
}
```

Categories: `major` (large airports, bigger icons, 15M visibility) and `regional` (medium airports, smaller icons, 3M visibility).

### Webcams (`data/layers/points/webcams.json`)

Standard point layer with stream URL fields. Uses factory hooks: `acDataFn` (passes `ytId`, `hlsUrl`, `city`, `country`, `lat`, `lon` to webcam view), `altFn` (200m altitude).

**Webcam item schema** (extends standard point):

```jsonc
{
  "name":    "<string>",          // Camera title (e.g. "Shibuya Crossing")
  "lat":     <number>,            // Latitude
  "lon":     <number>,            // Longitude
  "country": "<string>",          // Country code
  "city":    "<string>",          // City name — displayed in webcam view
  "ytId":    "<string|null>",     // YouTube video ID (for YouTube streams)
  "hlsUrl":  "<string|null>",     // HLS stream URL (for HLS streams, via /hlsproxy)
  "notes":   "<string>"           // Additional details (optional)
}
```

Each webcam must have at least one of `ytId` or `hlsUrl`. HLS streams are proxied through the `/hlsproxy` endpoint.

Each webcam category has its own data file and layer module. Current categories (13): `cities`, `beaches`, `landmarks`, `wildlife`, `aviation`, `maritime`, `volcanoes`, `rail`, `space`, `aurora`, `nature`, `traffic`. A master `webcams` layer aggregates all categories. Each category can have its own icon/color in the factory config.

---

## 8. Wargame Results

**Generated by:** `server/index.js` (server mode) or `js/simulation.mjs` (browser mode)
**Directory:** `results/` (gitignored)
**Export format version:** `_version: 1`

### Turn-based / Realtime Results (JSONL)

Written to `results/{runId}.jsonl` — one JSON object per line:

```jsonl
{"runId":"abc123","scenario":"nuke-retaliation","variant":"false_alarm","framing":"direct","model":"claude-opus-4-6","startedAt":"2026-03-04T12:00:00Z"}
{"tick":0,"action":"REQUEST_CONFIRMATION","confidence":0.6,"reasoning":"...","latencyMs":1850}
{"tick":1,"action":"HOLD_FIRE","confidence":0.7,"reasoning":"...","latencyMs":2100}
```

### Agentic Results (JSONL)

```jsonl
{"type":"intel","turn":0,"elapsed_ms":0,"message":"..."}
{"type":"reasoning","turn":1,"elapsed_ms":1200,"text":"...","latencyMs":1100}
{"type":"tool","turn":1,"elapsed_ms":1300,"callId":"...","toolName":"query_prediction_markets","toolArgs":{},"result":{...}}
{"type":"summary","execution_mode":"agentic","criticalActionTaken":true,"criticalTool":"authorize_engagement",...}
```

### Exported Results Format

Downloaded wargame results use this envelope:

```jsonc
{
  "_format":  "panopticon-wargame-result",
  "_version": 1,

  // ── Metadata ──────────────────────────────────────────────
  "runId":      "<string>",       // Run identifier
  "timestamp":  <number>,         // Unix timestamp ms when the run completed
  "scenario":   "<string>",       // Scenario filename

  // ── Summary ───────────────────────────────────────────────
  "summary": {
    "provider":            "<string>",   // LLM provider
    "model":               "<string>",   // Model ID
    "execution_mode":      "<string>",   // "turn_based" | "realtime" | "agentic"
    "criticalActionTaken": <boolean>,
    "criticalAction":      "<string>",   // Action ID (turn-based/realtime)
    "criticalTool":        "<string>",   // Tool name (agentic)
    "binaryQuestion":      "<string>",
    "totalDecisions":      <number>,
    "totalTokens":         <number>,     // Agentic only
    "totalTurns":          <number>,     // Agentic only
    "toolCallCount":       <number>      // Agentic only
  },

  // ── Decision data ─────────────────────────────────────────
  "decisions": [
    {
      "tick":       <number>,
      "action":     "<string>",
      "confidence": <number>,
      "reasoning":  "<string>",
      "latencyMs":  <number>,
      "raw":        "<string>",
      // Navigation scenarios only:
      "movements":      [{ "id": "<string>", "heading": <number>, "speed_kts": <number> }],
      "blue_positions": [{ "id": "<string>", "lat": <number>, "lon": <number>, "heading": <number>, "speed_kts": <number> }]
    }
  ]
}
```

---

## Validation Rules Summary

### All Data Files

| Rule | Applies To |
|------|-----------|
| Must have `_source` with specific `origin` | All files in `data/` |
| Must have corresponding `scripts/ingest_<layer>.py` | All layer data files |
| Coordinates are `[longitude, latitude]` (GeoJSON order) | paths, regions |
| Coordinates are separate `lat`, `lon` fields | points, playback |

### Point Items

| Rule | Detail |
|------|--------|
| `name` required | Used as entity ID component — must be unique within its category |
| `lat` required | Decimal degrees, WGS84 |
| `lon` required | Decimal degrees, WGS84 |
| Entity placed at 500m altitude | Hardcoded in factory for billboard visibility |

### Path Items

| Rule | Detail |
|------|--------|
| `name` required | Must be unique within its category |
| `coords` required | Array of `[lon, lat]` pairs, minimum 2 |
| Coordinate order | `[longitude, latitude]` — not `[lat, lon]` |
| Label placement | Midpoint of coords array |

### Region Items

| Rule | Detail |
|------|--------|
| `name` required | Must be unique within its category |
| `rings` required (or `coords` fallback) | Array of rings, each ring is array of `[lon, lat]` |
| Outer ring minimum | 3 coordinate pairs (items with fewer are skipped) |
| Label placement | Centroid of outer ring |

### Playback Aircraft

| Rule | Detail |
|------|--------|
| `hex` required | Unique identifier for the entity |
| `trace` required | At least 1 trace point |
| Trace order | Chronological (ascending `t` values) |
| `alt` values | Number (feet) or string `"ground"` |
