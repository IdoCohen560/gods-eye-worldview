import type { Handler } from '@netlify/functions';
import AdmZip from 'adm-zip';

// Priority: ACLED (OAuth2 password grant) → GDELT Events 2.0 raw export
// (public, geo-pinned) → GDELT DOC articles (always available, no per-
// event lat/lon).

const ACLED_URL = 'https://acleddata.com/api/acled/read';
const ACLED_TOKEN_URL = 'https://acleddata.com/oauth/token';
const GDELT_DOC_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';
const GDELT_EVENTS_INDEX = 'http://data.gdeltproject.org/gdeltv2/lastupdate.txt';
const GDELT_UA = 'GodsEye/0.1 (contact via github.com/IdoCohen560/gods-eye-worldview)';

const ROOT_LABELS: Record<string, string> = {
  '14': 'Protest', '15': 'Force Posture', '16': 'Reduce Relations',
  '17': 'Coerce', '18': 'Assault', '19': 'Fight', '20': 'Mass Violence',
};
function gdeltFormatDate(d: string) { return d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : d; }

async function fetchGdeltEvents(): Promise<NormalizedEvent[]> {
  const ctl = AbortSignal.timeout(30_000);
  const idx = await (await fetch(GDELT_EVENTS_INDEX, { signal: ctl })).text();
  const line = idx.split('\n').find(l => l.includes('export.CSV'));
  if (!line) throw new Error('GDELT lastupdate missing export.CSV');
  const url = line.trim().split(/\s+/).pop()!;
  const buf = Buffer.from(await (await fetch(url, { signal: ctl })).arrayBuffer());
  const tsv = new AdmZip(buf).getEntries()[0]!.getData().toString();

  const out: NormalizedEvent[] = [];
  for (const ln of tsv.split('\n')) {
    if (!ln) continue;
    const c = ln.split('\t');
    if (c.length < 61) continue;
    const label = ROOT_LABELS[c[28]];
    if (!label) continue;
    const lat = parseFloat(c[56]), lon = parseFloat(c[57]);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const place = c[52] || c[53] || '';
    out.push({
      id: c[0],
      event_type: label,
      title: `${label}${place ? ` in ${place}` : ''}`,
      latitude: lat,
      longitude: lon,
      country: c[53] || '',
      location: place,
      date: gdeltFormatDate(c[1] || ''),
      url: c[60] || '',
      source: 'GDELT',
    });
  }
  return out;
}

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
    _format: 'json',
  });

  const res = await fetch(`${ACLED_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; GodsEye/0.1)',
    },
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

async function fetchGdeltArticles(): Promise<any | null> {
  const params = new URLSearchParams({
    query: 'theme:ARMEDCONFLICT',
    mode: 'artlist',
    maxrecords: '250',
    format: 'json',
    sort: 'DateDesc',
    timespan: '24h',
  });
  const res = await fetch(`${GDELT_DOC_URL}?${params}`, {
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

    try {
      const events = await fetchGdeltEvents();
      if (events.length > 0) {
        bodyCache = JSON.stringify({ source: 'gdelt-events', events });
        bodyCacheTime = Date.now();
        return { statusCode: 200, headers: baseHeaders, body: bodyCache };
      }
    } catch (err) {
      console.warn('[acled-proxy] GDELT events fetch failed:', (err as Error).message);
    }

    const articles = await fetchGdeltArticles();
    if (articles) {
      bodyCache = JSON.stringify({ source: 'gdelt', ...articles });
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
