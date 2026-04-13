import { useEffect, useState } from 'react';
import type { ShaderMode, ViewState, FeedCounts } from '../App';

interface Props {
  viewState: ViewState;
  feedCounts: FeedCounts;
  shaderMode: ShaderMode;
}

export default function HUD({ viewState, feedCounts, shaderMode }: Props) {
  const [time, setTime] = useState(new Date());
  const [recBlink, setRecBlink] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
      setRecBlink(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="hud">
      {/* Scanning line */}
      <div className="hud-scanline" />

      {/* Crosshair */}
      <div className="hud-crosshair" />

      {/* REC indicator */}
      <div className="hud-rec" style={{ opacity: recBlink ? 1 : 0.3 }}>
        <span className="rec-dot" /> REC
      </div>

      {/* Compass */}
      <div className="hud-compass">
        ▲ HDG {viewState.heading.toFixed(1)}°
      </div>

      {/* Coordinates */}
      <div className="hud-bottom-left">
        <div>{formatCoord(viewState.lat, 'N', 'S')}</div>
        <div>{formatCoord(viewState.lon, 'E', 'W')}</div>
        <div>ALT {formatAlt(viewState.alt)}</div>
        <div style={{ marginTop: 4, color: 'var(--text-dim)', fontSize: 10 }}>
          MODE: {shaderMode.toUpperCase()}
        </div>
      </div>

      {/* Time */}
      <div className="hud-bottom-right">
        <div>{utc}</div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          {time.toLocaleTimeString()} LOCAL
        </div>
      </div>

      {/* Feed counts */}
      <div className="hud-top-right">
        <div>AIR: {feedCounts.aircraft.toLocaleString()}</div>
        <div>SAT: {feedCounts.satellites.toLocaleString()}</div>
        <div>SHIP: {feedCounts.ships.toLocaleString()}</div>
        <div>CAM: {feedCounts.cameras.toLocaleString()}</div>
        <div style={{ color: feedCounts.conflicts > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
          CONFLICT: {feedCounts.conflicts.toLocaleString()}
        </div>
        <div style={{ color: feedCounts.earthquakes > 0 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
          QUAKE: {feedCounts.earthquakes.toLocaleString()}
        </div>
        <div style={{ color: feedCounts.fires > 0 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
          FIRE: {feedCounts.fires.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
