# Styling Concierge – Tavus CVI Demo (Report)

This demo shows a high-touch styling experience powered by Tavus Conversational Video Interface (CVI). It includes a luxury-inspired, two-persona UI and a minimal Node proxy that keeps the Tavus API key server-side.

## Why this project
- Demonstrates real-time, human-in-the-loop styling with Tavus CVI.
- Protects secrets with a tiny proxy (no external deps).
- Highlights two distinct personas:
  - **Style Concierge**: Makeup + look pairing, boldness tuning, recap.
  - **Closet Refresh Curator**: Reuse-first outfits, minimal add-ons, recap + care tips.
- Persona setup + objectives/guardrails are auto-attached via env, proving safe, policy-driven sessions.

## Architecture (high level)
- **Frontend (`index.html`)**: Static, luxury-styled UI; users pick a stylist and start a session; calls the proxy, never exposes the API key.
- **Proxy (`server.js`)**: Minimal Node HTTP server (no deps) that injects `x-api-key` and forwards to Tavus (`https://tavusapi.com/v2`). Binds to `0.0.0.0` for hosting. Auto-attaches objectives/guardrails from env (default + alt personas).
- **Tavus CVI**: Creates conversations and returns `conversation_url` for the live session.

Data flow:
```
UI (stylist selection) → proxy (/api/conversations) → Tavus CVI → returns conversation_id + conversation_url
```

## Key decisions
- **No frontend secrets**: API key stays server-side; proxy handles all Tavus calls.
- **Persona flexibility**: Default + alt personas/replicas/objectives/guardrails are configurable via env; UI switches IDs per stylist.
- **Zero external deps**: Plain Node `http` + `fetch`; fast start, minimal attack surface.
- **Luxury UX**: Serif headings (Playfair/Cormorant), Inter body, muted palette, rounded cards, minimal chrome.

## Setup (local)
1) Prereqs: Node 18+.  
2) Copy env: `cp env.example .env` and set:
```
TAVUS_API_KEY=...
TAVUS_BASE_URL=https://tavusapi.com/v2
PORT=4173
TAVUS_DEFAULT_PERSONA_ID=...
TAVUS_DEFAULT_REPLICA_ID=...
TAVUS_OBJECTIVES_ID=...
TAVUS_GUARDRAILS_ID=...
TAVUS_ALT_PERSONA_ID=pc6420314586
TAVUS_ALT_REPLICA_ID=rc2146c13e81
TAVUS_ALT_OBJECTIVES_ID=o832aa68c913c
TAVUS_ALT_GUARDRAILS_ID=...
```
3) Run: `node server.js` and open `http://localhost:4173`.
4) Pick a stylist card → Start; the proxy attaches the correct persona/replica/objectives/guardrails.

## Deploy (Railway/Render)
- Add `package.json` (start: `node server.js`, engines: Node 18).
- Start command: `node server.js`; Build: none.  
- Set env vars (as above).  
- Ensure bind to `0.0.0.0` (already in `server.js`).  
- Use the service URL to access the app; frontend calls the same origin proxy.

## Files of interest
- `index.html`: UI, stylist selection, single start surface (only in stylist cards).  
- `server.js`: Proxy, env loader, auto-attach objectives/guardrails, binds `0.0.0.0`.  
- `package.json`: Start script + Node 18 engine.  
- `env.example`: Env placeholders.

## Testing snippet
```sh
curl -X POST http://localhost:4173/api/conversations \
  -H "content-type: application/json" \
  -d '{"replica_id":"<replica>","persona_id":"<persona>","conversation_name":"Demo"}'
```

## What’s left if there was more time
- Add “How it works” strip + richer editorial imagery.
- Post-session recap card with share/export.
- Optional KB upload + guardrails editor UI.
- GitHub Actions for deploy to Railway/Render.

