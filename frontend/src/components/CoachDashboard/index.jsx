import React, { useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { getTeamAverages } from '../../data/mockData';

const TEAM_COLORS = {
  'Bayern München': '#E32219', 'Borussia Dortmund': '#FDE047',
  'Bayer Leverkusen': '#E32219', 'RB Leipzig': '#2979FF',
};
const tc = t => TEAM_COLORS[t] || '#E32219';
const EVENT_COLORS = { goal: '#00C853', chance: '#2979FF', pressing: '#FF9800', tactical: '#9C27B0' };

function StatBar({ label, homeVal, awayVal, homeTeam, awayTeam, delay = 0 }) {
  const homeRef = useRef(null);
  const awayRef = useRef(null);
  const max = Math.max(homeVal, awayVal, 1);
  useEffect(() => {
    gsap.fromTo(homeRef.current, { scaleX: 0 }, { scaleX: homeVal / max, duration: 0.7, delay, ease: 'power2.out', transformOrigin: 'left' });
    gsap.fromTo(awayRef.current, { scaleX: 0 }, { scaleX: awayVal / max, duration: 0.7, delay: delay + 0.08, ease: 'power2.out', transformOrigin: 'left' });
  }, [homeVal, awayVal, delay, max]);
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: tc(homeTeam) }}>{homeVal}</span>
        <span style={{ fontSize: '0.58rem', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Inter' }}>{label}</span>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: tc(awayTeam) }}>{awayVal}</span>
      </div>
      <div style={{ display: 'flex', gap: '3px' }}>
        <div style={{ flex: 1, height: '3px', background: '#1c1c1c', borderRadius: '2px 0 0 2px', overflow: 'hidden' }}>
          <div ref={homeRef} style={{ height: '100%', background: tc(homeTeam), transformOrigin: 'left', borderRadius: 'inherit' }} />
        </div>
        <div style={{ flex: 1, height: '3px', background: '#1c1c1c', borderRadius: '0 2px 2px 0', overflow: 'hidden', transform: 'scaleX(-1)' }}>
          <div ref={awayRef} style={{ height: '100%', background: tc(awayTeam), transformOrigin: 'left', borderRadius: 'inherit' }} />
        </div>
      </div>
    </div>
  );
}

