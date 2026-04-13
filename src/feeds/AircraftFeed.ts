import { OPENSKY_API } from '../config/constants';

export interface AircraftState {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  velocity: number | null;
  true_track: number | null;
  vertical_rate: number | null;
  on_ground: boolean;
}

interface Bounds {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

export async function fetchAircraft(bounds: Bounds): Promise<AircraftState[]> {
  const params = new URLSearchParams({
    lamin: bounds.lamin.toFixed(4),
    lomin: bounds.lomin.toFixed(4),
    lamax: bounds.lamax.toFixed(4),
    lomax: bounds.lomax.toFixed(4),
  });

  const res = await fetch(`${OPENSKY_API}?${params}`);
  if (!res.ok) throw new Error(`OpenSky API error: ${res.status}`);

  const data = await res.json();
  if (!data.states) return [];

  return data.states.map((s: unknown[]): AircraftState => ({
    icao24: s[0] as string,
    callsign: s[1] as string | null,
    origin_country: s[2] as string,
    longitude: s[5] as number | null,
    latitude: s[6] as number | null,
    baro_altitude: s[7] as number | null,
    velocity: s[9] as number | null,
    true_track: s[10] as number | null,
    vertical_rate: s[11] as number | null,
    on_ground: s[8] as boolean,
  }));
}
