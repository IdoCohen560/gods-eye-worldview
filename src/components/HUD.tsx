import { useEffect, useState } from 'react';
import type { ShaderMode, ViewState, FeedCounts } from '../App';

interface Props {
  viewState: ViewState;
  feedCounts: FeedCounts;
  shaderMode: ShaderMode;
  visible: boolean;
}

export default function HUD({ viewState, feedCounts, shaderMode, visible }: Props) {
  const [time, setTime] = useState(new Date());
  const [recBlink, setRecBlink] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
      setRecBlink(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  const formatCoord = (val: number, pos: string, neg: string) => {
    const dir = val >= 0 ? pos : neg;
    return `${Math.abs(val).toFixed(4)}° ${dir}`;
  };

  const formatAlt = (alt: number) => {
    if (alt > 1_000_000) return `${(alt / 1_000_000).toFixed(1)}Mm`;
    if (alt > 1_000) return `${(alt / 1_000).toFixed(1)}km`;
    return `${alt.toFixed(0)}m`;
  };

  const utc = time.toISOString().replace('T', ' ').slice(0, 23) + ' UTC';
  const totalEntities = feedCounts.aircraft + feedCounts.satellites + feedCounts.ships + feedCounts.cameras;

  return (
    <div id="intel-hud">
      {/* Scanning line */}
      <div className="hud-scanline" />

      {/* Top-left corner */}
      <div className="hud-corner hud-top-left">
        <span className="hud-bracket">[</span>
        <div className="hud-content">
          <div>GOD'S EYE {shaderMode.toUpperCase()}</div>
          <div style={{ fontSize: 10, marginTop: 2 }}>
            {formatCoord(viewState.lat, 'N', 'S')} — {formatCoord(viewState.lon, 'E', 'W')}
          </div>
          <div style={{ fontSize: 10 }}>ALT {formatAlt(viewState.alt)}</div>
        </div>
      </div>

      {/* Top-right corner */}
      <div className="hud-corner hud-top-right">
        <div className="hud-content" style={{ textAlign: 'right' }}>
          <div style={{ opacity: 0.5, fontSize: 9, letterSpacing: 1.5 }}>AIR {feedCounts.aircraft} | SAT {feedCounts.satellites} | SHIP {feedCounts.ships} | CAM {feedCounts.cameras}</div>
          <div style={{ marginTop: 2, fontSize: 10 }}>
            {feedCounts.conflicts > 0 && <span style={{ color: 'var(--accent-red)' }}>⚠ CONFLICT {feedCounts.conflicts} </span>}
            {feedCounts.earthquakes > 0 && <span style={{ color: 'var(--accent-amber)' }}>◆ QUAKE {feedCounts.earthquakes} </span>}
            {feedCounts.fires > 0 && <span style={{ color: 'var(--accent-amber)' }}>▲ FIRE {feedCounts.fires}</span>}
          </div>
        </div>
        <span className="hud-bracket">]</span>
      </div>

      {/* Bottom-left corner */}
      <div className="hud-corner hud-bottom-left">
        <span className="hud-bracket">[</span>
        <div className="hud-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="hud-rec-dot" style={{ opacity: recBlink ? 1 : 0.3 }}>●</span>
            <span className="hud-rec">REC</span>
          </div>
          <div style={{ fontSize: 10, marginTop: 2, opacity: 0.6 }}>
            HDG {viewState.heading.toFixed(1)}°
          </div>
        </div>
      </div>

      {/* Bottom-right corner */}
      <div className="hud-corner hud-bottom-right">
        <div className="hud-content" style={{ textAlign: 'right' }}>
          <div>{utc}</div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>{time.toLocaleTimeString()} LOCAL</div>
        </div>
        <span className="hud-bracket">]</span>
      </div>

      {/* Top bar */}
      <div className="hud-top-bar">
        <span style={{ letterSpacing: 2, fontSize: 9 }}>SYS: NOMINAL</span>
        <span style={{ letterSpacing: 2, fontSize: 9 }}>FEEDS: {totalEntities} ACTIVE</span>
        <span style={{ letterSpacing: 2, fontSize: 9 }}>MODE: {shaderMode.toUpperCase()}</span>
      </div>

      {/* Bottom bar */}
      <div className="hud-bottom-bar">
        <span style={{ letterSpacing: 3, fontSize: 10 }}>GOD'S EYE VIEW — GLOBAL INTELLIGENCE MONITORING SYSTEM</span>
      </div>

      {/* Left edge */}
      <div className="hud-edge hud-left-edge">
        <span>TRACKING</span>
        <span>ACTIVE</span>
      </div>

      {/* Right edge */}
      <div className="hud-edge hud-right-edge">
        <span>SECURE</span>
        <span>CHANNEL</span>
      </div>
    </div>
  );
}