function HeroScore({ match }) {
  const homeRef = useRef(null);
  const awayRef = useRef(null);
  const cardRef = useRef(null);
  useEffect(() => {
    gsap.from(cardRef.current, { opacity: 0, y: -10, duration: 0.5, ease: 'power2.out' });
    const ho = { v: 0 }, ao = { v: 0 };
    gsap.to(ho, { v: match.score.home, duration: 0.7, ease: 'power2.out', onUpdate: () => { if (homeRef.current) homeRef.current.textContent = Math.round(ho.v); } });
    gsap.to(ao, { v: match.score.away, duration: 0.7, delay: 0.12, ease: 'power2.out', onUpdate: () => { if (awayRef.current) awayRef.current.textContent = Math.round(ao.v); } });
  }, [match]);
  return (
    <div ref={cardRef} className="card hero-banner" style={{ padding: '2rem 2.5rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(8,8,8,0.93) 0%, rgba(8,8,8,0.72) 100%)', borderRadius: 'inherit' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '0.52rem', letterSpacing: '0.18em', color: '#444', textTransform: 'uppercase', marginBottom: '0.75rem', fontFamily: 'Inter' }}>
          {match.competition} · {match.stadium} · {match.date}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', color: tc(match.homeTeam), letterSpacing: '0.05em' }}>{match.homeTeam}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span ref={homeRef} className="score-hero" style={{ color: '#fff', minWidth: '1ch', textAlign: 'center' }}>0</span>
            <span className="score-hero" style={{ color: '#282828', fontSize: '4rem' }}>—</span>
            <span ref={awayRef} className="score-hero" style={{ color: '#fff', minWidth: '1ch', textAlign: 'center' }}>0</span>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', color: tc(match.awayTeam), letterSpacing: '0.05em' }}>{match.awayTeam}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerCardV2({ player, onClick }) {
  const cardRef = useRef(null);
  const color = tc(player.team);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const enter = () => gsap.to(el, { y: -3, borderColor: `${color}55`, duration: 0.18, ease: 'power2.out' });
    const leave = () => gsap.to(el, { y: 0, borderColor: '#222', duration: 0.18, ease: 'power2.out' });
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    return () => { el.removeEventListener('mouseenter', enter); el.removeEventListener('mouseleave', leave); };
  }, [color]);
  const spatialColor = player.spatialAwareness > 80 ? '#00C853' : player.spatialAwareness > 65 ? '#fff' : '#FF9800';
  const fatigueColor = Math.abs(player.fatigueSig) > 20 ? '#E32219' : Math.abs(player.fatigueSig) > 14 ? '#FF9800' : '#888';
  return (
    <div ref={cardRef} className="player-card-v2" onClick={onClick} style={{ borderLeft: `2px solid ${color}44` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: '#555' }}>#{player.jerseyNumber}</div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.05rem', color: '#fff', letterSpacing: '0.04em', lineHeight: 1.1, marginTop: '0.1rem' }}>
            {player.name.split(' ').slice(-1)[0].toUpperCase()}
          </div>
        </div>
        <span className="pill" style={{ background: `${color}18`, color, border: `1px solid ${color}35`, fontSize: '0.55rem' }}>
          {player.position}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.95rem', fontWeight: 700, color: spatialColor }}>{player.spatialAwareness}</div>
          <div style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.06em' }}>SPA</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.95rem', fontWeight: 700, color: '#2979FF' }}>{player.scanRate}</div>
          <div style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.06em' }}>SCAN</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.95rem', fontWeight: 700, color: fatigueColor }}>{player.fatigueSig}%</div>
          <div style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.06em' }}>FAT</div>
        </div>
      </div>
      {(player.goals > 0 || player.assists > 0) && (
        <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem' }}>
          {player.goals > 0 && <span className="pill pill-green" style={{ fontSize: '0.5rem' }}>⚽ {player.goals}</span>}
          {player.assists > 0 && <span className="pill pill-blue" style={{ fontSize: '0.5rem' }}>A {player.assists}</span>}
        </div>
      )}
    </div>
  );
}

