/**
 * LocalDataLayers — bundled GeoJSONL data for datacenters and dams.
 * Adapted from reference repo's localLayers.js.
 * 
 * Uses static fetch with try/catch fallback when bundled data files are absent.
 */
import * as Cesium from 'cesium';

export interface LocalDataRecord {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  properties: Record<string, any>;
}

function parseGeoJsonL(text: string): LocalDataRecord[] {
  const lines = text.split('\n').filter(l => l.trim());
  const records: LocalDataRecord[] = [];
  for (const line of lines) {
    try {
      const feature = JSON.parse(line);
      const coords = feature.geometry?.coordinates;
      if (!coords) continue;
      let lat: number, lon: number;
      if (feature.geometry.type === 'Point') {
        [lon, lat] = coords;
      } else if (feature.geometry.type === 'MultiPoint' && Array.isArray(coords[0])) {
        [lon, lat] = coords[0];
      } else continue;
      if (!lat || !lon) continue;
      records.push({
        id: feature.properties?.id || feature.properties?.name || `${lat},${lon}`,
        name: feature.properties?.name || '',
        lat, lon,
        type: feature.properties?.type || feature.properties?.class || '',
        properties: feature.properties || {},
      });
    } catch { /* skip */ }
  }
  return records;
}

// Sample data for when bundled files are not present
const SAMPLE_DATACENTERS: LocalDataRecord[] = [
  { id: 'us-e-1', name: 'US-East (Virginia)', lat: 39.0438, lon: -77.4874, type: 'datacenter', properties: {} },
  { id: 'us-w-1', name: 'US-West (Oregon)', lat: 45.5945, lon: -121.1787, type: 'datacenter', properties: {} },
  { id: 'eu-w-1', name: 'EU-West (Dublin)', lat: 53.3498, lon: -6.2603, type: 'datacenter', properties: {} },
  { id: 'ap-s-1', name: 'AP-South (Singapore)', lat: 1.3521, lon: 103.8198, type: 'datacenter', properties: {} },
  { id: 'ap-ne-1', name: 'AP-NE (Tokyo)', lat: 35.6762, lon: 139.6503, type: 'datacenter', properties: {} },
  { id: 'eu-c-1', name: 'EU-Central (Frankfurt)', lat: 50.1109, lon: 8.6821, type: 'datacenter', properties: {} },
  { id: 'ap-e-1', name: 'AP-East (Sydney)', lat: -33.8688, lon: 151.2093, type: 'datacenter', properties: {} },
  { id: 'sa-e-1', name: 'SA-East (São Paulo)', lat: -23.5505, lon: -46.6333, type: 'datacenter', properties: {} },
];

const SAMPLE_DAMS: LocalDataRecord[] = [
  { id: 'three-gorges', name: 'Three Gorges Dam', lat: 30.8281, lon: 111.0037, type: 'dam', properties: { capacity_mw: 22500 } },
  { id: 'itaituba', name: 'Belo Monte', lat: -3.4167, lon: -51.7833, type: 'dam', properties: { capacity_mw: 11233 } },
  { id: 'guri', name: 'Guri Dam', lat: 7.9333, lon: -62.9833, type: 'dam', properties: { capacity_mw: 10235 } },
  { id: 'tucurui', name: 'Tucuruí Dam', lat: -3.8333, lon: -49.6333, type: 'dam', properties: { capacity_mw: 8370 } },
  { id: 'grand-coulee', name: 'Grand Coulee', lat: 47.9631, lon: -118.9836, type: 'dam', properties: { capacity_mw: 6809 } },
  { id: 'sayano', name: 'Sayano-Shushenskaya', lat: 52.8269, lon: 91.3902, type: 'dam', properties: { capacity_mw: 6400 } },
  { id: 'xiluodu', name: 'Xiluodu Dam', lat: 28.2472, lon: 103.6481, type: 'dam', properties: { capacity_mw: 6400 } },
  { id: 'kariba', name: 'Kariba Dam', lat: -17.9243, lon: 25.8572, type: 'dam', properties: { capacity_mw: 1834 } },
  { id: 'hoover', name: 'Hoover Dam', lat: 36.0160, lon: -114.7377, type: 'dam', properties: { capacity_mw: 2080 } },
  { id: 'aswan', name: 'Aswan High Dam', lat: 23.9719, lon: 32.8838, type: 'dam', properties: { capacity_mw: 2100 } },
];

export async function loadLocalData(
  type: 'datacenters' | 'dams'
): Promise<LocalDataRecord[]> {
  // Try fetching bundled geojsonl file (works in both dev and production if file exists)
  try {
    const res = await fetch(`/data/local_data/${type}/${type}.geojsonl`);
    if (res.ok) {
      const text = await res.text();
      return parseGeoJsonL(text);
    }
  } catch { /* file not present */ }

  // Return sample data as fallback
  return type === 'datacenters' ? SAMPLE_DATACENTERS : SAMPLE_DAMS;
}

const TYPE_CONFIG: Record<string, { color: Cesium.Color }> = {
  datacenter: { color: Cesium.Color.CYAN },
  dam: { color: Cesium.Color.fromCssColorString('#0088ff') },
};

export function createLocalDataEntities(
  viewer: Cesium.Viewer,
  records: LocalDataRecord[],
  type: string
): Cesium.Entity[] {
  const config = TYPE_CONFIG[type] || { color: Cesium.Color.WHITE };
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
