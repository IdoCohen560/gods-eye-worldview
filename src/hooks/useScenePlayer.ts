/**
 * useScenePlayer — hook for scene playback control.
 */
import { useState, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import { SceneDirector, BUILTIN_SCENES } from '../scenes/SceneDirector';
import type { Scene, PlaybackState } from '../scenes/SceneDirector';

interface Props {
  viewer: Cesium.Viewer | null;
}

export function useScenePlayer({ viewer }: Props) {
  const directorRef = useRef<SceneDirector | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({
    running: false, currentSceneId: null, currentShotIndex: 0, cancelled: false,
  });

  const getDirector = useCallback(() => {
    if (!viewer) return null;
    if (!directorRef.current) {
      directorRef.current = new SceneDirector(viewer);
    }
    return directorRef.current;
  }, [viewer]);

  const scenes = BUILTIN_SCENES.map(s => ({ id: s.id, title: s.title, shots: s.shots.length }));

  const startScene = useCallback(async (sceneId?: string) => {
    const dir = getDirector();
    if (!dir) return;

    const id = sceneId || scenes[0]?.id;
    if (!id) return;

    dir.playScene(id, (sid, shotIdx) => {
      setPlayback({ running: true, currentSceneId: sid, currentShotIndex: shotIdx, cancelled: false });
    });

    // Track completion
    setPlayback({ running: true, currentSceneId: id, currentShotIndex: 0, cancelled: false });
  }, [getDirector, scenes]);

  const stopScene = useCallback(() => {
    const dir = getDirector();
    dir?.stop();
    setPlayback({ running: false, currentSceneId: null, currentShotIndex: 0, cancelled: true });
  }, [getDirector]);

  return {
    scenes,
    playback,
    startScene,
    stopScene,
  };
}
