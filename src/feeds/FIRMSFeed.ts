export interface FireHotspot {
  latitude: number;
  longitude: number;
  brightness: number;
  confidence: string; // 'low' | 'nominal' | 'high'
  frp: number; // fire radiative power
  daynight: string;
  acq_date: string;
  acq_time: string;
}

export async function fetchFIRMS(mapKey: string, bounds?: {
  west: number; south: number; east: number; north: number;
}): Promise<FireHotspot[]> {
  if (!mapKey) return [];

  const coords = bounds
    ? `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
    : 'world';

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/${coords}/1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const latIdx = headers.indexOf('latitude');
    const lonIdx = headers.indexOf('longitude');
    const brightIdx = headers.indexOf('bright_ti4');
    const confIdx = headers.indexOf('confidence');
    const frpIdx = headers.indexOf('frp');
    const dnIdx = headers.indexOf('daynight');
    const dateIdx = headers.indexOf('acq_date');
    const timeIdx = headers.indexOf('acq_time');

    const hotspots: FireHotspot[] = [];
    // Limit to 1000 for performance
    for (let i = 1; i < Math.min(lines.length, 1001); i++) {
      const cols = lines[i].split(',');
      if (cols.length < headers.length) continue;
      hotspots.push({
        latitude: parseFloat(cols[latIdx]),
        longitude: parseFloat(cols[lonIdx]),
        brightness: parseFloat(cols[brightIdx]) || 0,
        confidence: cols[confIdx] || 'nominal',
        frp: parseFloat(cols[frpIdx]) || 0,
        daynight: cols[dnIdx] || 'D',
        acq_date: cols[dateIdx] || '',
        acq_time: cols[timeIdx] || '',
      });
    }
    return hotspots;
  } catch (err) {
    console.error('FIRMS fetch error:', err);
    return [];
  }
}
