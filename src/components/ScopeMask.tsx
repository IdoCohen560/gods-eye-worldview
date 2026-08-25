/**
 * ScopeMask — circular viewport mask rendered on a 2D canvas overlay.
 * Adapted from reference repo's scopeMask.js.
 * 
 * Draws a radial gradient: transparent inside the keyhole circle,
 * feathering to near-opaque black outside. Redrawn on resize/tuning only.
 */
import { useEffect, useRef, useCallback, useState } from 'react';

const SCOPE_OUTSIDE_COLOR = { r: 5, g: 5, b: 8 };
const KEYHOLE_OUTER_RADIUS = 1.05;
const SCOPE_FEATHER_DEFAULT = 0.11;

interface Props {
  enabled?: boolean;
  feather?: number; // 0-1
  altitude?: number; // meters
}

export default function ScopeMask({ enabled = true, feather = SCOPE_FEATHER_DEFAULT, altitude = 10_000_000 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    if (!enabled) {
      ctx.clearRect(0, 0, w, h);
      return;
    }

    const centerX = w * 0.5;
    const centerY = h * 0.5;
    const radius = h * 0.5 * KEYHOLE_OUTER_RADIUS;

    // Altitude-adaptive terminus alpha
    const farAlt = 10_000_000;
    const nearAlt = 7_000_000;
    let terminusAlpha = 0.94;
    if (altitude < farAlt) {
      const t = Math.max(0, Math.min(1, (altitude - nearAlt) / (farAlt - nearAlt)));
      terminusAlpha = 0.94 + (1.0 - 0.94) * (1 - t);
    }

    // Feather radius
    const featherPx = radius * feather;
    const innerRadius = Math.max(0, radius - featherPx);

    // Clear and fill outside
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = `rgba(${SCOPE_OUTSIDE_COLOR.r}, ${SCOPE_OUTSIDE_COLOR.g}, ${SCOPE_OUTSIDE_COLOR.b}, ${terminusAlpha})`;
    ctx.fillRect(0, 0, w, h);

    // Cut out the keyhole with feather
    ctx.globalCompositeOperation = 'destination-out';
    const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
  }, [enabled, feather, altitude]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  );
}
