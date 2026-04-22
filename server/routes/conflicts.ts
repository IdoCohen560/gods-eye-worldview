import { Router } from 'express';
import { cacheGet, cacheSet, cacheGetStale } from '../cache';
import { getAcledAccessToken } from '../_shared/acled-auth';

export const conflictRouter = Router();

const ACLED_URL = 'https://acleddata.com/api/acled/read';
const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';
const CACHE_TTL = 600_000; // 10 min
const GDELT_UA = 'GodsEye/0.1 (contact via github.com/IdoCohen560/gods-eye-worldview)';

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

async function fetchAcled(): Promise<NormalizedEvent[] | null> {
  const token = await getAcledAccessToken();
  if (!token) return null;

  const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    limit: '1000',
    event_date: `${since}|${today}`,
    event_date_where: 'BETWEEN',
    _format: 'json',
  });

  const upstream = await fetch(`${ACLED_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; GodsEye/0.1)',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!upstream.ok) return null;
  const data: any = await upstream.json();
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
  const upstream = await fetch(`${GDELT_URL}?${params}`, {
    headers: { 'User-Agent': GDELT_UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(25_000),
  });
  const text = await upstream.text();
  if (!text.startsWith('{') && !text.startsWith('[')) return null;
  try { return JSON.parse(text); } catch { return null; }
}

conflictRouter.get('/', async (_req, res) => {
  const cached = cacheGet('conflicts');
  if (cached) return res.json(cached);

  try {
    const acled = await fetchAcled();
    if (acled && acled.length > 0) {
      const payload = { source: 'acled' as const, events: acled };
      cacheSet('conflicts', payload, CACHE_TTL);
      return res.json(payload);
    }
    const gdelt = await fetchGdelt();
    if (gdelt) {
      const payload = { source: 'gdelt' as const, ...gdelt };
      cacheSet('conflicts', payload, CACHE_TTL);
      return res.json(payload);
    }
    const stale = cacheGetStale('conflicts');
    if (stale) return res.json(stale);
    res.status(429).json({ error: 'GDELT rate limited', source: 'gdelt', articles: [] });
  } catch {
    const stale = cacheGetStale('conflicts');
    if (stale) return res.json(stale);
    res.status(502).json({ error: 'Failed to fetch conflicts', source: 'gdelt', articles: [] });
  }
});
