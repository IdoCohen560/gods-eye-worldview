// NASA EONET v3 — Earth Observatory Natural Event Tracker.
// Single endpoint, 8+ event categories, no API key required.
// Docs: https://eonet.gsfc.nasa.gov/docs/v3

const EONET_API = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=500';

export type EONETCategory =
  | 'wildfires'
  | 'severeStorms'
  | 'volcanoes'
  | 'seaLakeIce'
  | 'icebergs'
  | 'drought'
  | 'dustHaze'
  | 'waterColor'
  | 'earthquakes'
  | 'floods'
  | 'landslides'
  | 'tempExtremes'
  | 'manmade'
  | 'snow';

const CATEGORY_MAP: Record<string, EONETCategory> = {
  wildfires: 'wildfires',
  severeStorms: 'severeStorms',
  volcanoes: 'volcanoes',
  seaLakeIce: 'seaLakeIce',
  icebergs: 'icebergs',
  drought: 'drought',
  dustHaze: 'dustHaze',
  waterColor: 'waterColor',
  earthquakes: 'earthquakes',
  floods: 'floods',
  landslides: 'landslides',
  tempExtremes: 'tempExtremes',
  manmade: 'manmade',
  snow: 'snow',
};

export interface EONETEvent {
  id: string;
  title: string;
  category: EONETCategory;
  categoryTitle: string;
  link: string;
  latitude: number;
  longitude: number;
  date: string; // most recent geometry
  magnitude?: number;
  magnitudeUnit?: string;
}

export async function fetchEONETEvents(): Promise<EONETEvent[]> {
  const res = await fetch(EONET_API);
  if (!res.ok) throw new Error(`EONET API error: ${res.status}`);
  const data = await res.json();

  const events: EONETEvent[] = [];
  for (const e of data.events ?? []) {
    const geom = Array.isArray(e.geometry) ? e.geometry[e.geometry.length - 1] : null;
    if (!geom?.coordinates) continue;

    // EONET geometries can be Point [lon, lat] or Polygon [[[lon,lat],...]]; we plot Point form.
    let lon: number | undefined;
    let lat: number | undefined;
    if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
      [lon, lat] = geom.coordinates as [number, number];
    } else if (Array.isArray(geom.coordinates?.[0])) {
      // Use centroid of first ring (rough)
      const ring: number[][] = geom.coordinates[0];
      let sx = 0, sy = 0;
      for (const pt of ring) { sx += pt[0]; sy += pt[1]; }
      lon = sx / ring.length;
      lat = sy / ring.length;
    }
    if (typeof lon !== 'number' || typeof lat !== 'number') continue;

    const cat = e.categories?.[0];
    const catId = cat?.id ? CATEGORY_MAP[String(cat.id)] : undefined;
    if (!catId) continue;

    events.push({
      id: e.id,
      title: e.title,
      category: catId,
      categoryTitle: cat.title ?? catId,
      link: e.link,
      latitude: lat,
      longitude: lon,
      date: geom.date,
      magnitude: typeof geom.magnitudeValue === 'number' ? geom.magnitudeValue : undefined,
      magnitudeUnit: geom.magnitudeUnit,
    });
  }
  return events;
}
