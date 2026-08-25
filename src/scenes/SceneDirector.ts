/**
 * SceneDirector — manages scene definitions, playback, and shot transitions.
 * Adapted from reference repo's director.js + recipes.js (simplified).
 */
import * as Cesium from 'cesium';
import type { ShaderMode } from '../App';

export interface Shot {
  id: string;
  title: string;
  durationSec: number;
  holdSec: number;
  camera: { lat: number; lon: number; alt: number; heading: number; pitch: number; roll: number };
  visual: { style: ShaderMode };
  layers: Record<string, boolean>;
}

export interface Scene {
  id: string;
  title: string;
  shots: Shot[];
}

export interface PlaybackState {
  running: boolean;
  currentSceneId: string | null;
  currentShotIndex: number;
  cancelled: boolean;
}

// Built-in scene catalog
export const BUILTIN_SCENES: Scene[] = [
  {
    id: 'flights-radar',
    title: 'Global Flights Radar',
    shots: [
      { id: 'fr-1', title: 'Global Overview', durationSec: 5, holdSec: 1, camera: { lat: 20, lon: -30, alt: 19_000_000, heading: 25, pitch: -65, roll: 0 }, visual: { style: 'surveillance' }, layers: { aircraft: true, ships: false, earthquakes: false } },
      { id: 'fr-2', title: 'Europe Close-up', durationSec: 4, holdSec: 1, camera: { lat: 48, lon: 2, alt: 2_000_000, heading: 0, pitch: -45, roll: 0 }, visual: { style: 'surveillance' }, layers: { aircraft: true } },
      { id: 'fr-3', title: 'Asia Pacific', durationSec: 4, holdSec: 1, camera: { lat: 35, lon: 140, alt: 3_000_000, heading: 30, pitch: -50, roll: 0 }, visual: { style: 'nvg' }, layers: { aircraft: true } },
      { id: 'fr-4', title: 'San Francisco', durationSec: 3, holdSec: 1, camera: { lat: 37.77, lon: -122.42, alt: 800_000, heading: 0, pitch: -40, roll: 0 }, visual: { style: 'normal' }, layers: { aircraft: true, traffic: true } },
    ],
  },
  {
    id: 'orbital-watch',
    title: 'Orbital Watch',
    shots: [
      { id: 'ow-1', title: 'Cape Canaveral', durationSec: 4, holdSec: 1, camera: { lat: 28.5, lon: -80.6, alt: 1_500_000, heading: 0, pitch: -55, roll: 0 }, visual: { style: 'surveillance' }, layers: { satellites: true } },
      { id: 'ow-2', title: 'Africa Orbit', durationSec: 5, holdSec: 1, camera: { lat: 0, lon: 25, alt: 5_000_000, heading: 45, pitch: -60, roll: 0 }, visual: { style: 'nvg' }, layers: { satellites: true } },
      { id: 'ow-3', title: 'Japan Night', durationSec: 4, holdSec: 1, camera: { lat: 35.68, lon: 139.65, alt: 2_000_000, heading: 15, pitch: -45, roll: 0 }, visual: { style: 'noir' }, layers: { satellites: true } },
    ],
  },
  {
    id: 'thermal-threats',
    title: 'Thermal Threat Board',
    shots: [
      { id: 'tt-1', title: 'Pacific Ring', durationSec: 5, holdSec: 1, camera: { lat: 35, lon: 140, alt: 8_000_000, heading: 0, pitch: -65, roll: 0 }, visual: { style: 'flir' }, layers: { earthquakes: true, fires: true } },
      { id: 'tt-2', title: 'New Zealand', durationSec: 4, holdSec: 1, camera: { lat: -41, lon: 174, alt: 2_000_000, heading: 20, pitch: -50, roll: 0 }, visual: { style: 'flir' }, layers: { earthquakes: true } },
      { id: 'tt-3', title: 'Atlantic Ridge', durationSec: 4, holdSec: 1, camera: { lat: 0, lon: -30, alt: 6_000_000, heading: 0, pitch: -60, roll: 0 }, visual: { style: 'flir' }, layers: { earthquakes: true } },
    ],
  },
  {
    id: 'city-overload',
    title: 'City Overload',
    shots: [
      { id: 'co-1', title: 'NYC Streets', durationSec: 3, holdSec: 1, camera: { lat: 40.71, lon: -74.01, alt: 500_000, heading: 10, pitch: -35, roll: 0 }, visual: { style: 'crt' }, layers: { aircraft: true, traffic: true } },
      { id: 'co-2', title: 'NYC Aerial', durationSec: 3, holdSec: 1, camera: { lat: 40.75, lon: -73.98, alt: 1_500_000, heading: 0, pitch: -50, roll: 0 }, visual: { style: 'surveillance' }, layers: { aircraft: true, traffic: true, cctv: true } },
      { id: 'co-3', title: 'London', durationSec: 4, holdSec: 1, camera: { lat: 51.51, lon: -0.13, alt: 800_000, heading: 25, pitch: -40, roll: 0 }, visual: { style: 'bw' }, layers: { aircraft: true, traffic: true } },
    ],
  },
];

export class SceneDirector {
  private viewer: Cesium.Viewer;
  private _state: PlaybackState = { running: false, currentSceneId: null, currentShotIndex: 0, cancelled: false };
  private _abortController: AbortController | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  get state(): PlaybackState { return this._state; }

  listScenes(): Scene[] { return BUILTIN_SCENES; }

  findScene(id: string): Scene | undefined {
    return BUILTIN_SCENES.find(s => s.id === id);
  }

  async playScene(sceneId: string, onShotChange?: (sceneId: string, shotIndex: number) => void): Promise<void> {
    const scene = this.findScene(sceneId);
    if (!scene) return;

    this._abortController?.abort();
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    this._state = { running: true, currentSceneId: sceneId, currentShotIndex: 0, cancelled: false };

    for (let i = 0; i < scene.shots.length; i++) {
      if (signal.aborted) break;

      this._state.currentShotIndex = i;
      onShotChange?.(sceneId, i);

      const shot = scene.shots[i];

      // Apply camera
      await this.flyToShot(shot, signal);

      // Hold
      if (shot.holdSec > 0) {
        await this.sleep(shot.holdSec * 1000, signal);
      }
    }

    this._state = { running: false, currentSceneId: null, currentShotIndex: 0, cancelled: false };
  }

  stop(reason = 'Stopped'): void {
    this._abortController?.abort();
    this._state = { running: false, currentSceneId: null, currentShotIndex: 0, cancelled: true };
  }

  private async flyToShot(shot: Shot, signal: AbortSignal): Promise<void> {
    const { camera } = shot;
    return new Promise<void>((resolve) => {
      if (signal.aborted) { resolve(); return; }

      this.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(camera.lon, camera.lat, camera.alt),
        orientation: {
          heading: Cesium.Math.toRadians(camera.heading),
          pitch: Cesium.Math.toRadians(camera.pitch),
          roll: Cesium.Math.toRadians(camera.roll),
        },
        duration: shot.durationSec,
        complete: () => resolve(),
        cancel: () => resolve(),
      });

      // Also resolve on abort
      signal.addEventListener('abort', () => {
        this.viewer.camera.cancelFlight();
        resolve();
      }, { once: true });
    });
  }

  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise(resolve => {
      const timer = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
    });
  }
}
