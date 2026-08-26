import { useState } from 'react';

export default function FirstRunExperience({ onComplete }: { onComplete: (choice: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [suppress, setSuppress] = useState(false);

  useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('welcome') === '0') return;
    const seen = sessionStorage.getItem('godseye-firstrun-seen') || localStorage.getItem('godseye-firstrun-seen');
    if (!seen) setVisible(true);
  });

  const handleChoice = (choice: string) => {
    sessionStorage.setItem('godseye-firstrun-seen', '1');
    if (suppress) localStorage.setItem('godseye-firstrun-seen', '1');
    setVisible(false);
    onComplete(choice);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('godseye-firstrun-seen', '1');
    if (suppress) localStorage.setItem('godseye-firstrun-seen', '1');
    setVisible(false);
    onComplete('explore');
  };

  return (
    <aside
      id="first-run-launcher"
      className={visible ? 'visible' : ''}
      role="dialog"
      aria-labelledby="first-run-title"
      aria-describedby="first-run-description"
    >
      <div className="first-run-scanline" />
      <header className="first-run-header">
        <span className="first-run-kicker">MISSION CONTROL · FIRST LAUNCH</span>
      </header>
      <h2 id="first-run-title">Choose your first view</h2>
      <p id="first-run-description">It feels like a forbidden cockpit — then you realize the sources are public and the data is real.</p>
      <div className="first-run-choices">
        <button type="button" onClick={() => handleChoice('contacts')}>
          <span className="material-symbols-outlined" aria-hidden="true">radar</span>
          <span><strong>LIVE CONTACTS</strong><small>Aircraft, vessels and nearby intelligence</small></span>
          <span className="material-symbols-outlined first-run-arrow" aria-hidden="true">arrow_forward</span>
        </button>
        <button type="button" onClick={() => handleChoice('space-missions')}>
          <span className="material-symbols-outlined" aria-hidden="true">rocket_launch</span>
          <span><strong>SPACE MISSIONS</strong><small>Launches, spacecraft and orbital context</small></span>
          <span className="material-symbols-outlined first-run-arrow" aria-hidden="true">arrow_forward</span>
        </button>
        <button type="button" onClick={() => handleChoice('environmental')}>
          <span className="material-symbols-outlined" aria-hidden="true">local_fire_department</span>
          <span><strong>ENVIRONMENTAL</strong><small>Live earthquakes and active fires</small></span>
          <span className="material-symbols-outlined first-run-arrow" aria-hidden="true">arrow_forward</span>
        </button>
        <button type="button" onClick={() => handleChoice('explore')}>
          <span className="material-symbols-outlined" aria-hidden="true">public</span>
          <span><strong>EXPLORE MANUALLY</strong><small>Begin with a clean globe</small></span>
          <span className="material-symbols-outlined first-run-arrow" aria-hidden="true">arrow_forward</span>
        </button>
      </div>
      <div className="first-run-footer">
        <label className="first-run-suppress">
          <input type="checkbox" checked={suppress} onChange={e => setSuppress(e.target.checked)} />
          <span>Don't show this again</span>
        </label>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>ESC to dismiss</span>
      </div>
    </aside>
  );
}
