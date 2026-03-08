import { useState } from 'react';
import type { BenefitStatus } from '../types';

interface Props {
  benefit: BenefitStatus;
  mode: 'usage' | 'perceived';
  onSave: (value: number, notes?: string, targetDate?: string) => void;
  onClose: () => void;
}

function getInitialAmount(benefit: BenefitStatus, mode: 'usage' | 'perceived'): string {
  if (mode === 'usage') {
    return benefit.amount_used > 0 ? benefit.amount_used.toString() : '';
  }
  return benefit.perceived_max_value.toString();
}

export default function UsageModal({ benefit, mode, onSave, onClose }: Props) {
  const [amount, setAmount] = useState(() => getInitialAmount(benefit, mode));
  const [notes, setNotes] = useState('');
  const [targetDate, setTargetDate] = useState(() =>
    mode === 'usage' ? (benefit.period_start_date || '') : '',
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) return;
    if (mode === 'usage' && val > benefit.max_value) return;
    onSave(val, mode === 'usage' ? notes : undefined, mode === 'usage' && targetDate ? targetDate : undefined);
  };

  const periodLabel = benefit.period_start_date ? (() => {
    const d = new Date(benefit.period_start_date + 'T00:00:00');
    const m = d.toLocaleString('en-US', { month: 'short' });
    const y = d.getFullYear();
    switch (benefit.period_type) {
      case 'monthly': return `${m} ${y}`;
      case 'quarterly': return `Q${Math.floor(d.getMonth() / 3) + 1} ${y}`;
      case 'semiannual': return `H${d.getMonth() < 6 ? 1 : 2} ${y}`;
      case 'annual': return `${y}`;
      default: return '';
    }
  })() : '';
  const title = mode === 'usage'
    ? `${benefit.usage_id ? 'Edit' : 'Log'} Usage: ${benefit.name}${periodLabel ? ` (${periodLabel})` : ''}`
    : `Set Perceived Value: ${benefit.name}`;
  const maxHint = mode === 'usage' ? `Max: $${benefit.max_value} per period` : 'Your valuation of this benefit';

  return (
    <div
      data-testid="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
        animation: 'fadeInUp 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px',
          width: '100%',
          maxWidth: 400,
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-elevated)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.15rem',
          fontWeight: 600,
          marginBottom: 4,
        }}>
          {title}
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          {maxHint}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Amount ($)
            </label>
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0"
              max={mode === 'usage' ? benefit.max_value : undefined}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ width: '100%' }}
              placeholder="0.00"
            />
          </div>

          {mode === 'usage' && (
            <>
              <button
                type="button"
                onClick={() => setAmount(benefit.max_value.toString())}
                style={{
                  marginBottom: 16,
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(201, 168, 76, 0.12)',
                  color: 'var(--accent-gold)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid rgba(201, 168, 76, 0.2)',
                  transition: 'background 0.2s',
                }}
              >
                Use Full Amount (${benefit.max_value})
              </button>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%' }}
                  placeholder="e.g. Uber Eats order"
                />
              </div>

              {!benefit.usage_id && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Period date (optional — for logging past months)
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Leave blank for current period. Pick any date within the target month/quarter.
                  </div>
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)',
                fontSize: '0.9rem',
                fontWeight: 500,
                border: '1px solid var(--border-medium)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 24px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))',
                color: '#0a0a0f',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
