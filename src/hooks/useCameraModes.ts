/**
 * useCameraModes — hook for camera presets and smooth transitions.
 * Adapted from reference repo's camera.js (simplified).
 */
import { useCallback, useRef } from 'react';
import * as Cesium from 'cesium';

export interface CameraPreset {
  name: string;
  lat: number;
  lon: number;
  alt: number;
  heading?: number;
  pitch?: number;
}

const PRESETS: CameraPreset[] = [
  { name: 'Global', lat: 20, lon: 0, alt: 10_000_000 },
  { name: 'Austin', lat: 30.267, lon: -97.743, alt: 2000 },
  { name: 'San Francisco', lat: 37.774, lon: -122.419, alt: 1500 },
  { name: 'New York', lat: 40.712, lon: -74.006, alt: 1500 },
  { name: 'London', lat: 51.507, lon: -0.127, alt: 1500 },
  { name: 'Tokyo', lat: 35.676, lon: 139.650, alt: 1500 },
];

interface Props {
  viewer: Cesium.Viewer | null;
}

export function useCameraModes({ viewer }: Props) {
  const flightPromiseRef = useRef<Promise<void> | null>(null);

  const flyTo = useCallback((preset: CameraPreset, duration = 2) => {
    if (!viewer) return;
    if (flightPromiseRef.current) return; // already flying

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(preset.lon, preset.lat, preset.alt),
      orientation: {
        heading: Cesium.Math.toRadians(preset.heading ?? 0),
        pitch: Cesium.Math.toRadians(preset.pitch ?? -45),
        roll: 0,
      },
      duration,
      complete: () => { flightPromiseRef.current = null; },
      cancel: () => { flightPromiseRef.current = null; },
    });
  }, [viewer]);

  const flyToPreset = useCallback((index: number) => {
    if (index >= 0 && index < PRESETS.length) {
      flyTo(PRESETS[index]);
    }
  }, [flyTo]);

  const resetView = useCallback(() => {
    flyTo(PRESETS[0]);
  }, [flyTo]);

  return {
    presets: PRESETS,
    flyTo,
    flyToPreset,
    resetView,
  };
}
