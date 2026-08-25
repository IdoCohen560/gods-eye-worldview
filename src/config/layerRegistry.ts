/**
 * LayerRegistry — central registry of all data layers with metadata.
 * Adapted from reference repo's data layer registry pattern.
 */

export type LayerKey = 'aircraft' | 'satellites' | 'cctv' | 'ships' | 'fires' | 'earthquakes' | 'conflicts' | 'eonet' | 'gdacs' | 'nws' | 'traffic' | 'rockets' | 'radio' | 'bikeshare' | 'military' | 'datacenters' | 'dams' | 'boundingBoxes';

export interface LayerMeta {
  key: LayerKey;
  label: string;
  category: 'live' | 'static' | 'infrastructure';
  updateInterval: number; // ms, 0 = static
  icon: string;
  description: string;
}

export const LAYER_REGISTRY: LayerMeta[] = [
  { key: 'aircraft', label: 'Aircraft', category: 'live', updateInterval: 10_000, icon: '✈', description: 'Live ADS-B aircraft positions' },
  { key: 'satellites', label: 'Satellites', category: 'live', updateInterval: 15_000, icon: '🛰', description: 'Tracked satellites' },
  { key: 'cctv', label: 'CCTV', category: 'static', updateInterval: 0, icon: '📷', description: 'Live CCTV cameras' },
  { key: 'ships', label: 'Ships', category: 'live', updateInterval: 30_000, icon: '🚢', description: 'AIS ship positions' },
  { key: 'fires', label: 'Fires', category: 'live', updateInterval: 600_000, icon: '🔥', description: 'NASA FIRMS active fires' },
  { key: 'earthquakes', label: 'Earthquakes', category: 'live', updateInterval: 300_000, icon: '🌍', description: 'USGS earthquake events' },
  { key: 'conflicts', label: 'Conflicts', category: 'static', updateInterval: 0, icon: '⚔', description: 'ACLED conflict data' },
  { key: 'eonet', label: 'EONET', category: 'live', updateInterval: 600_000, icon: '🌀', description: 'NASA natural events' },
  { key: 'gdacs', label: 'GDACS', category: 'live', updateInterval: 300_000, icon: '⚡', description: 'Global disaster alerts' },
  { key: 'nws', label: 'NWS', category: 'live', updateInterval: 300_000, icon: '☁', description: 'National Weather Service' },
  { key: 'traffic', label: 'Traffic', category: 'live', updateInterval: 120_000, icon: '🚗', description: 'Live traffic feeds' },
  // New layers (ported from reference)
  { key: 'rockets', label: 'Rocket Launches', category: 'live', updateInterval: 300_000, icon: '🚀', description: 'Upcoming rocket launches' },
  { key: 'radio', label: 'Radio', category: 'static', updateInterval: 0, icon: '📻', description: 'Internet radio stations' },
  { key: 'bikeshare', label: 'Bikeshare', category: 'live', updateInterval: 60_000, icon: '🚲', description: 'Bikeshare station availability' },
  { key: 'military', label: 'Military', category: 'static', updateInterval: 0, icon: '🎖', description: 'Military installations (OSM)' },
  { key: 'datacenters', label: 'Datacenters', category: 'static', updateInterval: 0, icon: '▣', description: 'Global datacenter locations' },
  { key: 'dams', label: 'Dams', category: 'static', updateInterval: 0, icon: '▰', description: 'Major dam infrastructure' },
];

export function getLayerMeta(key: LayerKey): LayerMeta | undefined {
  return LAYER_REGISTRY.find(l => l.key === key);
}

export function getLayerKeys(): LayerKey[] {
  return LAYER_REGISTRY.map(l => l.key);
}
