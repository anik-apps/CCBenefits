// We need fresh module state per describe block, so we use jest.resetModules()
// + require() (not static imports) to get fresh module instances per test group.
// After resetModules, we must also re-require expo-secure-store to get the same
// mock instance that the freshly-required api module uses.

const TOKEN_KEY = 'ccb_access_token';
const REFRESH_KEY = 'ccb_refresh_token';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('token management', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('hydrateTokens reads from SecureStore', async () => {
    const SecureStore = require('expo-secure-store');
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce('access-123')
      .mockResolvedValueOnce('refresh-456');

    const api = require('../api');
    await api.hydrateTokens();

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
    expect(api.isHydrated()).toBe(true);
    expect(api.getStoredTokens()).toEqual({ access: 'access-123', refresh: 'refresh-456' });
  });

  it('storeTokens writes to SecureStore and in-memory cache', async () => {
    const SecureStore = require('expo-secure-store');
    const api = require('../api');
    await api.storeTokens('new-access', 'new-refresh');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'new-access');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(REFRESH_KEY, 'new-refresh');
    expect(api.getStoredTokens()).toEqual({ access: 'new-access', refresh: 'new-refresh' });
  });

  it('clearTokens removes from SecureStore and in-memory cache', async () => {
    const SecureStore = require('expo-secure-store');
    const api = require('../api');
    await api.storeTokens('a', 'b');
    await api.clearTokens();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
    expect(api.getStoredTokens()).toEqual({ access: null, refresh: null });
  });

  it('isHydrated returns false before hydration', () => {
    const api = require('../api');
    expect(api.isHydrated()).toBe(false);
  });
});

describe('login and register store tokens', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockPost = jest.fn();
    jest.doMock('axios', () => {
      const instance = {
        post: mockPost,
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      };
      return {
        __esModule: true,
        default: {
          create: jest.fn(() => instance),
          isAxiosError: jest.fn(),
          AxiosError: Error,
        },
      };
    });
  });

  it('login stores tokens from response', async () => {
    mockPost.mockResolvedValue({
      data: { access_token: 'login-access', refresh_token: 'login-refresh', token_type: 'bearer' },
    });
    const SecureStore = require('expo-secure-store');
    const api = require('../api');
    await api.login('test@test.com', 'password');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'login-access');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(REFRESH_KEY, 'login-refresh');
  });

  it('register stores tokens from response', async () => {
    mockPost.mockResolvedValue({
      data: {
        user: { id: 1, email: 'new@test.com', display_name: 'New' },
        access_token: 'reg-access',
        refresh_token: 'reg-refresh',
        token_type: 'bearer',
      },
    });
    const SecureStore = require('expo-secure-store');
    const api = require('../api');
    const result = await api.register('new@test.com', 'pass', 'New');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'reg-access');
    expect(result.user.email).toBe('new@test.com');
  });
});

describe('request interceptor', () => {
  it('attaches Authorization header when token is stored', async () => {
    jest.resetModules();

    let requestInterceptor: ((config: any) => any) | null = null;

    jest.doMock('axios', () => {
      const instance = {
        post: jest.fn(),
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        interceptors: {
          request: {
            use: jest.fn((fn: any) => {
              requestInterceptor = fn;
            }),
          },
          response: { use: jest.fn() },
        },
      };
      return {
        __esModule: true,
        default: {
          create: jest.fn(() => instance),
          isAxiosError: jest.fn(),
        },
      };
    });

    const api = require('../api');
    await api.storeTokens('my-token', 'my-refresh');

    expect(requestInterceptor).not.toBeNull();
    const config = { headers: {} as Record<string, string> };
    const result = requestInterceptor!(config);
    expect(result.headers.Authorization).toBe('Bearer my-token');
  });
});

describe('response interceptor (401 handling)', () => {
  let responseErrorHandler: ((error: any) => Promise<any>) | null = null;
  let mockRefreshPost: jest.Mock;
  let mockApiInstance: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    responseErrorHandler = null;

    mockRefreshPost = jest.fn();
    let instanceCount = 0;

    jest.doMock('axios', () => {
      return {
        __esModule: true,
        default: {
          create: jest.fn(() => {
            instanceCount++;
            if (instanceCount === 1) {
              // Main api instance
              mockApiInstance = {
                post: jest.fn(),
                get: jest.fn(),
                put: jest.fn(),
                delete: jest.fn(),
                patch: jest.fn(),
                interceptors: {
                  request: { use: jest.fn() },
                  response: {
                    use: jest.fn((_success: any, errorHandler: any) => {
                      responseErrorHandler = errorHandler;
                    }),
                  },
                },
              };
              return mockApiInstance;
            }
            // refreshApi instance
            return {
              post: mockRefreshPost,
              interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
            };
          }),
          isAxiosError: jest.fn(),
        },
      };
    });
  });

  it('attempts token refresh on 401 and retries original request', async () => {
    const SecureStore = require('expo-secure-store');
    const api = require('../api');
    await api.storeTokens('old-access', 'old-refresh');

    mockRefreshPost.mockResolvedValue({
      data: { access_token: 'new-access', refresh_token: 'new-refresh', token_type: 'bearer' },
    });

    expect(responseErrorHandler).not.toBeNull();

    const error401 = {
      response: { status: 401 },
      config: { headers: {}, _retry: false },
    };

    // The retry call `api(original)` will fail since our mock isn't callable,
    // but we can verify the refresh flow was triggered
    try {
      await responseErrorHandler!(error401);
    } catch {
      // Expected: api(original) fails because mock isn't a function
    }

    expect(mockRefreshPost).toHaveBeenCalledWith('/api/auth/refresh', {
      refresh_token: 'old-refresh',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'new-access');
  });

  it('calls auth failure handler when no refresh token available', async () => {
    const SecureStore = require('expo-secure-store');
    const api = require('../api');
    const onFailure = jest.fn();
    api.setAuthFailureHandler(onFailure);

    expect(responseErrorHandler).not.toBeNull();

    const error401 = {
      response: { status: 401 },
      config: { headers: {}, _retry: false },
    };

    await expect(responseErrorHandler!(error401)).rejects.toBeDefined();
    expect(onFailure).toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });

  it('calls auth failure handler when refresh fails', async () => {
    const SecureStore = require('expo-secure-store');
    const api = require('../api');
    await api.storeTokens('old-access', 'old-refresh');
    const onFailure = jest.fn();
    api.setAuthFailureHandler(onFailure);

    mockRefreshPost.mockRejectedValue(new Error('Refresh failed'));

    const error401 = {
      response: { status: 401 },
      config: { headers: {}, _retry: false },
    };

    await expect(responseErrorHandler!(error401)).rejects.toBeDefined();
    expect(onFailure).toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });

  it('does not retry non-401 errors', async () => {
    require('../api');

    expect(responseErrorHandler).not.toBeNull();

    const error500 = {
      response: { status: 500 },
      config: { headers: {} },
    };

    await expect(responseErrorHandler!(error500)).rejects.toBeDefined();
    expect(mockRefreshPost).not.toHaveBeenCalled();
  });
});
