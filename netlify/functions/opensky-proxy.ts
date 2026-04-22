import type { Handler } from '@netlify/functions';

// OpenSky: OAuth2 client_credentials (basic auth retired 2024).
const OPENSKY_URL = 'https://opensky-network.org/api/states/all';
const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

// Module-scoped cache — best-effort, survives warm invocations on Netlify.
interface TokenState { accessToken: string; expiresAt: number; }
let memCached: TokenState | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID?.trim();
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  if (memCached && Date.now() < memCached.expiresAt - 60_000) return memCached.accessToken;

  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret });
  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 5000);
    let resp: Response;
    try {
      resp = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: ac.signal,
      });
    } finally {
      clearTimeout(to);
    }
    if (!resp.ok) return null;
    const data: any = await resp.json();
    if (!data.access_token) return null;
    memCached = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 1800) * 1000 };
    return memCached.accessToken;
  } catch {
    // Token endpoint unreachable / timed out — caller will continue unauth and likely hit an empty result.
    return null;
  }
}

const handler: Handler = async (event) => {
  const { lamin, lomin, lamax, lomax } = event.queryStringParameters || {};
  if (!lamin || !lomin || !lamax || !lomax) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing bounds parameters' }) };
  }

  const params = new URLSearchParams({ lamin, lomin, lamax, lomax });
  let token: string | null = null;
  try { token = await getAccessToken(); } catch { token = null; }
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const emptyOk = (reason: string, upstreamStatus?: number) => ({
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=5',
    },
    body: JSON.stringify({ states: [], time: Math.floor(Date.now() / 1000), error: reason, upstreamStatus }),
  });

  try {
    // Budget the upstream so Netlify's 10s function cap doesn't turn into a 502.
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(`${OPENSKY_URL}?${params}`, { headers, signal: ac.signal });
    } finally {
      clearTimeout(to);
    }

    if (!res.ok) {
      // OpenSky now requires OAuth; anon returns 403/429. Return 200 + empty so the UI keeps working.
      return emptyOk(`OpenSky ${res.status}${!token ? ' (no credentials)' : ''}`, res.status);
    }
    const data = await res.text();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=5',
      },
      body: data,
    };
  } catch (e: any) {
    return emptyOk(e?.name === 'AbortError' ? 'OpenSky upstream timeout' : 'OpenSky fetch failed');
  }
};

export { handler };
