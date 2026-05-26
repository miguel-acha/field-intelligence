import React, { useState, useCallback, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { analyzePlayer } from '../../services/claude';

// ---- Position zones on a 105x68 pitch (SVG mapped 0-100%) ----
const POSITION_ZONES = {
  GK:  { cx: 5,  cy: 50 },
  CB:  { cx: 18, cy: 50 },
  LB:  { cx: 20, cy: 78 },
  RB:  { cx: 20, cy: 22 },
  CDM: { cx: 35, cy: 50 },
  CM:  { cx: 45, cy: 50 },
  LM:  { cx: 45, cy: 75 },
  RM:  { cx: 45, cy: 25 },
  AM:  { cx: 60, cy: 50 },
  CAM: { cx: 62, cy: 50 },
  LW:  { cx: 65, cy: 78 },
  RW:  { cx: 65, cy: 22 },
  SS:  { cx: 72, cy: 50 },
  ST:  { cx: 80, cy: 50 },
  CF:  { cx: 78, cy: 50 },
};

function seededDots(jerseyNumber, position, count = 50) {
  const zone = POSITION_ZONES[position] || { cx: 50, cy: 50 };
  let s = (jerseyNumber * 7919 + 12345) % 2147483647;
  const rng = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const spreadX = position === 'GK' ? 10 : 28;
  const spreadY = 26;
  return Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng());
    return {
      x: Math.max(2, Math.min(98, zone.cx + Math.cos(angle) * r * spreadX)),
      y: Math.max(2, Math.min(98, zone.cy + Math.sin(angle) * r * spreadY)),
      opacity: 0.25 + rng() * 0.65,
      size: 1.2 + rng() * 2.2,
    };
  });
}

function PitchHeatmap({ player }) {
  const dots = seededDots(player.jerseyNumber, player.position);
  const W = 320, H = 210;
  const px = x => (x / 100) * W;
  const py = y => (y / 100) * H;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', borderRadius: '8px' }}>
      <rect width={W} height={H} fill="#0a1f12" rx="8" />
      <g stroke="rgba(0,255,135,0.18)" strokeWidth="1" fill="none">
        <rect x="6" y="6" width={W - 12} height={H - 12} />
        <line x1={W / 2} y1="6" x2={W / 2} y2={H - 6} />
        <circle cx={W / 2} cy={H / 2} r="26" />
        <rect x="6" y={H * 0.22} width={W * 0.18} height={H * 0.56} />
        <rect x={W - 6 - W * 0.18} y={H * 0.22} width={W * 0.18} height={H * 0.56} />
      </g>
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={px(d.x)}
          cy={py(d.y)}
          r={d.size}
          fill="var(--accent-green)"
          opacity={d.opacity * 0.7}
        />
      ))}
      <text
        x={W - 8} y={H - 6}
        textAnchor="end"
        fill="rgba(0,255,135,0.3)"
        fontSize="8"
        fontFamily="JetBrains Mono, monospace"
      >
        #{player.jerseyNumber} {player.position}
      </text>
    </svg>
  );
}

