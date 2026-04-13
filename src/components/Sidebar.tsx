interface Props {
  activeLayers: Record<string, boolean>;
  toggleLayer: (layer: string) => void;
}

const LAYER_GROUPS = [
  {
    title: 'LIVE FEEDS',
    layers: [
      { key: 'aircraft', label: 'Aircraft (OpenSky)' },
      { key: 'satellites', label: 'Satellites (CelesTrak)' },
      { key: 'cctv', label: 'CCTV Cameras' },
      { key: 'traffic', label: 'Traffic Flow' },
    ],
  },
  {
    title: 'IMAGERY',
    layers: [
      { key: 'gibs', label: 'NASA MODIS True Color' },
    ],
  },
];

export default function Sidebar({ activeLayers, toggleLayer }: Props) {
  return (
    <div className="sidebar">
      {LAYER_GROUPS.map(group => (
        <div key={group.title}>
          <h3>{group.title}</h3>
          {group.layers.map(layer => (
            <label key={layer.key}>
              <input
                type="checkbox"
                checked={activeLayers[layer.key] ?? false}
                onChange={() => toggleLayer(layer.key)}
              />
              {layer.label}
            </label>
          ))}
        </div>
      ))}

      <h3>VIEW MODE</h3>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', padding: '0 8px' }}>
        Use Cesium scene mode picker (top-right of globe) for 2D / 3D / Columbus views
      </div>

      <h3>SHORTCUTS</h3>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', padding: '0 8px', lineHeight: 1.8 }}>
        [1-6] Shader modes<br />
        Click entity → info panel<br />
        Scroll → zoom
      </div>
    </div>
  );
}
