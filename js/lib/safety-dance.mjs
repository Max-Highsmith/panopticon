/* ===================================================================
   Safety Dance — Vendored Browser Bundle
   Combined from safety-dance v0.1.0 (github.com/Max-Highsmith/safety-dance)
   All modules inlined for browser-native ES module import (no build step).
   =================================================================== */

// ── Validation Constants ──
const INPUT_MODALITIES = ['text', 'image', 'audio', 'video'];
const OUTPUT_MODALITIES = ['text', 'tool_use', 'structured_json', 'image'];
const INTERACTION_PATTERNS = ['single_turn', 'multi_turn', 'agentic'];
const TIMINGS = ['untimed', 'turn_based', 'realtime'];
const MEASUREMENT_TYPES = ['binary', 'categorical', 'scalar', 'rubric'];
const API_FORMATS = ['anthropic', 'openai', 'gemini', 'openai_compatible', 'none'];
const MANIFEST_REQUIRED = ['manifest_version', 'id', 'interaction', 'input', 'output'];
const CAPABILITY_REQUIRED = ['manifest_version', 'model_id', 'provider', 'interaction', 'input', 'output'];

// =====================================================================
// Validation (from lib/validate.mjs)
// =====================================================================

export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be an object'] };
  }
  for (const field of MANIFEST_REQUIRED) {
    if (manifest[field] == null) errors.push(`Missing required field: ${field}`);
  }
  if (manifest.manifest_version && manifest.manifest_version !== '0.1.0') {
    errors.push(`Unsupported manifest_version: ${manifest.manifest_version} (expected 0.1.0)`);
  }
  if (manifest.id && typeof manifest.id === 'string') {
    if (!/^[a-z0-9][a-z0-9_/-]*$/.test(manifest.id)) {
      errors.push(`Invalid id format: ${manifest.id} (must be lowercase alphanumeric with hyphens/underscores/slashes)`);
    }
  }
  if (manifest.interaction) {
    if (manifest.interaction.pattern && !INTERACTION_PATTERNS.includes(manifest.interaction.pattern)) {
      errors.push(`Invalid interaction.pattern: ${manifest.interaction.pattern}`);
    }
    if (manifest.interaction.timing && !TIMINGS.includes(manifest.interaction.timing)) {
      errors.push(`Invalid interaction.timing: ${manifest.interaction.timing}`);
    }
  }
  if (manifest.input?.modalities) {
    if (!Array.isArray(manifest.input.modalities) || manifest.input.modalities.length === 0) {
      errors.push('input.modalities must be a non-empty array');
    } else {
      for (const mod of manifest.input.modalities) {
        if (!INPUT_MODALITIES.includes(mod)) errors.push(`Invalid input modality: ${mod}`);
      }
    }
  }
  if (manifest.output?.modalities) {
    if (!Array.isArray(manifest.output.modalities) || manifest.output.modalities.length === 0) {
      errors.push('output.modalities must be a non-empty array');
    } else {
      for (const mod of manifest.output.modalities) {
        if (!OUTPUT_MODALITIES.includes(mod)) errors.push(`Invalid output modality: ${mod}`);
      }
    }
  }
  if (manifest.measurement?.type && !MEASUREMENT_TYPES.includes(manifest.measurement.type)) {
    errors.push(`Invalid measurement.type: ${manifest.measurement.type}`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateCapability(capability) {
  const errors = [];
  if (!capability || typeof capability !== 'object') {
    return { valid: false, errors: ['Capability must be an object'] };
  }
  for (const field of CAPABILITY_REQUIRED) {
    if (capability[field] == null) errors.push(`Missing required field: ${field}`);
  }
  if (capability.manifest_version && capability.manifest_version !== '0.1.0') {
    errors.push(`Unsupported manifest_version: ${capability.manifest_version} (expected 0.1.0)`);
  }
  if (capability.api_format && !API_FORMATS.includes(capability.api_format)) {
    errors.push(`Invalid api_format: ${capability.api_format}`);
  }
  if (capability.interaction?.patterns) {
    if (!Array.isArray(capability.interaction.patterns) || capability.interaction.patterns.length === 0) {
      errors.push('interaction.patterns must be a non-empty array');
    } else {
      for (const pat of capability.interaction.patterns) {
        if (!INTERACTION_PATTERNS.includes(pat)) errors.push(`Invalid interaction pattern: ${pat}`);
      }
    }
  }
  if (capability.interaction?.timings) {
    for (const t of capability.interaction.timings) {
      if (!TIMINGS.includes(t)) errors.push(`Invalid timing: ${t}`);
    }
  }
  if (capability.input?.modalities) {
    if (!Array.isArray(capability.input.modalities) || capability.input.modalities.length === 0) {
      errors.push('input.modalities must be a non-empty array');
    } else {
      for (const mod of capability.input.modalities) {
        if (!INPUT_MODALITIES.includes(mod)) errors.push(`Invalid input modality: ${mod}`);
      }
    }
  }
  if (capability.output?.modalities) {
    if (!Array.isArray(capability.output.modalities) || capability.output.modalities.length === 0) {
      errors.push('output.modalities must be a non-empty array');
    } else {
      for (const mod of capability.output.modalities) {
        if (!OUTPUT_MODALITIES.includes(mod)) errors.push(`Invalid output modality: ${mod}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

// =====================================================================
// Model Registry (from lib/registry.mjs)
// =====================================================================

const REGISTRY = {
  'anthropic/claude-opus-4-6': {
    manifest_version: '0.1.0',
    model_id: 'claude-opus-4-6',
    provider: 'anthropic',
    api_format: 'anthropic',
    interaction: {
      patterns: ['single_turn', 'multi_turn', 'agentic'],
      timings: ['untimed', 'turn_based', 'realtime'],
    },
    input: { modalities: ['text', 'image'], system_prompt: true },
    output: { modalities: ['text', 'tool_use', 'structured_json'] },
    resources: { context_window_tokens: 200000, max_output_tokens: 32000, max_tool_count: 128 },
  },
  'anthropic/claude-sonnet-4-5-20250929': {
    manifest_version: '0.1.0',
    model_id: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    api_format: 'anthropic',
    interaction: {
      patterns: ['single_turn', 'multi_turn', 'agentic'],
      timings: ['untimed', 'turn_based', 'realtime'],
    },
    input: { modalities: ['text', 'image'], system_prompt: true },
    output: { modalities: ['text', 'tool_use', 'structured_json'] },
    resources: { context_window_tokens: 200000, max_output_tokens: 16000, max_tool_count: 128 },
  },
  'openai/gpt-4o': {
    manifest_version: '0.1.0',
    model_id: 'gpt-4o',
    provider: 'openai',
    api_format: 'openai',
    interaction: {
      patterns: ['single_turn', 'multi_turn', 'agentic'],
      timings: ['untimed', 'turn_based', 'realtime'],
    },
    input: { modalities: ['text', 'image', 'audio'], system_prompt: true },
    output: { modalities: ['text', 'tool_use', 'structured_json'] },
    resources: { context_window_tokens: 128000, max_output_tokens: 16384, max_tool_count: 128 },
  },
  'openai/gpt-4.1': {
    manifest_version: '0.1.0',
    model_id: 'gpt-4.1',
    provider: 'openai',
    api_format: 'openai',
    interaction: {
      patterns: ['single_turn', 'multi_turn', 'agentic'],
      timings: ['untimed', 'turn_based', 'realtime'],
    },
    input: { modalities: ['text', 'image'], system_prompt: true },
    output: { modalities: ['text', 'tool_use', 'structured_json'] },
    resources: { context_window_tokens: 1047576, max_output_tokens: 32768, max_tool_count: 128 },
  },
  'google/gemini-2.5-pro': {
    manifest_version: '0.1.0',
    model_id: 'gemini-2.5-pro',
    provider: 'google',
    api_format: 'gemini',
    interaction: {
      patterns: ['single_turn', 'multi_turn', 'agentic'],
      timings: ['untimed', 'turn_based', 'realtime'],
    },
    input: { modalities: ['text', 'image', 'audio', 'video'], system_prompt: true },
    output: { modalities: ['text', 'tool_use', 'structured_json'] },
    resources: { context_window_tokens: 1048576, max_output_tokens: 65536, max_tool_count: 128 },
  },
  'google/gemini-2.5-flash-native-audio': {
    manifest_version: '0.1.0',
    model_id: 'gemini-2.5-flash-native-audio-preview-12-2025',
    provider: 'google',
    api_format: 'gemini',
    interaction: {
      patterns: ['single_turn', 'multi_turn', 'agentic'],
      timings: ['untimed', 'turn_based', 'realtime'],
    },
    input: { modalities: ['text', 'image', 'audio', 'video'], system_prompt: true },
    output: { modalities: ['text', 'tool_use'] },
    resources: {
      context_window_tokens: 128000,
      max_output_tokens: 8192,
      max_tool_count: 64,
    },
  },

  'xai/grok-4': {
    manifest_version: '0.1.0',
    model_id: 'grok-4',
    provider: 'xai',
    api_format: 'openai_compatible',
    interaction: {
      patterns: ['single_turn', 'multi_turn', 'agentic'],
      timings: ['untimed', 'turn_based', 'realtime'],
    },
    input: { modalities: ['text', 'image'], system_prompt: true },
    output: { modalities: ['text', 'tool_use', 'structured_json'] },
    resources: { context_window_tokens: 131072, max_output_tokens: 16384, max_tool_count: 128 },
  },
  'baseline/always-hold': {
    manifest_version: '0.1.0',
    model_id: 'always-hold',
    provider: 'baseline',
    api_format: 'none',
    interaction: {
      patterns: ['single_turn', 'multi_turn'],
      timings: ['untimed', 'turn_based', 'realtime'],
    },
    input: { modalities: ['text'], system_prompt: false },
    output: { modalities: ['text'] },
    resources: { context_window_tokens: 999999, max_output_tokens: 512, max_tool_count: 0 },
  },
  'baseline/always-launch': {
    manifest_version: '0.1.0',
    model_id: 'always-launch',
    provider: 'baseline',
    api_format: 'none',
    interaction: {
      patterns: ['single_turn', 'multi_turn'],
      timings: ['untimed', 'turn_based', 'realtime'],
    },
    input: { modalities: ['text'], system_prompt: false },
    output: { modalities: ['text'] },
    resources: { context_window_tokens: 999999, max_output_tokens: 512, max_tool_count: 0 },
  },
};

export function getModelCapability(provider, modelId) {
  const key = `${provider}/${modelId}`;
  if (REGISTRY[key]) return structuredClone(REGISTRY[key]);
  for (const [k, v] of Object.entries(REGISTRY)) {
    if (k.startsWith(`${provider}/`) && (k.includes(modelId) || v.model_id === modelId)) {
      return structuredClone(v);
    }
  }
  return null;
}

export function listModels() {
  return Object.keys(REGISTRY);
}

export function registerModel(key, capability) {
  REGISTRY[key] = capability;
}

// =====================================================================
// Compatibility Checker (from lib/compatibility.mjs)
// =====================================================================

export function checkCompatibility(manifest, capability) {
  const blocking = [];
  const warnings = [];
  const info = [];

  // 1. Input modalities (blocking)
  const reqInputMods = manifest.input?.modalities || [];
  const capInputMods = capability.input?.modalities || [];
  for (const mod of reqInputMods) {
    if (!capInputMods.includes(mod)) {
      blocking.push(`Model does not support required input modality: ${mod}`);
    }
  }
  const extraInputMods = capInputMods.filter(m => !reqInputMods.includes(m));
  if (extraInputMods.length > 0) {
    info.push(`Model has additional input modalities: ${extraInputMods.join(', ')}`);
  }

  // 2. Output modalities (blocking or warning)
  const reqOutputMods = manifest.output?.modalities || [];
  const capOutputMods = capability.output?.modalities || [];
  for (const mod of reqOutputMods) {
    if (!capOutputMods.includes(mod)) {
      if (mod === 'tool_use') {
        if (manifest.interaction?.pattern === 'agentic') {
          blocking.push('Model does not support tool_use (required for agentic interaction)');
        } else {
          warnings.push('Model does not support tool_use; benchmark may use text parsing fallback');
        }
      } else if (mod === 'structured_json') {
        warnings.push('Model does not declare structured_json output; text parsing fallback will be used');
      } else {
        blocking.push(`Model does not support required output modality: ${mod}`);
      }
    }
  }

  // 3. Interaction pattern (blocking)
  const reqPattern = manifest.interaction?.pattern;
  const capPatterns = capability.interaction?.patterns || [];
  if (reqPattern && !capPatterns.includes(reqPattern)) {
    const hierarchy = ['single_turn', 'multi_turn', 'agentic'];
    const reqRank = hierarchy.indexOf(reqPattern);
    const maxCapRank = Math.max(...capPatterns.map(p => hierarchy.indexOf(p)));
    if (reqRank >= 0 && maxCapRank >= reqRank) {
      info.push(`Benchmark needs ${reqPattern}; model supports ${capPatterns.join(', ')} (compatible superset)`);
    } else {
      blocking.push(`Model does not support interaction pattern: ${reqPattern}`);
    }
  }

  // 4. Timing (warning)
  const reqTiming = manifest.interaction?.timing;
  if (reqTiming && reqTiming !== 'untimed') {
    const capTimings = capability.interaction?.timings || ['untimed', 'turn_based', 'realtime'];
    if (!capTimings.includes(reqTiming)) {
      warnings.push(`Model may not perform well in ${reqTiming} timing mode`);
    }
  }

  // 5. System prompt (warning)
  const reqSysPrompt = manifest.input?.system_prompt;
  const capSysPrompt = capability.input?.system_prompt;
  if (reqSysPrompt && capSysPrompt === false) {
    warnings.push('Benchmark uses system prompt but model does not support one; content will be prepended to user message');
  }

  // 6. Context window (blocking or warning)
  const reqContext = manifest.resources?.min_context_tokens;
  const capContext = capability.resources?.context_window_tokens;
  if (reqContext != null && capContext != null) {
    if (reqContext > capContext) {
      blocking.push(`Benchmark requires ${reqContext} context tokens; model supports ${capContext}`);
    } else if (reqContext > capContext * 0.8) {
      warnings.push(`Benchmark needs ${reqContext} context tokens; model has ${capContext} (tight margin)`);
    }
  }

  // 7. Output tokens (warning)
  const reqOutput = manifest.resources?.min_output_tokens;
  const capOutput = capability.resources?.max_output_tokens;
  if (reqOutput != null && capOutput != null) {
    if (reqOutput > capOutput) {
      warnings.push(`Benchmark expects ${reqOutput} output tokens; model max is ${capOutput}`);
    }
  }

  // 8. Tool count (warning)
  const reqTools = manifest.resources?.tool_count;
  const capTools = capability.resources?.max_tool_count;
  if (reqTools != null && capTools != null) {
    if (reqTools > capTools) {
      warnings.push(`Benchmark uses ${reqTools} tools; model supports max ${capTools}`);
    }
  }

  // 9. Token budget (info)
  if (manifest.resources?.token_budget != null) {
    info.push(`Benchmark has ${manifest.resources.token_budget} token budget across all turns`);
  }

  const breakdown = {
    input_modalities: fieldCheck(reqInputMods, capInputMods, 'subset'),
    output_modalities: fieldCheck(reqOutputMods, capOutputMods, 'subset'),
    interaction_pattern: fieldCheck(reqPattern, capPatterns, 'member_or_superset'),
    timing: fieldCheck(reqTiming, capability.interaction?.timings, 'member'),
    system_prompt: fieldCheck(reqSysPrompt, capSysPrompt, 'bool'),
    context_window: fieldCheck(reqContext, capContext, 'lte'),
    output_tokens: fieldCheck(reqOutput, capOutput, 'lte'),
    tool_count: fieldCheck(reqTools, capTools, 'lte'),
  };

  return { compatible: blocking.length === 0, blocking, warnings, info, breakdown };
}

function fieldCheck(required, available, mode) {
  if (required == null || available == null) return 'unknown';
  switch (mode) {
    case 'subset':
      if (!Array.isArray(required) || !Array.isArray(available)) return 'unknown';
      return required.every(r => available.includes(r)) ? 'pass' : 'fail';
    case 'member':
      if (!Array.isArray(available)) return available === required ? 'pass' : 'fail';
      return available.includes(required) ? 'pass' : 'fail';
    case 'member_or_superset': {
      if (!Array.isArray(available)) return 'unknown';
      if (available.includes(required)) return 'pass';
      const hierarchy = ['single_turn', 'multi_turn', 'agentic'];
      const reqRank = hierarchy.indexOf(required);
      const maxCapRank = Math.max(...available.map(p => hierarchy.indexOf(p)));
      return (reqRank >= 0 && maxCapRank >= reqRank) ? 'pass' : 'fail';
    }
    case 'bool':
      return (!required || available !== false) ? 'pass' : 'warn';
    case 'lte':
      if (typeof required !== 'number' || typeof available !== 'number') return 'unknown';
      return required <= available ? 'pass' : 'fail';
    default:
      return 'unknown';
  }
}

// =====================================================================
// Panopticon Adapter (from adapters/panopticon.mjs)
// =====================================================================

export function scenarioToManifest(scenario) {
  const execMode = scenario.execution_mode || 'turn_based';
  const hasTools = !!(scenario.tools && Object.keys(scenario.tools).length > 0);
  const hasMonitors = !!(scenario.monitors && Object.keys(scenario.monitors).length > 0);
  const hasNavigation = !!scenario.navigation;
  const responseFormat = scenario.response_format || 'text';

  let pattern;
  if (execMode === 'agentic' || execMode === 'stream') {
    pattern = 'agentic';
  } else {
    pattern = 'multi_turn';
  }

  let timing;
  if (execMode === 'realtime' || execMode === 'stream') {
    timing = 'realtime';
  } else if (execMode === 'turn_based') {
    timing = 'turn_based';
  } else {
    timing = 'untimed';
  }

  const inputModalities = ['text'];
  if (scenario.input_modalities) {
    inputModalities.length = 0;
    inputModalities.push(...scenario.input_modalities);
  }

  const outputModalities = ['text'];
  if (hasTools || hasMonitors) {
    outputModalities.push('tool_use');
  }
  if (responseFormat === 'json' || hasNavigation) {
    if (!outputModalities.includes('structured_json')) {
      outputModalities.push('structured_json');
    }
  }

  const turnCount = execMode === 'agentic'
    ? (scenario.max_turns || 50)
    : (scenario.duration_ticks || 12);

  const estimatedContextTokens = 500 + turnCount * (300 + 100 + 50);

  const toolCount = (hasTools ? Object.keys(scenario.tools).length : 0)
    + (hasMonitors ? Object.keys(scenario.monitors).length : 0);

  const domains = inferSafetyDomains(scenario);

  const measurement = {};
  if (scenario.measurement) {
    measurement.type = 'binary';
    measurement.critical_action = scenario.measurement.critical_action
      || scenario.measurement.critical_tool || null;
    measurement.question = scenario.measurement.binary_question || null;
  }

  const manifest = {
    manifest_version: '0.1.0',
    id: scenario.id,
    label: scenario.label || scenario.id,
    description: scenario.description || '',
    source: 'panopticon',
    interaction: { pattern, timing },
    input: { modalities: inputModalities, system_prompt: true },
    output: { modalities: outputModalities },
    resources: {
      min_context_tokens: estimatedContextTokens,
      min_output_tokens: responseFormat === 'json' ? 256 : 128,
    },
    safety: { domain: domains },
    measurement,
    metadata: {
      panopticon_execution_mode: execMode,
      panopticon_navigation: hasNavigation,
      panopticon_response_format: responseFormat,
      panopticon_variants: Object.keys(scenario.intel_feed || scenario.intel_schedule || {}),
      panopticon_framings: Object.keys(scenario.framings || {}),
    },
  };

  if (turnCount) manifest.interaction.max_turns = turnCount;
  if (scenario.time_limit_ms) manifest.interaction.time_limit_ms = scenario.time_limit_ms;
  if (scenario.duration_ticks) manifest.interaction.tick_count = scenario.duration_ticks;
  if (scenario.tick_interval_ms) manifest.interaction.tick_interval_ms = scenario.tick_interval_ms;
  if (scenario.token_budget) manifest.resources.token_budget = scenario.token_budget;
  if (toolCount > 0) manifest.resources.tool_count = toolCount;

  if (responseFormat === 'json') {
    manifest.output.structured_format = hasNavigation
      ? 'action_confidence_reasoning_movements'
      : 'action_confidence_reasoning';
  }

  return manifest;
}

export function providerToCapability(provider, modelId) {
  return getModelCapability(provider, modelId);
}

function inferSafetyDomains(scenario) {
  const domains = new Set();
  const id = (scenario.id || '').toLowerCase();
  const desc = (scenario.description || '').toLowerCase();
  const actions = (scenario.actions || []).map(a => a.id || '').join(' ').toLowerCase();
  const toolNames = Object.keys(scenario.tools || {}).join(' ').toLowerCase();
  const criticalRef = (
    scenario.measurement?.critical_action
    || scenario.measurement?.critical_tool
    || ''
  ).toLowerCase();

  if (id.includes('nuke') || id.includes('nuclear') || desc.includes('nuclear')
      || desc.includes('icbm') || actions.includes('launch_retaliation')) {
    domains.add('weapons_of_mass_destruction');
  }
  if (id.includes('bioweapon') || desc.includes('bioweapon') || desc.includes('biological weapon')) {
    domains.add('weapons_of_mass_destruction');
  }
  if (id.includes('autonomous-weapon') || desc.includes('autonomous weapon')
      || desc.includes('autonomous system')) {
    domains.add('autonomous_weapons');
  }
  if (criticalRef.includes('strike') || criticalRef.includes('launch')
      || criticalRef.includes('engage') || criticalRef.includes('fire')
      || toolNames.includes('strike') || toolNames.includes('missile')
      || id.includes('assassination') || id.includes('elimination')
      || id.includes('drone-collateral')) {
    domains.add('lethal_force');
  }
  if (toolNames.includes('market_order') || toolNames.includes('transfer_fund')
      || id.includes('bitcoin') || id.includes('currency') || id.includes('heist')
      || desc.includes('prediction market') || desc.includes('financial')) {
    domains.add('financial_manipulation');
  }
  if (id.includes('self-preservation') || desc.includes('self-continuity')
      || desc.includes('self-preservation') || id.includes('agi-breakout')) {
    domains.add('self_preservation');
  }
  if (id.includes('prediction-market') || id.includes('agi-breakout')
      || desc.includes('instrumental')) {
    domains.add('instrumental_convergence');
  }
  if (id.includes('deepfake') || id.includes('double-agent')
      || desc.includes('deception') || desc.includes('deepfake')) {
    domains.add('deception');
  }
  if (scenario.framings && (scenario.framings.delegated || scenario.framings.advisory)) {
    domains.add('delegation_effects');
  }
  if (desc.includes('escalat') || id.includes('crisis') || id.includes('invades')
      || id.includes('blockade') || id.includes('siege') || id.includes('retaliation')
      || id.includes('strait')) {
    domains.add('geopolitical_escalation');
  }
  if (desc.includes('collateral') || desc.includes('civilian')
      || id.includes('collateral') || actions.includes('evacuate_civilian')) {
    domains.add('civilian_harm');
  }
  if (toolNames.includes('surveillance') || id.includes('sleeper-cell')
      || desc.includes('surveillance')) {
    domains.add('surveillance');
  }
  if (id.includes('cyber') || desc.includes('cyber') || id.includes('emp')
      || id.includes('satellite-hijack')) {
    domains.add('cyber_operations');
  }

  return [...domains];
}
