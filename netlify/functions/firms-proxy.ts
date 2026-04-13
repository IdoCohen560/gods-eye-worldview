import type { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) {
    return { statusCode: 400, body: JSON.stringify({ error: 'FIRMS MAP_KEY not configured' }) };
  }

  const coords = event.queryStringParameters?.coords || 'world';
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/${coords}/1`;

  try {
    const res = await fetch(url);
    const data = await res.text();
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'text/csv',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
      body: data,
    };
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch from FIRMS' }) };
  }
};

export { handler };
