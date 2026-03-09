# Unity Submarine Pursuit — Setup Guide

MVP: AI-controlled submarine pursuit in 3D. The LLM navigates a submarine in real-time through the North Atlantic, tracking GOBLIN ONE from the submarine-pursuit-nav scenario.

## Architecture

```
┌─────────────────────────────────┐
│  LLM (Anthropic/OpenAI/etc)    │  Strategic: "head 090, dive to 250m, 12kts"
└──────────┬──────────────────────┘
           │
    ┌──────┴──────┐
    │ Bridge Srv  │  server/submarine-bridge.js (port 3002)
    │ (Node.js)   │  Translates sensor state ↔ LLM commands
    └──────┬──────┘
           │ WebSocket
    ┌──────┴──────┐
    │ Unity Game  │  3D underwater environment
    │             │  Submarine physics, sonar, rendering
    └─────────────┘
```

## Prerequisites

- **Unity 2021.3 LTS** or newer (2022+ recommended)
- **Node.js 18+** (for the bridge server)
- An LLM API key (Anthropic, OpenAI, Google, or OpenRouter)

## Quick Start

### 1. Start the Bridge Server

```bash
cd panopticon

# Set your API key (or use the existing .env in server/)
export ANTHROPIC_API_KEY=sk-ant-...

# Start the bridge
node server/submarine-bridge.js
```

You should see:
```
  PANOPTICON SUBMARINE BRIDGE
  WebSocket: ws://localhost:3002
  Provider:  anthropic (default model)
```

Optional environment variables:
- `SUB_PROVIDER` — LLM provider: `anthropic`, `openai`, `google`, `openrouter` (default: `anthropic`)
- `SUB_MODEL` — Override model name (e.g., `claude-sonnet-4-5-20250929`)
- `SUB_BRIDGE_PORT` — WebSocket port (default: `3002`)
- `SUB_HTTP_PORT` — Status HTTP port (default: `3003`)

### 2. Create Unity Project

1. Open Unity Hub → **New Project** → **3D (Built-in Render Pipeline)**
   - Name: `SubmarinePursuit`
   - Location: anywhere you like

2. **Copy scripts** from `panopticon/unity/Scripts/` into your Unity project's `Assets/Scripts/` folder:
   ```
   cp -r panopticon/unity/Scripts/ /path/to/SubmarinePursuit/Assets/Scripts/
   ```

3. **Unity settings** (Edit → Project Settings):
   - **Player → Other Settings → Api Compatibility Level**: set to `.NET Framework` or `.NET Standard 2.1` (needed for `System.Net.WebSockets`)
   - **Player → Other Settings → Allow 'unsafe' Code**: not needed

### 3. Set Up the Scene

1. **Delete** the default Main Camera and Directional Light (the scripts create their own)

2. Create an **empty GameObject**:
   - Right-click in Hierarchy → Create Empty
   - Name it `GameController`

3. Add the **GameManager** script to `GameController`:
   - Select `GameController`
   - Inspector → Add Component → `GameManager`

4. **That's it.** GameManager procedurally creates everything:
   - Ocean environment (floor, fog, lighting, particles)
   - Player submarine (green, with physics controller + sonar)
   - Target submarine (red, following GOBLIN ONE trace)
   - Camera (third-person follow)
   - HUD (status, sonar contacts, AI reasoning)

### 4. Hit Play

- The game auto-starts after 2 seconds (waits for WebSocket connection)
- The AI will begin issuing navigation commands every ~3 seconds
- Watch the submarine respond to AI decisions in real-time

## Controls

| Key | Action |
|-----|--------|
| WASD | Manual speed/heading override |
| Q/E | Decrease/increase depth |
| Space | Toggle active sonar |
| F1 | Toggle debug info |
| Right-click + drag | Orbit camera |
| Scroll wheel | Zoom in/out |

## What You'll See

