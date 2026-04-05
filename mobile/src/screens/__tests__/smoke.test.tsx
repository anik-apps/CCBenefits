import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppReadyProvider } from '../../contexts/AppReadyContext';

// Mock useAuth for all screens that use it
const mockAuth = {
  user: { id: 1, email: 'test@test.com', display_name: 'Test', is_verified: true, is_active: true },
  loading: false,
  login: jest.fn(),
  register: jest.fn(),
  oauthLogin: jest.fn(),
  logout: jest.fn(),
  refreshUser: jest.fn(),
};
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => mockAuth }));

// Mock api module to prevent real network calls
jest.mock('../../services/api', () => ({
  getUserCards: jest.fn().mockResolvedValue([]),
  getUserCard: jest.fn().mockResolvedValue({ id: 1, card_name: 'Test', benefits_status: [], available_years: [2025] }),
  getUserCardDetails: jest.fn().mockResolvedValue([]),
  getCardTemplates: jest.fn().mockResolvedValue([]),
  getUnreadCount: jest.fn().mockResolvedValue({ unread_count: 0 }),
  getInbox: jest.fn().mockResolvedValue([]),
  markNotificationRead: jest.fn(),
  markAllRead: jest.fn(),
  submitFeedback: jest.fn(),
  updateProfile: jest.fn(),
  logUsage: jest.fn(),
  updateUsage: jest.fn(),
  deleteUsage: jest.fn(),
  deleteUserCard: jest.fn(),
  createUserCard: jest.fn(),
  updateBenefitSetting: jest.fn(),
  updateUserCard: jest.fn(),
  closeCard: jest.fn(),
  reopenCard: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  resendVerification: jest.fn(),
  getProfile: jest.fn(),
  getStoredTokens: jest.fn().mockReturnValue({ access: null }),
  hydrateTokens: jest.fn(),
  isHydrated: jest.fn().mockReturnValue(true),
  clearTokens: jest.fn(),
  setAuthFailureHandler: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  oauthSignIn: jest.fn(),
  registerPushToken: jest.fn(),
  unregisterPushToken: jest.fn(),
}));

// Mock config for Google sign-in
jest.mock('../../config/googleSignIn', () => ({
  GoogleSignin: { configure: jest.fn(), signIn: jest.fn(), signOut: jest.fn(), hasPlayServices: jest.fn() },
  statusCodes: {},
  isErrorWithCode: jest.fn(),
  isSuccessResponse: jest.fn(),
  ensureGoogleSignInConfigured: jest.fn(),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  getParent: jest.fn(() => null),
  canGoBack: jest.fn(() => true),
} as any;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(AppReadyProvider, { value: true }, children),
    );
  };
}

function renderScreen(Component: React.ComponentType<any>, routeParams: Record<string, any> = {}) {
  const Wrapper = createWrapper();
  return render(
    React.createElement(Wrapper, null,
      React.createElement(Component, {
        navigation: mockNavigation,
        route: { params: routeParams, key: 'test', name: 'Test' },
      }),
    ),
  );
}

describe('Screen smoke tests', () => {
  it('DashboardScreen renders without crashing', () => {
    const DashboardScreen = require('../DashboardScreen').default;
    expect(() => renderScreen(DashboardScreen)).not.toThrow();
  });

  it('CardDetailScreen renders without crashing', () => {
    const CardDetailScreen = require('../CardDetailScreen').default;
    expect(() => renderScreen(CardDetailScreen, { id: 1 })).not.toThrow();
  });

  it('AllCreditsScreen renders without crashing', () => {
    const AllCreditsScreen = require('../AllCreditsScreen').default;
    expect(() => renderScreen(AllCreditsScreen)).not.toThrow();
  });

  it('ProfileScreen renders without crashing', () => {
    const ProfileScreen = require('../ProfileScreen').default;
    expect(() => renderScreen(ProfileScreen)).not.toThrow();
  });

  it('AddCardScreen renders without crashing', () => {
    const AddCardScreen = require('../AddCardScreen').default;
    expect(() => renderScreen(AddCardScreen)).not.toThrow();
  });

  it('NotificationScreen renders without crashing', () => {
    const NotificationScreen = require('../NotificationScreen').default;
    expect(() => renderScreen(NotificationScreen)).not.toThrow();
  });

  it('FeedbackScreen renders without crashing', () => {
    const FeedbackScreen = require('../FeedbackScreen').default;
    expect(() => renderScreen(FeedbackScreen)).not.toThrow();
  });

  it('VerifyPendingScreen renders without crashing', () => {
    const VerifyPendingScreen = require('../VerifyPendingScreen').default;
    expect(() => renderScreen(VerifyPendingScreen)).not.toThrow();
  });

  it('ForgotPasswordScreen renders without crashing', () => {
    const ForgotPasswordScreen = require('../ForgotPasswordScreen').default;
    expect(() => renderScreen(ForgotPasswordScreen)).not.toThrow();
  });

  it('ResetPasswordScreen renders without crashing', () => {
    const ResetPasswordScreen = require('../ResetPasswordScreen').default;
    expect(() => renderScreen(ResetPasswordScreen, { token: 'test-token' })).not.toThrow();
  });
});
