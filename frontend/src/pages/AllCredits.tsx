import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserCardDetails, logUsage, updateUsage, deleteUsage, updateBenefitSetting } from '../services/api';
import type { BenefitStatus, PeriodSegment, UserCardDetail } from '../types';
import BenefitRow from '../components/BenefitRow';
import UsageModal from '../components/UsageModal';
import LoadingSpinner from '../components/LoadingSpinner';
import YearPicker from '../components/YearPicker';
import PastYearBanner from '../components/PastYearBanner';
import { PERIOD_ORDER, PERIOD_LABELS } from '../constants/periodLabels';
import { getIssuerColor } from '../constants/issuerTheme';

const SHORT_PERIODS: Record<string, string> = {
  monthly: 'M',
  quarterly: 'Q',
  semiannual: 'SA',
  annual: 'A',
};

interface BenefitWithCard extends BenefitStatus {
  userCardId: number;
  cardName: string;
  issuer: string;
}

export default function AllCredits() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ benefit: BenefitWithCard; mode: 'usage' | 'perceived' } | null>(null);
  const [view, setView] = useState<'period' | 'card' | 'sheet'>('period');
  const [expandedSections, setExpandedSections] = useState<Set<string> | null>(null); // null = initial (first only)
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: cardDetails, isLoading } = useQuery({
    queryKey: ['all-card-details', year],
    queryFn: () => getUserCardDetails(year),
    refetchOnMount: 'always',
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['all-card-details', year] });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!cardDetails || cardDetails.length === 0) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-secondary)' }}>
        No cards added yet. Add cards from the Cards tab to see all credits here.
      </div>
    );
  }

  // Flatten all benefits with card context
  const allBenefits: BenefitWithCard[] = [];
  for (const card of cardDetails) {
    for (const b of card.benefits_status) {
      allBenefits.push({ ...b, userCardId: card.id, cardName: card.nickname || card.card_name, issuer: card.issuer });
    }
  }

  const benefitMap = new Map<string, BenefitWithCard>();
  for (const b of allBenefits) {
    benefitMap.set(`${b.userCardId}-${b.benefit_template_id}`, b);
  }

  // Group by period type
  const grouped: Record<string, BenefitWithCard[]> = {};
  for (const b of allBenefits) {
    if (!grouped[b.period_type]) grouped[b.period_type] = [];
    grouped[b.period_type].push(b);
  }

  const makeHandlers = (cardId: number) => ({
    onToggleBinary: async (benefitId: number, used: boolean) => {
      const b = benefitMap.get(`${cardId}-${benefitId}`);
      if (!b) return;
      try {
        if (b.usage_id) {
          if (used) await updateUsage(b.usage_id, b.max_value);
          else await deleteUsage(b.usage_id);
        } else if (used) {
          await logUsage(cardId, benefitId, b.max_value);
        }
      } catch (err) { console.error('Toggle failed:', err); }
      refresh();
    },
    onLogContinuous: (benefitId: number) => {
      const b = benefitMap.get(`${cardId}-${benefitId}`);
      if (b) setModal({ benefit: b, mode: 'usage' });
    },
    onSetPerceived: (benefitId: number) => {
      const b = benefitMap.get(`${cardId}-${benefitId}`);
      if (b) setModal({ benefit: b, mode: 'perceived' });
    },
    onSegmentClick: async (benefitId: number, segment: PeriodSegment) => {
      const b = benefitMap.get(`${cardId}-${benefitId}`);
      if (!b) return;
      if (b.redemption_type === 'binary') {
        try {
          if (segment.usage_id) {
            if (segment.is_used) await deleteUsage(segment.usage_id);
            else await updateUsage(segment.usage_id, b.max_value);
          } else {
            await logUsage(cardId, benefitId, b.max_value, undefined, segment.period_start_date);
          }
        } catch (err) { console.error('Segment toggle failed:', err); }
        refresh();
      } else {
        const segBenefit: BenefitWithCard = {
          ...b,
          usage_id: segment.usage_id,
          amount_used: segment.amount_used,
          is_used: segment.is_used,
          period_start_date: segment.period_start_date,
          period_end_date: segment.period_end_date,
        };
        setModal({ benefit: segBenefit, mode: 'usage' });
      }
    },
  });

  const handleModalSave = async (value: number, notes?: string, targetDate?: string) => {
    if (!modal) return;
    try {
      if (modal.mode === 'usage') {
        if (modal.benefit.usage_id) {
          await updateUsage(modal.benefit.usage_id, value, notes);
        } else {
          await logUsage(modal.benefit.userCardId, modal.benefit.benefit_template_id, value, notes, targetDate);
        }
      } else {
        await updateBenefitSetting(modal.benefit.userCardId, modal.benefit.benefit_template_id, value);
      }
    } catch (err) { console.error('Save failed:', err); }
    setModal(null);
    refresh();
  };

  const computeCardStats = (card: UserCardDetail) => {
    const totalMax = card.benefits_status.reduce((sum, b) => sum + b.max_value, 0);
    const totalUsed = card.benefits_status.reduce((sum, b) => sum + b.amount_used, 0);
    const utilization = totalMax > 0 ? (totalUsed / totalMax) * 100 : 0;
    return { totalMax, totalUsed, utilization };
  };

  const grandTotalFees = cardDetails.reduce((sum, c) => sum + c.annual_fee, 0);
  const grandTotalMax = cardDetails.reduce((sum, c) => sum + computeCardStats(c).totalMax, 0);
  const grandTotalUsed = cardDetails.reduce((sum, c) => sum + computeCardStats(c).totalUsed, 0);
  const grandUtilization = grandTotalMax > 0 ? (grandTotalUsed / grandTotalMax) * 100 : 0;

  const sortedCards = [...cardDetails].sort((a, b) => computeCardStats(a).utilization - computeCardStats(b).utilization);

  const getStatusColor = (benefit: BenefitStatus) => {
    if (benefit.is_used && benefit.amount_used >= benefit.max_value) return 'var(--accent-emerald)';
    if (benefit.amount_used > 0) return 'var(--accent-gold)';
    return 'var(--text-muted)';
  };

  const toggleCollapse = (key: string) => {
    setExpandedSections(prev => {
      // On first interaction, initialize from default state
      const current = prev ?? new Set([getSectionKeys()[0]]);
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getSectionKeys = (): string[] => {
    if (view === 'period') return PERIOD_ORDER.filter(p => grouped[p]).map(p => `period-${p}`);
    return sortedCards.map(c => `card-${c.id}`);
  };

  const isCollapsed = (key: string, index: number) => {
    if (expandedSections === null) return index > 0;
    return !expandedSections.has(key);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px',
    fontSize: '0.78rem',
    fontWeight: 600,
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: active ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
    color: active ? 'var(--accent-gold)' : 'var(--text-muted)',
  });

  const thStyle: React.CSSProperties = {
    padding: '6px 8px',
    fontSize: '0.68rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    textAlign: 'left',
    borderBottom: '1px solid var(--border-subtle)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '5px 8px',
    fontSize: '0.78rem',
    borderBottom: '1px solid var(--border-subtle)',
    whiteSpace: 'nowrap',
  };

  const sectionHeader = (label: string, key: string, index: number, rightContent?: React.ReactNode) => (
    <div
      onClick={() => toggleCollapse(key)}
      style={{
        fontSize: '0.7rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-muted)',
        padding: '6px 14px',
        marginBottom: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <span>
        <span style={{ marginRight: 6, fontSize: '0.6rem' }}>{isCollapsed(key, index) ? '▶' : '▼'}</span>
        {label}
      </span>
      {rightContent}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 16, animation: 'fadeInUp 0.4s ease-out both' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, margin: 0 }}>
            All Credits
          </h1>
          <div style={{
            display: 'flex', gap: 4, background: 'var(--bg-card)',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', padding: 3,
          }}>
            <button style={tabStyle(view === 'period')} onClick={() => { setView('period'); setExpandedSections(null); }}>
              By Period
            </button>
            <button style={tabStyle(view === 'card')} onClick={() => { setView('card'); setExpandedSections(null); }}>
              By Card
            </button>
            <button style={tabStyle(view === 'sheet')} onClick={() => setView('sheet')}>
              Sheet
            </button>
          </div>
        </div>
        <YearPicker selectedYear={year} onChange={setYear} />
      </div>

      <PastYearBanner year={year} />

      {/* ===== PERIOD VIEW ===== */}
      {view === 'period' && (
        <>
          {PERIOD_ORDER.filter(p => grouped[p]).map((periodType, gi) => (
            <div key={periodType} style={{ marginBottom: 16, animation: `fadeInUp 0.4s ease-out ${(gi + 1) * 0.06}s both` }}>
              {sectionHeader(
                `${PERIOD_LABELS[periodType]} (${grouped[periodType].length})`,
                `period-${periodType}`,
                gi,
              )}
              {!isCollapsed(`period-${periodType}`, gi) && (
                <div style={{
                  background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)', overflow: 'hidden',
                }}>
                  {grouped[periodType].map((b, i) => {
                    const handlers = makeHandlers(b.userCardId);
                    return (
                      <div key={`${b.userCardId}-${b.benefit_template_id}`}>
                        {i > 0 && <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 14px' }} />}
                        <BenefitRow
                          benefit={b} cardName={b.cardName} issuer={b.issuer}
                          onToggleBinary={handlers.onToggleBinary}
                          onLogContinuous={handlers.onLogContinuous}
                          onSetPerceived={handlers.onSetPerceived}
                          onSegmentClick={handlers.onSegmentClick}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ===== CARD VIEW ===== */}
      {view === 'card' && (
        <>
          {/* Grand total */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)', padding: '12px 14px',
            marginBottom: 16, animation: 'fadeInUp 0.4s ease-out 0.06s both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>All Cards Total</span>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fees: ${grandTotalFees.toFixed(0)}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  ${grandTotalUsed.toFixed(0)} / ${grandTotalMax.toFixed(0)}
                </span>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                  color: grandUtilization >= 80 ? 'var(--accent-emerald)' : grandUtilization > 0 ? 'var(--accent-gold)' : 'var(--text-muted)',
                }}>
                  {grandUtilization.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {sortedCards.map((card, ci) => {
            const stats = computeCardStats(card);
            const cardName = card.nickname || card.card_name;
            const handlers = makeHandlers(card.id);
            const sortedBenefits = [...card.benefits_status].sort((a, b) => b.remaining - a.remaining);
            const key = `card-${card.id}`;

            return (
              <div key={card.id} style={{ marginBottom: 16, animation: `fadeInUp 0.4s ease-out ${(ci + 2) * 0.06}s both` }}>
                {sectionHeader(
                  `${cardName} · ${card.issuer}`,
                  key,
                  ci,
                  <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span>Fee: ${card.annual_fee.toFixed(0)}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>${stats.totalUsed.toFixed(0)} / ${stats.totalMax.toFixed(0)}</span>
                    <span style={{
                      fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                      color: stats.utilization >= 80 ? 'var(--accent-emerald)' : stats.utilization > 0 ? 'var(--accent-gold)' : 'var(--text-muted)',
                    }}>
                      {stats.utilization.toFixed(0)}%
                    </span>
                  </span>,
                )}
                {!isCollapsed(key, ci) && (
                  <div style={{
                    background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)', overflow: 'hidden',
                  }}>
                    {sortedBenefits.map((b, i) => {
                      return (
                        <div key={`${card.id}-${b.benefit_template_id}`}>
                          {i > 0 && <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 14px' }} />}
                          <div style={{ display: 'flex', alignItems: 'stretch' }}>
                            <div style={{ width: 3, background: getStatusColor(b), flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <BenefitRow
                                benefit={b} issuer={card.issuer}
                                onToggleBinary={handlers.onToggleBinary}
                                onLogContinuous={handlers.onLogContinuous}
                                onSetPerceived={handlers.onSetPerceived}
                                onSegmentClick={handlers.onSegmentClick}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ===== SHEET VIEW ===== */}
      {view === 'sheet' && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)', overflow: 'auto',
          animation: 'fadeInUp 0.4s ease-out both',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>Card</th>
                <th style={thStyle}>Benefit</th>
                <th style={thStyle}>Per.</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Used / Max</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedCards.map(card => {
                const cardName = card.nickname || card.card_name;
                const sortedBenefits = [...card.benefits_status].sort((a, b) => b.remaining - a.remaining);
                const issuerColor = getIssuerColor(card.issuer).bg;
                return sortedBenefits.map((b, i) => {
                  const pct = b.max_value > 0 ? Math.min((b.amount_used / b.max_value) * 100, 100) : 0;
                  const r = 8; const circ = 2 * Math.PI * r;
                  const fillColor = getStatusColor(b);
                  return (
                  <tr key={`${card.id}-${b.benefit_template_id}`} style={{ borderBottom: '1px solid var(--border-subtle)', background: `${issuerColor}0A` }}>
                    <td style={{
                      ...tdStyle, color: 'var(--text-secondary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis',
                      borderLeft: `3px solid ${issuerColor}`,
                    }}>
                      {i === 0 ? cardName : ''}
                    </td>
                    <td style={tdStyle}>{b.name}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                      {SHORT_PERIODS[b.period_type] || b.period_type}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: 'var(--accent-gold)' }}>${b.amount_used.toFixed(0)}</span>
                      <span style={{ color: 'var(--text-muted)' }}> / ${b.max_value.toFixed(0)}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" style={{ verticalAlign: 'middle' }}>
                        <circle cx="10" cy="10" r={r} fill="none" stroke="var(--border-medium)" strokeWidth="3" />
                        <circle cx="10" cy="10" r={r} fill="none" stroke={fillColor} strokeWidth="3"
                          strokeDasharray={`${(pct / 100) * circ} ${circ}`}
                          strokeDashoffset={circ / 4}
                          strokeLinecap="round"
                        />
                      </svg>
                    </td>
                  </tr>
                  );
                });
              })}
              {/* Grand total row */}
              <tr style={{ borderTop: '2px solid var(--border-medium)' }}>
                <td style={{ ...tdStyle, fontWeight: 700 }} colSpan={2}>Total (Fees: ${grandTotalFees.toFixed(0)})</td>
                <td style={tdStyle}></td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>${grandTotalUsed.toFixed(0)}</span>
                  <span style={{ color: 'var(--text-muted)' }}> / ${grandTotalMax.toFixed(0)}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" style={{ verticalAlign: 'middle' }}>
                    <circle cx="10" cy="10" r="8" fill="none" stroke="var(--border-medium)" strokeWidth="3" />
                    <circle cx="10" cy="10" r="8" fill="none"
                      stroke={grandUtilization >= 80 ? 'var(--accent-emerald)' : 'var(--accent-gold)'}
                      strokeWidth="3"
                      strokeDasharray={`${(Math.min(grandUtilization, 100) / 100) * 2 * Math.PI * 8} ${2 * Math.PI * 8}`}
                      strokeDashoffset={2 * Math.PI * 8 / 4}
                      strokeLinecap="round"
                    />
                  </svg>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <UsageModal
          benefit={modal.benefit}
          mode={modal.mode}
          onSave={handleModalSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
