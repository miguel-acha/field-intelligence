import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { getTeamAverages } from '../../data/mockData';
import { queryAnalyst } from '../../services/claude';

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

/* ─── Stat bar — prominent version ─── */
function StatRow({ label, homeVal, awayVal, homeColor, awayColor }) {
  const barRef = useRef(null);
  const total = (homeVal || 0) + (awayVal || 0) || 1;
  const homePct = (homeVal / total) * 100;

  useEffect(() => {
    gsap.fromTo(barRef.current,
      { width: '50%' },
      { width: `${homePct}%`, duration: 1, ease: 'power3.out', delay: 0.3, overwrite: true }
    );
  }, [homeVal, homePct]);

  const homeWins = homeVal > awayVal;
  const awayWins = awayVal > homeVal;

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{
          fontFamily: 'JetBrains Mono', fontSize: '1.4rem', fontWeight: 700,
          color: homeWins ? homeColor : '#fff',
        }}>{homeVal}</span>
        <span style={{ fontSize: '0.5rem', color: '#666', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Inter' }}>{label}</span>
        <span style={{
          fontFamily: 'JetBrains Mono', fontSize: '1.4rem', fontWeight: 700,
          color: awayWins ? awayColor : '#fff',
        }}>{awayVal}</span>
      </div>
      {/* Single bar showing home % */}
      <div style={{ height: 3, background: '#1c1c1c', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        <div ref={barRef} style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: homeColor, borderRadius: 2 }} />
        {/* Away color on the right */}
        <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: `${100 - homePct}%`, background: awayColor, borderRadius: 2 }} />
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

/* ─── Match Timeline ─── */
const EVT_COLORS = { goal: '#00C853', chance: '#2979FF', pressing: '#FF9800', tactical: '#555' };
const hexRgb = h => { const c = h.replace('#',''); return `${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)}`; };

