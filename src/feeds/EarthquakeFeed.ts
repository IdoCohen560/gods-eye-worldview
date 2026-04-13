export interface Earthquake {
  id: string;
  magnitude: number;
  latitude: number;
  longitude: number;
  depth: number; // km
  place: string;
  time: number; // unix ms
  tsunami: boolean;
}

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

export async function fetchEarthquakes(): Promise<Earthquake[]> {
  const res = await fetch(USGS_URL);
  if (!res.ok) throw new Error(`USGS API error: ${res.status}`);
  const data = await res.json();

  return data.features.map((f: any): Earthquake => ({
    id: f.id,
    magnitude: f.properties.mag,
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
    depth: f.geometry.coordinates[2],
    place: f.properties.place || 'Unknown',
    time: f.properties.time,
    tsunami: f.properties.tsunami === 1,
  }));
}
