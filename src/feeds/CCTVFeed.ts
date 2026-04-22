import camerasFallback from '../data/cameras.json';
import { WEBCAMS_API } from '../config/constants';

export interface Camera {
  id: string;
  name: string;
  lat: number;
  lon: number;
  city: string;
  country?: string;
  // Live source from Windy:
  preview?: string;   // still image URL (best for Cesium popup thumb)
  thumbnail?: string;
  player?: string;    // embed player URL (full live playback)
  url?: string;       // windy.com detail page
  // Legacy JSON-only fields (kept for fallback list):
  type?: string;
  format?: string;
}

function normalizeFallback(): Camera[] {
  return (camerasFallback as any[]).map(c => ({
    id: c.id,
    name: c.name,
    lat: c.lat,
    lon: c.lon,
    city: c.city,
    type: c.type,
    format: c.format,
    preview: c.url, // legacy JSON used `url` as a still-image src
  }));
}

export async function loadCameras(): Promise<Camera[]> {
  try {
    const res = await fetch(WEBCAMS_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (Array.isArray(json?.cameras) && json.cameras.length > 0) {
      return json.cameras as Camera[];
    }
    return normalizeFallback();
  } catch (e) {
    console.warn('[CCTV] Windy fetch failed, using fallback list:', e);
    return normalizeFallback();
  }
}
