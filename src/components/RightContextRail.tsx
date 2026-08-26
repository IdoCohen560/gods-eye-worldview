import type { Viewer } from 'cesium';
import DisplayToggles from './DisplayToggles';

interface Props {
  viewer: Viewer | null;
  hudVisible: boolean;
  onToggleHud: () => void;
  hudLayout: string;
  onHudLayoutChange: (v: string) => void;
  detectionEnabled: boolean;
  onToggleDetection: () => void;
  detectionDensity: number;
  onDetectionDensityChange: (v: number) => void;
  detectionFade: number;
  onDetectionFadeChange: (v: number) => void;
  models3d: boolean;
  onToggle3d: () => void;
  models3dMode: string;
  onModels3dModeChange: (v: string) => void;
  scopeEnabled: boolean;
  onToggleScope: () => void;
  scopeFeather: number;
  onScopeFeatherChange: (v: number) => void;
  celestialEnabled: boolean;
  onToggleCelestial: () => void;
  cleanView: boolean;
  onToggleCleanView: () => void;
  bloomEnabled: boolean;
  onToggleBloom: () => void;
  bloomIntensity: number;
  onBloomIntensityChange: (v: number) => void;
  sharpenEnabled: boolean;
  onToggleSharpen: () => void;
  sharpenIntensity: number;
  onSharpenIntensityChange: (v: number) => void;
}

export default function RightContextRail({
  viewer,
  hudVisible, onToggleHud, hudLayout, onHudLayoutChange,
  detectionEnabled, onToggleDetection, detectionDensity, onDetectionDensityChange,
  detectionFade, onDetectionFadeChange,
  models3d, onToggle3d, models3dMode, onModels3dModeChange,
  scopeEnabled, onToggleScope, scopeFeather, onScopeFeatherChange,
  celestialEnabled, onToggleCelestial,
  cleanView, onToggleCleanView,
  bloomEnabled, onToggleBloom, bloomIntensity, onBloomIntensityChange,
  sharpenEnabled, onToggleSharpen, sharpenIntensity, onSharpenIntensityChange,
}: Props) {
  return (
    <div id="right-context-rail">
      <DisplayToggles
        hudVisible={hudVisible} onToggleHud={onToggleHud}
        hudLayout={hudLayout} onHudLayoutChange={onHudLayoutChange}
        detectionEnabled={detectionEnabled} onToggleDetection={onToggleDetection}
        detectionDensity={detectionDensity} onDetectionDensityChange={onDetectionDensityChange}
        detectionFade={detectionFade} onDetectionFadeChange={onDetectionFadeChange}
        models3d={models3d} onToggle3d={onToggle3d}
        models3dMode={models3dMode} onModels3dModeChange={onModels3dModeChange}
        scopeEnabled={scopeEnabled} onToggleScope={onToggleScope}
        scopeFeather={scopeFeather} onScopeFeatherChange={onScopeFeatherChange}
        celestialEnabled={celestialEnabled} onToggleCelestial={onToggleCelestial}
        cleanView={cleanView} onToggleCleanView={onToggleCleanView}
        bloomEnabled={bloomEnabled} onToggleBloom={onToggleBloom}
        bloomIntensity={bloomIntensity} onBloomIntensityChange={onBloomIntensityChange}
        sharpenEnabled={sharpenEnabled} onToggleSharpen={onToggleSharpen}
        sharpenIntensity={sharpenIntensity} onSharpenIntensityChange={onSharpenIntensityChange}
      />

      <div id="global-context-panel" className="panel-collapsible collapsed">
        <div className="panel-glow" />
        <div className="global-context-panel-inner">
          <div className="panel-header">
            <span className="panel-title">CONTEXT</span>
            <span className="panel-divider" />
          </div>
          <div className="global-context-modes" role="tablist">
            <button className="context-mode-button active" role="tab">
              <span className="material-symbols-outlined">radar</span>
              <span>CONTACTS</span>
            </button>
            <button className="context-mode-button" role="tab">
              <span className="material-symbols-outlined">rocket_launch</span>
              <span>SPACE MISSIONS</span>
            </button>
          </div>
          <div className="context-mode-standby">
            <strong>SELECT CONTEXT</strong>
            <span>CONTACTS — nearest planes, vessels, sites<br />SPACE MISSIONS — launches and orbital assets</span>
          </div>
        </div>
      </div>
    </div>
  );
}
