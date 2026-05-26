import React, { useState, useCallback, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { analyzePlayer } from '../../services/claude';

const TEAM_COLORS = {
  'Bayern München': '#E32219', 'Borussia Dortmund': '#F5C518',
  'Bayer Leverkusen': '#E32219', 'RB Leipzig': '#2979FF',
};
const tc = t => TEAM_COLORS[t] || '#E32219';

/* ─── Pitch heatmap (SVG dots) ─── */
const POSITION_ZONES = {
  GK:{cx:5,cy:50}, CB:{cx:18,cy:50}, LB:{cx:20,cy:78}, RB:{cx:20,cy:22},
  CDM:{cx:35,cy:50}, CM:{cx:45,cy:50}, LM:{cx:45,cy:75}, RM:{cx:45,cy:25},
  AM:{cx:60,cy:50}, CAM:{cx:62,cy:50}, LW:{cx:65,cy:78}, RW:{cx:65,cy:22},
  SS:{cx:72,cy:50}, ST:{cx:80,cy:50}, CF:{cx:78,cy:50},
};
function seededDots(jerseyNumber, position, count = 55) {
  const zone = POSITION_ZONES[position] || { cx: 50, cy: 50 };
  let s = (jerseyNumber * 7919 + 12345) % 2147483647;
  const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const spreadX = position === 'GK' ? 10 : 28, spreadY = 24;
  return Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2, r = Math.sqrt(rng());
    return {
      x: Math.max(2, Math.min(98, zone.cx + Math.cos(angle) * r * spreadX)),
      y: Math.max(2, Math.min(98, zone.cy + Math.sin(angle) * r * spreadY)),
      opacity: 0.15 + rng() * 0.55,
      size: 1.2 + rng() * 2.2,
    };
  });
}
function PitchHeatmap({ player }) {
  const dots = seededDots(player.jerseyNumber, player.position);
  const W = 340, H = 210;
  const px = x => (x / 100) * W, py = y => (y / 100) * H;
  const c = tc(player.team);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', borderRadius: 8 }}>
      <rect width={W} height={H} fill="#080808" rx="8" />
      <g stroke={`${c}18`} strokeWidth="0.8" fill="none">
        <rect x="6" y="6" width={W - 12} height={H - 12} />
        <line x1={W / 2} y1="6" x2={W / 2} y2={H - 6} />
        <circle cx={W / 2} cy={H / 2} r="26" />
        <rect x="6" y={H * 0.22} width={W * 0.17} height={H * 0.56} />
        <rect x={W - 6 - W * 0.17} y={H * 0.22} width={W * 0.17} height={H * 0.56} />
      </g>
      {dots.map((d, i) => (
        <circle key={i} cx={px(d.x)} cy={py(d.y)} r={d.size} fill={c} opacity={d.opacity * 0.7} />
      ))}
    </svg>
  );
}

