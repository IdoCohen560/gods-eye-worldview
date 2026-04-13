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

const ACLED_API = 'https://api.acleddata.com/acled/read';

export async function fetchConflicts(apiKey: string, email: string): Promise<ConflictEvent[]> {
  if (!apiKey || !email) return [];

  const params = new URLSearchParams({
    key: apiKey,
    email: email,
    limit: '500',
    event_date: formatDateRange(7), // last 7 days
    event_date_where: 'BETWEEN',
  });

  try {
    const res = await fetch(`${ACLED_API}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.data) return [];

    return data.data.map((e: any): ConflictEvent => ({
      id: e.data_id || `${e.latitude}-${e.longitude}-${e.event_date}`,
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

function formatDateRange(days: number): string {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(start)}|${fmt(end)}`;
}
