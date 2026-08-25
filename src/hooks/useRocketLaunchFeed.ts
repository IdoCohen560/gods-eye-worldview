/**
 * useRocketLaunchFeed — hook for fetching and rendering rocket launch data.
 */
import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { fetchRocketLaunches, createRocketLaunchEntities, getRocketLaunchPollInterval } from '../feeds/RocketLaunchFeed';
import type { RocketLaunch } from '../feeds/RocketLaunchFeed';

interface Props {
  viewer: Cesium.Viewer | null;
  enabled: boolean;
}

export function useRocketLaunchFeed({ viewer, enabled }: Props) {
  const entitiesRef = useRef<Cesium.Entity[]>([]);

  useEffect(() => {
    if (!viewer || !enabled) {
      // Clean up
      if (viewer) {
        entitiesRef.current.forEach(e => viewer.entities.remove(e));
        entitiesRef.current = [];
      }
      return;
    }

    let cancelled = false;

    async function update() {
      if (cancelled || !viewer) return;
      // Remove old
      entitiesRef.current.forEach(e => viewer.entities.remove(e));
      entitiesRef.current = [];

      const launches = await fetchRocketLaunches();
      if (cancelled || !viewer) return;
      entitiesRef.current = createRocketLaunchEntities(viewer, launches);
    }

    update();
    const interval = setInterval(update, getRocketLaunchPollInterval());

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
