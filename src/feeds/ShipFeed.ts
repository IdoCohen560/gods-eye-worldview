export interface Ship {
  mmsi: number;
  name: string;
  latitude: number;
  longitude: number;
  speedOverGround: number; // knots
  courseOverGround: number; // degrees
  shipType: number;
  destination: string;
}

// Ship type categories
export function getShipCategory(type: number): string {
  if (type >= 60 && type <= 69) return 'passenger';
  if (type >= 70 && type <= 79) return 'cargo';
  if (type >= 80 && type <= 89) return 'tanker';
  if (type >= 35 && type <= 39) return 'military';
  if (type >= 40 && type <= 49) return 'highspeed';
  if (type >= 50 && type <= 59) return 'special';
  return 'other';
}

// Poll-based approach via Netlify proxy
export async function fetchShips(bounds: {
  south: number; west: number; north: number; east: number;
}): Promise<Ship[]> {
  try {
    const params = new URLSearchParams({
      south: bounds.south.toFixed(4),
      west: bounds.west.toFixed(4),
      north: bounds.north.toFixed(4),
      east: bounds.east.toFixed(4),
    });
    const res = await fetch(`/.netlify/functions/ship-proxy?${params}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
