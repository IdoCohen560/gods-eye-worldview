/**
 * WorldOverlay — canvas-based world-space label system.
 * Adapted from reference repo's worldOverlay.js (simplified).
 * 
 * Renders labels in screen space projected from world coordinates,
 * with collision detection and distance-based decluttering.
 */
import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';

interface OverlayEntry {
  id: string;
  worldPosition: Cesium.Cartesian3;
  text: string;
  subtext?: string;
  color: string;
  size?: number;
}

interface Props {
  viewer: Cesium.Viewer | null;
  entries: OverlayEntry[];
}

export default function WorldOverlay({ viewer, entries }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !viewer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const scene = viewer.scene;
    const camera = viewer.camera;

    const placed: { x: number; y: number; w: number }[] = [];

    for (const entry of entries) {
      // Project to screen
      const windowPos = Cesium.SceneTransforms.worldToWindowCoordinates(
        scene,
        entry.worldPosition
      );
      if (!windowPos) continue;

      const fontSize = entry.size || 10;
      ctx.font = `${fontSize}px monospace`;
      const metrics = ctx.measureText(entry.text);
      const textW = metrics.width;
      const textH = fontSize + 4;

      // Collision check (simple AABB)
      const rect = { x: windowPos.x, y: windowPos.y - textH, w: textW, h: textH };
      let collision = false;
      for (const p of placed) {
        if (Math.abs(rect.x - p.x) < rect.w + 12 && Math.abs(rect.y - (p.y)) < rect.h + 6) {
          collision = true;
          break;
        }
      }
      if (collision) continue;

      placed.push({ x: rect.x, y: rect.y, w: rect.w });

      // Draw label background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(rect.x - 3, rect.y - 2, rect.w + 6, rect.h + 4);

      // Draw text
      ctx.fillStyle = entry.color;
      ctx.fillText(entry.text, rect.x, rect.y + fontSize);

      // Draw subtext
      if (entry.subtext) {
        ctx.font = '8px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(entry.subtext, rect.x, rect.y + fontSize + 10);
      }
    }
  }, [viewer, entries]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  if (!entries.length) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  );
}
