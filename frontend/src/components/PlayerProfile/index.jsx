import React, { useState, useCallback, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { analyzePlayer } from '../../services/claude';

const TEAM_COLORS = {
  'Bayern München': '#E32219', 'Borussia Dortmund': '#F5C518',
  'Bayer Leverkusen': '#E32219', 'RB Leipzig': '#2979FF',
};
const tc = t => TEAM_COLORS[t] || '#E32219';

/* ─── Pitch heatmap — Gaussian density with heat colors ─── */
const POSITION_ZONES = {
  GK:{cx:5,cy:50}, CB:{cx:18,cy:50}, LB:{cx:20,cy:78}, RB:{cx:20,cy:22},
  CDM:{cx:35,cy:50}, CM:{cx:45,cy:50}, LM:{cx:45,cy:75}, RM:{cx:45,cy:25},
  AM:{cx:60,cy:50}, CAM:{cx:62,cy:50}, LW:{cx:65,cy:78}, RW:{cx:65,cy:22},
  SS:{cx:72,cy:50}, ST:{cx:80,cy:50}, CF:{cx:78,cy:50},
};
function seededDots(jerseyNumber, position, count = 80) {
  const zone = POSITION_ZONES[position] || { cx: 50, cy: 50 };
  let s = (jerseyNumber * 7919 + 12345) % 2147483647;
  const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const spreadX = position === 'GK' ? 10 : 28, spreadY = 24;
  return Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2, r = Math.sqrt(rng());
    return {
      x: Math.max(2, Math.min(98, zone.cx + Math.cos(angle) * r * spreadX)),
      y: Math.max(2, Math.min(98, zone.cy + Math.sin(angle) * r * spreadY)),
      weight: 0.4 + rng() * 0.6,
    };
  });
}

const HEAT_STOPS = [
  [0.00, [0,   0,   0,   0   ]],
  [0.12, [10,  0,   60,  0.45]],
  [0.30, [0,   30,  200, 0.65]],
  [0.50, [0,   190, 210, 0.78]],
  [0.65, [0,   210, 60,  0.85]],
  [0.78, [255, 220, 0,   0.90]],
  [0.90, [255, 110, 0,   0.95]],
  [1.00, [255, 20,  0,   1.00]],
];
function heatColor(t) {
  let i = 0;
  while (i < HEAT_STOPS.length - 2 && HEAT_STOPS[i + 1][0] <= t) i++;
  const [t0, c0] = HEAT_STOPS[i], [t1, c1] = HEAT_STOPS[i + 1];
  const f = (t - t0) / (t1 - t0);
  return [
    Math.round(c0[0] + f * (c1[0] - c0[0])),
    Math.round(c0[1] + f * (c1[1] - c0[1])),
    Math.round(c0[2] + f * (c1[2] - c0[2])),
    +(c0[3] + f * (c1[3] - c0[3])).toFixed(3),
  ];
}

