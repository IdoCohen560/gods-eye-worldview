import { useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import { NOMINATIM_URL } from '../config/constants';
import type { Viewer } from 'cesium';

interface Props {
  viewer: Viewer | null;
}

export default function CommandBar({ viewer }: Props) {
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

  return (
    <div className="command-bar">
      <span className="logo">GOD'S EYE</span>
      <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 400 }}>
        <input
          className="search-input"
          type="text"
          placeholder="SEARCH LOCATION..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ width: '100%' }}
        />
      </form>
    </div>
  );
}
