import { useState, useRef } from 'react';

const STORAGE_KEY = 'ccb_added_years';

function getPersistedYears(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistYears(years: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(years));
}

interface YearPickerProps {
  selectedYear: number;
  onChange: (year: number) => void;
}

export default function YearPicker({ selectedYear, onChange }: YearPickerProps) {
  const currentYear = new Date().getFullYear();
  const [addedYears, setAddedYears] = useState<number[]>(getPersistedYears);
  const selectRef = useRef<HTMLSelectElement>(null);

  const visibleYears = [...new Set([currentYear, currentYear - 1, ...addedYears])]
    .filter(y => y >= 2020)
    .sort((a, b) => b - a);

  const minVisible = Math.min(...visibleYears);
  const nextAddableYear = minVisible > 2020 ? minVisible - 1 : null;

  const [confirmYear, setConfirmYear] = useState<number | null>(null);

  const handleChange = (value: string) => {
    if (value.startsWith('add-')) {
      const yearToAdd = Number(value.replace('add-', ''));
      setConfirmYear(yearToAdd);
      // Reset select back to current selection
      if (selectRef.current) selectRef.current.value = String(selectedYear);
    } else {
      onChange(Number(value));
    }
  };

  const confirmAdd = () => {
    if (confirmYear === null) return;
    const updated = [...addedYears, confirmYear];
    setAddedYears(updated);
    persistYears(updated);
    onChange(confirmYear);
    setConfirmYear(null);
  };

  return (
    <>
    <select
      ref={selectRef}
      value={selectedYear}
      onChange={(e) => handleChange(e.target.value)}
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
      {visibleYears.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
      {nextAddableYear && (
        <>
          <option disabled>──────</option>
          <option value={`add-${nextAddableYear}`} style={{ fontStyle: 'italic', color: 'gray' }}>
            add {nextAddableYear}?
          </option>
        </>
      )}
    </select>

      {confirmYear !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setConfirmYear(null)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)', padding: 24,
            width: 320, maxWidth: '90vw', textAlign: 'center',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>
              Add {confirmYear}?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              This will let you view and log benefit usage for {confirmYear}.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmYear(null)}
                style={{ padding: '8px 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAdd}
                style={{
                  padding: '8px 20px', fontSize: '0.85rem', fontWeight: 600,
                  background: 'rgba(212, 175, 55, 0.15)', color: 'var(--accent-gold)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.3)',
                }}
              >
                Add {confirmYear}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
