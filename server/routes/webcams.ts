import { Router } from 'express';
import { cacheGet, cacheSet, cacheGetStale } from '../cache';

export const webcamsRouter = Router();

const CACHE_TTL = 3_600_000; // 1 hour
const MAX_PAGES = 20; // 20 × 50 = 1000 cameras worldwide
const PAGE_SIZE = 50;

interface NormalizedCam {
  id: string;
  name: string;
  lat: number;
  lon: number;
  city: string;
  country: string;
  preview: string;
  thumbnail: string;
  player: string;
  url: string;
}

webcamsRouter.get('/', async (_req, res) => {
  const apiKey = process.env.WINDY_WEBCAMS_API_KEY || process.env.VITE_WINDY_WEBCAMS_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'WINDY_WEBCAMS_API_KEY not configured', cameras: [] });
  }

  const cached = cacheGet('webcams:global');
  if (cached) return res.json(cached);

  try {
    const out: NormalizedCam[] = [];
    for (let p = 0; p < MAX_PAGES; p++) {
      const url = `https://api.windy.com/webcams/api/v3/webcams?limit=${PAGE_SIZE}&offset=${p * PAGE_SIZE}&include=location,urls,images,player`;
      const up = await fetch(url, { headers: { 'x-windy-api-key': apiKey } });
      if (!up.ok) break;
      const json: any = await up.json();
      const cams = Array.isArray(json?.webcams) ? json.webcams : [];
      if (cams.length === 0) break;
      for (const c of cams) {
        if (c.status !== 'active') continue;
        const lat = c.location?.latitude;
        const lon = c.location?.longitude;
        if (typeof lat !== 'number' || typeof lon !== 'number') continue;
        out.push({
          id: String(c.webcamId),
          name: c.title || 'Webcam',
          lat, lon,
          city: c.location?.city || '',
          country: c.location?.country || '',
          preview: c.images?.current?.preview || '',
          thumbnail: c.images?.current?.thumbnail || '',
          player: c.player?.day || '',
          url: c.urls?.detail || '',
        });
      }
      if (cams.length < PAGE_SIZE) break;
    }

    const payload = { cameras: out, source: 'windy' as const, count: out.length };
    cacheSet('webcams:global', payload, CACHE_TTL);
    res.json(payload);
  } catch {
    const stale = cacheGetStale('webcams:global');
    if (stale) return res.json(stale);
    res.status(502).json({ error: 'Failed to fetch webcams', cameras: [] });
  }
});
