import type { Handler } from '@netlify/functions';

const ACLED_URL = 'https://api.acleddata.com/acled/read';
const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';

interface NormalizedEvent {
  id: string;
  event_type: string;
  title: string;
  latitude: number;
  longitude: number;
  country: string;
  location: string;
  date: string;
  url: string;
  source: string;
}

let cachedData: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 600_000;

const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=600',
};

async function fetchAcled(): Promise<NormalizedEvent[] | null> {
  const email = process.env.ACLED_EMAIL || process.env.VITE_ACLED_EMAIL;
  const key = process.env.ACLED_KEY || process.env.ACLED_PASSWORD || process.env.VITE_ACLED_PASSWORD;
  if (!email || !key) return null;

  const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    email, key,
    limit: '1000',
    event_date: `${since}|${today}`,
    event_date_where: 'BETWEEN',
  });

  const res = await fetch(`${ACLED_URL}?${params}`);
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

const handler: Handler = async () => {
  if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
    return { statusCode: 200, headers: baseHeaders, body: cachedData };
  }

  try {
    const acled = await fetchAcled();
    if (acled && acled.length > 0) {
      cachedData = JSON.stringify({ source: 'acled', events: acled });
      cacheTime = Date.now();
      return { statusCode: 200, headers: baseHeaders, body: cachedData };
    }

    const params = new URLSearchParams({
      query: 'theme:ARMEDCONFLICT',
      mode: 'artlist',
      maxrecords: '250',
      format: 'json',
      sort: 'DateDesc',
      timespan: '24h',
    });
    const res = await fetch(`${GDELT_URL}?${params}`);
    const text = await res.text();

    if (!text.startsWith('{') && !text.startsWith('[')) {
      if (cachedData) {
        return { statusCode: 200, headers: { ...baseHeaders, 'X-Cache': 'stale' }, body: cachedData };
      }
      return {
        statusCode: 429,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'GDELT rate limited', source: 'gdelt', articles: [] }),
      };
    }

    const data = JSON.parse(text);
    cachedData = JSON.stringify({ source: 'gdelt', ...data });
    cacheTime = Date.now();
    return { statusCode: 200, headers: baseHeaders, body: cachedData };
  } catch {
    if (cachedData) {
      return { statusCode: 200, headers: { ...baseHeaders, 'X-Cache': 'stale' }, body: cachedData };
    }
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to fetch conflicts', source: 'gdelt', articles: [] }),
    };
  }
};

export { handler };
