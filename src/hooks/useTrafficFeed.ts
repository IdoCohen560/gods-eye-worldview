import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { createTomTomTrafficProvider } from '../layers/TomTomTrafficLayer';
import { TOMTOM_API_KEY } from '../config/constants';

interface UseTrafficFeedOptions {
  viewer: Cesium.Viewer | null;
  active: boolean;
  onCountUpdate: (count: number) => void;
}

/**
 * Live traffic overlay from TomTom Traffic Flow raster tiles.
 * Replaces the previous decorative OSM particle system — this shows real
 * global congestion (segments colored by current speed vs free-flow).
 */
export function useTrafficFeed({ viewer, active, onCountUpdate }: UseTrafficFeedOptions) {
  const layerRef = useRef<Cesium.ImageryLayer | null>(null);

  useEffect(() => {
    if (!viewer) return;
    const v = viewer;

    if (!active || !TOMTOM_API_KEY) {
      if (layerRef.current) {
        v.imageryLayers.remove(layerRef.current);
        layerRef.current = null;
      }
      onCountUpdate(0);
      return;
    }

    if (!layerRef.current) {
      const provider = createTomTomTrafficProvider('relative0');
      const layer = v.imageryLayers.addImageryProvider(provider);
      layer.alpha = 0.85;
      layerRef.current = layer;
      onCountUpdate(1); // 1 = layer online (no entity count for a raster)
    }

    return () => {
      if (layerRef.current && !v.isDestroyed()) {
        v.imageryLayers.remove(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [viewer, active]);
}
