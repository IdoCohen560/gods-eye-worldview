import { createContext, useContext, useRef, useCallback, useEffect, useState, type ReactNode } from 'react';
import { DataLayerManager, type FeedState, type FeedStateListener } from '../managers/DataLayerManager';
import type { Viewer } from 'cesium';

interface DataLayerContextAPI {
  manager: DataLayerManager;
  install: (viewer: Viewer) => void;
  feedStates: Record<string, FeedState>;
  onStateChange: (listener: FeedStateListener) => () => void;
}

const DataLayerContext = createContext<DataLayerContextAPI | null>(null);

export function useDataLayerManager(): DataLayerContextAPI {
  const ctx = useContext(DataLayerContext);
  if (!ctx) throw new Error('useDataLayerManager must be used within DataLayerProvider');
  return ctx;
}

export function DataLayerProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef(new DataLayerManager());
  const [feedStates, setFeedStates] = useState<Record<string, FeedState>>({});

  const install = useCallback((viewer: Viewer) => {
    managerRef.current.install(viewer);
  }, []);

  const onStateChange = useCallback((listener: FeedStateListener) => {
    return managerRef.current.onStateChange((layerId, state, stats) => {
      setFeedStates(prev => ({ ...prev, [layerId]: state }));
      listener(layerId, state, stats);
    });
  }, []);

  useEffect(() => {
    return () => {
      for (const [id] of (managerRef.current as any).layers || []) {
        managerRef.current.destroy(id);
      }
    };
  }, []);

  const api: DataLayerContextAPI = {
    manager: managerRef.current,
    install,
    feedStates,
    onStateChange,
  };

  return (
    <DataLayerContext.Provider value={api}>
      {children}
    </DataLayerContext.Provider>
  );
}
