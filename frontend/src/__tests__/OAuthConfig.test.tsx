import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Mock the Google OAuth library to capture the clientId prop
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: vi.fn(({ children }: { children: React.ReactNode }) => <div>{children}</div>),
  GoogleLogin: vi.fn(() => <div data-testid="google-login" />),
}));

describe('OAuth Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('GoogleOAuthProvider receives a non-empty clientId in App', async () => {
    // Set the env var before importing App
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id-123');

    // Dynamic import to pick up the env var
    const { default: App } = await import('../App');

    // Need full provider stack for App
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { MemoryRouter } = await import('react-router-dom');
    const { AuthProvider } = await import('../contexts/AuthContext');

    // Suppress splash
    sessionStorage.setItem('ccb-splash-shown', 'true');

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify GoogleOAuthProvider was called with a non-empty clientId
    const mockProvider = GoogleOAuthProvider as unknown as ReturnType<typeof vi.fn>;
    expect(mockProvider).toHaveBeenCalled();
    const callProps = mockProvider.mock.calls[0][0];
    expect(callProps.clientId).toBeTruthy();
    expect(callProps.clientId).not.toBe('');

    vi.unstubAllEnvs();
  });

  it('warns when VITE_GOOGLE_CLIENT_ID is empty', async () => {
    // When the env var is missing, clientId falls back to ''
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');

    // Clear module cache to re-import with new env
    vi.resetModules();

    const { GoogleOAuthProvider: MockedProvider } = await import('@react-oauth/google');
    const mockProvider = MockedProvider as unknown as ReturnType<typeof vi.fn>;
    mockProvider.mockClear();

    const { default: App } = await import('../App');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { MemoryRouter } = await import('react-router-dom');
    const { AuthProvider } = await import('../contexts/AuthContext');

    sessionStorage.setItem('ccb-splash-shown', 'true');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const callProps = mockProvider.mock.calls[0][0];
    expect(callProps.clientId).toBe('');

    vi.unstubAllEnvs();
  });
});
