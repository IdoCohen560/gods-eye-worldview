import { useState, useCallback } from 'react';
import CesiumViewer from './components/CesiumViewer';
import Sidebar from './components/Sidebar';
import HUD from './components/HUD';
import ShaderSelector from './components/ShaderSelector';
import CommandBar from './components/CommandBar';
import type { Viewer } from 'cesium';

export type ShaderMode = 'normal' | 'nvg' | 'flir' | 'crt' | 'cel' | 'classified';

export interface ViewState {
  lat: number;
  lon: number;
  alt: number;
  heading: number;
}

export default function App() {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [shaderMode, setShaderMode] = useState<ShaderMode>('normal');
  const [viewState, setViewState] = useState<ViewState>({ lat: 0, lon: 0, alt: 10_000_000, heading: 0 });
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    aircraft: true,
    satellites: true,
    cctv: true,
    traffic: false,
    gibs: false,
  });
  const [feedCounts, setFeedCounts] = useState({ aircraft: 0, satellites: 0, cameras: 0 });

  const handleViewerReady = useCallback((v: Viewer) => {
    setViewer(v);
  }, []);

  const toggleLayer = useCallback((layer: string) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const updateFeedCount = useCallback((key: 'aircraft' | 'satellites' | 'cameras', count: number) => {
    setFeedCounts(prev => ({ ...prev, [key]: count }));
  }, []);

  return (
    <div className="app">
      <CommandBar viewer={viewer} />
      <div className="main-container">
        <Sidebar activeLayers={activeLayers} toggleLayer={toggleLayer} />
        <div className="viewer-container">
          <CesiumViewer
            onReady={handleViewerReady}
            shaderMode={shaderMode}
            activeLayers={activeLayers}
            onViewStateChange={setViewState}
            onFeedCountUpdate={updateFeedCount}
          />
          <HUD viewState={viewState} feedCounts={feedCounts} shaderMode={shaderMode} />
          <ShaderSelector current={shaderMode} onChange={setShaderMode} />
        </div>
      </div>
    </div>
  );
}
