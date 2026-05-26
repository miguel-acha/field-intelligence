import React, { useState, useCallback, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { analyzePlayer } from '../../services/claude';

const TEAM_COLORS = {
  'Bayern München': '#E32219', 'Borussia Dortmund': '#FDE047',
  'Bayer Leverkusen': '#E32219', 'RB Leipzig': '#2979FF',
};
const tc = t => TEAM_COLORS[t] || '#E32219';

const POSITION_ZONES = {
  GK:{cx:5,cy:50}, CB:{cx:18,cy:50}, LB:{cx:20,cy:78}, RB:{cx:20,cy:22},
  CDM:{cx:35,cy:50}, CM:{cx:45,cy:50}, LM:{cx:45,cy:75}, RM:{cx:45,cy:25},
  AM:{cx:60,cy:50}, CAM:{cx:62,cy:50}, LW:{cx:65,cy:78}, RW:{cx:65,cy:22},
  SS:{cx:72,cy:50}, ST:{cx:80,cy:50}, CF:{cx:78,cy:50},
};

function seededDots(jerseyNumber, position, count = 50) {
  const zone = POSITION_ZONES[position] || { cx: 50, cy: 50 };
  let s = (jerseyNumber * 7919 + 12345) % 2147483647;
  const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const spreadX = position === 'GK' ? 10 : 28, spreadY = 26;
  return Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2, r = Math.sqrt(rng());
    return {
      x: Math.max(2, Math.min(98, zone.cx + Math.cos(angle) * r * spreadX)),
      y: Math.max(2, Math.min(98, zone.cy + Math.sin(angle) * r * spreadY)),
      opacity: 0.2 + rng() * 0.6,
      size: 1.2 + rng() * 2,
    };
  });
}

function PitchHeatmap({ player }) {
  const dots = seededDots(player.jerseyNumber, player.position);
  const W = 340, H = 220;
  const px = x => (x / 100) * W, py = y => (y / 100) * H;
  const c = tc(player.team);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', borderRadius: '8px' }}>
      <rect width={W} height={H} fill="#0a0a0a" rx="8" />
      <g stroke={`${c}20`} strokeWidth="1" fill="none">
        <rect x="6" y="6" width={W-12} height={H-12} />
        <line x1={W/2} y1="6" x2={W/2} y2={H-6} />
        <circle cx={W/2} cy={H/2} r="28" />
        <rect x="6" y={H*0.22} width={W*0.18} height={H*0.56} />
        <rect x={W-6-W*0.18} y={H*0.22} width={W*0.18} height={H*0.56} />
      </g>
      {dots.map((d, i) => (
        <circle key={i} cx={px(d.x)} cy={py(d.y)} r={d.size} fill={c} opacity={d.opacity * 0.65} />
      ))}
      <text x={W-8} y={H-7} textAnchor="end" fill={`${c}40`} fontSize="8" fontFamily="JetBrains Mono, monospace">
        #{player.jerseyNumber} {player.position}
      </text>
    </svg>
  );
}