export default function CoachDashboard({ match, onPlayerSelect, onViewChange }) {
  const gridRef = useRef(null);
  const homeAvg = useMemo(() => getTeamAverages(match.players, match.homeTeam), [match]);
  const awayAvg = useMemo(() => getTeamAverages(match.players, match.awayTeam), [match]);
  const homePlayers = match.players.filter(p => p.team === match.homeTeam);
  const awayPlayers = match.players.filter(p => p.team === match.awayTeam);

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll('.player-card-v2');
    gsap.from(cards, { opacity: 0, y: 18, stagger: 0.035, duration: 0.4, ease: 'power2.out', delay: 0.3 });
  }, [match]);

  function handlePlayerClick(player) { onPlayerSelect(player); onViewChange('player'); }

  const allPlayers = match.players.filter(p => p.minutesPlayed > 70);
  const mostFatigued = [...allPlayers].sort((a, b) => a.fatigueSig - b.fatigueSig)[0];
  const bestSprinter = [...allPlayers].sort((a, b) => b.sprintValueScore - a.sprintValueScore)[0];
  const topScanner  = [...allPlayers].sort((a, b) => b.scanRate - a.scanRate)[0];
  const alerts = [
    mostFatigued && { type: 'amber', label: 'FATIGA', text: `${mostFatigued.name} — Fatigue Signature ${mostFatigued.fatigueSig}% · candidato a sustitución` },
    bestSprinter && { type: 'green', label: 'SPRINT', text: `${bestSprinter.name} lidera Sprint Value Score (${bestSprinter.sprintValueScore}) · vector ofensivo clave` },
    topScanner   && { type: 'blue',  label: 'VISIÓN', text: `${topScanner.name} — Scan Rate ${topScanner.scanRate}/min · conciencia táctica excepcional` },
  ].filter(Boolean);
  const alertColors = { green: '#00C853', amber: '#FF9800', blue: '#2979FF', red: '#E32219' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.25rem' }}>
        <HeroScore match={match} />
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="section-label">Comparativa de equipo</div>
          <StatBar label="Posesión %" homeVal={match.teamStats.home.possession} awayVal={match.teamStats.away.possession} homeTeam={match.homeTeam} awayTeam={match.awayTeam} delay={0.25} />
          <StatBar label="Tiros al arco" homeVal={match.teamStats.home.shotsOnTarget} awayVal={match.teamStats.away.shotsOnTarget} homeTeam={match.homeTeam} awayTeam={match.awayTeam} delay={0.38} />
          <StatBar label="Pressing" homeVal={match.teamStats.home.pressureEvents} awayVal={match.teamStats.away.pressureEvents} homeTeam={match.homeTeam} awayTeam={match.awayTeam} delay={0.51} />
          <StatBar label="Pases" homeVal={match.teamStats.home.passes} awayVal={match.teamStats.away.passes} homeTeam={match.homeTeam} awayTeam={match.awayTeam} delay={0.64} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'SPATIAL AWARENESS', hv: homeAvg.spatialAwareness, av: awayAvg.spatialAwareness, unit: '/100' },
          { label: 'SPRINT VALUE',      hv: homeAvg.sprintValueScore,  av: awayAvg.sprintValueScore,  unit: 'spr' },
          { label: 'SCAN RATE',         hv: homeAvg.scanRate,           av: awayAvg.scanRate,           unit: '/min' },
          { label: 'FATIGUE SIG.',      hv: homeAvg.fatigueSig,         av: awayAvg.fatigueSig,         unit: '%' },
        ].map(kpi => (
          <div key={kpi.label} className="card" style={{ padding: '1rem 1.2rem' }}>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.14em', color: '#555', marginBottom: '0.65rem', fontFamily: 'Inter' }}>{kpi.label}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', color: tc(match.homeTeam) }}>{kpi.hv}</span>
                <span style={{ fontSize: '0.55rem', color: '#555', marginLeft: '0.2rem' }}>{kpi.unit}</span>
              </div>
              <span style={{ fontSize: '0.6rem', color: '#2a2a2a' }}>vs</span>
              <div>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', color: tc(match.awayTeam) }}>{kpi.av}</span>
                <span style={{ fontSize: '0.55rem', color: '#555', marginLeft: '0.2rem' }}>{kpi.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {[{ team: match.homeTeam, players: homePlayers }, { team: match.awayTeam, players: awayPlayers }].map(({ team, players }) => (
          <div key={team}>
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: tc(team), flexShrink: 0 }} />
              {team}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: '0.6rem' }}>
              {players.map(p => <PlayerCardV2 key={p.name} player={p} onClick={() => handlePlayerClick(p)} />)}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-label">Timeline del Partido</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          {match.timeline.slice(0, 9).map((ev, i) => {
            const c = EVENT_COLORS[ev.type] || '#555';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: `${c}0e`, border: `1px solid ${c}28`, borderRadius: '5px', padding: '0.28rem 0.65rem' }}>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.85rem', color: c, letterSpacing: '0.04em' }}>{ev.minute}'</span>
                <span style={{ fontSize: '0.68rem', color: '#888', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.description}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {alerts.map((a, i) => {
          const c = alertColors[a.type];
          return (
            <div key={i} style={{ background: `${c}08`, border: `1px solid ${c}22`, borderRadius: '10px', padding: '1rem 1.1rem' }}>
              <span className="pill" style={{ background: `${c}18`, color: c, border: `1px solid ${c}30`, marginBottom: '0.6rem', display: 'inline-flex', fontSize: '0.55rem' }}>{a.label}</span>
              <p style={{ fontSize: '0.78rem', color: '#aaa', lineHeight: 1.55, margin: 0 }}>{a.text}</p>
            </div>
          );
        })}
      </div>

    </div>
  );
}
