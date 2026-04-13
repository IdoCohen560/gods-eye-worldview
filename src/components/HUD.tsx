import type { ShaderMode, ViewState } from '../App';

interface Props {
  viewState: ViewState;
  feedCounts: { aircraft: number; satellites: number; cameras: number };
  shaderMode: ShaderMode;
}

export default function HUD({ viewState, feedCounts, shaderMode }: Props) {
  const formatCoord = (val: number, pos: string, neg: string) => {
    const dir = val >= 0 ? pos : neg;
    return `${Math.abs(val).toFixed(4)}° ${dir}`;
  };

  const formatAlt = (alt: number) => {
    if (alt > 1_000_000) return `${(alt / 1_000_000).toFixed(1)} Mm`;
    if (alt > 1_000) return `${(alt / 1_000).toFixed(1)} km`;
    return `${alt.toFixed(0)} m`;
  };

  const now = new Date();
  const utc = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <div className="hud">
      <div className="hud-crosshair" />

      <div className="hud-compass">
        HDG {viewState.heading.toFixed(1)}°
      </div>

      <div className="hud-bottom-left">
        <div>{formatCoord(viewState.lat, 'N', 'S')}</div>
        <div>{formatCoord(viewState.lon, 'E', 'W')}</div>
        <div>ALT {formatAlt(viewState.alt)}</div>
      </div>

      <div className="hud-bottom-right">
        <div>{utc}</div>
        <div style={{ marginTop: 4, textTransform: 'uppercase' }}>
          MODE: {shaderMode}
        </div>
      </div>

      <div className="hud-top-right">
        <div>AIRCRAFT: {feedCounts.aircraft.toLocaleString()}</div>
        <div>SAT: {feedCounts.satellites.toLocaleString()}</div>
        <div>CAM: {feedCounts.cameras.toLocaleString()}</div>
      </div>
    </div>
  );
}