/* ─── Big KPI card ─── */
function KPIBlock({ label, value, unit, benchmark, color, delay = 0 }) {
  const numRef = useRef(null);
  const barRef = useRef(null);
  const delta = typeof value === 'number' ? value - benchmark : 0;
  const barPct = Math.min(100, Math.max(0, (value / (benchmark * 1.5)) * 100));

  useEffect(() => {
    const obj = { v: 0 };
    gsap.to(obj, {
      v: value, duration: 0.9, delay, ease: 'power2.out',
      onUpdate: () => {
        if (numRef.current)
          numRef.current.textContent = Number.isInteger(value) ? Math.round(obj.v) : obj.v.toFixed(1);
      },
    });
    gsap.fromTo(barRef.current,
      { scaleX: 0 },
      { scaleX: barPct / 100, duration: 0.9, delay: delay + 0.1, ease: 'power2.out', transformOrigin: 'left' }
    );
  }, [value, delay, barPct]);

  return (
    <div style={{ padding: '1.5rem', borderBottom: '1px solid #111' }}>
      <div style={{ fontSize: '0.5rem', letterSpacing: '0.16em', color: '#666', marginBottom: '0.6rem', fontFamily: 'Inter', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.75rem' }}>
        <span ref={numRef} style={{ fontFamily: 'JetBrains Mono', fontSize: '2.8rem', fontWeight: 700, color, lineHeight: 0.9 }}>0</span>
        <span style={{ fontSize: '0.65rem', color: '#444' }}>{unit}</span>
      </div>
      <div style={{ height: 2, background: '#111', borderRadius: 2, overflow: 'hidden', marginBottom: '0.45rem' }}>
        <div ref={barRef} style={{ height: '100%', background: color, width: '100%', transformOrigin: 'left' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.5rem', color: '#555', fontFamily: 'Inter' }}>avg liga: {benchmark}</span>
        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: delta >= 0 ? '#00C853' : '#E32219', fontFamily: 'JetBrains Mono' }}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

/* ─── Player picker row ─── */
function PickerRow({ player, onClick }) {
  const rowRef = useRef(null);
  const color = tc(player.team);
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const on = () => gsap.to(el, { background: 'rgba(255,255,255,0.055)', duration: 0.15 });
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
        gridTemplateColumns: '28px 1fr 44px 60px 55px 55px',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.6rem 0.75rem',
        borderBottom: '1px solid #0e0e0e',
        cursor: 'pointer',
        borderRadius: 4,
      }}
    >
      <div style={{ width: 4, height: 28, background: color, borderRadius: 2 }} />
      <div>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.95rem', color: '#fff', letterSpacing: '0.04em', lineHeight: 1.1 }}>
          {player.name.toUpperCase()}
        </div>
        <div style={{ fontSize: '0.5rem', color: '#666', letterSpacing: '0.04em', fontFamily: 'Inter', marginTop: '0.1rem' }}>
          {player.team.split(' ').slice(-1)[0]} · {player.minutesPlayed}'
        </div>
      </div>
      <span style={{ fontSize: '0.6rem', fontFamily: 'Inter', fontWeight: 700, color, letterSpacing: '0.04em' }}>
        {player.position}
      </span>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', fontWeight: 700, color: player.spatialAwareness > 80 ? '#00C853' : '#aaa' }}>{player.spatialAwareness}</div>
        <div style={{ fontSize: '0.42rem', color: '#333', letterSpacing: '0.06em' }}>VISIÓN</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', fontWeight: 700, color: '#2979FF' }}>{player.scanRate}</div>
        <div style={{ fontSize: '0.42rem', color: '#333', letterSpacing: '0.06em' }}>SCAN</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'JetBrains Mono', fontSize: '0.85rem', fontWeight: 700,
          color: Math.abs(player.fatigueSig) > 20 ? '#E32219' : Math.abs(player.fatigueSig) > 14 ? '#FF9800' : '#555',
        }}>{player.fatigueSig}%</div>
        <div style={{ fontSize: '0.42rem', color: '#333', letterSpacing: '0.06em' }}>FAT</div>
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function PlayerProfile({ match, selectedPlayer, onPlayerSelect }) {
  const [aiText, setAiText]       = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDone, setIsDone]       = useState(false);
  const spotlightRef = useRef(null);
  const pulseRef     = useRef(null);
  const headerRef    = useRef(null);
  const kpiRef       = useRef(null);
  const pickerRef    = useRef(null);

  useEffect(() => {
    if (!selectedPlayer) {
      if (pickerRef.current) {
        gsap.from([...pickerRef.current.children], { opacity: 0, x: -8, stagger: 0.025, duration: 0.35, ease: 'power2.out', delay: 0.1 });
      }
      return;
    }
    setAiText(''); setIsDone(false);
    if (headerRef.current) gsap.from(headerRef.current, { opacity: 0, y: -10, duration: 0.45, ease: 'power2.out' });
    if (kpiRef.current)    gsap.from([...kpiRef.current.children], { opacity: 0, y: 12, stagger: 0.08, duration: 0.4, delay: 0.2, ease: 'power2.out' });
  }, [selectedPlayer]);

  useEffect(() => {
    if (!spotlightRef.current) return;
    if (isAnalyzing) {
      pulseRef.current = gsap.to(spotlightRef.current, {
        boxShadow: '0 0 50px rgba(227,34,25,0.15), 0 0 100px rgba(227,34,25,0.05)',
        repeat: -1, yoyo: true, duration: 1.3, ease: 'sine.inOut',
      });
    } else {
      if (pulseRef.current) pulseRef.current.kill();
      gsap.to(spotlightRef.current, { boxShadow: 'none', duration: 0.4 });
    }
  }, [isAnalyzing]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedPlayer || isAnalyzing) return;
    setIsAnalyzing(true); setAiText(''); setIsDone(false);
    try {
      await analyzePlayer(selectedPlayer, match, chunk => setAiText(prev => prev + chunk));
      setIsDone(true);
    } catch {
      setAiText('Error al conectar con el servicio de IA.');
    } finally { setIsAnalyzing(false); }
  }, [selectedPlayer, match, isAnalyzing]);

  /* ─── PICKER ─── */
  if (!selectedPlayer) {
    const teams = [...new Set(match.players.map(p => p.team))];
    return (
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ padding: '1.75rem 2rem 1rem', borderBottom: '1px solid #111' }}>
          <span className="section-label" style={{ marginBottom: 0 }}>Seleccioná un jugador</span>
        </div>
        <div ref={pickerRef}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 44px 60px 55px 55px', gap: '0.6rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid #111' }}>
            <div />
            <span style={{ fontSize: '0.48rem', color: '#555', letterSpacing: '0.12em', fontFamily: 'Inter' }}>JUGADOR</span>
            <span style={{ fontSize: '0.48rem', color: '#555', letterSpacing: '0.12em', fontFamily: 'Inter' }}>POS</span>
            <span style={{ fontSize: '0.48rem', color: '#555', letterSpacing: '0.12em', fontFamily: 'Inter', textAlign: 'center' }}>VISIÓN</span>
            <span style={{ fontSize: '0.48rem', color: '#555', letterSpacing: '0.12em', fontFamily: 'Inter', textAlign: 'center' }}>SCAN</span>
            <span style={{ fontSize: '0.48rem', color: '#555', letterSpacing: '0.12em', fontFamily: 'Inter', textAlign: 'center' }}>FAT</span>
          </div>
          {teams.map(team => (
            <div key={team}>
              <div style={{ padding: '0.55rem 0.75rem', background: '#0a0a0a', borderBottom: '1px solid #111' }}>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.75rem', color: tc(team), letterSpacing: '0.1em' }}>
                  {team.toUpperCase()}
                </span>
              </div>
              {match.players.filter(p => p.team === team).map(p => (
                <PickerRow key={p.name} player={p} onClick={() => onPlayerSelect(p)} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── PLAYER DETAIL ─── */
  const color = tc(selectedPlayer.team);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>

      {/* ── BACK ── */}
      <div style={{ padding: '0.75rem 2rem', borderBottom: '1px solid #111' }}>
        <button
          onClick={() => onPlayerSelect(null)}
          style={{ background: 'none', border: 'none', color: '#444', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#444'; }}
        >
          ← Todos los jugadores
        </button>
      </div>

      {/* ── PLAYER HERO ── */}
      <div ref={headerRef} style={{
        padding: '2rem 2.5rem',
        borderBottom: '1px solid #111',
        background: `linear-gradient(135deg, ${color}06 0%, transparent 60%)`,
        display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap',
      }}>
        {/* Jersey number */}
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '5rem', color: `${color}22`, lineHeight: 1, letterSpacing: '-0.02em', userSelect: 'none', flexShrink: 0 }}>
          {selectedPlayer.jerseyNumber}
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '0.52rem', color: '#333', letterSpacing: '0.18em', fontFamily: 'Inter', marginBottom: '0.4rem' }}>
            {selectedPlayer.team.toUpperCase()} · {selectedPlayer.position}
          </div>
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 0.95, margin: 0 }}>
            {selectedPlayer.name.toUpperCase()}
          </h2>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {selectedPlayer.goals > 0 && <span className="pill pill-green">⚽ {selectedPlayer.goals} gol{selectedPlayer.goals > 1 ? 'es' : ''}</span>}
            {selectedPlayer.assists > 0 && <span className="pill pill-blue">A {selectedPlayer.assists} asist.</span>}
          </div>
        </div>

        {/* 3 quick stats */}
        <div style={{ display: 'flex', gap: '2.5rem', flexShrink: 0 }}>
          {[
            { label: 'MIN', value: `${selectedPlayer.minutesPlayed}'` },
            { label: 'KM', value: selectedPlayer.distanceCovered },
            { label: 'TOP KM/H', value: selectedPlayer.topSpeed },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.48rem', color: '#666', letterSpacing: '0.14em', marginTop: '0.2rem', fontFamily: 'Inter' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Key moment */}
        {selectedPlayer.keyMoment && (
          <div style={{ borderLeft: `2px solid ${color}40`, paddingLeft: '1.25rem', maxWidth: 260, flexShrink: 0 }}>
            <div style={{ fontSize: '0.48rem', color: color, letterSpacing: '0.16em', fontWeight: 700, fontFamily: 'Inter', marginBottom: '0.35rem' }}>
              MOMENTO CLAVE · {selectedPlayer.keyMoment.minute}'
            </div>
            <p style={{ fontSize: '0.72rem', color: '#666', lineHeight: 1.55, margin: 0 }}>
              {selectedPlayer.keyMoment.description}
            </p>
          </div>
        )}
      </div>

      {/* ── BODY GRID: left = KPIs + pitch | right = AI ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr' }}>

        {/* Left column */}
        <div ref={kpiRef} style={{ borderRight: '1px solid #111' }}>
          <KPIBlock label="Spatial Awareness" value={selectedPlayer.spatialAwareness} unit="/100" benchmark={71} color="#00C853" delay={0} />
          <KPIBlock label="Scan Rate"          value={selectedPlayer.scanRate}          unit="esc/min" benchmark={3.1} color="#2979FF" delay={0.1} />
          <KPIBlock label="Sprint Value"       value={selectedPlayer.sprintValueScore}  unit="sprints" benchmark={5.2} color="#FF9800" delay={0.2} />

          {/* Pitch */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #111' }}>
            <div className="section-label" style={{ marginBottom: '0.75rem' }}>Patrón de movimiento</div>
            <PitchHeatmap player={selectedPlayer} />
          </div>

          {/* Chemistry + Fatigue inline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #111' }}>
            <div style={{ padding: '1.25rem', borderRight: '1px solid #111' }}>
              <div className="section-label" style={{ marginBottom: '0.6rem' }}>Chemistry</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg viewBox="0 0 48 48" style={{ width: 46, height: 46, flexShrink: 0, transform: 'rotate(-90deg)' }}>
                  <circle cx="24" cy="24" r="19" fill="none" stroke="#111" strokeWidth="4" />
                  <circle cx="24" cy="24" r="19" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${(selectedPlayer.chemistryScore / 100) * 119.4} 119.4`} />
                </svg>
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '1.2rem', fontWeight: 700, color }}>{selectedPlayer.chemistryScore}</div>
                  <div style={{ fontSize: '0.5rem', color: '#666', letterSpacing: '0.06em', fontFamily: 'Inter' }}>
                    {selectedPlayer.chemistryPartner || '—'}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <div className="section-label" style={{ marginBottom: '0.6rem' }}>Fatiga</div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.2rem', letterSpacing: '0.04em', color: Math.abs(selectedPlayer.fatigueSig) > 18 ? '#E32219' : '#FF9800', lineHeight: 1 }}>
                {selectedPlayer.fatigueSig}%
              </div>
              <div style={{ fontSize: '0.5rem', color: '#666', marginTop: '0.3rem', fontFamily: 'Inter' }}>caída en 2do tiempo</div>
            </div>
          </div>
        </div>

        {/* Right column: AI spotlight */}
        <div ref={spotlightRef} style={{
          padding: '2rem 2.5rem',
          background: 'linear-gradient(135deg, rgba(227,34,25,0.03) 0%, transparent 50%)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 480,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <img src="/data-accent.png" alt="" style={{ position: 'absolute', right: -20, bottom: -10, width: 220, opacity: 0.04, pointerEvents: 'none', userSelect: 'none' }} onError={e => { e.target.style.display = 'none'; }} />

          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.48rem', color: '#E32219', letterSpacing: '0.2em', fontFamily: 'Inter', fontWeight: 700, marginBottom: '0.4rem' }}>OPENCAMBA AI</div>
                <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', letterSpacing: '0.06em', color: '#fff', margin: 0, lineHeight: 1 }}>
                  Análisis Táctico
                </h3>
                <p style={{ fontSize: '0.7rem', color: '#444', margin: '0.4rem 0 0', lineHeight: 1.5 }}>
                  Claude analiza los KPIs de tracking 3D y genera un informe de élite en tiempo real
                </p>
              </div>
              <button className="btn-primary" onClick={handleAnalyze} disabled={isAnalyzing} style={{ flexShrink: 0 }}>
                {isAnalyzing ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    Analizando...
                  </>
                ) : isDone ? '↻ Re-analizar' : '✦ Analizar con IA'}
              </button>
            </div>

            {/* Output area */}
            {!aiText && !isAnalyzing && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '0.75rem', color: '#2a2a2a', textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '4rem', color: '#111', letterSpacing: '0.04em', lineHeight: 1 }}>
                  {selectedPlayer.jerseyNumber}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.5 }}>
                  Presioná <strong style={{ color: '#E32219' }}>Analizar con IA</strong> para el informe táctico de{' '}
                  <strong style={{ color: '#fff' }}>{selectedPlayer.name.split(' ').slice(-1)[0]}</strong>
                </div>
              </div>
            )}

            {(aiText || isAnalyzing) && (
              <div style={{
                flex: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 10,
                padding: '1.5rem', borderLeft: '3px solid #E32219',
              }}>
                <p style={{ fontFamily: 'Inter', fontSize: '0.9rem', lineHeight: 1.85, color: '#ddd', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {aiText}{isAnalyzing && <span className="cursor-blink" />}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
