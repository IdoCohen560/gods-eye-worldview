import { useState, useCallback, useEffect, Component } from 'react';
import CesiumViewer from './components/CesiumViewer';
import DataPanel from './components/DataPanel';
import HUD from './components/HUD';
import CommandDock from './components/CommandDock';
import BootSequence from './components/BootSequence';
import FirstRunExperience from './components/FirstRunExperience';
import ToastNotification from './components/ToastNotification';
import TitleBar from './components/TitleBar';
import RightContextRail from './components/RightContextRail';
import CctvPanel from './components/CctvPanel';
import ScenePanel from './components/ScenePanel';
import CockpitView from './components/CockpitView';
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
  normal: 'NORMAL', nvg: 'NVG', flir: 'FLIR', crt: 'CRT', cel: 'ANIME',
  classified: 'CLASSIFIED', bw: 'B&W', surveillance: 'SURVEILLANCE', noir: 'NOIR', snow: 'SNOW',
};

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'monospace', color:'#00d4ff', fontSize:14, letterSpacing:2 }}>
          RENDER ERROR — CHECK CONSOLE
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [booting, setBooting] = useState(true);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [shaderMode, setShaderMode] = useState<ShaderMode>('normal');
  const [viewState, setViewState] = useState<ViewState>({ lat: 0, lon: 0, alt: 10_000_000, heading: 0 });
  const [mapStack, setMapStack] = useState('photoreal');
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      aircraft: true, satellites: false, cctv: true, traffic: false,
      ships: false, conflicts: false, earthquakes: false, fires: false,
      eonet: true, gdacs: true, nws: false, boundingBoxes: true,
      rockets: true, radio: false, bikeshare: false, military: false,
      datacenters: true, dams: true,
    };
    for (const cfg of GIBS_LAYERS) initial[`gibs_${cfg.id}`] = cfg.id === GIBS_DEFAULT_LAYER_ID;
    return initial;
  });
  const [feedCounts, setFeedCounts] = useState<FeedCounts>({
    aircraft: 0, satellites: 0, cameras: 0, ships: 0, conflicts: 0, earthquakes: 0, fires: 0,
    eonet: 0, gdacs: 0, nws: 0, rockets: 0, radio: 0, bikeshare: 0, military: 0, datacenters: 0, dams: 0,
  });

  const [hudVisible, setHudVisible] = useState(true);
  const [hudLayout, setHudLayout] = useState('tactical');
  const [detectionEnabled, setDetectionEnabled] = useState(true);
  const [detectionDensity, setDetectionDensity] = useState(75);
  const [detectionFade, setDetectionFade] = useState(10);
  const [scopeEnabled, setScopeEnabled] = useState(true);
  const [scopeFeather, setScopeFeather] = useState(80);
  const [celestialEnabled, setCelestialEnabled] = useState(true);
  const [cleanView, setCleanView] = useState(false);
  const [bloomEnabled, setBloomEnabled] = useState(false);
  const [bloomIntensity, setBloomIntensity] = useState(50);
  const [sharpenEnabled, setSharpenEnabled] = useState(false);
  const [sharpenIntensity, setSharpenIntensity] = useState(50);
  const [models3d, setModels3d] = useState(false);
  const [models3dMode, setModels3dMode] = useState('proximity');
  const [cockpitEnabled, setCockpitEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'h': setHudVisible(v => !v); break;
        case 'd': setDetectionEnabled(v => !v); break;
        case 'c': setCockpitEnabled(v => !v); break;
        case 'escape': if (cockpitEnabled) setCockpitEnabled(false); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cockpitEnabled]);

  useShareLink({
    viewState, shaderMode, activeLayers,
    onRestoreViewState: (s) => setViewState({ lat: s.lat, lon: s.lon, alt: s.alt, heading: s.heading }),
    onRestoreShader: (m) => setShaderMode(m),
    onRestoreLayers: (l) => setActiveLayers(l),
  });

  const handleViewerReady = useCallback((v: Viewer) => setViewer(v), []);
  const toggleLayer = useCallback((layer: string) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);
  const updateFeedCount = useCallback((key: keyof FeedCounts, count: number) => {
    setFeedCounts(prev => ({ ...prev, [key]: count }));
  }, []);

  const { scenes, playback, startScene, stopScene } = useScenePlayer({ viewer });

  const handleBootComplete = useCallback(() => {
    setBooting(false);
  }, []);

  return (
    <div className={`app ${cleanView ? 'clean-view' : ''}`}>
      {/* Loading overlay — fades out via CSS .hidden class */}
      <div id="loading-screen" className={booting ? '' : 'hidden'}>
        <div className="loader-content">
          <h2>GOD'S EYE <span className="title-accent">VIEW</span></h2>
          <p className="subtitle">NO PLACE LEFT BEHIND</p>
        </div>
      </div>

      {/* Boot progress — unmounts when done */}
      {booting && <BootSequence onComplete={handleBootComplete} />}

      <ErrorBoundary>
        <FirstRunExperience onComplete={() => {}} />
        <ToastNotification />

        {/* Title — top-left */}
        <TitleBar visible={!cleanView} styleName={SHADER_LABELS[shaderMode]} />

        {/* Right context rail — contains display toggles + context panel */}
        <RightContextRail
          viewer={viewer}
          hudVisible={hudVisible} onToggleHud={() => setHudVisible(!hudVisible)}
          hudLayout={hudLayout} onHudLayoutChange={setHudLayout}
          detectionEnabled={detectionEnabled} onToggleDetection={() => setDetectionEnabled(!detectionEnabled)}
          detectionDensity={detectionDensity} onDetectionDensityChange={setDetectionDensity}
          detectionFade={detectionFade} onDetectionFadeChange={setDetectionFade}
          models3d={models3d} onToggle3d={() => setModels3d(!models3d)}
          models3dMode={models3dMode} onModels3dModeChange={setModels3dMode}
          scopeEnabled={scopeEnabled} onToggleScope={() => setScopeEnabled(!scopeEnabled)}
          scopeFeather={scopeFeather} onScopeFeatherChange={setScopeFeather}
          celestialEnabled={celestialEnabled} onToggleCelestial={() => setCelestialEnabled(!celestialEnabled)}
          cleanView={cleanView} onToggleCleanView={() => setCleanView(!cleanView)}
          bloomEnabled={bloomEnabled} onToggleBloom={() => setBloomEnabled(!bloomEnabled)}
          bloomIntensity={bloomIntensity} onBloomIntensityChange={setBloomIntensity}
          sharpenEnabled={sharpenEnabled} onToggleSharpen={() => setSharpenEnabled(!sharpenEnabled)}
          sharpenIntensity={sharpenIntensity} onSharpenIntensityChange={setSharpenIntensity}
        />

        {/* Left panel stack — contains data + CCTV + scenes */}
        <div id="left-panel-stack">
          <DataPanel activeLayers={activeLayers} toggleLayer={toggleLayer} />
          <CctvPanel />
          <ScenePanel />
        </div>

        {/* Cesium globe */}
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

        {/* HUD overlay — uses .active class for visibility */}
        <HUD visible={hudVisible} layout={hudLayout} time={time} />

        {/* Cockpit FPV */}
        <CockpitView visible={cockpitEnabled} viewer={viewer} onExit={() => setCockpitEnabled(false)} />

        {/* Bottom command dock */}
        <CommandDock
          viewer={viewer}
          voiceEnabled={voiceEnabled}
          onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
          onShadersToggle={() => {}}
          onMapSourceToggle={() => {}}
        />

        {/* Scene player */}
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
      </ErrorBoundary>
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
