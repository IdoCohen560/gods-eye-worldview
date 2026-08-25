/**
 * useFIRMSFeed — hook for fetching and rendering NASA FIRMS fire data.
 */
import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { fetchFIRMSFires, createFIRNSEntities, getFIRMSFPollInterval } from '../feeds/FIRMSFeed';

interface Props {
  viewer: Cesium.Viewer | null;
  enabled: boolean;
}

export function useFIRMSFeed({ viewer, enabled }: Props) {
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

      const fires = await fetchFIRMSFires();
      if (cancelled || !viewer) return;
      entitiesRef.current = createFIRNSEntities(viewer, fires);
    }

    update();
    const interval = setInterval(update, getFIRMSFPollInterval());

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
