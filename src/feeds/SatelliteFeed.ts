import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from 'satellite.js';
import { CELESTRAK_API } from '../config/constants';

export interface SatelliteRecord {
  name: string;
  noradId: number;
  tle1: string;
  tle2: string;
}

export interface SatellitePosition {
  name: string;
  noradId: number;
  position: {
    latitude: number;
    longitude: number;
    altitude: number; // km
  } | null;
}

const GROUPS = [
  'stations',      // ISS etc
  'visual',        // bright satellites
  'active',        // active sats (big list, we limit)
  'gps-ops',       // GPS
  'starlink',      // Starlink
];

export async function fetchSatellites(): Promise<SatelliteRecord[]> {
  const results: SatelliteRecord[] = [];

  // Fetch a manageable subset
  for (const group of ['stations', 'visual', 'gps-ops']) {
    try {
      const res = await fetch(`${CELESTRAK_API}?GROUP=${group}&FORMAT=tle`);
      if (!res.ok) continue;
      const text = await res.text();
      const lines = text.trim().split('\n');

      for (let i = 0; i < lines.length - 2; i += 3) {
        const name = lines[i].trim();
        const tle1 = lines[i + 1].trim();
        const tle2 = lines[i + 2].trim();
        const noradMatch = tle2.match(/^2\s+(\d+)/);
        results.push({
          name,
          noradId: noradMatch ? parseInt(noradMatch[1]) : 0,
          tle1,
          tle2,
        });
      }
    } catch (err) {
      console.warn(`Failed to fetch TLE group ${group}:`, err);
    }
  }

  return results;
}

export function propagateAll(sats: SatelliteRecord[], date: Date): SatellitePosition[] {
  const gmst = gstime(date);
  return sats.map(sat => {
    try {
      const satrec = twoline2satrec(sat.tle1, sat.tle2);
      const result = propagate(satrec, date);
      if (typeof result.position === 'boolean' || !result.position) {
        return { name: sat.name, noradId: sat.noradId, position: null };
      }
      const geodetic = eciToGeodetic(result.position, gmst);
      return {
        name: sat.name,
        noradId: sat.noradId,
        position: {
          latitude: degreesLat(geodetic.latitude),
          longitude: degreesLong(geodetic.longitude),
          altitude: geodetic.height,
        },
      };
    } catch {
      return { name: sat.name, noradId: sat.noradId, position: null };
    }
  });
}
