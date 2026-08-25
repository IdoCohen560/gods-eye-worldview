/**
 * BikeshareFeed — fetches bikeshare station availability from GBFS feeds.
 * Adapted from reference repo's bikeshare.js (simplified).
 */
import * as Cesium from 'cesium';

// Major GBFS systems (simplified - reference has 27 cities)
const GBFS_SYSTEMS = [
  { id: 'citibikenyc', name: 'Citi Bike NYC', infoUrl: 'https://gbfs.citibikenyc.com/gbfs/en/station_information.json', statusUrl: 'https://gbfs.citibikenyc.com/gbfs/en/station_status.json' },
  { id: 'divvy', name: 'Divvy', infoUrl: 'https://gbfs.divvybikes.com/gbfs/en/station_information.json', statusUrl: 'https://gbfs.divvybikes.com/gbfs/en/station_status.json' },
  { id: 'capitalbikeshare', name: 'Capital Bikeshare', infoUrl: 'https://gbfs.capitalbikeshare.com/gbfs/en/station_information.json', statusUrl: 'https://gbfs.capitalbikeshare.com/gbfs/en/station_status.json' },
];

export interface BikeshareStation {
  id: string;
  systemId: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  bikesAvailable: number;
  docksAvailable: number;
}

export async function fetchBikeshareStations(): Promise<BikeshareStation[]> {
  const allStations: BikeshareStation[] = [];

  for (const system of GBFS_SYSTEMS) {
    try {
      const [infoRes, statusRes] = await Promise.all([
        fetch(system.infoUrl),
        fetch(system.statusUrl),
      ]);

      if (!infoRes.ok || !statusRes.ok) continue;

      const infoData = await infoRes.json();
      const statusData = await statusRes.json();

      const stations = infoData.data?.stations || [];
      const statusList = statusData.data?.stations || [];
      const statusMap = new Map(
        statusList.map((s: any) => [s.station_id || s.id, s])
      );

      for (const station of stations) {
        const status = statusMap.get(station.station_id || station.id);
        if (!station.lat || !station.lon) continue;

        allStations.push({
          id: station.station_id || station.id,
          systemId: system.id,
          name: station.name,
          lat: station.lat,
          lon: station.lon,
          capacity: station.capacity || 0,
          bikesAvailable: (status as any)?.num_bikes_available || 0,
          docksAvailable: (status as any)?.num_docks_available || 0,
        });
      }
    } catch (e) {
      console.warn(`[BikeshareFeed] Failed to fetch ${system.name}:`, e);
    }
  }

  return allStations;
}

export function createBikeshareEntities(
  viewer: Cesium.Viewer,
  stations: BikeshareStation[]
): Cesium.Entity[] {
  const entities: Cesium.Entity[] = [];

  for (const station of stations) {
    const ratio = station.capacity > 0 ? station.bikesAvailable / station.capacity : 0.5;
    let color: Cesium.Color;
    if (ratio > 0.6) color = Cesium.Color.GREEN;
    else if (ratio > 0.3) color = Cesium.Color.YELLOW;
    else color = Cesium.Color.RED;

    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(station.lon, station.lat, 0),
      point: {
        pixelSize: Math.max(4, Math.min(10, Math.sqrt(station.capacity) * 1.5)),
        color: color.withAlpha(0.8),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    (entity as any)._bikeshareData = station;
    entities.push(entity);
  }

  return entities;
}
