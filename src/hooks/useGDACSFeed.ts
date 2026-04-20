import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { fetchGDACSEvents, type GDACSAlertLevel } from '../feeds/GDACSFeed';
import { reportFeedStatus, reportToast } from './useFeedStatus';

interface UseGDACSFeedOptions {
  viewer: Cesium.Viewer | null;
  active: boolean;
  onCountUpdate: (count: number) => void;
}

const ALERT_COLOR: Record<GDACSAlertLevel, Cesium.Color> = {
  Green: Cesium.Color.LIMEGREEN,
  Orange: Cesium.Color.ORANGE,
  Red: Cesium.Color.RED,
};

export function useGDACSFeed({ viewer, active, onCountUpdate }: UseGDACSFeedOptions) {
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
        const events = await fetchGDACSEvents();
        if (cancelled) return;

        eventRef.current.forEach(e => v.entities.remove(e));
        eventRef.current.clear();

        for (const ev of events) {
          const color = ALERT_COLOR[ev.alertLevel] ?? Cesium.Color.WHITE;
          const ent = v.entities.add({
            position: Cesium.Cartesian3.fromDegrees(ev.longitude, ev.latitude, 0),
            point: { pixelSize: 10, color, outlineColor: Cesium.Color.BLACK, outlineWidth: 1 },
            label: {
              text: `${ev.eventType} ${ev.alertLevel.toUpperCase()}: ${ev.name}`,
              font: '10px Share Tech Mono',
              fillColor: color,
              pixelOffset: new Cesium.Cartesian2(12, 0),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5_000_000),
              style: Cesium.LabelStyle.FILL,
            },
            properties: { feedType: 'gdacs', data: ev },
          });
          eventRef.current.set(ev.id, ent);
        }
        onCountUpdate(events.length);
        reportFeedStatus('gdacs', 'online');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('GDACS error:', err);
        reportFeedStatus('gdacs', 'offline');
        reportToast('GDACS feed unavailable', 'warning', 'gdacs');
      }
    };

    load();
    const interval = setInterval(load, 600_000); // 10 min
    return () => {
      cancelled = true;
      clearInterval(interval);
      eventRef.current.forEach(e => v.entities.remove(e));
      eventRef.current.clear();
    };
  }, [viewer, active]);

  return { gdacsEntities: eventRef };
}
