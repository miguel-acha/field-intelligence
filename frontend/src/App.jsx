import React, { useState } from 'react';
import NavBar from './components/shared/NavBar';
import MatchSelector from './components/shared/MatchSelector';
import CoachDashboard from './components/CoachDashboard';
import PlayerProfile from './components/PlayerProfile';
import AnalystMode from './components/AnalystMode';
import { matches } from './data/mockData';

export default function App() {
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);
  const [activeView, setActiveView] = useState('coach');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const currentMatch = matches[selectedMatchIndex];

  function handleMatchSelect(idx) {
    setSelectedMatchIndex(idx);
    setSelectedPlayer(null);
  }

  function handleViewChange(view) {
    setActiveView(view);
    if (view !== 'player') {
      setSelectedPlayer(null);
    }
  }

  function handlePlayerSelect(player) {
    setSelectedPlayer(player);
    if (player) {
      setActiveView('player');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar
        activeView={activeView}
        onViewChange={handleViewChange}
        currentMatch={currentMatch}
      />
      <MatchSelector
        matches={matches}
        selectedIndex={selectedMatchIndex}
        onSelect={handleMatchSelect}
      />
      <div className="main-content" style={{ flex: 1 }}>
        {activeView === 'coach' && (
          <CoachDashboard
            match={currentMatch}
            onPlayerSelect={handlePlayerSelect}
            onViewChange={handleViewChange}
          />
        )}
        {activeView === 'player' && (
          <PlayerProfile
            match={currentMatch}
            selectedPlayer={selectedPlayer}
            onPlayerSelect={handlePlayerSelect}
          />
        )}
        {activeView === 'analyst' && (
          <AnalystMode
            match={currentMatch}
            onPlayerSelect={handlePlayerSelect}
            onViewChange={handleViewChange}
          />
        )}
      </div>
    </div>
  );
}
