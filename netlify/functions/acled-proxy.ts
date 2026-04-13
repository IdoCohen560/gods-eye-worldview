import type { Handler } from '@netlify/functions';

const handler: Handler = async () => {
  const email = process.env.ACLED_EMAIL;
  const password = process.env.ACLED_PASSWORD;

  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'ACLED credentials not configured' }) };
  }

  try {
    // Get OAuth token
    const tokenRes = await fetch('https://acleddata.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'acled',
        username: email,
        password: password,
      }),
    });

    let token = '';
    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      token = tokenData.access_token || '';
    }

    // Fetch conflict data
    const params = new URLSearchParams({
      _format: 'json',
      fields: 'event_id_cnty|event_date|event_type|sub_event_type|country|location|latitude|longitude|fatalities|notes|actor1',
      limit: '500',
    });

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`https://acleddata.com/api/acled/read?${params}`, { headers });
    const data = await res.text();

    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to fetch from ACLED' }),
    };
  }
};

export { handler };
