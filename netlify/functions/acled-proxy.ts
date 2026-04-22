import type { Handler } from '@netlify/functions';

// ACLED: OAuth2 password grant (query-param email/key retired 2024).
// GDELT: no auth, used as fallback when ACLED creds absent or rate-limited.

const ACLED_URL = 'https://api.acleddata.com/acled/read';
const ACLED_TOKEN_URL = 'https://acleddata.com/oauth/token';
const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';
const GDELT_UA = 'GodsEye/0.1 (contact via github.com/IdoCohen560/gods-eye-worldview)';

interface NormalizedEvent {
  id: string; event_type: string; title: string;
  latitude: number; longitude: number;
  country: string; location: string;
  date: string; url: string; source: string;
}

interface TokenState { accessToken: string; refreshToken: string; expiresAt: number; }
let tokenCache: TokenState | null = null;
let bodyCache: string | null = null;
let bodyCacheTime = 0;
const BODY_TTL = 600_000;

const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=600',
};

async function getAcledToken(): Promise<string | null> {
  const email = process.env.ACLED_EMAIL?.trim();
  const password = process.env.ACLED_PASSWORD?.trim();
  if (!email || !password) return null;
  if (tokenCache && Date.now() < tokenCache.expiresAt - 5 * 60_000) return tokenCache.accessToken;

  const body = new URLSearchParams({
    username: email, password,
    grant_type: 'password', client_id: 'acled',
  });
  const resp = await fetch(ACLED_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) return null;
  const data: any = await resp.json();
  if (!data.access_token) return null;
  tokenCache = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt: Date.now() + (data.expires_in ?? 86_400) * 1000,
  };
  return tokenCache.accessToken;
}

async function fetchAcled(): Promise<NormalizedEvent[] | null> {
  const token = await getAcledToken();
  if (!token) return null;

  const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    limit: '1000',
    event_date: `${since}|${today}`,
    event_date_where: 'BETWEEN',
  });

  const res = await fetch(`${ACLED_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  if (!Array.isArray(data?.data)) return null;

  return data.data
    .filter((e: any) => e.latitude && e.longitude)
    .map((e: any): NormalizedEvent => ({
      id: String(e.event_id_cnty || e.data_id),
      event_type: e.event_type || 'Conflict',
      title: e.notes || `${e.event_type} in ${e.location}`,
      latitude: Number(e.latitude),
      longitude: Number(e.longitude),
      country: e.country || '',
      location: e.location || e.admin1 || '',
      date: e.event_date || '',
      url: e.source || '',
      source: 'ACLED',
    }));
}

async function fetchGdelt(): Promise<any | null> {
  const params = new URLSearchParams({
    query: 'theme:ARMEDCONFLICT',
    mode: 'artlist',
    maxrecords: '250',
    format: 'json',
    sort: 'DateDesc',
    timespan: '24h',
  });
  const res = await fetch(`${GDELT_URL}?${params}`, {
    headers: { 'User-Agent': GDELT_UA, Accept: 'application/json' },
  });
  const text = await res.text();
  if (!text.startsWith('{') && !text.startsWith('[')) return null;
  try { return JSON.parse(text); } catch { return null; }
}

const handler: Handler = async () => {
  if (bodyCache && Date.now() - bodyCacheTime < BODY_TTL) {
    return { statusCode: 200, headers: baseHeaders, body: bodyCache };
  }

  try {
    const acled = await fetchAcled();
    if (acled && acled.length > 0) {
      bodyCache = JSON.stringify({ source: 'acled', events: acled });
      bodyCacheTime = Date.now();
      return { statusCode: 200, headers: baseHeaders, body: bodyCache };
    }
    const gdelt = await fetchGdelt();
    if (gdelt) {
      bodyCache = JSON.stringify({ source: 'gdelt', ...gdelt });
      bodyCacheTime = Date.now();
      return { statusCode: 200, headers: baseHeaders, body: bodyCache };
    }
    if (bodyCache) {
      return { statusCode: 200, headers: { ...baseHeaders, 'X-Cache': 'stale' }, body: bodyCache };
    }
    return {
      statusCode: 429,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'GDELT rate limited', source: 'gdelt', articles: [] }),
    };
  } catch {
    if (bodyCache) {
      return { statusCode: 200, headers: { ...baseHeaders, 'X-Cache': 'stale' }, body: bodyCache };
    }
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to fetch conflicts', source: 'gdelt', articles: [] }),
    };
  }
};

export { handler };
