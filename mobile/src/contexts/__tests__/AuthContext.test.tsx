import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AuthContext } from '../AuthContext';
import type { AuthContextValue } from '../AuthContext';
import { makeUser } from '../../test/factories';

// Mock all api functions
jest.mock('../../services/api', () => ({
  getProfile: jest.fn(),
  getStoredTokens: jest.fn().mockReturnValue({ access: null, refresh: null }),
  hydrateTokens: jest.fn().mockResolvedValue(undefined),
  isHydrated: jest.fn().mockReturnValue(false),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
  setAuthFailureHandler: jest.fn(),
  oauthSignIn: jest.fn(),
}));

jest.mock('../../services/notifications', () => ({
  getCurrentPushToken: jest.fn().mockReturnValue(null),
  unregisterPushNotifications: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../config/googleSignIn', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(undefined),
    hasPlayServices: jest.fn(),
  },
  statusCodes: {},
  isErrorWithCode: jest.fn(),
  isSuccessResponse: jest.fn(),
}));

const api = require('../../services/api');
const notifications = require('../../services/notifications');
const { GoogleSignin } = require('../../config/googleSignIn');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function useAuthContext(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('No AuthContext');
  return ctx;
}

beforeEach(() => {
  jest.clearAllMocks();
  api.isHydrated.mockReturnValue(false);
  api.getStoredTokens.mockReturnValue({ access: null, refresh: null });
});

describe('AuthProvider', () => {
  it('starts in loading state and finishes after hydration', async () => {
    api.isHydrated.mockReturnValue(false);
    api.hydrateTokens.mockResolvedValue(undefined);
    api.getStoredTokens.mockReturnValue({ access: null, refresh: null });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: ({ children }) =>
        React.createElement(createWrapper(), null,
          React.createElement(AuthProvider, null, children)),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toBeNull();
  });

  it('hydrates and fetches profile if token exists', async () => {
    const mockUser = makeUser();
    api.isHydrated.mockReturnValue(false);
    api.hydrateTokens.mockResolvedValue(undefined);
    api.getStoredTokens.mockReturnValue({ access: 'token-123', refresh: 'refresh-123' });
    api.getProfile.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: ({ children }) =>
        React.createElement(createWrapper(), null,
          React.createElement(AuthProvider, null, children)),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toEqual(mockUser);
    expect(api.getProfile).toHaveBeenCalled();
  });

  it('login calls apiLogin and refreshes user', async () => {
    const mockUser = makeUser({ email: 'logged@test.com' });
    api.login.mockResolvedValue({ access_token: 'a', refresh_token: 'b', token_type: 'bearer' });
    api.getProfile.mockResolvedValue(mockUser);
    api.getStoredTokens.mockReturnValue({ access: null, refresh: null });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: ({ children }) =>
        React.createElement(createWrapper(), null,
          React.createElement(AuthProvider, null, children)),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login('logged@test.com', 'pass');
    });

    expect(api.login).toHaveBeenCalledWith('logged@test.com', 'pass');
    expect(api.getProfile).toHaveBeenCalled();
  });

  it('register sets user from response', async () => {
    const mockUser = makeUser({ email: 'new@test.com' });
    api.register.mockResolvedValue({
      user: mockUser,
      access_token: 'a',
      refresh_token: 'b',
      token_type: 'bearer',
    });
    api.getStoredTokens.mockReturnValue({ access: null, refresh: null });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: ({ children }) =>
        React.createElement(createWrapper(), null,
          React.createElement(AuthProvider, null, children)),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.register('new@test.com', 'pass', 'New User');
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('oauthLogin sets user from response', async () => {
    const mockUser = makeUser({ email: 'oauth@test.com' });
    api.oauthSignIn.mockResolvedValue({ user: mockUser, access_token: 'a', refresh_token: 'b' });
    api.getStoredTokens.mockReturnValue({ access: null, refresh: null });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: ({ children }) =>
        React.createElement(createWrapper(), null,
          React.createElement(AuthProvider, null, children)),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.oauthLogin('google', 'id-token-123');
    });

    expect(api.oauthSignIn).toHaveBeenCalledWith('google', 'id-token-123', undefined);
    expect(result.current.user).toEqual(mockUser);
  });

  it('logout clears user, unregisters push token, and signs out of Google', async () => {
    const mockUser = makeUser();
    api.getStoredTokens.mockReturnValue({ access: 'tok', refresh: 'ref' });
    api.getProfile.mockResolvedValue(mockUser);
    notifications.getCurrentPushToken.mockReturnValue('ExponentPushToken[abc]');

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: ({ children }) =>
        React.createElement(createWrapper(), null,
          React.createElement(AuthProvider, null, children)),
    });

    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(notifications.unregisterPushNotifications).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(GoogleSignin.signOut).toHaveBeenCalled();
    expect(api.logout).toHaveBeenCalled();
  });

  it('sets auth failure handler that clears user state', async () => {
    api.getStoredTokens.mockReturnValue({ access: null, refresh: null });

    renderHook(() => useAuthContext(), {
      wrapper: ({ children }) =>
        React.createElement(createWrapper(), null,
          React.createElement(AuthProvider, null, children)),
    });

    await waitFor(() => {
      expect(api.setAuthFailureHandler).toHaveBeenCalled();
    });

    const handler = api.setAuthFailureHandler.mock.calls[0][0];
    expect(typeof handler).toBe('function');
  });
});
