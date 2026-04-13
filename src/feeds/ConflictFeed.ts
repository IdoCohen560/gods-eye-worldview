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

export async function fetchConflicts(): Promise<ConflictEvent[]> {
  try {
    const res = await fetch('/.netlify/functions/acled-proxy');
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
