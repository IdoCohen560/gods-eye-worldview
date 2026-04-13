import type { Handler } from '@netlify/functions';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const handler: Handler = async (event) => {
  const query = event.queryStringParameters?.data;
  if (!query) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing query parameter' }) };
  }

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = await res.text();
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600',
      },
      body: data,
    };
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch from Overpass' }) };
  }
};

export { handler };