function GoalCard({ ev }) {
  const ref = useRef(null);
  const score = ev.description.match(/(\d+[-–]\d+)/)?.[1] || '';
  const detail = ev.description.replace(/.*\d+[-–]\d+\s*[—–\-]+\s*/, '').trim();
  useEffect(() => {
    if (!ref.current) return;
    const on = () => gsap.to(ref.current, { y: -2, duration: 0.12, ease: 'power2.out' });
    const off = () => gsap.to(ref.current, { y: 0, duration: 0.12, ease: 'power2.in' });
    ref.current.addEventListener('mouseenter', on);
    ref.current.addEventListener('mouseleave', off);
    return () => { ref.current?.removeEventListener('mouseenter', on); ref.current?.removeEventListener('mouseleave', off); };
  }, []);
  return (
    <div ref={ref} style={{
      display: 'flex', alignItems: 'center', gap: '0.65rem',
      padding: '0.5rem 1rem', borderRadius: 6, cursor: 'default',
      background: 'rgba(0,200,83,0.05)', border: '1px solid rgba(0,200,83,0.18)',
      minWidth: 160,
    }}>
      <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: '#00C853', letterSpacing: '0.04em', flexShrink: 0 }}>{ev.minute}'</span>
      <div style={{ width: 1, height: 18, background: '#1c1c1c', flexShrink: 0 }} />
      {score && <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.1rem', color: '#fff', letterSpacing: '0.06em', flexShrink: 0 }}>{score}</span>}
      <span style={{ fontSize: '0.6rem', color: '#777', fontFamily: 'Inter', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{detail}</span>
    </div>
  );
}

function MatchTimeline({ match, homeColor, awayColor }) {
  const trackRef   = useRef(null);
  const halfRef    = useRef(null);
  const dotsRef    = useRef([]);
  const cardsRef   = useRef(null);
  const [activeEv, setActiveEv] = useState(null);
  const events = useMemo(() => match.timeline.slice(0, 14), [match]);
  const goals  = useMemo(() => events.filter(e => e.type === 'goal'), [events]);

  useEffect(() => {
    dotsRef.current = dotsRef.current.slice(0, events.length);
    gsap.fromTo(trackRef.current,
      { scaleX: 0, transformOrigin: 'left center' },
      { scaleX: 1, duration: 1.0, ease: 'power3.out', overwrite: true }
    );
    gsap.fromTo(halfRef.current,
      { scaleY: 0, transformOrigin: 'top center' },
      { scaleY: 1, duration: 0.45, delay: 0.6, ease: 'power2.out', overwrite: true }
    );
    const dots = dotsRef.current.filter(Boolean);
    gsap.fromTo(dots,
      { scale: 0, transformOrigin: 'center center' },
      { scale: 1, stagger: { amount: 0.65, from: 'start' }, duration: 0.32, ease: 'back.out(2)', delay: 0.4, overwrite: true }
    );
    events.forEach((ev, i) => {
      if (ev.type !== 'goal' || !dotsRef.current[i]) return;
      gsap.to(dotsRef.current[i], {
        boxShadow: '0 0 14px #00C85388, 0 0 28px #00C85322',
        repeat: -1, yoyo: true, duration: 1.2, ease: 'sine.inOut', delay: 1.0 + i * 0.1,
      });
    });
    if (cardsRef.current?.children.length) {
      gsap.fromTo([...cardsRef.current.children],
        { y: 6, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.07, duration: 0.3, ease: 'power2.out', delay: 1.2, overwrite: true }
      );
    }
  }, [match]);

  function enterDot(i, ev) {
    const dot = dotsRef.current[i];
    if (dot) gsap.to(dot, { scale: ev.type === 'goal' ? 1.45 : 1.6, duration: 0.14, ease: 'power2.out' });
    setActiveEv(ev);
  }
  function leaveDot(i) {
    const dot = dotsRef.current[i];
    if (dot) gsap.to(dot, { scale: 1, duration: 0.14, ease: 'power2.in' });
    setActiveEv(null);
  }

  return (
    <div style={{ padding: '0.9rem 2.5rem 1rem', borderBottom: '1px solid #1c1c1c', background: '#090909' }}>

      {/* ── Track area ── */}
      <div style={{ position: 'relative', height: 72 }}>

        {/* Home / Away zone fills */}
        <div style={{ position: 'absolute', top: '50%', left: 0, width: '50%', height: 32, transform: 'translateY(-50%)', background: `linear-gradient(90deg, transparent 0%, ${homeColor}0e 100%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', right: 0, width: '50%', height: 32, transform: 'translateY(-50%)', background: `linear-gradient(270deg, transparent 0%, ${awayColor}0e 100%)`, pointerEvents: 'none' }} />

        {/* Track */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: '#1a1a1a', transform: 'translateY(-50%)', borderRadius: 2 }} />
        <div ref={trackRef} style={{
          position: 'absolute', top: '50%', left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${homeColor}60 0%, #303030 43%, #303030 57%, ${awayColor}60 100%)`,
          transform: 'translateY(-50%)', borderRadius: 2,
        }} />

        {/* Minute ticks at bottom */}
        {[0, 15, 30, 45, 60, 75, 90].map(t => (
          <div key={t} style={{ position: 'absolute', left: `${(t / 90) * 100}%`, bottom: 0, transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: '0.38rem', color: t === 45 ? '#3a3a3a' : '#252525', fontFamily: 'JetBrains Mono', display: 'block' }}>{t}'</span>
          </div>
        ))}

        {/* Half-time divider */}
        <div ref={halfRef} style={{ position: 'absolute', left: '50%', top: '15%', bottom: '20%', width: 1, background: '#282828', transform: 'translateX(-50%)' }}>
          <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontSize: '0.36rem', color: '#333', fontFamily: 'Inter', whiteSpace: 'nowrap', letterSpacing: '0.08em' }}>HT</span>
        </div>

        {/* Team watermarks */}
        <span style={{ position: 'absolute', left: '23%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.44rem', color: homeColor + '28', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.14em', pointerEvents: 'none' }}>
          {match.homeTeam.split(' ').pop().toUpperCase()}
        </span>
        <span style={{ position: 'absolute', right: '23%', top: '50%', transform: 'translate(50%, -50%)', fontSize: '0.44rem', color: awayColor + '28', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.14em', pointerEvents: 'none' }}>
          {match.awayTeam.split(' ').pop().toUpperCase()}
        </span>

        {/* All event dots */}
        {events.map((ev, i) => {
          const c = EVT_COLORS[ev.type] || '#444';
          const isGoal = ev.type === 'goal';
          const score = isGoal ? ev.description.match(/(\d+[-–]\d+)/)?.[1] : null;
          return (
            <div key={i} style={{
              position: 'absolute',
              left: `${(ev.minute / 90) * 100}%`,
              top: isGoal ? 'calc(50% - 20px)' : '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              zIndex: isGoal ? 4 : 2,
            }}>
              {/* Score label above goal dots */}
              {isGoal && score && (
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.58rem', color: '#00C853', letterSpacing: '0.06em', whiteSpace: 'nowrap', lineHeight: 1 }}>
                  {score}
                </span>
              )}
              <div
                ref={el => { dotsRef.current[i] = el; }}
                onMouseEnter={() => enterDot(i, ev)}
                onMouseLeave={() => leaveDot(i)}
                style={{
                  width: isGoal ? 17 : 9, height: isGoal ? 17 : 9,
                  borderRadius: '50%', background: c,
                  border: `2px solid ${c}77`, cursor: 'pointer',
                }}
              />
              {/* Connector line from goal dot to track */}
              {isGoal && <div style={{ width: 1, height: 6, background: '#00C85344', marginTop: 1 }} />}
            </div>
          );
        })}
      </div>

      {/* ── Status bar — replaces floating tooltip ── */}
      <div style={{ height: 26, display: 'flex', alignItems: 'center', padding: '0 0.1rem', borderBottom: '1px solid #111', marginBottom: '0.85rem' }}>
        {activeEv ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.95rem', color: EVT_COLORS[activeEv.type] || '#666', letterSpacing: '0.04em' }}>{activeEv.minute}'</span>
            <div style={{ width: 1, height: 14, background: '#2a2a2a' }} />
            <span style={{ fontSize: '0.44rem', color: EVT_COLORS[activeEv.type] || '#666', fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {{ goal:'Gol', chance:'Remate', pressing:'Pressing', tactical:'Táctica' }[activeEv.type] || activeEv.type}
            </span>
            <div style={{ width: 1, height: 14, background: '#2a2a2a' }} />
            <span style={{ fontSize: '0.65rem', color: '#aaa', fontFamily: 'Inter' }}>{activeEv.description.replace(/.*\d+[-–]\d+\s*[—–\-]+\s*/, '').trim()}</span>
          </div>
        ) : (
          <span style={{ fontSize: '0.4rem', color: '#252525', fontFamily: 'Inter', letterSpacing: '0.14em' }}>
            PASÁ EL CURSOR SOBRE UN EVENTO
          </span>
        )}
      </div>

      {/* ── Goal cards — centered ── */}
      {goals.length > 0 && (
        <div ref={cardsRef} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {goals.map((ev, i) => <GoalCard key={i} ev={ev} />)}
        </div>
      )}
    </div>
  );
}

export default function CoachDashboard({ match, onPlayerSelect, onViewChange }) {
  const heroRef   = useRef(null);
  const homeRef   = useRef(null);
  const awayRef   = useRef(null);
  const bodyRef   = useRef(null);

  const [aiText, setAiText]           = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiDone, setAiDone]           = useState(false);
  const aiScrollRef    = useRef(null);
  const aiSpotRef      = useRef(null);
  const aiPulseRef     = useRef(null);
  const ballRef        = useRef(null);
  const flashHomeRef   = useRef(null);
  const flashAwayRef   = useRef(null);

  const homeTop      = useMemo(() => getTopPerformers(match.players, match.homeTeam), [match]);
  const awayTop      = useMemo(() => getTopPerformers(match.players, match.awayTeam), [match]);
  const subCandidate = useMemo(() => getSubCandidate(match.players), [match]);
  const insight      = MATCH_INSIGHTS[match.id] || MATCH_INSIGHTS[1];

  const homeColor = tc(match.homeTeam);
  const awayColor = tc(match.awayTeam);
  const stats     = match.teamStats;

  const runBallAnim = useCallback(() => {
    const ball = ballRef.current;
    if (!ball) return;
    // Ball floats behind the score as a persistent ambient decoration
    gsap.set(ball, { opacity: 0, scale: 0, rotation: 0 });
    gsap.to(ball, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out', delay: 0.5 });
    // Continuous slow rotation
    gsap.to(ball, { rotation: 360, duration: 14, ease: 'none', repeat: -1, delay: 0.5 });
    // Gentle floating pulse (scale + y drift)
    gsap.to(ball, { y: -12, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.5 });
    gsap.to(ball, { scale: 1.06, duration: 4.5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.5 });
  }, []);

  useEffect(() => {
    // Hero fade-in — use fromTo so final state is always explicit
    gsap.fromTo(heroRef.current,
      { opacity: 0, y: -14 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', overwrite: true }
    );
    // Score count-up
    const ho = { v: 0 }, ao = { v: 0 };
    gsap.to(ho, {
      v: match.score.home, duration: 0.8, ease: 'power2.out', overwrite: true,
      onUpdate: () => { if (homeRef.current) homeRef.current.textContent = Math.round(ho.v); },
    });
    gsap.to(ao, {
      v: match.score.away, duration: 0.8, delay: 0.12, ease: 'power2.out', overwrite: true,
      onUpdate: () => { if (awayRef.current) awayRef.current.textContent = Math.round(ao.v); },
    });
    runBallAnim();
    // Body slide in
    if (bodyRef.current) {
      gsap.fromTo(
        [...bodyRef.current.children],
        { y: 14 },
        { y: 0, stagger: 0.07, duration: 0.4, ease: 'power2.out', overwrite: true }
      );
    }
  }, [match]);

  useEffect(() => {
    setAiText(''); setAiDone(false);
  }, [match]);

  useEffect(() => {
    if (aiScrollRef.current && aiText) {
      gsap.to(aiScrollRef.current, { scrollTop: aiScrollRef.current.scrollHeight, duration: 0.3, ease: 'power2.out', overwrite: true });
    }
  }, [aiText]);

  useEffect(() => {
    if (!aiSpotRef.current) return;
    if (isAnalyzing) {
      aiPulseRef.current = gsap.to(aiSpotRef.current, { boxShadow: '0 0 50px rgba(227,34,25,0.12)', repeat: -1, yoyo: true, duration: 1.3, ease: 'sine.inOut' });
    } else {
      if (aiPulseRef.current) aiPulseRef.current.kill();
      gsap.to(aiSpotRef.current, { boxShadow: 'none', duration: 0.4 });
    }
  }, [isAnalyzing]);

  const handleMatchAnalyze = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true); setAiText(''); setAiDone(false);
    const question = `Analiza en profundidad este partido. Explica por qué ${match.score.home > match.score.away ? match.homeTeam : match.awayTeam} ganó, qué factores tácticos y físicos determinaron el resultado, y cuáles fueron los jugadores decisivos según los datos 3D. Sé específico con los KPIs.`;
    try {
      await queryAnalyst(question, match, chunk => setAiText(prev => prev + chunk));
      setAiDone(true);
    } catch {
      setAiText('Error al conectar con el servicio de IA.');
    } finally { setIsAnalyzing(false); }
  }, [match, isAnalyzing]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            {/* ── Ambient ball — decorative background, floats behind score ── */}
            <div ref={ballRef} style={{
              position: 'absolute', left: '50%', top: '50%',
              width: 110, height: 110, borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle at 38% 34%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, transparent 70%)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: 'inset 0 0 30px rgba(255,255,255,0.03)',
              opacity: 0, zIndex: 0, pointerEvents: 'none',
            }}>
              {/* Ball panel lines */}
              <svg viewBox="0 0 110 110" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18 }}>
                <circle cx="55" cy="55" r="52" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                <path d="M55 3 C30 20 20 50 30 75 C40 95 70 100 82 85 C95 68 92 38 75 20 Z" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                <path d="M3 55 C18 35 45 25 68 32 C88 40 95 65 85 82 C70 98 40 97 22 82 Z" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                <circle cx="55" cy="55" r="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              </svg>
            </div>
            <span ref={homeRef} style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(4.5rem, 8vw, 6.5rem)', color: '#fff', lineHeight: 0.9, display: 'inline-block', position: 'relative', zIndex: 1 }}>0</span>
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.5rem', color: '#222', lineHeight: 1, position: 'relative', zIndex: 1 }}>—</span>
            <span ref={awayRef} style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(4.5rem, 8vw, 6.5rem)', color: '#fff', lineHeight: 0.9, display: 'inline-block', position: 'relative', zIndex: 1 }}>0</span>
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

      {/* ══ TIMELINE — animated match timeline ══ */}
      <MatchTimeline match={match} homeColor={homeColor} awayColor={awayColor} />

      {/* ══ AI MATCH ANALYSIS ══ */}
      <div ref={aiSpotRef} style={{
        padding: '1.75rem 2.5rem',
        borderBottom: '1px solid #1c1c1c',
        background: 'linear-gradient(180deg, rgba(227,34,25,0.03) 0%, transparent 70%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiText || isAnalyzing ? '1.25rem' : 0, gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.46rem', color: '#E32219', letterSpacing: '0.2em', fontFamily: 'Inter', fontWeight: 700, marginBottom: '0.25rem' }}>OPENCAMBA AI</div>
            <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', letterSpacing: '0.06em', color: '#fff', margin: 0, lineHeight: 1 }}>
              Análisis del Partido
            </h3>
          </div>
          <button className="btn-primary" onClick={handleMatchAnalyze} disabled={isAnalyzing} style={{ flexShrink: 0 }}>
            {isAnalyzing ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Analizando...
              </>
            ) : aiDone ? '↻ Re-analizar' : '✦ Analizar con IA'}
          </button>
        </div>

        {!aiText && !isAnalyzing && (
          <p style={{ fontSize: '0.72rem', color: '#333', margin: 0, fontFamily: 'Inter' }}>
            Presioná <strong style={{ color: '#E32219' }}>Analizar con IA</strong> para el informe táctico completo del partido — factores determinantes, jugadores clave y datos 3D.
          </p>
        )}

        {(aiText || isAnalyzing) && (
          <div ref={aiScrollRef} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '1.1rem 1.4rem', borderLeft: '3px solid #E32219', maxHeight: 200, overflowY: 'auto' }}>
            <p style={{ fontFamily: 'Inter', fontSize: '0.87rem', lineHeight: 1.85, color: '#ccc', margin: 0, whiteSpace: 'pre-wrap' }}>
              {aiText}{isAnalyzing && <span className="cursor-blink" />}
            </p>
          </div>
        )}
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
          <div style={{ padding: '1.5rem 1.75rem', background: '#0a0a0a' }}>
            {/* Team names header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: homeColor, letterSpacing: '0.08em' }}>
                {match.homeTeam.split(' ').slice(-1)[0]}
              </span>
              <span className="section-label" style={{ margin: 0 }}>Comparativa</span>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: awayColor, letterSpacing: '0.08em' }}>
                {match.awayTeam.split(' ').slice(-1)[0]}
              </span>
            </div>
            <StatRow label="Posesión %"    homeVal={stats.home.possession}     awayVal={stats.away.possession}     homeColor={homeColor} awayColor={awayColor} />
            <StatRow label="Tiros al arco" homeVal={stats.home.shotsOnTarget}  awayVal={stats.away.shotsOnTarget}  homeColor={homeColor} awayColor={awayColor} />
            <StatRow label="Pressing"      homeVal={stats.home.pressureEvents} awayVal={stats.away.pressureEvents} homeColor={homeColor} awayColor={awayColor} />
            <StatRow label="Pases"         homeVal={stats.home.passes}         awayVal={stats.away.passes}         homeColor={homeColor} awayColor={awayColor} />
            <StatRow label="Faltas"        homeVal={stats.home.fouls}          awayVal={stats.away.fouls}          homeColor={homeColor} awayColor={awayColor} />
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


      </div>
    </div>
  );
}
