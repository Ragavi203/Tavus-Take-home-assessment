// Minimal dependency-free proxy for Tavus CVI conversations.
// Serves index.html and forwards API calls while injecting x-api-key.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Lightweight .env loader (no external deps)
(() => {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const [key, ...rest] = line.split('=');
    if (!key || rest.length === 0) continue;
    const value = rest.join('=').trim();
    if (value) process.env[key.trim()] = value;
  }
})();

const PORT = process.env.PORT || 4173;
const TAVUS_API_KEY = process.env.TAVUS_API_KEY || '';
const TAVUS_BASE_URL = process.env.TAVUS_BASE_URL || 'https://tavusapi.com/v2';
const TAVUS_OBJECTIVES_ID = process.env.TAVUS_OBJECTIVES_ID || '';
const TAVUS_GUARDRAILS_ID = process.env.TAVUS_GUARDRAILS_ID || '';
const TAVUS_DEFAULT_PERSONA_ID = process.env.TAVUS_DEFAULT_PERSONA_ID || '';
const TAVUS_DEFAULT_REPLICA_ID = process.env.TAVUS_DEFAULT_REPLICA_ID || '';
const TAVUS_ALT_PERSONA_ID = process.env.TAVUS_ALT_PERSONA_ID || '';
const TAVUS_ALT_REPLICA_ID = process.env.TAVUS_ALT_REPLICA_ID || '';
const TAVUS_ALT_OBJECTIVES_ID = process.env.TAVUS_ALT_OBJECTIVES_ID || '';
const TAVUS_ALT_GUARDRAILS_ID = process.env.TAVUS_ALT_GUARDRAILS_ID || '';

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
};

const notFound = (res) => sendJson(res, 404, { error: 'Not found' });

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });

const proxy = async ({ method, pathname, body }) => {
  if (!TAVUS_API_KEY) {
    return { status: 400, json: { error: 'Missing TAVUS_API_KEY' } };
  }

  const url = `${TAVUS_BASE_URL}${pathname}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': TAVUS_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(url, options);
  const text = await response.text();

  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (err) {
    json = { raw: text };
  }

  return { status: response.status, json };
};

const createRemote = async (pathname, payload) => {
  return proxy({ method: 'POST', pathname, body: payload });
};

const serveStatic = (res, filePath, contentType = 'text/html') => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      notFound(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (req.method === 'GET' && pathname === '/') {
    const indexPath = path.join(__dirname, 'index.html');
    serveStatic(res, indexPath, 'text/html');
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/assets/')) {
    const assetPath = path.join(__dirname, pathname);
    const ext = path.extname(assetPath);
    const contentType =
      ext === '.css'
        ? 'text/css'
        : ext === '.js'
        ? 'application/javascript'
        : 'text/plain';
    serveStatic(res, assetPath, contentType);
    return;
  }

  // API proxying
  if (pathname === '/api/config' && req.method === 'GET') {
    sendJson(res, 200, {
      has_objectives: Boolean(TAVUS_OBJECTIVES_ID),
      has_guardrails: Boolean(TAVUS_GUARDRAILS_ID),
      objectives_id: TAVUS_OBJECTIVES_ID || '',
      guardrails_id: TAVUS_GUARDRAILS_ID || '',
      persona_id: TAVUS_DEFAULT_PERSONA_ID,
      replica_id: TAVUS_DEFAULT_REPLICA_ID,
      alt_persona_id: TAVUS_ALT_PERSONA_ID,
      alt_replica_id: TAVUS_ALT_REPLICA_ID,
      alt_objectives_id: TAVUS_ALT_OBJECTIVES_ID,
      alt_guardrails_id: TAVUS_ALT_GUARDRAILS_ID,
    });
    return;
  }

  if (pathname === '/api/conversations' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      // Respect client-provided objectives/guardrails; otherwise fall back to env defaults.
      const enrichedBody = { ...body };
      if (!enrichedBody.objectives_id && TAVUS_OBJECTIVES_ID) {
        enrichedBody.objectives_id = TAVUS_OBJECTIVES_ID;
      }
      if (!enrichedBody.guardrails_id && TAVUS_GUARDRAILS_ID) {
        enrichedBody.guardrails_id = TAVUS_GUARDRAILS_ID;
      }
      const result = await proxy({
        method: 'POST',
        pathname: '/conversations',
        body: enrichedBody,
      });
      sendJson(res, result.status, result.json);
    } catch (err) {
      sendJson(res, 500, { error: err.message || 'Unexpected error' });
    }
    return;
  }

  if (pathname.startsWith('/api/conversations/') && req.method === 'GET') {
    const conversationId = pathname.split('/')[3];
    const result = await proxy({
      method: 'GET',
      pathname: `/conversations/${conversationId}`,
    });
    sendJson(res, result.status, result.json);
    return;
  }

  if (
    pathname.startsWith('/api/conversations/') &&
    pathname.endsWith('/end') &&
    req.method === 'POST'
  ) {
    const conversationId = pathname.split('/')[3];
    const result = await proxy({
      method: 'POST',
      pathname: `/conversations/${conversationId}/end`,
    });
    sendJson(res, result.status, result.json);
    return;
  }

  // Bootstrap default Style Concierge objectives + guardrails
  if (pathname === '/api/bootstrap-style' && req.method === 'POST') {
    if (!TAVUS_API_KEY) {
      sendJson(res, 400, { error: 'Missing TAVUS_API_KEY' });
      return;
    }
    try {
      const { status: oStatus, json: oJson } = await createRemote('/objectives', {
        name: 'Style Concierge Flow',
        data: [
          {
            objective_name: 'style_concierge_flow',
            objective_prompt:
              'Guide the user through: (1) confirm occasion, undertone, budget, boldness; (2) base rec (finish + 1–2 shade candidates) with why; (3) eyes/lips color story + one accessory/color pairing tip; (4) adjust boldness on request; (5) wrap with summary and offer human stylist.',
            modality: 'verbal',
          },
        ],
      });
      if (oStatus >= 400) {
        sendJson(res, oStatus, oJson);
        return;
      }

      const { status: gStatus, json: gJson } = await createRemote('/guardrails', {
        name: 'Style Safety',
        data: [
          {
            guardrail_name: 'no_medical_claims',
            guardrail_prompt:
              'Do not provide medical or dermatology advice; recommend seeing a professional if asked.',
            modality: 'verbal',
          },
          {
            guardrail_name: 'no_body_judgment',
            guardrail_prompt:
              'Avoid body-shape or appearance judgments; keep language positive, inclusive, and optional.',
            modality: 'verbal',
          },
          {
            guardrail_name: 'no_guarantees',
            guardrail_prompt:
              'Avoid promises or guarantees; use aim/suggest language.',
            modality: 'verbal',
          },
          {
            guardrail_name: 'consent_for_boldness',
            guardrail_prompt:
              'Ask before pushing bolder looks; offer a softer alternative if the user says it is too bold.',
            modality: 'verbal',
          },
        ],
      });
      if (gStatus >= 400) {
        sendJson(res, gStatus, gJson);
        return;
      }

      sendJson(res, 200, {
        objectives: oJson,
        guardrails: gJson,
        note:
          'Save these IDs (export TAVUS_OBJECTIVES_ID, TAVUS_GUARDRAILS_ID) and restart server to auto-attach.',
      });
    } catch (err) {
      sendJson(res, 500, { error: err.message || 'Unexpected error' });
    }
    return;
  }

  notFound(res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