// ---- Big KPI card with count-up and bar ----
function BigKPICard({ label, value, unit, benchmark, color, delay = 0 }) {
  const numRef = useRef(null);
  const barRef = useRef(null);
  const delta = value - benchmark;
  const barPct = Math.min(100, Math.max(0, (value / (benchmark * 1.4)) * 100));

  useEffect(() => {
    const obj = { val: 0 };
    gsap.to(obj, {
      val: value, duration: 0.8, delay, ease: 'power2.out',
      onUpdate: () => {
        if (numRef.current) {
          numRef.current.textContent = typeof value === 'number' && !Number.isInteger(value)
            ? obj.val.toFixed(1)
            : Math.round(obj.val);
        }
      },
    });
    gsap.fromTo(
      barRef.current,
      { scaleX: 0 },
      { scaleX: barPct / 100, duration: 0.8, delay: delay + 0.1, ease: 'power2.out', transformOrigin: 'left' }
    );
  }, [value, delay, barPct]);

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem', borderTop: `2px solid ${color}` }}>
      <div style={{ fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
        <span ref={numRef} style={{
          fontFamily: 'JetBrains Mono', fontSize: '2.5rem',
          fontWeight: 700, color, lineHeight: 1,
        }}>
          0
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unit}</span>
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <div className="stat-bar-track">
          <div
            ref={barRef}
            className="stat-bar-fill"
            style={{ background: color, width: '100%', transformOrigin: 'left' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Liga avg: {benchmark}</span>
          <span style={{
            fontSize: '0.62rem', fontWeight: 700,
            color: delta >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            fontFamily: 'JetBrains Mono',
          }}>
            {delta >= 0 ? '+' : ''}{typeof delta === 'number' ? delta.toFixed(1) : delta}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- Player picker grid (no player selected) ----
const TEAM_COLORS = {
  'Bayern München':    '#dc2626',
  'Borussia Dortmund': '#fbbf24',
  'Bayer Leverkusen':  '#f97316',
  'RB Leipzig':        '#3b82f6',
};
const tc = t => TEAM_COLORS[t] || '#3b82f6';

function PlayerPickerGrid({ players, onSelect }) {
  const gridRef = useRef(null);

  useEffect(() => {
    if (gridRef.current) {
      gsap.from(gridRef.current.children, {
        opacity: 0, y: 16, stagger: 0.03, duration: 0.4, ease: 'power2.out',
      });
    }
  }, []);

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
        Seleccioná un jugador para ver su perfil completo y análisis táctico con IA
      </p>
      <div
        ref={gridRef}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.65rem' }}
      >
        {players.map(p => (
          <div
            key={p.name}
            className="player-card-v2"
            onClick={() => onSelect(p)}
            style={{ borderLeft: `2px solid ${tc(p.team)}44` }}
          >
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              #{p.jerseyNumber}
            </div>
            <div style={{
              fontFamily: 'Space Grotesk', fontWeight: 700,
              fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0.1rem 0',
            }}>
              {p.name.split(' ').pop()}
            </div>
            <div style={{ fontSize: '0.62rem', color: tc(p.team) }}>
              {p.team.split(' ')[0]} · {p.position}
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'JetBrains Mono', fontWeight: 700,
                  color: 'var(--accent-green)', fontSize: '1rem',
                }}>
                  {p.spatialAwareness}
                </div>
                <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>SPA</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'JetBrains Mono', fontWeight: 700,
                  color: 'var(--accent-amber)', fontSize: '1rem',
                }}>
                  {p.fatigueSig}%
                </div>
                <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>FAT</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Main component ----
export default function PlayerProfile({ match, selectedPlayer, onPlayerSelect }) {
  const [aiText, setAiText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const spotlightRef = useRef(null);
  const headerRef = useRef(null);
  const kpiRowRef = useRef(null);
  const pulseAnim = useRef(null);

  useEffect(() => {
    if (!selectedPlayer) return;
    setAiText('');
    setIsDone(false);
    if (headerRef.current) {
      gsap.from(headerRef.current, { opacity: 0, y: -12, duration: 0.5, ease: 'power2.out' });
    }
    if (kpiRowRef.current) {
      gsap.from(kpiRowRef.current.children, {
        opacity: 0, y: 16, stagger: 0.1, duration: 0.5, delay: 0.2, ease: 'power2.out',
      });
    }
  }, [selectedPlayer]);

  useEffect(() => {
    if (!spotlightRef.current) return;
    if (isAnalyzing) {
      pulseAnim.current = gsap.to(spotlightRef.current, {
        boxShadow: '0 0 40px rgba(0,255,135,0.2), 0 0 80px rgba(0,255,135,0.08)',
        repeat: -1, yoyo: true, duration: 1.2, ease: 'sine.inOut',
      });
    } else {
      if (pulseAnim.current) pulseAnim.current.kill();
      gsap.to(spotlightRef.current, { boxShadow: 'none', duration: 0.4 });
    }
  }, [isAnalyzing]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedPlayer || isAnalyzing) return;
    setIsAnalyzing(true);
    setAiText('');
    setIsDone(false);
    try {
      await analyzePlayer(selectedPlayer, match, chunk => setAiText(prev => prev + chunk));
      setIsDone(true);
    } catch (e) {
      setAiText('Error al conectar con el servicio de IA. Verificá tu API key en .env');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedPlayer, match, isAnalyzing]);

  if (!selectedPlayer) {
    return (
      <div style={{ padding: '1.25rem' }}>
        <div className="section-label">Player Profile</div>
        <PlayerPickerGrid players={match.players} onSelect={onPlayerSelect} />
      </div>
    );
  }

  const teamColor = TEAM_COLORS[selectedPlayer.team] || '#3b82f6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>

      {/* Back */}
      <button
        onClick={() => onPlayerSelect(null)}
        style={{
          alignSelf: 'flex-start',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '0.35rem 0.85rem',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: '0.78rem',
          fontFamily: 'Space Grotesk',
        }}
      >
        ← Todos los jugadores
      </button>

      {/* Header */}
      <div ref={headerRef} className="card" style={{ padding: '1.5rem 2rem', borderLeft: `3px solid ${teamColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '12px',
            background: `${teamColor}18`,
            border: `1px solid ${teamColor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono', fontSize: '1.6rem',
              fontWeight: 800, color: teamColor,
            }}>
              {selectedPlayer.jerseyNumber}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontFamily: 'Space Grotesk', fontWeight: 800,
              fontSize: '1.8rem', color: 'var(--text-primary)',
              lineHeight: 1, marginBottom: '0.35rem',
            }}>
              {selectedPlayer.name}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="pill" style={{
                background: `${teamColor}15`, color: teamColor,
                border: `1px solid ${teamColor}35`,
              }}>
                {selectedPlayer.position}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {selectedPlayer.team}
              </span>
              {selectedPlayer.goals > 0 && <span className="pill pill-green">⚽ {selectedPlayer.goals}</span>}
              {selectedPlayer.assists > 0 && <span className="pill pill-blue">A {selectedPlayer.assists}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {[
              { label: 'MIN',     value: `${selectedPlayer.minutesPlayed}'` },
              { label: 'KM',      value: selectedPlayer.distanceCovered },
              { label: 'TOP KM/H', value: selectedPlayer.topSpeed },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'JetBrains Mono', fontSize: '1.25rem',
                  fontWeight: 700, color: 'var(--text-primary)',
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          {selectedPlayer.keyMoment && (
            <div style={{
              background: 'rgba(0,255,135,0.05)',
              border: '1px solid rgba(0,255,135,0.18)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              maxWidth: '240px',
            }}>
              <div style={{
                fontSize: '0.58rem', color: 'var(--accent-green)',
                letterSpacing: '0.1em', fontWeight: 700, marginBottom: '0.3rem',
              }}>
                MOMENTO CLAVE · {selectedPlayer.keyMoment.minute}'
              </div>
              <p style={{
                fontSize: '0.75rem', color: 'var(--text-secondary)',
                lineHeight: 1.5, margin: 0,
              }}>
                {selectedPlayer.keyMoment.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* TOP 3 KPIs — big */}
      <div ref={kpiRowRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <BigKPICard
          label="SPATIAL AWARENESS SCORE"
          value={selectedPlayer.spatialAwareness}
          unit="/100"
          benchmark={71}
          color="var(--accent-green)"
          delay={0}
        />
        <BigKPICard
          label="SCAN RATE"
          value={selectedPlayer.scanRate}
          unit="esc/min"
          benchmark={3.1}
          color="var(--accent-blue)"
          delay={0.1}
        />
        <BigKPICard
          label="SPRINT VALUE SCORE"
          value={selectedPlayer.sprintValueScore}
          unit="sprints"
          benchmark={5.2}
          color="var(--accent-amber)"
          delay={0.2}
        />
      </div>

      {/* Pitch + Chemistry */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '0.75rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div className="section-label">Patrón de Movimiento — 105×68m</div>
          <PitchHeatmap player={selectedPlayer} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="card" style={{ padding: '1.25rem', flex: 1 }}>
            <div className="section-label">Chemistry Score</div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                <svg viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="28" cy="28" r="22" fill="none" stroke="var(--bg-tertiary)" strokeWidth="5" />
                  <circle
                    cx="28" cy="28" r="22"
                    fill="none"
                    stroke="var(--accent-green)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${(selectedPlayer.chemistryScore / 100) * 138.2} 138.2`}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'JetBrains Mono', fontSize: '0.85rem',
                  fontWeight: 700, color: 'var(--accent-green)',
                }}>
                  {selectedPlayer.chemistryScore}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Mayor correlación con</div>
                <div style={{
                  fontFamily: 'Space Grotesk', fontWeight: 700,
                  fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.2rem',
                }}>
                  {selectedPlayer.chemistryPartner || 'N/D'}
                </div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: '1.25rem', flex: 1 }}>
            <div className="section-label">Fatigue Signature</div>
            <div style={{
              fontFamily: 'JetBrains Mono', fontSize: '2rem', fontWeight: 700,
              color: Math.abs(selectedPlayer.fatigueSig) > 18 ? 'var(--accent-red)' : 'var(--accent-amber)',
            }}>
              {selectedPlayer.fatigueSig}%
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              caída en segunda mitad
            </div>
          </div>
        </div>
      </div>

      {/* AI SPOTLIGHT — MAIN FEATURE */}
      <div ref={spotlightRef} className="ai-spotlight">
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: '1.25rem',
        }}>
          <div>
            <h3 style={{
              fontFamily: 'Space Grotesk', fontWeight: 700,
              fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.2rem',
            }}>
              Análisis Táctico con IA
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Claude analiza los KPIs 3D y genera un informe táctico de élite
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            style={{
              background: isAnalyzing ? 'rgba(0,255,135,0.05)' : 'var(--accent-green)',
              color: isAnalyzing ? 'var(--accent-green)' : 'var(--bg-primary)',
              border: isAnalyzing ? '1px solid rgba(0,255,135,0.3)' : 'none',
              borderRadius: '8px',
              padding: '0.65rem 1.5rem',
              fontFamily: 'Space Grotesk',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: isAnalyzing ? 'wait' : 'pointer',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
            }}
          >
            {isAnalyzing ? (
              <>
                <svg
                  width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Analizando...
              </>
            ) : (
              <>{isDone ? '↻ Re-analizar' : '✦ Analizar con IA'}</>
            )}
          </button>
        </div>

        {!aiText && !isAnalyzing && (
          <div style={{
            padding: '2rem', textAlign: 'center',
            background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
            color: 'var(--text-muted)', fontSize: '0.82rem',
          }}>
            Presioná{' '}
            <strong style={{ color: 'var(--accent-green)' }}>"Analizar con IA"</strong>
            {' '}para recibir el análisis táctico de{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>{selectedPlayer.name}</strong>
            {' '}basado en datos de tracking 3D
          </div>
        )}

        {(aiText || isAnalyzing) && (
          <div style={{
            background: 'rgba(0,0,0,0.25)', borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            borderLeft: '3px solid var(--accent-green)',
          }}>
            <p style={{
              fontFamily: 'Space Grotesk', fontSize: '0.95rem',
              lineHeight: 1.8, color: 'var(--text-primary)',
              margin: 0, whiteSpace: 'pre-wrap',
            }}>
              {aiText}
              {isAnalyzing && <span className="cursor-blink" />}
            </p>
          </div>
        )}
      </div>

      {/* Secondary KPIs grid */}
      <div>
        <div className="section-label">KPIs Secundarios — Tracking 3D Completo</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.6rem' }}>
          {[
            { key: 'courtVisionIndex',      label: 'Court Vision',      unit: '/100', benchmark: 68 },
            { key: 'slipstreamPressure',     label: 'Slipstream',        unit: '/100', benchmark: 60 },
            { key: 'positioningEPA',         label: 'Positioning EPA',   unit: 'pts',  benchmark: 0  },
            { key: 'pressureCollapseRate',   label: 'Pressure Collapse', unit: '/100', benchmark: 65 },
            { key: 'launchAngle3D',          label: 'Launch Angle 3D',   unit: '°',    benchmark: 30 },
            { key: 'coverageShadow',         label: 'Coverage Shadow',   unit: 'm²',   benchmark: 200 },
            { key: 'pressureIndex3D',        label: '3D Pressure Index', unit: '/100', benchmark: 60 },
            { key: 'bodyReadinessIndex',     label: 'Body Readiness',    unit: '/100', benchmark: 72 },
          ].map(({ key, label, unit, benchmark }) => {
            const val = selectedPlayer[key];
            const delta = typeof val === 'number' ? (val - benchmark).toFixed(1) : null;
            const isPositive = parseFloat(delta) >= 0;
            return (
              <div key={key} className="card" style={{ padding: '0.9rem 1rem' }}>
                <div style={{
                  fontSize: '0.55rem', color: 'var(--text-muted)',
                  letterSpacing: '0.1em', marginBottom: '0.35rem',
                }}>
                  {label.toUpperCase()}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono', fontSize: '1.4rem',
                    fontWeight: 700, color: 'var(--text-primary)',
                  }}>
                    {val !== undefined && val !== null ? val : '—'}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{unit}</span>
                </div>
                {delta !== null && (
                  <div style={{
                    fontSize: '0.62rem',
                    color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                    fontFamily: 'JetBrains Mono', marginTop: '0.2rem',
                  }}>
                    {isPositive ? '+' : ''}{delta} vs liga
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
