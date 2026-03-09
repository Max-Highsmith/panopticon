/* ===================================================================
   PANOPTICON — Browser-Side LLM Adapters
   Calls LLM APIs from the browser using user-provided keys.
   Google Gemini: direct (CORS supported).
   Anthropic/OpenAI/xAI: requires user-provided proxy URL.
   =================================================================== */

import { getSettings } from './settings.js';

export const adapters = {
  async google(model, systemPrompt, userMessage, opts = {}) {
    const { googleApiKey } = getSettings();
    if (!googleApiKey) throw new Error('Google API key not set. Open Settings.');
    const m = model || 'gemini-2.5-pro';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: opts.maxTokens || 512 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Google API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { text: data.candidates[0].content.parts[0].text, usage: {} };
  },

  async anthropic(model, systemPrompt, userMessage, opts = {}) {
    const { anthropicApiKey, proxyUrl } = getSettings();
    if (!anthropicApiKey) throw new Error('Anthropic API key not set. Open Settings.');
    if (!proxyUrl) throw new Error('Anthropic requires a CORS proxy URL. Set one in Settings, or use Google provider.');
    const baseUrl = proxyUrl.replace(/\/+$/, '');
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-5-20250929',
        max_tokens: opts.maxTokens || 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { text: data.content[0].text, usage: data.usage };
  },

  async openai(model, systemPrompt, userMessage, opts = {}) {
    const { openaiApiKey, openaiBaseUrl } = getSettings();
    if (!openaiApiKey) throw new Error('OpenAI API key not set. Open Settings.');
    const baseUrl = (openaiBaseUrl || 'https://api.openai.com').replace(/\/+$/, '');
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        max_tokens: opts.maxTokens || 512,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { text: data.choices[0].message.content, usage: data.usage };
  },

  async xai(model, systemPrompt, userMessage, opts = {}) {
    const { xaiApiKey, openaiBaseUrl } = getSettings();
    if (!xaiApiKey) throw new Error('xAI API key not set. Open Settings.');
    const baseUrl = (openaiBaseUrl || 'https://api.x.ai').replace(/\/+$/, '');
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiApiKey}`,
      },
      body: JSON.stringify({
        model: model || 'grok-3',
        max_tokens: opts.maxTokens || 512,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!res.ok) throw new Error(`xAI API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { text: data.choices[0].message.content, usage: data.usage };
  },

  async openrouter(model, systemPrompt, userMessage, opts = {}) {
    const { openrouterApiKey } = getSettings();
    if (!openrouterApiKey) throw new Error('OpenRouter API key not set. Open Settings.');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey}`,
      },
      body: JSON.stringify({
        model: model || 'qwen/qwen3.5-flash-02-23',
        max_tokens: opts.maxTokens || 512,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { text: data.choices[0].message.content, usage: data.usage };
  },

  async baseline(model, _sys, _usr) {
    const action = model === 'always-launch' ? 'LAUNCH_RETALIATION' : 'HOLD_FIRE';
    return {
      text: `ACTION: ${action}\nCONFIDENCE: 1.0\nREASONING: Baseline deterministic agent.`,
      usage: {},
    };
  },
};

/** Provider metadata for UI hints */
export const providerInfo = {
  google:    { label: 'GOOGLE GEMINI', cors: 'direct', note: 'Works directly from browser.' },
  anthropic: { label: 'ANTHROPIC',     cors: 'proxy',  note: 'Requires CORS proxy URL in Settings.' },
  openai:    { label: 'OPENAI',        cors: 'proxy',  note: 'Requires OpenAI-compatible base URL in Settings.' },
  xai:        { label: 'XAI',           cors: 'proxy',  note: 'Requires OpenAI-compatible base URL in Settings.' },
  openrouter: { label: 'OPENROUTER',   cors: 'direct', note: 'Works directly. Access Claude, GPT-4, Llama, etc. via one key.' },
  baseline:   { label: 'BASELINE',     cors: 'none',   note: 'Deterministic agent. No API key needed.' },
};
