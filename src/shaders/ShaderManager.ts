import * as Cesium from 'cesium';
import type { ShaderMode } from '../App';
import { NVG_SHADER } from './NightVision';
import { FLIR_SHADER } from './FLIR';
import { CRT_SHADER } from './CRTScanlines';
import { CEL_SHADER } from './CelShading';
import { CLASSIFIED_SHADER } from './Classified';

const activeStages = new Map<string, Cesium.PostProcessStage>();

const SHADER_MAP: Record<string, string> = {
  nvg: NVG_SHADER,
  flir: FLIR_SHADER,
  crt: CRT_SHADER,
  cel: CEL_SHADER,
  classified: CLASSIFIED_SHADER,
};

export function applyShader(viewer: Cesium.Viewer, mode: ShaderMode): void {
  if (mode === 'normal') return;

  const fragmentShader = SHADER_MAP[mode];
  if (!fragmentShader) return;

  const stage = new Cesium.PostProcessStage({
    fragmentShader,
    uniforms: {
      time: () => performance.now() / 1000.0,
    },
  });

  viewer.scene.postProcessStages.add(stage);
  activeStages.set(mode, stage);
}

export function removeShader(viewer: Cesium.Viewer, mode: ShaderMode): void {
  const stage = activeStages.get(mode);
  if (stage) {
    viewer.scene.postProcessStages.remove(stage);
    activeStages.delete(mode);
  }
}
