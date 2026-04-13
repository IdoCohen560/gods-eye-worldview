interface Props {
  activeLayers: Record<string, boolean>;
  toggleLayer: (layer: string) => void;
}

const FEED_LAYERS = [
  { key: 'aircraft', label: 'Aircraft (OpenSky)' },
  { key: 'satellites', label: 'Satellites (CelesTrak)' },
  { key: 'cctv', label: 'CCTV Cameras' },
  { key: 'traffic', label: 'Traffic Flow (OSM)' },
];

const GIBS_IMAGERY = [
  { key: 'gibs', label: 'MODIS True Color' },
  { key: 'gibs_viirs_nightlights', label: 'VIIRS Night Lights' },
  { key: 'gibs_firms_fire', label: 'Fire / Thermal' },
  { key: 'gibs_aerosol', label: 'Aerosol Optical Depth' },
  { key: 'gibs_sst', label: 'Sea Surface Temp' },
];

export default function Sidebar({ activeLayers, toggleLayer }: Props) {
  return (
    <div className="sidebar">
      <h3>LIVE FEEDS</h3>
      {FEED_LAYERS.map(layer => (
        <label key={layer.key}>
          <input
            type="checkbox"
            checked={activeLayers[layer.key] ?? false}
            onChange={() => toggleLayer(layer.key)}
          />
          {layer.label}
        </label>
      ))}

      <h3>NASA IMAGERY</h3>
      {GIBS_IMAGERY.map(layer => (
        <label key={layer.key}>
          <input
            type="checkbox"
            checked={activeLayers[layer.key] ?? false}
            onChange={() => toggleLayer(layer.key)}
          />
          {layer.label}
        </label>
      ))}

      <h3>SHORTCUTS</h3>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', padding: '0 8px', lineHeight: 1.8 }}>
        [1] Normal [2] NVG [3] FLIR<br />
        [4] CRT [5] Cel [6] Classified<br />
        Click entity for details<br />
        Scroll to zoom
      </div>

      <h3>PRESETS</h3>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', padding: '0 8px', lineHeight: 1.8 }}>
        Search bar: type any location<br />
        Try: "Pentagon", "Times Square"
      </div>
    </div>
  );
}
