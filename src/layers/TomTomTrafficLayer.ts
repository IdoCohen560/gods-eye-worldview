import * as Cesium from 'cesium';
import { TOMTOM_API_KEY } from '../config/constants';

// TomTom Traffic Flow raster tiles — live global congestion overlay.
// Style 'relative0' highlights only segments slower than free-flow, which
// layers cleanly over the dark Cesium base; 'absolute' colors every road.
// Docs: https://developer.tomtom.com/traffic-api/documentation/traffic-flow-tiles/

export type TomTomFlowStyle = 'relative0' | 'absolute' | 'reduced-sensitivity';

export function createTomTomTrafficProvider(
  style: TomTomFlowStyle = 'relative0',
): Cesium.UrlTemplateImageryProvider {
  return new Cesium.UrlTemplateImageryProvider({
    url: `https://api.tomtom.com/traffic/map/4/tile/flow/${style}/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`,
    credit: new Cesium.Credit('Traffic © TomTom', true),
    maximumLevel: 22,
  });
}
