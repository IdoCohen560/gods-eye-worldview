interface Props {
  visible: boolean;
  layout: string;
  time: Date;
}

export default function HudOverlay({ visible, layout, time }: Props) {
  const utc = time.toISOString().replace('T', ' ').slice(0, 23) + 'Z';

  return (
    <section id="hud-overlay" className={`${layout} ${visible ? 'active' : ''}`}>
      <div className="hud-hud-tray">
        <div className="hud-hud-row">
          <span className="hud-mono-dim">CLASSIFICATION: UNCLASSIFIED // FOUO</span>
          <span className="hud-mono-dim">SESSION: GE-{Math.floor(time.getTime() / 1000).toString(36).toUpperCase().slice(-4)}</span>
        </div>
        <div className="hud-hud-row">
          <span className="hud-mono-dim">ACTIVE STYLE: {layout.toUpperCase()}</span>
          <span className="hud-mono-dim">DATALINKS: ACTIVE</span>
        </div>
      </div>

      <div className="hud-utc-banner hud-hud-tray">
        <span className="hud-mono-dim">{utc}</span>
      </div>

      <div className="hud-scanning-line" />

      <div className="hud-ai-summary hud-hud-tray">
        <span className="hud-mono-dim">NO PLACE LEFT BEHIND</span>
      </div>

      <div className="hud-corner hud-corner-tl">
        <div className="hud-corner-inner">
          <span className="hud-mono-dim">SESSION START</span>
          <span className="hud-mono">—</span>
        </div>
      </div>
      <div className="hud-corner hud-corner-tr">
        <div className="hud-corner-inner">
          <span className="hud-mono-dim">MGRS</span>
          <span className="hud-mono">—</span>
        </div>
      </div>
      <div className="hud-corner hud-corner-bl">
        <div className="hud-corner-inner">
          <span className="hud-mono-dim">DMS</span>
          <span className="hud-mono">—</span>
        </div>
      </div>
      <div className="hud-corner hud-corner-br">
        <div className="hud-corner-inner">
          <span className="hud-mono-dim">ALT</span>
          <span className="hud-mono">—</span>
        </div>
      </div>
    </section>
  );
}
