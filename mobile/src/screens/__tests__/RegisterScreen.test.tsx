import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../RegisterScreen';
import { makeUser } from '../../test/factories';

const mockAuth = {
  user: null,
  loading: false,
  login: jest.fn(),
  register: jest.fn().mockResolvedValue(makeUser()),
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

describe('RegisterScreen', () => {
  it('renders Create Account form', () => {
    const { getAllByText, getByText } = render(
      <RegisterScreen navigation={mockNavigation} route={mockRoute} />,
    );
    // "Create Account" appears as both the title and button text
    expect(getAllByText('Create Account').length).toBeGreaterThanOrEqual(2);
    expect(getByText('Display Name')).toBeTruthy();
    expect(getByText('Email')).toBeTruthy();
    expect(getByText('Password')).toBeTruthy();
    expect(getByText('Confirm Password')).toBeTruthy();
  });

  it('shows password mismatch error when passwords differ', async () => {
    // Since password fields lack placeholders, we find them via the component tree
    const { getAllByText, getByText, UNSAFE_getAllByType } = render(
      <RegisterScreen navigation={mockNavigation} route={mockRoute} />,
    );

    // There are 4 TextInputs: displayName, email, password, confirmPassword
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    expect(inputs.length).toBe(4);

    fireEvent.changeText(inputs[2], 'password1');
    fireEvent.changeText(inputs[3], 'password2');
    // "Create Account" appears as title and button — button is second
    fireEvent.press(getAllByText('Create Account')[1]);

    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });
    expect(mockAuth.register).not.toHaveBeenCalled();
  });

  it('calls register on valid submission', async () => {
    const { getAllByText, UNSAFE_getAllByType } = render(
      <RegisterScreen navigation={mockNavigation} route={mockRoute} />,
    );

    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);

    fireEvent.changeText(inputs[0], 'Test User');
    fireEvent.changeText(inputs[1], 'test@test.com');
    fireEvent.changeText(inputs[2], 'password123');
    fireEvent.changeText(inputs[3], 'password123');
    // "Create Account" appears as title and button — button is second
    fireEvent.press(getAllByText('Create Account')[1]);

    await waitFor(() => {
      expect(mockAuth.register).toHaveBeenCalledWith('test@test.com', 'password123', 'Test User');
    });
  });

  it('renders Google sign-up button', () => {
    const { getByText } = render(
      <RegisterScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText('Sign up with Google')).toBeTruthy();
  });
});
