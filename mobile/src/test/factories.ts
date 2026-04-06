import type {
  BenefitStatus,
  PeriodSegment,
  UserCardDetail,
  User,
} from '../types';

export function makePeriodSegment(overrides?: Partial<PeriodSegment>): PeriodSegment {
  return {
    label: 'Jan 2025',
    period_start_date: '2025-01-01',
    period_end_date: '2025-01-31',
    amount_used: 0,
    usage_id: null,
    is_used: false,
    is_current: true,
    is_future: false,
    ...overrides,
  };
}

export function makeBenefitStatus(overrides?: Partial<BenefitStatus>): BenefitStatus {
  return {
    benefit_template_id: 1,
    usage_id: null,
    name: 'Dining Credit',
    description: 'Monthly dining credit',
    max_value: 25,
    period_type: 'monthly',
    redemption_type: 'continuous',
    category: 'dining',
    period_start_date: '2025-01-01',
    period_end_date: '2025-01-31',
    days_remaining: 15,
    amount_used: 0,
    remaining: 25,
    perceived_max_value: 25,
    utilized_perceived_value: 0,
    is_used: false,
    periods: [makePeriodSegment()],
    ...overrides,
  };
}

export function makeUserCardDetail(overrides?: Partial<UserCardDetail>): UserCardDetail {
  return {
    id: 1,
    card_template_id: 1,
    card_name: 'Gold Card',
    issuer: 'Amex',
    annual_fee: 250,
    nickname: null,
    member_since_date: null,
    closed_date: null,
    is_active: true,
    available_years: [2025],
    ytd_actual_used: 100,
    utilization_pct: 0.4,
    benefits_status: [makeBenefitStatus()],
    renewal_date: null,
    ...overrides,
  };
}

export function makeUser(overrides?: Partial<User>): User {
  return {
    id: 1,
    email: 'test@test.com',
    display_name: 'Test User',
    preferred_currency: 'USD',
    timezone: 'America/New_York',
    notification_preferences: null,
    is_active: true,
    is_admin: false,
    is_verified: true,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}
