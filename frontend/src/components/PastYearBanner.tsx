interface PastYearBannerProps {
  year: number;
}

export default function PastYearBanner({ year }: PastYearBannerProps) {
  const currentYear = new Date().getFullYear();
  if (year >= currentYear) return null;

  return (
    <div style={{
      background: 'rgba(212, 175, 55, 0.12)',
      border: '1px solid rgba(212, 175, 55, 0.3)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 14px',
      marginBottom: 16,
      fontSize: '0.82rem',
      color: 'var(--accent-gold)',
      fontWeight: 500,
    }}>
      Viewing {year}. Edits to past years will be saved.
    </div>
  );
}
