import { useState } from 'react';

export default function ScenePanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div id="scene-panel" className={`panel-collapsible ${expanded ? 'active' : 'collapsed'}`}>
      <div className="panel-glow" />
      <div className="scene-panel-inner">
        <div className="panel-header">
          <span className="panel-title">SCENES</span>
          <span className="panel-divider" />
          <button className="panel-collapse-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? '−' : '+'}
          </button>
        </div>
        {expanded && (
          <>
            <div className="scene-controls">
              <select aria-label="Scene recipe" style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 9, padding: '4px 8px' }}>
                <option value="">Select scene...</option>
              </select>
              <button className="scene-btn">NEW</button>
              <button className="scene-btn scene-btn-danger">DEL</button>
            </div>
            <div className="scene-controls">
              <button className="scene-btn">CAPTURE SHOT</button>
              <button className="scene-btn">UPDATE SHOT</button>
            </div>
            <div className="scene-shot-list" style={{ minHeight: 40, fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: 1, padding: '8px 0' }}>
              No shots captured
            </div>
            <div className="scene-controls">
              <button className="scene-btn">START</button>
              <button className="scene-btn scene-btn-danger">STOP</button>
              <button className="scene-btn">NEXT</button>
            </div>
            <div className="scene-controls">
              <button className="scene-btn">EXPORT</button>
              <button className="scene-btn">IMPORT</button>
              <button className="scene-btn">RUN LOG</button>
            </div>
            <div className="scene-progress">
              <div style={{ width: '0%', height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
            </div>
            <div id="scene-status" style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: 1, textAlign: 'center' }}>Ready</div>
          </>
        )}
      </div>
    </div>
  );
}
