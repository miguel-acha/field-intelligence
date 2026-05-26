import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

const TEAM_COLORS = {
  'Bayern München': '#E32219', 'Borussia Dortmund': '#FDE047',
  'Bayer Leverkusen': '#E32219', 'RB Leipzig': '#2979FF',
};
const tc = t => TEAM_COLORS[t] || '#E32219';

export default function MatchSelector({ matches, selectedIndex, onSelect }) {
  const rowRef = useRef(null);

  useEffect(() => {
    if (rowRef.current) {
      gsap.from(rowRef.current.children, { opacity: 0, y: -6, stagger: 0.05, duration: 0.35, ease: 'power2.out', delay: 0.25 });
    }
  }, []);

  return (
    <div style={{ background: '#0d0d0d', borderBottom: '1px solid #1a1a1a', padding: '0.45rem 1.5rem' }}>
      <div ref={rowRef} style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        {matches.map((m, i) => {
          const active = i === selectedIndex;
          return (
            <button key={m.id} onClick={() => onSelect(i)}
              style={{
                background: active ? 'rgba(227,34,25,0.1)' : 'transparent',
                border: `1px solid ${active ? 'rgba(227,34,25,0.5)' : '#222'}`,
                borderRadius: '5px', padding: '0.3rem 0.85rem',
                cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = '#444'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#222'; }}
            >
              <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '0.72rem', color: active ? '#fff' : '#666' }}>
                {m.homeTeam.split(' ').pop()}
              </span>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.9rem', color: active ? '#E32219' : '#444', letterSpacing: '0.04em' }}>
                {m.score.home}–{m.score.away}
              </span>
              <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '0.72rem', color: active ? '#fff' : '#666' }}>
                {m.awayTeam.split(' ').pop()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
