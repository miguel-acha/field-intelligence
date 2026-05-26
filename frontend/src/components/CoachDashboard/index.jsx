import React, { useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { getTeamAverages } from '../../data/mockData';

const TEAM_COLORS = {
  'Bayern München':    '#dc2626',
  'Borussia Dortmund': '#fbbf24',
  'Bayer Leverkusen':  '#f97316',
  'RB Leipzig':        '#3b82f6',
};

const tc = (team) => TEAM_COLORS[team] || '#3b82f6';

const EVENT_COLORS = {
  goal:     '#00ff87',
  chance:   '#3b82f6',
  pressing: '#f59e0b',
  tactical: '#8b5cf6',
};

// ---- Stat comparison bar ----
function StatBar({ label, homeVal, awayVal, homeTeam, awayTeam, delay = 0 }) {
  const homeRef = useRef(null);
  const awayRef = useRef(null);
  const max = Math.max(homeVal, awayVal, 1);

  useEffect(() => {
    gsap.fromTo(
      homeRef.current,
      { scaleX: 0 },
      { scaleX: homeVal / max, duration: 0.7, delay, ease: 'power2.out', transformOrigin: 'left' }
    );
    gsap.fromTo(
      awayRef.current,
      { scaleX: 0 },
      { scaleX: awayVal / max, duration: 0.7, delay: delay + 0.1, ease: 'power2.out', transformOrigin: 'left' }
    );
  }, [homeVal, awayVal, delay, max]);

  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <span style={{
          fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
          fontSize: '0.85rem', color: tc(homeTeam),
        }}>
          {homeVal}
        </span>
        <span style={{
          fontSize: '0.62rem', color: 'var(--text-muted)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
          fontSize: '0.85rem', color: tc(awayTeam),
        }}>
          {awayVal}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '2px' }}>
        <div style={{
          flex: 1, height: '4px', background: 'var(--bg-tertiary)',
          borderRadius: '2px 0 0 2px', overflow: 'hidden',
        }}>
          <div
            ref={homeRef}
            style={{
              height: '100%', background: tc(homeTeam),
              borderRadius: 'inherit', transformOrigin: 'left',
            }}
          />
        </div>
        <div style={{
          flex: 1, height: '4px', background: 'var(--bg-tertiary)',
          borderRadius: '0 2px 2px 0', overflow: 'hidden',
          transform: 'scaleX(-1)',
        }}>
          <div
            ref={awayRef}
            style={{
              height: '100%', background: tc(awayTeam),
              borderRadius: 'inherit', transformOrigin: 'left',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ---- Animated hero score ----
function HeroScore({ match }) {
  const homeRef = useRef(null);
  const awayRef = useRef(null);

  useEffect(() => {
    const homeObj = { val: 0 };
    const awayObj = { val: 0 };
    gsap.to(homeObj, {
      val: match.score.home, duration: 0.6, ease: 'power2.out',
      onUpdate: () => { if (homeRef.current) homeRef.current.textContent = Math.round(homeObj.val); },
    });
    gsap.to(awayObj, {
      val: match.score.away, duration: 0.6, ease: 'power2.out', delay: 0.15,
      onUpdate: () => { if (awayRef.current) awayRef.current.textContent = Math.round(awayObj.val); },
    });
  }, [match]);

  return (
    <div className="card glass" style={{ padding: '2rem 2.5rem', textAlign: 'center' }}>
      <div style={{
        fontSize: '0.58rem', letterSpacing: '0.14em', color: 'var(--text-muted)',
        textTransform: 'uppercase', marginBottom: '0.5rem', fontFamily: 'Space Grotesk',
      }}>
        {match.competition} · {match.stadium}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '1.5rem',
      }}>
        <div style={{ textAlign: 'right', flex: 1 }}>
          <div style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
            fontSize: '0.9rem', color: tc(match.homeTeam), marginBottom: '0.25rem',
          }}>
            {match.homeTeam}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span ref={homeRef} className="score-hero" style={{ color: 'var(--text-primary)' }}>0</span>
          <span className="score-hero" style={{ color: 'var(--text-muted)', fontSize: '3rem' }}>–</span>
          <span ref={awayRef} className="score-hero" style={{ color: 'var(--text-primary)' }}>0</span>
        </div>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
            fontSize: '0.9rem', color: tc(match.awayTeam), marginBottom: '0.25rem',
          }}>
            {match.awayTeam}
          </div>
        </div>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
        {match.date}
      </div>
    </div>
  );
}

