/**
 * Layer State Codec — encodes/decodes layer states to URL-safe strings.
 * Adapted from reference repo's layerState.js.
 */

const LAYER_SEPARATOR = '|';
const KV_SEPARATOR = ':';
const ENABLED_TOKEN = '1';

export interface LayerStateEntry {
  id: string;
  enabled: boolean;
  options?: Record<string, unknown>;
}

export function encodeLayerState(entries: LayerStateEntry[]): string {
  return entries
    .map(e => {
      const parts = [e.id, e.enabled ? ENABLED_TOKEN : '0'];
      if (e.options) {
        const optStr = Object.entries(e.options)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join(',');
        if (optStr) parts.push(optStr);
      }
      return parts.join(KV_SEPARATOR);
    })
    .join(LAYER_SEPARATOR);
}

export function decodeLayerState(encoded: string): LayerStateEntry[] {
  if (!encoded) return [];
  return encoded.split(LAYER_SEPARATOR).map(segment => {
    const [id, enabled, optStr] = segment.split(KV_SEPARATOR);
    const options: Record<string, unknown> = {};
    if (optStr) {
      for (const kv of optStr.split(',')) {
        const [k, v] = kv.split('=');
        if (k) options[k] = decodeURIComponent(v || '');
      }
    }
    return {
      id: id || '',
      enabled: enabled === ENABLED_TOKEN,
      options: Object.keys(options).length > 0 ? options : undefined,
    };
  });
}

export function encodeViewState(state: {
  lat: number; lon: number; alt: number;
  heading: number; pitch?: number;
}): string {
  return [
    `lat=${state.lat.toFixed(4)}`,
    `lon=${state.lon.toFixed(4)}`,
    `alt=${Math.round(state.alt)}`,
    `hd=${Math.round(state.heading)}`,
    state.pitch !== undefined ? `pt=${Math.round(state.pitch)}` : '',
  ].filter(Boolean).join('&');
}

export function decodeViewState(hash: string): Record<string, number> | null {
  if (!hash) return null;
  const params = new URLSearchParams(hash.replace(/&/g, '&'));
  const lat = parseFloat(params.get('lat') || '');
  const lon = parseFloat(params.get('lon') || '');
  const alt = parseFloat(params.get('alt') || '');
  const heading = parseFloat(params.get('hd') || '');
  if (isNaN(lat) || isNaN(lon)) return null;
  return {
    lat,
    lon,
    alt: isNaN(alt) ? 10_000_000 : alt,
    heading: isNaN(heading) ? 0 : heading,
    pitch: parseFloat(params.get('pt') || '') || -35,
  };
}
