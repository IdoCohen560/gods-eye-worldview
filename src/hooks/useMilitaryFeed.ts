/**
 * useMilitaryFeed — hook for fetching and rendering military installation data.
 */
import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { fetchMilitaryInstallations, createMilitaryEntities } from '../feeds/MilitaryFeed';

interface Props {
  viewer: Cesium.Viewer | null;
  enabled: boolean;
}

export function useMilitaryFeed({ viewer, enabled }: Props) {
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

      const installations = await fetchMilitaryInstallations();
      if (cancelled || !viewer) return;
      entitiesRef.current = createMilitaryEntities(viewer, installations);
    }

    update();

    return () => {
      cancelled = true;
      if (viewer) {
        entitiesRef.current.forEach(e => viewer.entities.remove(e));
        entitiesRef.current = [];
      }
    };
  }, [viewer, enabled]);
}
