import axios from 'axios';
import type {
  AuthResponse,
  CardTemplateListItem,
  CardTemplateDetail,
  TokenResponse,
  User,
  UserCardOut,
  UserCardDetail,
  UserCardSummary,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

// Token management
const TOKEN_KEY = 'ccb_access_token';
const REFRESH_KEY = 'ccb_refresh_token';

export function getStoredTokens() {
  return {
    access: localStorage.getItem(TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

export function storeTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Axios interceptor: attach token
api.interceptors.request.use((config) => {
  const { access } = getStoredTokens();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// Axios interceptor: refresh on 401
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { refresh } = getStoredTokens();
      if (!refresh) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        refreshPromise = api
          .post('/api/auth/refresh', { refresh_token: refresh })
          .then((res) => {
            const data: TokenResponse = res.data;
            storeTokens(data.access_token, data.refresh_token);
            return data.access_token;
          })
          .catch(() => {
            clearTokens();
            window.location.href = '/login';
            throw error;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);

export async function getCardTemplates(): Promise<CardTemplateListItem[]> {
  const { data } = await api.get('/api/card-templates/');
  return data;
}

export async function getCardTemplate(id: number): Promise<CardTemplateDetail> {
  const { data } = await api.get(`/api/card-templates/${id}`);
  return data;
}

export async function getUserCards(): Promise<UserCardSummary[]> {
  const { data } = await api.get('/api/user-cards/');
  return data;
}

export async function getUserCard(id: number): Promise<UserCardDetail> {
  const { data } = await api.get(`/api/user-cards/${id}`);
  return data;
}

export async function getUserCardSummary(id: number): Promise<UserCardSummary> {
  const { data } = await api.get(`/api/user-cards/${id}/summary`);
  return data;
}

export async function createUserCard(cardTemplateId: number, nickname?: string): Promise<UserCardOut> {
  const { data } = await api.post('/api/user-cards/', {
    card_template_id: cardTemplateId,
    nickname: nickname || null,
  });
  return data;
}

export async function deleteUserCard(id: number): Promise<void> {
  await api.delete(`/api/user-cards/${id}`);
}

export async function updateUserCard(id: number, data: { renewal_date: string | null }) {
  const resp = await api.patch(`/api/user-cards/${id}`, data);
  return resp.data;
}

export async function logUsage(
  userCardId: number,
  benefitTemplateId: number,
  amountUsed: number,
  notes?: string,
  targetDate?: string,
): Promise<void> {
  await api.post(`/api/user-cards/${userCardId}/usage`, {
    benefit_template_id: benefitTemplateId,
    amount_used: amountUsed,
    notes: notes || null,
    target_date: targetDate || null,
  });
}

export async function updateUsage(
  usageId: number,
  amountUsed?: number,
  notes?: string,
): Promise<void> {
  await api.put(`/api/usage/${usageId}`, {
    amount_used: amountUsed,
    notes: notes,
  });
}

export async function deleteUsage(usageId: number): Promise<void> {
  await api.delete(`/api/usage/${usageId}`);
}

export async function updateBenefitSetting(
  userCardId: number,
  benefitTemplateId: number,
  perceivedMaxValue: number,
): Promise<void> {
  await api.put(`/api/user-cards/${userCardId}/benefits/${benefitTemplateId}/setting`, {
    perceived_max_value: perceivedMaxValue,
  });
}

// Auth API functions
export async function register(
  email: string, password: string, displayName: string
): Promise<AuthResponse> {
  const { data } = await api.post('/api/auth/register', {
    email, password, display_name: displayName,
  });
  storeTokens(data.access_token, data.refresh_token);
  return data;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await api.post('/api/auth/login', { email, password });
  storeTokens(data.access_token, data.refresh_token);
  return data;
}

export async function getProfile(): Promise<User> {
  const { data } = await api.get('/api/users/me');
  return data;
}

export async function updateProfile(updates: Partial<User>): Promise<User> {
  const { data } = await api.put('/api/users/me', updates);
  return data;
}

export async function changePassword(
  currentPassword: string, newPassword: string
): Promise<void> {
  await api.put('/api/users/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function submitFeedback(
  category: string, message: string
): Promise<void> {
  await api.post('/api/feedback/', { category, message });
}

export interface FeedbackItem {
  id: number;
  user_email: string;
  category: string;
  message: string;
  created_at: string;
}

export async function getAdminFeedback(): Promise<FeedbackItem[]> {
  const { data } = await api.get('/api/feedback/');
  return data;
}

export async function verifyEmail(token: string): Promise<void> {
  await api.post('/api/auth/verify-email', { token });
}

export async function resendVerification(): Promise<void> {
  await api.post('/api/auth/resend-verification');
}

export function logout() {
  clearTokens();
  window.location.href = '/login';
}
