import type { Viewer } from 'cesium';

interface Props {
  onToggleVoice: () => void;
  voiceEnabled: boolean;
  viewer: Viewer | null;
  onShadersToggle: () => void;
  onMapSourceToggle: () => void;
}

export default function CommandDock({
  onToggleVoice, voiceEnabled, viewer,
  onShadersToggle, onMapSourceToggle,
}: Props) {
  return (
    <div id="command-dock">
      <div className="dock-glow" />
      <button
        className={`dock-item ${voiceEnabled ? 'active' : ''}`}
        onClick={onToggleVoice}
        title="Voice Command"
      >
        <span className="material-symbols-outlined dock-icon">mic</span>
        <span className="dock-label-icon" aria-hidden="true" />
        <span className="dock-item-text">VOICE</span>
      </button>

      <button className="dock-item" title="Breach Scan (Beta)">
        <span className="material-symbols-outlined dock-icon">shield</span>
        <span className="dock-item-text">BREACH SCAN</span>
      </button>

      <button className="dock-item" title="4K Export">
        <span className="material-symbols-outlined dock-icon">photo_camera</span>
        <span className="dock-item-text">EXPORT</span>
      </button>

      <div className="dock-divider" />

      <button className="dock-item" onClick={onShadersToggle} title="Shader presets">
        <span className="material-symbols-outlined dock-icon">auto_awesome</span>
        <span className="dock-item-text">SHADERS</span>
      </button>

      <button className="dock-item" onClick={onMapSourceToggle} title="Map sources">
        <span className="material-symbols-outlined dock-icon">layers</span>
        <span className="dock-item-text">MAPS</span>
      </button>

      <div className="dock-divider" />

      <div className="dock-item dock-item-group dock-location-group">
        <span className="material-symbols-outlined dock-icon">location_on</span>
        <div className="dock-location-details">
          <span className="dock-location-label">LOCATION</span>
          <span className="dock-location-value">38.8951°N, 77.0364°W</span>
          <span className="dock-location-sublabel">LANDMARK: —</span>
        </div>
      </div>
    </div>
  );
}
