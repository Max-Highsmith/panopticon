/* ===================================================================
   PANOPTICON — Agentic LLM Adapters (Server-Side)
   Tool-use adapters for multi-turn agentic execution.
   Each adapter returns a normalized response:
   {
     text,                     // Reasoning/text content (may be null)
     toolCalls,                // [{id, name, arguments}] (may be empty)
     rawAssistantMessage,      // Provider-native assistant message (for conversation history)
     usage,                    // Token usage
     stopReason,               // 'tool_use' | 'end_turn' | 'max_tokens' | 'stop'
   }
   =================================================================== */

import { toAnthropicTools, toOpenAITools, toGeminiTools } from '../js/toolformat.mjs';

// =====================================================
// MESSAGE FORMAT CONVERTERS
// =====================================================

/**
 * Build content for a tool result, handling multimodal (_image) results.
 * Convention: tool handlers return { _image: { base64, media_type }, ...metadata }
 * to signal that the result contains image data for vision-capable models.
 */
function buildToolResultContent(tr, provider) {
  const result = tr.result;
  if (result && result._image && result._image.base64) {
    const { base64, media_type } = result._image;
    const metadata = { ...result };
    delete metadata._image;
    const metadataStr = JSON.stringify(metadata);

    if (provider === 'anthropic') {
      return [
        { type: 'image', source: { type: 'base64', media_type, data: base64 } },
        { type: 'text', text: metadataStr },
      ];
    }
    // OpenAI/Gemini/xAI: text-only fallback (tool results don't support inline images)
    return `[IMAGE SENSOR DATA ACQUIRED — delivered to operator display]\n${metadataStr}`;
  }
  return JSON.stringify(result);
}

/**
 * Convert internal message format to Anthropic messages array.
 * Internal format: [{ role, content, toolCalls?, toolResults? }]
 */
function toAnthropicMessages(messages) {
  const out = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      if (msg.toolResults) {
        // Tool results — may contain multimodal content via _image convention
        out.push({
          role: 'user',
          content: msg.toolResults.map(tr => ({
            type: 'tool_result',
            tool_use_id: tr.id,
            content: buildToolResultContent(tr, 'anthropic'),
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

/**
 * Convert internal message format to OpenAI messages array.
 */
function toOpenAIMessages(messages) {
  const out = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      if (msg.toolResults) {
        for (const tr of msg.toolResults) {
          out.push({
            role: 'tool',
            tool_call_id: tr.id,
            content: buildToolResultContent(tr, 'openai'),
          });
        }
      } else {
        out.push({ role: 'user', content: String(msg.content || '') });
      }
    } else if (msg.role === 'assistant') {
      if (msg.rawAssistantMessage) {
        // Normalize: some providers reject content:null
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

/**
 * Convert internal message format to Gemini contents array.
 */
function toGeminiContents(messages) {
  const out = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      if (msg.toolResults) {
        out.push({
          role: 'user',
          parts: msg.toolResults.map(tr => {
            // Strip _image from Gemini function responses (not supported inline)
            let response = tr.result;
            if (response && response._image) {
              response = { ...response, _note: 'Image sensor data acquired and delivered to operator display' };
              delete response._image;
            }
            return { functionResponse: { name: tr.name, response } };
          }),
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
    if (block.type === 'text') {
      text = (text || '') + block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: block.input || {},
      });
    }
  }

  return {
    text,
    toolCalls,
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
    arguments: typeof tc.function.arguments === 'string'
      ? JSON.parse(tc.function.arguments)
      : tc.function.arguments,
  }));

  return {
    text: msg.content || null,
    toolCalls,
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
    if (part.text) {
      text = (text || '') + part.text;
    } else if (part.functionCall) {
      toolCalls.push({
        id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: part.functionCall.name,
        arguments: part.functionCall.args || {},
      });
    }
  }

  return {
    text,
    toolCalls,
    rawAssistantMessage: candidate.content ? { role: 'model', parts } : null,
    usage: data.usageMetadata || {},
    stopReason: toolCalls.length > 0 ? 'tool_use' : 'end_turn',
  };
}

// =====================================================
// AGENTIC ADAPTERS
// =====================================================

export const agenticAdapters = {
  async anthropic({ model, systemPrompt, messages, tools, maxTokens }) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set');

    const body = {
      model: model || 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens || 4096,
      system: systemPrompt,
      messages: toAnthropicMessages(messages),
    };
    if (tools && Object.keys(tools).length > 0) {
      body.tools = toAnthropicTools(tools);
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }
    return parseAnthropicResponse(await res.json());
  },

  async openai({ model, systemPrompt, messages, tools, maxTokens }) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set');

    const body = {
      model: model || 'gpt-4o',
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

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }
    return parseOpenAIResponse(await res.json());
  },

  async google({ model, systemPrompt, messages, tools, maxTokens }) {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('GOOGLE_API_KEY not set');

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
      `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google API error ${res.status}: ${err}`);
    }
    return parseGeminiResponse(await res.json());
  },

  async xai({ model, systemPrompt, messages, tools, maxTokens }) {
    const key = process.env.XAI_API_KEY;
    if (!key) throw new Error('XAI_API_KEY not set');

    const body = {
      model: model || 'grok-3',
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

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`xAI API error ${res.status}: ${err}`);
    }
    return parseOpenAIResponse(await res.json());
  },

  async openrouter({ model, systemPrompt, messages, tools, maxTokens }) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('OPENROUTER_API_KEY not set');

    const body = {
      model: model || 'anthropic/claude-sonnet-4-5-20250929',
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${err}`);
    }
    return parseOpenAIResponse(await res.json());
  },

  // Baseline: returns text only, no tool calls
  async baseline({ model }) {
    return {
      text: 'REASONING: Baseline agent does not support tool use. Standing by. No action taken.',
      toolCalls: [],
      rawAssistantMessage: null,
      usage: {},
      stopReason: 'end_turn',
    };
  },
};
