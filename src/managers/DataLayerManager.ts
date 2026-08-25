/**
 * DataLayerManager — lifecycle manager for all data layers.
 * Adapted from reference repo's vanilla JS manager.js to TypeScript.
 * 
 * Each layer follows: init → enable → update → disable → destroy
 * Feed states: nominal | loading | degraded | stale | fallback | unavailable
 */

export type FeedState = 'nominal' | 'loading' | 'degraded' | 'stale' | 'fallback' | 'unavailable';

export interface LayerStats {
  count?: number;
  lastUpdate?: number;
  status?: string;
  source?: string;
  coverage?: string;
  error?: Error | string;
  lastError?: Error | string;
  loading?: boolean;
  fallback?: boolean;
  stale?: boolean;
  available?: boolean;
  unavailable?: boolean;
  mode?: string;
  managerRefreshError?: Error | string;
}

export interface DataLayer {
  id: string;
  label: string;
  init?: (viewer: any, manager: DataLayerManager) => void;
  enable?: () => void | Promise<void>;
  disable?: () => void;
  destroy?: () => void;
  update?: (params: Record<string, unknown>) => void;
  getStats?: () => LayerStats;
  cancelPendingRestore?: (ctx: { origin: string; reason: string }) => void;
}

export type FeedStateListener = (layerId: string, state: FeedState, stats: LayerStats) => void;

function layerFeedState(stats: LayerStats = {}): FeedState {
  const state = stats;
  const status = typeof state.status === 'string' ? state.status.toLowerCase() : '';
  const hasPriorData = Number(state.count) > 0 || Boolean(state.lastUpdate);
  const presentedError = state.error || state.lastError || state.managerRefreshError;

  if (['unavailable', 'offline', 'down', 'error'].includes(status)) return 'unavailable';
  if (
    (presentedError || state.unavailable === true || state.available === false)
    && !hasPriorData
    && !['zoom-in', 'empty', 'idle'].includes(status)
  ) {
    return 'unavailable';
  }
  if (state.loading) return 'loading';
  if (['zoom-in', 'empty', 'idle'].includes(status)) {
    return state.stale ? 'stale' : 'nominal';
  }
  if (
    state.fallback === true
    || status === 'fallback'
    || state.mode === 'sim'
    || (!hasPriorData && /\bfallback\b/i.test(`${state.source || ''} ${state.coverage || ''}`))
  ) {
    return 'fallback';
  }
  if (state.stale) return 'stale';
  if (state.error || state.lastError) return 'degraded';
  return 'nominal';
}

interface LayerEntry {
  module: DataLayer;
  enabled: boolean;
  params: Record<string, unknown> | null;
}

export class DataLayerManager {
  private layers = new Map<string, LayerEntry>();
  private stateListeners: FeedStateListener[] = [];
  private viewer: any = null;

  install(viewer: any) {
    this.viewer = viewer;
  }

  register(layer: DataLayer) {
    if (this.layers.has(layer.id)) return;
    this.layers.set(layer.id, { module: layer, enabled: false, params: null });
    layer.init?.(this.viewer, this);
  }

  async enable(layerId: string) {
    const entry = this.layers.get(layerId);
    if (!entry || entry.enabled) return;
    entry.enabled = true;
    this.emitState(layerId, 'loading', {});
    try {
      await entry.module.enable?.();
      const stats = entry.module.getStats?.() || {};
      this.emitState(layerId, layerFeedState(stats), stats);
    } catch (err) {
      this.emitState(layerId, 'unavailable', { error: err as Error });
    }
  }

  disable(layerId: string) {
    const entry = this.layers.get(layerId);
    if (!entry || !entry.enabled) return;
    entry.enabled = false;
    entry.module.disable?.();
    this.emitState(layerId, 'unavailable', {});
  }

  destroy(layerId: string) {
    const entry = this.layers.get(layerId);
    if (!entry) return;
    entry.module.destroy?.();
    this.layers.delete(layerId);
  }

  updateParams(layerId: string, params: Record<string, unknown>) {
    const entry = this.layers.get(layerId);
    if (!entry) return;
    entry.params = params;
    entry.module.update?.(params);
  }

  isEnabled(layerId: string): boolean {
    return this.layers.get(layerId)?.enabled ?? false;
  }

  getState(layerId: string): FeedState {
    const entry = this.layers.get(layerId);
    if (!entry) return 'unavailable';
    if (!entry.enabled) return 'unavailable';
    const stats = entry.module.getStats?.() || {};
    return layerFeedState(stats);
  }

  getAllStates(): Record<string, FeedState> {
    const result: Record<string, FeedState> = {};
    for (const [id] of this.layers) {
      result[id] = this.getState(id);
    }
    return result;
  }

  refreshState(layerId: string) {
    const entry = this.layers.get(layerId);
    if (!entry) return;
    const stats = entry.module.getStats?.() || {};
    this.emitState(layerId, layerFeedState(stats), stats);
  }

  onStateChange(listener: FeedStateListener) {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  private emitState(layerId: string, state: FeedState, stats: LayerStats) {
    for (const listener of this.stateListeners) {
      try {
        listener(layerId, state, stats);
      } catch (err) {
        console.error(`[DataLayerManager] State listener error for ${layerId}:`, err);
      }
    }
  }
}
