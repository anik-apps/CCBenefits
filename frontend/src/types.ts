export interface BenefitTemplate {
  id: number;
  name: string;
  description: string | null;
  max_value: number;
  period_type: string;
  redemption_type: string;
  category: string;
}

export interface CardTemplateListItem {
  id: number;
  name: string;
  issuer: string;
  annual_fee: number;
  image_url: string | null;
  benefit_count: number;
  total_annual_value: number;
}

export interface CardTemplateDetail {
  id: number;
  name: string;
  issuer: string;
  annual_fee: number;
  image_url: string | null;
  benefits: BenefitTemplate[];
  total_annual_value: number;
}

export interface UserCardOut {
  id: number;
  card_template_id: number;
  card_name: string;
  issuer: string;
  annual_fee: number;
  nickname: string | null;
  member_since_date: string | null;
  closed_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PeriodSegment {
  label: string;
  period_start_date: string;
  period_end_date: string;
  amount_used: number;
  usage_id: number | null;
  is_used: boolean;
  is_current: boolean;
  is_future: boolean;
}

export interface BenefitStatus {
  benefit_template_id: number;
  usage_id: number | null;
  name: string;
  description: string | null;
  max_value: number;
  period_type: string;
  redemption_type: string;
  category: string;
  period_start_date: string;
  period_end_date: string;
  days_remaining: number;
  amount_used: number;
  remaining: number;
  perceived_max_value: number;
  utilized_perceived_value: number;
  is_used: boolean;
  periods: PeriodSegment[];
}

export interface UserCardDetail {
  id: number;
  card_template_id: number;
  card_name: string;
  issuer: string;
  annual_fee: number;
  nickname: string | null;
  member_since_date: string | null;
  closed_date: string | null;
  is_active: boolean;
  available_years: number[];
  ytd_actual_used: number;
  utilization_pct: number;
  benefits_status: BenefitStatus[];
  renewal_date: string | null;
}

export interface UserCardSummary {
  id: number;
  card_name: string;
  issuer: string;
  nickname: string | null;
  annual_fee: number;
  available_years: number[];
  total_max_annual_value: number;
  total_perceived_annual_value: number;
  ytd_actual_used: number;
  ytd_perceived_value: number;
  net_actual: number;
  net_perceived: number;
  utilization_pct: number;
  benefit_count: number;
  benefits_used_count: number;
}

export interface ChannelPreferences {
  expiring_credits: boolean;
  period_start: boolean;
  utilization_summary: boolean;
  unused_recap: boolean;
  fee_approaching: boolean;
}

export interface NotificationPreferences {
  email: ChannelPreferences;
  push: ChannelPreferences;
  notification_hour: number;
}

export interface User {
  id: number;
  email: string;
  display_name: string;
  preferred_currency: string;
  timezone: string;
  notification_preferences: NotificationPreferences | null;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
