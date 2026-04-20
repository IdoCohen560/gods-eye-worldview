import { CONFLICTS_API } from '../config/constants';

export interface ConflictEvent {
  id: string;
  event_type: string;
  title: string;
  latitude: number;
  longitude: number;
  country: string;
  location: string;
  date: string;
  url: string;
  source: string;
}

// Global conflict zone coordinates — comprehensive world coverage
const CONFLICT_ZONES: Record<string, { lat: number; lon: number }> = {
  // Europe
  'Ukraine': { lat: 48.3794, lon: 31.1656 },
  'Russia': { lat: 55.7558, lon: 37.6173 },

  // Middle East
  'Israel': { lat: 31.0461, lon: 34.8516 },
  'Palestine': { lat: 31.9522, lon: 35.2332 },
  'Gaza': { lat: 31.3547, lon: 34.3088 },
  'Syria': { lat: 34.8021, lon: 38.9968 },
  'Yemen': { lat: 15.3694, lon: 44.1910 },
  'Iraq': { lat: 33.3152, lon: 44.3661 },
  'Lebanon': { lat: 33.8547, lon: 35.8623 },
  'Iran': { lat: 35.6892, lon: 51.3890 },
  'Turkey': { lat: 39.9334, lon: 32.8597 },
  'Saudi': { lat: 24.7136, lon: 46.6753 },

  // Africa
  'Sudan': { lat: 15.5007, lon: 32.5599 },
  'Somalia': { lat: 5.1521, lon: 46.1996 },
  'Libya': { lat: 32.8872, lon: 13.1913 },
  'Ethiopia': { lat: 9.0250, lon: 38.7469 },
  'Congo': { lat: -4.4419, lon: 15.2663 },
  'Nigeria': { lat: 9.0579, lon: 7.4951 },
  'Mali': { lat: 12.6392, lon: -8.0029 },
  'Burkina': { lat: 12.3714, lon: -1.5197 },
  'Cameroon': { lat: 7.3697, lon: 12.3547 },
  'Mozambique': { lat: -12.9714, lon: 40.5182 },
  'Chad': { lat: 12.1348, lon: 15.0557 },
  'Niger': { lat: 13.5126, lon: 2.1128 },
  'Kenya': { lat: -1.2921, lon: 36.8219 },
  'South Africa': { lat: -33.9249, lon: 18.4241 },
  'Egypt': { lat: 30.0444, lon: 31.2357 },
  'Tunisia': { lat: 36.8065, lon: 10.1815 },
  'Algeria': { lat: 36.7538, lon: 3.0588 },
  'Morocco': { lat: 33.9716, lon: -6.8498 },
  'Uganda': { lat: 0.3476, lon: 32.5825 },
  'Rwanda': { lat: -1.9403, lon: 29.8739 },
  'Tanzania': { lat: -6.7924, lon: 39.2083 },
  'Senegal': { lat: 14.7167, lon: -17.4677 },
  'Ghana': { lat: 5.6037, lon: -0.1870 },
  'Angola': { lat: -8.8390, lon: 13.2894 },
  'Zimbabwe': { lat: -17.8252, lon: 31.0335 },

  // South Asia
  'Afghanistan': { lat: 34.5553, lon: 69.2075 },
  'Pakistan': { lat: 33.6844, lon: 73.0479 },
  'India': { lat: 28.6139, lon: 77.2090 },
  'Kashmir': { lat: 34.0837, lon: 74.7973 },
  'Bangladesh': { lat: 23.8103, lon: 90.4125 },
  'Sri Lanka': { lat: 6.9271, lon: 79.8612 },
  'Nepal': { lat: 27.7172, lon: 85.3240 },

  // Southeast Asia
  'Myanmar': { lat: 19.7633, lon: 96.0785 },
  'Philippines': { lat: 14.5995, lon: 120.9842 },
  'Thailand': { lat: 13.7563, lon: 100.5018 },
  'Indonesia': { lat: -6.2088, lon: 106.8456 },
  'Vietnam': { lat: 21.0278, lon: 105.8342 },
  'Cambodia': { lat: 11.5564, lon: 104.9282 },
  'Malaysia': { lat: 3.1390, lon: 101.6869 },

  // East Asia
  'China': { lat: 39.9042, lon: 116.4074 },
  'Taiwan': { lat: 25.0330, lon: 121.5654 },
  'Korea': { lat: 37.5665, lon: 126.9780 },
  'Japan': { lat: 35.6762, lon: 139.6503 },
  'Hong Kong': { lat: 22.3193, lon: 114.1694 },

  // Americas
  'Mexico': { lat: 19.4326, lon: -99.1332 },
  'Colombia': { lat: 4.7110, lon: -74.0721 },
  'Venezuela': { lat: 10.4806, lon: -66.9036 },
  'Brazil': { lat: -15.7975, lon: -47.8919 },
  'Haiti': { lat: 18.5944, lon: -72.3074 },
  'Honduras': { lat: 14.0723, lon: -87.1921 },
  'El Salvador': { lat: 13.6929, lon: -89.2182 },
  'Guatemala': { lat: 14.6349, lon: -90.5069 },
  'Ecuador': { lat: -0.1807, lon: -78.4678 },
  'Peru': { lat: -12.0464, lon: -77.0428 },
  'Chile': { lat: -33.4489, lon: -70.6693 },
  'Argentina': { lat: -34.6037, lon: -58.3816 },
  'Cuba': { lat: 23.1136, lon: -82.3666 },
  'Nicaragua': { lat: 12.1150, lon: -86.2362 },

  // Central Asia / Caucasus
  'Georgia': { lat: 41.7151, lon: 44.8271 },
  'Armenia': { lat: 40.1792, lon: 44.4991 },
  'Azerbaijan': { lat: 40.4093, lon: 49.8671 },

  // Europe (other)
  'France': { lat: 48.8566, lon: 2.3522 },
  'Germany': { lat: 52.5200, lon: 13.4050 },
  'UK': { lat: 51.5074, lon: -0.1278 },
  'Britain': { lat: 51.5074, lon: -0.1278 },
  'Spain': { lat: 40.4168, lon: -3.7038 },
  'Italy': { lat: 41.9028, lon: 12.4964 },
  'Greece': { lat: 37.9838, lon: 23.7275 },
  'Poland': { lat: 52.2297, lon: 21.0122 },
  'Serbia': { lat: 44.7866, lon: 20.4489 },
  'Kosovo': { lat: 42.6629, lon: 21.1655 },
  'Bosnia': { lat: 43.8563, lon: 18.4131 },

  // Oceania
  'Australia': { lat: -33.8688, lon: 151.2093 },
  'Papua': { lat: -6.3147, lon: 143.9555 },
  'Fiji': { lat: -17.7134, lon: 178.0650 },
  'Solomon': { lat: -9.4456, lon: 160.0356 },

  // North America
  'United States': { lat: 38.9072, lon: -77.0369 },
  'USA': { lat: 38.9072, lon: -77.0369 },
  'Canada': { lat: 45.4215, lon: -75.6972 },
};

