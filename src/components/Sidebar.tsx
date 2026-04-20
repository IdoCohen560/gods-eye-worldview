import { useMemo, useState } from 'react';
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
      { key: 'conflicts', label: 'Conflicts & Battles (ACLED)' },
      { key: 'earthquakes', label: 'Earthquakes (USGS)', live: true },
      { key: 'fires', label: 'Fire/Thermal (FIRMS)' },
      { key: 'eonet', label: 'EONET Natural Events (NASA)', live: true },
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

export default function Sidebar({ activeLayers, toggleLayer }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const groups = useMemo<LayerGroup[]>(() => [...STATIC_GROUPS, ...buildGibsGroups()], []);

  const toggle = (title: string) => {
    setCollapsed(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="sidebar">
      {groups.map(group => (
        <div key={group.title}>
          <h3 onClick={() => toggle(group.title)} style={{ cursor: 'pointer', userSelect: 'none' }}>
            <span style={{ fontSize: 8, marginRight: 6 }}>
              {collapsed[group.title] ? '▶' : '▼'}
            </span>
            {group.title}
          </h3>
          {!collapsed[group.title] && group.layers.map(layer => (
            <label key={layer.key}>
              <input
                type="checkbox"
                checked={activeLayers[layer.key] ?? false}
                onChange={() => toggleLayer(layer.key)}
              />
              {layer.label}
              {layer.live && (
                <span style={{
                  marginLeft: 'auto',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: activeLayers[layer.key] ? 'var(--accent-green)' : 'var(--text-dim)',
                  display: 'inline-block',
                  flexShrink: 0,
                }} />
              )}
            </label>
          ))}
        </div>
      ))}

      <h3>SHORTCUTS</h3>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', padding: '0 8px', lineHeight: 1.8 }}>
        [1-8] Shader modes<br />
        [W/A/S/D] Move around<br />
        [+] Zoom in  [-] Zoom out<br />
        Click entity for details<br />
        Click camera for live feed
      </div>

      <FeedStatusBar />
    </div>
  );
}
