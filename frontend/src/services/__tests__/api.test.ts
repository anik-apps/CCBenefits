import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const TOKEN_KEY = 'ccb_access_token';
const REFRESH_KEY = 'ccb_refresh_token';

// Adapter that answers every request with a 401, like the server does for
// expired access AND refresh tokens.
function reject401Adapter() {
  return (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError(
        'Request failed with status code 401',
        AxiosError.ERR_BAD_REQUEST,
        config,
        null,
        {
          data: { detail: 'Invalid or expired token' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        },
      ),
    );
}

describe('api 401 refresh interceptor', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    // jsdom does not implement navigation; swap in a plain object so the
    // interceptor's redirect assignment is observable and silent.
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('rejects instead of hanging when the refresh token is also expired', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-access');
    localStorage.setItem(REFRESH_KEY, 'expired-refresh');

    const realCreate = axios.create.bind(axios);
    vi.spyOn(axios, 'create').mockImplementation((config) =>
      realCreate({ ...config, adapter: reject401Adapter() }),
    );

    const { getProfile } = await import('../api');

    const outcome = await Promise.race([
      getProfile().then(
        () => 'resolved',
        () => 'rejected',
      ),
      new Promise<string>((resolve) => setTimeout(() => resolve('hung'), 1000)),
    ]);

    expect(outcome).toBe('rejected');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(window.location.href).toBe('/login');
  });
});
