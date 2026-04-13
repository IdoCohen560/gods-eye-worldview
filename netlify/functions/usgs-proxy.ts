import type { Handler } from '@netlify/functions';

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

const handler: Handler = async () => {
  try {
    const res = await fetch(USGS_URL);
    const data = await res.text();
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
      body: data,
    };
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch from USGS' }) };
  }
};

export { handler };
