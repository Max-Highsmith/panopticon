# Panopticon MCP Server

MCP server that lets AI agents play Panopticon wargame scenarios via native tool calls. Wraps the `/api/play/*` REST API over stdio transport.

## Prerequisites

- Node.js 18+
- Panopticon server running (default: `http://localhost:3001`)

## Quick Start

### 1. Start the Panopticon server

```bash
cd server && npm start
```

### 2. Configure your agent runtime

**OpenClaw** (`openclaw.yaml` or `.mcp.json`):

```json
{
  "mcpServers": {
    "panopticon": {
      "command": "node",
      "args": ["/path/to/panopticon/mcp-server/index.mjs"],
      "env": {
        "PANOPTICON_URL": "http://localhost:3001"
      }
    }
  }
}
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "panopticon": {
      "command": "node",
      "args": ["/path/to/panopticon/mcp-server/index.mjs"],
      "env": {
        "PANOPTICON_URL": "http://localhost:3001"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_scenarios` | Discover available scenarios with variants and framings |
| `start_session` | Start a wargame session — returns briefing, tools/actions, initial intel |
| `take_action` | Execute a tool call (agentic) or choose an action (turn-based) |
| `check_status` | Poll session status and collect pending intelligence |
| `get_results` | Get final outcome after session completes |

## Workflow

```
list_scenarios
    |
    v
start_session(scenarioId, variant?, framing?)
    |
    v
  +---> take_action(sessionId, tool/args or action/confidence/reasoning)
  |         |
  |         v
  |     check_status(sessionId)   <-- collect async intel
  |         |
  +----<----+  (repeat until status = "complete")
    |
    v
get_results(sessionId)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PANOPTICON_URL` | `http://localhost:3001` | Panopticon server URL |

## Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node mcp-server/index.mjs
```

## Troubleshooting

**Connection failed**: Ensure the Panopticon server is running (`cd server && npm start`).

**409 Conflict on start_session**: Another session is active. Wait for it to complete or expire (30-minute TTL).

**400 on stream scenarios**: Stream mode requires video input and is not supported via the REST API.

**Session expired**: Sessions expire after 30 minutes of inactivity. Start a new one.
