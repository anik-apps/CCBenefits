import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { renderWithProviders } from '../test/helpers';

// Mock the API module to prevent real network calls and provide auth state
vi.mock('../services/api', () => ({
  getStoredTokens: () => ({ access: 'fake-token', refresh: 'fake-refresh' }),
  getProfile: () => Promise.resolve({
    id: 1, email: 'test@test.com', display_name: 'Test User',
    preferred_currency: 'USD', timezone: 'UTC',
    notification_preferences: null, is_active: true, is_admin: false, is_verified: true, created_at: '2026-01-01',
  }),
  clearTokens: vi.fn(),
  storeTokens: vi.fn(),
  getCardTemplates: () => Promise.resolve([]),
  getUserCards: () => Promise.resolve([]),
  getUserCard: () => Promise.resolve({ id: 1, card_template_id: 1, card_name: 'Test', issuer: 'Test', annual_fee: 0, nickname: null, member_since_date: null, is_active: true, benefits_status: [], renewal_date: null }),
  getUserCardSummary: () => Promise.resolve({}),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getInbox: () => Promise.resolve({ items: [], total: 0, unread_count: 0 }),
  getUnreadCount: () => Promise.resolve({ unread_count: 0 }),
  markNotificationRead: vi.fn(),
  markAllRead: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  oauthSignIn: vi.fn(),
  getOAuthProviders: () => Promise.resolve([]),
  linkOAuthProvider: vi.fn(),
  unlinkOAuthProvider: vi.fn(),
}));

// Disable splash animation in tests
beforeEach(() => {
  sessionStorage.setItem('ccb-splash-shown', 'true');
});

describe('App', () => {
  it('renders header with logo text', async () => {
    renderWithProviders(<App />, { route: '/' });
    expect(await screen.findByText('CCB')).toBeInTheDocument();
  });

  it('renders tab navigation on home page', async () => {
    renderWithProviders(<App />, { route: '/' });
    expect(await screen.findByText('Cards')).toBeInTheDocument();
    expect(screen.getByText('All Credits')).toBeInTheDocument();
  });

  it('renders Add FAB', async () => {
    renderWithProviders(<App />, { route: '/' });
    expect(await screen.findByTitle('Add a card')).toBeInTheDocument();
  });

  it('renders tab navigation on credits page', async () => {
    renderWithProviders(<App />, { route: '/credits' });
    expect(await screen.findByText('Cards')).toBeInTheDocument();
    expect(screen.getByText('All Credits')).toBeInTheDocument();
  });

  it('hides tab navigation on card detail page', async () => {
    renderWithProviders(<App />, { route: '/card/1' });
    // Wait for auth to resolve
    expect(await screen.findByText('CCB')).toBeInTheDocument();
    expect(screen.queryByText('Cards')).not.toBeInTheDocument();
    expect(screen.getByTitle('Add a card')).toBeInTheDocument();
  });

  it('hides tab navigation on add card page', async () => {
    renderWithProviders(<App />, { route: '/add-card' });
    expect(await screen.findByText('CCB')).toBeInTheDocument();
    expect(screen.queryByText('Cards')).not.toBeInTheDocument();
  });

  it('renders forgot password page', async () => {
    renderWithProviders(<App />, { route: '/forgot-password' });
    expect(await screen.findByText('Forgot Password')).toBeInTheDocument();
    expect(screen.getByText('Send Reset Link')).toBeInTheDocument();
  });

  it('renders reset password page with token', async () => {
    renderWithProviders(<App />, { route: '/reset-password?token=abc' });
    expect(await screen.findByText('Enter your new password.')).toBeInTheDocument();
  });

  it('renders invalid reset link when no token', async () => {
    renderWithProviders(<App />, { route: '/reset-password' });
    expect(await screen.findByText('Invalid Reset Link')).toBeInTheDocument();
  });

});
