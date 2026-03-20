interface YearPickerProps {
  years: number[];
  selectedYear: number;
  onChange: (year: number) => void;
}

export default function YearPicker({ years, selectedYear, onChange }: YearPickerProps) {
  if (years.length <= 1) return null;

  const sorted = [...years].sort((a, b) => b - a);

  return (
    <select
      value={selectedYear}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 12px',
        fontSize: '0.85rem',
        fontWeight: 600,
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {sorted.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );
}
