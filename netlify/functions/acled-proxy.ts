import type { Handler } from '@netlify/functions';

// GDELT Doc API — the only reliable free conflict data endpoint
// GeoJSON endpoint (/api/v2/geo/geo) returns 404 — it doesn't exist
const GDELT_DOC_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';

// In-memory cache (persists across warm Netlify function invocations)
let cachedData: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 600_000; // 10 minutes

const handler: Handler = async () => {
  // Return cached data if fresh
  if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600',
      },
      body: cachedData,
    };
  }

  try {
    const params = new URLSearchParams({
      query: 'conflict OR violence OR attack OR bombing OR shelling OR protest OR riot',
      mode: 'artlist',
      maxrecords: '250',
      format: 'json',
      sort: 'DateDesc',
    });

    const res = await fetch(`${GDELT_DOC_URL}?${params}`);
    const data = await res.text();

    // GDELT returns plain text error messages when rate-limited
    // Check if response looks like valid JSON
    if (!data.startsWith('{') && !data.startsWith('[')) {
      // Rate limited or error — return cached data if available, else empty
      if (cachedData) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300',
            'X-Cache': 'stale',
          },
          body: cachedData,
        };
      }
      return {
        statusCode: 429,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'GDELT rate limited', articles: [] }),
      };
    }

    // Cache valid response
    cachedData = data;
    cacheTime = Date.now();

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
    // Return cached data on network error
    if (cachedData) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Cache': 'stale',
        },
        body: cachedData,
      };
    }
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to fetch from GDELT', articles: [] }),
    };
  }
};

export { handler };