// ---- Player card v2 with GSAP hover ----
function PlayerCardV2({ player, onClick }) {
  const cardRef = useRef(null);
  const teamColor = tc(player.team);

  useEffect(() => {
    const el = cardRef.current;
    const enter = () => gsap.to(el, {
      y: -4,
      boxShadow: `0 8px 24px ${teamColor}22`,
      borderColor: `${teamColor}55`,
      duration: 0.2, ease: 'power2.out',
    });
    const leave = () => gsap.to(el, {
      y: 0,
      boxShadow: '0 0 0 rgba(0,0,0,0)',
      borderColor: 'var(--border)',
      duration: 0.2, ease: 'power2.out',
    });
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
    };
  }, [teamColor]);

  const topKPIColor = player.spatialAwareness > 80
    ? 'var(--accent-green)'
    : player.spatialAwareness > 65
      ? 'var(--text-primary)'
      : 'var(--accent-amber)';

  const fatigueColor = Math.abs(player.fatigueSig) > 20
    ? 'var(--accent-red)'
    : Math.abs(player.fatigueSig) > 14
      ? 'var(--accent-amber)'
      : 'var(--text-secondary)';

  return (
    <div
      ref={cardRef}
      className="player-card-v2"
      onClick={onClick}
      style={{ borderLeft: `2px solid ${teamColor}44` }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '0.6rem',
      }}>
        <div>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            #{player.jerseyNumber}
          </span>
          <div style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
            fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '0.1rem',
          }}>
            {player.name.split(' ').pop()}
          </div>
        </div>
        <span className="pill" style={{
          background: `${teamColor}15`, color: teamColor,
          border: `1px solid ${teamColor}35`, fontSize: '0.58rem',
        }}>
          {player.position}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'JetBrains Mono', fontSize: '1.15rem',
            fontWeight: 700, color: topKPIColor,
          }}>
            {player.spatialAwareness}
          </div>
          <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>SPATIAL</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'JetBrains Mono', fontSize: '1.15rem',
            fontWeight: 700, color: 'var(--accent-blue)',
          }}>
            {player.scanRate}
          </div>
          <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>SCAN/MIN</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'JetBrains Mono', fontSize: '1.15rem',
            fontWeight: 700, color: fatigueColor,
          }}>
            {player.fatigueSig}%
          </div>
          <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>FATIGUE</div>
        </div>
      </div>
      {(player.goals > 0 || player.assists > 0) && (
        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.6rem' }}>
          {player.goals > 0 && <span className="pill pill-green">⚽ {player.goals}</span>}
          {player.assists > 0 && <span className="pill pill-blue">A {player.assists}</span>}
        </div>
      )}
    </div>
  );
}

