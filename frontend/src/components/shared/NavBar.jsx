import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function NavBar({ activeView, onViewChange, currentMatch }) {
  const logoRef = useRef(null);

  useEffect(() => {
    gsap.from(logoRef.current, { opacity: 0, x: -20, duration: 0.6, ease: 'power2.out' });
  }, []);

  const tabs = [
    { id: 'coach',   label: 'Coach Dashboard', icon: '◈' },
    { id: 'player',  label: 'Player Profile',   icon: '◉' },
    { id: 'analyst', label: 'Analyst Mode',     icon: '◆' },
  ];

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(10,14,26,0.92)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: '2rem',
      padding: '0 1.5rem', height: '56px',
    }}>
      {/* Logo */}
      <div ref={logoRef} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--accent-green)',
          boxShadow: '0 0 8px var(--accent-green)',
        }} />
        <span style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 800,
          fontSize: '0.95rem',
          letterSpacing: '0.06em',
          color: 'var(--text-primary)',
        }}>
          FIELD<span style={{ color: 'var(--accent-green)' }}>INTEL</span>
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
        {tabs.map(tab => {
          const active = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              style={{
                background: active ? 'rgba(0,255,135,0.08)' : 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid var(--accent-green)' : '2px solid transparent',
                color: active ? 'var(--accent-green)' : 'var(--text-muted)',
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: active ? 600 : 400,
                fontSize: '0.82rem',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              <span style={{ fontSize: '0.7rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Match info right side */}
      {currentMatch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <span style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            fontFamily: 'Space Grotesk, sans-serif',
          }}>
            {currentMatch.homeTeam.split(' ').pop()}
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
          }}>
            {currentMatch.score.home} — {currentMatch.score.away}
          </span>
          <span style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            fontFamily: 'Space Grotesk, sans-serif',
          }}>
            {currentMatch.awayTeam.split(' ').pop()}
          </span>
          <span className="pill pill-green" style={{ fontSize: '0.58rem' }}>LIVE DATA</span>
        </div>
      )}
    </nav>
  );
}
