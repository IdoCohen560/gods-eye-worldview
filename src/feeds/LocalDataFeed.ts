/**
 * LocalDataLayers — bundled GeoJSONL data for datacenters and dams.
 * Adapted from reference repo's localLayers.js.
 */
import * as Cesium from 'cesium';

interface GeoJsonLFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: number[] | number[][] };
  properties: Record<string, any>;
}

export interface LocalDataRecord {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  properties: Record<string, any>;
}

/**
 * Parse a GeoJSONL string into feature records.
 */
function parseGeoJsonL(text: string): LocalDataRecord[] {
  const lines = text.split('\n').filter(l => l.trim());
  const records: LocalDataRecord[] = [];

  for (const line of lines) {
    try {
      const feature: GeoJsonLFeature = JSON.parse(line);
      const coords = feature.geometry?.coordinates;
      if (!coords) continue;

      let lat: number, lon: number;
      if (feature.geometry.type === 'Point') {
        [lon, lat] = coords as number[];
      } else if (feature.geometry.type === 'MultiPoint' && Array.isArray(coords[0])) {
        [lon, lat] = coords[0] as number[];
      } else {
        continue;
      }

      if (!lat || !lon) continue;

      records.push({
        id: feature.properties?.id || feature.properties?.name || `${lat},${lon}`,
        name: feature.properties?.name || '',
        lat,
        lon,
        type: feature.properties?.type || feature.properties?.class || '',
        properties: feature.properties || {},
      });
    } catch {
      // skip malformed lines
    }
  }

  return records;
}

/**
 * Load bundled data from a local path or inline data.
 */
export async function loadLocalData(
  type: 'datacenters' | 'dams'
): Promise<LocalDataRecord[]> {
  try {
    // Try dynamic import for bundled data
    const mod = await import(`../data/local_data/${type}/${type}.geojsonl?url`);
    const res = await fetch(mod.default);
    const text = await res.text();
    return parseGeoJsonL(text);
  } catch {
    console.warn(`[LocalData] Failed to load ${type} data`);
    return [];
  }
}

const TYPE_CONFIG: Record<string, { color: Cesium.Color; icon: string }> = {
  datacenter: { color: Cesium.Color.CYAN, icon: '▣' },
  dam: { color: Cesium.Color.BLUE, icon: '▰' },
};

export function createLocalDataEntities(
  viewer: Cesium.Viewer,
  records: LocalDataRecord[],
  type: string
): Cesium.Entity[] {
  const config = TYPE_CONFIG[type] || { color: Cesium.Color.WHITE, icon: '•' };
  const entities: Cesium.Entity[] = [];

  for (const record of records.slice(0, 900)) {
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(record.lon, record.lat, 0),
      point: {
        pixelSize: 5,
        color: config.color.withAlpha(0.8),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: record.name,
        font: '9px monospace',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -8),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 0.75,
      },
    });

    (entity as any)._localData = record;
    entities.push(entity);
  }

  return entities;
}
