import type { Handler } from '@netlify/functions';

// Replaced ACLED (broken auth) with GDELT — free, no auth needed
const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';

const handler: Handler = async () => {
  try {
    const params = new URLSearchParams({
      query: 'conflict OR violence OR attack OR bombing OR shelling OR protest OR riot',
      mode: 'artlist',
      maxrecords: '250',
      format: 'json',
      sort: 'DateDesc',
    });

    const res = await fetch(`${GDELT_URL}?${params}`);
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
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to fetch from GDELT' }),
    };
  }
};

export { handler };
