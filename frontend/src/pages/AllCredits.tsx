import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserCards, getUserCard, logUsage, updateUsage, deleteUsage, updateBenefitSetting } from '../services/api';
import type { BenefitStatus, PeriodSegment } from '../types';
import BenefitRow from '../components/BenefitRow';
import UsageModal from '../components/UsageModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { PERIOD_ORDER, PERIOD_LABELS } from '../constants/periodLabels';

interface BenefitWithCard extends BenefitStatus {
  userCardId: number;
  cardName: string;
  issuer: string;
}

export default function AllCredits() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ benefit: BenefitWithCard; mode: 'usage' | 'perceived' } | null>(null);

  const { data: summaries, isLoading: loadingSummaries } = useQuery({
    queryKey: ['user-cards'],
    queryFn: getUserCards,
    refetchOnMount: 'always',
  });

  // Fetch detail for each user card
  const cardIds = summaries?.map(s => s.id) ?? [];
  const { data: cardDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['all-card-details', cardIds],
    queryFn: async () => {
      const details = await Promise.all(cardIds.map(id => getUserCard(id)));
      return details;
    },
    enabled: cardIds.length > 0,
    refetchOnMount: 'always',
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['user-cards'] });
    queryClient.invalidateQueries({ queryKey: ['all-card-details'] });
  };

  const isLoading = loadingSummaries || loadingDetails;

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

  // Lookup by composite key: "userCardId-benefitTemplateId"
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

  // Factory: create card-scoped handlers for each benefit row
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

  return (
    <div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.4rem',
        fontWeight: 600,
        marginBottom: 16,
        animation: 'fadeInUp 0.4s ease-out both',
      }}>
        All Credits
      </h1>

      {PERIOD_ORDER.filter(p => grouped[p]).map((periodType, gi) => (
        <div key={periodType} style={{
          marginBottom: 16,
          animation: `fadeInUp 0.4s ease-out ${(gi + 1) * 0.06}s both`,
        }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            padding: '6px 14px',
            marginBottom: 2,
          }}>
            {PERIOD_LABELS[periodType]} ({grouped[periodType].length})
          </div>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}>
            {grouped[periodType].map((b, i) => {
              const handlers = makeHandlers(b.userCardId);
              return (
                <div key={`${b.userCardId}-${b.benefit_template_id}`}>
                  {i > 0 && <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 14px' }} />}
                  <BenefitRow
                    benefit={b}
                    cardName={b.cardName}
                    issuer={b.issuer}
                    onToggleBinary={handlers.onToggleBinary}
                    onLogContinuous={handlers.onLogContinuous}
                    onSetPerceived={handlers.onSetPerceived}
                    onSegmentClick={handlers.onSegmentClick}
                  />
                </div>
              );
            })}
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
    </div>
  );
}
