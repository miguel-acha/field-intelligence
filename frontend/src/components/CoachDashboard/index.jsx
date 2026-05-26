import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import KPICard from '../shared/KPICard';
import { getTeamAverages, KPI_META } from '../../data/mockData';

// ---- Team color ----
const TEAM_COLORS = {
  'Bayern München':     '#dc2626',
  'Borussia Dortmund':  '#fbbf24',
  'Bayer Leverkusen':   '#dc2626',
  'RB Leipzig':         '#1d4ed8',
};

function getTeamColor(team) {
  return TEAM_COLORS[team] || 'var(--accent-blue)';
}

// ---- Timeline event dot colors ----
function getEventColor(type) {
  switch (type) {
    case 'goal':     return 'var(--accent-green)';
    case 'chance':   return 'var(--accent-blue)';
    case 'pressing': return 'var(--accent-amber)';
    case 'tactical': return '#8b5cf6';
    default:         return 'var(--text-muted)';
  }
}

// ---- Tactical alerts generator ----
function generateAlerts(players, homeTeam, awayTeam) {
  const alerts = [];
  const allPlayers = players.filter(p => p.minutesPlayed > 70);

  // Find most fatigued player
  const mostFatigued = [...allPlayers].sort((a, b) => a.fatigueSig - b.fatigueSig)[0];
  if (mostFatigued) {
    alerts.push({
      type: 'amber',
      icon: '⚡',
      text: `<strong>${mostFatigued.name}</strong> (${mostFatigued.team}) muestra ${Math.abs(mostFatigued.fatigueSig)}% de caída en Fatigue Signature — posible necesidad de rotación o gestión de cargas.`,
    });
  }

  // Find player with best sprint value
  const bestSprinter = [...allPlayers].sort((a, b) => b.sprintValueScore - a.sprintValueScore)[0];
  if (bestSprinter) {
    alerts.push({
      type: 'green',
      icon: '🏃',
      text: `<strong>${bestSprinter.name}</strong> lidera en Sprint Value Score con ${bestSprinter.sprintValueScore} sprints de alto valor — vector clave en transiciones ofensivas del partido.`,
    });
  }

  // Coverage gap alert
  const lowCoverage = allPlayers.filter(p => p.coverageShadow < 160 && p.position !== 'GK');
  if (lowCoverage.length > 0) {
    alerts.push({
      type: 'red',
      icon: '🔴',
      text: `<strong>${lowCoverage[0].name}</strong> presenta Coverage Shadow reducido (${lowCoverage[0].coverageShadow}m²) — zona de influencia defensiva por debajo del umbral crítico.`,
    });
  } else {
    // High scan rate alert
    const highScanner = [...allPlayers].sort((a, b) => b.scanRate - a.scanRate)[0];
    if (highScanner) {
      alerts.push({
        type: 'blue',
        icon: '👁️',
        text: `<strong>${highScanner.name}</strong> registra el Scan Rate más alto del partido (${highScanner.scanRate} esc/min) — conciencia táctica excepcional que explica su capacidad para encontrar espacios antes que existan.`,
      });
    }
  }

  return alerts;
}

// ---- Custom Tooltip ----
function PossessionTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-bright)',
        borderRadius: '6px',
        padding: '0.5rem 0.75rem',
        fontSize: '0.78rem',
        fontFamily: 'Space Grotesk, sans-serif',
      }}>
        <span style={{ color: payload[0].payload.color, fontWeight: 700 }}>
          {payload[0].name}
        </span>
        <span style={{ color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
          {payload[0].value}%
        </span>
      </div>
    );
  }
  return null;
}

