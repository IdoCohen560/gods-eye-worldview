/**
 * MilitaryFeed — fetches military installations from OSM Overpass proxy.
 * Adapted from reference repo's militaryInstallations.js (simplified).
 */
import * as Cesium from 'cesium';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

export interface MilitaryInstallation {
  id: string;
  name: string;
  kind: string;
  class: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

function classifyTags(tags: Record<string, string>): { kind: string; class: string } {
  const military = tags.military;
  if (military === 'airfield') return { kind: 'installation', class: 'airfield' };
  if (military === 'naval_base') return { kind: 'installation', class: 'naval_base' };
  if (military === 'range') return { kind: 'installation', class: 'range' };
  if (military) return { kind: 'installation', class: 'military_land' };
  if (tags.aeroway === 'military') return { kind: 'installation', class: 'airfield' };
  return { kind: 'installation', class: 'military_land' };
}

export async function fetchMilitaryInstallations(
  bounds?: { south: number; west: number; north: number; east: number }
): Promise<MilitaryInstallation[]> {
  try {
    const b = bounds || { south: -60, west: -180, north: 85, east: 180 };
    const query = `
      [out:json][timeout:30];
      (
        node["military"](bbox:${b.south},${b.west},${b.north},${b.east});
        way["military"](bbox:${b.south},${b.west},${b.north},${b.east});
        node["aeroway"="military"](bbox:${b.south},${b.west},${b.north},${b.east});
      );
      out center 200;
    `;
    const res = await fetch(OVERPASS_API, {
      method: 'POST',
      body: new URLSearchParams({ data: query }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return (data.elements || []).slice(0, 700).map((el: any) => {
      const lat = el.lat || el.center?.lat || 0;
      const lon = el.lon || el.center?.lon || 0;
      const { kind: k, class: c } = classifyTags(el.tags || {});
      return {
        id: String(el.id),
        name: el.tags?.name || el.tags?.['name:en'] || '',
        kind: k,
        class: c,
        lat,
        lon,
        tags: el.tags || {},
      };
    });
  } catch (e) {
    console.warn('[MilitaryFeed] Fetch failed:', e);
    return [];
  }
}

const CLASS_COLORS: Record<string, Cesium.Color> = {
  airfield: Cesium.Color.DODGERBLUE,
  naval_base: Cesium.Color.TEAL,
  range: Cesium.Color.GOLD,
  military_land: Cesium.Color.GRAY,
};

export function createMilitaryEntities(
  viewer: Cesium.Viewer,
  installations: MilitaryInstallation[]
): Cesium.Entity[] {
  const entities: Cesium.Entity[] = [];

  for (const inst of installations) {
    if (!inst.lat || !inst.lon) continue;
    const color = CLASS_COLORS[inst.class] || Cesium.Color.GRAY;

    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(inst.lon, inst.lat, 0),
      point: {
        pixelSize: 7,
        color: color.withAlpha(0.8),
        outlineColor: Cesium.Color.WHITE.withAlpha(0.5),
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: inst.name || inst.class,
        font: '9px monospace',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -10),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 0.8,
      },
    });

    (entity as any)._militaryData = inst;
    entities.push(entity);
  }

  return entities;
}
