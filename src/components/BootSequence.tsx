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
    <div id="loading-screen">
      <div className="loader-content">
        <div style={{
          fontSize: 28,
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          letterSpacing: 8,
          color: 'var(--text-primary)',
          marginBottom: 24,
        }}>
          GOD'S <span style={{ color: 'var(--accent)', fontWeight: 300 }}>EYE</span>
        </div>

        <div style={{ textAlign: 'left', width: 400, maxWidth: '90vw', margin: '0 auto' }}>
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <div key={i} style={{
              color: line.text.startsWith('[OK]')
                ? 'var(--accent)'
                : line.text === 'ALL SYSTEMS ONLINE'
                  ? 'var(--text-primary)'
                  : 'var(--text-dim)',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              marginBottom: 3,
              letterSpacing: 1,
            }}>
              {line.text}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 16,
          height: 2,
          background: 'rgba(255,255,255,0.06)',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 1,
          width: 400,
          maxWidth: '90vw',
          margin: '16px auto 0',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'var(--accent)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 6, fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
          {progress}%
        </div>
      </div>
    </div>
  );
}
