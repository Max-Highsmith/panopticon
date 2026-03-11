/* ===================================================================
   PANOPTICON — Browser-Side Agentic LLM Adapters
   Tool-use adapters for multi-turn agentic execution in the browser.
   Uses API keys from settings.js. Same normalized response format
   as server/agentic-adapters.mjs.

   Return format:
   {
     text,                     // Reasoning/text content (may be null)
     toolCalls,                // [{id, name, arguments}] (may be empty)
     rawAssistantMessage,      // Provider-native message (for conversation)
     usage,                    // Token usage
     stopReason,               // 'tool_use' | 'end_turn'
   }
   =================================================================== */

import { getSettings } from './settings.js';
import { toAnthropicTools, toOpenAITools, toGeminiTools } from './toolformat.mjs';

// =====================================================
// MESSAGE FORMAT CONVERTERS (same as server)
// =====================================================

function toAnthropicMessages(messages) {
  const out = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      if (msg.toolResults) {
        out.push({
          role: 'user',
          content: msg.toolResults.map(tr => ({
            type: 'tool_result',
            tool_use_id: tr.id,
            content: JSON.stringify(tr.result),
          })),
        });
      } else {
        out.push({ role: 'user', content: msg.content });
      }
    } else if (msg.role === 'assistant') {
      if (msg.rawAssistantMessage) {
        out.push(msg.rawAssistantMessage);
      } else {
        out.push({ role: 'assistant', content: msg.content });
      }
    }
  }
  return out;
}

function toOpenAIMessages(messages) {
  const out = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      if (msg.toolResults) {
        for (const tr of msg.toolResults) {
          out.push({ role: 'tool', tool_call_id: tr.id, content: JSON.stringify(tr.result) });
        }
      } else {
        out.push({ role: 'user', content: String(msg.content || '') });
      }
    } else if (msg.role === 'assistant') {
      if (msg.rawAssistantMessage) {
        // Normalize: some providers reject content:null — ensure it's a string
        const raw = { ...msg.rawAssistantMessage };
        if (raw.content == null) raw.content = '';
        out.push(raw);
      } else {
        out.push({ role: 'assistant', content: String(msg.content || '') });
      }
    }
  }
  return out;
}

function toGeminiContents(messages) {
  const out = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      if (msg.toolResults) {
        out.push({
          role: 'user',
          parts: msg.toolResults.map(tr => ({
            functionResponse: { name: tr.name, response: tr.result },
          })),
        });
      } else {
        out.push({ role: 'user', parts: [{ text: msg.content }] });
      }
    } else if (msg.role === 'model' || msg.role === 'assistant') {
      if (msg.rawAssistantMessage) {
        out.push(msg.rawAssistantMessage);
      } else {
        out.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }
  }
  return out;
}

// =====================================================
// RESPONSE PARSERS
// =====================================================

function parseAnthropicResponse(data) {
  let text = null;
  const toolCalls = [];
  for (const block of (data.content || [])) {
    if (block.type === 'text') text = (text || '') + block.text;
    else if (block.type === 'tool_use') {
      toolCalls.push({ id: block.id, name: block.name, arguments: block.input || {} });
    }
  }
  return {
    text, toolCalls,
    rawAssistantMessage: { role: 'assistant', content: data.content },
    usage: data.usage || {},
    stopReason: data.stop_reason === 'tool_use' ? 'tool_use' : 'end_turn',
  };
}

function parseOpenAIResponse(data) {
  const choice = data.choices?.[0];
  if (!choice) return { text: null, toolCalls: [], rawAssistantMessage: null, usage: data.usage || {}, stopReason: 'end_turn' };
  const msg = choice.message;
  const toolCalls = (msg.tool_calls || []).map(tc => ({
    id: tc.id,
    name: tc.function.name,
    arguments: typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments,
  }));
  return {
    text: msg.content || null, toolCalls,
    rawAssistantMessage: msg,
    usage: data.usage || {},
    stopReason: choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn',
  };
}

function parseGeminiResponse(data) {
  const candidate = data.candidates?.[0];
  if (!candidate) return { text: null, toolCalls: [], rawAssistantMessage: null, usage: {}, stopReason: 'end_turn' };
  let text = null;
  const toolCalls = [];
  const parts = candidate.content?.parts || [];
  for (const part of parts) {
    if (part.text) text = (text || '') + part.text;
    else if (part.functionCall) {
      toolCalls.push({
        id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: part.functionCall.name,
        arguments: part.functionCall.args || {},
      });
    }
  }
  return {
    text, toolCalls,
    rawAssistantMessage: candidate.content ? { role: 'model', parts } : null,
    usage: data.usageMetadata || {},
    stopReason: toolCalls.length > 0 ? 'tool_use' : 'end_turn',
  };
}

