// Bring-your-own-model integration.
//
// Nūs ships with Claude and Gemini, but a customer may already pay for another
// OpenAI-compatible endpoint (a university gateway, OpenRouter, a local
// vLLM/Ollama server, or a company proxy). This module stores that endpoint
// beside the other local settings, encrypts its key with the OS keychain, and
// speaks the one wire format those providers share: POST /chat/completions.
//
// The key never goes into the database, the renderer, or a log line. The
// renderer only ever sees whether a key exists.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const secrets = require('./secrets');

const KEY_NAME = 'custom_api_key';
const CONFIG_FILE = 'api-integration.json';
const TIMEOUT_MS = 120000;
const MAX_INPUT_CHARS = 150000;

function configPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(value) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(value, null, 2), 'utf8');
}

function normalizeBaseUrl(value) {
  let raw = String(value || '').trim();
  if (!raw) return { error: 'base_url_required' };
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url;
  try { url = new URL(raw); } catch { return { error: 'base_url_invalid' }; }
  if (!['http:', 'https:'].includes(url.protocol)) return { error: 'base_url_invalid' };
  url.hash = '';
  url.search = '';
  let base = url.toString().replace(/\/+$/, '');
  // Accept either "https://host/v1" or the full ".../v1/chat/completions".
  if (!/\/chat\/completions$/i.test(base)) base += '/chat/completions';
  return { baseUrl: base };
}

function isConfigured() {
  const config = readConfig();
  return Boolean(config.baseUrl && config.model && secrets.getSecret(KEY_NAME));
}

function status() {
  const config = readConfig();
  const hasKey = Boolean(secrets.getSecret(KEY_NAME));
  return {
    configured: Boolean(config.baseUrl && config.model && hasKey),
    baseUrl: config.baseUrl || '',
    model: config.model || '',
    hasKey,
    encryptionAvailable: secrets.isAvailable(),
  };
}

function save(payload) {
  const base = normalizeBaseUrl(payload?.baseUrl);
  if (base.error) return base;
  const model = String(payload?.model || '').trim();
  if (!model) return { error: 'model_required' };
  const key = String(payload?.key || '').trim();
  if (!key && !secrets.getSecret(KEY_NAME)) return { error: 'api_key_required' };
  if (key) secrets.setSecret(KEY_NAME, key);
  const config = readConfig();
  config.baseUrl = base.baseUrl;
  config.model = model;
  config.enabled = true;
  config.updatedAt = new Date().toISOString();
  writeConfig(config);
  return { ok: true, ...status() };
}

function clear() {
  secrets.deleteSecret(KEY_NAME);
  try { fs.unlinkSync(configPath()); } catch {}
  return { ok: true };
}

function endpointFor(baseUrl) {
  return normalizeBaseUrl(baseUrl).baseUrl;
}

function messageContent(prompt, options) {
  const image = options && options.imageDataUrl;
  if (!image) return prompt;
  return [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: image } },
  ];
}

function parseReply(data) {
  const choice = Array.isArray(data?.choices) ? data.choices[0] : null;
  const content = choice?.message?.content ?? choice?.text ?? '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('');
  }
  return '';
}

async function requestJson(url, init) {
  const response = await fetch(url, { ...init, signal: init?.signal || AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = String(body?.error?.message || body?.error?.type || body?.message || detail).slice(0, 300);
    } catch {}
    return { error: 'api_failed', detail };
  }
  return { data: await response.json() };
}

async function complete(prompt, options = {}) {
  const config = readConfig();
  const key = secrets.getSecret(KEY_NAME);
  if (!config.baseUrl || !config.model || !key) return { error: 'no_custom_api' };
  const endpoint = endpointFor(config.baseUrl);
  if (!endpoint) return { error: 'base_url_invalid' };
  try {
    const { data, error } = await requestJson(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: messageContent(String(prompt || '').slice(0, MAX_INPUT_CHARS), options) }],
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature == null ? 0.2 : options.temperature,
        stream: false,
      }),
    });
    if (error) return error;
    return { text: parseReply(data) };
  } catch (error) {
    return { error: error.name === 'TimeoutError' ? 'api_timeout' : 'api_network', detail: String(error.message || '').slice(0, 300) };
  }
}

// OpenAI-compatible SSE. We deliberately send one delta at a time so the UI
// can paint tokens the same way it does for Claude/Gemini.
async function completeStream(prompt, onEvent) {
  const config = readConfig();
  const key = secrets.getSecret(KEY_NAME);
  if (!config.baseUrl || !config.model || !key) return { error: 'no_custom_api' };
  const endpoint = endpointFor(config.baseUrl);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: messageContent(String(prompt || '').slice(0, MAX_INPUT_CHARS), {}) }],
        max_tokens: 4096,
        temperature: 0.2,
        stream: true,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try { detail = String((await response.json())?.error?.message || detail).slice(0, 300); } catch {}
      return { error: 'api_failed', detail };
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) { text += delta; onEvent({ type: 'delta', text: delta }); }
        } catch {}
      }
    }
    if (text) onEvent({ type: 'delta', text: '' });
    return { text };
  } catch (error) {
    return { error: error.name === 'TimeoutError' ? 'api_timeout' : 'api_network', detail: String(error.message || '').slice(0, 300) };
  }
}

async function testConnection() {
  const result = await complete('Reply with exactly the word OK and nothing else.');
  if (result.error) return result;
  return /\bOK\b/i.test(result.text) ? { ok: true } : { error: 'unexpected_reply' };
}

module.exports = {
  status,
  isConfigured,
  save,
  clear,
  complete,
  completeStream,
  testConnection,
  normalizeBaseUrl,
};
