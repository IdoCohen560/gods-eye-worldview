import { createContext, useContext, useRef, useCallback, useEffect, type ReactNode } from 'react';
import type { Viewer } from 'cesium';

interface RenderGovernorAPI {
  install: (viewer: Viewer) => void;
  hold: (ownerId: string) => void;
  release: (ownerId: string) => void;
  requestRender: (reason?: string) => void;
  diagnostics: () => { installed: boolean; mode: 'continuous' | 'idle'; holds: string[] };
}

const RenderGovernorContext = createContext<RenderGovernorAPI | null>(null);

export function useRenderGovernor(): RenderGovernorAPI {
  const ctx = useContext(RenderGovernorContext);
  if (!ctx) throw new Error('useRenderGovernor must be used within RenderGovernorProvider');
  return ctx;
}

export function RenderGovernorProvider({ children }: { children: ReactNode }) {
  const viewerRef = useRef<Viewer | null>(null);
  const installedRef = useRef(false);
  const holdsRef = useRef(new Set<string>());
  const recentRequestsRef = useRef<Array<{ reason: string; at: number }>>([]);
  const CAP = 16;

  const applyMode = useCallback(() => {
    if (!installedRef.current || !viewerRef.current?.scene) return;
    const continuous = holdsRef.current.size > 0;
    const scene = viewerRef.current.scene;
    if (scene.requestRenderMode === !continuous) return;
    scene.requestRenderMode = !continuous;
    if (!continuous) {
      scene.requestRender?.();
    }
  }, []);

  const install = useCallback((viewer: Viewer) => {
    if (!viewer?.scene) throw new TypeError('install requires a Cesium viewer');
    viewerRef.current = viewer;
    installedRef.current = true;
    viewer.scene.maximumRenderTimeChange = Infinity;
    applyMode();
  }, [applyMode]);

  const hold = useCallback((ownerId: string) => {
    if (!ownerId) return;
    holdsRef.current.add(ownerId);
    applyMode();
  }, [applyMode]);

  const release = useCallback((ownerId: string) => {
    if (!ownerId) return;
    holdsRef.current.delete(ownerId);
    applyMode();
  }, [applyMode]);

  const requestRender = useCallback((reason = 'unspecified') => {
    if (!installedRef.current || !viewerRef.current?.scene) return;
    if (holdsRef.current.size === 0) {
      recentRequestsRef.current.push({ reason, at: Date.now() });
      if (recentRequestsRef.current.length > CAP) recentRequestsRef.current.shift();
    }
    viewerRef.current.scene.requestRender?.();
  }, []);

  const diagnostics = useCallback(() => ({
    installed: installedRef.current,
    mode: holdsRef.current.size > 0 ? 'continuous' as const : 'idle' as const,
    holds: [...holdsRef.current].sort(),
  }), []);

  useEffect(() => {
    return () => {
      holdsRef.current.clear();
      recentRequestsRef.current.length = 0;
    };
  }, []);

  const api: RenderGovernorAPI = { install, hold, release, requestRender, diagnostics };

  return (
    <RenderGovernorContext.Provider value={api}>
      {children}
    </RenderGovernorContext.Provider>
  );
}
