import type { UserCardSummary } from '../types';

interface Props {
  cards: UserCardSummary[];
}

export default function ROISummary({ cards }: Props) {
  if (cards.length === 0) return null;

  const totalFees = cards.reduce((s, c) => s + c.annual_fee, 0);
  const totalRedeemed = cards.reduce((s, c) => s + c.ytd_actual_used, 0);
  const totalPerceived = cards.reduce((s, c) => s + c.ytd_perceived_value, 0);
  const netPerceived = totalPerceived - totalFees;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 12,
      marginBottom: 28,
      animation: 'fadeInUp 0.4s ease-out both',
    }}>
      <StatBox label="Total Fees" value={`$${totalFees.toLocaleString()}`} />
      <StatBox label="YTD Redeemed" value={`$${totalRedeemed.toFixed(0)}`} accent />
      <StatBox label="YTD Perceived" value={`$${totalPerceived.toFixed(0)}`} />
      <StatBox
        label="Net Value"
        value={`${netPerceived >= 0 ? '+' : ''}$${netPerceived.toFixed(0)}`}
        color={netPerceived >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)'}
      />
    </div>
  );
}

function StatBox({ label, value, accent, color }: {
  label: string;
  value: string;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 18px',
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
        marginBottom: 6,
        fontWeight: 500,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '1.25rem',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: color || (accent ? 'var(--accent-gold)' : 'var(--text-primary)'),
      }}>
        {value}
      </div>
    </div>
  );
}
