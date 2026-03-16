interface BarChartProps {
  data: { label: string; value: number }[];
}

export default function BarChart({ data }: BarChartProps) {
  if (!data.length) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 120,
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
      }}>
        No cards
      </div>
    );
  }

  const barHeight = 28;
  const gap = 12;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: gap }}>
      {data.map((item) => {
        const pct = Math.max(0, Math.min(item.value, 100));
        return (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, height: barHeight }}>
            <div style={{
              width: 100,
              flexShrink: 0,
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {item.label}
            </div>
            <div style={{
              flex: 1,
              height: 12,
              borderRadius: 6,
              background: '#2a2a3a',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 6,
                background: '#c9a84c',
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{
              width: 44,
              flexShrink: 0,
              textAlign: 'right',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              {Math.round(pct)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