function PitchHeatmap({ player }) {
  const W = 340, H = 212;
  const GW = 46, GH = 29;
  const cellW = W / GW, cellH = H / GH;

  const dots = seededDots(player.jerseyNumber, player.position);
  const grid = Array.from({ length: GH }, () => new Float32Array(GW));
  const sigma = 3.8, sigma2 = 2 * sigma * sigma, radius = Math.ceil(sigma * 3);

  dots.forEach(dot => {
    const gx = (dot.x / 100) * GW, gy = (dot.y / 100) * GH;
    const ixMin = Math.max(0, Math.floor(gx - radius));
    const ixMax = Math.min(GW - 1, Math.ceil(gx + radius));
    const iyMin = Math.max(0, Math.floor(gy - radius));
    const iyMax = Math.min(GH - 1, Math.ceil(gy + radius));
    for (let iy = iyMin; iy <= iyMax; iy++) {
      for (let ix = ixMin; ix <= ixMax; ix++) {
        const dx = ix + 0.5 - gx, dy = iy + 0.5 - gy;
        grid[iy][ix] += dot.weight * Math.exp(-(dx * dx + dy * dy) / sigma2);
      }
    }
  });

  let maxVal = 0;
  for (let iy = 0; iy < GH; iy++)
    for (let ix = 0; ix < GW; ix++)
      if (grid[iy][ix] > maxVal) maxVal = grid[iy][ix];

  const cells = [];
  for (let iy = 0; iy < GH; iy++) {
    for (let ix = 0; ix < GW; ix++) {
      const v = grid[iy][ix];
      if (v < maxVal * 0.05) continue;
      const [r, g, b, a] = heatColor(Math.min(1, v / maxVal));
      cells.push(
        <rect key={`${ix}-${iy}`}
          x={ix * cellW} y={iy * cellH}
          width={cellW + 0.6} height={cellH + 0.6}
          fill={`rgba(${r},${g},${b},${a})`}
        />
      );
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', borderRadius: 8 }}>
      <rect width={W} height={H} fill="#060606" rx="8" />
      {cells}
      <g stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" fill="none">
        <rect x="6" y="6" width={W - 12} height={H - 12} />
        <line x1={W / 2} y1="6" x2={W / 2} y2={H - 6} />
        <circle cx={W / 2} cy={H / 2} r="26" />
        <rect x="6" y={H * 0.22} width={W * 0.17} height={H * 0.56} />
        <rect x={W - 6 - W * 0.17} y={H * 0.22} width={W * 0.17} height={H * 0.56} />
      </g>
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
        borderBottom: '1px solid #1c1c1c',
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
  const aiScrollRef  = useRef(null);

  useEffect(() => {
    if (!selectedPlayer) {
      if (pickerRef.current) {
        // No opacity animation — just slide so content is always visible
        gsap.fromTo([...pickerRef.current.children],
          { x: -6 },
          { x: 0, stagger: 0.02, duration: 0.3, ease: 'power2.out', overwrite: true }
        );
      }
      return;
    }
    setAiText(''); setIsDone(false);
    if (headerRef.current) gsap.fromTo(headerRef.current,
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', overwrite: true }
    );
    if (kpiRef.current) gsap.fromTo([...kpiRef.current.children],
      { y: 10 },
      { y: 0, stagger: 0.07, duration: 0.35, ease: 'power2.out', overwrite: true }
    );
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

  useEffect(() => {
    if (aiScrollRef.current && aiText) {
      const el = aiScrollRef.current;
      gsap.to(el, { scrollTop: el.scrollHeight, duration: 0.3, ease: 'power2.out', overwrite: true });
    }
  }, [aiText]);

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

  /* ─── PICKER — two columns side by side ─── */
  if (!selectedPlayer) {
    const teams = [...new Set(match.players.map(p => p.team))];
    const colHeader = (
      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 44px 60px 55px 55px', gap: '0.6rem', padding: '0.4rem 0.75rem', borderBottom: '1px solid #1c1c1c', background: '#090909' }}>
        <div /><span style={{ fontSize: '0.44rem', color: '#555', letterSpacing: '0.1em', fontFamily: 'Inter' }}>JUGADOR</span>
        <span style={{ fontSize: '0.44rem', color: '#555', letterSpacing: '0.1em', fontFamily: 'Inter' }}>POS</span>
        <span style={{ fontSize: '0.44rem', color: '#555', letterSpacing: '0.1em', fontFamily: 'Inter', textAlign: 'center' }}>VIS</span>
        <span style={{ fontSize: '0.44rem', color: '#555', letterSpacing: '0.1em', fontFamily: 'Inter', textAlign: 'center' }}>SCN</span>
        <span style={{ fontSize: '0.44rem', color: '#555', letterSpacing: '0.1em', fontFamily: 'Inter', textAlign: 'center' }}>FAT</span>
      </div>
    );
    return (
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ padding: '1.5rem 2rem 0.75rem', borderBottom: '1px solid #1c1c1c' }}>
          <span className="section-label" style={{ margin: 0 }}>Seleccioná un jugador</span>
        </div>
        <div ref={pickerRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #1c1c1c' }}>
          {teams.map((team, ti) => (
            <div key={team} style={{ borderRight: ti === 0 ? '1px solid #1c1c1c' : 'none' }}>
              <div style={{ padding: '0.6rem 0.75rem', background: '#0a0a0a', borderBottom: '1px solid #1c1c1c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 3, height: 12, background: tc(team), borderRadius: 2 }} />
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '0.78rem', color: tc(team), letterSpacing: '0.1em' }}>
                  {team.toUpperCase()}
                </span>
              </div>
              {colHeader}
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
            {selectedPlayer.goals > 0 && (
              <span className="pill pill-green" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3.5" fill="none" stroke="#00C853" strokeWidth="1"/><circle cx="4" cy="4" r="1.2" fill="#00C853"/></svg>
                {selectedPlayer.goals} GOL{selectedPlayer.goals > 1 ? 'ES' : ''}
              </span>
            )}
            {selectedPlayer.assists > 0 && (
              <span className="pill pill-blue">
                {selectedPlayer.assists} ASIST.
              </span>
            )}
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

      {/* ── AI SPOTLIGHT — full width, top ── */}
      <div ref={spotlightRef} style={{
        padding: '2rem 2.5rem',
        borderBottom: '1px solid #1c1c1c',
        background: 'linear-gradient(180deg, rgba(227,34,25,0.04) 0%, transparent 60%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <img src="/data-accent.png" alt="" style={{ position: 'absolute', right: 0, top: 0, width: 200, opacity: 0.04, pointerEvents: 'none', userSelect: 'none' }} onError={e => { e.target.style.display = 'none'; }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.48rem', color: '#E32219', letterSpacing: '0.2em', fontFamily: 'Inter', fontWeight: 700, marginBottom: '0.3rem' }}>OPENCAMBA AI</div>
              <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.6rem', letterSpacing: '0.06em', color: '#fff', margin: 0, lineHeight: 1 }}>
                Análisis Táctico
              </h3>
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

          {/* AI output */}
          {!aiText && !isAnalyzing && (
            <div style={{ fontSize: '0.75rem', color: '#444', marginTop: '0.75rem' }}>
              Presioná <strong style={{ color: '#E32219' }}>Analizar con IA</strong> para el informe táctico de{' '}
              <strong style={{ color: '#fff' }}>{selectedPlayer.name.split(' ').slice(-1)[0]}</strong>
            </div>
          )}
          {(aiText || isAnalyzing) && (
            <div ref={aiScrollRef} style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: '1.25rem 1.5rem', borderLeft: '3px solid #E32219', maxHeight: 220, overflowY: 'auto', scrollBehavior: 'smooth' }}>
              <p style={{ fontFamily: 'Inter', fontSize: '0.88rem', lineHeight: 1.85, color: '#ddd', margin: 0, whiteSpace: 'pre-wrap' }}>
                {aiText}{isAnalyzing && <span className="cursor-blink" />}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── DATA ROW — pitch LEFT (big) + KPIs/stats RIGHT ── */}
      <div ref={kpiRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #1c1c1c' }}>

        {/* LEFT — Pitch heatmap, full height */}
        <div style={{ padding: '1.5rem 2rem', borderRight: '1px solid #1c1c1c', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="section-label" style={{ margin: 0 }}>Mapa de Movimiento</span>
            <span style={{ fontSize: '0.44rem', color: '#333', letterSpacing: '0.12em', fontFamily: 'Inter' }}>
              3D SKELETAL · {selectedPlayer.position} ZONE
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 260 }}>
            <PitchHeatmap player={selectedPlayer} />
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.25rem' }}>
            {[
              { label: 'Distancia', value: `${selectedPlayer.distanceCovered} km`, color: '#666' },
              { label: 'Velocidad max', value: `${selectedPlayer.topSpeed} km/h`, color: '#666' },
              { label: 'Minutos', value: `${selectedPlayer.minutesPlayed}'`, color: '#666' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '1rem', fontWeight: 700, color: '#aaa' }}>{s.value}</div>
                <div style={{ fontSize: '0.44rem', color: '#444', letterSpacing: '0.1em', fontFamily: 'Inter', marginTop: '0.1rem' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — KPIs top, Chemistry + Fatigue bottom */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* 2×2 KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', flex: 1 }}>
            <KPIBlock label="Spatial Awareness" value={selectedPlayer.spatialAwareness} unit="/100"    benchmark={71}  color="#00C853" delay={0}    />
            <KPIBlock label="Scan Rate"          value={selectedPlayer.scanRate}          unit="esc/min" benchmark={3.1} color="#2979FF" delay={0.08} />
            <KPIBlock label="Sprint Value"       value={selectedPlayer.sprintValueScore}  unit="sprints" benchmark={5.2} color="#FF9800" delay={0.16} />
            <KPIBlock label="Positioning EPA"    value={selectedPlayer.positioningEPA != null ? Math.abs(selectedPlayer.positioningEPA) : selectedPlayer.courtVisionIndex ?? 0} unit="EPA"    benchmark={1.0} color="#E32219" delay={0.24} />
          </div>

          {/* Chemistry + Fatigue side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #1c1c1c' }}>
            <div style={{ padding: '1.5rem', borderRight: '1px solid #1c1c1c' }}>
              <div className="section-label" style={{ marginBottom: '0.75rem' }}>Chemistry</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg viewBox="0 0 48 48" style={{ width: 48, height: 48, flexShrink: 0, transform: 'rotate(-90deg)' }}>
                  <circle cx="24" cy="24" r="19" fill="none" stroke="#1a1a1a" strokeWidth="4" />
                  <circle cx="24" cy="24" r="19" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${(selectedPlayer.chemistryScore / 100) * 119.4} 119.4`} />
                </svg>
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '1.8rem', fontWeight: 700, color, lineHeight: 1 }}>{selectedPlayer.chemistryScore}</div>
                  <div style={{ fontSize: '0.5rem', color: '#555', fontFamily: 'Inter', marginTop: '0.3rem' }}>
                    {selectedPlayer.chemistryPartner || '—'}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="section-label" style={{ marginBottom: '0.5rem' }}>Fatiga Muscular</div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.8rem', color: Math.abs(selectedPlayer.fatigueSig) > 18 ? '#E32219' : '#FF9800', lineHeight: 1 }}>
                {selectedPlayer.fatigueSig}%
              </div>
              <div style={{ fontSize: '0.48rem', color: '#555', marginTop: '0.35rem', letterSpacing: '0.08em', fontFamily: 'Inter' }}>
                CAÍDA EN 2DO TIEMPO
              </div>
              <div style={{ marginTop: '0.75rem', height: 3, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${Math.min(100, Math.abs(selectedPlayer.fatigueSig) * 3)}%`,
                  background: Math.abs(selectedPlayer.fatigueSig) > 18 ? '#E32219' : '#FF9800',
                }} />
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
