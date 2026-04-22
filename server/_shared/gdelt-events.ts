// GDELT Events 2.0 raw export — no auth, updated every 15 min.
// https://www.gdeltproject.org/data.html#rawdatafiles
//
// Each /lastupdate.txt listing points to a .export.CSV.zip containing the
// latest 15-min window of globally tracked events. CAMEO event codes are
// standardized; root codes 14-20 cover conflict-adjacent behaviour
// (protests, coercion, assaults, fights, mass violence).

import AdmZip from 'adm-zip';

const LAST_UPDATE_URL = 'http://data.gdeltproject.org/gdeltv2/lastupdate.txt';

// CAMEO event root-code → human label (subset 14-20; the conflict range).
const ROOT_LABELS: Record<string, string> = {
  '14': 'Protest',
  '15': 'Force Posture',
  '16': 'Reduce Relations',
  '17': 'Coerce',
  '18': 'Assault',
  '19': 'Fight',
  '20': 'Mass Violence',
};

export interface GdeltEvent {
  id: string;
  event_type: string;
  title: string;
  latitude: number;
  longitude: number;
  country: string;
  location: string;
  date: string;
  url: string;
  source: 'GDELT';
}

function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/**
 * Fetch and parse the most recent GDELT Events 2.0 export.
 * Returns conflict-category events (CAMEO root 14-20) with valid lat/lon.
 */
export async function fetchGdeltEvents(timeoutMs = 30_000): Promise<GdeltEvent[]> {
  const ctl = AbortSignal.timeout(timeoutMs);

  const idxResp = await fetch(LAST_UPDATE_URL, { signal: ctl });
  if (!idxResp.ok) throw new Error(`GDELT lastupdate ${idxResp.status}`);
  const idx = await idxResp.text();
  const line = idx.split('\n').find(l => l.includes('export.CSV'));
  if (!line) throw new Error('GDELT lastupdate missing export.CSV entry');
  const url = line.trim().split(/\s+/).pop();
  if (!url) throw new Error('GDELT lastupdate malformed');

  const zipResp = await fetch(url, { signal: ctl });
  if (!zipResp.ok) throw new Error(`GDELT export ${zipResp.status}`);
  const buf = Buffer.from(await zipResp.arrayBuffer());

  const zip = new AdmZip(buf);
  const entry = zip.getEntries()[0];
  if (!entry) throw new Error('GDELT zip empty');
  const tsv = entry.getData().toString();

  const events: GdeltEvent[] = [];
  for (const line of tsv.split('\n')) {
    if (!line) continue;
    const c = line.split('\t');
    if (c.length < 61) continue;
    const rootCode = c[28];
    const label = ROOT_LABELS[rootCode];
    if (!label) continue;
    const lat = parseFloat(c[56]);
    const lon = parseFloat(c[57]);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const place = c[52] || c[53] || '';
    events.push({
      id: c[0],
      event_type: label,
      title: `${label}${place ? ` in ${place}` : ''}`,
      latitude: lat,
      longitude: lon,
      country: c[53] || '',
      location: place,
      date: formatDate(c[1] || ''),
      url: c[60] || '',
      source: 'GDELT',
    });
  }
  return events;
}
