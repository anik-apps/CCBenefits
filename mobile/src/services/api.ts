import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
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

const API_URL = 'https://ccb.kumaranik.com';

const api = axios.create({ baseURL: API_URL });
// Separate instance for token refresh — no interceptors, prevents infinite 401 loop
const refreshApi = axios.create({ baseURL: API_URL });

// Token management — in-memory cache + SecureStore
const TOKEN_KEY = 'ccb_access_token';
const REFRESH_KEY = 'ccb_refresh_token';

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _hydrated = false;

export async function hydrateTokens(): Promise<void> {
  _accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
  _refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  _hydrated = true;
}

export function isHydrated(): boolean {
  return _hydrated;
}

export function getStoredTokens() {
  return { access: _accessToken, refresh: _refreshToken };
}

export async function storeTokens(access: string, refresh: string) {
  _accessToken = access;
  _refreshToken = refresh;
  await SecureStore.setItemAsync(TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function clearTokens() {
  _accessToken = null;
  _refreshToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

// Auth failure callback — set by AuthContext
let _onAuthFailure: (() => void) | null = null;
export function setAuthFailureHandler(handler: () => void) {
  _onAuthFailure = handler;
}

// Axios interceptor: attach token
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
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
      if (!_refreshToken) {
        await clearTokens();
        _onAuthFailure?.();
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        refreshPromise = refreshApi
          .post('/api/auth/refresh', { refresh_token: _refreshToken })
          .then(async (res) => {
            const data: TokenResponse = res.data;
            await storeTokens(data.access_token, data.refresh_token);
            return data.access_token;
          })
          .catch(async () => {
            await clearTokens();
            _onAuthFailure?.();
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

// Auth API
export async function register(
  email: string, password: string, displayName: string
): Promise<AuthResponse> {
  const { data } = await api.post('/api/auth/register', {
    email, password, display_name: displayName,
  });
  await storeTokens(data.access_token, data.refresh_token);
  return data;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await api.post('/api/auth/login', { email, password });
  await storeTokens(data.access_token, data.refresh_token);
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

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put('/api/users/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function verifyEmail(token: string): Promise<void> {
  await api.post('/api/auth/verify-email', { token });
}

export async function resendVerification(): Promise<void> {
  await api.post('/api/auth/resend-verification');
}

// Card templates
export async function getCardTemplates(): Promise<CardTemplateListItem[]> {
  const { data } = await api.get('/api/card-templates/');
  return data;
}

export async function getCardTemplate(id: number): Promise<CardTemplateDetail> {
  const { data } = await api.get(`/api/card-templates/${id}`);
  return data;
}

// User cards
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
  userCardId: number, benefitTemplateId: number, amountUsed: number,
  notes?: string, targetDate?: string,
): Promise<void> {
  await api.post(`/api/user-cards/${userCardId}/usage`, {
    benefit_template_id: benefitTemplateId,
    amount_used: amountUsed,
    notes: notes || null,
    target_date: targetDate || null,
  });
}

export async function updateUsage(usageId: number, amountUsed?: number, notes?: string): Promise<void> {
  await api.put(`/api/usage/${usageId}`, { amount_used: amountUsed, notes });
}

export async function deleteUsage(usageId: number): Promise<void> {
  await api.delete(`/api/usage/${usageId}`);
}

export async function updateBenefitSetting(
  userCardId: number, benefitTemplateId: number, perceivedMaxValue: number,
): Promise<void> {
  await api.put(`/api/user-cards/${userCardId}/benefits/${benefitTemplateId}/setting`, {
    perceived_max_value: perceivedMaxValue,
  });
}

export async function submitFeedback(category: string, message: string): Promise<void> {
  await api.post('/api/feedback/', { category, message });
}

export async function registerPushToken(token: string, deviceName?: string) {
  return api.post('/api/notifications/push-token', { token, device_name: deviceName });
}

export async function unregisterPushToken(token: string) {
  return api.post('/api/notifications/push-token/unregister', { token });
}

export async function logout() {
  await clearTokens();
}
