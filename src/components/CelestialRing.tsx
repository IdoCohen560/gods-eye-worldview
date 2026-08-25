/**
 * CelestialRing — renders sun/moon direction indicators on a canvas overlay.
 * Adapted from reference repo's celestialRing.js (simplified).
 * 
 * Computes sun/moon positions using simple astronomical algorithms,
 * renders direction ring and markers on a 2D canvas.
 */
import { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';

const TAU = Math.PI * 2;
const KEYHOLE_OUTER_RADIUS = 1.05;
const RING_INSET_PX = 11;

interface Props {
  enabled?: boolean;
  viewer: Cesium.Viewer | null;
}

function computeSunPosition(date: Date): { azimuth: number; elevation: number } {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = -23.44 * Math.cos(TAU * (dayOfYear + 10) / 365) * Math.PI / 180;
  const hourAngle = ((date.getUTCHours() + date.getUTCMinutes() / 60) / 24 - 0.5) * TAU;
  const elevation = Math.asin(
    Math.sin(declination) * 0.397948 + // sin(lat) approx for mid-latitude
    Math.cos(declination) * Math.cos(hourAngle) * 0.917748 // cos(lat) * cos(hourAngle)
  );
  const azimuth = Math.atan2(-Math.sin(hourAngle), Math.tan(declination) * 0.397948 - Math.cos(hourAngle) * 0.917748);
  return { azimuth: (azimuth + TAU) % TAU, elevation };
}

function computeMoonPosition(date: Date): { azimuth: number; elevation: number } {
  // Simplified lunar position
  const daysSinceJ2000 = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;
  const meanAnomaly = (477973 * daysSinceJ2000 + 201) % 360 * Math.PI / 180;
  const meanLongitude = (481268 * daysSinceJ2000 + 270) % 360 * Math.PI / 180;
  const eclipticLon = meanLongitude + 6.29 * Math.sin(meanAnomaly);
  const obliquity = 23.44 * Math.PI / 180;
  const declination = Math.asin(Math.sin(eclipticLon) * Math.sin(obliquity));
  const hourAngle = ((date.getUTCHours() + date.getUTCMinutes() / 60) / 24 - 0.5) * TAU;
  const elevation = Math.asin(
    Math.sin(declination) * 0.397948 +
    Math.cos(declination) * Math.cos(hourAngle) * 0.917748
  );
  const azimuth = Math.atan2(-Math.sin(hourAngle), Math.tan(declination) * 0.397948 - Math.cos(hourAngle) * 0.917748);
  return { azimuth: (azimuth + TAU) % TAU, elevation };
}

export default function CelestialRing({ enabled = true, viewer }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

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
    if (!enabled) return;

    const centerX = w * 0.5;
    const centerY = h * 0.5;
    const ringRadius = h * 0.5 * KEYHOLE_OUTER_RADIUS - RING_INSET_PX;

    // Draw ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, TAU);
    ctx.stroke();

    const now = new Date();

    // Sun
    const sun = computeSunPosition(now);
    const sunAngle = sun.azimuth - Math.PI / 2; // Convert from north-up to canvas coords
    const sunX = centerX + Math.cos(sunAngle) * ringRadius;
    const sunY = centerY + Math.sin(sunAngle) * ringRadius;
    const sunVisible = sun.elevation > -0.1;

    if (sunVisible) {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 12, 0, TAU);
      ctx.fill();
    }

    // Moon
    const moon = computeMoonPosition(now);
    const moonAngle = moon.azimuth - Math.PI / 2;
    const moonX = centerX + Math.cos(moonAngle) * ringRadius;
    const moonY = centerY + Math.sin(moonAngle) * ringRadius;
    const moonVisible = moon.elevation > -0.1;

    if (moonVisible) {
      ctx.fillStyle = '#C0C0C0';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(192, 192, 192, 0.3)';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 10, 0, TAU);
      ctx.fill();
    }

    // Direction labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labels = ['N', 'E', 'S', 'W'];
    const labelAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    labels.forEach((label, i) => {
      const lx = centerX + Math.cos(labelAngles[i]) * (ringRadius + 16);
      const ly = centerY + Math.sin(labelAngles[i]) * (ringRadius + 16);
      ctx.fillText(label, lx, ly);
    });
  }, [enabled, viewer]);

  useEffect(() => {
    if (!enabled || !viewer) return;
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [enabled, viewer, draw]);

  useEffect(() => {
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
        zIndex: 3,
      }}
    />
  );
}