// ---- Main dashboard ----
export default function CoachDashboard({ match, onPlayerSelect, onViewChange }) {
  const gridRef = useRef(null);
  const homeAvg = useMemo(() => getTeamAverages(match.players, match.homeTeam), [match]);
  const awayAvg = useMemo(() => getTeamAverages(match.players, match.awayTeam), [match]);

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll('.player-card-v2');
    gsap.from(cards, {
      opacity: 0, y: 20, stagger: 0.04, duration: 0.45,
      ease: 'power2.out', delay: 0.4,
    });
  }, [match]);

  const homePlayers = match.players.filter(p => p.team === match.homeTeam);
  const awayPlayers = match.players.filter(p => p.team === match.awayTeam);

  function handlePlayerClick(player) {
    onPlayerSelect(player);
    onViewChange('player');
  }

  // Top 3 alerts
  const allPlayers = match.players.filter(p => p.minutesPlayed > 70);
  const mostFatigued = [...allPlayers].sort((a, b) => a.fatigueSig - b.fatigueSig)[0];
  const bestSprinter = [...allPlayers].sort((a, b) => b.sprintValueScore - a.sprintValueScore)[0];
  const topScanner = [...allPlayers].sort((a, b) => b.scanRate - a.scanRate)[0];
  const alerts = [
    mostFatigued && {
      type: 'amber',
      text: `${mostFatigued.name} — Fatigue Signature ${mostFatigued.fatigueSig}% · candidato a sustitución`,
      label: 'FATIGA',
    },
    bestSprinter && {
      type: 'green',
      text: `${bestSprinter.name} lidera sprints de alto valor (${bestSprinter.sprintValueScore}) · vector ofensivo clave`,
      label: 'SPRINT',
    },
    topScanner && {
      type: 'blue',
      text: `${topScanner.name} top Scan Rate del partido (${topScanner.scanRate}/min) · conciencia táctica excepcional`,
      label: 'VISIÓN',
    },
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>

      {/* HERO: Score + Stats comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem' }}>
        <HeroScore match={match} />
        <div className="card" style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '1.5rem 1.75rem',
        }}>
          <div className="section-label">Comparativa de Equipo</div>
          <StatBar
            label="Posesión %"
            homeVal={match.teamStats.home.possession}
            awayVal={match.teamStats.away.possession}
            homeTeam={match.homeTeam} awayTeam={match.awayTeam}
            delay={0.3}
          />
          <StatBar
            label="Tiros al arco"
            homeVal={match.teamStats.home.shotsOnTarget}
            awayVal={match.teamStats.away.shotsOnTarget}
            homeTeam={match.homeTeam} awayTeam={match.awayTeam}
            delay={0.45}
          />
          <StatBar
            label="Pressing events"
            homeVal={match.teamStats.home.pressureEvents}
            awayVal={match.teamStats.away.pressureEvents}
            homeTeam={match.homeTeam} awayTeam={match.awayTeam}
            delay={0.6}
          />
          <StatBar
            label="Pases"
            homeVal={match.teamStats.home.passes}
            awayVal={match.teamStats.away.passes}
            homeTeam={match.homeTeam} awayTeam={match.awayTeam}
            delay={0.75}
          />
        </div>
      </div>

      {/* KPI Team averages — 4 key ones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'SPATIAL AWARENESS', homeV: homeAvg.spatialAwareness, awayV: awayAvg.spatialAwareness, unit: '/100', color: 'var(--accent-green)' },
          { label: 'SPRINT VALUE',      homeV: homeAvg.sprintValueScore,  awayV: awayAvg.sprintValueScore,  unit: ' sprints', color: 'var(--accent-blue)' },
          { label: 'SCAN RATE',         homeV: homeAvg.scanRate,           awayV: awayAvg.scanRate,           unit: '/min',    color: 'var(--accent-amber)' },
          { label: 'FATIGUE SIG.',      homeV: homeAvg.fatigueSig,         awayV: awayAvg.fatigueSig,         unit: '%',       color: 'var(--accent-red)' },
        ].map(kpi => (
          <div key={kpi.label} className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{
              fontSize: '0.55rem', letterSpacing: '0.12em',
              color: 'var(--text-muted)', marginBottom: '0.75rem',
            }}>
              {kpi.label}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{
                  fontFamily: 'JetBrains Mono', fontSize: '1.5rem',
                  fontWeight: 700, color: tc(match.homeTeam),
                }}>
                  {kpi.homeV}
                </span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>{kpi.unit}</span>
              </div>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>vs</span>
              <div>
                <span style={{
                  fontFamily: 'JetBrains Mono', fontSize: '1.5rem',
                  fontWeight: 700, color: tc(match.awayTeam),
                }}>
                  {kpi.awayV}
                </span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>{kpi.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PLAYER GRIDS */}
      <div ref={gridRef}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {[
            { team: match.homeTeam, players: homePlayers },
            { team: match.awayTeam, players: awayPlayers },
          ].map(({ team, players }) => (
            <div key={team}>
              <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: tc(team) }} />
                {team}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '0.6rem',
              }}>
                {players.map((p) => (
                  <PlayerCardV2
                    key={p.name}
                    player={p}
                    onClick={() => handlePlayerClick(p)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TIMELINE — pills */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div className="section-label">Timeline del Partido</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {match.timeline.slice(0, 9).map((ev, i) => {
            const color = EVENT_COLORS[ev.type] || '#9ca3af';
            return (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: `${color}0d`,
                  border: `1px solid ${color}30`,
                  borderRadius: '6px',
                  padding: '0.3rem 0.7rem',
                }}
              >
                <span style={{
                  fontFamily: 'JetBrains Mono', fontSize: '0.68rem',
                  fontWeight: 700, color,
                }}>
                  {ev.minute}'
                </span>
                <span style={{
                  fontSize: '0.68rem', color: 'var(--text-secondary)',
                  maxWidth: '160px', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {ev.description}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ALERTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {alerts.map((a, i) => {
          const colors = {
            green: 'var(--accent-green)',
            amber: 'var(--accent-amber)',
            blue:  'var(--accent-blue)',
            red:   'var(--accent-red)',
          };
          const c = colors[a.type];
          return (
            <div
              key={i}
              style={{
                background: `${c}08`,
                border: `1px solid ${c}25`,
                borderRadius: '10px',
                padding: '0.9rem 1rem',
              }}
            >
              <span
                className="pill"
                style={{
                  background: `${c}15`, color: c,
                  border: `1px solid ${c}30`,
                  marginBottom: '0.5rem',
                  display: 'inline-flex',
                  fontSize: '0.58rem',
                }}
              >
                {a.label}
              </span>
              <p style={{
                fontSize: '0.78rem', color: 'var(--text-secondary)',
                lineHeight: 1.5, margin: 0,
              }}>
                {a.text}
              </p>
            </div>
          );
        })}
      </div>

    </div>
  );
}
