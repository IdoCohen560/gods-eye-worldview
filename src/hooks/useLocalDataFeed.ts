/**
 * useLocalDataFeed — hook for loading and rendering bundled local data (datacenters, dams).
 */
import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { loadLocalData, createLocalDataEntities } from '../feeds/LocalDataFeed';

interface Props {
  viewer: Cesium.Viewer | null;
  enabled: boolean;
  type: 'datacenters' | 'dams';
}

export function useLocalDataFeed({ viewer, enabled, type }: Props) {
  const entitiesRef = useRef<Cesium.Entity[]>([]);

  useEffect(() => {
    if (!viewer || !enabled) {
      if (viewer) {
        entitiesRef.current.forEach(e => viewer.entities.remove(e));
        entitiesRef.current = [];
      }
      return;
    }

    let cancelled = false;

    async function update() {
      if (cancelled || !viewer) return;
      entitiesRef.current.forEach(e => viewer.entities.remove(e));
      entitiesRef.current = [];

      const records = await loadLocalData(type);
      if (cancelled || !viewer) return;
      entitiesRef.current = createLocalDataEntities(viewer, records, type);
    }

    update();

    return () => {
      cancelled = true;
      if (viewer) {
        entitiesRef.current.forEach(e => viewer.entities.remove(e));
        entitiesRef.current = [];
      }
    };
  }, [viewer, enabled, type]);
}