export default function CoachDashboard({ match, onPlayerSelect, onViewChange }) {
  const homeAvg = useMemo(() => getTeamAverages(match.players, match.homeTeam), [match]);
  const awayAvg = useMemo(() => getTeamAverages(match.players, match.awayTeam), [match]);

  const possessionData = [
    { name: match.homeTeam, value: match.teamStats.home.possession, color: getTeamColor(match.homeTeam) },
    { name: match.awayTeam, value: match.teamStats.away.possession, color: getTeamColor(match.awayTeam) },
  ];

  const pressureBarData = [
    {
      name: match.homeTeam.split(' ')[0],
      home: match.teamStats.home.pressureEvents,
      away: match.teamStats.away.pressureEvents,
    },
  ];

  const teamKPIs = [
    { label: 'Avg Spatial Awareness', homeVal: homeAvg.spatialAwareness, awayVal: awayAvg.spatialAwareness, unit: '/100', icon: '🧠' },
    { label: 'Avg Sprint Value',      homeVal: homeAvg.sprintValueScore, awayVal: awayAvg.sprintValueScore, unit: '',      icon: '⚡' },
    { label: 'Avg Pressure Index',    homeVal: homeAvg.pressureIndex3D, awayVal: awayAvg.pressureIndex3D, unit: '/100',    icon: '🔥' },
    { label: 'Avg Scan Rate',         homeVal: homeAvg.scanRate,         awayVal: awayAvg.scanRate,         unit: '/min',   icon: '👁️' },
    { label: 'Avg Fatigue Sig.',      homeVal: homeAvg.fatigueSig,       awayVal: awayAvg.fatigueSig,      unit: '%',      icon: '📉' },
    { label: 'Avg Pressure Collapse', homeVal: homeAvg.pressureCollapseRate, awayVal: awayAvg.pressureCollapseRate, unit: '/100', icon: '💥' },
  ];

  const homePlayers = match.players.filter(p => p.team === match.homeTeam);
  const awayPlayers = match.players.filter(p => p.team === match.awayTeam);
  const alerts = useMemo(() => generateAlerts(match.players, match.homeTeam, match.awayTeam), [match]);

  function handlePlayerClick(player) {
    onPlayerSelect(player);
    onViewChange('player');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ---- 1. MATCH OVERVIEW ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '1rem', alignItems: 'start' }}>

        {/* Score big display */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="section-heading">Resultado Final</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.85rem', color: getTeamColor(match.homeTeam), fontWeight: 700 }}>
              {match.homeTeam}
            </span>
          </div>
          <div className="score-display" style={{ textAlign: 'center' }}>
            <span style={{ color: 'var(--text-primary)' }}>{match.score.home}</span>
            <span className="score-separator"> – </span>
            <span style={{ color: 'var(--text-primary)' }}>{match.score.away}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.85rem', color: getTeamColor(match.awayTeam), fontWeight: 700 }}>
              {match.awayTeam}
            </span>
          </div>
          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
            {[
              { label: 'Tiros', home: match.teamStats.home.shots, away: match.teamStats.away.shots },
              { label: 'Al Arco', home: match.teamStats.home.shotsOnTarget, away: match.teamStats.away.shotsOnTarget },
              { label: 'Pases', home: match.teamStats.home.passes, away: match.teamStats.away.passes },
              { label: 'Presión', home: match.teamStats.home.pressureEvents, away: match.teamStats.away.pressureEvents },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '6px',
                padding: '0.4rem',
              }}>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{stat.label}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                  <span style={{ color: getTeamColor(match.homeTeam) }}>{stat.home}</span>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <span style={{ color: getTeamColor(match.awayTeam) }}>{stat.away}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Possession donut */}
        <div className="card">
          <div className="section-heading">Posesión del Balón</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={possessionData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {possessionData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} opacity={0.85} />
                ))}
              </Pie>
              <Tooltip content={<PossessionTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.25rem' }}>
            {possessionData.map(d => (
              <div key={d.name} style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {d.name.split(' ')[0]}
                  </span>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 700, color: d.color }}>
                  {d.value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pressure events */}
        <div className="card">
          <div className="section-heading">Eventos de Presión</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { team: match.homeTeam, events: match.teamStats.home.pressureEvents, max: Math.max(match.teamStats.home.pressureEvents, match.teamStats.away.pressureEvents) },
              { team: match.awayTeam, events: match.teamStats.away.pressureEvents, max: Math.max(match.teamStats.home.pressureEvents, match.teamStats.away.pressureEvents) },
            ].map(({ team, events, max }) => (
              <div key={team}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {team.split(' ')[0]}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', fontWeight: 700, color: getTeamColor(team) }}>
                    {events}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(events / max) * 100}%`,
                    background: getTeamColor(team),
                    borderRadius: '3px',
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: '0.5rem' }}>
              <div className="stat-row">
                <span className="stat-label">Pases completados</span>
                <span className="stat-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>
                  <span style={{ color: getTeamColor(match.homeTeam) }}>{match.teamStats.home.passes}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 0.3rem' }}>|</span>
                  <span style={{ color: getTeamColor(match.awayTeam) }}>{match.teamStats.away.passes}</span>
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Tiros totales</span>
                <span className="stat-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>
                  <span style={{ color: getTeamColor(match.homeTeam) }}>{match.teamStats.home.shots}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 0.3rem' }}>|</span>
                  <span style={{ color: getTeamColor(match.awayTeam) }}>{match.teamStats.away.shots}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- 2. TEAM KPIs ---- */}
      <div>
        <div className="section-heading">KPIs de Equipo — Promedio del Partido</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem' }}>
          {teamKPIs.map(kpi => (
            <div key={kpi.label} className="kpi-card animate-in" style={{ '--kpi-accent': 'var(--accent-blue)' }}>
              <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {kpi.icon && <span style={{ fontSize: '0.8rem' }}>{kpi.icon}</span>}
                {kpi.label}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', marginTop: '0.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.55rem', color: getTeamColor(match.homeTeam), marginBottom: '0.1rem' }}>
                    {match.homeTeam.split(' ')[0]}
                  </div>
                  <span className="metric-value" style={{ fontSize: '1.3rem', color: getTeamColor(match.homeTeam) }}>
                    {kpi.homeVal}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '0.15rem' }}>{kpi.unit}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>|</div>
                <div>
                  <div style={{ fontSize: '0.55rem', color: getTeamColor(match.awayTeam), marginBottom: '0.1rem' }}>
                    {match.awayTeam.split(' ')[0]}
                  </div>
                  <span className="metric-value" style={{ fontSize: '1.3rem', color: getTeamColor(match.awayTeam) }}>
                    {kpi.awayVal}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '0.15rem' }}>{kpi.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* ---- 3. PLAYER GRID ---- */}
        <div>
          <div className="section-heading">Jugadores — {match.homeTeam}</div>
          <div className="player-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {homePlayers.map(player => (
              <PlayerCard key={player.name} player={player} onClick={() => handlePlayerClick(player)} />
            ))}
          </div>
        </div>
        <div>
          <div className="section-heading">Jugadores — {match.awayTeam}</div>
          <div className="player-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {awayPlayers.map(player => (
              <PlayerCard key={player.name} player={player} onClick={() => handlePlayerClick(player)} />
            ))}
          </div>
        </div>
      </div>

      {/* ---- 4. MATCH TIMELINE ---- */}
      <div className="card">
        <div className="section-heading">Timeline del Partido</div>
        <div className="timeline-container">
          <div className="timeline-track">
            <div className="timeline-line" />
            {/* Minute markers */}
            {[0, 15, 30, 45, 60, 75, 90].map(min => (
              <div
                key={min}
                style={{
                  position: 'absolute',
                  left: `${(min / 90) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ width: 1, height: 10, background: 'var(--border-bright)', marginBottom: 4 }} />
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {min}'
                </span>
              </div>
            ))}
            {match.timeline.map((event, idx) => {
              const leftPct = `${(event.minute / 90) * 100}%`;
              const color = getEventColor(event.type);
              const isAbove = idx % 2 === 0;
              return (
                <div
                  key={idx}
                  className="timeline-event"
                  style={{ left: leftPct }}
                  title={`${event.minute}' — ${event.description}`}
                >
                  <div style={{
                    position: 'absolute',
                    [isAbove ? 'bottom' : 'top']: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    fontSize: '0.6rem',
                    fontFamily: 'Space Grotesk, sans-serif',
                    color: color,
                    fontWeight: 600,
                    padding: '0.15rem 0.35rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '3px',
                    border: `1px solid ${color}33`,
                    marginBottom: isAbove ? '4px' : 0,
                    marginTop: isAbove ? 0 : '4px',
                    maxWidth: '140px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    pointerEvents: 'none',
                  }}>
                    {event.minute}' {event.description.substring(0, 28)}…
                  </div>
                  <div
                    className="timeline-dot"
                    style={{
                      background: color,
                      boxShadow: `0 0 6px ${color}88`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { type: 'goal',     label: 'Gol',       color: 'var(--accent-green)' },
            { type: 'chance',   label: 'Ocasión',   color: 'var(--accent-blue)' },
            { type: 'pressing', label: 'Pressing',  color: 'var(--accent-amber)' },
            { type: 'tactical', label: 'Táctica',   color: '#8b5cf6' },
          ].map(item => (
            <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'Space Grotesk, sans-serif' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- 5. TACTICAL ALERTS ---- */}
      <div className="card">
        <div className="section-heading">Alertas Tácticas — IA Automática</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className="tactical-alert"
              style={{
                borderColor: alert.type === 'green' ? 'rgba(0,255,135,0.2)'
                  : alert.type === 'red' ? 'rgba(239,68,68,0.2)'
                    : alert.type === 'blue' ? 'rgba(59,130,246,0.2)'
                      : 'rgba(245,158,11,0.2)',
                background: alert.type === 'green' ? 'rgba(0,255,135,0.04)'
                  : alert.type === 'red' ? 'rgba(239,68,68,0.04)'
                    : alert.type === 'blue' ? 'rgba(59,130,246,0.04)'
                      : 'rgba(245,158,11,0.04)',
              }}
            >
              <span className="tactical-alert-icon">{alert.icon}</span>
              <span
                className="tactical-alert-text"
                dangerouslySetInnerHTML={{ __html: alert.text }}
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ---- Mini Player Card ----
function PlayerCard({ player, onClick }) {
  const topKPIs = [
    { k: 'spatialAwareness', l: 'Spatial',  v: player.spatialAwareness },
    { k: 'sprintValueScore', l: 'Sprint V', v: player.sprintValueScore },
    { k: 'scanRate',         l: 'Scan Rate', v: player.scanRate },
  ];

  const hasGoal = player.goals > 0;
  const hasAssist = player.assists > 0;

  return (
    <div className="player-card" onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
        <div>
          <div className="player-number">#{player.jerseyNumber}</div>
          <div className="player-name">{player.name.split(' ').pop()}</div>
          <div className="player-position">{player.position}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end' }}>
          {hasGoal && (
            <span className="tag tag-green" style={{ fontSize: '0.55rem' }}>
              ⚽ {player.goals}
            </span>
          )}
          {hasAssist && (
            <span className="tag tag-blue" style={{ fontSize: '0.55rem' }}>
              🅰️ {player.assists}
            </span>
          )}
        </div>
      </div>
      <div className="player-kpi-mini">
        {topKPIs.map(kpi => (
          <div key={kpi.k} className="player-kpi-mini-row">
            <span className="player-kpi-mini-label">{kpi.l}</span>
            <span className="player-kpi-mini-value">{kpi.v}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>km</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            {player.distanceCovered}
          </span>
        </div>
      </div>
    </div>
  );
}

