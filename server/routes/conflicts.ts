import { Router } from 'express';
import { cacheGet, cacheSet, cacheGetStale } from '../cache';
import { getAcledAccessToken } from '../_shared/acled-auth';
import { fetchGdeltEvents } from '../_shared/gdelt-events';

export const conflictRouter = Router();

const ACLED_URL = 'https://acleddata.com/api/acled/read';
const GDELT_DOC_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';
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

async function fetchGdeltArticles(): Promise<any | null> {
  const params = new URLSearchParams({
    query: 'theme:ARMEDCONFLICT',
    mode: 'artlist',
    maxrecords: '250',
    format: 'json',
    sort: 'DateDesc',
    timespan: '24h',
  });
  const upstream = await fetch(`${GDELT_DOC_URL}?${params}`, {
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

  // Priority: ACLED (curated, geo-pinned) → GDELT Events 2.0 (geo-pinned,
  // public) → GDELT DOC articles (always works but no per-event lat/lon).
  try {
    const acled = await fetchAcled();
    if (acled && acled.length > 0) {
      const payload = { source: 'acled' as const, events: acled };
      cacheSet('conflicts', payload, CACHE_TTL);
      return res.json(payload);
    }

    try {
      const gdeltEvents = await fetchGdeltEvents();
      if (gdeltEvents.length > 0) {
        const payload = { source: 'gdelt-events' as const, events: gdeltEvents };
        cacheSet('conflicts', payload, CACHE_TTL);
        return res.json(payload);
      }
    } catch (err) {
      console.warn('[conflicts] GDELT events fetch failed, trying articles:', (err as Error).message);
    }

    const articles = await fetchGdeltArticles();
    if (articles) {
      const payload = { source: 'gdelt' as const, ...articles };
      cacheSet('conflicts', payload, CACHE_TTL);
      return res.json(payload);
    }
    const stale = cacheGetStale('conflicts');
    if (stale) return res.json(stale);
    res.status(429).json({ error: 'All conflict sources failed', source: 'gdelt', articles: [] });
  } catch {
    const stale = cacheGetStale('conflicts');
    if (stale) return res.json(stale);
    res.status(502).json({ error: 'Failed to fetch conflicts', source: 'gdelt', articles: [] });
  }
});
