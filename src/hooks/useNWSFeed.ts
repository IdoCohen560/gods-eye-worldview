import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { fetchNWSAlerts } from '../feeds/NWSFeed';
import { reportFeedStatus, reportToast } from './useFeedStatus';

interface UseNWSFeedOptions {
  viewer: Cesium.Viewer | null;
  active: boolean;
  onCountUpdate: (count: number) => void;
}

function severityColor(sev: string): Cesium.Color {
  switch (sev) {
    case 'Extreme': return Cesium.Color.MAGENTA;
    case 'Severe': return Cesium.Color.RED;
    case 'Moderate': return Cesium.Color.ORANGE;
    default: return Cesium.Color.YELLOW;
  }
}

export function useNWSFeed({ viewer, active, onCountUpdate }: UseNWSFeedOptions) {
  const eventRef = useRef<Map<string, Cesium.Entity>>(new Map());

  useEffect(() => {
    if (!viewer || !active) {
      eventRef.current.forEach(e => viewer?.entities.remove(e));
      eventRef.current.clear();
      if (!active) onCountUpdate(0);
      return;
    }

    let cancelled = false;
    const v = viewer;

    const load = async () => {
      try {
        const alerts = await fetchNWSAlerts();
        if (cancelled) return;

        eventRef.current.forEach(e => v.entities.remove(e));
        eventRef.current.clear();

        for (const a of alerts) {
          const color = severityColor(a.severity);
          const ent = v.entities.add({
            position: Cesium.Cartesian3.fromDegrees(a.longitude, a.latitude, 0),
            point: { pixelSize: 9, color, outlineColor: Cesium.Color.BLACK, outlineWidth: 1 },
            label: {
              text: `${a.event} — ${a.area}`,
              font: '10px Share Tech Mono',
              fillColor: color,
              pixelOffset: new Cesium.Cartesian2(12, 0),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3_000_000),
              style: Cesium.LabelStyle.FILL,
            },
            properties: { feedType: 'nws', data: a },
          });
          eventRef.current.set(a.id, ent);
        }
        onCountUpdate(alerts.length);
        reportFeedStatus('nws', 'online');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('NWS error:', err);
        reportFeedStatus('nws', 'offline');
        reportToast('NWS feed unavailable', 'warning', 'nws');
      }
    };

    load();
    const interval = setInterval(load, 300_000); // 5 min
    return () => {
      cancelled = true;
      clearInterval(interval);
      eventRef.current.forEach(e => v.entities.remove(e));
      eventRef.current.clear();
    };
  }, [viewer, active]);

  return { nwsEntities: eventRef };
}
