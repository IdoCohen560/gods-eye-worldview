import { useEffect } from 'react';
import type { ShaderMode } from '../App';

interface Props {
  current: ShaderMode;
  onChange: (mode: ShaderMode) => void;
}

const MODES: { key: ShaderMode; label: string; shortcut: string }[] = [
  { key: 'normal', label: 'NORMAL', shortcut: '1' },
  { key: 'nvg', label: 'NVG', shortcut: '2' },
  { key: 'flir', label: 'FLIR', shortcut: '3' },
  { key: 'crt', label: 'CRT', shortcut: '4' },
  { key: 'cel', label: 'CEL', shortcut: '5' },
  { key: 'classified', label: 'CLASSIFIED', shortcut: '6' },
];

export default function ShaderSelector({ current, onChange }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const mode = MODES.find(m => m.shortcut === e.key);
      if (mode) onChange(mode.key);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onChange]);

  return (
    <div className="shader-selector">
      {MODES.map(m => (
        <button
          key={m.key}
          className={`shader-btn ${current === m.key ? 'active' : ''}`}
          onClick={() => onChange(m.key)}
          title={`[${m.shortcut}]`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
