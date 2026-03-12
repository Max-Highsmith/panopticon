/* ===================================================================
   PANOPTICON — Gemini Live API Streaming Adapter
   WebSocket client for real-time multimodal (video/audio) wargame
   execution via Google's Gemini Live (BidiGenerateContent) API.
   =================================================================== */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { toGeminiTools } from '../js/toolformat.mjs';

const GEMINI_LIVE_ENDPOINT =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

/**
 * A single session with the Gemini Live API.
 * Manages the WebSocket lifecycle, frame/audio streaming,
 * tool call handling, and text output.
 *
 * Events:
 *   ready        — setup complete, ready to stream
 *   text(string) — model emitted text content
 *   toolCall({ functionCalls: [{name, id, args}] })
 *   error(Error)
 *   closed()
 */
export class GeminiLiveSession extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this._ready = false;
    this._closed = false;
  }

  /**
   * Open WebSocket and send setup message.
   * Resolves when the server responds with setupComplete.
   *
   * @param {Object} config
   * @param {string} config.model       — e.g. 'gemini-2.5-flash-native-audio-preview-12-2025'
   * @param {string} config.systemPrompt
   * @param {Object} config.tools       — tool registry (Panopticon internal format)
   * @param {string} [config.apiKey]    — defaults to GOOGLE_API_KEY env
   * @returns {Promise<void>}
   */
  connect(config) {
    const key = config.apiKey || process.env.GOOGLE_API_KEY;
    if (!key) return Promise.reject(new Error('GOOGLE_API_KEY not set'));

    const model = config.model || 'gemini-2.5-flash-native-audio-preview-12-2025';

    return new Promise((resolve, reject) => {
      const url = `${GEMINI_LIVE_ENDPOINT}?key=${key}`;
      this.ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        reject(new Error('Gemini Live connection timed out (30s)'));
        this.close();
      }, 30000);

      this.ws.on('open', () => {
        // Send setup message immediately
        const setup = {
          setup: {
            model: `models/${model}`,
            generationConfig: {
              responseModalities: ['TEXT'],
            },
            systemInstruction: {
              parts: [{ text: config.systemPrompt }],
            },
          },
        };

        // Add tool declarations if present
        if (config.tools && Object.keys(config.tools).length > 0) {
          const geminiTools = toGeminiTools(config.tools);
          setup.setup.tools = [{ functionDeclarations: geminiTools }];
        }

        this.ws.send(JSON.stringify(setup));
      });

      this.ws.on('message', (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return; // ignore non-JSON
        }

        // Setup complete — ready to stream
        if (msg.setupComplete != null) {
          clearTimeout(timeout);
          this._ready = true;
          this.emit('ready');
          resolve();
          return;
        }

        // Model text / content output
        if (msg.serverContent) {
          const parts = msg.serverContent.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.text) {
              this.emit('text', part.text);
            }
          }
          // generationComplete signals end of a model turn
          if (msg.serverContent.generationComplete) {
            this.emit('turnComplete');
          }
          return;
        }

        // Tool / function call from model
        if (msg.toolCall) {
          this.emit('toolCall', msg.toolCall);
          return;
        }

        // Server is about to disconnect
        if (msg.goAway) {
          this.emit('goAway', msg.goAway);
          return;
        }

        // Usage metadata
        if (msg.usageMetadata) {
          this.emit('usage', msg.usageMetadata);
          return;
        }
      });

      this.ws.on('error', (err) => {
        clearTimeout(timeout);
        this.emit('error', err);
        if (!this._ready) reject(err);
      });

      this.ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        this._closed = true;
        this.emit('closed', { code, reason: reason?.toString() });
        if (!this._ready) reject(new Error(`WebSocket closed before ready: ${code}`));
      });
    });
  }

  /**
   * Send a video frame to the model.
   * @param {string} base64Jpeg — base64-encoded JPEG image data
   */
  sendFrame(base64Jpeg) {
    if (!this._ready || this._closed) return;
    this.ws.send(JSON.stringify({
      realtimeInput: {
        mediaChunks: [{
          data: base64Jpeg,
          mimeType: 'image/jpeg',
        }],
      },
    }));
  }

  /**
   * Send audio data to the model.
   * @param {string} base64Pcm — base64-encoded 16-bit PCM audio (16 kHz)
   */
  sendAudio(base64Pcm) {
    if (!this._ready || this._closed) return;
    this.ws.send(JSON.stringify({
      realtimeInput: {
        mediaChunks: [{
          data: base64Pcm,
          mimeType: 'audio/pcm',
        }],
      },
    }));
  }

  /**
   * Send a text message to the model (e.g. intel update).
   * @param {string} text
   */
  sendText(text) {
    if (!this._ready || this._closed) return;
    this.ws.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }],
        }],
        turnComplete: true,
      },
    }));
  }

  /**
   * Send tool/function execution results back to the model.
   * @param {Array<{name: string, response: Object}>} responses
   */
  sendToolResponses(responses) {
    if (!this._ready || this._closed) return;
    this.ws.send(JSON.stringify({
      toolResponse: {
        functionResponses: responses.map(r => ({
          name: r.name,
          response: r.response,
        })),
      },
    }));
  }

  /** Gracefully close the session. */
  close() {
    this._closed = true;
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
    }
  }

  get isReady() { return this._ready && !this._closed; }
}
