// ════════════════════════════════════════════════════
// SMG SCREENER – Pages Function pro KV storage
// Endpoint: /api/data
// Metody:
//   GET  → načte data přihlášeného uživatele z KV
//   PUT  → uloží data přihlášeného uživatele do KV
// ════════════════════════════════════════════════════

// User identification přes Cloudflare Access header
function getUserKey(request) {
  const email = request.headers.get('Cf-Access-Authenticated-User-Email');
  if (!email) {
    // Fallback pro lokální development bez Access (nikdy v produkci)
    return 'user:anonymous';
  }
  return `user:${email.toLowerCase()}`;
}

// CORS hlavičky (pro jistotu, aplikace běží na stejné doméně)
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export async function onRequestGet({ request, env }) {
  try {
    const key = getUserKey(request);
    const raw = await env.SMG_DATA.get(key);
    
    if (!raw) {
      // Uživatel ještě nemá data v KV (první přihlášení nebo nový uživatel)
      return new Response(JSON.stringify({ empty: true }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    }
    
    return new Response(raw, {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const key = getUserKey(request);
    const body = await request.text();
    
    // Validace, že je to validní JSON (jinak by se v KV uložil odpad)
    try {
      JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }
    
    await env.SMG_DATA.put(key, body);
    
    return new Response(JSON.stringify({ ok: true, key }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

// Fallback pro nepodporované metody (DELETE, POST, atd.)
export async function onRequest({ request }) {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: CORS_HEADERS,
  });
}