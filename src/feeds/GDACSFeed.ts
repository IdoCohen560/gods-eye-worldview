// GDACS — Global Disaster Alert and Coordination System.
// Public GeoJSON feed of current global disasters, no key required.
// Categories: EQ (earthquake), TC (tropical cyclone), FL (flood), VO (volcano),
// DR (drought), WF (wildfire), TS (tsunami).

const GDACS_URL = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP';

export type GDACSEventType = 'EQ' | 'TC' | 'FL' | 'VO' | 'DR' | 'WF' | 'TS';
export type GDACSAlertLevel = 'Green' | 'Orange' | 'Red';

export interface GDACSEvent {
  id: string;
  eventType: GDACSEventType;
  alertLevel: GDACSAlertLevel;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  date: string;
  reportUrl: string;
}

export async function fetchGDACSEvents(): Promise<GDACSEvent[]> {
  const res = await fetch(GDACS_URL);
  if (!res.ok) throw new Error(`GDACS API error: ${res.status}`);
  const fc = await res.json();
  if (!Array.isArray(fc?.features)) return [];

  const out: GDACSEvent[] = [];
  for (const f of fc.features) {
    const p = f.properties ?? {};
    const coords = f.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    out.push({
      id: String(p.eventid ?? `${coords[0]}-${coords[1]}-${p.fromdate ?? ''}`),
      eventType: (p.eventtype as GDACSEventType) ?? 'EQ',
      alertLevel: (p.alertlevel as GDACSAlertLevel) ?? 'Green',
      name: p.name ?? p.description ?? 'GDACS event',
      description: p.htmldescription ?? p.description ?? '',
      latitude: Number(coords[1]),
      longitude: Number(coords[0]),
      date: p.fromdate ?? p.todate ?? '',
      reportUrl: p.url?.report ?? '',
    });
  }
  return out;
}
