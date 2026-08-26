import { useState } from 'react';
import FeedStatusBar from './FeedStatusBar';
import { GIBS_LAYERS } from '../config/gibs-layers';

interface Props {
  activeLayers: Record<string, boolean>;
  toggleLayer: (layer: string) => void;
}

interface LayerGroup {
  title: string;
  layers: { key: string; label: string; live?: boolean }[];
}

const STATIC_GROUPS: LayerGroup[] = [
  {
    title: 'LIVE FEEDS',
    layers: [
      { key: 'aircraft', label: 'Aircraft (OpenSky)', live: true },
      { key: 'satellites', label: 'Satellites (CelesTrak)', live: true },
      { key: 'cctv', label: 'CCTV Cameras', live: true },
      { key: 'traffic', label: 'Traffic Flow (OSM)' },
      { key: 'ships', label: 'Ships (AISStream)', live: true },
    ],
  },
  {
    title: 'THREAT INTELLIGENCE',
    layers: [
      { key: 'conflicts', label: 'Conflicts (ACLED→GDELT)', live: true },
      { key: 'earthquakes', label: 'Earthquakes (USGS)', live: true },
      { key: 'fires', label: 'Fire/Thermal (FIRMS)', live: true },
      { key: 'eonet', label: 'EONET Natural Events (NASA)', live: true },
      { key: 'gdacs', label: 'GDACS Global Disasters', live: true },
      { key: 'nws', label: 'NWS Severe Weather (US)', live: true },
    ],
  },
  {
    title: 'AEROSPACE & DEFENSE',
    layers: [
      { key: 'rockets', label: 'Rocket Launches (LL2)', live: true },
      { key: 'military', label: 'Military Installations (OSM)' },
    ],
  },
  {
    title: 'INFRASTRUCTURE',
    layers: [
      { key: 'bikeshare', label: 'Bikeshare Stations (GBFS)', live: true },
      { key: 'radio', label: 'Internet Radio (RadioBrowser)' },
      { key: 'datacenters', label: 'Datacenters (Bundled)' },
      { key: 'dams', label: 'Dams (Bundled)' },
    ],
  },
  {
    title: 'DETECTION',
    layers: [
      { key: 'boundingBoxes', label: 'Bounding Boxes' },
    ],
  },
];

function buildGibsGroups(): LayerGroup[] {
  const byCategory = new Map<string, LayerGroup['layers']>();
  for (const cfg of GIBS_LAYERS) {
    const list = byCategory.get(cfg.category) ?? [];
    list.push({ key: `gibs_${cfg.id}`, label: cfg.name });
    byCategory.set(cfg.category, list);
  }
  return Array.from(byCategory.entries()).map(([cat, layers]) => ({
    title: `NASA GIBS — ${cat.toUpperCase()}`,
    layers,
  }));
}

export default function DataPanel({ activeLayers, toggleLayer }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const groups = [...STATIC_GROUPS, ...buildGibsGroups()];

  const toggle = (title: string) => {
    setCollapsed(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div id="left-panel-stack">
      <div id="data-panel">
        <div className="panel-glow" />
        <div className="data-panel-inner">
          <div className="panel-header">
            <span className="panel-title">DATA LAYERS</span>
            <span className="panel-divider" />
          </div>
          <div className="data-toggle-list">
            {groups.map(group => (
              <div key={group.title}>
                <button
                  className="panel-collapse-btn"
                  onClick={() => toggle(group.title)}
                  style={{ width: '100%', textAlign: 'left', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ fontSize: 8 }}>{collapsed[group.title] ? '▶' : '▼'}</span>
                  <span className="panel-title" style={{ fontSize: 9, letterSpacing: 2 }}>{group.title}</span>
                </button>
                {!collapsed[group.title] && group.layers.map(layer => (
                  <button
                    key={layer.key}
                    className={`data-toggle-btn ${activeLayers[layer.key] ? 'active' : ''}`}
                    onClick={() => toggleLayer(layer.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', marginBottom: 2, padding: '5px 10px' }}
                  >
                    <span className={`feed-dot ${activeLayers[layer.key] ? 'live' : 'off'}`} />
                    <span style={{ flex: 1, fontSize: 9, letterSpacing: 1 }}>{layer.label}</span>
                    {layer.live && (
                      <span style={{ fontSize: 7, color: 'var(--text-dim)', letterSpacing: 0.5 }}>LIVE</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <FeedStatusBar />

          <div style={{ marginTop: 8, padding: '6px 4px', fontSize: 8, color: 'var(--text-dim)', lineHeight: 1.8, fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
            [1-7] Shader modes<br />
            [W/A/S/D] Move around<br />
            [+] Zoom in  [-] Zoom out<br />
            Click entity for details<br />
            Click camera for live feed
          </div>
        </div>
      </div>
    </div>
  );
}
