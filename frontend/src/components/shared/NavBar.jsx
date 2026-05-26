import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function NavBar({ activeView, onViewChange, match }) {
  const logoRef = useRef(null);
  const tabsRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(logoRef.current,
      { opacity: 0, x: -16 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out', overwrite: true }
    );
    if (tabsRef.current) {
      gsap.fromTo([...tabsRef.current.children],
        { y: -6 },
        { y: 0, stagger: 0.07, duration: 0.35, delay: 0.1, ease: 'power2.out', overwrite: true }
      );
    }
  }, []);

  const tabs = [
    { id: 'coach',   label: 'Coach Dashboard' },
    { id: 'player',  label: 'Player Profile' },
    { id: 'analyst', label: 'Analyst Mode' },
  ];

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(8,8,8,0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid #1a1a1a',
      display: 'flex', alignItems: 'center',
      padding: '0 1.5rem', height: '54px', gap: '2rem',
    }}>
      <div ref={logoRef} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
        <img src="/logo-mark.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.25rem', letterSpacing: '0.08em', color: '#fff' }}>
          OPEN<span style={{ color: '#E32219' }}>CAMBA</span>
        </span>
      </div>

      <div ref={tabsRef} style={{ display: 'flex', gap: '0.1rem', flex: 1 }}>
        {tabs.map(tab => {
          const active = activeView === tab.id;
          return (
            <button key={tab.id} onClick={() => onViewChange(tab.id)}
              style={{
                background: 'transparent', border: 'none',
                borderBottom: active ? '2px solid #E32219' : '2px solid transparent',
                color: active ? '#fff' : '#666',
                fontFamily: 'Inter, sans-serif', fontWeight: active ? 600 : 400,
                fontSize: '0.8rem', padding: '0 1rem', height: '54px',
                cursor: 'pointer', letterSpacing: '0.01em', transition: 'color 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#aaa'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#666'; }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {match && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'Inter' }}>{match.homeTeam.split(' ').pop()}</span>
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.2rem', color: '#fff', letterSpacing: '0.06em' }}>
            {match.score.home} — {match.score.away}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'Inter' }}>{match.awayTeam.split(' ').pop()}</span>
          <span className="pill pill-red" style={{ fontSize: '0.55rem' }}>BUNDESLIGA</span>
        </div>
      )}
    </nav>
  );
}
