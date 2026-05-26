import React from 'react';

export default function MatchSelector({ matches, selectedIndex, onSelect }) {
  return (
    <div className="match-selector">
      {matches.map((match, idx) => (
        <div
          key={match.id}
          className={`match-card ${idx === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelect(idx)}
        >
          <div className="match-card-teams">
            {match.homeTeam.replace('München', 'Mchn').replace('Borussia ', 'B. ').replace('Leverkusen', 'Lever.').replace('RB Leipzig', 'Leipzig')}
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: '0.1rem 0' }}>vs</div>
          <div className="match-card-teams">
            {match.awayTeam.replace('München', 'Mchn').replace('Borussia ', 'B. ').replace('Leverkusen', 'Lever.').replace('RB Leipzig', 'Leipzig')}
          </div>
          <div className="match-card-score">
            {match.score.home} – {match.score.away}
          </div>
          <div className="match-card-meta">{match.date}</div>
          <div className="match-card-meta" style={{ color: 'var(--accent-blue)', fontSize: '0.6rem', marginTop: '0.1rem' }}>
            {match.competition}
          </div>
        </div>
      ))}
    </div>
  );
}
