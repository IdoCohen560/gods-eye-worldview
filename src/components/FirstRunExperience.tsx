/**
 * FirstRunExperience — mission briefing overlay shown on first visit.
 * Adapted from reference repo's firstRunExperience.js.
 */
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'godseye-firstrun-seen';

export default function FirstRunExperience({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const steps = [
    { title: 'GOD\'S EYE VIEW', text: 'Global intelligence monitoring system. Real-time feeds from satellites, aircraft, ships, and ground sensors.' },
    { title: 'NAVIGATION', text: 'Scroll to zoom. Click and drag to rotate. Use the sidebar to toggle data layers.' },
    { title: 'SHADER MODES', text: 'Press [1-9] to cycle visual enhancement modes. NVG, FLIR, Noir, Snow, and more.' },
    { title: 'READY', text: 'Begin your observation. All systems nominal.' },
  ];

  if (!visible) return null;

  const current = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      sessionStorage.setItem(STORAGE_KEY, '1');
      localStorage.setItem(STORAGE_KEY, '1');
      setVisible(false);
      onComplete();
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    onComplete();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        maxWidth: 440,
        padding: '40px 48px',
        textAlign: 'center',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        borderRadius: 4,
        background: 'rgba(10, 14, 20, 0.95)',
      }}>
        <div style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--accent-green, #00ff88)',
          fontFamily: 'monospace',
          letterSpacing: 4,
          marginBottom: 8,
        }}>
          {current.title}
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--text-dim, rgba(255,255,255,0.6))',
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          {current.text}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={handleSkip}
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--text-dim, rgba(255,255,255,0.5))',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 11,
              borderRadius: 2,
            }}
          >
            SKIP
          </button>
          <button
            onClick={handleNext}
            style={{
              padding: '8px 20px',
              background: 'var(--accent-green, #00ff88)',
              border: 'none',
              color: '#000',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 2,
            }}
          >
            {step < steps.length - 1 ? 'NEXT' : 'BEGIN'}
          </button>
        </div>
        <div style={{
          marginTop: 20,
          fontSize: 9,
          color: 'rgba(255,255,255,0.3)',
        }}>
          {step + 1} / {steps.length}
        </div>
      </div>
    </div>
  );
}
