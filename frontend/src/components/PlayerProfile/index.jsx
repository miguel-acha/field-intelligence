import React, { useState, useCallback } from 'react';
import KPICard from '../shared/KPICard';
import { KPI_META } from '../../data/mockData';
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

// Generate reproducible dots using player's jersey number as seed
function seededDots(jerseyNumber, position, count = 45) {
  const zone = POSITION_ZONES[position] || { cx: 50, cy: 50 };
  let s = (jerseyNumber * 7919 + 12345) % 2147483647;
  const rng = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const spreadX = position === 'GK' ? 12 : position === 'CB' || position === 'LB' || position === 'RB' ? 20 : 30;
  const spreadY = 28;

  return Array.from({ length: count }, (_, i) => {
    const angle = rng() * Math.PI * 2;
    const r = rng();
    const dx = Math.cos(angle) * r * spreadX;
    const dy = Math.sin(angle) * r * spreadY;
    const opacity = 0.3 + rng() * 0.7;
    const size = 1 + rng() * 2.5;
    return {
      x: Math.max(2, Math.min(98, zone.cx + dx)),
      y: Math.max(2, Math.min(98, zone.cy + dy)),
      opacity,
      size,
    };
  });
}

// ---- Football pitch SVG ----
function PitchHeatmap({ player }) {
  const dots = seededDots(player.jerseyNumber, player.position);
  const W = 400, H = 260;

  // Perspective: map 0-100% to SVG coords
  const px = (x) => (x / 100) * W;
  const py = (y) => (y / 100) * H;

  return (
    <div className="pitch-wrapper" style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block' }}
      >
        {/* Pitch background */}
        <rect x="0" y="0" width={W} height={H} fill="#0d2a1a" />

        {/* Pitch lines */}
        <g stroke="rgba(0,255,135,0.25)" strokeWidth="1" fill="none">
          {/* Border */}
          <rect x="8" y="8" width={W - 16} height={H - 16} />
          {/* Halfway line */}
          <line x1={W / 2} y1="8" x2={W / 2} y2={H - 8} />
          {/* Center circle */}
          <circle cx={W / 2} cy={H / 2} r="32" />
          <circle cx={W / 2} cy={H / 2} r="2" fill="rgba(0,255,135,0.4)" />

          {/* Left penalty area */}
          <rect x="8" y={H * 0.22} width={W * 0.18} height={H * 0.56} />
          {/* Left goal area */}
          <rect x="8" y={H * 0.35} width={W * 0.07} height={H * 0.3} />
          {/* Left penalty spot */}
          <circle cx={W * 0.11} cy={H / 2} r="2" fill="rgba(0,255,135,0.4)" />

          {/* Right penalty area */}
          <rect x={W - 8 - W * 0.18} y={H * 0.22} width={W * 0.18} height={H * 0.56} />
          {/* Right goal area */}
          <rect x={W - 8 - W * 0.07} y={H * 0.35} width={W * 0.07} height={H * 0.3} />
          {/* Right penalty spot */}
          <circle cx={W * 0.89} cy={H / 2} r="2" fill="rgba(0,255,135,0.4)" />
        </g>

        {/* Goals */}
        <g fill="rgba(0,255,135,0.5)">
          <rect x="0" y={H * 0.38} width="8" height={H * 0.24} />
          <rect x={W - 8} y={H * 0.38} width="8" height={H * 0.24} />
        </g>

        {/* Heat dots */}
        {dots.map((dot, i) => (
          <circle
            key={i}
            cx={px(dot.x)}
            cy={py(dot.y)}
            r={dot.size}
            fill="var(--accent-green)"
            opacity={dot.opacity * 0.75}
          />
        ))}

        {/* Zone highlight */}
        {(() => {
          const zone = POSITION_ZONES[player.position] || { cx: 50, cy: 50 };
          return (
            <circle
              cx={px(zone.cx)}
              cy={py(zone.cy)}
              r="16"
              fill="rgba(0,255,135,0.08)"
              stroke="rgba(0,255,135,0.3)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          );
        })()}

        {/* Player label */}
        <text
          x={W - 10}
          y={H - 10}
          textAnchor="end"
          fill="rgba(0,255,135,0.4)"
          fontSize="9"
          fontFamily="JetBrains Mono, monospace"
        >
          #{player.jerseyNumber} {player.name.split(' ').pop()} — {player.position}
        </text>
      </svg>
    </div>
  );
}

// ---- KPI value with delta vs benchmark ----
function buildKpiCards(player) {
  return Object.entries(KPI_META).map(([key, meta]) => {
    const value = player[key];
    if (value === undefined || value === null) return null;
    const delta = parseFloat((value - meta.benchmark).toFixed(2));
    return {
      key,
      label: meta.label,
      value,
      unit: meta.unit,
      trend: delta,
      benchmark: meta.benchmark,
    };
  }).filter(Boolean);
}

// ---- Player Grid (when no player selected) ----
function PlayerPickerGrid({ players, onSelect }) {
  return (
    <div>
      <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
        Seleccioná un jugador para ver su perfil completo con análisis IA
      </div>
      <div className="player-grid">
        {players.map(player => (
          <div
            key={player.name}
            className="player-card"
            onClick={() => onSelect(player)}
          >
            <div className="player-number">#{player.jerseyNumber}</div>
            <div className="player-name">{player.name}</div>
            <div className="player-position">{player.position}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{player.team}</div>
            <div className="player-kpi-mini" style={{ marginTop: '0.5rem' }}>
              <div className="player-kpi-mini-row">
                <span className="player-kpi-mini-label">Spatial</span>
                <span className="player-kpi-mini-value">{player.spatialAwareness}</span>
              </div>
              <div className="player-kpi-mini-row">
                <span className="player-kpi-mini-label">Scan Rate</span>
                <span className="player-kpi-mini-value">{player.scanRate}</span>
              </div>
              <div className="player-kpi-mini-row">
                <span className="player-kpi-mini-label">Fatigue</span>
                <span className="player-kpi-mini-value" style={{ color: 'var(--accent-amber)' }}>
                  {player.fatigueSig}%
                </span>
              </div>
            </div>
            {(player.goals > 0 || player.assists > 0) && (
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {player.goals > 0 && <span className="tag tag-green">⚽ {player.goals}</span>}
                {player.assists > 0 && <span className="tag tag-blue">🅰️ {player.assists}</span>}
              </div>
            )}
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
  const [aiError, setAiError] = useState('');
  const [isDone, setIsDone] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!selectedPlayer || isAnalyzing) return;
    setIsAnalyzing(true);
    setAiText('');
    setAiError('');
    setIsDone(false);

    try {
      await analyzePlayer(selectedPlayer, match, (chunk) => {
        setAiText(prev => prev + chunk);
      });
      setIsDone(true);
    } catch (err) {
      if (err.message === 'NO_API_KEY') {
        setAiError('Para activar el análisis IA, agregá tu clave VITE_ANTHROPIC_API_KEY en el archivo .env de la carpeta frontend/');
      } else {
        setAiError(`Error al conectar con la API: ${err.message}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedPlayer, match, isAnalyzing]);

  if (!selectedPlayer) {
    return (
      <div>
        <div className="section-heading">Player Profile — Seleccioná un Jugador</div>
        <PlayerPickerGrid players={match.players} onSelect={onPlayerSelect} />
      </div>
    );
  }

  const kpiCards = buildKpiCards(selectedPlayer);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ---- BACK BUTTON ---- */}
      <button
        className="btn btn-ghost"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => onPlayerSelect(null)}
      >
        ← Todos los jugadores
      </button>

      {/* ---- PLAYER HEADER ---- */}
      <div className="card">
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Jersey number big display */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '12px',
            background: 'var(--bg-tertiary)',
            border: '2px solid var(--accent-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '1.8rem',
              fontWeight: 700,
              color: 'var(--accent-green)',
            }}>
              {selectedPlayer.jerseyNumber}
            </span>
          </div>

          {/* Name + position */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>
                {selectedPlayer.name}
              </h2>
              <span className="tag tag-blue" style={{ fontSize: '0.7rem' }}>{selectedPlayer.position}</span>
              {selectedPlayer.goals > 0 && <span className="tag tag-green">⚽ {selectedPlayer.goals} gol{selectedPlayer.goals > 1 ? 'es' : ''}</span>}
              {selectedPlayer.assists > 0 && <span className="tag tag-blue">🅰️ {selectedPlayer.assists} asist.</span>}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              {selectedPlayer.team}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Minutos',      value: `${selectedPlayer.minutesPlayed}'`,            color: 'var(--text-primary)' },
                { label: 'Distancia',    value: `${selectedPlayer.distanceCovered} km`,         color: 'var(--accent-blue)' },
                { label: 'Vel. Máx',     value: `${selectedPlayer.topSpeed} km/h`,              color: 'var(--accent-amber)' },
                { label: 'Fatigue Sig.', value: `${selectedPlayer.fatigueSig}%`,                color: 'var(--accent-red)' },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {stat.label}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.05rem', fontWeight: 700, color: stat.color }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key moment highlight */}
          {selectedPlayer.keyMoment && (
            <div style={{
              background: 'rgba(0,255,135,0.06)',
              border: '1px solid rgba(0,255,135,0.2)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              maxWidth: '280px',
              flexShrink: 0,
            }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.35rem' }}>
                Momento Clave — {selectedPlayer.keyMoment.minute}'
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {selectedPlayer.keyMoment.description}
              </div>
              <span className={`tag ${selectedPlayer.keyMoment.impact === 'high' ? 'tag-green' : 'tag-amber'}`} style={{ marginTop: '0.5rem', display: 'inline-flex' }}>
                {selectedPlayer.keyMoment.impact === 'high' ? 'Alto impacto' : 'Impacto medio'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* ---- KPI GRID ---- */}
        <div>
          <div className="section-heading">KPIs de Tracking 3D</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.65rem' }}>
            {kpiCards.map(kpi => (
              <KPICard
                key={kpi.key}
                label={kpi.label}
                value={kpi.value}
                unit={kpi.unit}
                trend={kpi.trend}
                benchmark={kpi.benchmark}
              />
            ))}
          </div>
        </div>

        {/* ---- RIGHT COLUMN: Chemistry + Pitch ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Chemistry card */}
          <div className="card">
            <div className="section-heading">Chemistry Score</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                position: 'relative',
                width: 64,
                height: 64,
                flexShrink: 0,
              }}>
                <svg viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="32" cy="32" r="26" fill="none" stroke="var(--bg-tertiary)" strokeWidth="6" />
                  <circle
                    cx="32" cy="32" r="26"
                    fill="none"
                    stroke="var(--accent-green)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(selectedPlayer.chemistryScore / 100) * 163.4} 163.4`}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--accent-green)',
                }}>
                  {selectedPlayer.chemistryScore}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Mayor correlación espacial con:
                </div>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {selectedPlayer.chemistryPartner || 'Compañero clave'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Coordinación de movimientos a lo largo del partido
                </div>
              </div>
            </div>
          </div>

          {/* Movement pattern / pitch heatmap */}
          <div className="card" style={{ padding: '1rem' }}>
            <div className="section-heading">Patrón de Movimiento</div>
            <PitchHeatmap player={selectedPlayer} />
            <div style={{ marginTop: '0.5rem', fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Distribución posicional — 105×68m — datos de tracking esquelético 3D
            </div>
          </div>
        </div>
      </div>

      {/* ---- AI ANALYSIS SECTION ---- */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div className="section-heading" style={{ marginBottom: 0 }}>
            Análisis IA Táctica
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            style={{ opacity: isAnalyzing ? 0.7 : 1, cursor: isAnalyzing ? 'wait' : 'pointer' }}
          >
            {isAnalyzing ? (
              <>
                <div className="ai-loading-dots">
                  <div className="ai-loading-dot" />
                  <div className="ai-loading-dot" />
                  <div className="ai-loading-dot" />
                </div>
                Analizando...
              </>
            ) : (
              <>✦ Analizar con IA</>
            )}
          </button>
        </div>

        {!aiText && !isAnalyzing && !aiError && (
          <div style={{
            padding: '1.5rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
          }}>
            Hacé clic en "Analizar con IA" para recibir un análisis táctico profundo de{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>{selectedPlayer.name}</strong>{' '}
            generado por Claude en tiempo real.
          </div>
        )}

        {aiError && (
          <div style={{
            padding: '1rem 1.25rem',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px',
            fontSize: '0.82rem',
            color: 'var(--accent-red)',
          }}>
            <strong>⚠ {aiError}</strong>
          </div>
        )}

        {(aiText || isAnalyzing) && (
          <div className="ai-analysis-card">
            <span className="ai-badge">✦ Claude</span>
            <div className="streaming-text">
              {aiText}
              {isAnalyzing && <span className="streaming-cursor" />}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
