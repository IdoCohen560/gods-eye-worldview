import { useState, useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';

interface Props {
  visible: boolean;
  viewer: Cesium.Viewer | null;
  onExit: () => void;
}

export default function CockpitView({ visible, viewer, onExit }: Props) {
  const [heading, setHeading] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [time, setTime] = useState(new Date());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!visible || !viewer) return;
    const handler = () => {
      const c = viewer.camera.positionCartographic;
      setHeading(Cesium.Math.toDegrees(viewer.camera.heading));
      setAltitude(c.height);
      setSpeed(c.height / 100);
    };
    viewer.camera.changed.addEventListener(handler);
    handler();
    return () => { void viewer.camera.changed.removeEventListener(handler); };
  }, [visible, viewer]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [visible]);

  // ESC to exit
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') onExit();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onExit]);

  // Compass tape
  const compassMarks = Array.from({ length: 37 }, (_, i) => {
    const deg = (heading - 180 + i * 10 + 360) % 360;
    const isMajor = deg % 30 === 0;
    return { deg, isMajor };
  });

  // Pitch rail
  const pitchMarks = [-20, -10, 0, 10, 20];

  const formatCoord = (val: number, pos: string, neg: string) => {
    const dir = val >= 0 ? pos : neg;
    return `${Math.abs(val).toFixed(4)}°${dir}`;
  };

  const utc = time.toISOString().replace('T', ' ').slice(0, 23) + 'Z';

  if (!visible) return null;

  return (
    <section id="cockpit-hud">
      {/* Visor shell */}
      <div className="cockpit-visor-shell">
        {/* Roll arc */}
        <div className="cockpit-roll-arc">
          {[-30, -20, -10, 0, 10, 20, 30].map(deg => (
            <span key={deg} className={deg === 0 ? 'active' : ''} style={{ '--slot': deg / 10 } as React.CSSProperties}>
              {deg === 0 ? '0' : (deg > 0 ? '+' : '') + deg}
            </span>
          ))}
        </div>

        {/* Pitch rails */}
        <div className="cockpit-pitch-rail cockpit-pitch-rail-left">
          {pitchMarks.map(deg => (
            <span key={deg} className={deg === 0 ? 'active' : ''}>
              {deg === 0 ? '00' : (deg > 0 ? '+' : '') + deg}
            </span>
          ))}
        </div>
        <div className="cockpit-pitch-rail cockpit-pitch-rail-right">
          {pitchMarks.map(deg => (
            <span key={deg} className={deg === 0 ? 'active' : ''}>
              {deg === 0 ? '00' : (deg > 0 ? '+' : '') + deg}
            </span>
          ))}
        </div>

        {/* Horizon guide */}
        <div className="cockpit-horizon-guide">
          <span /><small>LEVEL</small><span />
        </div>

        {/* Visor status */}
        <div className="cockpit-visor-status cockpit-visor-status-left">OPTICAL PLANE · 01</div>
        <div className="cockpit-visor-status cockpit-visor-status-right">VISOR LOCK · ACTIVE</div>
      </div>

      {/* Top line */}
      <div className="cockpit-topline">
        <span className="cockpit-kicker">FIRST PERSON</span>
        <span id="cockpit-callsign">GE-001</span>
        <span id="cockpit-aircraft-meta">ALT {altitude.toFixed(0)}m · SPD {speed.toFixed(0)}kts</span>
      </div>

      {/* Compass tape */}
      <div className="cockpit-compass-tape">
        {compassMarks.map(({ deg, isMajor }, i) => (
          <div key={i} className={`compass-tick ${isMajor ? 'major' : ''}`} style={{ '--i': i } as React.CSSProperties}>
            <span>{deg}°</span>
          </div>
        ))}
      </div>

      {/* Reticle */}
      <div className="cockpit-reticle">
        <span className="material-symbols-outlined">my_location</span>
      </div>

      {/* Instruments */}
      <div className="cockpit-instruments">
        <div className="cockpit-speed-rim">
          <div className="cockpit-instrument-label">KTS</div>
          <div className="cockpit-instrument-value">{speed.toFixed(0)}</div>
        </div>
        <div className="cockpit-heading-rim">
          <div className="cockpit-instrument-label">HDG</div>
          <div className="cockpit-instrument-value">{heading.toFixed(0)}°</div>
        </div>
        <div className="cockpit-altitude-rim">
          <div className="cockpit-instrument-label">ALT</div>
          <div className="cockpit-instrument-value">{altitude.toFixed(0)}m</div>
        </div>
      </div>

      {/* Position */}
      <div className="cockpit-position">
        <div>{utc}</div>
      </div>

      {/* Exit hint */}
      <div className="cockpit-exit-hint">ESC EXIT · C TOGGLE</div>
    </section>
  );
}
