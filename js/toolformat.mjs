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
 * Build tool registry from scenario tools.
 * Monitors are no longer converted to tools — they are queryable through
 * query_data_layer instead.
 * @param {Object} scenarioTools  Tools from scenario JSON
 * @returns {Object} Tool definitions
 */
export function buildToolRegistry(scenarioTools) {
  return { ...(scenarioTools || {}) };
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
 * Extract tools, monitors, and state defaults from layer data files.
 * Each layer entry can be a string (include everything) or an object with
 * exclusion lists: { key, excludeTools?, excludeMonitors? }.
 *
 * Layer data files may contain:
 *   _tools:    { toolName: { category, description, parameters, required, terminal } }
 *   _monitors: { monitorName: { description, state_key } }
 *   _defaults: { stateKey: defaultValue }
 *
 * @param {Array<string|Object>} layerEntries  Scenario layers array
 * @param {Function} loadLayerFn  (key: string) => parsed layer JSON or null
 * @returns {{ tools: Object, monitors: Object, defaults: Object }}
 */
export function resolveLayerCapabilities(layerEntries, loadLayerFn) {
  const tools = {};
  const monitors = {};
  const defaults = {};

  if (!Array.isArray(layerEntries)) return { tools, monitors, defaults };

  for (const entry of layerEntries) {
    const key = typeof entry === 'string' ? entry : entry?.key;
    if (!key) continue;

    const excludeTools = (typeof entry === 'object' && Array.isArray(entry.excludeTools)) ? entry.excludeTools : [];
    const excludeMonitors = (typeof entry === 'object' && Array.isArray(entry.excludeMonitors)) ? entry.excludeMonitors : [];

    const data = loadLayerFn(key);
    if (!data) continue;

    // Extract tools from layer
    if (data._tools) {
      for (const [name, def] of Object.entries(data._tools)) {
        if (!excludeTools.includes(name)) {
          tools[name] = def;
        }
      }
    }

    // Extract monitors from layer
    if (data._monitors) {
      for (const [name, def] of Object.entries(data._monitors)) {
        if (!excludeMonitors.includes(name)) {
          monitors[name] = def;
        }
      }
    }

    // Extract state defaults from layer
    if (data._defaults) {
      for (const [stateKey, val] of Object.entries(data._defaults)) {
        if (val && typeof val === 'object' && !Array.isArray(val) && defaults[stateKey] && typeof defaults[stateKey] === 'object') {
          // Shallow merge for objects
          defaults[stateKey] = { ...defaults[stateKey], ...val };
        } else {
          // Full replacement for arrays, primitives, or first occurrence
          defaults[stateKey] = val;
        }
      }
    }
  }

  return { tools, monitors, defaults };
}

/**
 * Build a human-readable summary of available tools
 * for inclusion in the system prompt.
 * Data sources (layers + state) are discoverable via list_data_layers.
 * @param {Object} tools     Scenario tools
 * @returns {string} Formatted text block
 */
export function describeToolsForPrompt(tools) {
  const lines = [];

  if (tools && Object.keys(tools).length > 0) {
    lines.push('AVAILABLE TOOLS:');
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
