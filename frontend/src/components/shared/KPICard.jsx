import React from 'react';

function getTrendColor(trend) {
  if (trend === null || trend === undefined) return 'neutral';
  if (trend > 0) return 'positive';
  if (trend < 0) return 'negative';
  return 'neutral';
}

function getTrendArrow(trend) {
  if (trend === null || trend === undefined) return '';
  if (trend > 0) return '↑';
  if (trend < 0) return '↓';
  return '→';
}

function getAccentColor(trend) {
  if (trend === null || trend === undefined) return 'var(--accent-blue)';
  if (trend > 0) return 'var(--accent-green)';
  if (trend < 0) return 'var(--accent-red)';
  return 'var(--accent-blue)';
}

export default function KPICard({ label, value, unit, trend, benchmark, icon, compact = false }) {
  const trendClass = getTrendColor(trend);
  const arrow = getTrendArrow(trend);
  const accentColor = getAccentColor(trend);
  const absValue = value !== null && value !== undefined ? value : '—';

  return (
    <div
      className="kpi-card animate-in"
      style={{ '--kpi-accent': accentColor }}
    >
      <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        {icon && <span style={{ fontSize: '0.8rem' }}>{icon}</span>}
        {label}
      </div>

      <div className="kpi-value-row">
        <span className="kpi-main-value metric-value" style={{ color: accentColor }}>
          {absValue}
        </span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>

      {(trend !== null && trend !== undefined) && (
        <div className={`kpi-trend ${trendClass}`}>
          <span>{arrow}</span>
          <span>{trend > 0 ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(1) : trend}</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 400 }}>vs avg</span>
        </div>
      )}

      {benchmark !== undefined && (
        <div className="kpi-benchmark">
          Ref: <span className="metric-value" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {benchmark}{unit}
          </span>
        </div>
      )}
    </div>
  );
}
