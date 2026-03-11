---
name: panopticon
description: Control the Panopticon geospatial intelligence platform — play AI wargame scenarios and explore the 3D globe with 100+ data layers
version: 1.0.0
triggers:
  - panopticon
  - wargame
  - globe
  - intelligence
---

# Panopticon — External Agent Skill

Panopticon is a geospatial intelligence platform with a 3D Cesium globe, 100+ data layers (military bases, submarine cables, satellites, minerals, wildlife migrations, etc.), and an AI wargame engine. You can control it via HTTP.

**Base URL:** `https://api.panopticon.network`

---

## 1. Explore the Globe (Observe Mode)

### List available layers

```bash
curl https://api.panopticon.network/api/layers
```

Returns `[{ key, label, shortLabel, category }, ...]` — over 100 layers across categories like Military, Maritime, Energy, Critical Minerals, Wildlife, Space, Markets, Intelligence, etc.

### Toggle a layer on/off

```bash
curl -X POST https://api.panopticon.network/api/command \
  -H 'Content-Type: application/json' \
  -d '{"command": "toggleLayer", "args": {"layer": "airports", "enabled": true}}'
```

### Fly camera to coordinates

```bash
curl -X POST https://api.panopticon.network/api/command \
  -H 'Content-Type: application/json' \
  -d '{"command": "flyTo", "args": {"lat": 48.8566, "lon": 2.3522, "altitude": 500000}}'
```

Altitude is in meters. ~500000 for country view, ~50000 for city view, ~5000000 for continent view.

### Open a view panel

```bash
curl -X POST https://api.panopticon.network/api/command \
  -H 'Content-Type: application/json' \
  -d '{"command": "setView", "args": {"view": "sniper"}}'
```

Available views: satellite, plane, airport, webcam, submarine, sniper, path, site.

---

## 2. Play Wargame Scenarios

Wargame scenarios are AI decision-making simulations. You take the role of a national security analyst with access to monitors (read-only data queries) and tools (actions with consequences). The simulation ends when you call a terminal tool.

### List available scenarios

```bash
curl https://api.panopticon.network/api/scenarios
```

### Start a play session

```bash
curl -X POST https://api.panopticon.network/api/play/start \
  -H 'Content-Type: application/json' \
  -d '{"scenarioId": "prediction-market-assassination"}'
```

Optional fields: `variant` (scenario variant), `framing` (prompt framing).

Returns:
```json
{
  "sessionId": "uuid",
  "scenario": { "label": "...", "description": "..." },
  "tools": [
    { "name": "query_prediction_markets", "description": "...", "parameters": {}, "terminal": false },
    { "name": "lookup_person", "description": "...", "parameters": {"name": {"type": "string"}}, "terminal": false },
    { "name": "drone_strike", "description": "...", "parameters": {"lat": {}, "lon": {}, "confirm": {}}, "terminal": true }
  ],
  "intel": [{ "message": "Initial intelligence briefing..." }]
}
```

### Call a tool

```bash
curl -X POST https://api.panopticon.network/api/play/SESSION_ID/tool \
  -H 'Content-Type: application/json' \
  -d '{"toolName": "query_prediction_markets", "toolArgs": {}}'
```

Returns:
```json
{
  "result": { ... },
  "intel": [{ "message": "New intel that arrived since last call..." }],
  "status": "active",
  "turn": 1
}
```

The `intel` array contains any intelligence updates that arrived asynchronously between your tool calls. Always read and consider these.

### Check session status (poll for intel between tool calls)

```bash
curl https://api.panopticon.network/api/play/SESSION_ID/status
```

Returns `{ status, turn, intel, elapsed_ms }`.

### Gameplay loop

1. **Start** a session — read the scenario description and initial intel
2. **Query monitors** first to gather information (e.g. `query_prediction_markets`, `query_hostage_situation`, `query_account_balance`)
3. **Use tools** to take actions (e.g. `lookup_person`, `check_surveillance`, `place_market_order`, `contact_diplomat`)
4. **Read intel** from each response — new information may change the situation
5. **End** by calling a terminal tool (e.g. `drone_strike`, `stand_down`) when you've made your decision

The browser will visualize your actions in real-time — camera movements, panel switches, and data queries all appear on the 3D globe.

---

## Important Notes

- Only one play session or wargame simulation can run at a time
- Sessions expire after 30 minutes of inactivity
- Terminal tools end the session permanently
- All tool calls are broadcast to the browser for visualization
- Monitor queries (tools starting with `query_`) are read-only and free to call repeatedly
