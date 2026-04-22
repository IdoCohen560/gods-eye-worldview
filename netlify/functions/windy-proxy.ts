import type { Handler } from '@netlify/functions';

const MAX_PAGES = 20;
const PAGE_SIZE = 50;

const handler: Handler = async () => {
  const apiKey = process.env.WINDY_WEBCAMS_API_KEY;
  if (!apiKey) {
    return { statusCode: 400, body: JSON.stringify({ error: 'WINDY_WEBCAMS_API_KEY not configured', cameras: [] }) };
  }

  try {
    const out: any[] = [];
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
      body: JSON.stringify({ cameras: out, source: 'windy', count: out.length }),
    };
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch webcams', cameras: [] }) };
  }
};

export { handler };
