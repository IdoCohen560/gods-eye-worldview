import { Router } from 'express';
import { cacheGet, cacheSet, cacheGetStale } from '../cache';
import { getOpenSkyAccessToken } from '../_shared/opensky-auth';

export const aircraftRouter = Router();

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';
const CACHE_TTL = 8_000;

aircraftRouter.get('/', async (req, res) => {
  const { lamin, lomin, lamax, lomax } = req.query;
  if (!lamin || !lomin || !lamax || !lomax) {
    return res.status(400).json({ error: 'Missing bounds parameters' });
  }

  const cacheKey = `aircraft:${lamin},${lomin},${lamax},${lomax}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const params = new URLSearchParams({
      lamin: String(lamin), lomin: String(lomin),
      lamax: String(lamax), lomax: String(lomax),
    });
    const token = await getOpenSkyAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const upstream = await fetch(`${OPENSKY_URL}?${params}`, { headers });
    if (!upstream.ok) {
      const stale = cacheGetStale(cacheKey);
      if (stale) return res.json(stale);
      return res.status(upstream.status).json({
        error: `OpenSky ${upstream.status}`,
        hint: !token ? 'Set OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET to unlock higher rate limit' : undefined,
        states: [],
      });
    }
    const data = await upstream.json();
    cacheSet(cacheKey, data, CACHE_TTL);
    res.json(data);
  } catch {
    const stale = cacheGetStale(cacheKey);
    if (stale) return res.json(stale);
    res.status(502).json({ error: 'Failed to fetch aircraft', states: [] });
  }
});
