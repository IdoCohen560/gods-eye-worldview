import * as Cesium from 'cesium';

export interface GIBSLayerConfig {
  id: string;
  name: string;
  layer: string;
  tileMatrixSetID: string;
  format: string;
  maxLevel: number;
}

export function createGIBSLayer(config: GIBSLayerConfig): Cesium.WebMapTileServiceImageryProvider {
  const yesterday = new Date(Date.now() - 86_400_000);
  const dateStr = yesterday.toISOString().slice(0, 10);
  const ext = config.format === 'image/jpeg' ? 'jpg' : 'png';

  // GIBS RESTful URL — interpolate tileMatrixSetID directly (not a Cesium template var)
  return new Cesium.WebMapTileServiceImageryProvider({
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${config.layer}/default/${dateStr}/${config.tileMatrixSetID}/{TileMatrix}/{TileRow}/{TileCol}.${ext}`,
    layer: config.layer,
    tileMatrixSetID: config.tileMatrixSetID,
    format: config.format,
    style: 'default',
    maximumLevel: config.maxLevel,
    tilingScheme: new Cesium.GeographicTilingScheme(),
  });
}
