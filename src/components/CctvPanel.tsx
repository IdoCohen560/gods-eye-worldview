import { useState } from 'react';

export default function CctvPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div id="cctv-panel" className={`panel-collapsible ${expanded ? 'active' : 'collapsed'}`}>
      <div className="panel-glow" />
      <div className="cctv-panel-inner">
        <div className="panel-header">
          <span className="panel-title">CCTV</span>
          <span className="panel-divider" />
          <button className="panel-collapse-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? '−' : '+'}
          </button>
        </div>
        {expanded && (
          <>
            <div className="cctv-frame-wrap">
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
                ENABLE CCTV TO LOAD FRAMES
              </div>
            </div>
            <div className="cctv-source-badge">SOURCE · UNKNOWN</div>
            <div className="cctv-controls">
              <button className="scene-btn">CCTV OFF</button>
              <button className="scene-btn">NEAREST</button>
            </div>
            <div className="cctv-controls">
              <button className="scene-btn">PREV</button>
              <button className="scene-btn">NEXT</button>
            </div>
            <div className="cctv-controls">
              <button className="scene-btn">FOCUS</button>
              <button className="scene-btn">COVERAGE OFF</button>
              <button className="scene-btn">AUTO HOP OFF</button>
            </div>
            <div className="cctv-controls">
              <button className="scene-btn">PROJECTION ON</button>
            </div>
            <div className="cctv-calibration-block">
              <div className="cctv-summary-label">CALIBRATION</div>
              <div className="cctv-cal-readout">
                <span>HDG --</span>
                <span>PITCH --</span>
                <span>FOV --</span>
                <span>RANGE --</span>
              </div>
            </div>
            <div className="cctv-summary-label">SCENE SUMMARY</div>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: 1, padding: '4px 0' }}>
              Enable CCTV to start camera-linked intelligence summaries.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
