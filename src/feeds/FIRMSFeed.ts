/**
 * FIRMSFeed — fetches active fire data from NASA FIRMS.
 * Adapted from reference repo's firmsHeatmap.js (simplified).
 */
import * as Cesium from 'cesium';

const FIRMS_PROXY = '/api/firms';
const POLL_INTERVAL = 600_000; // 10 minutes

export interface FIRMSFire {
  index: number;
  latitude: number;
  longitude: number;
  frp: number;
  confidence: 'high' | 'nominal' | 'low';
  brightness: number;
  satellite: string;
  acqMs: number;
  night: boolean;
}

export async function fetchFIRMSFires(): Promise<FIRMSFire[]> {
  try {
    const res = await fetch(FIRMS_PROXY);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error === 'no_key') {
      console.warn('[FIRMSFeed] API key required');
      return [];
    }
    return (data.fires || []).map((f: any, i: number) => {
      const conf = f.confidence || 0;
      let confidence: 'high' | 'nominal' | 'low';
      if (conf >= 80 || conf === 'high') confidence = 'high';
      else if (conf >= 50 || conf === 'nominal') confidence = 'nominal';
      else confidence = 'low';
      return {
        index: i,
        latitude: f.latitude || f.lat,
        longitude: f.longitude || f.lon,
        frp: f.frp || 0,
        confidence,
        brightness: f.bright_ti4 || f.brightness || 0,
        satellite: f.satellite || '',
        acqMs: f.acq_date ? new Date(f.acq_date).getTime() : Date.now(),
        night: f.daynight === 'N',
      };
    });
  } catch (e) {
    console.warn('[FIRMSFeed] Fetch failed:', e);
    return [];
  }
}

export function createFIRNSEntities(
  viewer: Cesium.Viewer,
  fires: FIRMSFire[]
): Cesium.Entity[] {
  const entities: Cesium.Entity[] = [];
  const maxFrp = Math.max(...fires.map(f => f.frp), 1);

  for (const fire of fires.slice(0, 3000)) {
    const intensity = fire.frp / maxFrp;
    const color = intensity > 0.7
      ? Cesium.Color.RED
      : intensity > 0.4
        ? Cesium.Color.ORANGE
        : Cesium.Color.YELLOW;

    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(fire.longitude, fire.latitude, 0),
      point: {
        pixelSize: Math.max(4, Math.min(14, 6 + intensity * 10)),
        color: color.withAlpha(0.7 + intensity * 0.3),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    (entity as any)._fireData = fire;
    entities.push(entity);
  }

  return entities;
}

export function getFIRMSFPollInterval(): number {
  return POLL_INTERVAL;
}

// Backward-compatible alias
export const fetchFIRMS = fetchFIRMSFires;
