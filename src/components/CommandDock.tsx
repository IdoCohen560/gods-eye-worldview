import { useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import { NOMINATIM_URL } from '../config/constants';
import { MAP_STACKS, type MapStack } from '../layers/MapStackController';
import type { ShaderMode } from '../App';
import type { Viewer } from 'cesium';

const HOME_POSITION = Cesium.Cartesian3.fromDegrees(-40, 20, 20_000_000);
const HOME_ORIENTATION = { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 };

const SHADER_MODES: { key: ShaderMode; label: string; icon: string; shortcut: string }[] = [
  { key: 'normal', label: 'NORMAL', icon: '🌍', shortcut: '1' },
  { key: 'crt', label: 'CRT', icon: '📺', shortcut: '2' },
  { key: 'nvg', label: 'NVG', icon: '🎯', shortcut: '3' },
  { key: 'flir', label: 'FLIR', icon: '🔥', shortcut: '4' },
  { key: 'cel', label: 'ANIME', icon: '🎨', shortcut: '5' },
  { key: 'noir', label: 'NOIR', icon: '🎬', shortcut: '6' },
  { key: 'snow', label: 'SNOW', icon: '❄️', shortcut: '7' },
];

interface Props {
  viewer: Viewer | null;
  shaderMode: ShaderMode;
  onShaderChange: (mode: ShaderMode) => void;
  mapStack: string;
  onMapStackChange: (stack: string) => void;
}

export default function CommandDock({ viewer, shaderMode, onShaderChange, mapStack, onMapStackChange }: Props) {
  const [query, setQuery] = useState('');

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewer || !query.trim()) return;
    try {
      const res = await fetch(
        `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'GodsEye/1.0' } }
      );
      const results = await res.json();
      if (results.length > 0) {
        const { lat, lon } = results[0];
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(parseFloat(lon), parseFloat(lat), 5000),
          duration: 2,
        });
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, [viewer, query]);

  const handleCenter = useCallback(() => {
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: HOME_POSITION,
      orientation: HOME_ORIENTATION,
      duration: 2,
    });
  }, [viewer]);

  return (
    <div id="command-dock">
      {/* Location Bar */}
      <div id="location-bar">
        <div className="location-inner">
          <div className="location-toolbar">
            <span className="location-toolbar-label">TYPE TO SEARCH A LOCATION</span>
          </div>
          <div className="location-search-wrap">
            <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="CITY, AIRPORT, OR COORDINATES"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button type="submit" style={{
                padding: '5px 10px',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 4,
                color: '#000',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                cursor: 'pointer',
                letterSpacing: 1,
              }}>GO</button>
            </form>
            <button onClick={handleCenter} style={{
              padding: '5px 10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 4,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              cursor: 'pointer',
              letterSpacing: 1,
            }}>HOME</button>
          </div>
        </div>
      </div>

      {/* Visual Presets + Map Sources */}
      <div id="control-panel">
        <div className="panel-glow" />
        <div className="panel-inner">
          <div className="panel-header">
            <span className="panel-title">VISUAL PRESETS</span>
            <span className="panel-divider" />
          </div>
          <div className="button-grid">
            {SHADER_MODES.map(m => (
              <button
                key={m.key}
                className={`style-btn ${shaderMode === m.key ? 'active' : ''}`}
                onClick={() => onShaderChange(m.key)}
                title={`[${m.shortcut}]`}
              >
                <span className="btn-icon">{m.icon}</span>
                <span className="btn-label">{m.label}</span>
                <span className="btn-key">[{m.shortcut}]</span>
              </button>
            ))}
          </div>

          <div className="map-source-section">
            <div className="map-source-heading">
              <span>MAP SOURCE</span>
            </div>
            <div className="map-stack-chip-row">
              {MAP_STACKS.map((stack: MapStack) => (
                <button
                  key={stack.id}
                  className={`map-stack-chip ${mapStack === stack.id ? 'active' : ''}`}
                  onClick={() => onMapStackChange(stack.id)}
                >
                  {stack.shortLabel}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
