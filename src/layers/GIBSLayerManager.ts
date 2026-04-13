import * as Cesium from 'cesium';
import { GIBS_WMTS_URL } from '../config/constants';

export interface GIBSLayerConfig {
  id: string;
  name: string;
  layer: string;
  tileMatrixSetID: string;
  format: string;
  maxLevel: number;
}

export function createGIBSLayer(config: GIBSLayerConfig): Cesium.WebMapTileServiceImageryProvider {
  // GIBS requires a date for most layers — use yesterday (today's may not be processed yet)
  const yesterday = new Date(Date.now() - 86_400_000);
  const dateStr = yesterday.toISOString().slice(0, 10);

  return new Cesium.WebMapTileServiceImageryProvider({
    url: `${GIBS_WMTS_URL}?TIME=${dateStr}`,
    layer: config.layer,
    tileMatrixSetID: config.tileMatrixSetID,
    format: config.format,
    style: 'default',
    maximumLevel: config.maxLevel,
  });
}
