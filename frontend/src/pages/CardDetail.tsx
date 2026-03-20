import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserCard, getUserCardSummary, logUsage, updateUsage, deleteUsage, deleteUserCard, updateBenefitSetting, updateUserCard, closeCard, reopenCard } from '../services/api';
import type { BenefitStatus, PeriodSegment } from '../types';
import BenefitRow from '../components/BenefitRow';
import UsageModal from '../components/UsageModal';
import UtilizationBar from '../components/UtilizationBar';
import LoadingSpinner from '../components/LoadingSpinner';
import { PERIOD_ORDER, PERIOD_LABELS } from '../constants/periodLabels';

export default function CardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ benefit: BenefitStatus; mode: 'usage' | 'perceived' } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingRenewal, setEditingRenewal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeDate, setCloseDate] = useState('');

  const { data: card, isLoading, isError } = useQuery({
    queryKey: ['user-card', id],
    queryFn: () => getUserCard(Number(id)),
    enabled: !!id,
    refetchOnMount: 'always',
  });

  const { data: summary } = useQuery({
    queryKey: ['user-card-summary', id],
    queryFn: () => getUserCardSummary(Number(id)),
    enabled: !!id,
    refetchOnMount: 'always',
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['user-card', id] });
    queryClient.invalidateQueries({ queryKey: ['user-card-summary', id] });
  };

  const handleToggleBinary = async (benefitId: number, used: boolean) => {
    if (!card) return;
    const benefit = card.benefits_status.find(b => b.benefit_template_id === benefitId);
    if (!benefit) return;
    try {
      if (benefit.usage_id) {
        if (used) {
          await updateUsage(benefit.usage_id, benefit.max_value);
        } else {
          await deleteUsage(benefit.usage_id);
        }
      } else if (used) {
        await logUsage(card.id, benefitId, benefit.max_value);
      }
    } catch {
      // silently handle — refresh will show correct state
    }
    refresh();
  };

  const handleLogContinuous = (benefitId: number) => {
    if (!card) return;
    const benefit = card.benefits_status.find(b => b.benefit_template_id === benefitId);
    if (benefit) setModal({ benefit, mode: 'usage' });
  };

  const handleSetPerceived = (benefitId: number) => {
    if (!card) return;
    const benefit = card.benefits_status.find(b => b.benefit_template_id === benefitId);
    if (benefit) setModal({ benefit, mode: 'perceived' });
  };

  const handleSegmentClick = async (benefitId: number, segment: PeriodSegment) => {
    if (!card) return;
    const benefit = card.benefits_status.find(b => b.benefit_template_id === benefitId);
    if (!benefit) return;

    const isBinary = benefit.redemption_type === 'binary';

    if (isBinary) {
      // Toggle directly for binary benefits
      try {
        if (segment.usage_id) {
          if (segment.is_used) {
            await deleteUsage(segment.usage_id);
          } else {
            await updateUsage(segment.usage_id, benefit.max_value);
          }
        } else {
          await logUsage(card.id, benefitId, benefit.max_value, undefined, segment.period_start_date);
        }
      } catch {
        // silently handle
      }
      refresh();
    } else {
      // Open modal for continuous benefits, with segment context
      const segmentBenefit: BenefitStatus = {
        ...benefit,
        usage_id: segment.usage_id,
        amount_used: segment.amount_used,
        is_used: segment.is_used,
        period_start_date: segment.period_start_date,
        period_end_date: segment.period_end_date,
      };
      setModal({ benefit: segmentBenefit, mode: 'usage' });
    }
  };

  const handleModalSave = async (value: number, notes?: string, targetDate?: string) => {
    if (!modal || !card) return;
    try {
      if (modal.mode === 'usage') {
        if (modal.benefit.usage_id) {
          await updateUsage(modal.benefit.usage_id, value, notes);
        } else {
          await logUsage(card.id, modal.benefit.benefit_template_id, value, notes, targetDate);
        }
      } else {
        await updateBenefitSetting(card.id, modal.benefit.benefit_template_id, value);
      }
    } catch {
      // error handling — refresh will show correct state
    }
    setModal(null);
    refresh();
  };

  const handleDelete = async () => {
    if (!card) return;
    if (!confirm(`Delete "${card.nickname || card.card_name}"? All usage history will be permanently lost.`)) return;
    setDeleting(true);
    try {
      await deleteUserCard(card.id);
      queryClient.invalidateQueries({ queryKey: ['user-cards'] });
      navigate('/');
    } catch {
      setDeleting(false);
    }
  };

  const handleClose = async () => {
    if (!card || !closeDate) return;
    try {
      await closeCard(card.id, closeDate);
      setShowCloseModal(false);
      setCloseDate('');
      refresh();
      queryClient.invalidateQueries({ queryKey: ['user-cards'] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to close card';
      alert(msg);
    }
  };

  const handleReopen = async () => {
    if (!card) return;
    if (!confirm(`Reopen "${card.nickname || card.card_name}"?`)) return;
    try {
      await reopenCard(card.id);
      refresh();
      queryClient.invalidateQueries({ queryKey: ['user-cards'] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reopen card';
      alert(msg);
    }
  };

  if (isError) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--accent-red)' }}>
        <p>Failed to load card. Check that the backend is running.</p>
        <button onClick={() => navigate('/')} style={{ marginTop: 16, color: 'var(--text-secondary)', textDecoration: 'underline' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (isLoading || !card) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <LoadingSpinner />
      </div>
    );
  }

  // Group benefits by period type
  const grouped: Record<string, BenefitStatus[]> = {};
  for (const b of card.benefits_status) {
    if (!grouped[b.period_type]) grouped[b.period_type] = [];
    grouped[b.period_type].push(b);
  }

  // Use YTD values from summary (matches dashboard), fall back to current-period sums
  const ytdUsed = summary?.ytd_actual_used ?? card.benefits_status.reduce((s, b) => s + b.amount_used, 0);
  const ytdMaxAnnual = summary?.total_max_annual_value ?? card.benefits_status.reduce((s, b) => s + b.max_value, 0);
  const ytdPerceived = summary?.ytd_perceived_value ?? card.benefits_status.reduce((s, b) => s + b.utilized_perceived_value, 0);
  const ytdPerceivedMax = summary?.total_perceived_annual_value ?? ytdMaxAnnual;
  const netPerceived = summary?.net_perceived ?? (ytdPerceived - card.annual_fee);

  return (
    <div>
      {/* Header */}
      <div style={{
        animation: 'fadeInUp 0.4s ease-out both',
        marginBottom: 24,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ← Back
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {card.issuer}
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: 2,
            }}>
              {card.nickname || card.card_name}
            </h1>
            {card.nickname && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{card.card_name}</div>
            )}
            {card.closed_date && (
              <div style={{
                fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 500, marginTop: 4,
              }}>
                Closed {new Date(card.closed_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {card.closed_date ? (
              <button
                onClick={handleReopen}
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--accent-emerald)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                Reopen
              </button>
            ) : (
              <button
                onClick={() => setShowCloseModal(true)}
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Close
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                fontSize: '0.8rem',
                color: 'var(--accent-red)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                opacity: deleting ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Renewal date */}
        <div style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.8rem',
        }}>
          {card.renewal_date && !editingRenewal ? (
            <>
              <span style={{ color: 'var(--text-muted)' }}>Renews:</span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                {new Date(card.renewal_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <button
                onClick={() => setEditingRenewal(true)}
                style={{ color: 'var(--accent-gold)', fontSize: '0.75rem' }}
              >
                Edit
              </button>
              <button
                onClick={async () => {
                  await updateUserCard(card.id, { renewal_date: null });
                  refresh();
                }}
                style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
              >
                Clear
              </button>
            </>
          ) : editingRenewal || !card.renewal_date ? (
            <>
              <span style={{ color: 'var(--text-muted)' }}>
                {card.renewal_date ? 'Renewal date:' : 'Add renewal date for fee reminders'}
              </span>
              <input
                type="date"
                defaultValue={card.renewal_date ?? ''}
                onChange={async (e) => {
                  const val = e.target.value;
                  if (val) {
                    try {
                      await updateUserCard(card.id, { renewal_date: val });
                      setEditingRenewal(false);
                      refresh();
                    } catch (err) {
                      console.error('Failed to update renewal date:', err);
                      alert('Failed to update renewal date. Please try again.');
                    }
                  }
                }}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  padding: '3px 8px',
                  fontSize: '0.8rem',
                }}
              />
              {editingRenewal && (
                <button
                  onClick={() => setEditingRenewal(false)}
                  style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
                >
                  Cancel
                </button>
              )}
            </>
          ) : null}
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 12,
          marginTop: 16,
          padding: '16px 18px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>YTD Redeemed</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              ${ytdUsed.toFixed(0)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ ${ytdMaxAnnual.toFixed(0)}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>YTD Perceived</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--accent-gold)' }}>
              ${ytdPerceived.toFixed(0)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ ${ytdPerceivedMax.toFixed(0)}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Value</div>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: netPerceived >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)',
            }}>
              {netPerceived >= 0 ? '+' : ''}${netPerceived.toFixed(0)}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>vs ${card.annual_fee}/yr fee</div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <UtilizationBar current={ytdUsed} max={ytdMaxAnnual} height={6} showLabel />
        </div>
      </div>

      {/* Benefits grouped by period */}
      {PERIOD_ORDER.filter(p => grouped[p]).map((periodType, gi) => (
        <div key={periodType} style={{
          marginBottom: 20,
          animation: `fadeInUp 0.4s ease-out ${(gi + 1) * 0.08}s both`,
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            padding: '8px 18px',
            marginBottom: 4,
          }}>
            {PERIOD_LABELS[periodType]}
          </div>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}>
            {grouped[periodType].map((b, i) => (
              <div key={b.benefit_template_id}>
                {i > 0 && <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 18px' }} />}
                <BenefitRow
                  benefit={b}
                  issuer={card.issuer}
                  onToggleBinary={handleToggleBinary}
                  onLogContinuous={handleLogContinuous}
                  onSetPerceived={handleSetPerceived}
                  onSegmentClick={handleSegmentClick}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {modal && (
        <UsageModal
          benefit={modal.benefit}
          mode={modal.mode}
          onSave={handleModalSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Close card modal */}
      {showCloseModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setShowCloseModal(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)', padding: 24,
            width: 340, maxWidth: '90vw',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>
              Close Card
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              This will prevent usage logging after the close date. You can still view and edit past usage.
            </p>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Close date
            </label>
            <input
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCloseModal(false)}
                style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleClose}
                disabled={!closeDate}
                style={{
                  padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600,
                  background: 'rgba(212, 175, 55, 0.15)', color: 'var(--accent-gold)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.3)',
                  opacity: closeDate ? 1 : 0.5,
                }}
              >
                Close Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
