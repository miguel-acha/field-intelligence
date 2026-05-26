import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { gsap } from 'gsap';
import { KPI_META } from '../../data/mockData';
import { queryAnalyst } from '../../services/claude';

// ---- Team colors ----
const TEAM_COLORS = {
  'Bayern München':    '#dc2626',
  'Borussia Dortmund': '#fbbf24',
  'Bayer Leverkusen':  '#f97316',
  'RB Leipzig':        '#3b82f6',
};

function getTeamColor(team) {
  return TEAM_COLORS[team] || '#9ca3af';
}

// ---- KPI options ----
const KPI_OPTIONS = Object.entries(KPI_META).map(([key, meta]) => ({ key, label: meta.label, unit: meta.unit }));

// ---- Custom Scatter Tooltip ----
function ScatterTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const p = payload[0].payload;
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-bright)',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        fontSize: '0.78rem',
        fontFamily: 'Space Grotesk, sans-serif',
        maxWidth: '200px',
      }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>{p.name}</div>
        <div style={{ color: getTeamColor(p.team), fontSize: '0.68rem', marginBottom: '0.4rem' }}>
          {p.team} — {p.position}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>X:</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{p.x}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Y:</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{p.y}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// ---- Filter pill button ----
function FilterPill({ label, value, options, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{
        fontSize: '0.6rem', color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600,
      }}>
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input-field"
        style={{
          fontSize: '0.75rem', padding: '0.3rem 2rem 0.3rem 0.6rem',
          height: '28px', borderRadius: '6px', width: 'auto',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function AnalystMode({ match, onPlayerSelect, onViewChange }) {
  const containerRef = useRef(null);
  const [teamFilter, setTeamFilter] = useState('all');
  const [posFilter, setPosFilter] = useState('all');
  const [xMetric, setXMetric] = useState('spatialAwareness');
  const [yMetric, setYMetric] = useState('scanRate');
  const [sortKey, setSortKey] = useState('spatialAwareness');
  const [sortDir, setSortDir] = useState('desc');
  const [nlQuery, setNlQuery] = useState('');
  const [nlResponse, setNlResponse] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [queryDone, setQueryDone] = useState(false);
  const nlSpotlightRef = useRef(null);
  const nlPulseAnim = useRef(null);

  // Entry animation
  useEffect(() => {
    if (containerRef.current) {
      gsap.from(containerRef.current, { opacity: 0, y: 12, duration: 0.5, ease: 'power2.out' });
    }
  }, []);

  // NL spotlight pulse while querying
  useEffect(() => {
    if (!nlSpotlightRef.current) return;
    if (isQuerying) {
      nlPulseAnim.current = gsap.to(nlSpotlightRef.current, {
        boxShadow: '0 0 40px rgba(0,255,135,0.18), 0 0 80px rgba(0,255,135,0.06)',
        repeat: -1, yoyo: true, duration: 1.2, ease: 'sine.inOut',
      });
    } else {
      if (nlPulseAnim.current) nlPulseAnim.current.kill();
      gsap.to(nlSpotlightRef.current, { boxShadow: 'none', duration: 0.4 });
    }
  }, [isQuerying]);

  const teams = useMemo(() => [...new Set(match.players.map(p => p.team))], [match]);

  const filteredPlayers = useMemo(() => {
    let ps = [...match.players];
    if (teamFilter !== 'all') ps = ps.filter(p => p.team === teamFilter);
    if (posFilter !== 'all') ps = ps.filter(p => p.position === posFilter);
    return ps;
  }, [match.players, teamFilter, posFilter]);

  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [filteredPlayers, sortKey, sortDir]);

  const scatterData = useMemo(() => {
    return filteredPlayers.map(p => ({
      name: p.name, team: p.team, position: p.position,
      x: p[xMetric], y: p[yMetric],
    }));
  }, [filteredPlayers, xMetric, yMetric]);

  const scatterByTeam = useMemo(() => {
    return teams.map(team => ({
      team, color: getTeamColor(team),
      data: scatterData.filter(p => p.team === team),
    }));
  }, [scatterData, teams]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function handlePlayerRowClick(player) {
    const full = match.players.find(p => p.name === player.name);
    if (full) {
      onPlayerSelect(full);
      onViewChange('player');
    }
  }

  const handleQuery = useCallback(async () => {
    if (!nlQuery.trim() || isQuerying) return;
    setIsQuerying(true);
    setNlResponse('');
    setQueryError('');
    setQueryDone(false);
    try {
      await queryAnalyst(nlQuery, match, chunk => setNlResponse(prev => prev + chunk));
      setQueryDone(true);
    } catch (err) {
      if (err.message === 'NO_API_KEY') {
        setQueryError('Para usar el analyst IA, agregá VITE_ANTHROPIC_API_KEY en el .env de frontend/');
      } else {
        setQueryError(`Error: ${err.message}`);
      }
    } finally {
      setIsQuerying(false);
    }
  }, [nlQuery, match, isQuerying]);

  const xMeta = KPI_META[xMetric] || {};
  const yMeta = KPI_META[yMetric] || {};

  // Simplified 8-column table
  const TABLE_COLS = [
    { key: 'name',             label: 'Jugador',   mono: false },
    { key: 'position',         label: 'Pos',       mono: true  },
    { key: 'spatialAwareness', label: 'Spatial',   mono: true  },
    { key: 'scanRate',         label: 'Scan Rate', mono: true  },
    { key: 'sprintValueScore', label: 'Sprint V',  mono: true  },
    { key: 'fatigueSig',       label: 'Fatigue',   mono: true  },
    { key: 'positioningEPA',   label: 'EPA',       mono: true  },
    { key: 'distanceCovered',  label: 'Dist. km',  mono: true  },
  ];

  const teamOptions = [
    { value: 'all', label: 'Todos los equipos' },
    ...teams.map(t => ({ value: t, label: t })),
  ];

  const posOptions = [
    { value: 'all', label: 'Todas las posiciones' },
    ...[...new Set(match.players.map(p => p.position))].sort().map(pos => ({ value: pos, label: pos })),
  ];

  const xOptions = KPI_OPTIONS.map(o => ({ value: o.key, label: o.label }));
  const yOptions = KPI_OPTIONS.map(o => ({ value: o.key, label: o.label }));

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>

      {/* ---- HORIZONTAL FILTER BAR ---- */}
      <div className="card" style={{ padding: '0.75rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterPill label="Equipo"  value={teamFilter} options={teamOptions} onChange={setTeamFilter} />
          <FilterPill label="Posición" value={posFilter}  options={posOptions}  onChange={setPosFilter} />
          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />
          <FilterPill label="Eje X"   value={xMetric}    options={xOptions}    onChange={setXMetric} />
          <FilterPill label="Eje Y"   value={yMetric}    options={yOptions}    onChange={setYMetric} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem' }}>
            {[
              { label: 'Jugadores',  value: filteredPlayers.length },
              {
                label: 'Avg Spatial',
                value: filteredPlayers.length
                  ? (filteredPlayers.reduce((s, p) => s + p.spatialAwareness, 0) / filteredPlayers.length).toFixed(1)
                  : '—',
              },
              {
                label: 'Max Sprint V',
                value: filteredPlayers.length ? Math.max(...filteredPlayers.map(p => p.sprintValueScore)) : '—',
                color: 'var(--accent-green)',
              },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '1rem',
                  color: s.color || 'var(--text-primary)',
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  {s.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- SCATTER CHART — bigger ---- */}
      <div className="card">
        <div className="section-label">
          Scatter Plot — {xMeta.label} × {yMeta.label}
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={xMeta.label}
              label={{
                value: `${xMeta.label} ${xMeta.unit}`,
                position: 'insideBottomRight', offset: -10,
                fill: 'var(--text-muted)', fontSize: 11,
              }}
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              stroke="var(--border-bright)"
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yMeta.label}
              label={{
                value: `${yMeta.label} ${yMeta.unit}`,
                angle: -90, position: 'insideLeft',
                fill: 'var(--text-muted)', fontSize: 11,
              }}
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              stroke="var(--border-bright)"
            />
            <Tooltip content={<ScatterTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            {scatterByTeam.map(({ team, color, data }) => (
              <Scatter key={team} name={team.split(' ')[0]} data={data} fill={color} opacity={0.8}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={color} />
                ))}
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {teams.map(team => (
            <div key={team} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: getTeamColor(team) }} />
              <span style={{
                fontSize: '0.65rem', color: 'var(--text-muted)',
                fontFamily: 'Space Grotesk, sans-serif',
              }}>
                {team}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- DATA TABLE — 8 columns ---- */}
      <div className="card" style={{ padding: '0.75rem', overflowX: 'auto' }}>
        <div className="section-label" style={{ padding: '0 0.25rem', marginBottom: '0.75rem' }}>
          Data Table — {sortedPlayers.length} jugadores
        </div>
        <table className="data-table">
          <thead>
            <tr>
              {TABLE_COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{ color: sortKey === col.key ? 'var(--accent-green)' : undefined }}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span style={{ marginLeft: '0.25rem', fontSize: '0.6rem' }}>
                      {sortDir === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map(player => (
              <tr
                key={player.name}
                onClick={() => handlePlayerRowClick(player)}
                title="Clic para ver perfil completo"
              >
                {TABLE_COLS.map(col => {
                  const val = player[col.key];
                  let style = {};

                  if (col.key === 'name') {
                    return (
                      <td key={col.key}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontFamily: 'Space Grotesk, sans-serif',
                            color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8rem',
                          }}>
                            {val}
                          </span>
                          {player.goals > 0 && (
                            <span className="tag tag-green" style={{ fontSize: '0.52rem' }}>
                              ⚽{player.goals}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  }

                  if (col.key === 'position') {
                    return (
                      <td key={col.key}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '0.68rem',
                          color: getTeamColor(player.team),
                          fontWeight: 600,
                        }}>
                          {val}
                        </span>
                      </td>
                    );
                  }

                  if (col.key === 'fatigueSig') {
                    style.color = val < -20 ? 'var(--accent-red)' : val < -15 ? 'var(--accent-amber)' : 'var(--text-secondary)';
                  } else if (col.key === 'positioningEPA') {
                    style.color = val > 1.5 ? 'var(--accent-green)' : val < 0 ? 'var(--accent-red)' : 'var(--text-secondary)';
                  } else if (col.key === 'spatialAwareness') {
                    style.color = val > 80 ? 'var(--accent-green)' : val > 65 ? 'var(--text-primary)' : 'var(--text-secondary)';
                  }

                  return (
                    <td key={col.key} className={col.mono ? 'mono' : ''} style={style}>
                      {val !== undefined && val !== null ? val : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- NATURAL LANGUAGE QUERY — AI Spotlight ---- */}
      <div ref={nlSpotlightRef} className="ai-spotlight">
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{
            fontFamily: 'Space Grotesk', fontWeight: 700,
            fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.2rem',
          }}>
            Natural Language Query — IA Analista
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Preguntá en español o inglés sobre cualquier dato del partido
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <input
            className="input-field"
            type="text"
            placeholder="¿Qué jugador tuvo más fatiga en el segundo tiempo?"
            value={nlQuery}
            onChange={e => setNlQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuery()}
            style={{ flex: 1 }}
          />
          <button
            onClick={handleQuery}
            disabled={isQuerying || !nlQuery.trim()}
            style={{
              background: isQuerying || !nlQuery.trim() ? 'rgba(0,255,135,0.05)' : 'var(--accent-green)',
              color: isQuerying || !nlQuery.trim() ? 'var(--accent-green)' : 'var(--bg-primary)',
              border: isQuerying || !nlQuery.trim() ? '1px solid rgba(0,255,135,0.3)' : 'none',
              borderRadius: '8px',
              padding: '0.65rem 1.25rem',
              fontFamily: 'Space Grotesk',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: isQuerying || !nlQuery.trim() ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              transition: 'all 0.2s',
            }}
          >
            {isQuerying ? (
              <>
                <svg
                  width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Consultando...
              </>
            ) : '✦ Consultar'}
          </button>
        </div>

        {/* Suggested queries */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: nlResponse || queryError ? '1rem' : 0 }}>
          {[
            '¿Qué jugador tuvo más fatiga en el segundo tiempo?',
            'Who had the highest Sprint Value Score?',
            '¿Cuál fue el Scan Rate más alto del partido?',
            '¿Qué portero tuvo el mejor Body Readiness Index?',
          ].map(q => (
            <button
              key={q}
              onClick={() => setNlQuery(q)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '0.25rem 0.6rem',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '0.68rem',
                fontFamily: 'Space Grotesk, sans-serif',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-green)'; e.currentTarget.style.color = 'var(--accent-green)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              {q.length > 42 ? q.substring(0, 42) + '…' : q}
            </button>
          ))}
        </div>

        {queryError && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px',
            fontSize: '0.82rem',
            color: 'var(--accent-red)',
          }}>
            ⚠ {queryError}
          </div>
        )}

        {(nlResponse || isQuerying) && (
          <div style={{
            background: 'rgba(0,0,0,0.25)', borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            borderLeft: '3px solid var(--accent-green)',
            marginTop: '0.75rem',
          }}>
            <div style={{
              fontSize: '0.62rem', color: 'var(--text-muted)',
              marginBottom: '0.75rem', fontFamily: 'Space Grotesk',
            }}>
              Q: {nlQuery}
            </div>
            <p style={{
              fontFamily: 'Space Grotesk', fontSize: '0.92rem',
              lineHeight: 1.8, color: 'var(--text-primary)',
              margin: 0, whiteSpace: 'pre-wrap',
            }}>
              {nlResponse}
              {isQuerying && <span className="cursor-blink" />}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
