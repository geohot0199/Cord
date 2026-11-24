# API integration

Nūs can use any OpenAI-compatible chat-completions endpoint instead of, or
before, the built-in Claude/Gemini path. This is the customer-facing integration
under **Settings → API → Bring your own model**.

## What to enter

| Field | Example | Notes |
|---|---|---|
| Base URL | `https://api.openai.com/v1` | `http://localhost:11434/v1` for Ollama, `https://openrouter.ai/api/v1` for OpenRouter. A full `/chat/completions` URL is also accepted. |
| Model | `gpt-4o-mini` | The model id the endpoint expects. |
| API key | `sk-...` | Stored with Electron `safeStorage` on desktop and in the app's private storage on Android. Never written to the coursework database. |

## Request shape

```
POST {baseUrl}/chat/completions
Authorization: Bearer {apiKey}
Content-Type: application/json

{
  "model": "{model}",
  "messages": [{ "role": "user", "content": "..." }],
  "max_tokens": 4096,
  "temperature": 0.2,
  "stream": false
}
```

The reply is read from `choices[0].message.content`. The same endpoint powers
syllabus extraction, Ask, chat, and voice. A failed custom call is reported as
an error; Nūs does not silently send the same prompt to another provider.

## Desktop storage

`src/custom-api.js` keeps the endpoint and model in
`<userData>/api-integration.json` and the key in the OS-encrypted secrets
store (`custom_api_key`). `ai.status()` returns only `configured`, `baseUrl`,
`model`, and `hasKey`, so the renderer never receives the key.

## Android

`renderer/mobile.js` mirrors the same API over Capacitor. The key lives in the
WebView's private `localStorage`, which Android sandboxes per app. HTTP is
allowed only for loopback hosts (`localhost`, `127.0.0.1`, `10.0.2.2`) so a
local Ollama/vLLM server works without opening the whole app to cleartext.

## Build

```
npm run mobile:apk
```

The debug APK is written to
`android/app/build/outputs/apk/debug/app-debug.apk`.