function classifyEventType(title: string): string {
  if (/bomb|explo|shell|missile|strike|attack|shoot|kill/i.test(title)) return 'Explosion/Remote violence';
  if (/protest|demonstrat|rally|march/i.test(title)) return 'Protests';
  if (/riot|unrest|clash|looting/i.test(title)) return 'Riots';
  if (/ceasefire|peace|truce|negotiat/i.test(title)) return 'Strategic developments';
  return 'Battles';
}

function inferLocation(title: string, country: string): { lat: number; lon: number } | null {
  const text = `${title} ${country}`.toLowerCase();
  for (const [zone, coords] of Object.entries(CONFLICT_ZONES)) {
    if (text.includes(zone.toLowerCase())) {
      return {
        lat: coords.lat + (Math.random() - 0.5) * 2,
        lon: coords.lon + (Math.random() - 0.5) * 2,
      };
    }
  }
  return null;
}

export async function fetchConflicts(): Promise<ConflictEvent[]> {
  try {
    const res = await fetch(CONFLICTS_API);
    if (!res.ok) {
      console.warn(`GDELT proxy returned ${res.status}`);
      return [];
    }

    const text = await res.text();
    if (!text.startsWith('{') && !text.startsWith('[')) {
      console.warn('GDELT returned non-JSON response:', text.slice(0, 100));
      return [];
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn('Conflict feed JSON parse failed:', text.slice(0, 100));
      return [];
    }

    // ACLED path: server already normalised events with real lat/lon.
    if (data.source === 'acled' && Array.isArray(data.events)) {
      return data.events as ConflictEvent[];
    }

    // GDELT fallback path: articles need country-dictionary geocoding (with jitter).
    if (!data.articles) return [];
    const events: ConflictEvent[] = [];
    for (const article of data.articles) {
      const title = article.title || '';
      const country = article.sourcecountry || '';
      const location = inferLocation(title, country);
      if (!location) continue;

      events.push({
        id: article.url || `${location.lat}-${location.lon}-${Date.now()}`,
        event_type: classifyEventType(title),
        title,
        latitude: location.lat,
        longitude: location.lon,
        country,
        location: country,
        date: article.seendate || '',
        url: article.url || '',
        source: article.domain || 'GDELT',
      });
    }
    return events;
  } catch (err) {
    console.error('GDELT fetch error:', err);
    return [];
  }
}