// =====================================================
// BROWSER AGENTIC ADAPTERS
// =====================================================

export const agenticAdapters = {
  async google({ model, systemPrompt, messages, tools, maxTokens }) {
    const { googleApiKey } = getSettings();
    if (!googleApiKey) throw new Error('Google API key not set');
    const m = model || 'gemini-2.5-pro';
    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: toGeminiContents(messages),
      generationConfig: { maxOutputTokens: maxTokens || 4096 },
    };
    if (tools && Object.keys(tools).length > 0) {
      body.tools = [{ function_declarations: toGeminiTools(tools) }];
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${googleApiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    if (!res.ok) throw new Error(`Google API error ${res.status}: ${await res.text()}`);
    return parseGeminiResponse(await res.json());
  },

  async anthropic({ model, systemPrompt, messages, tools, maxTokens }) {
    const { anthropicApiKey, proxyUrl } = getSettings();
    if (!anthropicApiKey) throw new Error('Anthropic API key not set');
    if (!proxyUrl) throw new Error('Anthropic requires a CORS proxy URL');
    const baseUrl = proxyUrl.replace(/\/+$/, '');
    const body = {
      model: model || 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens || 4096,
      system: systemPrompt,
      messages: toAnthropicMessages(messages),
    };
    if (tools && Object.keys(tools).length > 0) {
      body.tools = toAnthropicTools(tools);
    }
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    return parseAnthropicResponse(await res.json());
  },

  async openai({ model, systemPrompt, messages, tools, maxTokens }) {
    const { openaiApiKey, openaiBaseUrl } = getSettings();
    if (!openaiApiKey) throw new Error('OpenAI API key not set');
    const baseUrl = (openaiBaseUrl || 'https://api.openai.com').replace(/\/+$/, '');
    const m = model || 'gpt-4o';
    const body = {
      model: m,
      max_tokens: maxTokens || 4096,
      messages: [
        { role: 'system', content: String(systemPrompt) },
        ...toOpenAIMessages(messages),
      ],
    };
    if (tools && Object.keys(tools).length > 0) {
      body.tools = toOpenAITools(tools);
      body.tool_choice = 'auto';
    }
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`OpenAI API error ${res.status} (model: ${m}): ${await res.text()}`);
    return parseOpenAIResponse(await res.json());
  },

  async xai({ model, systemPrompt, messages, tools, maxTokens }) {
    const { xaiApiKey, openaiBaseUrl } = getSettings();
    if (!xaiApiKey) throw new Error('xAI API key not set');
    const baseUrl = (openaiBaseUrl || 'https://api.x.ai').replace(/\/+$/, '');
    const m = model || 'grok-3';
    const body = {
      model: m,
      max_tokens: maxTokens || 4096,
      messages: [
        { role: 'system', content: String(systemPrompt) },
        ...toOpenAIMessages(messages),
      ],
    };
    if (tools && Object.keys(tools).length > 0) {
      body.tools = toOpenAITools(tools);
      body.tool_choice = 'auto';
    }
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`xAI API error ${res.status} (model: ${m}): ${await res.text()}`);
    return parseOpenAIResponse(await res.json());
  },

  async openrouter({ model, systemPrompt, messages, tools, maxTokens }) {
    const { openrouterApiKey } = getSettings();
    if (!openrouterApiKey) throw new Error('OpenRouter API key not set');
    // For agentic tool-use, prefer models with strong tool support
    const m = model || 'anthropic/claude-sonnet-4-5-20250929';
    const body = {
      model: m,
      max_tokens: maxTokens || 4096,
      messages: [
        { role: 'system', content: String(systemPrompt) },
        ...toOpenAIMessages(messages),
      ],
    };
    if (tools && Object.keys(tools).length > 0) {
      body.tools = toOpenAITools(tools);
      body.tool_choice = 'auto';
    }
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openrouterApiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      // Extract provider name from error for better diagnostics
      let provider = '';
      try { provider = ` [provider: ${JSON.parse(errText).error?.metadata?.provider_name || '?'}]`; } catch {}
      throw new Error(`OpenRouter API error ${res.status} (model: ${m})${provider}: ${errText}`);
    }
    return parseOpenAIResponse(await res.json());
  },

  async baseline() {
    return {
      text: 'Baseline agent does not support agentic tool use. Standing by.',
      toolCalls: [],
      rawAssistantMessage: null,
      usage: {},
      stopReason: 'end_turn',
    };
  },
};
