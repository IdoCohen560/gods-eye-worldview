import { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
}

const BOOT_LINES = [
  { text: 'INITIALIZING GOD\'S EYE SYSTEM...', delay: 0 },
  { text: '[OK] Cesium Globe Engine', delay: 400 },
  { text: '[OK] Google 3D Tiles Connection', delay: 700 },
  { text: '[OK] OpenSky Aircraft Feed', delay: 1000 },
  { text: '[OK] CelesTrak Satellite TLE', delay: 1300 },
  { text: '[OK] CCTV Camera Network', delay: 1500 },
  { text: '[OK] USGS Seismic Monitor', delay: 1700 },
  { text: '[OK] NASA GIBS Imagery', delay: 1900 },
  { text: '[OK] Shader Pipeline Ready', delay: 2100 },
  { text: '', delay: 2400 },
  { text: 'ALL SYSTEMS ONLINE', delay: 2500 },
  { text: 'ESTABLISHING UPLINK...', delay: 2800 },
];

export default function BootSequence({ onComplete }: Props) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    BOOT_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => {
        setVisibleLines(i + 1);
        setProgress(Math.round(((i + 1) / BOOT_LINES.length) * 100));
      }, line.delay));
    });

    timers.push(setTimeout(onComplete, 3500));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="loading-overlay">
      <div style={{ width: 500, maxWidth: '90vw' }}>
        <div style={{ color: 'var(--accent-green)', fontSize: 18, letterSpacing: 4, marginBottom: 24 }}>
          GOD'S EYE
        </div>
        {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} style={{
            color: line.text.startsWith('[OK]')
              ? 'var(--accent-green)'
              : line.text === 'ALL SYSTEMS ONLINE'
                ? '#fff'
                : 'var(--text-dim)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            marginBottom: 3,
            letterSpacing: 1,
          }}>
            {line.text}
          </div>
        ))}
        <div style={{
          marginTop: 16,
          height: 2,
          background: 'var(--border)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'var(--accent-green)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 6, textAlign: 'right' }}>
          {progress}%
        </div>
      </div>
    </div>
  );
}
