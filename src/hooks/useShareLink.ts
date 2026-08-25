/**
 * useShareLink — manages URL hash state for shareable links.
 * Encodes camera position, active style, shader parameters, active layers,
 * map stack, and UI panel states into the URL hash.
 * Adapted from reference repo's sharelink.js.
 */
import { useEffect, useCallback, useRef } from 'react';
import { encodeViewState, decodeViewState, encodeLayerState, type LayerStateEntry } from '../utils/layerStateCodec';
import type { ShaderMode, ViewState } from '../App';

interface ShareLinkOptions {
  viewState: ViewState;
  shaderMode: ShaderMode;
  activeLayers: Record<string, boolean>;
  onRestoreViewState?: (state: { lat: number; lon: number; alt: number; heading: number; pitch: number }) => void;
  onRestoreShader?: (mode: ShaderMode) => void;
  onRestoreLayers?: (layers: Record<string, boolean>) => void;
}

const STYLE_TO_HASH: Record<ShaderMode, string> = {
  normal: 'normal', nvg: 'nvg', flir: 'flir', crt: 'crt',
  cel: 'cel', classified: 'classified', bw: 'bw', surveillance: 'surveillance',
  noir: 'noir', snow: 'snow',
};
const HASH_TO_STYLE: Record<string, ShaderMode> = Object.fromEntries(
  Object.entries(STYLE_TO_HASH).map(([k, v]) => [v, k as ShaderMode])
) as Record<string, ShaderMode>;

const DEBOUNCE_MS = 500;

export function useShareLink({
  viewState, shaderMode, activeLayers,
  onRestoreViewState, onRestoreShader, onRestoreLayers,
}: ShareLinkOptions) {
  const restoredRef = useRef(false);

  // Restore from URL hash on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);

    // Camera state
    const cameraState = decodeViewState(hash);
    if (cameraState && onRestoreViewState) {
      onRestoreViewState({
        lat: cameraState.lat,
        lon: cameraState.lon,
        alt: cameraState.alt,
        heading: cameraState.heading,
        pitch: (cameraState as any).pitch ?? -35,
      });
    }

    // Shader mode
    const style = params.get('style');
    if (style && HASH_TO_STYLE[style] && onRestoreShader) {
      onRestoreShader(HASH_TO_STYLE[style]);
    }

    // Active layers
    const layers = params.get('layers');
    if (layers && onRestoreLayers) {
      const entries = decodeViewState(layers);
      const restored: Record<string, boolean> = {};
      // Simple toggle restoration
      for (const [key, val] of Object.entries(params)) {
        if (key.startsWith('layer_')) {
          restored[key.slice(6)] = val === '1';
        }
      }
      if (Object.keys(restored).length > 0) {
        onRestoreLayers({ ...activeLayers, ...restored });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Write state to hash on changes
  useEffect(() => {
    if (!restoredRef.current) return;
    const timeout = setTimeout(() => {
      const parts: string[] = [];

      // Camera
      parts.push(encodeViewState(viewState));

      // Style
      parts.push(`style=${STYLE_TO_HASH[shaderMode] || 'normal'}`);

      // Layers
      const layerEntries: LayerStateEntry[] = Object.entries(activeLayers)
        .filter(([, v]) => v)
        .map(([k]) => ({ id: k, enabled: true }));
      if (layerEntries.length > 0) {
        parts.push(`layers=${encodeLayerState(layerEntries)}`);
      }

      // Timestamp
      parts.push(`at=${Date.now()}`);

      window.location.hash = parts.join('&');
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [viewState, shaderMode, activeLayers]);
}

export function getShareUrl(): string {
  return `${window.location.origin}${window.location.pathname}${window.location.hash}`;
}

export async function copyShareLink(): Promise<boolean> {
  const url = getShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
