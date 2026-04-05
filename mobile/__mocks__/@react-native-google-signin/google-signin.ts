export const GoogleSignin = {
  configure: jest.fn(),
  signIn: jest.fn().mockResolvedValue({ type: 'success', data: { idToken: 'mock-id-token' } }),
  signOut: jest.fn().mockResolvedValue(undefined),
  hasPlayServices: jest.fn().mockResolvedValue(true),
};

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};

export const isErrorWithCode = jest.fn((error: unknown): error is { code: string } => {
  return typeof error === 'object' && error !== null && 'code' in error;
});

export const isSuccessResponse = jest.fn(
  (response: unknown): response is { type: 'success'; data: { idToken: string } } => {
    return typeof response === 'object' && response !== null && (response as any).type === 'success';
  },
);
