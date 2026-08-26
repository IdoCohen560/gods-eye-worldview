import { useState, useCallback } from 'react';
import CesiumViewer from './components/CesiumViewer';
import DataPanel from './components/DataPanel';
import HUD from './components/HUD';
import CommandDock from './components/CommandDock';
import BootSequence from './components/BootSequence';
import FirstRunExperience from './components/FirstRunExperience';
import ToastNotification from './components/ToastNotification';
import TitleBar from './components/TitleBar';
import DisplayToggles from './components/DisplayToggles';
import { RenderGovernorProvider } from './context/RenderGovernorContext';
import { DataLayerProvider } from './context/DataLayerContext';
import { useShareLink } from './hooks/useShareLink';
import { useScenePlayer } from './hooks/useScenePlayer';
import { GIBS_LAYERS, GIBS_DEFAULT_LAYER_ID } from './config/gibs-layers';
import type { Viewer } from 'cesium';

export type ShaderMode = 'normal' | 'nvg' | 'flir' | 'crt' | 'cel' | 'classified' | 'bw' | 'surveillance' | 'noir' | 'snow';

export interface ViewState {
  lat: number;
  lon: number;
  alt: number;
  heading: number;
}

export interface FeedCounts {
  aircraft: number;
  satellites: number;
  cameras: number;
  ships: number;
  conflicts: number;
  earthquakes: number;
  fires: number;
  eonet: number;
  gdacs: number;
  nws: number;
  rockets: number;
  radio: number;
  bikeshare: number;
  military: number;
  datacenters: number;
  dams: number;
}

const SHADER_LABELS: Record<ShaderMode, string> = {
  normal: 'NORMAL',
  nvg: 'NVG',
  flir: 'FLIR',
  crt: 'CRT',
  cel: 'ANIME',
  classified: 'CLASSIFIED',
  bw: 'B&W',
  surveillance: 'SURVEILLANCE',
  noir: 'NOIR',
  snow: 'SNOW',
};

function AppInner() {
  const [booting, setBooting] = useState(true);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [shaderMode, setShaderMode] = useState<ShaderMode>('normal');
  const [viewState, setViewState] = useState<ViewState>({ lat: 0, lon: 0, alt: 10_000_000, heading: 0 });
  const [mapStack, setMapStack] = useState('photoreal');
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      aircraft: true,
      satellites: false,
      cctv: true,
      traffic: false,
      ships: false,
      conflicts: false,
      earthquakes: false,
      fires: false,
      eonet: true,
      gdacs: true,
      nws: false,
      boundingBoxes: true,
      rockets: true,
      radio: false,
      bikeshare: false,
      military: false,
      datacenters: true,
      dams: true,
    };
    for (const cfg of GIBS_LAYERS) {
      initial[`gibs_${cfg.id}`] = cfg.id === GIBS_DEFAULT_LAYER_ID;
    }
    return initial;
  });
  const [feedCounts, setFeedCounts] = useState<FeedCounts>({
    aircraft: 0, satellites: 0, cameras: 0, ships: 0, conflicts: 0, earthquakes: 0, fires: 0,
    eonet: 0, gdacs: 0, nws: 0, rockets: 0, radio: 0, bikeshare: 0, military: 0, datacenters: 0, dams: 0,
  });

  // Display toggles
  const [hudVisible, setHudVisible] = useState(true);
  const [detectionEnabled, setDetectionEnabled] = useState(true);
  const [scopeEnabled, setScopeEnabled] = useState(true);
  const [celestialEnabled, setCelestialEnabled] = useState(true);

  useShareLink({
    viewState,
    shaderMode,
    activeLayers,
    onRestoreViewState: (s) => setViewState({ lat: s.lat, lon: s.lon, alt: s.alt, heading: s.heading }),
    onRestoreShader: (m) => setShaderMode(m),
    onRestoreLayers: (l) => setActiveLayers(l),
  });

  const handleViewerReady = useCallback((v: Viewer) => {
    setViewer(v);
  }, []);

  const toggleLayer = useCallback((layer: string) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const updateFeedCount = useCallback((key: keyof FeedCounts, count: number) => {
    setFeedCounts(prev => ({ ...prev, [key]: count }));
  }, []);

  const { scenes, playback, startScene, stopScene } = useScenePlayer({ viewer });

  if (booting) {
    return <BootSequence onComplete={() => setBooting(false)} />;
  }

  return (
    <div className="app">
      <FirstRunExperience onComplete={() => {}} />
      <ToastNotification />

      {/* Title Bar */}
      <TitleBar visible={true} styleName={SHADER_LABELS[shaderMode]} />

      {/* Display Toggles (top-right) */}
      <DisplayToggles
        hudVisible={hudVisible}
        onToggleHud={() => setHudVisible(!hudVisible)}
        detectionEnabled={detectionEnabled}
        onToggleDetection={() => setDetectionEnabled(!detectionEnabled)}
        scopeEnabled={scopeEnabled}
        onToggleScope={() => setScopeEnabled(!scopeEnabled)}
        celestialEnabled={celestialEnabled}
        onToggleCelestial={() => setCelestialEnabled(!celestialEnabled)}
      />

      {/* Left Panel Stack — Data Layers */}
      <DataPanel activeLayers={activeLayers} toggleLayer={toggleLayer} />

      {/* Full-screen Cesium Globe */}
      <div className="cesium-container">
        <CesiumViewer
          onReady={handleViewerReady}
          shaderMode={shaderMode}
          activeLayers={activeLayers}
          onViewStateChange={setViewState}
          onFeedCountUpdate={updateFeedCount}
          scopeEnabled={scopeEnabled}
          celestialEnabled={celestialEnabled}
          detectionEnabled={detectionEnabled}
        />
      </div>

      {/* Intel HUD Overlay */}
      <HUD viewState={viewState} feedCounts={feedCounts} shaderMode={shaderMode} visible={hudVisible} />

      {/* Bottom Command Dock */}
      <CommandDock
        viewer={viewer}
        shaderMode={shaderMode}
        onShaderChange={setShaderMode}
        mapStack={mapStack}
        onMapStackChange={setMapStack}
      />

      {/* Scene Player (top-center) */}
      {scenes.length > 0 && (
        <div id="top-center-actions">
          {playback.running ? (
            <button onClick={stopScene} title="Stop scene">⏹</button>
          ) : (
            scenes.map(s => (
              <button key={s.id} onClick={() => startScene(s.id)} title={`Play: ${s.title}`}>▶</button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <RenderGovernorProvider>
      <DataLayerProvider>
        <AppInner />
      </DataLayerProvider>
    </RenderGovernorProvider>
  );
}
