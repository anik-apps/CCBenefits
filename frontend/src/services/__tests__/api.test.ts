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

  it('refreshes and retries the original request when the refresh token is valid', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-access');
    localStorage.setItem(REFRESH_KEY, 'valid-refresh');

    const profile = { id: 1, email: 'user@example.com', display_name: 'User' };
    let refreshCalls = 0;

    const adapter = (config: InternalAxiosRequestConfig) => {
      const ok = (data: unknown) =>
        Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config });
      if (config.url === '/api/auth/refresh') {
        refreshCalls++;
        return ok({ access_token: 'new-access', refresh_token: 'new-refresh' });
      }
      if (config.headers?.Authorization === 'Bearer new-access') {
        return ok(profile);
      }
      return reject401Adapter()(config);
    };

    const realCreate = axios.create.bind(axios);
    vi.spyOn(axios, 'create').mockImplementation((config) =>
      realCreate({ ...config, adapter }),
    );

    const { getProfile } = await import('../api');

    await expect(getProfile()).resolves.toEqual(profile);
    expect(refreshCalls).toBe(1);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-access');
    expect(localStorage.getItem(REFRESH_KEY)).toBe('new-refresh');
  });

  it('rejects a wrong-password login with the 401 error without redirecting', async () => {
    const realCreate = axios.create.bind(axios);
    vi.spyOn(axios, 'create').mockImplementation((config) =>
      realCreate({ ...config, adapter: reject401Adapter() }),
    );

    const { login } = await import('../api');

    await expect(login('user@example.com', 'wrong-password')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(window.location.href).toBe('');
  });

  it('rejects a wrong-password login without attempting refresh when stale tokens are stored', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-access');
    localStorage.setItem(REFRESH_KEY, 'expired-refresh');

    let refreshCalls = 0;
    const adapter = (config: InternalAxiosRequestConfig) => {
      if (config.url === '/api/auth/refresh') refreshCalls++;
      return reject401Adapter()(config);
    };

    const realCreate = axios.create.bind(axios);
    vi.spyOn(axios, 'create').mockImplementation((config) =>
      realCreate({ ...config, adapter }),
    );

    const { login } = await import('../api');

    await expect(login('user@example.com', 'wrong-password')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshCalls).toBe(0);
    expect(window.location.href).toBe('');
  });
});
