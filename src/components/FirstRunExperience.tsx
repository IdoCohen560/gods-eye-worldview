import { useState, useEffect } from 'react';

const STORAGE_KEY = 'godseye-firstrun-seen';

const MISSIONS = [
  { key: 'contacts', icon: 'radar', title: 'LIVE CONTACTS', desc: 'Aircraft, vessels and nearby intelligence' },
  { key: 'space-missions', icon: 'rocket_launch', title: 'SPACE MISSIONS', desc: 'Launches, spacecraft and orbital context' },
  { key: 'environmental', icon: 'local_fire_department', title: 'ENVIRONMENTAL', desc: 'Live earthquakes and active fires, from USGS and NASA' },
  { key: 'explore', icon: 'public', title: 'EXPLORE MANUALLY', desc: 'Begin with a clean globe' },
];

export default function FirstRunExperience({ onComplete }: { onComplete: (choice: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [suppress, setSuppress] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('welcome') === '0') return;
    const seen = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible]);

  const handleChoice = (choice: string) => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    if (suppress) localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    onComplete(choice);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    if (suppress) localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    onComplete('explore');
  };

  if (!visible) return null;

  return (
    <aside id="first-run-launcher" role="dialog" aria-labelledby="first-run-title" aria-describedby="first-run-description">
      <div className="first-run-scanline" />
      <header className="first-run-header">
        <span className="first-run-kicker">MISSION CONTROL · FIRST LAUNCH</span>
      </header>
      <h2 id="first-run-title">Choose your first view</h2>
      <p id="first-run-description">It feels like a forbidden cockpit—then you realize the sources are public and the data is real.</p>
      <div className="first-run-choices">
        {MISSIONS.map(m => (
          <button key={m.key} type="button" onClick={() => handleChoice(m.key)}>
            <span className="material-symbols-outlined" aria-hidden="true">{m.icon}</span>
            <span><strong>{m.title}</strong><small>{m.desc}</small></span>
            <span className="material-symbols-outlined first-run-arrow" aria-hidden="true">arrow_forward</span>
          </button>
        ))}
      </div>
      <div className="first-run-footer">
        <label className="first-run-suppress">
          <input type="checkbox" checked={suppress} onChange={e => setSuppress(e.target.checked)} />
          <span>Don't show this again</span>
        </label>
        <span>ESC to dismiss</span>
      </div>
    </aside>
  );
}
