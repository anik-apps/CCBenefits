import { Link } from 'react-router-dom';
import type { UserCardSummary } from '../types';
import UtilizationBar from './UtilizationBar';

const ISSUER_GRADIENTS: Record<string, string> = {
  'American Express': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'Chase': 'linear-gradient(135deg, #1a1a2e 0%, #1a2332 50%, #003087 100%)',
  'Citi': 'linear-gradient(135deg, #1a1a2e 0%, #1e2a3a 50%, #003b70 100%)',
  'Bilt': 'linear-gradient(135deg, #1a1a2e 0%, #2a1a2e 50%, #4a1942 100%)',
  'Capital One': 'linear-gradient(135deg, #1a1a2e 0%, #1a2a1e 50%, #1a4a2e 100%)',
  'Bank of America': 'linear-gradient(135deg, #1a1a2e 0%, #2e1a1a 50%, #5a1a1a 100%)',
};

const ISSUER_COLORS: Record<string, { bg: string; text: string }> = {
  'American Express': { bg: '#006FCF', text: '#FFFFFF' },
  'Chase': { bg: '#0A3D8F', text: '#FFFFFF' },
  'Capital One': { bg: '#D03027', text: '#FFFFFF' },
  'Citi': { bg: '#003B70', text: '#FFFFFF' },
  'Bilt': { bg: '#1A1A2E', text: '#C9A84C' },
  'Bank of America': { bg: '#DC1431', text: '#FFFFFF' },
};

interface Props {
  card: UserCardSummary;
  index: number;
}

export default function CardSummary({ card, index }: Props) {
  const gradient = ISSUER_GRADIENTS[card.issuer] || ISSUER_GRADIENTS['Chase'];
  const netColor = card.net_perceived >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)';
  const issuerColor = ISSUER_COLORS[card.issuer] || { bg: '#3a3a4a', text: '#FFFFFF' };
  const issuerInitials = card.issuer.split(' ').map(w => w[0] || '').join('');

  return (
    <Link
      to={`/card/${card.id}`}
      style={{
        display: 'block',
        animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
      }}
    >
      <div style={{
        background: gradient,
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-elevated)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        }}
      >
        {/* Top: name + fee + net */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 48,
            height: 32,
            borderRadius: 6,
            background: issuerColor.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: issuerColor.text,
            letterSpacing: 0.5,
            flexShrink: 0,
          }}>
            {issuerInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              fontWeight: 600,
              lineHeight: 1.3,
            }}>
              {card.nickname || card.card_name}
            </div>
            {card.nickname && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                {card.card_name}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              ${card.ytd_actual_used.toFixed(0)} / ${card.total_max_annual_value.toFixed(0)}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: netColor, fontVariantNumeric: 'tabular-nums', minWidth: 50, textAlign: 'right' }}>
              {card.net_perceived >= 0 ? '+' : ''}${card.net_perceived.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Bar */}
        <UtilizationBar current={card.ytd_actual_used} max={card.total_max_annual_value} height={4} />

        {/* Bottom: issuer + benefits count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span>{card.issuer} &middot; ${card.annual_fee}/yr</span>
          <span>{card.benefits_used_count}/{card.benefit_count} used</span>
        </div>
      </div>
    </Link>
  );
}
