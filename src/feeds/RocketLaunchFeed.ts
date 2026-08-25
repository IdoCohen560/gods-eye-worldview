/**
 * RocketLaunchFeed — fetches upcoming/recent rocket launches from Launch Library 2.
 * Adapted from reference repo's rocketLaunches.js.
 */
import * as Cesium from 'cesium';

const LL2_API = 'https://ll.thespacedevs.com/2.2.0/launches/upcoming/?limit=20&window_days=30&format=json';
const POLL_INTERVAL = 300_000; // 5 minutes

export interface RocketLaunch {
  id: string;
  name: string;
  launchTime: string;
  lat: number;
  lon: number;
  status: string;
  orbit: string;
  launchSite: string;
  provider: string;
  mission: string;
}

export async function fetchRocketLaunches(): Promise<RocketLaunch[]> {
  try {
    const res = await fetch(LL2_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      id: String(r.id),
      name: r.name || r.mission?.name || 'Unknown',
      launchTime: r.window_start || r.net || '',
      lat: r.pad?.latitude || 0,
      lon: r.pad?.longitude || 0,
      status: r.status?.name || 'Unknown',
      orbit: r.mission?.orbit?.name || '',
      launchSite: r.pad?.location?.name || '',
      provider: r.launch_service_provider?.name || '',
      mission: r.mission?.description || '',
    }));
  } catch (e) {
    console.warn('[RocketLaunchFeed] Fetch failed:', e);
    return [];
  }
}

export function createRocketLaunchEntities(
  viewer: Cesium.Viewer,
  launches: RocketLaunch[]
): Cesium.Entity[] {
  const now = Cesium.JulianDate.now();
  const entities: Cesium.Entity[] = [];

  for (const launch of launches) {
    if (!launch.lat || !launch.lon) continue;

    const launchDate = launch.launchTime ? Cesium.JulianDate.fromIso8601(launch.launchTime) : null;
    const isUpcoming = launchDate && Cesium.JulianDate.greaterThan(launchDate, now);

    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(launch.lon, launch.lat, 0),
      point: {
        pixelSize: isUpcoming ? 10 : 6,
        color: isUpcoming ? Cesium.Color.CYAN : Cesium.Color.YELLOW.withAlpha(0.6),
        outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: launch.name,
        font: '10px monospace',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -12),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 0.9,
      },
    });

    (entity as any)._launchData = launch;
    entities.push(entity);
  }

  return entities;
}

export function getRocketLaunchPollInterval(): number {
  return POLL_INTERVAL;
}
