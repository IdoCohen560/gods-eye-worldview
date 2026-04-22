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
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) return null;
  const data: any = await resp.json();
  if (!data.access_token) return null;
  memCached = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 1800) * 1000 };
  return memCached.accessToken;
}

const handler: Handler = async (event) => {
  const { lamin, lomin, lamax, lomax } = event.queryStringParameters || {};
  if (!lamin || !lomin || !lamax || !lomax) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing bounds parameters' }) };
  }

  const params = new URLSearchParams({ lamin, lomin, lamax, lomax });
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${OPENSKY_URL}?${params}`, { headers });
    const data = await res.text();
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=5',
      },
      body: data,
    };
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch from OpenSky' }) };
  }
};

export { handler };
