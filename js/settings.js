/* ===================================================================
   PANOPTICON — Settings Manager
   API keys and proxy URLs stored in localStorage. Never leaves the browser.
   =================================================================== */

const STORAGE_KEY = 'panopticon_settings';

const defaults = {
  googleApiKey: '',
  anthropicApiKey: '',
  openaiApiKey: '',
  xaiApiKey: '',
  openrouterApiKey: '',
  proxyUrl: '',        // CORS proxy for Anthropic (e.g. Cloudflare Worker)
  openaiBaseUrl: '',   // OpenAI-compatible base URL (for OpenAI, xAI, ollama, etc.)
};

export function getSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch { return { ...defaults }; }
}

export function saveSettings(partial) {
  const current = getSettings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
}

export function hasAnyApiKey() {
  const s = getSettings();
  return !!(s.googleApiKey || s.anthropicApiKey || s.openaiApiKey || s.xaiApiKey || s.openrouterApiKey);
}

export function getKeyForProvider(provider) {
  const s = getSettings();
  switch (provider) {
    case 'google': return s.googleApiKey;
    case 'anthropic': return s.anthropicApiKey;
    case 'openai': return s.openaiApiKey;
    case 'xai': return s.xaiApiKey;
    case 'openrouter': return s.openrouterApiKey;
    case 'baseline': return 'none';
    default: return '';
  }
}
