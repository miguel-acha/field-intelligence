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

function GoalCard({ ev, color }) {
  const ref = useRef(null);
  const rgb = hexRgb(color);
  useEffect(() => {
    if (!ref.current) return;
    const on = () => gsap.to(ref.current, { scale: 1.04, duration: 0.12 });
    const off = () => gsap.to(ref.current, { scale: 1, duration: 0.12 });
    ref.current.addEventListener('mouseenter', on);
    ref.current.addEventListener('mouseleave', off);
    return () => { ref.current?.removeEventListener('mouseenter', on); ref.current?.removeEventListener('mouseleave', off); };
  }, []);
  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.22rem 0.65rem', background: `rgba(0,200,83,0.06)`, border: '1px solid rgba(0,200,83,0.2)', borderRadius: 4, cursor: 'default' }}>
      <svg width="7" height="7" viewBox="0 0 7 7"><circle cx="3.5" cy="3.5" r="3" fill="#00C853" /></svg>
      <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.85rem', color: '#00C853' }}>{ev.minute}'</span>
      <span style={{ fontSize: '0.62rem', color: '#999', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter' }}>{ev.description}</span>
    </div>
  );
}

function MatchTimeline({ match, homeColor, awayColor }) {
  const trackRef   = useRef(null);
  const halfRef    = useRef(null);
  const dotsRef    = useRef([]);
  const cardsRef   = useRef(null);
  const [activeEv, setActiveEv] = useState(null);
  const [hIdx, setHIdx]         = useState(null);
  const events = useMemo(() => match.timeline.slice(0, 14), [match]);

  useEffect(() => {
    dotsRef.current = dotsRef.current.slice(0, events.length);

    // 1. Track draws left→right
    gsap.fromTo(trackRef.current,
      { scaleX: 0, transformOrigin: 'left center' },
      { scaleX: 1, duration: 1.0, ease: 'power3.out', overwrite: true }
    );
    // 2. Half-time line drops
    gsap.fromTo(halfRef.current,
      { scaleY: 0, transformOrigin: 'top center' },
      { scaleY: 1, duration: 0.5, delay: 0.55, ease: 'power2.out', overwrite: true }
    );
    // 3. Dots pop in with stagger
    const dots = dotsRef.current.filter(Boolean);
    gsap.fromTo(dots,
      { scale: 0, transformOrigin: 'center center' },
      { scale: 1, stagger: { amount: 0.7, from: 'start', ease: 'none' }, duration: 0.35, ease: 'back.out(1.9)', delay: 0.35, overwrite: true }
    );
    // 4. Goal dots: continuous glow pulse
    events.forEach((ev, i) => {
      if (ev.type !== 'goal' || !dotsRef.current[i]) return;
      gsap.to(dotsRef.current[i], {
        boxShadow: `0 0 18px #00C85399, 0 0 36px #00C85333`,
        repeat: -1, yoyo: true, duration: 1.1, ease: 'sine.inOut', delay: 0.9 + i * 0.08,
      });
    });
    // 5. Goal cards slide up
    if (cardsRef.current?.children.length) {
      gsap.fromTo([...cardsRef.current.children],
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.06, duration: 0.35, ease: 'power2.out', delay: 1.1, overwrite: true }
      );
    }
  }, [match]);

  function enterDot(i, ev) {
    const dot = dotsRef.current[i];
    if (dot) gsap.to(dot, { scale: 1.65, y: -5, duration: 0.16, ease: 'power2.out' });
    setHIdx(i); setActiveEv(ev);
  }
  function leaveDot(i) {
    const dot = dotsRef.current[i];
    if (dot) gsap.to(dot, { scale: 1, y: 0, duration: 0.16, ease: 'power2.in' });
    setHIdx(null); setActiveEv(null);
  }

  const goals = events.filter(e => e.type === 'goal');

  return (
    <div style={{ padding: '1.1rem 2.5rem 0.9rem', borderBottom: '1px solid #1c1c1c', background: '#090909' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.1rem', marginBottom: '0.65rem', alignItems: 'center' }}>
        {Object.entries(EVT_COLORS).map(([type, c]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
            <span style={{ fontSize: '0.42rem', color: '#555', fontFamily: 'Inter', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {{ goal:'Gol', chance:'Remate', pressing:'Pressing', tactical:'Táctica' }[type]}
            </span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '0.42rem', color: '#2a2a2a', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }}>1T ← HT → 2T</span>
      </div>

      {/* Timeline track */}
      <div style={{ position: 'relative', height: 48, marginBottom: '0.65rem' }}>
        {/* Background gradient showing home/away zones */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: '#161616', transform: 'translateY(-50%)', borderRadius: 2 }} />
        <div ref={trackRef} style={{
          position: 'absolute', top: '50%', left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${homeColor}55 0%, #2a2a2a 42%, #2a2a2a 58%, ${awayColor}55 100%)`,
          transform: 'translateY(-50%)', borderRadius: 2,
        }} />

        {/* Minute markers */}
        {[0, 15, 30, 45, 60, 75, 90].map(t => (
          <div key={t} style={{ position: 'absolute', left: `${(t / 90) * 100}%`, top: 0, bottom: 0, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }}>
            <div style={{ width: 1, height: t % 45 === 0 ? 10 : 7, background: t === 45 ? '#333' : '#1e1e1e' }} />
            <span style={{ fontSize: '0.38rem', color: t === 45 ? '#3a3a3a' : '#282828', fontFamily: 'JetBrains Mono' }}>{t}'</span>
          </div>
        ))}

        {/* Half-time line */}
        <div ref={halfRef} style={{
          position: 'absolute', left: '50%', top: 6, bottom: 6,
          width: 1, background: '#252525', transform: 'translateX(-50%)',
        }} />

        {/* Team zone watermarks */}
        <span style={{ position: 'absolute', left: '22%', top: '50%', transform: 'translateY(-50%)', fontSize: '0.42rem', color: homeColor + '30', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.12em', pointerEvents: 'none' }}>
          {match.homeTeam.split(' ').slice(-1)[0].toUpperCase()}
        </span>
        <span style={{ position: 'absolute', right: '22%', top: '50%', transform: 'translateY(-50%)', fontSize: '0.42rem', color: awayColor + '30', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.12em', pointerEvents: 'none' }}>
          {match.awayTeam.split(' ').slice(-1)[0].toUpperCase()}
        </span>

        {/* Event dots */}
        {events.map((ev, i) => {
          const c = EVT_COLORS[ev.type] || '#444';
          const isGoal = ev.type === 'goal';
          return (
            <div
              key={i}
              ref={el => { dotsRef.current[i] = el; }}
              onMouseEnter={() => enterDot(i, ev)}
              onMouseLeave={() => leaveDot(i)}
              style={{
                position: 'absolute', left: `${(ev.minute / 90) * 100}%`, top: '50%',
                transform: 'translate(-50%, -50%)',
                width: isGoal ? 18 : 10, height: isGoal ? 18 : 10,
                borderRadius: '50%', background: c, cursor: 'pointer',
                border: `2px solid ${c}88`, zIndex: isGoal ? 3 : 2,
              }}
            />
          );
        })}

        {/* Hover tooltip */}
        {activeEv && (
          <div style={{
            position: 'absolute',
            left: `${(activeEv.minute / 90) * 100}%`,
            bottom: '100%', marginBottom: 6,
            transform: 'translateX(-50%)',
            background: '#111', border: `1px solid ${EVT_COLORS[activeEv.type] || '#333'}55`,
            borderRadius: 6, padding: '0.35rem 0.65rem',
            whiteSpace: 'nowrap', zIndex: 20, pointerEvents: 'none',
          }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.88rem', color: EVT_COLORS[activeEv.type] || '#777', letterSpacing: '0.06em' }}>
              {activeEv.minute}'
            </div>
            <div style={{ fontSize: '0.58rem', color: '#ccc', fontFamily: 'Inter', maxWidth: 220 }}>
              {activeEv.description}
            </div>
          </div>
        )}
      </div>

      {/* Goal cards */}
      {goals.length > 0 && (
        <div ref={cardsRef} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {goals.map((ev, i) => (
            <GoalCard key={i} ev={ev} color={homeColor} />
          ))}
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
  const aiScrollRef = useRef(null);
  const aiSpotRef   = useRef(null);
  const aiPulseRef  = useRef(null);

  const homeTop      = useMemo(() => getTopPerformers(match.players, match.homeTeam), [match]);
  const awayTop      = useMemo(() => getTopPerformers(match.players, match.awayTeam), [match]);
  const subCandidate = useMemo(() => getSubCandidate(match.players), [match]);
  const insight      = MATCH_INSIGHTS[match.id] || MATCH_INSIGHTS[1];

  const homeColor = tc(match.homeTeam);
  const awayColor = tc(match.awayTeam);
  const stats     = match.teamStats;

  useEffect(() => {
    // Hero fade-in — use fromTo so final state is always explicit
    gsap.fromTo(heroRef.current,
      { opacity: 0, y: -14 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', overwrite: true }
    );
    // Score count-up (no delay — content is visible immediately)
    const ho = { v: 0 }, ao = { v: 0 };
    gsap.to(ho, {
      v: match.score.home, duration: 0.8, ease: 'power2.out', overwrite: true,
      onUpdate: () => { if (homeRef.current) homeRef.current.textContent = Math.round(ho.v); },
    });
    gsap.to(ao, {
      v: match.score.away, duration: 0.8, delay: 0.12, ease: 'power2.out', overwrite: true,
      onUpdate: () => { if (awayRef.current) awayRef.current.textContent = Math.round(ao.v); },
    });
    // Body: no opacity animation — content is always visible, just slide in
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
