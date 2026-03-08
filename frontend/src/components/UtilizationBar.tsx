interface Props {
  current: number;
  max: number;
  height?: number;
  showLabel?: boolean;
}

export default function UtilizationBar({ current, max, height = 6, showLabel = false }: Props) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  let color = 'var(--accent-red)';
  if (pct >= 100) color = 'var(--accent-emerald)';
  else if (pct >= 50) color = 'var(--accent-amber)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          flex: 1,
          height,
          borderRadius: height / 2,
          background: 'var(--bg-input)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: height / 2,
          background: color,
          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
        }}>
          {pct > 0 && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 20,
              background: `linear-gradient(90deg, transparent, ${color}88)`,
              filter: 'blur(4px)',
            }} />
          )}
        </div>
      </div>
      {showLabel && (
        <span style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color,
          minWidth: 42,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
