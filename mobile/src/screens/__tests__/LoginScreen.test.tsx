import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';

const mockAuth = {
  user: null,
  loading: false,
  login: jest.fn().mockResolvedValue(undefined),
  register: jest.fn(),
  oauthLogin: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn(),
  refreshUser: jest.fn(),
};

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../../config/googleSignIn', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn().mockResolvedValue({ type: 'success', data: { idToken: 'mock-token' } }),
    signOut: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
  isErrorWithCode: jest.fn(() => false),
  isSuccessResponse: jest.fn((r: any) => r?.type === 'success'),
  ensureGoogleSignInConfigured: jest.fn(),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
} as any;

const mockRoute = { params: {} } as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginScreen', () => {
  it('renders Sign In form with email and password fields', () => {
    const { getAllByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />,
    );
    // "Sign In" appears as both title and button text
    expect(getAllByText('Sign In').length).toBeGreaterThanOrEqual(2);
    expect(getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  it('calls login on form submission', async () => {
    const { getByPlaceholderText, getAllByText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />,
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'mypassword');
    // "Sign In" appears as title and button — button is second
    fireEvent.press(getAllByText('Sign In')[1]);

    await waitFor(() => {
      expect(mockAuth.login).toHaveBeenCalledWith('user@test.com', 'mypassword');
    });
  });

  it('shows error when login fails', async () => {
    // Simulate a non-Error rejection so extractApiError uses the fallback message
    mockAuth.login.mockRejectedValueOnce('Bad creds');

    const { getByPlaceholderText, getAllByText, getByText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />,
    );

    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');
    // "Sign In" appears as title and button — button is second
    fireEvent.press(getAllByText('Sign In')[1]);

    await waitFor(() => {
      expect(getByText('Invalid email or password')).toBeTruthy();
    });
  });

  it('renders Google sign-in button', () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  it('navigates to Register on link press', () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} route={mockRoute} />,
    );
    fireEvent.press(getByText('Sign up'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
  });
});
