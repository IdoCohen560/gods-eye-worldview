export interface ConflictEvent {
  id: string;
  event_type: string;
  sub_event_type: string;
  latitude: number;
  longitude: number;
  country: string;
  location: string;
  date: string;
  fatalities: number;
  notes: string;
  actor1: string;
}

const ACLED_API = 'https://acleddata.com/api/acled/read';

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getToken(email: string, password: string): Promise<string | null> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  try {
    const res = await fetch('https://acleddata.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'acled',
        username: email,
        password: password,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    return cachedToken;
  } catch {
    return null;
  }
}

export async function fetchConflicts(email: string, password: string): Promise<ConflictEvent[]> {
  if (!email || !password) return [];

  try {
    const token = await getToken(email, password);
    if (!token) {
      console.warn('ACLED auth failed, trying without token');
    }

    const params = new URLSearchParams({
      _format: 'json',
      fields: 'event_id_cnty|event_date|event_type|sub_event_type|country|location|latitude|longitude|fatalities|notes|actor1',
      limit: '500',
    });

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${ACLED_API}?${params}`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.data) return [];

    return data.data.map((e: any): ConflictEvent => ({
      id: e.event_id_cnty || `${e.latitude}-${e.longitude}`,
      event_type: e.event_type || '',
      sub_event_type: e.sub_event_type || '',
      latitude: parseFloat(e.latitude),
      longitude: parseFloat(e.longitude),
      country: e.country || '',
      location: e.location || '',
      date: e.event_date || '',
      fatalities: parseInt(e.fatalities) || 0,
      notes: e.notes || '',
      actor1: e.actor1 || '',
    }));
  } catch (err) {
    console.error('ACLED fetch error:', err);
    return [];
  }
}
