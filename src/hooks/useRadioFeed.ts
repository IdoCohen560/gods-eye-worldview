/**
 * useRadioFeed — hook for fetching and rendering radio station data.
 */
import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { fetchRadioStations, createRadioEntities } from '../feeds/RadioFeed';

interface Props {
  viewer: Cesium.Viewer | null;
  enabled: boolean;
}

export function useRadioFeed({ viewer, enabled }: Props) {
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

      const stations = await fetchRadioStations();
      if (cancelled || !viewer) return;
      entitiesRef.current = createRadioEntities(viewer, stations);
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
