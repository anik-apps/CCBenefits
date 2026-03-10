import { useState } from 'react';
import type { BenefitStatus, PeriodSegment } from '../types';
import { getIssuerColor } from '../constants/issuerTheme';
import { getCategoryColor, getCategoryIcon } from '../constants/categoryTheme';

interface Props {
  benefit: BenefitStatus;
  cardName?: string;
  issuer?: string;
  onToggleBinary: (benefitId: number, used: boolean) => void;
  onLogContinuous: (benefitId: number) => void;
  onSetPerceived: (benefitId: number) => void;
  onSegmentClick: (benefitId: number, segment: PeriodSegment) => void;
}

export default function BenefitRow({ benefit, cardName, issuer, onToggleBinary, onLogContinuous, onSetPerceived, onSegmentClick }: Props) {
  const [hovering, setHovering] = useState(false);
  const catIcon = getCategoryIcon(benefit.category);
  const catColor = getCategoryColor(benefit.category);
  // Left border uses issuer color when available; falls back to category color
  // for contexts where issuer isn't known (e.g. standalone benefit lists)
  const issuerBorderColor = issuer ? getIssuerColor(issuer).bg : catColor;
  const isExpiringSoon = benefit.days_remaining <= 7 && !benefit.is_used;
  const isBinary = benefit.redemption_type === 'binary';

  return (
    <div
      style={{
        padding: '12px 14px',
        background: hovering ? 'var(--bg-elevated)' : 'transparent',
        borderRadius: 'var(--radius-sm)',
        borderLeft: `3px solid ${issuerBorderColor}`,
        transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Single row: category icon + name + toggle + amount + perceived */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Category icon box */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-sm)',
          background: `${catColor}20`,
          border: `1px solid ${catColor}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.3rem',
          flexShrink: 0,
        }}>
          {catIcon}
        </div>

        {/* Name + description + card name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {benefit.name}
              </span>
              {isExpiringSoon && (
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  color: 'var(--accent-red)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  padding: '1px 5px',
                  borderRadius: 3,
                  flexShrink: 0,
                }}>
                  {benefit.days_remaining}d
                </span>
              )}
            </div>
            {benefit.description && (
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>{benefit.description}</div>
            )}
            {cardName && (
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>{cardName}</div>
            )}
          </div>
        </div>

        {/* Toggle/amount button */}
        <div style={{ flexShrink: 0 }}>
          {isBinary ? (
            <button
              role="switch"
              aria-checked={benefit.is_used}
              aria-label={benefit.name}
              onClick={() => onToggleBinary(benefit.benefit_template_id, !benefit.is_used)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: benefit.is_used ? 'var(--accent-emerald)' : 'var(--bg-input)',
                border: `1px solid ${benefit.is_used ? 'var(--accent-emerald)' : 'var(--border-medium)'}`,
                position: 'relative',
                transition: 'background 0.25s, border-color 0.25s',
                padding: 0,
              }}
            >
              <div style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 1,
                left: benefit.is_used ? 17 : 1,
                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </button>
          ) : (
            <button
              onClick={() => onLogContinuous(benefit.benefit_template_id)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                background: benefit.is_used ? 'rgba(52, 211, 153, 0.15)' : 'var(--bg-input)',
                border: `1px solid ${benefit.is_used ? 'rgba(52, 211, 153, 0.3)' : 'var(--border-medium)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: benefit.is_used ? 'var(--accent-emerald)' : 'var(--text-muted)',
                transition: 'all 0.2s',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {benefit.amount_used > 0 ? `$${benefit.amount_used.toFixed(0)}` : '+'}
            </button>
          )}
        </div>

        {/* Amount / max */}
        <span style={{
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}>
          ${benefit.amount_used.toFixed(0)}/${benefit.max_value.toFixed(0)}
        </span>

        {/* Perceived */}
        <button
          onClick={(e) => { e.stopPropagation(); onSetPerceived(benefit.benefit_template_id); }}
          style={{
            fontSize: '0.68rem',
            color: benefit.perceived_max_value !== benefit.max_value ? 'var(--accent-gold)' : 'var(--text-muted)',
            padding: 0,
            flexShrink: 0,
            minWidth: 55,
            textAlign: 'right',
          }}
          title="Set perceived value"
        >
          {benefit.perceived_max_value !== benefit.max_value ? '\u2605' : '\u2606'} ${benefit.utilized_perceived_value.toFixed(0)}/${benefit.perceived_max_value.toFixed(0)}
        </button>
      </div>

      {/* Period segments */}
      {benefit.periods.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 3,
          marginTop: 8,
          marginLeft: 54,
        }}>
          {benefit.periods.map((seg) => {
            const pct = benefit.max_value > 0 ? (seg.amount_used / benefit.max_value) : 0;
            const isClickable = !seg.is_future;

            let bgColor: string;
            let icon = '';
            if (seg.is_future) {
              bgColor = 'var(--bg-input)';
            } else if (seg.is_used && pct >= 1) {
              bgColor = 'var(--accent-emerald)';
              icon = '\u2713';
            } else if (seg.is_used) {
              bgColor = 'var(--accent-amber)';
              icon = '\u00BD';
            } else if (!seg.is_current) {
              bgColor = 'rgba(239, 68, 68, 0.25)';
              icon = '\u2717';
            } else {
              bgColor = 'rgba(255,255,255,0.08)';
            }

            return (
              <button
                key={seg.label}
                onClick={isClickable ? () => onSegmentClick(benefit.benefit_template_id, seg) : undefined}
                disabled={!isClickable}
                title={`${seg.label}: $${seg.amount_used.toFixed(0)}/$${benefit.max_value.toFixed(0)}${seg.is_current ? ' (current)' : ''}${seg.is_future ? ' (future)' : ''}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  padding: 0,
                  cursor: isClickable ? 'pointer' : 'default',
                  opacity: seg.is_future ? 0.4 : 1,
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => { if (isClickable) e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <div style={{
                  width: '100%',
                  height: 22,
                  borderRadius: 4,
                  background: bgColor,
                  transition: 'background 0.3s',
                  border: seg.is_current ? '1.5px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: seg.is_used ? '#fff' : 'var(--text-muted)',
                }}>
                  {icon}
                </div>
                <span style={{
                  fontSize: '0.5rem',
                  color: seg.is_current ? 'var(--text-secondary)' : 'var(--text-muted)',
                  fontWeight: seg.is_current ? 600 : 400,
                  lineHeight: 1,
                }}>
                  {seg.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
