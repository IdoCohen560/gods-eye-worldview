import { useState } from 'react';
import type { Viewer } from 'cesium';

interface Props {
  viewer: Viewer | null;
}

export default function RightContextRail({ viewer }: Props) {
  const [activeTab, setActiveTab] = useState<'contacts' | 'missions'>('contacts');
  const [expanded, setExpanded] = useState(false);

  return (
    <aside id="right-context-rail">
      <div id="global-context-panel" className={`panel-collapsible ${expanded ? '' : 'collapsed'}`}>
        <div className="panel-glow" />
        <div className="global-context-panel-inner">
          <div className="panel-header">
            <span className="panel-title">CONTEXT</span>
            <span className="panel-divider" />
            <button className="panel-collapse-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? '−' : '▶'}
            </button>
          </div>

          {/* Context mode tabs */}
          <div className="global-context-modes" role="tablist">
            <button
              className={`context-mode-button ${activeTab === 'contacts' ? 'active' : ''}`}
              onClick={() => { setActiveTab('contacts'); setExpanded(true); }}
              role="tab"
            >
              <span className="material-symbols-outlined">radar</span>
              <span>CONTACTS</span>
            </button>
            <button
              className={`context-mode-button ${activeTab === 'missions' ? 'active' : ''}`}
              onClick={() => { setActiveTab('missions'); setExpanded(true); }}
              role="tab"
            >
              <span className="material-symbols-outlined">rocket_launch</span>
              <span>SPACE MISSIONS</span>
            </button>
          </div>

          {!expanded && (
            <div className="context-mode-standby">
              <strong>SELECT CONTEXT</strong>
              <span>CONTACTS — nearest planes · vessels · sites<br />SPACE MISSIONS — launches &amp; orbital assets</span>
            </div>
          )}

          {expanded && activeTab === 'contacts' && (
            <section className="context-mode-view">
              <div className="global-context-actions">
                <button className="panel-layer-toggle">SEARCH NEARBY SITES</button>
              </div>
              <div className="military-awareness-panel">
                <div className="military-awareness-standby">
                  <strong>CONTACTS CONTEXT OFF</strong>
                  <span>SELECT CONTACTS TO LOAD OBSERVED / MAPPED PROXIMITY</span>
                </div>
              </div>
            </section>
          )}

          {expanded && activeTab === 'missions' && (
            <section className="context-mode-view">
              <div className="space-mission-roster">
                <div className="space-mission-roster-header">
                  <div>
                    <strong>AVAILABLE MISSIONS</strong>
                    <span>SELECT A MISSION TO INSPECT</span>
                  </div>
                  <output>—</output>
                </div>
                <div className="space-mission-roster-list">
                  <div className="space-mission-roster-empty">LOADING 30-DAY MISSION INDEX</div>
                </div>
              </div>
            </section>
          )}

          {/* Radio Panel */}
          <section className="radio-panel">
            <div className="radio-panel-inner">
              <div className="panel-header">
                <span className="panel-title">RADIO</span>
                <span className="radio-layer-state">OFF</span>
                <span className="panel-divider" />
              </div>
              <div className="radio-station-card">
                <strong>NO STATION SELECTED</strong>
                <span>Enable Radio, then choose a globe marker or use next.</span>
              </div>
              <div className="radio-transport">
                <button disabled>PREV</button>
                <button disabled>PLAY</button>
                <button disabled>NEXT</button>
                <button disabled>STOP</button>
              </div>
              <div className="radio-volume-row">
                <span>VOLUME</span>
                <input type="range" min="0" max="100" defaultValue={80} />
                <output>80%</output>
              </div>
              <div className="radio-playback-state">Radio off</div>
              <p className="radio-privacy">Audio connects directly to the broadcaster after you press play. Your IP is visible to that broadcaster.</p>
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
