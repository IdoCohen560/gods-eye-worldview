interface Props {
  hudVisible: boolean;
  onToggleHud: () => void;
  hudLayout: string;
  onHudLayoutChange: (layout: string) => void;
  detectionEnabled: boolean;
  onToggleDetection: () => void;
  detectionDensity: number;
  onDetectionDensityChange: (v: number) => void;
  detectionFade: number;
  onDetectionFadeChange: (v: number) => void;
  models3d: boolean;
  onToggle3d: () => void;
  models3dMode: string;
  onModels3dModeChange: (mode: string) => void;
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

export default function DisplayToggles({
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
    <div id="pp-toggles">
      <div className="compact pp-header-row">
        <span className="pp-header-label">DISPLAY</span>
        <span className="panel-divider" />
      </div>

      {/* HUD */}
      <div className="pp-toggle-group">
        <button className={`pp-toggle-btn ${hudVisible ? 'active' : ''}`} onClick={onToggleHud} title="Intelligence HUD (H)">
          <span className="pp-icon">◈</span>
          <span className="pp-label">HUD</span>
        </button>
        <div className="pp-slider-row">
          <span className="pp-slider-mini-label">Layout</span>
          <select className="pp-select" value={hudLayout} onChange={e => onHudLayoutChange(e.target.value)} aria-label="HUD layout">
            <option value="tactical">Tactical</option>
            <option value="operator">Operator</option>
            <option value="minimal">Minimal</option>
          </select>
        </div>
      </div>

      {/* Detection */}
      <div className="pp-toggle-group">
        <button className={`pp-toggle-btn ${detectionEnabled ? 'active' : ''}`} onClick={onToggleDetection} title="Detection Overlay (D)">
          <span className="pp-icon">⊡</span>
          <span className="pp-label">DETECT</span>
        </button>
        <div className="pp-slider-row">
          <label className="pp-slider-mini-label">Density</label>
          <input type="range" className="pp-slider" min="0" max="100" step="25" value={detectionDensity} onChange={e => onDetectionDensityChange(+e.target.value)} />
          <span className="pp-slider-value">{detectionDensity}%</span>
        </div>
        <div className="pp-slider-row">
          <label className="pp-slider-mini-label">Fade</label>
          <input type="range" className="pp-slider" min="0" max="40" step="1" value={detectionFade} onChange={e => onDetectionFadeChange(+e.target.value)} />
          <span className="pp-slider-value">{detectionFade}%</span>
        </div>
      </div>

      {/* 3D Models */}
      <div className="pp-toggle-group">
        <button className={`pp-toggle-btn ${models3d ? 'active' : ''}`} onClick={onToggle3d} title="3D aircraft models">
          <span className="pp-icon">✈</span>
          <span className="pp-label">3D</span>
        </button>
        <div className="pp-slider-row">
          <span className="pp-slider-mini-label">Models</span>
          <div className="pp-mode-seg">
            <button className={`pp-mode-btn ${models3dMode === 'proximity' ? 'active' : ''}`} onClick={() => onModels3dModeChange('proximity')}>Proximity</button>
            <button className={`pp-mode-btn ${models3dMode === 'all' ? 'active' : ''}`} onClick={() => onModels3dModeChange('all')}>All</button>
          </div>
        </div>
      </div>

      {/* Scope */}
      <div className="pp-toggle-group">
        <button className={`pp-toggle-btn ${scopeEnabled ? 'active' : ''}`} onClick={onToggleScope} title="Scope viewport mask">
          <span className="pp-icon">◎</span>
          <span className="pp-label">Scope</span>
        </button>
        <div className="pp-slider-row">
          <span className="pp-slider-mini-label">Feather</span>
          <input type="range" className="pp-slider" min="0" max="100" value={scopeFeather} onChange={e => onScopeFeatherChange(+e.target.value)} />
          <span className="pp-slider-value">{scopeFeather}%</span>
        </div>
      </div>

      {/* Celestial */}
      <div className="pp-toggle-group">
        <button className={`pp-toggle-btn ${celestialEnabled ? 'active' : ''}`} onClick={onToggleCelestial} title="Celestial ring">
          <span className="pp-icon">☽</span>
          <span className="pp-label">Celestial</span>
        </button>
      </div>

      {/* Clean View */}
      <button className={`pp-toggle-btn ${cleanView ? 'active' : ''}`} onClick={onToggleCleanView} title="Hide UI chrome">
        <span className="pp-icon">□</span>
        <span className="pp-label">Clean UI</span>
      </button>

      {/* Bloom */}
      <div className="pp-toggle-group">
        <button className={`pp-toggle-btn ${bloomEnabled ? 'active' : ''}`} onClick={onToggleBloom} title="Bloom / Glow">
          <span className="pp-icon">✦</span>
          <span className="pp-label">Bloom</span>
        </button>
        <div className="pp-slider-row">
          <input type="range" className="pp-slider" min="0" max="200" value={bloomIntensity} onChange={e => onBloomIntensityChange(+e.target.value)} />
          <span className="pp-slider-value">{bloomIntensity}%</span>
        </div>
      </div>

      {/* Sharpen */}
      <div className="pp-toggle-group">
        <button className={`pp-toggle-btn ${sharpenEnabled ? 'active' : ''}`} onClick={onToggleSharpen} title="Sharpening">
          <span className="pp-icon">🔍</span>
          <span className="pp-label">Sharpen</span>
        </button>
        <div className="pp-slider-row">
          <input type="range" className="pp-slider" min="0" max="100" value={sharpenIntensity} onChange={e => onSharpenIntensityChange(+e.target.value)} />
          <span className="pp-slider-value">{sharpenIntensity}%</span>
        </div>
      </div>
    </div>
  );
}
