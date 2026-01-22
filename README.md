# Tavus CVI Customer Advocate Demo

A lightweight, dependency-free demo that shows how to kick off and manage a Tavus **Conversational Video Interface (CVI)** session. It uses a tiny Node proxy (no external npm packages) to keep your `x-api-key` out of the browser and a static HTML UI for quick experimentation.

## What this demo does
- Starts a conversation with a provided `replica_id` and `persona_id` via `POST /v2/conversations`.
- Surfaces the returned `conversation_url` so you can open or embed the call immediately.
- Lets you fetch status (`GET /v2/conversations/{id}`) and end a call (`POST /v2/conversations/{id}/end`).
- Keeps everything configurable through environment variables instead of hard-coding secrets.

## Quick start
1. **Prereqs:** Node 18+ (for built-in `fetch`), a Tavus API key, and replica/persona IDs (stock IDs work too).
2. **Configure env:**
   ```sh
   cp env.example .env
   # then set TAVUS_API_KEY, optionally TAVUS_BASE_URL and PORT
   ```
3. **Run locally:**
   ```sh
   node server.js
   ```
4. Open `http://localhost:4173` and start a conversation. Paste your `conversation_url` in a new tab to join, or use the embed preview.

## Architecture
- **Browser UI (`index.html`)** — Vanilla JS form to collect persona/replica IDs and optional callback URL, then calls a local proxy.
- **Proxy (`server.js`)** — Small Node HTTP server that forwards requests to Tavus (`https://tavusapi.com/v2` by default) with the `x-api-key` header injected. No external packages.
- **Tavus CVI** — Handles the real-time video call; response includes `conversation_id` and `conversation_url`.
- **Optional auto-attach** — If you set `TAVUS_OBJECTIVES_ID` and `TAVUS_GUARDRAILS_ID` in `.env`, the proxy will attach them when creating conversations.

```
Browser ──► Local proxy (/api/conversations, /api/conversations/:id, /end)
        ◄── Tavus API (conversations endpoints)
```

## Key endpoints used
- `POST /v2/conversations` — start a call with `replica_id` and `persona_id`.
- `GET /v2/conversations/{conversation_id}` — check status and retrieve join URL.
- `POST /v2/conversations/{conversation_id}/end` — terminate an active call.

Reference: Tavus API docs ([Create Conversation](https://tavusapi.com/v2/conversations), [API overview](https://docs.tavus.io/api-reference/overview)).

## Testing quickly
Use curl against the local proxy (requires `TAVUS_API_KEY` set):
```sh
curl -X POST http://localhost:4173/api/conversations \
  -H "content-type: application/json" \
  -d '{"replica_id":"<replica_id>","persona_id":"<persona_id>","conversation_name":"Demo"}'
```

## (Optional) create style concierge objectives/guardrails
Hit this once (after setting `TAVUS_API_KEY`), then export the returned IDs:
```sh
curl -X POST http://localhost:4173/api/bootstrap-style
```
Set in `.env`:
```
TAVUS_OBJECTIVES_ID=<id>
TAVUS_GUARDRAILS_ID=<id>
```
Restart `node server.js`, and the proxy will attach them automatically.

## Extending (next steps if you had more time)
- Upload documents and attach a Knowledge Base to the persona for RAG-style answers.
- Add guardrails/objectives for branching flows (e.g., sales triage, interview rubric).
- Persist conversation transcripts and surface session analytics.
- Swap the vanilla UI with your preferred framework and add auth for multi-user usage.

