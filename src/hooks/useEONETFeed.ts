import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { fetchEONETEvents, type EONETCategory, type EONETEvent } from '../feeds/EONETFeed';
import { reportFeedStatus, reportToast } from './useFeedStatus';

interface UseEONETFeedOptions {
  viewer: Cesium.Viewer | null;
  active: boolean;
  onCountUpdate: (count: number) => void;
}

const CATEGORY_COLOR: Record<EONETCategory, Cesium.Color> = {
  wildfires: Cesium.Color.ORANGERED,
  severeStorms: Cesium.Color.MEDIUMPURPLE,
  volcanoes: Cesium.Color.RED,
  seaLakeIce: Cesium.Color.LIGHTCYAN,
  icebergs: Cesium.Color.AQUA,
  drought: Cesium.Color.GOLD,
  dustHaze: Cesium.Color.SANDYBROWN,
  waterColor: Cesium.Color.MEDIUMSEAGREEN,
  earthquakes: Cesium.Color.YELLOW,
  floods: Cesium.Color.DODGERBLUE,
  landslides: Cesium.Color.SADDLEBROWN,
  tempExtremes: Cesium.Color.HOTPINK,
  manmade: Cesium.Color.SILVER,
  snow: Cesium.Color.WHITE,
};

export function useEONETFeed({ viewer, active, onCountUpdate }: UseEONETFeedOptions) {
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
        const events = await fetchEONETEvents();
        if (cancelled) return;

        // Wipe & redraw — events come and go each refresh.
        eventRef.current.forEach(e => v.entities.remove(e));
        eventRef.current.clear();

        for (const ev of events) {
          const color = CATEGORY_COLOR[ev.category] ?? Cesium.Color.WHITE;
          const entity = v.entities.add({
            position: Cesium.Cartesian3.fromDegrees(ev.longitude, ev.latitude, 0),
            point: {
              pixelSize: 9,
              color,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 1,
            },
            label: {
              text: ev.title,
              font: '10px Share Tech Mono',
              fillColor: color,
              pixelOffset: new Cesium.Cartesian2(12, 0),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5_000_000),
              style: Cesium.LabelStyle.FILL,
            },
            properties: { feedType: 'eonet', data: ev as EONETEvent },
          });
          eventRef.current.set(ev.id, entity);
        }
        onCountUpdate(events.length);
        reportFeedStatus('eonet', 'online');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('EONET error:', err);
        reportFeedStatus('eonet', 'offline');
        reportToast('EONET feed unavailable', 'warning', 'eonet');
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

  return { eonetEntities: eventRef };
}
