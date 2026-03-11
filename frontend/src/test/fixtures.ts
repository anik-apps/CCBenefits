import type { BenefitStatus, PeriodSegment, UserCardSummary, UserCardDetail } from '../types';

export const mockSegment = (overrides: Partial<PeriodSegment> = {}): PeriodSegment => ({
  label: 'Jan',
  period_start_date: '2026-01-01',
  period_end_date: '2026-01-31',
  amount_used: 0,
  usage_id: null,
  is_used: false,
  is_current: true,
  is_future: false,
  ...overrides,
});

export const mockBenefit = (overrides: Partial<BenefitStatus> = {}): BenefitStatus => ({
  benefit_template_id: 1,
  usage_id: null,
  name: 'Uber Cash',
  description: '$15/mo Uber Cash',
  max_value: 15,
  period_type: 'monthly',
  redemption_type: 'continuous',
  category: 'travel',
  period_start_date: '2026-01-01',
  period_end_date: '2026-01-31',
  days_remaining: 20,
  amount_used: 0,
  remaining: 15,
  perceived_max_value: 15,
  utilized_perceived_value: 0,
  is_used: false,
  periods: [mockSegment()],
  ...overrides,
});

export const mockBinaryBenefit = (overrides: Partial<BenefitStatus> = {}): BenefitStatus =>
  mockBenefit({
    benefit_template_id: 2,
    name: 'CLEAR+ Credit',
    description: 'Annual CLEAR+ membership',
    max_value: 209,
    period_type: 'annual',
    redemption_type: 'binary',
    ...overrides,
  });

export const mockCardSummary = (overrides: Partial<UserCardSummary> = {}): UserCardSummary => ({
  id: 1,
  card_name: 'Amex Platinum',
  issuer: 'American Express',
  nickname: null,
  annual_fee: 895,
  total_max_annual_value: 2000,
  total_perceived_annual_value: 1800,
  ytd_actual_used: 500,
  ytd_perceived_value: 450,
  net_actual: -395,
  net_perceived: -445,
  utilization_pct: 25,
  benefit_count: 12,
  benefits_used_count: 5,
  ...overrides,
});

export const mockCardDetail = (overrides: Partial<UserCardDetail> = {}): UserCardDetail => ({
  id: 1,
  card_template_id: 1,
  card_name: 'Amex Platinum',
  issuer: 'American Express',
  annual_fee: 895,
  nickname: null,
  member_since_date: null,
  is_active: true,
  benefits_status: [mockBenefit(), mockBinaryBenefit()],
  renewal_date: null,
  ...overrides,
});
