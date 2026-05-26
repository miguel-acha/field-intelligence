import React, { useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { getTeamAverages } from '../../data/mockData';

const TEAM_COLORS = {
  'Bayern München': '#E32219', 'Borussia Dortmund': '#F5C518',
  'Bayer Leverkusen': '#E32219', 'RB Leipzig': '#2979FF',
};
const tc = t => TEAM_COLORS[t] || '#E32219';

const MATCH_INSIGHTS = {
  1: 'El eje Müller–Kimmich generó 8 transiciones en campo rival durante el segundo tiempo. Dortmund no pudo sostener el pressing después del min 60.',
  2: 'Leverkusen impuso su pressing alto. Wirtz resolvió 3 situaciones de 1vs2 — el desequilibrante del partido.',
  3: 'Dortmund capitalizó transiciones en banda. Adeyemi completó 4 sprints de alto valor en 45 minutos.',
  4: 'Leipzig recuperó 14 balones en campo rival. El pressing coordinado de Sesko y Simons fue la clave táctica.',
  5: 'Dortmund ganó la batalla física en zona media. Hummels lideró con 6 intercepciones en el primer tiempo.',
};

function getTopPerformers(players, team, n = 4) {
  return players
    .filter(p => p.team === team && p.minutesPlayed > 30)
    .map(p => ({
      ...p,
      _score:
        (p.spatialAwareness || 0) * 0.3 +
        (p.scanRate || 0) * 6 +
        (p.sprintValueScore || 0) * 2.5 +
        (p.positioningEPA || 0) * 12 +
        (p.goals || 0) * 30 +
        (p.assists || 0) * 18,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, n);
}

function getSubCandidate(players) {
  return [...players]
    .filter(p => p.minutesPlayed > 65 && p.position !== 'GK')
    .sort((a, b) => a.fatigueSig - b.fatigueSig)[0];
}

/* ─── Stat bar ─── */
function StatRow({ label, homeVal, awayVal, homeColor, awayColor }) {
  const homeRef = useRef(null);
  const awayRef = useRef(null);
  const total = (homeVal || 0) + (awayVal || 0) || 1;

  useEffect(() => {
    gsap.fromTo(homeRef.current,
      { width: '0%' },
      { width: `${(homeVal / total) * 100}%`, duration: 0.85, ease: 'power2.out', delay: 0.5 }
    );
    gsap.fromTo(awayRef.current,
      { width: '0%' },
      { width: `${(awayVal / total) * 100}%`, duration: 0.85, ease: 'power2.out', delay: 0.6 }
    );
  }, [homeVal, awayVal, total]);

  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{homeVal}</span>
        <span style={{ fontSize: '0.52rem', color: '#666', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Inter' }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{awayVal}</span>
      </div>
      <div style={{ display: 'flex', gap: 2, height: 2 }}>
        <div style={{ flex: 1, background: '#1e1e1e', borderRadius: '2px 0 0 2px', overflow: 'hidden', display: 'flex', justifyContent: 'flex-end' }}>
          <div ref={homeRef} style={{ height: '100%', background: homeColor }} />
        </div>
        <div style={{ flex: 1, background: '#1e1e1e', borderRadius: '0 2px 2px 0', overflow: 'hidden' }}>
          <div ref={awayRef} style={{ height: '100%', background: awayColor }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Performer row ─── */
function PerformerRow({ player, rank, onClick }) {
  const rowRef = useRef(null);
  const color = tc(player.team);
  const fatigueAbs = Math.abs(player.fatigueSig);
  const fatigueColor = fatigueAbs > 20 ? '#E32219' : fatigueAbs > 14 ? '#FF9800' : '#888';

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const on = () => gsap.to(el, { background: 'rgba(255,255,255,0.05)', duration: 0.15 });
    const off = () => gsap.to(el, { background: 'transparent', duration: 0.15 });
    el.addEventListener('mouseenter', on);
    el.addEventListener('mouseleave', off);
    return () => { el.removeEventListener('mouseenter', on); el.removeEventListener('mouseleave', off); };
  }, []);

  return (
    <div
      ref={rowRef}
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '20px 1fr 38px 60px 56px 56px',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.6rem 0.75rem',
        borderRadius: 6,
        cursor: 'pointer',
        borderBottom: '1px solid #111',
      }}
    >
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: rank === 1 ? color : '#444', textAlign: 'center' }}>
        {rank}
      </span>
      <div>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: '#fff', letterSpacing: '0.04em', lineHeight: 1.1 }}>
          {player.name.split(' ').slice(-1)[0].toUpperCase()}
        </div>
        <div style={{ fontSize: '0.52rem', color: '#666', letterSpacing: '0.04em', marginTop: '0.1rem', fontFamily: 'Inter', display: 'flex', gap: '0.4rem' }}>
          <span>#{player.jerseyNumber}</span>
          <span>{player.minutesPlayed}'</span>
          {player.goals > 0 && <span style={{ color: '#00C853' }}>+{player.goals}G</span>}
          {player.assists > 0 && <span style={{ color: '#2979FF' }}>+{player.assists}A</span>}
        </div>
      </div>
      <span style={{ fontSize: '0.6rem', fontFamily: 'Inter', fontWeight: 700, color, letterSpacing: '0.03em' }}>
        {player.position}
      </span>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem', fontWeight: 700, color: player.spatialAwareness > 80 ? '#00C853' : '#ccc' }}>
          {player.spatialAwareness}
        </div>
        <div style={{ fontSize: '0.44rem', color: '#555', letterSpacing: '0.08em', marginTop: '0.1rem' }}>VISIÓN</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem', fontWeight: 700, color: '#2979FF' }}>
          {player.scanRate}
        </div>
        <div style={{ fontSize: '0.44rem', color: '#555', letterSpacing: '0.08em', marginTop: '0.1rem' }}>SCAN/m</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem', fontWeight: 700, color: fatigueColor }}>
          {player.fatigueSig}%
        </div>
        <div style={{ fontSize: '0.44rem', color: '#555', letterSpacing: '0.08em', marginTop: '0.1rem' }}>FATIGA</div>
      </div>
    </div>
  );
}

