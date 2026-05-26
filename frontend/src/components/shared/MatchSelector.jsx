import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export default function MatchSelector({ matches, selectedIndex, onSelect }) {
  const rowRef = useRef(null);

  useEffect(() => {
    if (rowRef.current && rowRef.current.children.length > 0) {
      gsap.from(rowRef.current.children, {
        opacity: 0, y: -8, stagger: 0.06, duration: 0.4, ease: 'power2.out', delay: 0.2,
      });
    }
  }, []);

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      padding: '0.5rem 1.5rem',
    }}>
      <div
        ref={rowRef}
        style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.1rem' }}
      >
        {matches.map((m, i) => {
          const active = i === selectedIndex;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(i)}
              style={{
                background: active ? 'rgba(0,255,135,0.08)' : 'transparent',
                border: `1px solid ${active ? 'rgba(0,255,135,0.4)' : 'var(--border)'}`,
                borderRadius: '6px',
                padding: '0.35rem 0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}
            >
              <span style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 600,
                fontSize: '0.75rem',
                color: active ? 'var(--accent-green)' : 'var(--text-secondary)',
              }}>
                {m.homeTeam.split(' ').pop()}
                {' '}
                <span style={{ color: 'var(--text-muted)' }}>vs</span>
                {' '}
                {m.awayTeam.split(' ').pop()}
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.72rem',
                color: active ? 'var(--accent-green)' : 'var(--text-muted)',
                fontWeight: 700,
              }}>
                {m.score.home}–{m.score.away}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