1. **Underwater 3D environment** — dark ocean with fog, procedural seafloor with seamounts, floating particles
2. **Green submarine** (yours) — controlled by the AI, smoothly changing heading/depth/speed
3. **Red submarine** (GOBLIN ONE) — following the scenario trace, detectable by sonar
4. **HUD** showing:
   - Current heading, depth, speed, noise level
   - Sonar contacts with bearing, range, signal strength
   - AI captain's reasoning for each command
   - Intel feed messages as they're revealed

## How It Works

### Coordinate System
- 1 Unity unit = 1 nautical mile
- X axis = East, Z axis = North, Y axis = Up (negative = depth)
- Reference point: 55°N, 28°W (center of GIUK gap scenario)
- Submarine models are scaled up ~1.5x for visibility

### Sonar Model
- **Passive sonar**: up to 60nm range, signal strength depends on:
  - Distance (inverse square falloff)
  - Target speed (faster = louder = easier to detect)
  - Own speed (faster = noisier = harder to hear)
  - Thermocline effect (crossing 200m layer boundary reduces signal 60%)
- **Active sonar**: 20nm range, precise, but reveals your position
- Bearing has noise proportional to signal weakness (up to ±8°)
- Range estimates only available with strong signals

### AI Decision Loop
1. Unity sends sensor state to bridge every 2 seconds
2. Bridge formats state into an LLM prompt (position, depth, speed, sonar contacts, intel)
3. LLM responds with: `{heading, target_depth_m, speed_kts, active_sonar, reasoning}`
4. Bridge sends command back to Unity
5. SubmarineController smoothly interpolates toward commanded values
6. Intel messages from the scenario are revealed on a time schedule

### Bridge Server Protocol

**Unity → Server** (every 2s):
```json
{
  "type": "state",
  "submarine": {
    "lat": 57.2, "lon": -30.5,
    "depth_m": 200, "heading": 135, "speed_kts": 12.5
  },
  "contacts": [
    {"id": "GOBLIN ONE", "bearing": 142, "range_nm": 25.3, "signal_strength": 0.4, "classification": "Probable submarine"}
  ]
}
```

**Server → Unity** (after LLM response):
```json
{
  "type": "command",
  "heading": 150,
  "target_depth_m": 250,
  "speed_kts": 8,
  "active_sonar": false,
  "reasoning": "Reducing speed to minimize noise while closing range on bearing 142"
}
```

## Files

### Bridge Server
- `server/submarine-bridge.js` — Standalone Node.js bridge, reuses LLM adapter pattern from main wargame server

### Unity Scripts (unity/Scripts/)
| Script | Purpose |
|--------|---------|
| `GameManager.cs` | Orchestrator — builds scene, connects bridge, sends state, applies commands |
| `SubmarineController.cs` | Physics movement — smooth heading/depth/speed interpolation |
| `TargetSubmarine.cs` | Enemy sub — follows trace path from scenario |
| `SonarSystem.cs` | Passive/active sonar with signal propagation model |
| `BridgeClient.cs` | WebSocket client with thread-safe message queuing |
| `SubmarineCamera.cs` | Third-person follow camera with orbit controls |
| `SubmarineHUD.cs` | OnGUI overlay — Panopticon dark theme with green accent |
| `OceanEnvironment.cs` | Procedural underwater scene (floor, fog, lighting, particles) |
| `SubmarineModelBuilder.cs` | Builds submarine model from primitives (no asset imports) |
| `SimpleJson.cs` | Minimal JSON parser (no external dependencies) |

## Next Steps (beyond MVP)

- **Bathymetry data** — real ocean floor terrain from GEBCO/ETOPO data
- **Sonobuoy deployment** — player submarine drops sonobuoys that create sensor networks
- **Multiple contacts** — convoy scenarios with civilian and military vessels
- **Sound propagation** — ray-tracing through water column temperature/salinity profiles
- **Torpedo mechanics** — wire-guided torpedo physics if engagement authorized
- **Panopticon integration** — stream submarine position back to the CesiumJS globe view
- **Real submarine models** — import 3D models to replace primitives
