import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Mock api module to prevent actual axios calls
jest.mock('../api', () => ({
  registerPushToken: jest.fn().mockResolvedValue(undefined),
  unregisterPushToken: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('registerForPushNotifications', () => {
  it('returns null on non-physical device', async () => {
    jest.resetModules();
    jest.doMock('expo-device', () => ({ isDevice: false }));
    jest.doMock('../api', () => ({
      registerPushToken: jest.fn(),
      unregisterPushToken: jest.fn(),
    }));

    const { registerForPushNotifications } = require('../notifications');
    const result = await registerForPushNotifications();
    expect(result).toBeNull();
  });

  it('requests permission if not already granted', async () => {
    jest.resetModules();
    const mockGetPerms = jest.fn().mockResolvedValue({ status: 'undetermined' });
    const mockRequestPerms = jest.fn().mockResolvedValue({ status: 'granted' });
    const mockGetToken = jest.fn().mockResolvedValue({ data: 'ExponentPushToken[abc]' });

    jest.doMock('expo-notifications', () => ({
      getPermissionsAsync: mockGetPerms,
      requestPermissionsAsync: mockRequestPerms,
      getExpoPushTokenAsync: mockGetToken,
      setNotificationHandler: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
      AndroidImportance: { MAX: 4 },
      addNotificationResponseReceivedListener: jest.fn(),
      getLastNotificationResponse: jest.fn(),
    }));
    jest.doMock('expo-device', () => ({ isDevice: true }));
    jest.doMock('../api', () => ({
      registerPushToken: jest.fn().mockResolvedValue(undefined),
      unregisterPushToken: jest.fn(),
    }));

    const { registerForPushNotifications } = require('../notifications');
    const token = await registerForPushNotifications();

    expect(mockRequestPerms).toHaveBeenCalled();
    expect(token).toBe('ExponentPushToken[abc]');
  });

  it('returns null if permission denied', async () => {
    jest.resetModules();
    jest.doMock('expo-notifications', () => ({
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
      requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
      setNotificationHandler: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
      AndroidImportance: { MAX: 4 },
      addNotificationResponseReceivedListener: jest.fn(),
      getLastNotificationResponse: jest.fn(),
    }));
    jest.doMock('expo-device', () => ({ isDevice: true }));
    jest.doMock('../api', () => ({
      registerPushToken: jest.fn(),
      unregisterPushToken: jest.fn(),
    }));

    const { registerForPushNotifications } = require('../notifications');
    const result = await registerForPushNotifications();
    expect(result).toBeNull();
  });

  it('registers push token with backend API', async () => {
    jest.resetModules();
    const mockRegister = jest.fn().mockResolvedValue(undefined);
    jest.doMock('expo-notifications', () => ({
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      requestPermissionsAsync: jest.fn(),
      getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[xyz]' }),
      setNotificationHandler: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
      AndroidImportance: { MAX: 4 },
      addNotificationResponseReceivedListener: jest.fn(),
      getLastNotificationResponse: jest.fn(),
    }));
    jest.doMock('expo-device', () => ({ isDevice: true }));
    jest.doMock('../api', () => ({
      registerPushToken: mockRegister,
      unregisterPushToken: jest.fn(),
    }));

    const { registerForPushNotifications } = require('../notifications');
    await registerForPushNotifications();

    expect(mockRegister).toHaveBeenCalledWith('ExponentPushToken[xyz]');
  });
});

describe('unregisterPushNotifications', () => {
  it('calls unregisterPushToken API', async () => {
    jest.resetModules();
    const mockUnregister = jest.fn().mockResolvedValue(undefined);
    jest.doMock('../api', () => ({
      registerPushToken: jest.fn(),
      unregisterPushToken: mockUnregister,
    }));
    jest.doMock('expo-notifications', () => ({
      setNotificationHandler: jest.fn(),
      getPermissionsAsync: jest.fn(),
      requestPermissionsAsync: jest.fn(),
      getExpoPushTokenAsync: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
      AndroidImportance: { MAX: 4 },
      addNotificationResponseReceivedListener: jest.fn(),
      getLastNotificationResponse: jest.fn(),
    }));
    jest.doMock('expo-device', () => ({ isDevice: true }));

    const { unregisterPushNotifications } = require('../notifications');
    await unregisterPushNotifications('ExponentPushToken[old]');

    expect(mockUnregister).toHaveBeenCalledWith('ExponentPushToken[old]');
  });
});
