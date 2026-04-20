// NOAA / NWS — active US severe-weather alerts.
// Public, no key, requires a User-Agent header (set by the proxy/server in prod).
// We hit it directly from the client; CORS is allowed.

const NWS_URL = 'https://api.weather.gov/alerts/active?status=actual&severity=Severe,Extreme';

export interface NWSAlert {
  id: string;
  event: string;
  headline: string;
  severity: string;
  urgency: string;
  area: string;
  latitude: number;
  longitude: number;
  effective: string;
  url: string;
}

function centroid(points: number[][]): [number, number] | null {
  if (!points.length) return null;
  let sx = 0, sy = 0, n = 0;
  for (const pt of points) {
    if (Array.isArray(pt) && pt.length >= 2) { sx += pt[0]; sy += pt[1]; n++; }
  }
  if (!n) return null;
  return [sx / n, sy / n];
}

export async function fetchNWSAlerts(): Promise<NWSAlert[]> {
  const res = await fetch(NWS_URL, {
    headers: { Accept: 'application/geo+json' },
  });
  if (!res.ok) throw new Error(`NWS API error: ${res.status}`);
  const fc = await res.json();
  if (!Array.isArray(fc?.features)) return [];

  const out: NWSAlert[] = [];
  for (const f of fc.features) {
    const p = f.properties ?? {};
    let lat: number | undefined;
    let lon: number | undefined;

    const g = f.geometry;
    if (g?.type === 'Point' && Array.isArray(g.coordinates)) {
      [lon, lat] = g.coordinates as [number, number];
    } else if (g?.type === 'Polygon' && Array.isArray(g.coordinates?.[0])) {
      const c = centroid(g.coordinates[0] as number[][]);
      if (c) { [lon, lat] = c; }
    }
    // Many NWS alerts have null geometry (county-based). Skip those — no plot point.
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;

    out.push({
      id: String(p.id ?? f.id ?? `${lon}-${lat}-${p.sent ?? ''}`),
      event: p.event ?? 'Alert',
      headline: p.headline ?? p.event ?? '',
      severity: p.severity ?? 'Unknown',
      urgency: p.urgency ?? 'Unknown',
      area: p.areaDesc ?? '',
      latitude: lat,
      longitude: lon,
      effective: p.effective ?? '',
      url: p['@id'] ?? '',
    });
  }
  return out;
}
