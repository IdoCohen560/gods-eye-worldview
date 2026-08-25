import { useState } from 'react';
import { MAP_STACKS, type MapStack } from '../layers/MapStackController';

interface Props {
  currentStack: string;
  onSwitch: (stackId: string) => void;
}

export default function MapStackSelector({ currentStack, onSwitch }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="map-stack-selector" style={{
      position: 'absolute',
      bottom: 60,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
    }}>
      {expanded && (
        <div style={{
          display: 'flex',
          gap: 4,
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.85)',
          borderRadius: 6,
          border: '1px solid var(--border)',
        }}>
          {MAP_STACKS.map((stack: MapStack) => (
            <button
              key={stack.id}
              onClick={() => { onSwitch(stack.id); setExpanded(false); }}
              style={{
                padding: '4px 10px',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: currentStack === stack.id ? 'var(--accent-green)' : 'var(--text-dim)',
                background: currentStack === stack.id ? 'rgba(0,255,65,0.1)' : 'transparent',
                border: `1px solid ${currentStack === stack.id ? 'var(--accent-green)' : 'var(--border)'}`,
                borderRadius: 4,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {stack.shortLabel}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '4px 12px',
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent-green)',
          background: 'rgba(0,0,0,0.85)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {MAP_STACKS.find(s => s.id === currentStack)?.shortLabel || 'MAP'}
      </button>
    </div>
  );
}
