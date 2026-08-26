import { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing photorealistic world...');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const steps = [
      { pct: 20, msg: 'Loading Cesium globe engine...', delay: 400 },
      { pct: 40, msg: 'Connecting to imagery providers...', delay: 800 },
      { pct: 60, msg: 'Loading terrain data...', delay: 1200 },
      { pct: 80, msg: 'Initializing shader pipeline...', delay: 1600 },
      { pct: 100, msg: 'All systems online', delay: 2000 },
    ];

    steps.forEach(step => {
      timers.push(setTimeout(() => {
        setProgress(step.pct);
        setStatus(step.msg);
      }, step.delay));
    });

    timers.push(setTimeout(onComplete, 3000));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div id="loading-screen">
      <div className="loader-content">
        <h2>
          GOD'S EYE <span className="title-accent">VIEW</span>
        </h2>
        <div className="loader-status">{status}</div>
        <div style={{
          marginTop: 16, height: 2, background: 'rgba(255,255,255,0.06)',
          borderRadius: 1, width: 300, maxWidth: '80vw', margin: '16px auto 0', overflow: 'hidden',
        }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 0.3s ease' }} />
        </div>
      </div>
    </div>
  );
}
