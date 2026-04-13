import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';

interface TrackedEntity {
  id: string;
  type: 'aircraft' | 'satellite' | 'camera' | 'ship' | 'conflict' | 'earthquake' | 'fire';
  label: string;
  position: Cesium.Cartesian3;
}

interface Props {
  viewer: Cesium.Viewer | null;
  entities: TrackedEntity[];
  enabled: boolean;
}

interface ScreenBox {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  visible: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  aircraft: '#00ff41',
  satellite: '#00ccff',
  camera: '#ff6b00',
  ship: '#4488ff',
  conflict: '#ff2d2d',
  earthquake: '#ffaa00',
  fire: '#ff4400',
};

const BOX_SIZES: Record<string, number> = {
  aircraft: 28,
  satellite: 20,
  camera: 22,
  ship: 26,
  conflict: 24,
  earthquake: 30,
  fire: 22,
};

export default function DetectionOverlay({ viewer, entities, enabled }: Props) {
  const [boxes, setBoxes] = useState<ScreenBox[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!viewer || !enabled || entities.length === 0) {
      setBoxes([]);
      return;
    }

    const update = () => {
      const newBoxes: ScreenBox[] = [];
      const canvas = viewer.scene.canvas;

      for (const entity of entities) {
        const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(
          viewer.scene, entity.position
        );
        if (!screenPos) continue;

        // Check if on screen
        if (screenPos.x < -50 || screenPos.x > canvas.width + 50 ||
            screenPos.y < -50 || screenPos.y > canvas.height + 50) continue;

        newBoxes.push({
          id: entity.id,
          type: entity.type,
          label: entity.label,
          x: screenPos.x,
          y: screenPos.y,
          visible: true,
        });
      }

      // Limit to 100 boxes for performance
      setBoxes(newBoxes.slice(0, 100));
      frameRef.current = requestAnimationFrame(update);
    };

    frameRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameRef.current);
  }, [viewer, entities, enabled]);

  if (!enabled || boxes.length === 0) return null;

  return (
    <div className="detection-overlay">
      {boxes.map(box => {
        const color = TYPE_COLORS[box.type] || '#00ff41';
        const size = BOX_SIZES[box.type] || 24;
        const half = size / 2;
        const cornerLen = 6;

        return (
          <div
            key={box.id}
            className="detection-box"
            style={{
              left: box.x - half,
              top: box.y - half,
              width: size,
              height: size,
              '--box-color': color,
            } as React.CSSProperties}
          >
            {/* Corner brackets */}
            <span className="corner tl" style={{ borderColor: color }} />
            <span className="corner tr" style={{ borderColor: color }} />
            <span className="corner bl" style={{ borderColor: color }} />
            <span className="corner br" style={{ borderColor: color }} />
            {/* Label */}
            <span className="box-label" style={{ color }}>
              {box.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
