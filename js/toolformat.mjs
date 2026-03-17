/* ===================================================================
   PANOPTICON — Tool Format Translation
   Pure functions to convert scenario tool/monitor definitions into
   provider-specific formats (Anthropic, OpenAI, Google).
   No dependencies — shared by server and browser.
   =================================================================== */

/**
 * Resolve "$ref" entries in a tool or monitor object from a shared catalog.
 * Entries with value "$ref" are replaced with the full definition from the
 * catalog. Inline object definitions pass through unchanged.
 * @param {Object} entries   Tool or monitor definitions from scenario JSON
 * @param {Object} catalog   The shared catalog (tool-catalog or monitor-catalog)
 * @returns {Object}         Resolved definitions (all entries are full objects)
 */
export function resolveRefs(entries, catalog) {
  if (!entries || !catalog) return entries || {};
  const resolved = {};
  for (const [name, def] of Object.entries(entries)) {
    if (def === '$ref') {
      const catalogDef = catalog[name];
      if (!catalogDef) {
        console.warn(`[toolformat] "$ref" for "${name}" not found in catalog, skipping`);
        continue;
      }
      resolved[name] = catalogDef;
    } else {
      resolved[name] = def;
    }
  }
  return resolved;
}

/**
 * Convert scenario monitors into read-only query tools.
 * Each monitor becomes a tool named `query_<monitorName>`.
 * @param {Object} monitors  Scenario monitors object
 * @returns {Object} Tool definitions keyed by `query_<name>`
 */
export function monitorsAsTools(monitors) {
  const tools = {};
  for (const [name, mon] of Object.entries(monitors || {})) {
    tools[`query_${name}`] = {
      description: `[READ-ONLY MONITOR] ${mon.description || name}. Returns: ${mon.returns || 'data'}`,
      parameters: {},
      required: [],
      terminal: false,
      _monitor: name,
    };
  }
  return tools;
}

/**
 * Merge scenario tools + monitor-as-tools into a single registry.
 * @param {Object} scenarioTools  Tools from scenario JSON
 * @param {Object} monitors       Monitors from scenario JSON
 * @returns {Object} Combined tool definitions
 */
export function buildToolRegistry(scenarioTools, monitors) {
  return { ...monitorsAsTools(monitors), ...(scenarioTools || {}) };
}

/**
 * Convert tool registry to Anthropic Messages API format.
 * @param {Object} tools  Combined tool definitions
 * @returns {Array} Anthropic tools array
 */
export function toAnthropicTools(tools) {
  return Object.entries(tools).map(([name, def]) => ({
    name,
    description: def.description || '',
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(def.parameters || {}).map(([k, v]) => [k, {
          type: v.type || 'string',
          description: v.description || '',
          ...(v.enum ? { enum: v.enum } : {}),
        }])
      ),
      required: def.required || [],
    },
  }));
}

/**
 * Convert tool registry to OpenAI Chat Completions format.
 * Works for OpenAI, xAI, and OpenRouter (all OpenAI-compatible).
 * @param {Object} tools  Combined tool definitions
 * @returns {Array} OpenAI tools array
 */
export function toOpenAITools(tools) {
  return Object.entries(tools).map(([name, def]) => ({
    type: 'function',
    function: {
      name,
      description: def.description || '',
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(def.parameters || {}).map(([k, v]) => [k, {
            type: v.type || 'string',
            description: v.description || '',
            ...(v.enum ? { enum: v.enum } : {}),
          }])
        ),
        required: def.required || [],
      },
    },
  }));
}

/**
 * Convert tool registry to Google Gemini function_declarations format.
 * @param {Object} tools  Combined tool definitions
 * @returns {Array} Gemini function_declarations
 */
export function toGeminiTools(tools) {
  return Object.entries(tools).map(([name, def]) => ({
    name,
    description: def.description || '',
    parameters: {
      type: 'OBJECT',
      properties: Object.fromEntries(
        Object.entries(def.parameters || {}).map(([k, v]) => [k, {
          type: (v.type || 'string').toUpperCase(),
          description: v.description || '',
          ...(v.enum ? { enum: v.enum } : {}),
        }])
      ),
      required: def.required || [],
    },
  }));
}

/**
 * Build a human-readable summary of available tools and monitors
 * for inclusion in the system prompt.
 * @param {Object} tools     Scenario tools
 * @param {Object} monitors  Scenario monitors
 * @returns {string} Formatted text block
 */
export function describeToolsForPrompt(tools, monitors) {
  const lines = [];

  if (monitors && Object.keys(monitors).length > 0) {
    lines.push('AVAILABLE MONITORS (read-only data queries):');
    for (const [name, mon] of Object.entries(monitors)) {
      lines.push(`  - query_${name}: ${mon.description || name}`);
      if (mon.returns) lines.push(`    Returns: ${mon.returns}`);
    }
    lines.push('');
  }

  if (tools && Object.keys(tools).length > 0) {
    lines.push('AVAILABLE TOOLS (actions with side effects):');
    for (const [name, def] of Object.entries(tools)) {
      const params = Object.entries(def.parameters || {})
        .map(([k, v]) => `${k}: ${v.type || 'string'}`)
        .join(', ');
      const tag = def.terminal ? ' [TERMINAL — ends simulation]' : '';
      lines.push(`  - ${name}(${params}): ${def.description || ''}${tag}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
