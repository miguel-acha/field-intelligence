import React, { useState, useMemo, useCallback } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { KPI_META } from '../../data/mockData';
import { queryAnalyst } from '../../services/claude';

// ---- Team colors ----
const TEAM_COLORS = {
  'Bayern München':     '#dc2626',
  'Borussia Dortmund':  '#fbbf24',
  'Bayer Leverkusen':   '#f97316',
  'RB Leipzig':         '#3b82f6',
};

function getTeamColor(team) {
  return TEAM_COLORS[team] || '#9ca3af';
}

// ---- KPI options ----
const KPI_OPTIONS = Object.entries(KPI_META).map(([key, meta]) => ({ key, label: meta.label, unit: meta.unit }));

// ---- All positions ----
const ALL_POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'AM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'SS', 'CF'];

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
        <div style={{ color: getTeamColor(p.team), fontSize: '0.68rem', marginBottom: '0.4rem' }}>{p.team} — {p.position}</div>
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

export default function AnalystMode({ match, onPlayerSelect, onViewChange }) {
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

  const teams = useMemo(() => {
    const t = [...new Set(match.players.map(p => p.team))];
    return t;
  }, [match]);

  // Filtered players
  const filteredPlayers = useMemo(() => {
    let ps = [...match.players];
    if (teamFilter !== 'all') ps = ps.filter(p => p.team === teamFilter);
    if (posFilter !== 'all') ps = ps.filter(p => p.position === posFilter);
    return ps;
  }, [match.players, teamFilter, posFilter]);

  // Sorted players for table
  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [filteredPlayers, sortKey, sortDir]);

  // Scatter data
  const scatterData = useMemo(() => {
    return filteredPlayers.map(p => ({
      name: p.name,
      team: p.team,
      position: p.position,
      x: p[xMetric],
      y: p[yMetric],
    }));
  }, [filteredPlayers, xMetric, yMetric]);

  // Group scatter by team
  const scatterByTeam = useMemo(() => {
    return teams.map(team => ({
      team,
      color: getTeamColor(team),
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
      await queryAnalyst(nlQuery, match, (chunk) => {
        setNlResponse(prev => prev + chunk);
      });
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

  // Table columns
  const TABLE_COLS = [
    { key: 'name',             label: 'Jugador',    mono: false },
    { key: 'position',         label: 'Pos',        mono: true },
    { key: 'spatialAwareness', label: 'Spatial',    mono: true },
    { key: 'courtVisionIndex', label: 'Vision',     mono: true },
    { key: 'sprintValueScore', label: 'Sprint V',   mono: true },
    { key: 'scanRate',         label: 'Scan Rate',  mono: true },
    { key: 'fatigueSig',       label: 'Fatigue',    mono: true },
    { key: 'positioningEPA',   label: 'EPA',        mono: true },
    { key: 'pressureCollapseRate', label: 'Pressure CR', mono: true },
    { key: 'coverageShadow',   label: 'Coverage m²', mono: true },
    { key: 'distanceCovered',  label: 'Dist. km',   mono: true },
    { key: 'topSpeed',         label: 'Top Spd',    mono: true },
  ];

  return (
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

      {/* ---- LEFT PANEL: Filters ---- */}
      <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div className="section-heading">Filtros</div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
              Equipo
            </label>
            <select
              className="input-field"
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
            >
              <option value="all">Todos los equipos</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
              Posición
            </label>
            <select
              className="input-field"
              value={posFilter}
              onChange={e => setPosFilter(e.target.value)}
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
            >
              <option value="all">Todas las posiciones</option>
              {[...new Set(match.players.map(p => p.position))].sort().map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div className="section-heading">Ejes del Scatter</div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.65rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
              Eje X
            </label>
            <select
              className="input-field"
              value={xMetric}
              onChange={e => setXMetric(e.target.value)}
              style={{ fontSize: '0.72rem', padding: '0.4rem 0.65rem' }}
            >
              {KPI_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.65rem', color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
              Eje Y
            </label>
            <select
              className="input-field"
              value={yMetric}
              onChange={e => setYMetric(e.target.value)}
              style={{ fontSize: '0.72rem', padding: '0.4rem 0.65rem' }}
            >
              {KPI_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Quick stats */}
        <div className="card" style={{ padding: '1rem' }}>
          <div className="section-heading">Resumen</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div className="stat-row">
              <span className="stat-label">Jugadores</span>
              <span className="stat-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                {filteredPlayers.length}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Avg Spatial</span>
              <span className="stat-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                {filteredPlayers.length
                  ? (filteredPlayers.reduce((s, p) => s + p.spatialAwareness, 0) / filteredPlayers.length).toFixed(1)
                  : '—'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Avg Scan Rate</span>
              <span className="stat-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                {filteredPlayers.length
                  ? (filteredPlayers.reduce((s, p) => s + p.scanRate, 0) / filteredPlayers.length).toFixed(2)
                  : '—'}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Max Sprint V</span>
              <span className="stat-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', color: 'var(--accent-green)' }}>
                {filteredPlayers.length ? Math.max(...filteredPlayers.map(p => p.sprintValueScore)) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- RIGHT CONTENT ---- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>

        {/* ---- SCATTER CHART ---- */}
        <div className="card">
          <div className="section-heading">
            Scatter Plot — {xMeta.label} × {yMeta.label}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name={xMeta.label}
                label={{ value: `${xMeta.label} ${xMeta.unit}`, position: 'insideBottomRight', offset: -10, fill: 'var(--text-muted)', fontSize: 11 }}
                tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                stroke="var(--border-bright)"
              />
              <YAxis
                type="number"
                dataKey="y"
                name={yMeta.label}
                label={{ value: `${yMeta.label} ${yMeta.unit}`, angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }}
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
          {/* Team legend */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {teams.map(team => (
              <div key={team} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: getTeamColor(team) }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'Space Grotesk, sans-serif' }}>{team}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- DATA TABLE ---- */}
        <div className="card" style={{ padding: '0.75rem', overflowX: 'auto' }}>
          <div className="section-heading" style={{ padding: '0 0.25rem', marginBottom: '0.75rem' }}>
            Data Table — {sortedPlayers.length} jugadores
          </div>
          <table className="data-table">
            <thead>
              <tr>
                {TABLE_COLS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      color: sortKey === col.key ? 'var(--accent-green)' : undefined,
                      userSelect: 'none',
                    }}
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
                    let val = player[col.key];
                    let style = {};

                    if (col.key === 'name') {
                      return (
                        <td key={col.key}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8rem' }}>
                              {val}
                            </span>
                            {player.goals > 0 && <span className="tag tag-green" style={{ fontSize: '0.52rem' }}>⚽{player.goals}</span>}
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
                            color: 'var(--accent-blue)',
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
                    } else if (col.key === 'spatialAwareness' || col.key === 'courtVisionIndex') {
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

        {/* ---- NATURAL LANGUAGE QUERY ---- */}
        <div className="card">
          <div className="section-heading">Natural Language Query — IA Analista</div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              className="input-field"
              type="text"
              placeholder="Preguntá en español o inglés... ej: ¿Qué jugador tuvo más fatiga en el segundo tiempo?"
              value={nlQuery}
              onChange={e => setNlQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleQuery}
              disabled={isQuerying || !nlQuery.trim()}
              style={{ flexShrink: 0, opacity: isQuerying ? 0.7 : 1 }}
            >
              {isQuerying ? (
                <div className="ai-loading-dots">
                  <div className="ai-loading-dot" />
                  <div className="ai-loading-dot" />
                  <div className="ai-loading-dot" />
                </div>
              ) : (
                '✦ Consultar'
              )}
            </button>
          </div>

          {/* Suggested queries */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {[
              '¿Qué jugador tuvo más fatiga en el segundo tiempo?',
              'Who had the highest Sprint Value Score?',
              '¿Cuál fue el Scan Rate más alto del partido?',
              '¿Qué portero tuvo el mejor Body Readiness Index?',
            ].map(q => (
              <button
                key={q}
                className="btn btn-ghost"
                style={{ fontSize: '0.68rem', padding: '0.3rem 0.65rem' }}
                onClick={() => setNlQuery(q)}
              >
                {q.length > 40 ? q.substring(0, 40) + '…' : q}
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
            <div className="ai-analysis-card">
              <span className="ai-badge">✦ Claude Analyst</span>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Q: {nlQuery}
              </div>
              <div className="streaming-text">
                {nlResponse}
                {isQuerying && <span className="streaming-cursor" />}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
