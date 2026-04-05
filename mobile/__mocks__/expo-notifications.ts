export const getPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const getExpoPushTokenAsync = jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' });
export const setNotificationHandler = jest.fn();
export const addNotificationResponseReceivedListener = jest.fn().mockReturnValue({ remove: jest.fn() });
export const setNotificationChannelAsync = jest.fn().mockResolvedValue(undefined);
export const getLastNotificationResponse = jest.fn().mockReturnValue(null);

export const AndroidImportance = { MAX: 4 };
