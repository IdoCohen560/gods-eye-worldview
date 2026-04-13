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
  return new Cesium.WebMapTileServiceImageryProvider({
    url: GIBS_WMTS_URL,
    layer: config.layer,
    tileMatrixSetID: config.tileMatrixSetID,
    format: config.format,
    style: 'default',
    maximumLevel: config.maxLevel,
  });
}
