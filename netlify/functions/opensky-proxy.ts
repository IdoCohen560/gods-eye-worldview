import type { Handler } from '@netlify/functions';

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

const handler: Handler = async (event) => {
  const { lamin, lomin, lamax, lomax } = event.queryStringParameters || {};

  if (!lamin || !lomin || !lamax || !lomax) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing bounds parameters' }) };
  }

  const username = process.env.OPENSKY_USERNAME;
  const password = process.env.OPENSKY_PASSWORD;

  const params = new URLSearchParams({ lamin, lomin, lamax, lomax });
  const url = `${OPENSKY_URL}?${params}`;

  const headers: Record<string, string> = {};
  if (username && password) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }

  try {
    const res = await fetch(url, { headers });
    const data = await res.text();

    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=5',
      },
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to fetch from OpenSky' }),
    };
  }
};

export { handler };
