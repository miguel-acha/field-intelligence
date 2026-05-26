import React from 'react';

const TABS = [
  { id: 'coach',   label: 'Coach Dashboard' },
  { id: 'player',  label: 'Player Profile'  },
  { id: 'analyst', label: 'Analyst Mode'    },
];

export default function NavBar({ activeView, onViewChange, currentMatch }) {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <div className="logo-dot" />
        FIELD INTELLIGENCE
      </div>

      <div className="nav-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeView === tab.id ? 'active' : ''}`}
            onClick={() => onViewChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {currentMatch && (
        <div className="navbar-match-info">
          <span className="match-teams">
            {currentMatch.homeTeam} <span style={{ color: 'var(--text-muted)', margin: '0 0.3rem' }}>×</span> {currentMatch.awayTeam}
          </span>
          <span className="match-score">
            {currentMatch.score.home}–{currentMatch.score.away}
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          >
            {currentMatch.stadium}
          </span>
        </div>
      )}
    </nav>
  );
}