export default function CoachDashboard({ match, onPlayerSelect, onViewChange }) {
  const heroRef   = useRef(null);
  const homeRef   = useRef(null);
  const awayRef   = useRef(null);
  const bodyRef   = useRef(null);

  const homeTop      = useMemo(() => getTopPerformers(match.players, match.homeTeam), [match]);
  const awayTop      = useMemo(() => getTopPerformers(match.players, match.awayTeam), [match]);
  const subCandidate = useMemo(() => getSubCandidate(match.players), [match]);
  const insight      = MATCH_INSIGHTS[match.id] || MATCH_INSIGHTS[1];

  const homeColor = tc(match.homeTeam);
  const awayColor = tc(match.awayTeam);
  const stats     = match.teamStats;

  useEffect(() => {
    gsap.from(heroRef.current, { opacity: 0, y: -18, duration: 0.6, ease: 'power3.out' });
    const ho = { v: 0 }, ao = { v: 0 };
    gsap.to(ho, {
      v: match.score.home, duration: 0.75, delay: 0.35, ease: 'power2.out',
      onUpdate: () => { if (homeRef.current) homeRef.current.textContent = Math.round(ho.v); },
    });
    gsap.to(ao, {
      v: match.score.away, duration: 0.75, delay: 0.5, ease: 'power2.out',
      onUpdate: () => { if (awayRef.current) awayRef.current.textContent = Math.round(ao.v); },
    });
    if (bodyRef.current) {
      gsap.from([...bodyRef.current.children], { opacity: 0, y: 20, stagger: 0.09, duration: 0.5, delay: 0.55, ease: 'power2.out' });
    }
  }, [match]);

  function go(p) { onPlayerSelect(p); onViewChange('player'); }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>

      {/* ══ HERO ══ */}
      <div ref={heroRef} style={{
        padding: '2.75rem 2.5rem 2rem',
        borderBottom: '1px solid #1c1c1c',
        background: 'linear-gradient(180deg, rgba(30,10,10,0.9) 0%, transparent 100%)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.52rem', color: '#555', letterSpacing: '0.22em', fontFamily: 'Inter', textTransform: 'uppercase' }}>
            {match.competition}&nbsp;·&nbsp;{match.stadium}&nbsp;·&nbsp;{match.date}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3rem' }}>
          <div style={{ textAlign: 'right', flex: 1 }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(1.1rem, 2.5vw, 1.8rem)', color: homeColor, letterSpacing: '0.06em' }}>
              {match.homeTeam}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span ref={homeRef} style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(4.5rem, 8vw, 6.5rem)', color: '#fff', lineHeight: 0.9 }}>0</span>
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.5rem', color: '#222', lineHeight: 1 }}>—</span>
            <span ref={awayRef} style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(4.5rem, 8vw, 6.5rem)', color: '#fff', lineHeight: 0.9 }}>0</span>
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(1.1rem, 2.5vw, 1.8rem)', color: awayColor, letterSpacing: '0.06em' }}>
              {match.awayTeam}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.5rem', color: '#E32219', letterSpacing: '0.18em', fontFamily: 'Inter', fontWeight: 700, paddingTop: '0.18rem', flexShrink: 0 }}>AI</span>
          <span style={{ fontSize: '0.82rem', color: '#999', fontFamily: 'Inter', lineHeight: 1.6, maxWidth: 560 }}>
            {insight}
          </span>
        </div>
      </div>

      <div ref={bodyRef}>

        {/* ══ PROTAGONISTS + STATS ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', borderBottom: '1px solid #1c1c1c' }}>

          {/* Left: rows */}
          <div style={{ padding: '1.75rem 1.5rem', borderRight: '1px solid #1c1c1c' }}>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 38px 60px 56px 56px', gap: '0.6rem', padding: '0 0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
              <div />
              <span className="section-label" style={{ margin: 0 }}>Protagonistas</span>
              <div />
              <span style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.1em', fontFamily: 'Inter', textAlign: 'center' }}>VISIÓN</span>
              <span style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.1em', fontFamily: 'Inter', textAlign: 'center' }}>SCAN/m</span>
              <span style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.1em', fontFamily: 'Inter', textAlign: 'center' }}>FATIGA</span>
            </div>

            {/* Home */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', marginBottom: '0.25rem' }}>
              <div style={{ width: 3, height: 12, background: homeColor, borderRadius: 2 }} />
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.72rem', color: homeColor, letterSpacing: '0.1em' }}>
                {match.homeTeam.toUpperCase()}
              </span>
            </div>
            {homeTop.map((p, i) => <PerformerRow key={p.name} player={p} rank={i + 1} onClick={() => go(p)} />)}

            {/* VS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.75rem 0.75rem' }}>
              <div style={{ flex: 1, height: 1, background: '#1c1c1c' }} />
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.65rem', color: '#333', letterSpacing: '0.14em' }}>VS</span>
              <div style={{ flex: 1, height: 1, background: '#1c1c1c' }} />
            </div>

            {/* Away */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', marginBottom: '0.25rem' }}>
              <div style={{ width: 3, height: 12, background: awayColor, borderRadius: 2 }} />
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.72rem', color: awayColor, letterSpacing: '0.1em' }}>
                {match.awayTeam.toUpperCase()}
              </span>
            </div>
            {awayTop.map((p, i) => <PerformerRow key={p.name} player={p} rank={i + 1} onClick={() => go(p)} />)}
          </div>

          {/* Right: stats */}
          <div style={{ padding: '1.75rem 1.5rem' }}>
            <span className="section-label" style={{ display: 'block', marginBottom: '1.5rem' }}>Comparativa</span>
            <StatRow label="Posesión %"    homeVal={stats.home.possession}     awayVal={stats.away.possession}     homeColor={homeColor} awayColor={awayColor} />
            <StatRow label="Tiros al arco" homeVal={stats.home.shotsOnTarget}  awayVal={stats.away.shotsOnTarget}  homeColor={homeColor} awayColor={awayColor} />
            <StatRow label="Pressing"      homeVal={stats.home.pressureEvents} awayVal={stats.away.pressureEvents} homeColor={homeColor} awayColor={awayColor} />
            <StatRow label="Pases"         homeVal={stats.home.passes}         awayVal={stats.away.passes}         homeColor={homeColor} awayColor={awayColor} />
            <StatRow label="Faltas"        homeVal={stats.home.fouls}          awayVal={stats.away.fouls}          homeColor={homeColor} awayColor={awayColor} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #1c1c1c' }}>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.7rem', color: homeColor, letterSpacing: '0.08em' }}>
                {match.homeTeam.split(' ').slice(-1)[0]}
              </span>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.7rem', color: awayColor, letterSpacing: '0.08em' }}>
                {match.awayTeam.split(' ').slice(-1)[0]}
              </span>
            </div>
          </div>
        </div>

        {/* ══ SUBSTITUTION ALERT ══ */}
        {subCandidate && (
          <div style={{
            padding: '0.9rem 2rem',
            borderBottom: '1px solid #1c1c1c',
            display: 'flex', alignItems: 'center', gap: '1.25rem',
            background: 'rgba(255,152,0,0.04)',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF9800', flexShrink: 0, boxShadow: '0 0 10px rgba(255,152,0,0.6)' }} />
            <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.62rem', color: '#FF9800', letterSpacing: '0.14em', flexShrink: 0 }}>
              SUSTITUCIÓN
            </span>
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.05rem', color: '#fff', letterSpacing: '0.05em', flexShrink: 0 }}>
              {subCandidate.name.split(' ').slice(-1)[0].toUpperCase()}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#777', flex: 1 }}>
              Fatigue {subCandidate.fatigueSig}% · {subCandidate.minutesPlayed}' jugados · {subCandidate.position} · {subCandidate.team.split(' ').slice(-1)[0]}
            </span>
            <button
              onClick={() => go(subCandidate)}
              style={{ background: 'transparent', border: '1px solid #333', borderRadius: 5, padding: '0.28rem 0.7rem', color: '#777', fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'Inter', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF9800'; e.currentTarget.style.color = '#FF9800'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#777'; }}
            >
              Ver perfil →
            </button>
          </div>
        )}

        {/* ══ TIMELINE ══ */}
        <div style={{ padding: '1.5rem 2rem' }}>
          <span className="section-label" style={{ display: 'block', marginBottom: '1.25rem' }}>Timeline del partido</span>

          <div style={{ position: 'relative', height: 36, marginBottom: '1rem' }}>
            <div style={{ position: 'absolute', top: 7, left: 0, right: 0, height: 1, background: '#1c1c1c' }} />
            {[0, 15, 30, 45, 60, 75, 90].map(t => (
              <div key={t} style={{ position: 'absolute', left: `${(t / 90) * 100}%`, top: 0, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 1, height: 10, background: '#252525' }} />
                <span style={{ fontSize: '0.44rem', color: '#444', fontFamily: 'JetBrains Mono' }}>{t}'</span>
              </div>
            ))}
            {match.timeline.slice(0, 10).map((ev, i) => {
              const c = { goal: '#00C853', chance: '#2979FF', pressing: '#FF9800', tactical: '#555' }[ev.type] || '#444';
              const isGoal = ev.type === 'goal';
              return (
                <div key={i} title={`${ev.minute}' — ${ev.description}`} style={{
                  position: 'absolute', left: `${(ev.minute / 90) * 100}%`, top: isGoal ? -1 : 2,
                  transform: 'translateX(-50%)',
                  width: isGoal ? 14 : 8, height: isGoal ? 14 : 8,
                  borderRadius: '50%', background: c,
                  boxShadow: isGoal ? `0 0 14px ${c}99` : 'none',
                  border: `1px solid ${c}`, zIndex: isGoal ? 2 : 1,
                }} />
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {match.timeline.filter(ev => ev.type === 'goal').slice(0, 5).map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.22rem 0.55rem', background: 'rgba(0,200,83,0.06)', border: '1px solid rgba(0,200,83,0.18)', borderRadius: 4 }}>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.82rem', color: '#00C853' }}>{ev.minute}'</span>
                <span style={{ fontSize: '0.62rem', color: '#888', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.description}</span>
              </div>
            ))}
            {match.timeline.filter(ev => ev.type !== 'goal').slice(0, 3).map((ev, i) => {
              const c = { chance: '#2979FF', pressing: '#FF9800', tactical: '#666' }[ev.type] || '#555';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.22rem 0.55rem', background: `${c}0a`, border: `1px solid ${c}22`, borderRadius: 4 }}>
                  <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.82rem', color: c }}>{ev.minute}'</span>
                  <span style={{ fontSize: '0.62rem', color: '#888', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.description}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
