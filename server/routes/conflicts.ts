import { Router } from 'express';
import { cacheGet, cacheSet, cacheGetStale } from '../cache';

export const conflictRouter = Router();

const ACLED_URL = 'https://api.acleddata.com/acled/read';
const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';
const CACHE_TTL = 600_000; // 10 min

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

  const upstream = await fetch(`${ACLED_URL}?${params}`);
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

    // Fallback: GDELT (no creds needed). theme:ARMEDCONFLICT removes movie/protest noise.
    const params = new URLSearchParams({
      query: 'theme:ARMEDCONFLICT',
      mode: 'artlist',
      maxrecords: '250',
      format: 'json',
      sort: 'DateDesc',
      timespan: '24h',
    });
    const upstream = await fetch(`${GDELT_URL}?${params}`);
    const text = await upstream.text();
    if (!text.startsWith('{') && !text.startsWith('[')) {
      const stale = cacheGetStale('conflicts');
      if (stale) return res.json(stale);
      return res.status(429).json({ error: 'GDELT rate limited', source: 'gdelt', articles: [] });
    }
    const data = JSON.parse(text);
    const payload = { source: 'gdelt' as const, ...data };
    cacheSet('conflicts', payload, CACHE_TTL);
    res.json(payload);
  } catch {
    const stale = cacheGetStale('conflicts');
    if (stale) return res.json(stale);
    res.status(502).json({ error: 'Failed to fetch conflicts', source: 'gdelt', articles: [] });
  }
});
