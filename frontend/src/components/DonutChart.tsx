interface DonutChartProps {
  used: number;
  total: number;
}

export default function DonutChart({ used, total }: DonutChartProps) {
  const radius = 70;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let pct = 0;
  if (total > 0) {
    pct = Math.min(used / total, 1) * 100;
  }

  const usedLength = (pct / 100) * circumference;
  const remainingLength = circumference - usedLength;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox="0 0 200 200" width="180" height="180">
        {/* Background track */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#2a2a3a"
          strokeWidth={strokeWidth}
        />
        {/* Used arc */}
        {pct > 0 && (
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#c9a84c"
            strokeWidth={strokeWidth}
            strokeDasharray={`${usedLength} ${remainingLength}`}
            strokeDashoffset={circumference / 4}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        )}
        {/* Center text */}
        <text
          x="100"
          y="100"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text-primary, #fff)"
          fontSize="28"
          fontWeight="700"
          fontFamily="var(--font-display)"
        >
          {Math.round(pct)}%
        </text>
        <text
          x="100"
          y="126"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text-secondary, #888)"
          fontSize="12"
        >
          utilized
        </text>
      </svg>
    </div>
  );
}
