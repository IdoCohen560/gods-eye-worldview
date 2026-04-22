import * as Cesium from 'cesium';

export type GIBSPeriod = 'daily' | 'half-hourly' | '8-day' | 'monthly' | 'static';

export interface GIBSLayerConfig {
  id: string;
  name: string;
  category: string;
  layer: string;
  tileMatrixSetID: string;
  format: 'image/jpeg' | 'image/png';
  maxLevel: number;
  period: GIBSPeriod;
  /** Days of latency between observation and tile availability. Used to pick a date GIBS actually has. */
  lagDays: number;
  /** Optional: marks the catalog default visible layer. */
  isDefault?: boolean;
}

const GIBS_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best';

/** ISO YYYY-MM-DD for `daysAgo` in UTC. */
function isoDaysAgo(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/**
 * Pick the date string GIBS most likely has tiles for given the layer's period & lag.
 * Static layers omit date entirely (handled by buildUrl).
 */
function dateForLayer(cfg: GIBSLayerConfig): string {
  if (cfg.period === 'static') return '';
  // For 8-day composites, snap to a 1-day-aligned multiple of lagDays floor.
  return isoDaysAgo(Math.max(cfg.lagDays, 1));
}

function extFor(format: GIBSLayerConfig['format']): 'jpg' | 'png' {
  return format === 'image/jpeg' ? 'jpg' : 'png';
}

function buildUrl(cfg: GIBSLayerConfig, date: string): string {
  const ext = extFor(cfg.format);
  const datePart = date ? `/${date}` : '';
  return `${GIBS_BASE}/${cfg.layer}/default${datePart}/${cfg.tileMatrixSetID}/{TileMatrix}/{TileRow}/{TileCol}.${ext}`;
}

/**
 * Build a Cesium WMTS imagery provider for a GIBS layer.
 * Picks an actually-available date based on the layer's lagDays.
 */
export function createGIBSLayer(
  cfg: GIBSLayerConfig,
  options: { date?: string } = {}
): Cesium.WebMapTileServiceImageryProvider {
  const date = options.date ?? dateForLayer(cfg);

  const provider = new Cesium.WebMapTileServiceImageryProvider({
    url: buildUrl(cfg, date),
    layer: cfg.layer,
    tileMatrixSetID: cfg.tileMatrixSetID,
    format: cfg.format,
    style: 'default',
    maximumLevel: cfg.maxLevel,
    tilingScheme: new Cesium.GeographicTilingScheme(),
  });

  // GIBS returns HTTP 400 for JPEG tiles with no data (scan gaps, polar regions).
  // This is expected, not an error — swallow silently so the console isn't flooded.
  provider.errorEvent.addEventListener((err: Error) => {
    const msg = err?.message ?? '';
    if (msg.includes('status code 400') || msg.includes('status code 404')) return;
    // eslint-disable-next-line no-console
    console.warn(`[GIBS] ${cfg.id} (${cfg.layer}) date=${date || 'static'}:`, msg);
  });

  return provider;
}
