import { useState, useEffect } from 'react';

const STORAGE_KEY = 'godseye-firstrun-seen';

export default function FirstRunExperience({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  const handleChoice = (mode: string) => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    onComplete();
  };

  if (!visible) return null;

  return (
    <div className="first-run-overlay">
      <div className="first-run-card">
        <span className="first-run-kicker">GLOBAL INTELLIGENCE MONITORING</span>
        <h2>SELECT OPERATOR MODE</h2>
        <p>Choose your viewing mode. You can change this later using the command dock below.</p>
        <div className="first-run-choices">
          <button onClick={() => handleChoice('standard')}>
            <span>🌍</span>
            <div>
              <strong>STANDARD MODE</strong>
              <small>Full data layers, all visual enhancements enabled</small>
            </div>
          </button>
          <button onClick={() => handleChoice('minimal')}>
            <span>👁</span>
            <div>
              <strong>MINIMAL MODE</strong>
              <small>Reduced overlays, focused on core intelligence feeds</small>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