function BigKPICard({ label, value, unit, benchmark, color, delay = 0 }) {
  const numRef = useRef(null);
  const barRef = useRef(null);
  const delta = typeof value === 'number' ? (value - benchmark) : 0;
  const barPct = Math.min(100, Math.max(0, (value / (benchmark * 1.4)) * 100));
  useEffect(() => {
    const obj = { v: 0 };
    gsap.to(obj, { v: value, duration: 0.8, delay, ease: 'power2.out', onUpdate: () => {
      if (numRef.current) numRef.current.textContent = typeof value === 'number' && !Number.isInteger(value) ? obj.v.toFixed(1) : Math.round(obj.v);
    }});
    gsap.fromTo(barRef.current, { scaleX: 0 }, { scaleX: barPct / 100, duration: 0.8, delay: delay + 0.1, ease: 'power2.out', transformOrigin: 'left' });
  }, [value, delay, barPct]);
  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem', borderTop: `2px solid ${color}` }}>
      <div style={{ fontSize: '0.55rem', letterSpacing: '0.14em', color: '#555', marginBottom: '0.5rem', fontFamily: 'Inter' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
        <span ref={numRef} style={{ fontFamily: 'JetBrains Mono', fontSize: '2.5rem', fontWeight: 700, color, lineHeight: 1 }}>0</span>
        <span style={{ fontSize: '0.7rem', color: '#555' }}>{unit}</span>
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <div className="stat-bar-track">
          <div ref={barRef} className="stat-bar-fill" style={{ background: color, width: '100%', transformOrigin: 'left' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
          <span style={{ fontSize: '0.56rem', color: '#555' }}>avg liga: {benchmark}</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: delta >= 0 ? '#00C853' : '#E32219', fontFamily: 'JetBrains Mono' }}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}

function PlayerPickerGrid({ players, onSelect }) {
  const gridRef = useRef(null);
  useEffect(() => {
    if (gridRef.current) gsap.from(gridRef.current.children, { opacity: 0, y: 14, stagger: 0.03, duration: 0.4, ease: 'power2.out' });
  }, []);
  return (
    <div>
      <p style={{ color: '#555', fontSize: '0.8rem', marginBottom: '1.1rem' }}>
        Seleccioná un jugador para ver su análisis táctico completo con IA
      </p>
      <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.65rem' }}>
        {players.map(p => {
          const color = tc(p.team);
          return (
            <div key={p.name} className="player-card-v2" onClick={() => onSelect(p)} style={{ borderLeft: `2px solid ${color}44` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <img src="/player-placeholder.png" alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', background: `${color}20` }} onError={e => { e.target.style.display = 'none'; }} />
                <div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', letterSpacing: '0.04em', color: '#fff', lineHeight: 1 }}>{p.name.split(' ').slice(-1)[0].toUpperCase()}</div>
                  <div style={{ fontSize: '0.6rem', color, marginTop: '0.1rem' }}>{p.position} · #{p.jerseyNumber}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#00C853', fontSize: '1.1rem' }}>{p.spatialAwareness}</div>
                  <div style={{ fontSize: '0.46rem', color: '#555' }}>SPATIAL</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#FF9800', fontSize: '1.1rem' }}>{p.fatigueSig}%</div>
                  <div style={{ fontSize: '0.46rem', color: '#555' }}>FATIGUE</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#2979FF', fontSize: '1.1rem' }}>{p.scanRate}</div>
                  <div style={{ fontSize: '0.46rem', color: '#555' }}>SCAN</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PlayerProfile({ match, selectedPlayer, onPlayerSelect }) {
  const [aiText, setAiText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const spotlightRef = useRef(null);
  const headerRef = useRef(null);
  const kpiRef = useRef(null);
  const pulseRef = useRef(null);

  useEffect(() => {
    if (!selectedPlayer) return;
    setAiText(''); setIsDone(false);
    if (headerRef.current) gsap.from(headerRef.current, { opacity: 0, y: -10, duration: 0.45, ease: 'power2.out' });
    if (kpiRef.current) gsap.from(kpiRef.current.children, { opacity: 0, y: 14, stagger: 0.1, duration: 0.45, delay: 0.15, ease: 'power2.out' });
  }, [selectedPlayer]);

  useEffect(() => {
    if (!spotlightRef.current) return;
    if (isAnalyzing) {
      pulseRef.current = gsap.to(spotlightRef.current, { boxShadow: '0 0 40px rgba(227,34,25,0.2), 0 0 80px rgba(227,34,25,0.06)', repeat: -1, yoyo: true, duration: 1.3, ease: 'sine.inOut' });
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
    } catch (e) {
      setAiText('Error al conectar con el servicio de IA.');
    } finally { setIsAnalyzing(false); }
  }, [selectedPlayer, match, isAnalyzing]);

  if (!selectedPlayer) {
    return (
      <div style={{ padding: '1.25rem' }}>
        <div className="section-label">Player Profile</div>
        <PlayerPickerGrid players={match.players} onSelect={onPlayerSelect} />
      </div>
    );
  }

  const color = tc(selectedPlayer.team);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
      <button className="btn-ghost" onClick={() => onPlayerSelect(null)} style={{ alignSelf: 'flex-start' }}>← Todos los jugadores</button>

      {/* Header */}
      <div ref={headerRef} className="card" style={{ padding: '1.5rem 2rem', borderLeft: `3px solid ${color}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src="/player-placeholder.png" alt="" style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', background: `${color}18`, border: `2px solid ${color}50` }} onError={e => { e.target.style.display = 'none'; }} />
            <div style={{ position: 'absolute', bottom: -4, right: -4, background: color, borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono', fontSize: '0.6rem', fontWeight: 700, color: '#fff' }}>
              {selectedPlayer.jerseyNumber}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.5rem', color: '#fff', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '0.35rem' }}>
              {selectedPlayer.name.toUpperCase()}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="pill" style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>{selectedPlayer.position}</span>
              <span style={{ fontSize: '0.72rem', color: '#666' }}>{selectedPlayer.team}</span>
              {selectedPlayer.goals > 0 && <span className="pill pill-green">⚽ {selectedPlayer.goals}</span>}
              {selectedPlayer.assists > 0 && <span className="pill pill-blue">A {selectedPlayer.assists}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {[
              { label: 'MIN', value: `${selectedPlayer.minutesPlayed}'` },
              { label: 'KM', value: selectedPlayer.distanceCovered },
              { label: 'TOP KM/H', value: selectedPlayer.topSpeed },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', color: '#fff', letterSpacing: '0.04em' }}>{s.value}</div>
                <div style={{ fontSize: '0.52rem', color: '#555', letterSpacing: '0.12em' }}>{s.label}</div>
              </div>
            ))}
          </div>
          {selectedPlayer.keyMoment && (
            <div style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: '8px', padding: '0.75rem 1rem', maxWidth: '240px', flexShrink: 0 }}>
              <div style={{ fontSize: '0.55rem', color, letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.3rem' }}>
                MOMENTO CLAVE · {selectedPlayer.keyMoment.minute}'
              </div>
              <p style={{ fontSize: '0.73rem', color: '#aaa', lineHeight: 1.5, margin: 0 }}>{selectedPlayer.keyMoment.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Top 3 KPIs */}
      <div ref={kpiRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <BigKPICard label="SPATIAL AWARENESS SCORE" value={selectedPlayer.spatialAwareness} unit="/100" benchmark={71} color="#00C853" delay={0} />
        <BigKPICard label="SCAN RATE" value={selectedPlayer.scanRate} unit="esc/min" benchmark={3.1} color="#2979FF" delay={0.1} />
        <BigKPICard label="SPRINT VALUE SCORE" value={selectedPlayer.sprintValueScore} unit="sprints" benchmark={5.2} color="#FF9800" delay={0.2} />
      </div>

      {/* Pitch + Chemistry */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '0.75rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div className="section-label">Patrón de movimiento — 105×68m</div>
          <PitchHeatmap player={selectedPlayer} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="card" style={{ padding: '1.25rem', flex: 1 }}>
            <div className="section-label">Chemistry Score</div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
                <svg viewBox="0 0 54 54" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="27" cy="27" r="22" fill="none" stroke="#1c1c1c" strokeWidth="5" />
                  <circle cx="27" cy="27" r="22" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${(selectedPlayer.chemistryScore / 100) * 138.2} 138.2`} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono', fontSize: '0.88rem', fontWeight: 700, color }}>
                  {selectedPlayer.chemistryScore}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#555' }}>Mayor correlación con</div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.2rem' }}>
                  {selectedPlayer.chemistryPartner || 'N/D'}
                </div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: '1.25rem', flex: 1 }}>
            <div className="section-label">Fatigue Signature</div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.5rem', letterSpacing: '0.04em', color: Math.abs(selectedPlayer.fatigueSig) > 18 ? '#E32219' : '#FF9800' }}>
              {selectedPlayer.fatigueSig}%
            </div>
            <div style={{ fontSize: '0.65rem', color: '#555', marginTop: '0.2rem' }}>caída en segunda mitad</div>
          </div>
        </div>
      </div>

      {/* AI SPOTLIGHT */}
      <div ref={spotlightRef} className="ai-spotlight" style={{ position: 'relative', overflow: 'hidden' }}>
        <img src="/data-accent.png" alt="" style={{ position: 'absolute', right: 0, bottom: 0, width: 260, opacity: 0.05, pointerEvents: 'none', userSelect: 'none' }} onError={e => { e.target.style.display = 'none'; }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem' }}>
            <div>
              <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.6rem', letterSpacing: '0.06em', color: '#fff', marginBottom: '0.2rem' }}>Análisis Táctico con IA</h3>
              <p style={{ fontSize: '0.73rem', color: '#555', margin: 0 }}>Claude analiza los KPIs 3D y genera un informe táctico de élite en tiempo real</p>
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
          {!aiText && !isAnalyzing && (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', color: '#555', fontSize: '0.8rem' }}>
              Presioná <strong style={{ color: '#E32219' }}>Analizar con IA</strong> para recibir el análisis táctico de{' '}
              <strong style={{ color: '#fff' }}>{selectedPlayer.name}</strong>
            </div>
          )}
          {(aiText || isAnalyzing) && (
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '1.25rem 1.5rem', borderLeft: '3px solid #E32219' }}>
              <p style={{ fontFamily: 'Inter', fontSize: '0.93rem', lineHeight: 1.8, color: '#fff', margin: 0, whiteSpace: 'pre-wrap' }}>
                {aiText}{isAnalyzing && <span className="cursor-blink" />}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Secondary KPIs */}
      <div>
        <div className="section-label">KPIs Secundarios — Tracking 3D Completo</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.6rem' }}>
          {[
            { key: 'courtVisionIndex',    label: 'COURT VISION',      unit: '/100', benchmark: 68 },
            { key: 'slipstreamPressure',  label: 'SLIPSTREAM',        unit: '/100', benchmark: 60 },
            { key: 'positioningEPA',      label: 'POSITIONING EPA',   unit: 'pts',  benchmark: 0 },
            { key: 'pressureCollapseRate',label: 'PRESSURE COLLAPSE', unit: '/100', benchmark: 65 },
            { key: 'launchAngle3D',       label: 'LAUNCH ANGLE 3D',   unit: '°',    benchmark: 30 },
            { key: 'coverageShadow',      label: 'COVERAGE SHADOW',   unit: 'm²',   benchmark: 200 },
            { key: 'pressureIndex3D',     label: '3D PRESSURE INDEX', unit: '/100', benchmark: 60 },
            { key: 'bodyReadinessIndex',  label: 'BODY READINESS',    unit: '/100', benchmark: 72 },
          ].map(({ key, label, unit, benchmark }) => {
            const val = selectedPlayer[key];
            const delta = typeof val === 'number' ? (val - benchmark) : null;
            return (
              <div key={key} className="card" style={{ padding: '0.9rem 1rem' }}>
                <div style={{ fontSize: '0.52rem', color: '#555', letterSpacing: '0.12em', marginBottom: '0.35rem' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{val}</span>
                  <span style={{ fontSize: '0.58rem', color: '#555' }}>{unit}</span>
                </div>
                {delta !== null && (
                  <div style={{ fontSize: '0.6rem', color: delta >= 0 ? '#00C853' : '#E32219', fontFamily: 'JetBrains Mono', marginTop: '0.2rem' }}>
                    {delta >= 0 ? '+' : ''}{delta.toFixed(1)} vs liga
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
