#!/usr/bin/env node
/* ===================================================================
   PANOPTICON — MCP Server
   Wraps the /api/play/* REST API so OpenClaw (and other MCP-compatible
   agents) can play wargame scenarios via native tool calls.
   stdio transport — launched as a child process by the agent runtime.
   =================================================================== */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const PANOPTICON_URL = process.env.PANOPTICON_URL || 'http://localhost:3001';

const server = new McpServer({
  name: 'panopticon-wargame',
  version: '1.0.0',
});

// ── Helpers ─────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${PANOPTICON_URL}${path}`;
  try {
    const res = await fetch(url, options);
    const body = await res.text();
    let data;
    try { data = JSON.parse(body); } catch { data = body; }
    if (!res.ok) {
      const msg = typeof data === 'object' && data.error ? data.error : `HTTP ${res.status}: ${body}`;
      return { ok: false, error: msg };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: `Connection failed: ${err.message}. Is the Panopticon server running at ${PANOPTICON_URL}?` };
  }
}

function textResult(obj) {
  const text = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  return { content: [{ type: 'text', text }] };
}

// ── Tool 1: list_scenarios ──────────────────────────────────────────

server.tool(
  'list_scenarios',
  'List available Panopticon wargame scenarios with their variants, framings, and execution modes. Call this first to discover what you can play.',
  {},
  async () => {
    const result = await apiFetch('/api/play');
    if (!result.ok) return textResult(`Error: ${result.error}`);
    return textResult(result.data);
  }
);

// ── Tool 2: start_session ───────────────────────────────────────────

server.tool(
  'start_session',
  'Start a new wargame session. Returns your role briefing, available tools (agentic) or actions (turn-based), and initial intelligence. Save the sessionId for subsequent calls.',
  {
    scenarioId: z.string().describe("Scenario ID from list_scenarios (e.g. 'fourth-amendment', 'nuke-retaliation')"),
    variant: z.string().optional().describe('Scenario variant — affects conditions and pressure level (optional, defaults to first available)'),
    framing: z.string().optional().describe('Role framing — affects your authority and perspective (optional, defaults to first available)'),
  },
  async ({ scenarioId, variant, framing }) => {
    const body = { scenarioId };
    if (variant) body.variant = variant;
    if (framing) body.framing = framing;

    const result = await apiFetch('/api/play/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!result.ok) return textResult(`Error: ${result.error}`);
    return textResult(result.data);
  }
);

// ── Tool 3: take_action ─────────────────────────────────────────────

server.tool(
  'take_action',
  "Take an action in an active wargame session. For AGENTIC scenarios: provide 'tool' and 'args' to call a scenario tool. For TURN-BASED scenarios: provide 'action', 'confidence', and 'reasoning' to make a decision.",
  {
    sessionId: z.string().describe('Session ID from start_session'),
    tool: z.string().optional().describe('Tool name to call (agentic scenarios only)'),
    args: z.record(z.any()).optional().describe('Tool arguments as key-value pairs (agentic scenarios only)'),
    action: z.string().optional().describe("Action ID to take (turn-based scenarios only, e.g. 'HOLD', 'ESCALATE')"),
    confidence: z.number().min(0).max(1).optional().describe('Decision confidence 0.0-1.0 (turn-based scenarios only)'),
    reasoning: z.string().optional().describe('Reasoning for your decision (turn-based scenarios only)'),
  },
  async ({ sessionId, tool, args, action, confidence, reasoning }) => {
    const body = {};
    if (tool) {
      body.tool = tool;
      body.args = args || {};
    }
    if (action) {
      body.action = action;
      if (confidence !== undefined) body.confidence = confidence;
      if (reasoning) body.reasoning = reasoning;
    }

    const result = await apiFetch(`/api/play/${sessionId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!result.ok) return textResult(`Error: ${result.error}`);
    return textResult(result.data);
  }
);

// ── Tool 4: check_status ────────────────────────────────────────────

server.tool(
  'check_status',
  'Check the current status of a wargame session and collect any pending intelligence messages. In agentic scenarios, intel arrives asynchronously — call this between actions to stay informed.',
  {
    sessionId: z.string().describe('Session ID from start_session'),
  },
  async ({ sessionId }) => {
    const result = await apiFetch(`/api/play/${sessionId}/status`);
    if (!result.ok) return textResult(`Error: ${result.error}`);
    return textResult(result.data);
  }
);

// ── Tool 5: get_results ─────────────────────────────────────────────

server.tool(
  'get_results',
  'Get the final results of a completed wargame session, including whether the critical action was taken and the binary outcome assessment.',
  {
    sessionId: z.string().describe('Session ID from start_session'),
  },
  async ({ sessionId }) => {
    const result = await apiFetch(`/api/play/${sessionId}/results`);
    if (!result.ok) return textResult(`Error: ${result.error}`);
    return textResult(result.data);
  }
);

// ── Start ───────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[panopticon-mcp] Server running on stdio (target: ${PANOPTICON_URL})`);
}

main().catch((err) => {
  console.error('[panopticon-mcp] Fatal error:', err);
  process.exit(1);
});
