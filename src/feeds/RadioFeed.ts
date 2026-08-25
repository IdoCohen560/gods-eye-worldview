/**
 * RadioFeed — fetches internet radio stations from Radio Browser API.
 * Adapted from reference repo's radio.js (simplified).
 */
import * as Cesium from 'cesium';

const RADIO_API = 'https://de1.api.radio-browser.info/json/stations/search?limit=500&order=clickcount&reverse=true&hidebroken=true';

export interface RadioStation {
  id: string;
  name: string;
  url_resolved: string;
  lat: number;
  lon: number;
  tags: string;
  country: string;
  codec: string;
  bitrate: number;
}

export async function fetchRadioStations(): Promise<RadioStation[]> {
  try {
    const res = await fetch(RADIO_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data
      .filter((s: any) => s.lat && s.lon && s.url_resolved?.startsWith('https'))
      .map((s: any) => ({
        id: s.stationuuid,
        name: s.name,
        url_resolved: s.url_resolved,
        lat: s.lat,
        lon: s.lon,
        tags: s.tags || '',
        country: s.country || '',
        codec: s.codec || 'mp3',
        bitrate: s.bitrate || 0,
      }));
  } catch (e) {
    console.warn('[RadioFeed] Fetch failed:', e);
    return [];
  }
}

export function createRadioEntities(
  viewer: Cesium.Viewer,
  stations: RadioStation[]
): Cesium.Entity[] {
  const entities: Cesium.Entity[] = [];

  for (const station of stations) {
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(station.lon, station.lat, 0),
      point: {
        pixelSize: 4,
        color: Cesium.Color.GREEN.withAlpha(0.7),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: station.name,
        font: '9px monospace',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -8),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 0.8,
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
      },
    });

    (entity as any)._radioData = station;
    entities.push(entity);
  }

  return entities;
}
