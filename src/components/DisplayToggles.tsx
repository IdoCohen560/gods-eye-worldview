interface Props {
  hudVisible: boolean;
  onToggleHud: () => void;
  detectionEnabled: boolean;
  onToggleDetection: () => void;
  scopeEnabled: boolean;
  onToggleScope: () => void;
  celestialEnabled: boolean;
  onToggleCelestial: () => void;
}

const TOGGLES = [
  { key: 'hud', label: 'HUD', icon: '◈' },
  { key: 'detection', label: 'DETECT', icon: '⊡' },
  { key: 'scope', label: 'SCOPE', icon: '◎' },
  { key: 'celestial', label: 'CELESTIAL', icon: '☽' },
];

export default function DisplayToggles({
  hudVisible, onToggleHud,
  detectionEnabled, onToggleDetection,
  scopeEnabled, onToggleScope,
  celestialEnabled, onToggleCelestial,
}: Props) {
  const state: Record<string, { active: boolean; toggle: () => void }> = {
    hud: { active: hudVisible, toggle: onToggleHud },
    detection: { active: detectionEnabled, toggle: onToggleDetection },
    scope: { active: scopeEnabled, toggle: onToggleScope },
    celestial: { active: celestialEnabled, toggle: onToggleCelestial },
  };

  return (
    <div id="pp-toggles">
      {TOGGLES.map(t => (
        <button
          key={t.key}
          className={`pp-toggle-btn ${state[t.key].active ? 'active' : ''}`}
          onClick={state[t.key].toggle}
        >
          <span className="pp-icon">{t.icon}</span>
          <span className="pp-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
