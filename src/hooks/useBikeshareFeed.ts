/**
 * useBikeshareFeed — hook for fetching and rendering bikeshare station data.
 */
import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { fetchBikeshareStations, createBikeshareEntities } from '../feeds/BikeshareFeed';

interface Props {
  viewer: Cesium.Viewer | null;
  enabled: boolean;
}

export function useBikeshareFeed({ viewer, enabled }: Props) {
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

      const stations = await fetchBikeshareStations();
      if (cancelled || !viewer) return;
      entitiesRef.current = createBikeshareEntities(viewer, stations);
    }

    update();
    const interval = setInterval(update, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (viewer) {
        entitiesRef.current.forEach(e => viewer.entities.remove(e));
        entitiesRef.current = [];
      }
    };
  }, [viewer, enabled]);
}
